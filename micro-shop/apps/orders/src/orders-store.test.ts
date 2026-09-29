import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { OrderView } from '@micro-shop/orders-api/api-types';
import { createPublisher, subscribe } from '@micro-shop/event-bus';

let store: typeof import('./orders-store');
const created: string[] = [];

const order: OrderView = {
  id: '1002',
  customerName: 'Ada Lovelace',
  createdAt: '2026-09-24T15:40:00.000Z',
  status: 'shipped',
  lines: [{ productSlug: 'noise-cancelling-headphones', name: 'Noise-cancelling headphones', quantity: 1, unitPrice: 249 }],
  total: 249,
};

function answer(status: number, body: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeAll(async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  subscribe('order.created', (event) => created.push(event.payload.orderId));
  store = await import('./orders-store');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('orders store', () => {
  it('says why when the orders can’t be loaded', async () => {
    answer(401, { error: 'not_signed_in', message: 'Sign in to see your orders.' });
    await store.refreshOrders();
    expect(store.getSnapshot()).toMatchObject({ status: 'error', error: 'Sign in to see your orders.' });

    answer(503, { error: 'auth_unavailable', message: 'Sign-in can’t be checked right now, try again.' });
    await store.refreshOrders();
    expect(store.getSnapshot().error).toBe('Sign-in can’t be checked right now, try again.');
  });

  it('loads the signed-in customer’s orders from the Orders API', async () => {
    const fetch = answer(200, { orders: [order] });
    await store.refreshOrders();

    expect(fetch).toHaveBeenCalledWith('/api/orders', expect.anything());
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', refreshing: false, error: null });
    expect(store.findOrder('1002')).toEqual(order);
  });

  it('announces order.created once for a checkout, and ignores the old event version', async () => {
    answer(200, { orders: [order] });
    const publishFromCart = createPublisher('cart');
    const checkout = {
      version: 2 as const,
      checkoutId: 'chk-1',
      orderId: '1005',
      customer: { id: 'u-ada', name: 'Ada Lovelace' },
      items: [{ productSlug: 'standing-desk', name: 'Standing desk', quantity: 1, unitPrice: 540 }],
    };

    publishFromCart('checkout.completed', checkout);
    publishFromCart('checkout.completed', checkout); // a duplicate: still one announcement
    // @ts-expect-error: version 1 had no order id; a stale Cart could still send it
    publishFromCart('checkout.completed', { ...checkout, version: 1, orderId: undefined });

    expect(created).toEqual(['1005']);
  });

  it('learns about shipments only from shipment.created events (its read model)', () => {
    expect(store.getSnapshot().ordersWithShipment.has('1005')).toBe(false);
    createPublisher('shipping')('shipment.created', { version: 1, shipmentId: 'SHP-9000', orderId: '1005' });
    expect(store.getSnapshot().ordersWithShipment.has('1005')).toBe(true);
  });

  it('keeps the same snapshot object until something changes (useSyncExternalStore rule)', () => {
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});
