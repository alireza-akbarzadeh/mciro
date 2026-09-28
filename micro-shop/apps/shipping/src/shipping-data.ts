// Private to Shipping. Not exposed.
//
// Note `orderId`: Shipping stores a REFERENCE to an order (its id), never a copy
// of Orders' data and never Orders' `Order` type. If Shipping needs order details,
// it links to /orders/:id and lets Orders render them.

export type ShipmentStatus = 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered';

export type TrackingEvent = {
  at: string;
  status: ShipmentStatus;
  location: string;
  note: string;
};

export type Shipment = {
  id: string;
  orderId: string;
  carrier: string;
  status: ShipmentStatus;
  /** Newest last. */
  events: readonly TrackingEvent[];
};

export const shipments: readonly Shipment[] = [
  {
    id: 'SHP-2001',
    orderId: '1001',
    carrier: 'DHL Express',
    status: 'delivered',
    events: [
      { at: '2026-09-20 16:10', status: 'label_created', location: 'Berlin, DE', note: 'Label created' },
      { at: '2026-09-21 08:45', status: 'in_transit', location: 'Leipzig hub, DE', note: 'Departed sorting hub' },
      { at: '2026-09-22 07:30', status: 'out_for_delivery', location: 'Munich, DE', note: 'Out for delivery' },
      { at: '2026-09-22 13:05', status: 'delivered', location: 'Munich, DE', note: 'Delivered to front desk' },
    ],
  },
  {
    id: 'SHP-2002',
    orderId: '1002',
    carrier: 'UPS',
    status: 'in_transit',
    events: [
      { at: '2026-09-24 18:20', status: 'label_created', location: 'Amsterdam, NL', note: 'Label created' },
      { at: '2026-09-25 06:15', status: 'in_transit', location: 'Cologne hub, DE', note: 'Arrived at sorting hub' },
      { at: '2026-09-26 22:40', status: 'in_transit', location: 'Vienna hub, AT', note: 'In transit to destination' },
    ],
  },
];

export function findShipment(shipmentId: string): Shipment | undefined {
  return shipments.find((shipment) => shipment.id === shipmentId);
}

export function findShipmentForOrder(orderId: string): Shipment | undefined {
  return shipments.find((shipment) => shipment.orderId === orderId);
}
