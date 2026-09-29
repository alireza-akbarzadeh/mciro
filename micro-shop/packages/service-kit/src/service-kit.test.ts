// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  createService,
  fetchJson,
  isFormPost,
  readCookie,
  serializeCookie,
  UpstreamUnavailableError,
} from './index.ts';

// What every service gets for free. If one of these changes, every service's
// behaviour changes with it, so it is tested here once.

describe('createService', () => {
  it('answers /health with the service name', async () => {
    const app = createService({ name: 'test-api' });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.json()).toEqual({ status: 'ok', service: 'test-api', checks: {} });
  });

  it('answers /health with 503 when a dependency check fails', async () => {
    const app = createService({
      name: 'test-api',
      healthChecks: {
        database: async () => {
          throw new Error('connection refused');
        },
        cache: async () => {},
      },
    });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: 'failing',
      service: 'test-api',
      checks: { database: 'failing', cache: 'ok' },
    });
  });

  it('uses one error shape: 404 for unknown routes, 400 for invalid input', async () => {
    const app = createService({ name: 'test-api' });
    app.post(
      '/things',
      { schema: { body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } },
      async () => ({ ok: true }),
    );

    const missing = await app.inject({ method: 'GET', url: '/nope' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ error: 'not_found' });

    const invalid = await app.inject({ method: 'POST', url: '/things', payload: {} });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ error: 'bad_request', message: expect.stringContaining('name') });
  });

  it('never leaks the details of a bug to the client', async () => {
    const app = createService({ name: 'test-api' });
    app.get('/boom', async () => {
      throw new Error('database password is hunter2');
    });

    const response = await app.inject({ method: 'GET', url: '/boom' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'internal', message: 'Something went wrong.' });
  });

  it('parses plain HTML form posts like JSON', async () => {
    const app = createService({ name: 'test-api' });
    app.post('/form', async (request) => ({ body: request.body, form: isFormPost(request) }));

    const response = await app.inject({
      method: 'POST',
      url: '/form',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'productSlug=standing-desk&quantity=2',
    });
    expect(response.json()).toEqual({ body: { productSlug: 'standing-desk', quantity: '2' }, form: true });
  });
});

describe('cookies', () => {
  it('writes cookies HttpOnly and SameSite=Lax unless told otherwise', () => {
    expect(serializeCookie('session', 'abc', { path: '/api/auth', maxAgeSeconds: 60 })).toBe(
      'session=abc; Path=/api/auth; Max-Age=60; HttpOnly; SameSite=Lax',
    );
    expect(serializeCookie('pref', 'x', { path: '/', httpOnly: false, secure: true })).toBe(
      'pref=x; Path=/; SameSite=Lax; Secure',
    );
  });

  it('reads one cookie out of a Cookie header', () => {
    expect(readCookie('a=1; micro-shop-cart=xyz; b=2', 'micro-shop-cart')).toBe('xyz');
    expect(readCookie('a=1', 'micro-shop-cart')).toBeUndefined();
    expect(readCookie(undefined, 'micro-shop-cart')).toBeUndefined();
  });
});

describe('fetchJson', () => {
  it('turns any failure into UpstreamUnavailableError', async () => {
    // Nothing listens on port 9: the connection is refused.
    await expect(fetchJson('http://127.0.0.1:9/catalog.json', { timeoutMs: 500 })).rejects.toThrow(
      UpstreamUnavailableError,
    );
  });
});
