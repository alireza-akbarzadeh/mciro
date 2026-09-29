import { useSyncExternalStore } from 'react';
import type { CatalogEndpoint, CatalogProduct } from '@micro-shop/contracts';
import { createLogger, errorData } from '@micro-shop/observability';

// Cart's client for the catalog's public READ API (owned by the storefront team).
//
// Fetched once per page, on first use, and shared by every Cart component.
// Failures stay inside Cart: the cart shows "prices unavailable" with a retry,
// instead of crashing the remote.

const log = createLogger('cart');

const CATALOG_URL: CatalogEndpoint = '/catalog.json';

export type Catalog = ReadonlyMap<string, CatalogProduct>;

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; products: Catalog }
  | { status: 'error'; message: string };

let state: CatalogState = { status: 'loading' };
let started = false;
const listeners = new Set<() => void>();

function setState(next: CatalogState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function getCatalogState(): CatalogState {
  return state;
}

export function subscribeToCatalog(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) void loadCatalog();
  return () => {
    listeners.delete(listener);
  };
}

export async function loadCatalog(): Promise<void> {
  started = true;
  if (state.status !== 'loading') setState({ status: 'loading' });
  try {
    const response = await fetch(CATALOG_URL, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = parseCatalog(await response.json());
    setState({ status: 'ready', products: new Map(products.map((p) => [p.slug, p])) });
  } catch (error) {
    log.error(`catalog unavailable (${CATALOG_URL})`, errorData(error));
    setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}

export function useCatalog(): CatalogState {
  return useSyncExternalStore(subscribeToCatalog, getCatalogState);
}

/** Another team's API: validate what comes back instead of trusting the type. */
function parseCatalog(value: unknown): CatalogProduct[] {
  const products = (value as { products?: unknown } | null)?.products;
  if (!Array.isArray(products)) throw new Error('catalog response has no products');
  return products.filter((item: unknown): item is CatalogProduct => {
    if (typeof item !== 'object' || item === null) return false;
    const { slug, name, price } = item as Record<string, unknown>;
    return typeof slug === 'string' && typeof name === 'string' && typeof price === 'number';
  });
}
