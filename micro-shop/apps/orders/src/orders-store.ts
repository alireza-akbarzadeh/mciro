// Orders' state. Private to Orders, in memory, owned by nobody else.
//
// Two kinds of data live here:
//   - Orders' OWN data: the orders.
//   - A local READ MODEL of a fact owned by Shipping: "this order has a
//     shipment". Orders never asks Shipping or imports its code; it listens for
//     `shipment.created` and remembers the order id. This is how one domain
//     learns about another without coupling to it.

import { createPublisher, subscribe } from '@micro-shop/event-bus';
import { createLogger } from '@micro-shop/observability';
import { seedOrders, type Order } from './orders-data';

const publish = createPublisher('orders');
const log = createLogger('orders');

type OrdersSnapshot = {
  orders: readonly Order[];
  /** Order ids Shipping has announced a shipment for. */
  ordersWithShipment: ReadonlySet<string>;
};

// In production this would come from the backend. Here, the seed orders that
// already have seed shipments in Shipping.
let snapshot: OrdersSnapshot = {
  orders: seedOrders,
  ordersWithShipment: new Set(['1001', '1002']),
};

const listeners = new Set<() => void>();

export function getSnapshot(): OrdersSnapshot {
  return snapshot;
}

export function subscribeToOrders(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(next: OrdersSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function findOrder(orderId: string): Order | undefined {
  return snapshot.orders.find((order) => order.id === orderId);
}

const demoCustomers = ['Ada Lovelace', 'Grace Hopper', 'Margaret Hamilton', 'Katherine Johnson'];

/** Simulates a checkout: adds a paid order and announces it. */
export function createTestOrder(): Order {
  const lastId = Math.max(...snapshot.orders.map((order) => Number(order.id)));
  const order: Order = {
    id: String(lastId + 1),
    customer: demoCustomers[snapshot.orders.length % demoCustomers.length] ?? 'Test customer',
    createdAt: new Date().toISOString().slice(0, 10),
    status: 'paid',
    lines: [{ product: 'Test product', quantity: 1, unitPrice: 42 }],
  };

  update({ ...snapshot, orders: [...snapshot.orders, order] });

  // A fact, in the past tense. Orders doesn't know who listens.
  publish('order.created', { version: 1, orderId: order.id });
  log.info('order created', { orderId: order.id });
  return order;
}

// Subscribed at module load, i.e. as soon as the shell first loads Orders.
// `replay` catches shipments announced before Orders was loaded.
subscribe(
  'shipment.created',
  (event) => {
    if (event.payload.version !== 1) {
      log.warn('ignoring unknown shipment.created version', { payload: event.payload });
      return;
    }
    const { orderId } = event.payload;
    // Idempotent: replay may deliver the same fact again.
    if (snapshot.ordersWithShipment.has(orderId)) return;
    update({ ...snapshot, ordersWithShipment: new Set(snapshot.ordersWithShipment).add(orderId) });
  },
  { replay: true },
);
