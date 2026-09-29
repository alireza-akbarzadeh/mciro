import { createDatabasePool, logRetry, waitForDatabase } from '@micro-shop/service-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createPostgresAuthStore } from '../postgres-auth-store.ts';
import { demoUsers, seedDemoUsers } from './seed-data.ts';

// `pnpm db:seed`: creates (or updates) the demo users in DATABASE_URL.
// Run after `pnpm db:migrate`. Safe to run again.

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see apps/auth-api/.env.example)');

const pool = createDatabasePool(url, { max: 1 });
try {
  await waitForDatabase(pool, { onRetry: logRetry('auth-api seed') });
  await seedDemoUsers(createPostgresAuthStore(drizzle(pool)));
  console.log(`[auth-api] seeded ${demoUsers.length} demo users`);
} finally {
  await pool.end();
}
