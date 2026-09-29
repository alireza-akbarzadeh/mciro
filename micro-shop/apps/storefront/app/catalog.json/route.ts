import type { CatalogResponse } from '@micro-shop/contracts';
import { products } from '../../lib/catalog';

// GET /catalog.json: the catalog's public READ API, typed by @micro-shop/contracts.
//
// The Cart team keeps only product slugs in a cart; this is where it looks up
// names and prices. It exposes the public fields and nothing else, so the
// storefront can reshape its own Product type freely. In production this is a
// catalog service; here it's a static file generated at build time.
export const dynamic = 'force-static';

export function GET() {
  const body: CatalogResponse = {
    products: products.map(({ slug, name, price }) => ({ slug, name, price })),
  };
  return Response.json(body);
}
