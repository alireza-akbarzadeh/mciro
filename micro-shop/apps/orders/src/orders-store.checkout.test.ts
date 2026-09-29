import { describe, expect, it, vi } from 'vitest';
import type { MicroShopEvents } from '@micro-shop/contracts';
import { createPublisher, subscribe } from '@micro-shop/event-bus';

// The real sequence in the browser: the customer checks out in Cart BEFORE
// Orders' code is loaded (the server has already created the order), then Cart
// navigates to /orders/:orderId, which loads Orders. Orders must still
// announce order.created, catching up from the bus's replay log.
// (Separate file = separate environment, so the store really loads "late".)

const checkout: MicroShopEvents['checkout.completed'] = {
  version: 2,
  checkoutId: 'chk-1',
  orderId: '1005',
  customer: { id: 'u-grace', name: 'Grace Hopper' },
  items: [{ productSlug: 'standing-desk', name: 'Standing desk', quantity: 1, unitPrice: 540 }],
};

describe('orders store loaded after a checkout', () => {
  it('announces the new order to the page exactly once', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const created: string[] = [];
    subscribe('order.created', (event) => created.push(event.payload.orderId));

    const publishFromCart = createPublisher('cart');
    publishFromCart('checkout.completed', checkout);
    expect(created).toEqual([]); // nobody listening yet

    await import('./orders-store');
    expect(created).toEqual(['1005']);

    publishFromCart('checkout.completed', checkout);
    expect(created).toEqual(['1005']);
  });
});
