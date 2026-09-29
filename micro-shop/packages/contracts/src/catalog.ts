// Contract for the catalog's public READ API: GET /catalog.json.
//
// Producer: apps/storefront (app/catalog.json/route.ts), the team that owns the catalog.
// Consumers: apps/cart-api (server to server), to price the product slugs in a cart.
//
// Like the URL contract, this is a promise to other teams: renaming a field
// breaks every consumer, so it fails their builds here first.

export type CatalogProduct = {
  slug: string;
  name: string;
  /** Unit price in USD. */
  price: number;
};

export type CatalogResponse = {
  products: CatalogProduct[];
};

/** Where the catalog is served, on the public origin behind the gateway. */
export type CatalogEndpoint = '/catalog.json';
