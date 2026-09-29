import { randomUUID } from 'node:crypto';
import {
  createService,
  type FastifyReply,
  type FastifyRequest,
  isFormPost,
  sendError,
  type ServiceOptions,
  UpstreamUnavailableError,
} from '@micro-shop/service-kit';
import type {
  AddItemBody,
  ApiErrorCode,
  CartView,
  CheckoutBody,
  CheckoutResult,
  SetQuantityBody,
} from './api-types.ts';
import { MAX_QUANTITY } from './api-types.ts';
import type { Catalog, CatalogSource } from './catalog.ts';
import type { CartStore } from './cart-store.ts';
import { cartCookie, readCartId } from './cookies.ts';

// The Cart API. Everything is under /api/cart, which the gateway routes here.
//
//   GET    /api/cart                     the cart, priced from the catalog
//   POST   /api/cart/items               add a product (JSON, or a plain HTML form)
//   PUT    /api/cart/items/:productSlug  set a quantity (0 removes)
//   DELETE /api/cart/items/:productSlug  remove a product
//   POST   /api/cart/checkout            price the cart, empty it, return the checkout
//
// Only cart code lives here. Logging, the error format, /health, form parsing,
// cookies and calls to other services come from @micro-shop/service-kit.
//
// Built by a function so tests can inject a fixed catalog and call routes
// in-process with app.inject(), without opening a port.

const SLUG = { type: 'string', pattern: '^[a-z0-9-]{1,100}$' } as const;

export type AppOptions = {
  catalog: CatalogSource;
  /** Where carts live: Postgres in server.ts, in memory in unit tests. */
  carts: CartStore;
  logger?: boolean;
  healthChecks?: ServiceOptions['healthChecks'];
};

