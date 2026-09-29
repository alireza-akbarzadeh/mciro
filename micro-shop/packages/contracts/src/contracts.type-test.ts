// Compile-time tests for the contracts. There is nothing to run: `pnpm typecheck`
// fails if a line marked @ts-expect-error suddenly compiles, or a valid line stops
// compiling. This is how a contract change shows up in review.

import type { AppPath } from './routes';
import type { EventEnvelope, MicroShopEvents } from './events';

// --- URLs -------------------------------------------------------------------
export const validPaths: AppPath[] = [
  '/',
  '/products/standing-desk',
  '/search',
  '/search?q=desk',
  '/orders',
  '/orders/1002',
  '/shipping/SHP-2002',
  '/shipping/order/1002',
];

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

// @ts-expect-error: only known apps can be an event source
export const unknownSource: EventEnvelope['source'] = 'billing';
