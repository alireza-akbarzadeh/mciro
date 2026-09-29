import { fileURLToPath } from 'node:url';
import { runMigrations } from '@micro-shop/service-kit';

// `pnpm db:migrate`: applies the Cart API's pending migrations (../../drizzle)
// to DATABASE_URL. History: cart.__drizzle_migrations.

await runMigrations({ schema: 'cart', folder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
console.log('[cart-api] migrations applied');
