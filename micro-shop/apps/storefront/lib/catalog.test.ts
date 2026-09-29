import { describe, expect, it } from 'vitest';
import { MAX_QUERY_LENGTH, normalizeQuery, searchProducts } from './catalog';

const slugs = (query: string) => searchProducts(query).map((product) => product.slug);

describe('catalog search', () => {
  it('matches name, category, summary and description, ignoring case', () => {
    expect(slugs('KEYBOARD')).toEqual(['mechanical-keyboard']); // name
    expect(slugs('desk')).toEqual(['monitor-arm', 'standing-desk']); // category "Desk"
    expect(slugs('bluetooth')).toEqual(['noise-cancelling-headphones']); // description only
  });

  it('requires every word to match', () => {
    expect(slugs('usb-c')).toEqual(['mechanical-keyboard', '27-inch-monitor', 'usb-c-cable']);
    expect(slugs('usb-c braided')).toEqual(['usb-c-cable']);
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
