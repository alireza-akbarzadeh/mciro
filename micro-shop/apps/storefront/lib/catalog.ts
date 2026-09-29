// The CATALOG domain, owned by the storefront team. In production this comes
// from a product service at build or request time; here it's static data.

export type Product = {
  slug: string;
  name: string;
  category: string;
  price: number;
  summary: string;
  description: string;
};

export const products: readonly Product[] = [
  {
    slug: 'mechanical-keyboard',
    name: 'Mechanical keyboard',
    category: 'Peripherals',
    price: 129,
    summary: 'Hot-swappable switches, aluminium case, USB-C.',
    description:
      'A 75% mechanical keyboard with hot-swappable tactile switches, a gasket-mounted aluminium case and a detachable USB-C cable. Built for long writing and coding sessions.',
  },
  {
    slug: 'noise-cancelling-headphones',
    name: 'Noise-cancelling headphones',
    category: 'Audio',
    price: 249,
    summary: 'Adaptive noise cancelling, 40-hour battery.',
    description:
      'Over-ear headphones with adaptive noise cancelling, multipoint Bluetooth and a 40-hour battery. Folds flat into the included case.',
  },
  {
    slug: '27-inch-monitor',
    name: '27" monitor',
    category: 'Displays',
    price: 319,
    summary: '1440p IPS panel, 144 Hz, USB-C with 90 W charging.',
    description:
      'A 27-inch 2560×1440 IPS display at 144 Hz with factory colour calibration and a single-cable USB-C connection that charges your laptop at 90 W.',
  },
  {
    slug: 'monitor-arm',
    name: 'Monitor arm',
    category: 'Desk',
    price: 89,
    summary: 'Gas-spring arm for screens up to 32".',
    description:
      'A gas-spring monitor arm with cable management, VESA 75/100 mounting and a desk clamp. Holds displays up to 32 inches and 9 kg.',
  },
  {
    slug: 'standing-desk',
    name: 'Standing desk',
    category: 'Desk',
    price: 540,
    summary: 'Dual-motor, 160 × 80 cm, four memory presets.',
    description:
      'A dual-motor electric standing desk with a 160 × 80 cm top, four height presets and anti-collision detection.',
  },
  {
    slug: 'usb-c-cable',
    name: 'USB-C cable',
    category: 'Accessories',
    price: 12,
    summary: 'Braided, 2 m, 100 W, USB 3.2.',
    description: 'A 2-metre braided USB-C to USB-C cable rated for 100 W charging and 10 Gbit/s data.',
  },
];

export function findProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

/** Longer queries are cut here: the query comes straight from the URL. */
export const MAX_QUERY_LENGTH = 100;

/** Trims and caps a raw `?q=` value. Multiple values (`?q=a&q=b`) keep the first. */
export function normalizeQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? '').trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * Catalog search, owned by the storefront like the rest of the catalog.
 *
 * Every word must appear somewhere in the product's name, category, summary or
 * description (case-insensitive). In production this becomes a call to a search
 * service; the page that renders the results doesn't need to change.
 */
export function searchProducts(query: string): readonly Product[] {
  const terms = normalizeQuery(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return products.filter((product) => {
    const text = [product.name, product.category, product.summary, product.description]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Public origin behind the gateway. Used for canonical URLs, Open Graph and the sitemap. */
export const SITE_URL = 'http://localhost:8080';
