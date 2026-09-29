import { useSyncExternalStore } from 'react';
import { getCartState, subscribeToCart, type CartState } from './cart-store';

/** The cart as this page knows it. The first subscriber triggers the first load. */
export function useCartState(): CartState {
  return useSyncExternalStore(subscribeToCart, getCartState);
}
