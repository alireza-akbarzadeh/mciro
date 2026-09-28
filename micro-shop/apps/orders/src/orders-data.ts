// Private to Orders. No other application may import this file; it is not listed
// in `exposes`, so the federation container cannot hand it out.

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered';

export type OrderLine = {
  product: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  customer: string;
  createdAt: string;
  status: OrderStatus;
  lines: readonly OrderLine[];
};

/** Seed data. The live list is in orders-store.ts. */
export const seedOrders: readonly Order[] = [
  {
    id: '1001',
    customer: 'Ada Lovelace',
    createdAt: '2026-09-20',
    status: 'delivered',
    lines: [
      { product: 'Mechanical keyboard', quantity: 1, unitPrice: 129 },
      { product: 'USB-C cable', quantity: 2, unitPrice: 12 },
    ],
  },
  {
    id: '1002',
    customer: 'Alan Turing',
    createdAt: '2026-09-24',
    status: 'shipped',
    lines: [{ product: 'Noise-cancelling headphones', quantity: 1, unitPrice: 249 }],
  },
  {
    id: '1003',
    customer: 'Grace Hopper',
    createdAt: '2026-09-27',
    status: 'paid',
    lines: [
      { product: '27" monitor', quantity: 2, unitPrice: 319 },
      { product: 'Monitor arm', quantity: 1, unitPrice: 89 },
    ],
  },
  {
    id: '1004',
    customer: 'Linus Torvalds',
    createdAt: '2026-09-28',
    status: 'pending',
    lines: [{ product: 'Standing desk', quantity: 1, unitPrice: 540 }],
  },
];

export function orderTotal(order: Order): number {
  return order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}
