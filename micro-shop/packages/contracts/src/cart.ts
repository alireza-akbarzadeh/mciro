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
