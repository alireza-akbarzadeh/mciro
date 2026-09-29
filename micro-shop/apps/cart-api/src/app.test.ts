// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { CartView, CheckoutResult } from './api-types.ts';
import { UpstreamUnavailableError } from '@micro-shop/service-kit';
import { buildApp } from './app.ts';
import { createMemoryCartStore } from './cart-store.ts';
import { type CatalogSource, staticCatalog } from './catalog.ts';
import { type Identity, staticIdentity } from './identity.ts';

// The routes, with carts in memory. The Postgres store is checked against the
// same behaviour in cart-store.contract.test.ts.

const catalog = staticCatalog([
  { slug: 'standing-desk', name: 'Standing desk', price: 540 },
  { slug: 'usb-c-cable', name: 'USB-C cable', price: 12 },
]);

const downCatalog: CatalogSource = async () => {
  throw new UpstreamUnavailableError('catalog unavailable (test)');
};

/** A browser: remembers the cart cookie between requests, like a real one. */
const ada = { id: 'u-ada', name: 'Ada Lovelace' };

function browser(source: CatalogSource = catalog, identity: Identity = staticIdentity(ada)) {
  const app = buildApp({ catalog: source, carts: createMemoryCartStore(), identity });
  let cookie: string | undefined;

  async function call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) {
    const response = await app.inject({
      method,
      url,
      headers: cookie ? { cookie } : {},
      ...(payload ? { payload } : {}),
    });
    const setCookie = response.headers['set-cookie'];
    if (typeof setCookie === 'string') cookie = setCookie.split(';')[0];
    return response;
  }

  return { app, call, cookie: () => cookie };
}

