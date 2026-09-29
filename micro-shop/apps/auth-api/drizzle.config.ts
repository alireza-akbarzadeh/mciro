import { defineConfig } from 'drizzle-kit';

// drizzle-kit for the Auth API. Only ever touches the `auth` schema, and keeps
// its migration history there. See apps/cart-api/drizzle.config.ts.

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['auth'],
  migrations: { schema: 'auth', table: '__drizzle_migrations' },
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
