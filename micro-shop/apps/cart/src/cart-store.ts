// Cart's state. Private to Cart.
//
// A cart is a list of product SLUGS and quantities: references into the catalog,
// never copies of product data. Names and prices are looked up when the cart is
// shown (catalog-client.ts), so they are always current.
//
// Stored in localStorage, so a guest's cart survives reloads and closing the tab.
// Remote code runs on the HOST's origin, so this storage belongs to the page's
// origin (the gateway, localhost:8080), not to localhost:3005.
//
// Stage 2 moves the cart to a cart API on the server; this file's exports are
// the seam where that happens.

import { createLogger } from '@micro-shop/observability';

const log = createLogger('cart');

export type CartLine = { productSlug: string; quantity: number };
export type Cart = { lines: readonly CartLine[] };

const STORAGE_KEY = 'micro-shop.cart.v1';
export const MAX_QUANTITY = 10;
const SLUG_PATTERN = /^[a-z0-9-]{1,100}$/;

const listeners = new Set<() => void>();
// useSyncExternalStore requires the SAME object until something changes.
let cart: Cart = readStorage();

export function getCart(): Cart {
  return cart;
}

export function subscribeToCart(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function itemCount(value: Cart): number {
  return value.lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Adds `quantity` of a product. The slug comes from a URL, so it is validated. */
export function addItem(productSlug: string, quantity = 1): boolean {
  if (!SLUG_PATTERN.test(productSlug)) {
    log.warn('ignoring invalid product slug', { productSlug });
    return false;
  }
  const existing = cart.lines.find((line) => line.productSlug === productSlug);
  const lines = existing
    ? cart.lines.map((line) =>
        line === existing ? { ...line, quantity: clamp(line.quantity + quantity) } : line,
      )
    : [...cart.lines, { productSlug, quantity: clamp(quantity) }];
  update({ lines });
  log.info('item added', { productSlug, quantity });
  return true;
}

/** Sets a line's quantity; zero or less removes it. */
export function setQuantity(productSlug: string, quantity: number): void {
  if (quantity <= 0) {
    removeItem(productSlug);
    return;
  }
  update({
    lines: cart.lines.map((line) =>
      line.productSlug === productSlug ? { ...line, quantity: clamp(quantity) } : line,
    ),
  });
}

export function removeItem(productSlug: string): void {
  update({ lines: cart.lines.filter((line) => line.productSlug !== productSlug) });
}

export function clearCart(): void {
  update({ lines: [] });
}

function update(next: Cart): void {
  cart = next;
  writeStorage(next);
  notify();
}

function notify(): void {
  for (const listener of listeners) listener();
}

function clamp(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

// Another tab changed the cart: pick up its version.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    cart = readStorage();
    notify();
  }
});

function readStorage(): Cart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [] };
    const parsed: unknown = JSON.parse(raw);
    return isCart(parsed) ? parsed : { lines: [] };
  } catch {
    return { lines: [] };
  }
}

function writeStorage(value: Cart): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota): the cart lives in memory only.
  }
}

function isCart(value: unknown): value is Cart {
  if (typeof value !== 'object' || value === null) return false;
  const { lines } = value as { lines?: unknown };
  return (
    Array.isArray(lines) &&
    lines.every(
      (line: unknown) =>
        typeof line === 'object' &&
        line !== null &&
        typeof (line as CartLine).productSlug === 'string' &&
        SLUG_PATTERN.test((line as CartLine).productSlug) &&
        Number.isInteger((line as CartLine).quantity) &&
        (line as CartLine).quantity > 0,
    )
  );
}
