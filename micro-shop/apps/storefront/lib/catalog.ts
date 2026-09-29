import { asc, eq } from 'drizzle-orm';
import { categories as categoriesTable, products as productsTable } from '../db/schema';
import { type Category, type Product, seedCatalog, seedCategories } from './catalog-data';
import { getDb } from './db';

// The CATALOG domain, owned by the storefront team.
//
// Read from Postgres (the `catalog` schema, db/schema.ts) when DATABASE_URL is
// set, from the seed data (catalog-data.ts) otherwise. Pages don't know which:
// they call these functions. Server-only (the database pool lives in Node).

export type { Category, Product };

async function loadProducts(where?: { categorySlug?: string; slug?: string }): Promise<Product[]> {
  const db = getDb();
  if (!db) {
    return seedCatalog().filter(
      (product) =>
        (!where?.categorySlug || product.categorySlug === where.categorySlug) &&
        (!where?.slug || product.slug === where.slug),
    );
  }

  const condition = where?.slug
    ? eq(productsTable.slug, where.slug)
    : where?.categorySlug
      ? eq(productsTable.categorySlug, where.categorySlug)
      : undefined;

  const rows = await db
    .select({
      slug: productsTable.slug,
      name: productsTable.name,
      category: categoriesTable.name,
      categorySlug: productsTable.categorySlug,
      priceCents: productsTable.priceCents,
      summary: productsTable.summary,
      description: productsTable.description,
    })
    .from(productsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.slug, productsTable.categorySlug))
    .where(condition)
    .orderBy(asc(categoriesTable.name), asc(productsTable.name));

  return rows.map(({ priceCents, ...product }) => ({ ...product, price: priceCents / 100 }));
}

export function getProducts(): Promise<Product[]> {
  return loadProducts();
}

export function getProductsInCategory(categorySlug: string): Promise<Product[]> {
  return loadProducts({ categorySlug });
}

export async function findProduct(slug: string): Promise<Product | undefined> {
  const [product] = await loadProducts({ slug });
  return product;
}

export async function getCategories(): Promise<Category[]> {
  const db = getDb();
  if (!db) return [...seedCategories];
  return db.select().from(categoriesTable).orderBy(asc(categoriesTable.name));
}

export async function findCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((category) => category.slug === slug);
}

/** Longer queries are cut here: the query comes straight from the URL. */
export const MAX_QUERY_LENGTH = 100;

/** Trims and caps a raw `?q=` value. Multiple values (`?q=a&q=b`) keep the first. */
export function normalizeQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? '').trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * The search rule: every word must appear somewhere in the product's name,
 * category, summary or description (case-insensitive). Pure, so it's tested
 * without a database.
 */
export function matchProducts(products: readonly Product[], query: string): Product[] {
  const terms = normalizeQuery(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return products.filter((product) => {
    const text = [product.name, product.category, product.summary, product.description]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

/**
 * Catalog search. The catalog is small, so it's matched in memory; a large one
 * would use Postgres full-text search or a search service, behind this same function.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  if (!normalizeQuery(query)) return [];
  return matchProducts(await getProducts(), query);
}

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Public origin behind the gateway. Used for canonical URLs, Open Graph and the sitemap. */
export const SITE_URL = 'http://localhost:8080';
