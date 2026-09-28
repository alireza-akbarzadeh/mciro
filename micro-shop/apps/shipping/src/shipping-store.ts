// Shipping's state. Private to Shipping, in memory.
//
// Shipping REACTS to `order.created`: when an order is placed, it creates a
// shipment and announces `shipment.created`. It learns only the order id from
// the event; it never reads Orders' data.
//
// In production this workflow belongs on the BACKEND (order service → message
// queue → shipping service). A browser event bus only reaches code that is
// loaded in this tab right now. Here it stands in for that pipeline, which is why
// the subscription below needs `replay`.

import { createPublisher, subscribe } from '@micro-shop/event-bus';
import { createLogger } from '@micro-shop/observability';
import { seedShipments, type Shipment } from './shipping-data';

const publish = createPublisher('shipping');
const log = createLogger('shipping');

let shipments: readonly Shipment[] = seedShipments;
const listeners = new Set<() => void>();

export function getShipments(): readonly Shipment[] {
  return shipments;
}

export function subscribeToShipments(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function findShipment(shipmentId: string): Shipment | undefined {
  return shipments.find((shipment) => shipment.id === shipmentId);
}

export function findShipmentForOrder(orderId: string): Shipment | undefined {
  return shipments.find((shipment) => shipment.orderId === orderId);
}

function createShipmentFor(orderId: string): void {
  // Idempotent by business key: one shipment per order, however many times the
  // event is delivered (replay, duplicate publish, HMR re-subscribe…).
  if (findShipmentForOrder(orderId)) return;

  const lastNumber = Math.max(...shipments.map((shipment) => Number(shipment.id.slice(4))));
  const shipment: Shipment = {
    id: `SHP-${lastNumber + 1}`,
    orderId,
    carrier: 'DHL Express',
    status: 'label_created',
    events: [
      {
        at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: 'label_created',
        location: 'Warehouse, DE',
        note: 'Label created after order.created',
      },
    ],
  };

  shipments = [...shipments, shipment];
  for (const listener of listeners) listener();

  publish('shipment.created', { version: 1, shipmentId: shipment.id, orderId });
  log.info('shipment created', { shipmentId: shipment.id, orderId });
}

// Subscribed at module load, i.e. when the shell first loads Shipping.
// `replay: true` processes orders created BEFORE Shipping was loaded.
subscribe(
  'order.created',
  (event) => {
    if (event.payload.version !== 1) {
      log.warn('ignoring unknown order.created version', { payload: event.payload });
      return;
    }
    createShipmentFor(event.payload.orderId);
  },
  { replay: true },
);
