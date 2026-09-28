// PRIVATE to Auth. Holds the session (including the token) and the mock login.
// Not exposed: other applications see only the read-only facade in ./session.ts.
//
// This is a MOCK. There is no backend; credentials are checked in the browser.
// What matters here is the boundary, not the security.

import type { Session, User } from '@micro-shop/contracts';

/** What only Auth sees: the public Session plus the credential. */
type StoredSession = Session & {
  token: string;
};

const STORAGE_KEY = 'micro-shop.auth.session';
const SESSION_TTL_MS = 30 * 60 * 1000;
const DEMO_PASSWORD = 'demo';

const DEMO_USERS: readonly User[] = [
  { id: 'u-ada', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'u-grace', name: 'Grace Hopper', email: 'grace@example.com' },
];

export const demoCredentials = { email: 'ada@example.com', password: DEMO_PASSWORD } as const;

const listeners = new Set<() => void>();

let stored: StoredSession | null = readStorage();
// A cached projection. useSyncExternalStore requires getSnapshot to return the
// SAME object until something changes, so we never build it on read.
let snapshot: Session | null = toPublic(stored);

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
  await delay(400); // pretend this is a network call

  const user = DEMO_USERS.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!user || password !== DEMO_PASSWORD) {
    throw new InvalidCredentialsError('Invalid email or password');
  }

  const session: StoredSession = {
    token: `mock.${crypto.randomUUID()}`,
    user,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  setStored(session);
  console.info('[auth] user logged in', user.id);
  return { user: session.user, expiresAt: session.expiresAt };
}

export function logout(): void {
  if (!stored) return;
  const userId = stored.user.id;
  setStored(null);
  console.info('[auth] user logged out', userId);
}

function setStored(next: StoredSession | null): void {
  stored = next;
  snapshot = toPublic(next);
  writeStorage(next);
  for (const listener of listeners) listener();
}

function toPublic(session: StoredSession | null): Session | null {
  return session ? { user: session.user, expiresAt: session.expiresAt } : null;
}

// NOTE: when the shell hosts Auth, this code runs on the SHELL's origin
// (localhost:3000), so this sessionStorage belongs to the shell's origin, not
// localhost:3001. Remote code has no origin of its own.
function readStorage(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredSession(parsed) || Date.parse(parsed.expiresAt) <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(session: StoredSession | null): void {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, quota): the session lives in memory only.
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false;
  const { token, expiresAt, user } = value as Record<string, unknown>;
  if (typeof token !== 'string' || typeof expiresAt !== 'string') return false;
  if (typeof user !== 'object' || user === null) return false;
  const { id, name, email } = user as Record<string, unknown>;
  return typeof id === 'string' && typeof name === 'string' && typeof email === 'string';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
