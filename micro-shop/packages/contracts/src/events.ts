// Event contract: facts one micro-frontend announces and others may react to.
//
// Rules for events in this project:
//   - An event is a FACT in the past tense ("order.created"), not a command
//     ("create shipment"). The publisher doesn't know or care who listens.
//   - Payloads are thin: ids and a few fields, never a whole domain object.
//     Shipping gets an order id, not Orders' `Order` type.
//   - Every payload carries a schema `version`. Publisher and consumer are
//     deployed independently, so a consumer may meet a version it doesn't know.

/** Apps that can publish events. */
export type AppName = 'shell' | 'auth' | 'orders' | 'shipping';

export type MicroShopEvents = {
  'auth.user.logged-in': { version: 1; userId: string };
  'auth.user.logged-out': { version: 1; userId: string };
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
