import { readCookie, serializeCookie } from '@micro-shop/service-kit';

// The cart cookie: which cart this browser owns. The kit writes it safely
// (HttpOnly, SameSite=Lax); Cart decides the name, the scope and the lifetime.
// The value is a random UUID: unguessable, and it reveals nothing.

const CART_COOKIE = 'micro-shop-cart';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function readCartId(cookieHeader: string | undefined): string | undefined {
  const value = readCookie(cookieHeader, CART_COOKIE);
  return value && UUID.test(value) ? value : undefined;
}

export function cartCookie(cartId: string): string {
  return serializeCookie(CART_COOKIE, cartId, {
    path: '/api/cart', // sent to the Cart API and nowhere else
    maxAgeSeconds: 30 * 24 * 60 * 60,
  });
}
