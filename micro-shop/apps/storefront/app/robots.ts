import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/catalog';

// /robots.txt draws the SEO boundary: crawl the public zone, stay out of the
// signed-in app (served by the shell), which has nothing to index anyway.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/orders', '/shipping'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
