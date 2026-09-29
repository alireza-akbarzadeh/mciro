import type { MetadataRoute } from 'next';
import { getCategories, getProducts, SITE_URL } from '../lib/catalog';

// /sitemap.xml: tells search engines which PUBLIC pages exist, from the catalog
// database. Only the storefront's zone is listed; the signed-in app is absent.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    ...categories.map((category) => ({
      url: `${SITE_URL}/categories/${category.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
