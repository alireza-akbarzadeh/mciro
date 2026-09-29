import { sql } from 'drizzle-orm';
import { check, index, integer, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// The Cart API's tables, defined in TypeScript with Drizzle. drizzle-kit turns
// changes to this file into SQL migrations (../../drizzle/), and the queries in
// postgres-cart-store.ts are typed from it.
//
// They live in their own Postgres schema, `cart`. The Neon database is shared by
// every service, but each service owns, reads and migrates ONLY its own schema:
// no other service joins on these tables. Other teams ask the Cart API.

export const cartSchema = pgSchema('cart');

/** One row per browser cart (the id is the value of the HttpOnly cart cookie). */
export const carts = cartSchema.table(
  'carts',
  {
    id: uuid('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Last change. Old carts can be cleaned up by this. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('carts_updated_at_idx').on(table.updatedAt)],
);

/** Product references and quantities. Names and prices come from the catalog when read. */
export const cartLines = cartSchema.table(
  'cart_lines',
  {
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productSlug: text('product_slug').notNull(),
    quantity: integer('quantity').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.cartId, table.productSlug] }),
    // The database enforces the same limits as the API (MAX_QUANTITY, slug format).
    check('cart_lines_quantity_range', sql`${table.quantity} BETWEEN 1 AND 10`),
    check('cart_lines_product_slug_format', sql`${table.productSlug} ~ '^[a-z0-9-]{1,100}$'`),
  ],
);
