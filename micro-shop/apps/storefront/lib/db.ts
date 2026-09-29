import { createDatabasePool } from '@micro-shop/service-kit/database';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';

// The catalog database, for server code only (Server Components, route handlers).
//
// One pool per server process. In development Next re-evaluates modules on
// every change, so the pool is kept on globalThis instead of re-created (each
// new pool would open new connections and leak the old ones).
//
// Null without DATABASE_URL: the catalog then serves its seed data (catalog.ts).

const globalForDb = globalThis as typeof globalThis & { __catalogDb?: NodePgDatabase | null };

export function getDb(): NodePgDatabase | null {
  if (globalForDb.__catalogDb === undefined) {
    const url = process.env.DATABASE_URL;
    globalForDb.__catalogDb = url ? drizzle(createDatabasePool(url)) : null;
  }
  return globalForDb.__catalogDb;
}
