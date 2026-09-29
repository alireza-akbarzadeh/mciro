import type { CatalogResponse } from '@micro-shop/contracts';
import { getProducts } from '../../lib/catalog';

// GET /catalog.json: the catalog's public READ API, typed by @micro-shop/contracts.
//
// The Cart API reads prices here. It exposes the public fields and nothing
// else, so the catalog's own tables (db/schema.ts) can change freely. Generated
// from the database, cached, and regenerated at most every 5 minutes.
export const dynamic = 'force-static';
export const revalidate = 300;

export async function GET() {
  const body: CatalogResponse = {
    products: (await getProducts()).map(({ slug, name, price }) => ({ slug, name, price })),
  };
  return Response.json(body);
}
