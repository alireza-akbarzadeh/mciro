// Compile-time tests for the contracts. There is nothing to run: `pnpm typecheck`
// fails if a line marked @ts-expect-error suddenly compiles, or a valid line stops
// compiling. This is how a contract change shows up in review.

import type { AppPath } from './routes';
import type { EventEnvelope, MicroShopEvents } from './events';

// --- URLs -------------------------------------------------------------------
export const validPaths: AppPath[] = [
  '/',
  '/products/standing-desk',
  '/categories/desk',
  '/search',
  '/search?q=desk',
  '/orders',
  '/orders/1002',
  '/shipping/SHP-2002',
  '/shipping/order/1002',
  '/cart',
  '/cart/add?product=standing-desk',
  '/checkout',
  '/orders/checkout/0b6f7c1e',
];

// @ts-expect-error: checkout is a single page, not a prefix
export const checkoutSubPath: AppPath = '/checkout/step-2';

// @ts-expect-error: not a public URL of any app
export const unknownPath: AppPath = '/shipment/1002';

// @ts-expect-error: search takes `q`, no other parameter is part of the contract
export const unknownSearchParam: AppPath = '/search?query=desk';

// --- Events -----------------------------------------------------------------
export const orderCreated: MicroShopEvents['order.created'] = { version: 1, orderId: '1' };

// @ts-expect-error: payloads carry a schema version
export const missingVersion: MicroShopEvents['order.created'] = { orderId: '1' };

// @ts-expect-error: thin payloads; the Order object itself never travels
export const fatPayload: MicroShopEvents['order.created'] = { version: 1, orderId: '1', total: 42 };

export const envelope: EventEnvelope<'shipment.created'> = {
  id: 'e1',
  type: 'shipment.created',
  source: 'shipping',
  occurredAt: '2026-09-28T00:00:00.000Z',
  payload: { version: 1, shipmentId: 'SHP-1', orderId: '1' },
};

export const checkoutCompleted: MicroShopEvents['checkout.completed'] = {
  version: 1,
  checkoutId: 'c1',
  customer: { id: 'u-ada', name: 'Ada Lovelace' },
  items: [{ productSlug: 'standing-desk', name: 'Standing desk', quantity: 1, unitPrice: 540 }],
};

export const checkoutWithEmail: MicroShopEvents['checkout.completed'] = {
  ...checkoutCompleted,
  // @ts-expect-error: the customer is id + name only; the email stays with Auth
  customer: { id: 'u-ada', name: 'Ada Lovelace', email: 'ada@example.com' },
};

// @ts-expect-error: only known apps can be an event source
export const unknownSource: EventEnvelope['source'] = 'billing';
