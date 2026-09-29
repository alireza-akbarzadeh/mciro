// Cart's client-side state: this page's copy of the cart held by the Cart API
// (apps/cart-api, behind the gateway at /api/cart).
//
// The server owns the cart. It's keyed by an HttpOnly cookie this code can't
// read, and priced there from the catalog, so the browser never decides a price.
// This module fetches the cart, sends changes, and gives every Cart component on
// the page (the cart page, checkout, the header badge) one shared copy.
//
// Stage 1 kept the cart in localStorage. The exported functions kept their
// names, so the components barely changed.

import type {
  AddItemBody,
  ApiError,
  CartView,
  CheckoutResult,
  SetQuantityBody,
} from '@micro-shop/cart-api/api-types';
import { createLogger, errorData } from '@micro-shop/observability';

export { MAX_QUANTITY } from '@micro-shop/cart-api/api-types';

const log = createLogger('cart');
const API = '/api/cart';

export type CartState =
  | { status: 'loading' }
  /** `error`: the last change failed; the cart shown is the last one the server confirmed. */
  | { status: 'ready'; cart: CartView; error: string | null }
  | { status: 'error'; message: string };

export class CartApiError extends Error {
  override name = 'CartApiError';
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let state: CartState = { status: 'loading' };
let started = false;
const listeners = new Set<() => void>();

// Responses can arrive out of order: a slow GET may finish after a fast POST.
// Only a response to a request issued after the last applied one replaces the cart.
let issued = 0;
let applied = 0;

export function getCartState(): CartState {
  return state;
}

export function subscribeToCart(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) void refreshCart();
  return () => {
    listeners.delete(listener);
  };
}

function setState(next: CartState): void {
  state = next;
  for (const listener of listeners) listener();
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers:
      body === undefined
        ? { accept: 'application/json' }
        : { accept: 'application/json', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const { error, message } = (data ?? {}) as Partial<ApiError>;
    throw new CartApiError(response.status, message ?? `HTTP ${response.status}`, error);
  }
  return data as T;
}

/** Sends a request that answers with the cart, and shows that cart. Never throws. */
async function update(method: string, path: string, body?: unknown): Promise<void> {
  started = true;
  const ticket = ++issued;
  try {
    const cart = await send<CartView>(method, path, body);
    if (ticket < applied) return;
    applied = ticket;
    setState({ status: 'ready', cart, error: null });
  } catch (error) {
    log.error(`cart request failed: ${method} ${API}${path}`, errorData(error));
    const message = error instanceof Error ? error.message : String(error);
    if (state.status === 'ready') {
      setState({ ...state, error: message });
    } else if (method === 'GET') {
      setState({ status: 'error', message });
    } else {
      // A change failed before the cart ever loaded: load it, then say what failed.
      await update('GET', '');
      const loaded = getCartState(); // re-read: the await changed it
      if (loaded.status === 'ready') setState({ ...loaded, error: message });
    }
  }
}

export function refreshCart(): Promise<void> {
  return update('GET', '');
}

export function addItem(productSlug: string, quantity = 1): Promise<void> {
  const body: AddItemBody = { productSlug, quantity };
  return update('POST', '/items', body);
}

/** Zero removes the line. */
export function setQuantity(productSlug: string, quantity: number): Promise<void> {
  const body: SetQuantityBody = { quantity: Math.max(0, quantity) };
  return update('PUT', `/items/${encodeURIComponent(productSlug)}`, body);
}

export function removeItem(productSlug: string): Promise<void> {
  return update('DELETE', `/items/${encodeURIComponent(productSlug)}`);
}

/**
 * Prices and empties the cart ON THE SERVER, for the customer the Auth API says
 * is signed in (the browser sends nothing about who it is). Returns what was
 * bought. Throws CartApiError: 401 signed out, 409 already empty (a double click).
 */
export async function checkout(): Promise<CheckoutResult> {
  const result = await send<CheckoutResult>('POST', '/checkout');
  void refreshCart();
  return result;
}

// Another tab may have changed the cart: catch up when this tab is shown again.
document.addEventListener('visibilitychange', () => {
  if (started && document.visibilityState === 'visible') void refreshCart();
});
