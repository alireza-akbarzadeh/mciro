import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addItem,
  clearCart,
  getCart,
  itemCount,
  MAX_QUANTITY,
  removeItem,
  setQuantity,
} from './cart-store';

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  clearCart();
});

describe('cart store', () => {
  it('keeps product slugs and quantities, merging repeated adds', () => {
    addItem('standing-desk');
    addItem('usb-c-cable', 2);
    addItem('standing-desk');

    expect(getCart().lines).toEqual([
      { productSlug: 'standing-desk', quantity: 2 },
      { productSlug: 'usb-c-cable', quantity: 2 },
    ]);
    expect(itemCount(getCart())).toBe(4);
  });

  it('rejects slugs that are not slugs (they arrive in a URL)', () => {
    expect(addItem('<script>')).toBe(false);
    expect(addItem('')).toBe(false);
    expect(getCart().lines).toEqual([]);
  });

  it('caps quantities and removes a line set to zero', () => {
    addItem('monitor-arm', 50);
    expect(getCart().lines[0]?.quantity).toBe(MAX_QUANTITY);

    setQuantity('monitor-arm', 0);
    expect(getCart().lines).toEqual([]);
  });

  it('removes a single line', () => {
    addItem('monitor-arm');
    addItem('standing-desk');
    removeItem('monitor-arm');
    expect(getCart().lines.map((line) => line.productSlug)).toEqual(['standing-desk']);
  });

  it('survives a reload through localStorage, and ignores corrupt data', async () => {
    addItem('standing-desk', 3);

    vi.resetModules();
    const reloaded = await import('./cart-store');
    expect(reloaded.getCart().lines).toEqual([{ productSlug: 'standing-desk', quantity: 3 }]);

    localStorage.setItem('micro-shop.cart.v1', '{"lines":[{"productSlug":"x","quantity":-1}]}');
    vi.resetModules();
    const corrupt = await import('./cart-store');
    expect(corrupt.getCart().lines).toEqual([]);
  });

  it('keeps the same cart object until something changes (useSyncExternalStore rule)', () => {
    expect(getCart()).toBe(getCart());
  });
});
