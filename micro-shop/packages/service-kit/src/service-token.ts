import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendError } from './errors.ts';

// Service-to-service calls (e.g. the Cart API creating an order). They go
// straight to the service, never through the gateway, and carry a shared
// secret: `Authorization: Bearer <INTERNAL_API_TOKEN>`. Routes that take them
// live under /internal/, which the gateway doesn't route.

const DEV_TOKEN = 'dev-only-internal-token';

/**
 * INTERNAL_API_TOKEN, the same for every service. Outside production a fixed
 * development value is used when it's unset, so `pnpm dev` works untouched.
 */
export function serviceTokenFromEnv(): string {
  const token = process.env.INTERNAL_API_TOKEN;
  if (token) return token;
  if (process.env.NODE_ENV === 'production') throw new Error('INTERNAL_API_TOKEN is not set');
  return DEV_TOKEN;
}

/** Headers for calling another service's /internal/ routes. */
export function serviceAuthHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

/** A Fastify preHandler: 401 unless the request carries `token`. */
export function requireServiceToken(token: string) {
  const expected = Buffer.from(`Bearer ${token}`);
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const given = Buffer.from(request.headers.authorization ?? '');
    // Constant-time: how long the check takes reveals nothing about the token.
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return sendError(reply, 401, 'service_token_required', 'This route is for other services.');
    }
    return undefined;
  };
}
