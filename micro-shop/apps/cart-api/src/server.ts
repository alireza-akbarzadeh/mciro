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
import { createMemoryCartStore } from './cart-store.ts';
import { httpCatalog } from './catalog.ts';
import { httpOrders } from './orders.ts';
import { createPostgresCartStore } from './postgres-cart-store.ts';

// Starts the Cart API. The gateway (:8080) routes /api/cart/* here, so the
// browser calls it on the page's own origin: no CORS, and the cart cookie just works.
//
// Carts are kept in Postgres (Neon) when DATABASE_URL is set, which `pnpm dev`
// reads from apps/cart-api/.env. Without it the API still runs, with carts in
// memory, so the app works for anyone without database access.

const port = portFromEnv('CART_API_PORT', 4005);
const catalogUrl = process.env.CATALOG_URL ?? 'http://localhost:3004/catalog.json';
const sessionUrl = process.env.AUTH_SESSION_URL ?? 'http://localhost:4001/api/auth/session';
const ordersUrl = process.env.ORDERS_URL ?? 'http://localhost:4002/internal/orders';
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl ? createDatabasePool(databaseUrl) : null;

const app = buildApp({
  catalog: httpCatalog(catalogUrl),
  carts: pool ? createPostgresCartStore(drizzle(pool)) : createMemoryCartStore(),
  identity: authApiIdentity(sessionUrl),
  orders: httpOrders(ordersUrl, serviceTokenFromEnv()),
  healthChecks: pool ? { database: databaseHealthCheck(pool) } : {},
  logger: true,
});
if (pool) app.addHook('onClose', () => pool.end());

await startService(app, { port });
app.log.info(`cart-api on http://localhost:${port} (catalog: ${catalogUrl})`);
if (pool) {
  app.log.info('carts are stored in Postgres (DATABASE_URL); run `pnpm db:migrate` after pulling schema changes');
} else {
  app.log.warn('DATABASE_URL is not set: carts are kept IN MEMORY and lost on restart (see .env.example)');
}
