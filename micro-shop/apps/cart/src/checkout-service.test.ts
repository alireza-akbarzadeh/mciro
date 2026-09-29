import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogProduct, EventEnvelope } from '@micro-shop/contracts';
import { subscribe } from '@micro-shop/event-bus';
import { addItem, clearCart, getCart } from './cart-store';
import { CheckoutError, completeCheckout, priceCart } from './checkout-service';

const catalog = new Map<string, CatalogProduct>([
  ['standing-desk', { slug: 'standing-desk', name: 'Standing desk', price: 540 }],
  ['usb-c-cable', { slug: 'usb-c-cable', name: 'USB-C cable', price: 12 }],
]);

const ada = { id: 'u-ada', name: 'Ada Lovelace' };

const published: EventEnvelope<'checkout.completed'>[] = [];
subscribe('checkout.completed', (event) => published.push(event));

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  clearCart();
  published.length = 0;
});

describe('pricing', () => {
  it('prices each line from the catalog and flags products that are gone', () => {
    addItem('standing-desk');
    addItem('usb-c-cable', 3);
    addItem('discontinued-lamp');

    const priced = priceCart(getCart(), catalog);
    expect(priced.total).toBe(540 + 3 * 12);
    expect(priced.hasUnavailable).toBe(true);
    expect(priced.lines.at(-1)?.product).toBeUndefined();
  });
});

describe('checkout', () => {
  it('announces checkout.completed with a snapshot of what was bought, then empties the cart', () => {
    addItem('standing-desk');
    addItem('usb-c-cable', 2);

    const checkoutId = completeCheckout(ada, getCart(), catalog);

    expect(published).toHaveLength(1);
    const [event] = published;
    expect(event?.source).toBe('cart');
    expect(event?.payload).toEqual({
      version: 1,
      checkoutId,
      customer: { id: 'u-ada', name: 'Ada Lovelace' },
      items: [
        { productSlug: 'standing-desk', name: 'Standing desk', quantity: 1, unitPrice: 540 },
        { productSlug: 'usb-c-cable', name: 'USB-C cable', quantity: 2, unitPrice: 12 },
      ],
    });
    expect(getCart().lines).toEqual([]);
  });

  it('sends only the contract fields of the customer, whatever it is given', () => {
    addItem('standing-desk');
    const withEmail = { ...ada, email: 'ada@example.com' };

    completeCheckout(withEmail, getCart(), catalog);

    expect(published[0]?.payload.customer).toEqual({ id: 'u-ada', name: 'Ada Lovelace' });
  });

  it('refuses an empty cart or unavailable products, and keeps the cart', () => {
    expect(() => completeCheckout(ada, getCart(), catalog)).toThrow(CheckoutError);

    addItem('discontinued-lamp');
    expect(() => completeCheckout(ada, getCart(), catalog)).toThrow(CheckoutError);

    expect(published).toEqual([]);
    expect(getCart().lines).toHaveLength(1);
  });
});
