import { fileURLToPath } from 'node:url';
import { runMigrations } from '@micro-shop/service-kit';

// `pnpm db:migrate`: applies the Orders API's pending migrations (../../drizzle)
// to DATABASE_URL. History: orders.__drizzle_migrations.

await runMigrations({ schema: 'orders', folder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
console.log('[orders-api] migrations applied');
