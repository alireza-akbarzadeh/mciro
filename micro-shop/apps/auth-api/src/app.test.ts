// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import type { SessionResponse } from './api-types.ts';
import { buildApp } from './app.ts';
import { type AuthStore, createMemoryAuthStore } from './auth-store.ts';
import { seedDemoUsers } from './db/seed-data.ts';
import { hashPassword, verifyPassword } from './passwords.ts';

let store: AuthStore;

beforeAll(async () => {
  store = createMemoryAuthStore();
  await seedDemoUsers(store);
});

/** A browser: remembers cookies between requests, like a real one. */
function browser(options: { sessionTtlMs?: number } = {}) {
  const app = buildApp({ store, ...options });
  const cookies = new Map<string, string>();

  async function call(
    method: 'GET' | 'POST',
    url: string,
    payload?: object | string,
    headers: Record<string, string> = {},
  ) {
    const cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    const response = await app.inject({
      method,
      url,
      headers: { ...(cookie ? { cookie } : {}), ...headers },
      ...(payload ? { payload } : {}),
    });
    const setCookie = response.headers['set-cookie'];
    for (const line of Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []) {
      const [pair = ''] = line.split(';');
      const [name = '', value = ''] = pair.split('=');
      if (/Max-Age=0/.test(line)) cookies.delete(name);
      else cookies.set(name, value);
    }
    return response;
  }

  return { call, cookies };
}

const signIn = (b: ReturnType<typeof browser>, email = 'ada@example.com', password = 'demo') =>
  b.call('POST', '/api/auth/login', { email, password });

describe('passwords', () => {
  it('hashes with a salt and verifies', async () => {
    const [first, second] = [await hashPassword('demo'), await hashPassword('demo')];
    expect(first).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(first).not.toBe(second); // different salts
    expect(await verifyPassword('demo', first)).toBe(true);
    expect(await verifyPassword('Demo', first)).toBe(false);
  });
});

describe('auth API', () => {
  it('has no session until you sign in', async () => {
    const b = browser();
    expect((await b.call('GET', '/api/auth/session')).json<SessionResponse>()).toEqual({ session: null });
  });

  it('signs in (email is case-insensitive), sets an HttpOnly session cookie, and knows who you are', async () => {
    const b = browser();
    const login = await signIn(b, '  ADA@example.com ');

    expect(login.statusCode).toBe(200);
    expect(login.json<SessionResponse>().session?.user).toEqual({
      id: 'u-ada',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    const [sessionCookie, displayCookie] = login.headers['set-cookie'] as string[];
    expect(sessionCookie).toMatch(/^micro-shop-session=[\w-]{43}; Path=\/; Max-Age=28800; HttpOnly; SameSite=Lax$/);
    expect(displayCookie).toMatch(/^micro-shop-user=Ada%20Lovelace; Path=\/; Max-Age=28800; SameSite=Lax$/);

    const session = (await b.call('GET', '/api/auth/session')).json<SessionResponse>().session;
    expect(session?.user.id).toBe('u-ada');
  });

  it('refuses a wrong password or an unknown email the same way', async () => {
    const wrong = await signIn(browser(), 'ada@example.com', 'nope');
    const unknown = await signIn(browser(), 'nobody@example.com', 'demo');
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());
    expect(wrong.headers['set-cookie']).toBeUndefined();
  });

  it('ends the session on logout, on the server too', async () => {
    const b = browser();
    await signIn(b);
    const stolenCookie = `micro-shop-session=${b.cookies.get('micro-shop-session')}`;

    await b.call('POST', '/api/auth/logout', {});
    expect((await b.call('GET', '/api/auth/session')).json<SessionResponse>().session).toBeNull();

    // A copy of the old cookie is worthless now.
    const replay = await buildApp({ store }).inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: stolenCookie } });
    expect(replay.json<SessionResponse>().session).toBeNull();
  });

  it('forgets expired sessions', async () => {
    const b = browser({ sessionTtlMs: 1 });
    await signIn(b);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await b.call('GET', '/api/auth/session')).json<SessionResponse>().session).toBeNull();
  });

  it('only accepts JSON for login, so another site’s form can’t sign you in', async () => {
    // What a malicious page's auto-submitting form would send: valid credentials, as a form.
    const response = await browser().call('POST', '/api/auth/login', 'email=ada@example.com&password=demo', {
      'content-type': 'application/x-www-form-urlencoded',
    });
    expect(response.statusCode).toBe(415);
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});
