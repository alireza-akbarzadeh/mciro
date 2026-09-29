// Contract between the shell (host) and Cart's exposed `cart/Checkout`.
//
// Checkout needs to know who is buying. Remotes don't load each other, and only
// the shell asks Auth for the session, so the shell passes the signed-in
// customer in as a prop. Anything passed here is API both teams must keep
// compatible, which is why it's the smallest useful slice of the User.

import type { User } from './auth';

export type Customer = Pick<User, 'id' | 'name'>;

export type CheckoutProps = {
  customer: Customer;
};

// "Add to cart" from any app: POST a plain HTML form to the Cart API. It works
// without JavaScript and answers 303 See Other → /cart. The rest of the Cart
// API is internal to the Cart team (apps/cart-api/src/api-types.ts).

/** Where to POST. Owned by the Cart team (apps/cart-api), behind the gateway. */
export type AddToCartEndpoint = '/api/cart/items';

/** The form fields that endpoint accepts. */
export type AddToCartFields = {
  productSlug: string;
};
