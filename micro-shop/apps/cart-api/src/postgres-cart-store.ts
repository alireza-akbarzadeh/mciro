import { and, asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { MAX_QUANTITY } from './api-types.ts';
import type { CartStore } from './cart-store.ts';
import { cartLines, carts } from './db/schema.ts';

// Carts in Postgres (Neon), through Drizzle. Every change is a single atomic
// statement or a transaction, so concurrent requests for the same cart (two
// tabs, a double click) can't lose an update or check out twice.

export type CartDatabase = NodePgDatabase;

export function createPostgresCartStore(db: CartDatabase): CartStore {
  type Tx = Parameters<Parameters<CartDatabase['transaction']>[0]>[0];

  /** Creates the cart row on first use; marks it as changed otherwise. */
  async function touch(tx: Tx, cartId: string): Promise<void> {
    await tx
      .insert(carts)
      .values({ id: cartId })
      .onConflictDoUpdate({ target: carts.id, set: { updatedAt: sql`now()` } });
  }

  const lineOf = (cartId: string, productSlug: string) =>
    and(eq(cartLines.cartId, cartId), eq(cartLines.productSlug, productSlug));

  return {
    async get(cartId) {
      if (!cartId) return [];
      return db
        .select({ productSlug: cartLines.productSlug, quantity: cartLines.quantity })
        .from(cartLines)
        .where(eq(cartLines.cartId, cartId))
        .orderBy(asc(cartLines.addedAt), asc(cartLines.productSlug));
    },

    async add(cartId, productSlug, quantity) {
      await db.transaction(async (tx) => {
        await touch(tx, cartId);
        // Insert, or add to the existing line, in ONE statement: two tabs adding
        // at the same moment both count.
        await tx
          .insert(cartLines)
          .values({ cartId, productSlug, quantity: Math.min(quantity, MAX_QUANTITY) })
          .onConflictDoUpdate({
            target: [cartLines.cartId, cartLines.productSlug],
            set: { quantity: sql`least(${cartLines.quantity} + excluded.quantity, ${MAX_QUANTITY})` },
          });
      });
    },

    async set(cartId, productSlug, quantity) {
      await db.transaction(async (tx) => {
        if (quantity <= 0) {
          await tx.delete(cartLines).where(lineOf(cartId, productSlug));
        } else {
          await tx.update(cartLines).set({ quantity }).where(lineOf(cartId, productSlug));
        }
        await tx.update(carts).set({ updatedAt: sql`now()` }).where(eq(carts.id, cartId));
      });
    },

    async remove(cartId, productSlug) {
      await db.delete(cartLines).where(lineOf(cartId, productSlug));
    },

    async checkout(cartId, decide) {
      return db.transaction(async (tx) => {
        // Lock the cart: a second checkout of it waits here, then finds it empty.
        await tx.select({ id: carts.id }).from(carts).where(eq(carts.id, cartId)).for('update');
        const lines = await tx
          .select({ productSlug: cartLines.productSlug, quantity: cartLines.quantity })
          .from(cartLines)
          .where(eq(cartLines.cartId, cartId))
          .orderBy(asc(cartLines.addedAt), asc(cartLines.productSlug));

        const { commit, result } = await decide(lines);
        if (commit) await tx.delete(carts).where(eq(carts.id, cartId)); // lines cascade
        return result;
      });
    },
  };
}
