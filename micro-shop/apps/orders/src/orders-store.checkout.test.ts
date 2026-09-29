import { describe, expect, it, vi } from 'vitest';
import type { MicroShopEvents } from '@micro-shop/contracts';
import { createPublisher, subscribe } from '@micro-shop/event-bus';

// The real sequence in the browser: the customer checks out in Cart BEFORE
// Orders' code is loaded, then Cart navigates to /orders/checkout/:id, which
// loads Orders. Orders must catch up from the bus's replay log.
// (Separate file = separate environment, so the store really loads "late".)

const checkout: MicroShopEvents['checkout.completed'] = {
  version: 1,
  checkoutId: 'chk-1',
  customer: { id: 'u-grace', name: 'Grace Hopper' },
  items: [
    { productSlug: 'standing-desk', name: 'Standing desk', quantity: 1, unitPrice: 540 },
    { productSlug: 'usb-c-cable', name: 'USB-C cable', quantity: 2, unitPrice: 12 },
  ],
};

describe('orders store loaded after a checkout', () => {
  it('creates exactly one paid order per checkout and announces it', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const created: string[] = [];
    subscribe('order.created', (event) => created.push(event.payload.orderId));

    const publishFromCart = createPublisher('cart');
    publishFromCart('checkout.completed', checkout);

    const store = await import('./orders-store');
    const order = store.findOrderByCheckout('chk-1');

    expect(order).toMatchObject({
      customer: 'Grace Hopper',
      status: 'paid',
      lines: [
        { product: 'Standing desk', quantity: 1, unitPrice: 540 },
        { product: 'USB-C cable', quantity: 2, unitPrice: 12 },
      ],
    });
    expect(created).toEqual([order?.id]);

    // The same fact again (a duplicate publish): still one order.
    publishFromCart('checkout.completed', checkout);
    expect(store.getSnapshot().orders.filter((o) => o.checkoutId === 'chk-1')).toHaveLength(1);
    expect(created).toHaveLength(1);
  });
});
