import type { CreateOrderBody, CreateOrderResult } from '@micro-shop/orders-api/api-types';
import { fetchJson, serviceAuthHeaders, UpstreamUnavailableError } from '@micro-shop/service-kit';

// Checkout hands the order to the Orders API, server to server. Orders belong
// to the Orders team: the Cart API never writes their tables, it asks.

/** Creates the order for a checkout; the same checkout always gets the same order. Throws UpstreamUnavailableError. */
export type OrdersClient = (checkout: CreateOrderBody) => Promise<CreateOrderResult>;

/** `url`: the Orders API's internal endpoint, e.g. http://localhost:4002/internal/orders. */
export function httpOrders(url: string, serviceToken: string): OrdersClient {
  return async (checkout) => {
    const answer = (await fetchJson(url, {
      body: checkout,
      headers: serviceAuthHeaders(serviceToken),
      // Checkout waits for this while it holds the cart; don't wait long.
      timeoutMs: 5_000,
    })) as Partial<CreateOrderResult>;
    if (typeof answer.orderId !== 'string') throw new UpstreamUnavailableError('unexpected answer from the Orders API');
    return { orderId: answer.orderId };
  };
}

/** Orders kept in this process, for tests: numbers from 1001, one per checkout. */
export function memoryOrders(): OrdersClient & { received: CreateOrderBody[] } {
  const byCheckout = new Map<string, string>();
  const received: CreateOrderBody[] = [];
  const client = async (checkout: CreateOrderBody) => {
    received.push(checkout);
    const orderId = byCheckout.get(checkout.checkoutId) ?? String(1001 + byCheckout.size);
    byCheckout.set(checkout.checkoutId, orderId);
    return { orderId };
  };
  return Object.assign(client, { received });
}
