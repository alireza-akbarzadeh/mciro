import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartView } from '@micro-shop/cart-api/api-types';

// The client side of the cart: one shared copy of what the Cart API says.
// fetch is replaced by a fake server whose answers the test releases by hand.

function cart(itemCount: number): CartView {
  return {
    lines: itemCount
      ? [{ productSlug: 'standing-desk', quantity: itemCount, name: 'Standing desk', unitPrice: 540 }]
      : [],
    itemCount,
    total: itemCount * 540,
    pricesAvailable: true,
  };
}

type Pending = { method: string; url: string; body: unknown; respond: (status: number, body: unknown) => void };

function fakeServer() {
  const requests: Pending[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url: string, init: RequestInit) =>
        new Promise<Response>((resolve) => {
          requests.push({
            method: init.method ?? 'GET',
            url,
            body: init.body ? JSON.parse(String(init.body)) : undefined,
            respond: (status, body) => resolve(new Response(JSON.stringify(body), { status })),
          });
        }),
    ),
  );
  return requests;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('cart client', () => {
  it('loads the cart once, for every subscriber', async () => {
    const requests = fakeServer();
    const store = await import('./cart-store');
    store.subscribeToCart(() => {});
    store.subscribeToCart(() => {});

    expect(requests).toHaveLength(1);
    requests[0]?.respond(200, cart(2));
    await flush();
    expect(store.getCartState()).toEqual({ status: 'ready', cart: cart(2), error: null });
  });

  it('sends changes as API calls and shows the cart the server answers with', async () => {
    const requests = fakeServer();
    const store = await import('./cart-store');

    void store.addItem('standing-desk');
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/cart/items',
      body: { productSlug: 'standing-desk', quantity: 1 },
    });
    requests[0]?.respond(200, cart(1));
    await flush();

    void store.setQuantity('standing-desk', 0);
    expect(requests[1]).toMatchObject({ method: 'PUT', url: '/api/cart/items/standing-desk', body: { quantity: 0 } });
  });

  it('never lets a slow, older answer overwrite a newer one', async () => {
    const requests = fakeServer();
    const store = await import('./cart-store');

    void store.refreshCart(); // issued first, answered last
    void store.addItem('standing-desk');
    requests[1]?.respond(200, cart(1));
    await flush();
    requests[0]?.respond(200, cart(0));
    await flush();

    expect(store.getCartState()).toMatchObject({ status: 'ready', cart: { itemCount: 1 } });
  });

  it('keeps the last confirmed cart when a change fails, and says why', async () => {
    const requests = fakeServer();
    const store = await import('./cart-store');
    void store.refreshCart();
    requests[0]?.respond(200, cart(1));
    await flush();

    void store.addItem('usb-c-cable');
    requests[1]?.respond(503, { error: 'catalog_unavailable', message: 'The catalog is unavailable, try again.' });
    await flush();

    expect(store.getCartState()).toEqual({
      status: 'ready',
      cart: cart(1),
      error: 'The catalog is unavailable, try again.',
    });
  });
});
