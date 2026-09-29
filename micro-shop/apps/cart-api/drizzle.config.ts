import { defineConfig } from 'drizzle-kit';

// drizzle-kit for the Cart API: `pnpm db:generate` turns changes to
// src/db/schema.ts into a new SQL migration in ./drizzle (commit it);
// `pnpm db:migrate` applies pending migrations (src/db/migrate.ts).

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  // The database is shared by services: this one only ever looks at, and
  // changes, its own schema. Its migration history lives there too.
  schemaFilter: ['cart'],
  migrations: { schema: 'cart', table: '__drizzle_migrations' },
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
