// Orders' state. Private to Orders, in memory, owned by nobody else.
//
// Two kinds of data live here:
//   - Orders' OWN data: the orders, created from Cart's `checkout.completed`.
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

/** The order created for a checkout, if Orders has seen that checkout. */
export function findOrderByCheckout(checkoutId: string): Order | undefined {
  return snapshot.orders.find((order) => order.checkoutId === checkoutId);
}

function nextOrderId(): string {
  return String(Math.max(...snapshot.orders.map((order) => Number(order.id))) + 1);
}

/** Adds an order and announces it. Every new order goes through here. */
function placeOrder(order: Order): void {
  update({ ...snapshot, orders: [...snapshot.orders, order] });
  // A fact, in the past tense. Orders doesn't know who listens.
  publish('order.created', { version: 1, orderId: order.id });
  log.info('order created', { orderId: order.id });
}

const demoCustomers = ['Ada Lovelace', 'Grace Hopper', 'Margaret Hamilton', 'Katherine Johnson'];

/** Simulates a checkout without the Cart app: adds a paid order and announces it. */
export function createTestOrder(): Order {
  const order: Order = {
    id: nextOrderId(),
    customer: demoCustomers[snapshot.orders.length % demoCustomers.length] ?? 'Test customer',
    createdAt: new Date().toISOString().slice(0, 10),
    status: 'paid',
    lines: [{ product: 'Test product', quantity: 1, unitPrice: 42 }],
  };
  placeOrder(order);
  return order;
}

// Cart's checkout is how real orders arrive. Subscribed at module load with
// `replay`, because the customer usually checks out BEFORE Orders' code has
// loaded: Cart then navigates to /orders/checkout/:id, which loads Orders.
subscribe(
  'checkout.completed',
  (event) => {
    const { payload } = event;
    if (payload.version !== 1) {
      log.warn('ignoring unknown checkout.completed version', { payload });
      return;
    }
    // Idempotent by business key: one order per checkout, however often the
    // fact is delivered (replay, duplicate publish, HMR re-subscribe…).
    if (findOrderByCheckout(payload.checkoutId)) return;

    placeOrder({
      id: nextOrderId(),
      checkoutId: payload.checkoutId,
      customer: payload.customer.name,
      createdAt: event.occurredAt.slice(0, 10),
      status: 'paid',
      lines: payload.items.map((item) => ({
        product: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  },
  { replay: true },
);

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
