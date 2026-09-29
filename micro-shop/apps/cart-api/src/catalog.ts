import type { CatalogProduct, CatalogResponse } from '@micro-shop/contracts';
import { fetchJson, UpstreamUnavailableError } from '@micro-shop/service-kit';

// The catalog, as the Cart API sees it: the storefront's public read API
// (/catalog.json), called server to server. Prices are looked up HERE, never
// taken from the browser, so a customer can't change what they pay.

export type Catalog = ReadonlyMap<string, CatalogProduct>;

/** Returns the current catalog, or throws UpstreamUnavailableError. */
export type CatalogSource = () => Promise<Catalog>;

/** Fetches /catalog.json, keeping it for `ttlMs` so a busy cart doesn't hammer the catalog. */
export function httpCatalog(url: string, ttlMs = 30_000): CatalogSource {
  let cached: { at: number; products: Catalog } | null = null;

  return async () => {
    if (cached && Date.now() - cached.at < ttlMs) return cached.products;
    const products = parseCatalog(await fetchJson(url));
    cached = { at: Date.now(), products };
    return products;
  };
}

/** A fixed catalog, for tests. */
export function staticCatalog(products: CatalogProduct[]): CatalogSource {
  const catalog: Catalog = new Map(products.map((product) => [product.slug, product]));
  return async () => catalog;
}

/** Another team's API: keep only entries that match the contract. */
function parseCatalog(value: unknown): Catalog {
  const products = (value as Partial<CatalogResponse> | null)?.products;
  // A malformed answer is an outage, not an empty catalog (which would make
  // every product in every cart look discontinued).
  if (!Array.isArray(products)) throw new UpstreamUnavailableError('catalog response has no products');
  const valid = products.filter(
    (item): item is CatalogProduct =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.slug === 'string' &&
      typeof item.name === 'string' &&
      typeof item.price === 'number',
  );
  return new Map(valid.map((product) => [product.slug, product]));
}
