import { fileURLToPath } from 'node:url';
import { runMigrations } from '@micro-shop/service-kit';

// `pnpm db:migrate`: applies the Auth API's pending migrations (../../drizzle)
// to DATABASE_URL. History: auth.__drizzle_migrations.

await runMigrations({ schema: 'auth', folder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
console.log('[auth-api] migrations applied');
