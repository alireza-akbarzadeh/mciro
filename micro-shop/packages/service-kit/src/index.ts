// @micro-shop/service-kit: the platform every backend service is built on.
//
// Like @micro-shop/observability or @micro-shop/ui on the frontend, it holds
// what every service needs the SAME way, and no business logic. A service's
// routes, rules and data stay in apps/<name>-api, owned by that team.
//
// Services get Fastify's types from here, so the whole backend runs one
// Fastify version, upgraded in one place.

export type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
export { createService, isFormPost, type ServiceOptions } from './create-service.ts';
export { readCookie, serializeCookie, type CookieOptions } from './cookies.ts';
export {
  createDatabasePool,
  databaseHealthCheck,
  logRetry,
  waitForDatabase,
  type DatabasePool,
  type DatabasePoolOptions,
  type WaitOptions,
} from './database.ts';
export { sendError, type ErrorBody } from './errors.ts';
export { runMigrations, type MigrationOptions } from './migrations.ts';
export { portFromEnv, startService } from './start-service.ts';
export { fetchJson, UpstreamUnavailableError, type FetchJsonOptions } from './upstream.ts';
