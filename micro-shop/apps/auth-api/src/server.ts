import {
  createDatabasePool,
  databaseHealthCheck,
  portFromEnv,
  startService,
} from '@micro-shop/service-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import { buildApp } from './app.ts';
import { createMemoryAuthStore } from './auth-store.ts';
import { seedDemoUsers } from './db/seed-data.ts';
import { createPostgresAuthStore } from './postgres-auth-store.ts';

// Starts the Auth API. The gateway (:8080) routes /api/auth/* here.
//
// Users and sessions are kept in Postgres (Neon) when DATABASE_URL is set
// (`pnpm dev` reads apps/auth-api/.env). Without it they're kept in memory,
// with the demo users created at startup, so sign-in works for everyone.

const port = portFromEnv('AUTH_API_PORT', 4001);
const ttlHours = Number(process.env.SESSION_TTL_HOURS ?? 8);
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl ? createDatabasePool(databaseUrl) : null;
const store = pool ? createPostgresAuthStore(drizzle(pool)) : createMemoryAuthStore();
if (!pool) await seedDemoUsers(store);

const app = buildApp({
  store,
  sessionTtlMs: ttlHours * 60 * 60 * 1000,
  healthChecks: pool ? { database: databaseHealthCheck(pool) } : {},
  logger: true,
});
if (pool) app.addHook('onClose', () => pool.end());

await startService(app, { port });
app.log.info(`auth-api on http://localhost:${port}`);
if (pool) {
  app.log.info('users and sessions are stored in Postgres (DATABASE_URL); `pnpm db:migrate && pnpm db:seed` sets them up');
} else {
  app.log.warn('DATABASE_URL is not set: users and sessions are kept IN MEMORY (demo users only)');
}
