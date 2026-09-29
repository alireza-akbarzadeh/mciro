import { fileURLToPath } from 'node:url';
import { runMigrations } from '@micro-shop/service-kit';

// `pnpm db:migrate`: applies the catalog's pending migrations (../drizzle) to
// DATABASE_URL. History: catalog.__drizzle_migrations.

await runMigrations({ schema: 'catalog', folder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
console.log('[storefront] catalog migrations applied');
