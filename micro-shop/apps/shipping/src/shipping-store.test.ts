import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createPublisher, subscribe } from '@micro-shop/event-bus';

// One store instance for this file (module state is per test file).
let store: typeof import('./shipping-store');
const announced: string[] = [];

beforeAll(async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  subscribe('shipment.created', (event) => announced.push(event.payload.orderId));
  store = await import('./shipping-store');
});

describe('shipping store reacting to order.created', () => {
  it('creates a shipment and announces shipment.created', () => {
    createPublisher('orders')('order.created', { version: 1, orderId: '7001' });

    const shipment = store.findShipmentForOrder('7001');
    expect(shipment?.status).toBe('label_created');
    expect(announced).toContain('7001');
  });

  it('is idempotent: a duplicate event does not create a second shipment', () => {
    const publish = createPublisher('orders');
    publish('order.created', { version: 1, orderId: '7002' });
    publish('order.created', { version: 1, orderId: '7002' });

    expect(store.getShipments().filter((s) => s.orderId === '7002')).toHaveLength(1);
    expect(announced.filter((id) => id === '7002')).toHaveLength(1);
  });

  it('never reuses a shipment id', () => {
    const ids = store.getShipments().map((shipment) => shipment.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
