import {
  authApiIdentity,
  createDatabasePool,
  databaseHealthCheck,
  portFromEnv,
  serviceTokenFromEnv,
  startService,
} from '@micro-shop/service-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import { buildApp } from './app.ts';
import { seedDemoOrders } from './db/seed-data.ts';
import { createMemoryOrderStore } from './order-store.ts';
import { createPostgresOrderStore } from './postgres-order-store.ts';

// Starts the Orders API. The gateway (:8080) routes /api/orders/* here; the
// Cart API calls /internal/orders directly.
//
// Orders are kept in Postgres (Neon) when DATABASE_URL is set (`pnpm dev` reads
// apps/orders-api/.env). Without it they're kept in memory, with the demo
// orders created at startup.

const port = portFromEnv('ORDERS_API_PORT', 4002);
const sessionUrl = process.env.AUTH_SESSION_URL ?? 'http://localhost:4001/api/auth/session';
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl ? createDatabasePool(databaseUrl) : null;
const orders = pool ? createPostgresOrderStore(drizzle(pool)) : createMemoryOrderStore();
if (!pool) await seedDemoOrders(orders);

const app = buildApp({
  orders,
  identity: authApiIdentity(sessionUrl),
  serviceToken: serviceTokenFromEnv(),
  healthChecks: pool ? { database: databaseHealthCheck(pool) } : {},
  logger: true,
});
if (pool) app.addHook('onClose', () => pool.end());

await startService(app, { port });
app.log.info(`orders-api on http://localhost:${port}`);
if (pool) {
  app.log.info('orders are stored in Postgres (DATABASE_URL); `pnpm db:migrate && pnpm db:seed` sets them up');
} else {
  app.log.warn('DATABASE_URL is not set: orders are kept IN MEMORY and lost on restart (demo orders only)');
}
