// Pricing and checkout. Private to Cart.
//
// Checkout does NOT create the order: orders belong to Orders. Cart announces
// the fact `checkout.completed` with what was bought, and Orders reacts. In
// production this handoff is a backend call or a message queue; the browser bus
// stands in for it, like order.created → Shipping.

import type { CatalogProduct, CheckoutItem, Customer } from '@micro-shop/contracts';
import { createPublisher } from '@micro-shop/event-bus';
import { createLogger } from '@micro-shop/observability';
import type { Catalog } from './catalog-client';
import { clearCart, type Cart } from './cart-store';

const publish = createPublisher('cart');
const log = createLogger('cart');

export type PricedLine = {
  productSlug: string;
  quantity: number;
  /** Undefined when the catalog no longer has this product. */
  product: CatalogProduct | undefined;
};

export type PricedCart = {
  lines: readonly PricedLine[];
  total: number;
  hasUnavailable: boolean;
};

export function priceCart(cart: Cart, catalog: Catalog): PricedCart {
  const lines = cart.lines.map((line) => ({ ...line, product: catalog.get(line.productSlug) }));
  return {
    lines,
    total: lines.reduce((sum, line) => sum + (line.product?.price ?? 0) * line.quantity, 0),
    hasUnavailable: lines.some((line) => !line.product),
  };
}

export class CheckoutError extends Error {
  override name = 'CheckoutError';
}

/**
 * Hands the cart to Orders as a `checkout.completed` fact, then empties the
 * cart. Returns the checkout id, which Orders resolves to its order at
 * /orders/checkout/:checkoutId.
 */
export function completeCheckout(customer: Customer, cart: Cart, catalog: Catalog): string {
  const { lines } = priceCart(cart, catalog);
  if (lines.length === 0) throw new CheckoutError('Your cart is empty.');

  const items: CheckoutItem[] = [];
  for (const { productSlug, quantity, product } of lines) {
    if (!product) throw new CheckoutError('Some products are no longer available.');
    items.push({ productSlug, name: product.name, quantity, unitPrice: product.price });
  }

  const checkoutId = crypto.randomUUID();
  // The customer is passed field by field: nothing beyond the contract leaves Cart.
  publish('checkout.completed', {
    version: 1,
    checkoutId,
    customer: { id: customer.id, name: customer.name },
    items,
  });
  clearCart();
  log.info('checkout completed', { checkoutId, lines: items.length });
  return checkoutId;
}
