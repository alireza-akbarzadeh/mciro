// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { createDatabasePool } from '@micro-shop/service-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { type CartStore, createMemoryCartStore } from './cart-store.ts';
import { createPostgresCartStore } from './postgres-cart-store.ts';

// One set of expectations, run against every CartStore implementation, so the
// in-memory store used by unit tests can't drift from the real Postgres one.
//
// The Postgres run needs a database: DATABASE_URL pointing at a migrated Neon
// branch (use a dev branch, never production). Without it, it's skipped:
//   DATABASE_URL=... pnpm vitest run apps/cart-api

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? createDatabasePool(databaseUrl, { max: 2 }) : null;
const usedCarts: string[] = [];

afterAll(async () => {
  if (!pool) return;
  // Leave the database as we found it.
  if (usedCarts.length > 0) await pool.query('delete from cart.carts where id = any($1)', [usedCarts]);
  await pool.end();
});

const stores: [string, (() => CartStore) | null][] = [
  ['memory', createMemoryCartStore],
  ['postgres', pool ? () => createPostgresCartStore(drizzle(pool)) : null],
];

describe.each(stores)('%s cart store', (_name, createStore) => {
  const newCart = () => {
    const id = randomUUID();
    usedCarts.push(id);
    return id;
  };

  it.skipIf(!createStore)('adds, merges and caps lines, in the order they were added', async () => {
    const store = createStore!();
    const cart = newCart();
    await store.add(cart, 'standing-desk', 1);
    await store.add(cart, 'usb-c-cable', 8);
    await store.add(cart, 'usb-c-cable', 8);
    expect(await store.get(cart)).toEqual([
      { productSlug: 'standing-desk', quantity: 1 },
      { productSlug: 'usb-c-cable', quantity: 10 },
    ]);
  });

  it.skipIf(!createStore)('sets and removes lines; zero removes', async () => {
    const store = createStore!();
    const cart = newCart();
    await store.add(cart, 'standing-desk', 1);
    await store.add(cart, 'usb-c-cable', 1);
    await store.set(cart, 'usb-c-cable', 4);
    await store.set(cart, 'standing-desk', 0);
    expect(await store.get(cart)).toEqual([{ productSlug: 'usb-c-cable', quantity: 4 }]);
    await store.remove(cart, 'usb-c-cable');
    expect(await store.get(cart)).toEqual([]);
  });

  it.skipIf(!createStore)('empties the cart only when checkout commits', async () => {
    const store = createStore!();
    const cart = newCart();
    await store.add(cart, 'standing-desk', 2);

    const refused = await store.checkout(cart, (lines) => ({ commit: false, result: lines.length }));
    expect(refused).toBe(1);
    expect(await store.get(cart)).toHaveLength(1);

    const accepted = await store.checkout(cart, (lines) => ({ commit: true, result: lines }));
    expect(accepted).toEqual([{ productSlug: 'standing-desk', quantity: 2 }]);
    expect(await store.get(cart)).toEqual([]);
  });

  it.skipIf(!createStore)('lets only one of two simultaneous checkouts take the cart', async () => {
    const store = createStore!();
    const cart = newCart();
    await store.add(cart, 'standing-desk', 1);

    const take = () => store.checkout(cart, (lines) => ({ commit: lines.length > 0, result: lines.length }));
    const results = await Promise.all([take(), take()]);
    expect(results.sort()).toEqual([0, 1]);
  });

  it.skipIf(!createStore)('keeps carts apart, and treats an unknown cart as empty', async () => {
    const store = createStore!();
    const a = newCart();
    const b = newCart();
    await store.add(a, 'standing-desk', 1);
    expect(await store.get(b)).toEqual([]);
    expect(await store.get(undefined)).toEqual([]);
  });
});
