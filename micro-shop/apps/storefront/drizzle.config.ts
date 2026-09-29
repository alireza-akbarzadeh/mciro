import { defineConfig } from 'drizzle-kit';

// drizzle-kit for the catalog. Only ever touches the `catalog` schema, and
// keeps its migration history there. See apps/cart-api/drizzle.config.ts.

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './drizzle',
  schemaFilter: ['catalog'],
  migrations: { schema: 'catalog', table: '__drizzle_migrations' },
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
