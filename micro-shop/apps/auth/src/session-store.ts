// PRIVATE to Auth: the page's copy of "who is signed in", backed by the Auth API
// (apps/auth-api, behind the gateway at /api/auth).
//
// The server owns the session: it checks the password against a scrypt hash in
// Postgres and keeps the session token in an HttpOnly cookie. This code never
// sees the token or the password hash; it asks the API and remembers the answer.
// Other applications see only the read-only facade in ./session.ts.

import type { LoginBody, SessionResponse } from '@micro-shop/auth-api/api-types';
import type { Session } from '@micro-shop/contracts';
import { createPublisher } from '@micro-shop/event-bus';
import { createLogger, errorData } from '@micro-shop/observability';

const publish = createPublisher('auth');
const log = createLogger('auth');

const API = '/api/auth';

/** The seeded demo users (apps/auth-api/src/db/seed-data.ts), for the sign-in hint. */
export const demoCredentials = { email: 'ada@example.com', password: 'demo' } as const;

const listeners = new Set<() => void>();
// useSyncExternalStore requires getSnapshot to return the SAME object until
// something changes, so the session is replaced, never mutated.
let snapshot: Session | null = null;

function setSession(next: Session | null): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method,
    headers:
      body === undefined
        ? { accept: 'application/json' }
        : { accept: 'application/json', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Asks the API who is signed in. A failure counts as "signed out" (fail closed). */
async function refresh(): Promise<void> {
  try {
    const response = await request('GET', '/session');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { session } = (await response.json()) as SessionResponse;
    setSession(session);
  } catch (error) {
    log.error('session check failed; treating the visitor as signed out', errorData(error));
    setSession(null);
  }
}

// Started as soon as Auth's code loads; ready() is what the shell waits for.
const firstCheck = refresh();

export function ready(): Promise<void> {
  return firstCheck;
}

export function getSession(): Session | null {
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export class InvalidCredentialsError extends Error {
  override name = 'InvalidCredentialsError';
}

export async function login(email: string, password: string): Promise<Session> {
  const body: LoginBody = { email, password };
  const response = await request('POST', '/login', body);
  if (response.status === 401) throw new InvalidCredentialsError('Invalid email or password');
  if (!response.ok) throw new Error(`Sign-in failed (HTTP ${response.status})`);

  const { session } = (await response.json()) as SessionResponse;
  if (!session) throw new Error('Sign-in failed: no session returned');
  setSession(session);
  log.info('user logged in', { userId: session.user.id });
  // Identity facts other apps may react to (e.g. clear per-user caches on logout).
  publish('auth.user.logged-in', { version: 1, userId: session.user.id });
  return session;
}

export function logout(): void {
  const userId = snapshot?.user.id;
  if (!userId) return;
  // Signed out on this page at once; the server ends the session in the background.
  setSession(null);
  log.info('user logged out', { userId });
  publish('auth.user.logged-out', { version: 1, userId });
  request('POST', '/logout', {}).catch((error: unknown) =>
    log.error('logout request failed', errorData(error)),
  );
}

// Signed in or out in another tab: catch up when this tab is shown again.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refresh();
});
