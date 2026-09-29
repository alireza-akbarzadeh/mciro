// Request and response shapes of the Orders API.
//
// Owned by the Orders team. Its clients are the Orders frontend (apps/orders)
// and, server to server, the Cart API, which creates the order at checkout.
// Types only, so the browser can import them without pulling in server code.

import type { CheckoutItem, Customer } from '@micro-shop/contracts';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered';

export type OrderLineView = {
  productSlug: string;
  name: string;
  quantity: number;
  /** USD, as paid: the price at checkout, not today's. */
  unitPrice: number;
};

export type OrderView = {
  /** A human-friendly number, e.g. "1005". */
  id: string;
  customerName: string;
  /** ISO 8601. */
  createdAt: string;
  status: OrderStatus;
  lines: OrderLineView[];
  total: number;
};

/** GET /api/orders: the signed-in customer's orders, newest first. */
export type OrdersResponse = { orders: OrderView[] };

/**
 * POST /internal/orders (service to service, not through the gateway).
 * Sent by the Cart API at checkout, priced by it on the server.
 */
export type CreateOrderBody = {
  /** One order per checkout: sending the same checkout again returns the same order. */
  checkoutId: string;
  customer: Customer;
  items: CheckoutItem[];
};

export type CreateOrderResult = { orderId: string };

export type ApiErrorCode = 'not_signed_in' | 'auth_unavailable' | 'order_not_found' | 'service_token_required';
export type ApiError = { error: ApiErrorCode; message: string };
