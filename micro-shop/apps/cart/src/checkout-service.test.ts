import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutResult } from '@micro-shop/cart-api/api-types';
import type { EventEnvelope } from '@micro-shop/contracts';
import { subscribe } from '@micro-shop/event-bus';
import { CartApiError } from './cart-store';
import { completeCheckout } from './checkout-service';

// Checkout = the server prices the cart, creates the order and empties the
// cart; then Cart announces checkout.completed with exactly what it returned.

const ada = { id: 'u-ada', name: 'Ada Lovelace' };

const serverResult: CheckoutResult = {
  checkoutId: '7702f16e-c810-4fff-bb52-da3b50202b9d',
  orderId: '1005',
  customer: ada,
  items: [{ productSlug: 'standing-desk', name: 'Standing desk', quantity: 1, unitPrice: 540 }],
};

const published: EventEnvelope<'checkout.completed'>[] = [];
subscribe('checkout.completed', (event) => published.push(event));

function answer(status: number, body: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeEach(() => {
  published.length = 0;
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkout', () => {
  it('announces checkout.completed with what the SERVER priced', async () => {
    const fetch = answer(201, serverResult);

    const orderId = await completeCheckout();

    expect(orderId).toBe('1005');
    // Nothing about who is buying is sent: the server knows from the session cookie.
    expect(fetch).toHaveBeenCalledWith(
      '/api/cart/checkout',
      expect.objectContaining({ method: 'POST', body: undefined }),
    );
    expect(published).toHaveLength(1);
    expect(published[0]?.source).toBe('cart');
    expect(published[0]?.payload).toEqual({ version: 2, ...serverResult });
  });

  it('announces nothing when the server refuses', async () => {
    answer(409, { error: 'empty_cart', message: 'Your cart is empty.' });

    await expect(completeCheckout()).rejects.toThrow(CartApiError);
    await expect(completeCheckout()).rejects.toThrow('Your cart is empty.');
    expect(published).toEqual([]);
  });
});
