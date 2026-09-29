import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Session } from '@micro-shop/contracts';
import {
  createService,
  type FastifyReply,
  type FastifyRequest,
  isFormPost,
  readCookie,
  sendError,
  serializeCookie,
  type ServiceOptions,
} from '@micro-shop/service-kit';
import {
  type ApiErrorCode,
  DISPLAY_NAME_COOKIE,
  type LoginBody,
  MIN_PASSWORD_LENGTH,
  type RegisterBody,
  SESSION_COOKIE,
  type SessionResponse,
} from './api-types.ts';
import type { AuthStore, StoredUser } from './auth-store.ts';
import { hashPassword, verifyPassword } from './passwords.ts';

// The Auth API. Everything is under /api/auth, which the gateway routes here.
//
//   GET  /api/auth/session   who is signed in: { session } or { session: null }
//                            (also asked server to server, e.g. by the Cart API)
//   POST /api/auth/login     { email, password } → sets the session cookie
//   POST /api/auth/register  { name, email, password } → creates the user, signs them in
//   POST /api/auth/logout    ends the session, clears the cookies
//
// The browser holds a random session token in an HttpOnly cookie; the database
// holds only its SHA-256. Passwords are stored as scrypt hashes.

export type AppOptions = {
  store: AuthStore;
  sessionTtlMs?: number;
  logger?: boolean;
  healthChecks?: ServiceOptions['healthChecks'];
};

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toSession({ id, name, email }: StoredUser, expiresAt: Date): Session {
  return { user: { id, name, email }, expiresAt: expiresAt.toISOString() };
}

export function buildApp({ store, sessionTtlMs = DEFAULT_TTL_MS, logger = false, healthChecks }: AppOptions) {
  const app = createService({ name: 'auth-api', logger, healthChecks });

  // Checked against when the email is unknown, so "no such user" takes as long
  // as "wrong password": response times don't reveal which emails exist.
  const dummyHash = hashPassword('not-a-real-password');

  function fail(reply: FastifyReply, status: number, error: ApiErrorCode, message: string) {
    return sendError(reply, status, error, message);
  }

  function setSessionCookies(reply: FastifyReply, token: string, user: StoredUser) {
    const maxAgeSeconds = Math.floor(sessionTtlMs / 1000);
    reply.header('set-cookie', [
      serializeCookie(SESSION_COOKIE, token, { path: '/', maxAgeSeconds }),
      serializeCookie(DISPLAY_NAME_COOKIE, user.name, { path: '/', maxAgeSeconds, httpOnly: false }),
    ]);
  }

  function clearSessionCookies(reply: FastifyReply) {
    reply.header('set-cookie', [
      serializeCookie(SESSION_COOKIE, '', { path: '/', maxAgeSeconds: 0 }),
      serializeCookie(DISPLAY_NAME_COOKIE, '', { path: '/', maxAgeSeconds: 0, httpOnly: false }),
    ]);
  }

  /** Signs `user` in: a new session in the store, its token in the cookie. */
  async function startSession(reply: FastifyReply, user: StoredUser): Promise<SessionResponse> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionTtlMs);
    await store.createSession(hashToken(token), user.id, expiresAt);
    setSessionCookies(reply, token, user);
    return { session: toSession(user, expiresAt) };
  }

  /**
   * Login, register and logout only accept JSON, sent by fetch. A plain HTML form on
   * another site could otherwise sign a visitor in or out (login CSRF).
   */
  function requireJson(request: FastifyRequest, reply: FastifyReply) {
    if (isFormPost(request)) {
      return fail(reply, 415, 'json_required', 'Send JSON.');
    }
    return undefined;
  }

  app.get('/api/auth/session', async (request): Promise<SessionResponse> => {
    const token = readCookie(request.headers.cookie, SESSION_COOKIE);
    if (!token) return { session: null };
    const live = await store.findSession(hashToken(token));
    return { session: live ? toSession(live.user, live.expiresAt) : null };
  });

  app.post<{ Body: LoginBody }>(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', minLength: 3, maxLength: 200 },
            password: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const refused = requireJson(request, reply);
      if (refused) return refused;

      const email = request.body.email.trim().toLowerCase();
      const user = await store.findUserByEmail(email);
      const valid = await verifyPassword(request.body.password, user?.passwordHash ?? (await dummyHash));
      if (!user || !valid) {
        request.log.info({ email }, 'sign-in refused');
        return fail(reply, 401, 'invalid_credentials', 'Invalid email or password');
      }

      const body = await startSession(reply, user);
      request.log.info({ userId: user.id }, 'signed in');
      return body;
    },
  );

  app.post<{ Body: RegisterBody }>(
    '/api/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', maxLength: 100, pattern: '\\S' },
            // Deliberately loose: only a confirmation email could prove the address works.
            email: { type: 'string', maxLength: 200, pattern: '^\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\s*$' },
            password: { type: 'string', minLength: MIN_PASSWORD_LENGTH, maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const refused = requireJson(request, reply);
      if (refused) return refused;

      const user: StoredUser = {
        // Random, so an id reveals nothing (not even how many users there are).
        id: `u-${randomUUID()}`,
        name: request.body.name.trim(),
        email: request.body.email.trim().toLowerCase(),
        passwordHash: await hashPassword(request.body.password),
      };
      if (!(await store.createUser(user))) {
        return fail(reply, 409, 'email_taken', 'An account with this email already exists');
      }

      const body = await startSession(reply, user);
      request.log.info({ userId: user.id }, 'registered');
      return reply.code(201).send(body);
    },
  );

  app.post('/api/auth/logout', async (request, reply) => {
    const refused = requireJson(request, reply);
    if (refused) return refused;

    const token = readCookie(request.headers.cookie, SESSION_COOKIE);
    if (token) await store.deleteSession(hashToken(token));
    clearSessionCookies(reply);
    const body: SessionResponse = { session: null };
    return body;
  });

  return app;
}
