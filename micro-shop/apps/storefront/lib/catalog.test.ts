import { describe, expect, it } from 'vitest';
import { findProduct, getProductsInCategory, MAX_QUERY_LENGTH, matchProducts, normalizeQuery, type Product } from './catalog';
import { seedCategories, seedProducts } from './catalog-data';

// The search rule is tested against a fixed list, so editing the seed catalog
// can't break these tests. The seed data gets its own consistency checks.

const fixture: Product[] = [
  { slug: 'keyboard', name: 'Mechanical keyboard', category: 'Peripherals', categorySlug: 'peripherals', price: 129, summary: 'Hot-swappable, USB-C.', description: 'Tactile switches.' },
  { slug: 'headphones', name: 'Headphones', category: 'Audio', categorySlug: 'audio', price: 249, summary: 'Noise cancelling.', description: 'Multipoint Bluetooth.' },
  { slug: 'desk', name: 'Standing desk', category: 'Desk', categorySlug: 'desk', price: 540, summary: 'Dual motor.', description: 'Four presets.' },
  { slug: 'arm', name: 'Monitor arm', category: 'Desk', categorySlug: 'desk', price: 89, summary: 'Gas spring.', description: 'USB-C passthrough.' },
  { slug: 'cable', name: 'USB-C cable', category: 'Accessories', categorySlug: 'accessories', price: 12, summary: 'Braided, 2 m.', description: '100 W.' },
];

const slugs = (query: string) => matchProducts(fixture, query).map((product) => product.slug);

describe('catalog search', () => {
  it('matches name, category, summary and description, ignoring case', () => {
    expect(slugs('KEYBOARD')).toEqual(['keyboard']); // name
    expect(slugs('desk')).toEqual(['desk', 'arm']); // category "Desk"
    expect(slugs('bluetooth')).toEqual(['headphones']); // description only
  });

  it('requires every word to match', () => {
    expect(slugs('usb-c')).toEqual(['keyboard', 'arm', 'cable']);
    expect(slugs('usb-c braided')).toEqual(['cable']);
  });

  it('returns nothing for an empty or blank query, and for no match', () => {
    expect(slugs('')).toEqual([]);
    expect(slugs('   ')).toEqual([]);
    expect(slugs('toaster')).toEqual([]);
  });

  it('normalizes the raw ?q= value from the URL', () => {
    expect(normalizeQuery(undefined)).toBe('');
    expect(normalizeQuery('  desk  ')).toBe('desk');
    expect(normalizeQuery(['monitor', 'desk'])).toBe('monitor');
    expect(normalizeQuery('x'.repeat(500))).toHaveLength(MAX_QUERY_LENGTH);
  });
});

describe('seed catalog', () => {
  it('is consistent: unique slugs in the URL format, known categories, positive prices', () => {
    const slugsSeen = new Set(seedProducts.map((product) => product.slug));
    expect(slugsSeen.size).toBe(seedProducts.length);
    const categorySlugs = new Set(seedCategories.map((category) => category.slug));
    for (const product of seedProducts) {
      expect(product.slug).toMatch(/^[a-z0-9-]{1,100}$/); // what the Cart API accepts
      expect(categorySlugs.has(product.categorySlug)).toBe(true);
      expect(product.price).toBeGreaterThan(0);
    }
    // Every category has something in it.
    for (const category of seedCategories) {
      expect(seedProducts.some((product) => product.categorySlug === category.slug)).toBe(true);
    }
  });

  it('is served when there is no database (DATABASE_URL unset)', async () => {
    expect((await findProduct('standing-desk'))?.category).toBe('Desk');
    expect((await getProductsInCategory('audio')).map((product) => product.slug)).toContain('usb-microphone');
    expect(await findProduct('toaster')).toBeUndefined();
  });
});
