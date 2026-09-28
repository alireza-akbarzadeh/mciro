import { describe, expect, it, vi } from 'vitest';
import { createPublisher } from '@micro-shop/event-bus';

// The scenario from the guide: an order is created while Shipping's code is not
// loaded yet. When Shipping loads, it must catch up from the bus's replay log.
// (Separate file = separate environment, so the store really loads "late".)

describe('shipping store loaded after the order was created', () => {
  it('catches up on missed order.created events via replay', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    createPublisher('orders')('order.created', { version: 1, orderId: '8001' });

    const store = await import('./shipping-store');

    expect(store.findShipmentForOrder('8001')).toBeDefined();
  });
});
