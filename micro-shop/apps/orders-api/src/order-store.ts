import type { CreateOrderBody, OrderStatus, OrderView } from './api-types.ts';

// Where orders are kept. The routes only know this interface: the API runs on
// Postgres (postgres-order-store.ts) or, without a database, in memory (below;
// also used by unit tests).

export type NewOrder = CreateOrderBody & { status?: OrderStatus; createdAt?: Date };

export type OrderStore = {
  /**
   * Creates the order for a checkout, or returns the one already created for
   * it (`created: false`). Retries and double submits can't make two orders.
   */
  create(order: NewOrder): Promise<{ orderId: string; created: boolean }>;
  /** A customer's orders, newest first. */
  listForCustomer(customerId: string): Promise<OrderView[]>;
  /** One order, only if it belongs to `customerId`. */
  find(orderId: string, customerId: string): Promise<OrderView | undefined>;
};

/** First order number. Seed orders take 1001–1004. */
export const FIRST_ORDER_NUMBER = 1001;

export function totalOf(lines: readonly { quantity: number; unitPrice: number }[]): number {
  return Math.round(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * 100, 0)) / 100;
}

type StoredOrder = OrderView & { checkoutId: string; customerId: string };

export function createMemoryOrderStore(): OrderStore {
  const orders: StoredOrder[] = [];
  let nextNumber = FIRST_ORDER_NUMBER;

  const view = ({ checkoutId: _checkout, customerId: _customer, ...order }: StoredOrder): OrderView => order;

  return {
    async create({ checkoutId, customer, items, status = 'paid', createdAt = new Date() }) {
      const existing = orders.find((order) => order.checkoutId === checkoutId);
      if (existing) return { orderId: existing.id, created: false };

      const lines = items.map(({ productSlug, name, quantity, unitPrice }) => ({ productSlug, name, quantity, unitPrice }));
      const order: StoredOrder = {
        id: String(nextNumber++),
        checkoutId,
        customerId: customer.id,
        customerName: customer.name,
        createdAt: createdAt.toISOString(),
        status,
        lines,
        total: totalOf(lines),
      };
      orders.push(order);
      return { orderId: order.id, created: true };
    },

    async listForCustomer(customerId) {
      return orders
        .filter((order) => order.customerId === customerId)
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map(view);
    },

    async find(orderId, customerId) {
      const order = orders.find((candidate) => candidate.id === orderId && candidate.customerId === customerId);
      return order && view(order);
    },
  };
}