export function buildApp({ catalog, carts, logger = false, healthChecks }: AppOptions) {
  const app = createService({ name: 'cart-api', logger, healthChecks });

  /** The browser's cart, creating one (and its cookie) on the first write. */
  function ensureCartId(request: FastifyRequest, reply: FastifyReply): string {
    const existing = readCartId(request.headers.cookie);
    if (existing) return existing;
    const cartId = randomUUID();
    reply.header('set-cookie', cartCookie(cartId));
    return cartId;
  }

  function fail(reply: FastifyReply, status: number, error: ApiErrorCode, message: string) {
    return sendError(reply, status, error, message);
  }

  /** The catalog, or null (logged) when it can't be reached. */
  async function tryCatalog(): Promise<Catalog | null> {
    try {
      return await catalog();
    } catch (error) {
      app.log.warn({ err: error }, 'catalog unavailable; serving the cart unpriced');
      return null;
    }
  }

  async function view(cartId: string | undefined): Promise<CartView> {
    const [products, stored] = await Promise.all([tryCatalog(), carts.get(cartId)]);
    const lines = stored.map(({ productSlug, quantity }) => {
      const product = products?.get(productSlug);
      return {
        productSlug,
        quantity,
        name: product?.name ?? null,
        unitPrice: product?.price ?? null,
      };
    });
    return {
      lines,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: products
        ? lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0)
        : null,
      pricesAvailable: products !== null,
    };
  }

  app.get('/api/cart', async (request) => view(readCartId(request.headers.cookie)));

  app.post<{ Body: AddItemBody }>(
    '/api/cart/items',
    {
      schema: {
        body: {
          type: 'object',
          required: ['productSlug'],
          properties: {
            productSlug: SLUG,
            quantity: { type: 'integer', minimum: 1, maximum: MAX_QUANTITY, default: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { productSlug, quantity = 1 } = request.body;

      let products: Catalog;
      try {
        products = await catalog();
      } catch (error) {
        if (!(error instanceof UpstreamUnavailableError)) throw error;
        return fail(reply, 503, 'catalog_unavailable', 'The catalog is unavailable, try again.');
      }
      if (!products.has(productSlug)) {
        return fail(reply, 404, 'unknown_product', `No product "${productSlug}".`);
      }

      const cartId = ensureCartId(request, reply);
      await carts.add(cartId, productSlug, quantity);
      request.log.info({ productSlug, quantity }, 'item added');

      // Post/Redirect/Get: a form submission lands on the cart page, and
      // reloading it doesn't post again.
      if (isFormPost(request)) return reply.redirect('/cart', 303);
      return view(cartId);
    },
  );

  app.put<{ Body: SetQuantityBody; Params: { productSlug: string } }>(
    '/api/cart/items/:productSlug',
    {
      schema: {
        params: { type: 'object', properties: { productSlug: SLUG } },
        body: {
          type: 'object',
          required: ['quantity'],
          properties: { quantity: { type: 'integer', minimum: 0, maximum: MAX_QUANTITY } },
        },
      },
    },
    async (request) => {
      const cartId = readCartId(request.headers.cookie);
      if (cartId) await carts.set(cartId, request.params.productSlug, request.body.quantity);
      return view(cartId);
    },
  );

  app.delete<{ Params: { productSlug: string } }>(
    '/api/cart/items/:productSlug',
    { schema: { params: { type: 'object', properties: { productSlug: SLUG } } } },
    async (request) => {
      const cartId = readCartId(request.headers.cookie);
      if (cartId) await carts.remove(cartId, request.params.productSlug);
      return view(cartId);
    },
  );

  app.post<{ Body: CheckoutBody }>(
    '/api/cart/checkout',
    {
      schema: {
        body: {
          type: 'object',
          required: ['customer'],
          properties: {
            customer: {
              type: 'object',
              required: ['id', 'name'],
              // Anything else (an email, a price...) is dropped, not trusted.
              additionalProperties: false,
              properties: {
                id: { type: 'string', minLength: 1, maxLength: 100 },
                name: { type: 'string', minLength: 1, maxLength: 200 },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const cartId = readCartId(request.headers.cookie);
      if (!cartId) return fail(reply, 409, 'empty_cart', 'Your cart is empty.');

      // Prices first (outside the transaction: never hold a lock during a network call).
      let products: Catalog;
      try {
        products = await catalog();
      } catch (error) {
        if (!(error instanceof UpstreamUnavailableError)) throw error;
        return fail(reply, 503, 'catalog_unavailable', 'Prices are unavailable, try again.');
      }

      // NOTE: the customer is taken from the request because this demo has no
      // auth server; the shell passes the signed-in user. With a real identity
      // provider, the API reads it from a verified session instead.
      const { id, name } = request.body.customer;

      type Outcome =
        | { ok: true; checkout: CheckoutResult }
        | { ok: false; status: number; error: ApiErrorCode; message: string };

      // Read, price and empty the cart as one step: a double click can't
      // produce two checkouts, and a refused checkout leaves the cart as it was.
      const outcome = await carts.checkout<Outcome>(cartId, (lines) => {
        if (lines.length === 0) {
          return { commit: false, result: { ok: false, status: 409, error: 'empty_cart', message: 'Your cart is empty.' } };
        }
        const items: CheckoutResult['items'] = [];
        for (const { productSlug, quantity } of lines) {
          const product = products.get(productSlug);
          if (!product) {
            const message = 'Some products are no longer available.';
            return { commit: false, result: { ok: false, status: 409, error: 'unavailable_products', message } };
          }
          // The price comes from the catalog, here, now. Never from the request.
          items.push({ productSlug, name: product.name, quantity, unitPrice: product.price });
        }
        const checkout = { checkoutId: randomUUID(), customer: { id, name }, items };
        return { commit: true, result: { ok: true, checkout } };
      });

      if (!outcome.ok) return fail(reply, outcome.status, outcome.error, outcome.message);
      const { checkout } = outcome;
      request.log.info({ checkoutId: checkout.checkoutId, lines: checkout.items.length }, 'checkout completed');
      return reply.code(201).send(checkout);
    },
  );

  return app;
}
