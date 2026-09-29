import { createDatabasePool, logRetry, waitForDatabase } from '@micro-shop/service-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import { syncOrderNumbers } from '../postgres-order-store.ts';
import { orderLines, orders } from './schema.ts';
import { demoOrders } from './seed-data.ts';

// `pnpm db:seed`: creates the demo orders (with their fixed numbers) in
// DATABASE_URL. Run after `pnpm db:migrate`. Safe to run again: existing orders
// are left alone. For development branches only.

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see apps/orders-api/.env.example)');

const pool = createDatabasePool(url, { max: 1 });
const db = drizzle(pool);

try {
  await waitForDatabase(pool, { onRetry: logRetry('orders-api seed') });
  await db.transaction(async (tx) => {
    for (const { id, checkoutId, customer, status, createdAt, items } of demoOrders) {
      const lines = items.map((item, index) => ({
        orderId: id,
        lineNo: index + 1,
        productSlug: item.productSlug,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: Math.round(item.unitPrice * 100),
      }));
      const [inserted] = await tx
        .insert(orders)
        .values({
          id,
          checkoutId,
          customerId: customer.id,
          customerName: customer.name,
          status,
          createdAt,
          totalCents: lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
        })
        .onConflictDoNothing()
        .returning({ id: orders.id });
      if (inserted) await tx.insert(orderLines).values(lines);
    }
  });
  // Explicit numbers don't advance the sequence; new orders must start after them.
  await syncOrderNumbers(db);
  console.log(`[orders-api] seeded ${demoOrders.length} demo orders`);
} finally {
  await pool.end();
}
