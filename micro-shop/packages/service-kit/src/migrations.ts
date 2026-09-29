import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabasePool } from './database.ts';

// `pnpm db:migrate` for every service: applies the SQL migrations a service's
// drizzle-kit generated, that this database hasn't seen yet, in order.
//
// Each service keeps its history in ITS OWN schema (<schema>.__drizzle_migrations),
// next to the tables it describes, so services never step on each other's
// migrations in the shared database.

export type MigrationOptions = {
  /** The service's Postgres schema, e.g. 'cart'. */
  schema: string;
  /** Absolute path to the service's drizzle/ folder. */
  folder: string;
  /** Defaults to DATABASE_URL. */
  url?: string;
};

export async function runMigrations({ schema, folder, url = process.env.DATABASE_URL }: MigrationOptions) {
  if (!url) throw new Error('DATABASE_URL is not set (see the service’s .env.example)');
  const pool = createDatabasePool(url, { max: 1 });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: folder,
      migrationsSchema: schema,
      migrationsTable: '__drizzle_migrations',
    });
  } finally {
    await pool.end();
  }
}
