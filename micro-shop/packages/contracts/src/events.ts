// Event contract: facts one micro-frontend announces and others may react to.
//
// Rules for events in this project:
//   - An event is a FACT in the past tense ("order.created"), not a command
//     ("create shipment"). The publisher doesn't know or care who listens.
//   - Payloads are thin: ids and a few fields, never a whole domain object.
//     Shipping gets an order id, not Orders' `Order` type.
//   - Every payload carries a schema `version`. Publisher and consumer are
//     deployed independently, so a consumer may meet a version it doesn't know.

import type { Customer } from './cart';

/** Apps that can publish events. */
export type AppName = 'shell' | 'auth' | 'orders' | 'shipping' | 'cart';

/** One line of a completed checkout. */
export type CheckoutItem = {
  productSlug: string;
  name: string;
  quantity: number;
  /** USD, at the moment of checkout. */
  unitPrice: number;
};

export type MicroShopEvents = {
  'auth.user.logged-in': { version: 1; userId: string };
  'auth.user.logged-out': { version: 1; userId: string };
  /**
   * A signed-in customer bought what was in their cart, and the order exists:
   * the Cart API had the Orders API create it, on the server, before emptying
   * the cart. Orders reacts by showing it and announcing `order.created`.
   *
   * Version 2 added `orderId`. In version 1 the order didn't exist yet: Orders
   * created it in the browser from the items. Orders ignores version 1 now.
   *
   * Why the items travel with the event, despite "thin payloads": they ARE the
   * fact. What was bought, how many, and at what price is only true at this
   * moment. Prices change later, so a reference to the cart would not be enough.
   */
  'checkout.completed': {
    version: 2;
    /** Unique per checkout. */
    checkoutId: string;
    /** The order the Orders API created for this checkout. */
    orderId: string;
    customer: Customer;
    items: readonly CheckoutItem[];
  };
  'order.created': { version: 1; orderId: string };
  'shipment.created': { version: 1; shipmentId: string; orderId: string };
};

export type MicroShopEventType = keyof MicroShopEvents;

/**
 * What actually travels on the bus: the payload plus metadata.
 * `EventEnvelope<'order.created'>` has an exactly typed payload;
 * plain `EventEnvelope` is "any event".
 */
export type EventEnvelope<T extends MicroShopEventType = MicroShopEventType> = {
  /** Unique per event. Lets consumers de-duplicate. */
  id: string;
  type: T;
  source: AppName;
  /** ISO 8601 timestamp. */
  occurredAt: string;
  payload: MicroShopEvents[T];
};
