import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { OrderLineView, OrderStatus, OrderView } from './api-types.ts';
import { orderLines, orders } from './db/schema.ts';
import type { OrderStore } from './order-store.ts';

// Orders in Postgres (Neon), through Drizzle. Money is stored in cents
// (integers), and turned back into dollars at the edge.

const toCents = (dollars: number) => Math.round(dollars * 100);
const toDollars = (cents: number) => cents / 100;

type OrderRow = typeof orders.$inferSelect;

export function createPostgresOrderStore(db: NodePgDatabase): OrderStore {
  /** Loads the lines of `rows` in one query, and builds the views. */
  async function withLines(rows: OrderRow[]): Promise<OrderView[]> {
    if (rows.length === 0) return [];
    const lines = await db
      .select()
      .from(orderLines)
      .where(inArray(orderLines.orderId, rows.map((row) => row.id)))
      .orderBy(asc(orderLines.orderId), asc(orderLines.lineNo));

    const byOrder = new Map<number, OrderLineView[]>();
    for (const line of lines) {
      const list = byOrder.get(line.orderId) ?? [];
      list.push({
        productSlug: line.productSlug,
        name: line.name,
        quantity: line.quantity,
        unitPrice: toDollars(line.unitPriceCents),
      });
      byOrder.set(line.orderId, list);
    }

    return rows.map((row) => ({
      id: String(row.id),
      customerName: row.customerName,
      createdAt: row.createdAt.toISOString(),
      status: row.status as OrderStatus,
      lines: byOrder.get(row.id) ?? [],
      total: toDollars(row.totalCents),
    }));
  }

  return {
    async create({ checkoutId, customer, items, status = 'paid', createdAt }) {
      return db.transaction(async (tx) => {
        const lineRows = items.map((item, index) => ({
          lineNo: index + 1,
          productSlug: item.productSlug,
          name: item.name,
          quantity: item.quantity,
          unitPriceCents: toCents(item.unitPrice),
        }));

        // The unique checkout_id decides: a retry of the same checkout (or two
        // racing) inserts nothing and gets the existing order below.
        const [inserted] = await tx
          .insert(orders)
          .values({
            checkoutId,
            customerId: customer.id,
            customerName: customer.name,
            status,
            totalCents: lineRows.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
            ...(createdAt ? { createdAt } : {}),
          })
          .onConflictDoNothing({ target: orders.checkoutId })
          .returning({ id: orders.id });

        if (!inserted) {
          const [existing] = await tx
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.checkoutId, checkoutId));
          if (!existing) throw new Error(`order for checkout ${checkoutId} vanished`);
          return { orderId: String(existing.id), created: false };
        }

        await tx.insert(orderLines).values(lineRows.map((line) => ({ ...line, orderId: inserted.id })));
        return { orderId: String(inserted.id), created: true };
      });
    },

    async listForCustomer(customerId) {
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customerId))
        .orderBy(desc(orders.id))
        .limit(100);
      return withLines(rows);
    },

    async find(orderId, customerId) {
      if (!/^\d{1,15}$/.test(orderId)) return undefined;
      const rows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, Number(orderId)), eq(orders.customerId, customerId)));
      const [order] = await withLines(rows);
      return order;
    },
  };
}

/** After inserting orders with explicit numbers (seeding), new orders continue after the highest. */
export async function syncOrderNumbers(db: NodePgDatabase): Promise<void> {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('orders.orders', 'id'), greatest((select max(id) from orders.orders), 1000))`,
  );
}
