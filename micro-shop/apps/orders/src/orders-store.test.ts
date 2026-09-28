import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createPublisher, subscribe } from '@micro-shop/event-bus';

let store: typeof import('./orders-store');
const created: string[] = [];

beforeAll(async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  subscribe('order.created', (event) => created.push(event.payload.orderId));
  store = await import('./orders-store');
});

describe('orders store', () => {
  it('creates a paid order with the next id and announces order.created', () => {
    const before = store.getSnapshot().orders.length;
    const order = store.createTestOrder();

    expect(store.getSnapshot().orders).toHaveLength(before + 1);
    expect(order.status).toBe('paid');
    expect(created).toEqual([order.id]);
  });

  it('learns about shipments only from shipment.created events (its read model)', () => {
    const order = store.createTestOrder();
    expect(store.getSnapshot().ordersWithShipment.has(order.id)).toBe(false);

    createPublisher('shipping')('shipment.created', {
      version: 1,
      shipmentId: 'SHP-9000',
      orderId: order.id,
    });

    expect(store.getSnapshot().ordersWithShipment.has(order.id)).toBe(true);
  });

  it('keeps the same snapshot object until something changes (useSyncExternalStore rule)', () => {
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});
