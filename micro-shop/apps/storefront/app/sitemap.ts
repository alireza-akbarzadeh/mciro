import type { MetadataRoute } from 'next';
import { products, SITE_URL } from '../lib/catalog';

// /sitemap.xml: tells search engines which PUBLIC pages exist. Only the
// storefront's zone is listed; the signed-in app is deliberately absent.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    ...products.map((product) => ({
      url: `${SITE_URL}/products/${product.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
