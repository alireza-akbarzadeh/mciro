import { MAX_QUANTITY } from './api-types.ts';

// Where carts are kept. The routes (app.ts) only know this interface, so the
// same API runs on Postgres (postgres-cart-store.ts, the real thing) or in
// memory (below: unit tests, and running without a database).
//
// A cart is product slugs and quantities: references into the catalog, priced
// when read.

export type StoredLine = { productSlug: string; quantity: number };

/** What checkout decides after seeing the lines: empty the cart (commit) or not. */
export type CheckoutDecision<T> = { commit: boolean; result: T };

export type CartStore = {
  /** Lines in the order they were first added. Empty for an unknown or missing cart. */
  get(cartId: string | undefined): Promise<StoredLine[]>;
  /** Adds to the line's quantity (capped at MAX_QUANTITY), creating cart and line as needed. */
  add(cartId: string, productSlug: string, quantity: number): Promise<void>;
  /** Sets a line's quantity; zero removes it. */
  set(cartId: string, productSlug: string, quantity: number): Promise<void>;
  remove(cartId: string, productSlug: string): Promise<void>;
  /**
   * Reads the lines, lets `decide` price or refuse them, and empties the cart
   * only if it commits, all as one step. Two checkouts of the same cart at the
   * same time (a double click) can't both succeed.
   */
  checkout<T>(
    cartId: string,
    decide: (lines: StoredLine[]) => CheckoutDecision<T> | Promise<CheckoutDecision<T>>,
  ): Promise<T>;
};

/** Oldest carts are dropped beyond this, so abandoned carts can't grow memory forever. */
const MAX_CARTS = 10_000;

export function createMemoryCartStore(): CartStore {
  const carts = new Map<string, StoredLine[]>();
  /** The checkout currently running for a cart, which the next one waits for. */
  const checkoutsInProgress = new Map<string, Promise<void>>();

  function save(cartId: string, lines: StoredLine[]): void {
    carts.delete(cartId); // re-insert: Map order = least recently used first
    if (lines.length > 0) carts.set(cartId, lines);
    while (carts.size > MAX_CARTS) {
      const oldest = carts.keys().next().value;
      if (oldest === undefined) break;
      carts.delete(oldest);
    }
  }

  return {
    async get(cartId) {
      return [...((cartId && carts.get(cartId)) || [])];
    },

    async add(cartId, productSlug, quantity) {
      const lines = [...(carts.get(cartId) ?? [])];
      const index = lines.findIndex((line) => line.productSlug === productSlug);
      const current = index >= 0 ? (lines[index]?.quantity ?? 0) : 0;
      const line = { productSlug, quantity: Math.min(MAX_QUANTITY, current + quantity) };
      if (index >= 0) lines[index] = line;
      else lines.push(line);
      save(cartId, lines);
    },

    async set(cartId, productSlug, quantity) {
      const lines = (carts.get(cartId) ?? [])
        .map((line) => (line.productSlug === productSlug ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0);
      save(cartId, lines);
    },

    async remove(cartId, productSlug) {
      save(cartId, (carts.get(cartId) ?? []).filter((line) => line.productSlug !== productSlug));
    },

    // `decide` may await (it creates the order), and another checkout of the
    // same cart could run meanwhile. So checkouts of one cart take turns, like
    // the row lock in Postgres: the second one finds the cart already empty.
    async checkout(cartId, decide) {
      const previous = checkoutsInProgress.get(cartId) ?? Promise.resolve();
      const turn = previous.then(async () => {
        const { commit, result } = await decide([...(carts.get(cartId) ?? [])]);
        if (commit) carts.delete(cartId);
        return result;
      });
      const settled = turn.then(
        () => undefined,
        () => undefined,
      );
      checkoutsInProgress.set(cartId, settled);
      void settled.then(() => {
        if (checkoutsInProgress.get(cartId) === settled) checkoutsInProgress.delete(cartId);
      });
      return turn;
    },
  };
}
