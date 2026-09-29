import { fileURLToPath } from 'node:url';
import { createDatabasePool } from '@micro-shop/service-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// `pnpm db:migrate`: applies the SQL migrations in ../../drizzle that this
// database hasn't seen yet, in order. The history is kept in
// cart.__drizzle_migrations, next to the tables it describes.
//
// Run it before starting a new version of the service. A new Neon branch (a
// copy of the database for a feature or a test run) gets the tables the same way.

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[cart-api] DATABASE_URL is not set (see apps/cart-api/.env.example)');
  process.exit(1);
}

const pool = createDatabasePool(url, { max: 1 });
try {
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
    migrationsSchema: 'cart',
    migrationsTable: '__drizzle_migrations',
  });
  console.log('[cart-api] migrations applied');
} finally {
  await pool.end();
}
