import { useSyncExternalStore } from 'react';
import { getCart, subscribeToCart, type Cart } from './cart-store';

/** Re-renders when the cart changes, in this tab or another one. */
export function useCart(): Cart {
  return useSyncExternalStore(subscribeToCart, getCart);
}
