import { sql } from 'drizzle-orm';
import { bigint, index, integer, pgSchema, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

// The Orders API's tables, in its own Postgres schema `orders`. No other
// service reads them: the Cart API creates orders through POST /internal/orders.

export const ordersSchema = pgSchema('orders');

export const orders = ordersSchema.table(
  'orders',
  {
    /** The order number people see ("Order #1005"). */
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({ startWith: 1001 }),
    /** From the Cart API. Unique: one order per checkout, however often it's sent. */
    checkoutId: text('checkout_id').notNull().unique(),
    /** The Auth API's user id. Customers only ever see their own orders. */
    customerId: text('customer_id').notNull(),
    /** As it was at checkout: an order is a record of what happened. */
    customerName: text('customer_name').notNull(),
    status: text('status', { enum: ['pending', 'paid', 'shipped', 'delivered'] }).notNull().default('paid'),
    totalCents: integer('total_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('orders_customer_id_idx').on(table.customerId, sql`${table.id} desc`)],
);

export const orderLines = ordersSchema.table(
  'order_lines',
  {
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    /** Position in the order, from 1. */
    lineNo: integer('line_no').notNull(),
    productSlug: text('product_slug').notNull(),
    /** Name and price as they were at checkout, not today's catalog. */
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
  },
  (table) => [primaryKey({ columns: [table.orderId, table.lineNo] })],
);
