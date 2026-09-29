import { defineConfig } from 'drizzle-kit';

// drizzle-kit for the Orders API. Only ever touches the `orders` schema, and
// keeps its migration history there. See apps/cart-api/drizzle.config.ts.

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['orders'],
  migrations: { schema: 'orders', table: '__drizzle_migrations' },
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
