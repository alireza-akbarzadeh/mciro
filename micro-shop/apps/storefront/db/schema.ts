import { sql } from 'drizzle-orm';
import { check, index, integer, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

// The catalog's tables, owned by the storefront team, in their own Postgres
// schema `catalog`. Other services never read them: they use the public read
// API (/catalog.json) instead, so this schema can change without breaking them.

export const catalogSchema = pgSchema('catalog');

export const categories = catalogSchema.table('categories', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const products = catalogSchema.table(
  'products',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    categorySlug: text('category_slug')
      .notNull()
      .references(() => categories.slug),
    /** Integer cents: money is never a floating-point number in the database. */
    priceCents: integer('price_cents').notNull(),
    summary: text('summary').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('products_category_slug_idx').on(table.categorySlug),
    check('products_price_positive', sql`${table.priceCents} > 0`),
  ],
);
