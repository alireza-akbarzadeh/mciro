// Types for what the shell consumes from remotes.
//
// A remote import is resolved at runtime, so TypeScript can't follow it. These
// declarations say what the shell EXPECTS to receive. Where a shared contract
// exists (@micro-shop/contracts), they are built from it, so the shell and the
// remote compile against the same definition.

declare module 'auth/session' {
  import type { AuthSessionModule } from '@micro-shop/contracts';

  export const getSession: AuthSessionModule['getSession'];
  export const subscribe: AuthSessionModule['subscribe'];
  export const logout: AuthSessionModule['logout'];
}

declare module 'auth/LoginForm' {
  import type { ComponentType } from 'react';

  const LoginForm: ComponentType;
  export default LoginForm;
}

declare module 'auth/UserMenu' {
  import type { ComponentType } from 'react';

  const UserMenu: ComponentType;
  export default UserMenu;
}

declare module 'orders/OrdersApp' {
  import type { ComponentType } from 'react';

  const OrdersApp: ComponentType;
  export default OrdersApp;
}

declare module 'shipping/ShippingApp' {
  import type { ComponentType } from 'react';

  const ShippingApp: ComponentType;
  export default ShippingApp;
}

declare module 'cart/CartApp' {
  import type { ComponentType } from 'react';

  const CartApp: ComponentType;
  export default CartApp;
}

declare module 'cart/Checkout' {
  import type { ComponentType } from 'react';
  import type { CheckoutProps } from '@micro-shop/contracts';

  // The one remote that takes props: the shell passes the signed-in customer.
  const Checkout: ComponentType<CheckoutProps>;
  export default Checkout;
}

declare module 'cart/CartBadge' {
  import type { ComponentType } from 'react';

  const CartBadge: ComponentType;
  export default CartBadge;
}
