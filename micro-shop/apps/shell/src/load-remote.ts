import { loadRemote } from '@module-federation/enhanced/runtime';

// Every remote module the shell consumes, with its type (from remotes.d.ts).
// An id typo such as 'orders/OrderApp' is a compile error.
type RemoteModules = {
  'auth/session': typeof import('auth/session');
  'auth/LoginForm': typeof import('auth/LoginForm');
  'auth/UserMenu': typeof import('auth/UserMenu');
  'orders/OrdersApp': typeof import('orders/OrdersApp');
  'shipping/ShippingApp': typeof import('shipping/ShippingApp');
  'cart/CartApp': typeof import('cart/CartApp');
  'cart/Checkout': typeof import('cart/Checkout');
  'cart/CartBadge': typeof import('cart/CartBadge');
};

export type RemoteId = keyof RemoteModules;

/**
 * Loads an exposed module through the Module Federation RUNTIME API.
 *
 * Why not `import('orders/OrdersApp')`? It works, but after one failed load
 * (remote server down), the bundler keeps the remote module installed as an
 * empty object. Every later import() then RESOLVES to `{ default: {} }` instead
 * of trying again, so "Retry" could never recover. The runtime API fetches
 * again on every call that hasn't succeeded yet.
 */
export async function loadRemoteModule<K extends RemoteId>(id: K): Promise<RemoteModules[K]> {
  const mod = await loadRemote<RemoteModules[K]>(id);
  if (mod == null) {
    throw new Error(`Remote module "${id}" could not be loaded`);
  }
  return mod;
}
