import type { NewOrder, OrderStore } from '../order-store.ts';

// Demo orders for the demo users (apps/auth-api/src/db/seed-data.ts). Numbers
// 1001–1004 match Shipping's seed shipments (SHP-2001 ships #1001, SHP-2002
// ships #1002). Only for development: production has no demo users.

export type SeedOrder = NewOrder & { id: number };

const ada = { id: 'u-ada', name: 'Ada Lovelace' };
const grace = { id: 'u-grace', name: 'Grace Hopper' };
const margaret = { id: 'u-margaret', name: 'Margaret Hamilton' };

export const demoOrders: SeedOrder[] = [
  {
    id: 1001,
    checkoutId: 'seed-1001',
    customer: ada,
    status: 'delivered',
    createdAt: new Date('2026-09-20T10:12:00Z'),
    items: [
      { productSlug: 'mechanical-keyboard', name: 'Mechanical keyboard', quantity: 1, unitPrice: 129 },
      { productSlug: 'usb-c-cable', name: 'USB-C cable', quantity: 2, unitPrice: 12 },
    ],
  },
  {
    id: 1002,
    checkoutId: 'seed-1002',
    customer: ada,
    status: 'shipped',
    createdAt: new Date('2026-09-24T15:40:00Z'),
    items: [{ productSlug: 'noise-cancelling-headphones', name: 'Noise-cancelling headphones', quantity: 1, unitPrice: 249 }],
  },
  {
    id: 1003,
    checkoutId: 'seed-1003',
    customer: grace,
    status: 'paid',
    createdAt: new Date('2026-09-27T09:05:00Z'),
    items: [
      { productSlug: '27-inch-monitor', name: '27" monitor', quantity: 2, unitPrice: 319 },
      { productSlug: 'monitor-arm', name: 'Monitor arm', quantity: 1, unitPrice: 89 },
    ],
  },
  {
    id: 1004,
    checkoutId: 'seed-1004',
    customer: margaret,
    status: 'pending',
    createdAt: new Date('2026-09-28T18:30:00Z'),
    items: [{ productSlug: 'standing-desk', name: 'Standing desk', quantity: 1, unitPrice: 540 }],
  },
];

/** Memory store only: creates the demo orders in order, so they get numbers 1001–1004. */
export async function seedDemoOrders(store: OrderStore): Promise<void> {
  for (const { id: _id, ...order } of demoOrders) await store.create(order);
}
