// Checkout. Private to Cart.
//
// The Cart API checks who is signed in (with the Auth API), prices the cart,
// has the Orders API create the order, and empties the cart, all on the
// server. Cart then announces the fact `checkout.completed` (with the order
// id) to the other apps in the page: Orders shows the order and announces
// `order.created`, which Shipping reacts to.

import { createPublisher } from '@micro-shop/event-bus';
import { createLogger } from '@micro-shop/observability';
import { checkout } from './cart-store';

const publish = createPublisher('cart');
const log = createLogger('cart');

/**
 * Checks out on the server, then announces `checkout.completed`. Returns the
 * id of the order the server created (Orders shows it at /orders/:orderId).
 * Throws CartApiError on failure, in which case nothing is announced.
 */
export async function completeCheckout(): Promise<string> {
  const { checkoutId, orderId, customer, items } = await checkout();
  publish('checkout.completed', { version: 2, checkoutId, orderId, customer, items });
  log.info('checkout completed', { checkoutId, orderId, lines: items.length });
  return orderId;
}
