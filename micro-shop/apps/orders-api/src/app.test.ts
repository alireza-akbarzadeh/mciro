// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import type { Customer } from '@micro-shop/contracts';
import { type Identity, staticIdentity, UpstreamUnavailableError } from '@micro-shop/service-kit';
import type { CreateOrderBody, CreateOrderResult, OrdersResponse, OrderView } from './api-types.ts';
import { buildApp } from './app.ts';
import { seedDemoOrders } from './db/seed-data.ts';
import { createMemoryOrderStore, type OrderStore } from './order-store.ts';

const ada: Customer = { id: 'u-ada', name: 'Ada Lovelace' };
const grace: Customer = { id: 'u-grace', name: 'Grace Hopper' };
const token = 'test-token';

let store: OrderStore;

beforeEach(async () => {
  store = createMemoryOrderStore();
  await seedDemoOrders(store);
});

function api(identity: Identity = staticIdentity(ada)) {
  return buildApp({ orders: store, identity, serviceToken: token });
}

const checkout = (checkoutId = 'c-1'): CreateOrderBody => ({
  checkoutId,
  customer: grace,
  items: [
    { productSlug: 'monitor-arm', name: 'Monitor arm', quantity: 2, unitPrice: 89 },
    { productSlug: 'usb-c-cable', name: 'USB-C cable', quantity: 1, unitPrice: 12.5 },
  ],
});

function createOrder(body: object, authorization = `Bearer ${token}`) {
  return api().inject({ method: 'POST', url: '/internal/orders', headers: { authorization }, payload: body });
}

describe('orders API: customers', () => {
  it('lists only the signed-in customer’s orders, newest first', async () => {
    const response = await api().inject({ method: 'GET', url: '/api/orders' });
    const { orders } = response.json<OrdersResponse>();
    expect(orders.map((order) => order.id)).toEqual(['1002', '1001']);
    expect(orders[1]).toMatchObject({ customerName: 'Ada Lovelace', status: 'delivered', total: 153 });
  });

  it('shows one of your orders, and treats anyone else’s as not found', async () => {
    const mine = await api().inject({ method: 'GET', url: '/api/orders/1001' });
    expect(mine.json<OrderView>().lines).toHaveLength(2);

    const graces = await api().inject({ method: 'GET', url: '/api/orders/1003' });
    expect(graces.statusCode).toBe(404);
    expect(graces.json()).toMatchObject({ error: 'order_not_found' });
  });

  it('asks you to sign in, and says so when sign-in can’t be checked', async () => {
    const signedOut = await api(staticIdentity(null)).inject({ method: 'GET', url: '/api/orders' });
    expect(signedOut.statusCode).toBe(401);

    const authDown: Identity = async () => {
      throw new UpstreamUnavailableError('auth down');
    };
    const unavailable = await api(authDown).inject({ method: 'GET', url: '/api/orders' });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json()).toMatchObject({ error: 'auth_unavailable' });
  });
});

describe('orders API: checkout (service to service)', () => {
  it('creates the order with the prices it was sent, for that customer', async () => {
    const response = await createOrder(checkout());
    expect(response.statusCode).toBe(201);
    const { orderId } = response.json<CreateOrderResult>();
    expect(orderId).toBe('1005');

    const order = await store.find(orderId, grace.id);
    expect(order).toMatchObject({ customerName: 'Grace Hopper', status: 'paid', total: 190.5 });
  });

  it('creates exactly one order per checkout, however often it’s sent', async () => {
    const first = await createOrder(checkout('c-retry'));
    const retry = await createOrder(checkout('c-retry'));
    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(200);
    expect(retry.json()).toEqual(first.json());
    expect(await store.listForCustomer(grace.id)).toHaveLength(2); // seed #1003 + this one
  });

  it('only takes orders from other services', async () => {
    expect((await createOrder(checkout(), '')).statusCode).toBe(401);
    expect((await createOrder(checkout(), 'Bearer wrong-token!')).statusCode).toBe(401);
    expect(await store.listForCustomer(grace.id)).toHaveLength(1);
  });

  it('refuses an empty or malformed checkout', async () => {
    expect((await createOrder({ ...checkout(), items: [] })).statusCode).toBe(400);
    const badQuantity = { ...checkout(), items: [{ ...checkout().items[0], quantity: 0 }] };
    expect((await createOrder(badQuantity)).statusCode).toBe(400);
  });
});
