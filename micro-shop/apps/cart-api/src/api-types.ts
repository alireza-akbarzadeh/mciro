// Request and response shapes of the Cart API.
//
// Owned by the Cart team, which also owns the only client (apps/cart). That's
// why they live here and not in @micro-shop/contracts: they are internal to one
// team. This file holds types and one constant, and imports nothing that needs
// Node, so apps/cart can import it without pulling server code into the browser. The one cross-team piece, the storefront's "Add to
// cart" form, is in contracts (AddToCartEndpoint).

import type { CheckoutItem, Customer } from '@micro-shop/contracts';

export type CartLineView = {
  productSlug: string;
  quantity: number;
  /** From the catalog, on the server. Null when the product is gone or prices are unavailable. */
  name: string | null;
  unitPrice: number | null;
};

export type CartView = {
  lines: CartLineView[];
  itemCount: number;
  /** Null when the catalog can't be reached: the cart still loads, unpriced. */
  total: number | null;
  pricesAvailable: boolean;
};

export type AddItemBody = { productSlug: string; quantity?: number };
export type SetQuantityBody = { quantity: number };
export type CheckoutBody = { customer: Customer };

/** Everything Cart needs to announce `checkout.completed`, priced by the server. */
export type CheckoutResult = {
  checkoutId: string;
  customer: Customer;
  items: CheckoutItem[];
};

export type ApiErrorCode =
  | 'unknown_product'
  | 'catalog_unavailable'
  | 'empty_cart'
  | 'unavailable_products';

export type ApiError = { error: ApiErrorCode; message: string };

export const MAX_QUANTITY = 10;
