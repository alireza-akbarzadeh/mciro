// Orders' state in the page. Private to Orders.
//
// Two kinds of data live here:
//   - Orders' OWN data: the signed-in customer's orders, from the Orders API
//     (apps/orders-api, behind the gateway at /api/orders). The server owns
//     them; this is the page's copy.
//   - A local READ MODEL of a fact owned by Shipping: "this order has a
//     shipment". Orders never asks Shipping or imports its code; it listens for
//     `shipment.created` and remembers the order id. This is how one domain
//     learns about another without coupling to it.

import type { ApiError, OrdersResponse, OrderView } from '@micro-shop/orders-api/api-types';
import { createPublisher, subscribe } from '@micro-shop/event-bus';
import { createLogger, errorData } from '@micro-shop/observability';

const publish = createPublisher('orders');
const log = createLogger('orders');

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type OrdersSnapshot = {
  status: LoadStatus;
  /** A reload is running (the list stays visible meanwhile). */
  refreshing: boolean;
  orders: readonly OrderView[];
  /** Set when status is 'error': what to tell the customer. */
  error: string | null;
  /** Order ids Shipping has announced a shipment for. */
  ordersWithShipment: ReadonlySet<string>;
};

// Shipping's seed shipments (SHP-2001, SHP-2002) ship the seed orders #1001
// and #1002. In production this read model would be filled from the backend too.
let snapshot: OrdersSnapshot = {
  status: 'idle',
  refreshing: false,
  orders: [],
  error: null,
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

// useSyncExternalStore requires getSnapshot to return the SAME object until
// something changes, so the snapshot is replaced, never mutated.
function update(changes: Partial<OrdersSnapshot>): void {
  snapshot = { ...snapshot, ...changes };
  for (const listener of listeners) listener();
}

export function findOrder(orderId: string): OrderView | undefined {
  return snapshot.orders.find((order) => order.id === orderId);
}

let inFlight: Promise<void> | null = null;

/** Loads the customer's orders from the API. Concurrent calls share one request. */
export function refreshOrders(): Promise<void> {
  inFlight ??= (async () => {
    update({ status: snapshot.status === 'ready' ? 'ready' : 'loading', refreshing: true, error: null });
    try {
      const response = await fetch('/api/orders', { headers: { accept: 'application/json' } });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as Partial<ApiError> | null;
        throw new Error(
          response.status === 401
            ? 'Sign in to see your orders.'
            : (body?.message ?? `Orders are unavailable (HTTP ${response.status}).`),
        );
      }
      const { orders } = (await response.json()) as OrdersResponse;
      update({ status: 'ready', refreshing: false, orders, error: null });
    } catch (error) {
      log.error('loading orders failed', errorData(error));
      update({
        status: 'error',
        refreshing: false,
        error: error instanceof Error && !(error instanceof TypeError) ? error.message : 'Orders are unavailable right now.',
      });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Loads the orders the first time a view needs them. */
export function ensureOrdersLoaded(): void {
  if (snapshot.status === 'idle') void refreshOrders();
}

// Checkout happens in Cart, and the Cart API has the Orders API create the
// order on the server. Cart then announces `checkout.completed` with the order
// id; Orders shows the new order and announces `order.created` to the rest of
// the page (Shipping reacts to it).
//
// Subscribed at module load with `replay`, because the customer checks out
// BEFORE Orders' code has loaded: Cart then navigates to /orders/:orderId,
// which loads Orders.
const announced = new Set<string>();

subscribe(
  'checkout.completed',
  (event) => {
    const { payload } = event;
    if (payload.version !== 2) {
      log.warn('ignoring checkout.completed version without an order id', { version: payload.version });
      return;
    }
    // Idempotent: replay or a duplicate publish may deliver the same fact again.
    if (announced.has(payload.orderId)) return;
    announced.add(payload.orderId);

    // A fact, in the past tense. Orders doesn't know who listens.
    publish('order.created', { version: 1, orderId: payload.orderId });
    log.info('order created', { orderId: payload.orderId, checkoutId: payload.checkoutId });
    if (snapshot.status !== 'idle') void refreshOrders();
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
    update({ ordersWithShipment: new Set(snapshot.ordersWithShipment).add(orderId) });
  },
  { replay: true },
);
