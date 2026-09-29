// Checkout. Private to Cart.
//
// The Cart API prices the cart and empties it. Checkout still does NOT create
// the order: orders belong to Orders. Cart announces the fact
// `checkout.completed` with what the server priced, and Orders reacts. Moving
// that hand-off to the server too (cart-api → orders-api) is the next stage.

import type { Customer } from '@micro-shop/contracts';
import { createPublisher } from '@micro-shop/event-bus';
import { createLogger } from '@micro-shop/observability';
import { checkout } from './cart-store';

const publish = createPublisher('cart');
const log = createLogger('cart');

/**
 * Checks out on the server, then hands the order to Orders as a
 * `checkout.completed` fact. Returns the checkout id, which Orders resolves to
 * its order at /orders/checkout/:checkoutId. Throws CartApiError on failure,
 * in which case nothing is announced.
 */
export async function completeCheckout(customer: Customer): Promise<string> {
  const { checkoutId, customer: buyer, items } = await checkout(customer);
  publish('checkout.completed', { version: 1, checkoutId, customer: buyer, items });
  log.info('checkout completed', { checkoutId, lines: items.length });
  return checkoutId;
}