describe('cart API', () => {
  it('starts empty, and creates the cart (and its cookie) on the first add', async () => {
    const { call, cookie } = browser();

    expect((await call('GET', '/api/cart')).json<CartView>()).toEqual({
      lines: [],
      itemCount: 0,
      total: 0,
      pricesAvailable: true,
    });
    expect(cookie()).toBeUndefined();

    const added = await call('POST', '/api/cart/items', { productSlug: 'standing-desk' });
    expect(added.statusCode).toBe(200);
    expect(added.headers['set-cookie']).toMatch(/HttpOnly; SameSite=Lax/);
    expect(added.json<CartView>()).toMatchObject({
      lines: [{ productSlug: 'standing-desk', quantity: 1, name: 'Standing desk', unitPrice: 540 }],
      itemCount: 1,
      total: 540,
    });
  });

  it('keeps each browser’s cart separate', async () => {
    const ada = browser();
    await ada.call('POST', '/api/cart/items', { productSlug: 'standing-desk' });

    const grace = browser();
    // Same server instance, different cookie: a fresh "browser" against Ada's app.
    const response = await ada.app.inject({ method: 'GET', url: '/api/cart' });
    expect(response.json<CartView>().itemCount).toBe(0);
    expect((await grace.call('GET', '/api/cart')).json<CartView>().itemCount).toBe(0);
  });

  it('accepts the storefront’s plain HTML form and redirects to the cart (Post/Redirect/Get)', async () => {
    const { app } = browser();
    const response = await app.inject({
      method: 'POST',
      url: '/api/cart/items',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'productSlug=usb-c-cable',
    });

    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe('/cart');
    expect(response.headers['set-cookie']).toMatch(/^micro-shop-cart=/);
  });

  it('rejects unknown products and bad input', async () => {
    const { call } = browser();
    expect((await call('POST', '/api/cart/items', { productSlug: 'toaster' })).statusCode).toBe(404);
    expect((await call('POST', '/api/cart/items', { productSlug: '<script>' })).statusCode).toBe(400);
    expect(
      (await call('POST', '/api/cart/items', { productSlug: 'usb-c-cable', quantity: 0 })).statusCode,
    ).toBe(400);
  });

  it('merges, caps, updates and removes lines', async () => {
    const { call } = browser();
    await call('POST', '/api/cart/items', { productSlug: 'usb-c-cable', quantity: 8 });
    const capped = await call('POST', '/api/cart/items', { productSlug: 'usb-c-cable', quantity: 8 });
    expect(capped.json<CartView>().lines[0]?.quantity).toBe(10);

    const updated = await call('PUT', '/api/cart/items/usb-c-cable', { quantity: 3 });
    expect(updated.json<CartView>()).toMatchObject({ itemCount: 3, total: 36 });

    await call('POST', '/api/cart/items', { productSlug: 'standing-desk' });
    const removed = await call('DELETE', '/api/cart/items/usb-c-cable');
    expect(removed.json<CartView>().lines.map((line) => line.productSlug)).toEqual(['standing-desk']);

    const zero = await call('PUT', '/api/cart/items/standing-desk', { quantity: 0 });
    expect(zero.json<CartView>().lines).toEqual([]);
  });

  it('prices the checkout on the server, for the signed-in customer, and empties the cart', async () => {
    const { call } = browser();
    await call('POST', '/api/cart/items', { productSlug: 'standing-desk' });
    await call('POST', '/api/cart/items', { productSlug: 'usb-c-cable', quantity: 2 });

    // Whatever the request claims is ignored: the customer comes from the session.
    const response = await call('POST', '/api/cart/checkout', {
      customer: { id: 'u-mallory', name: 'Mallory' },
      items: [{ productSlug: 'standing-desk', unitPrice: 1 }],
    });

    expect(response.statusCode).toBe(201);
    const result = response.json<CheckoutResult>();
    expect(result.checkoutId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.customer).toEqual({ id: 'u-ada', name: 'Ada Lovelace' });
    expect(result.items).toEqual([
      { productSlug: 'standing-desk', name: 'Standing desk', quantity: 1, unitPrice: 540 },
      { productSlug: 'usb-c-cable', name: 'USB-C cable', quantity: 2, unitPrice: 12 },
    ]);
    expect((await call('GET', '/api/cart')).json<CartView>().itemCount).toBe(0);

    // Checking out twice (a double click) finds an empty cart.
    const again = await call('POST', '/api/cart/checkout');
    expect(again.statusCode).toBe(409);
  });

  it('refuses checkout when signed out, or when sign-in can’t be checked', async () => {
    const guest = browser(catalog, staticIdentity(null));
    await guest.call('POST', '/api/cart/items', { productSlug: 'standing-desk' });
    const signedOut = await guest.call('POST', '/api/cart/checkout');
    expect(signedOut.statusCode).toBe(401);
    expect(signedOut.json()).toMatchObject({ error: 'not_signed_in' });
    // The guest's cart is untouched, ready for after sign-in.
    expect((await guest.call('GET', '/api/cart')).json<CartView>().itemCount).toBe(1);

    const authDown: Identity = async () => {
      throw new UpstreamUnavailableError('auth down (test)');
    };
    const response = await browser(catalog, authDown).call('POST', '/api/cart/checkout');
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: 'auth_unavailable' });
  });

  it('degrades when the catalog is down: the cart loads unpriced, changes wait', async () => {
    let up = true;
    const flaky: CatalogSource = async () => (up ? catalog() : downCatalog());
    const { call } = browser(flaky);
    await call('POST', '/api/cart/items', { productSlug: 'standing-desk' });

    up = false;
    const cart = await call('GET', '/api/cart');
    expect(cart.statusCode).toBe(200);
    expect(cart.json<CartView>()).toMatchObject({
      itemCount: 1,
      total: null,
      pricesAvailable: false,
      lines: [{ productSlug: 'standing-desk', quantity: 1, name: null, unitPrice: null }],
    });
    expect((await call('POST', '/api/cart/items', { productSlug: 'usb-c-cable' })).statusCode).toBe(503);
    expect(
      (await call('POST', '/api/cart/checkout')).statusCode,
    ).toBe(503);
  });

  it('ignores a cart cookie that is not one of ours', async () => {
    const { app } = browser();
    const response = await app.inject({
      method: 'GET',
      url: '/api/cart',
      headers: { cookie: 'micro-shop-cart=../../etc/passwd' },
    });
    expect(response.json<CartView>().itemCount).toBe(0);
  });
});
