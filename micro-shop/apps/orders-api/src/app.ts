import type { Customer } from '@micro-shop/contracts';
import {
  createService,
  type FastifyReply,
  type FastifyRequest,
  type Identity,
  requireServiceToken,
  sendError,
  type ServiceOptions,
  UpstreamUnavailableError,
} from '@micro-shop/service-kit';
import type { ApiErrorCode, CreateOrderBody, CreateOrderResult, OrdersResponse, OrderView } from './api-types.ts';
import type { OrderStore } from './order-store.ts';

// The Orders API. Two kinds of callers:
//
//   Browsers, through the gateway (/api/orders/*), as the signed-in customer:
//     GET  /api/orders              the customer's orders, newest first
//     GET  /api/orders/:orderId     one of them (404 for anyone else's)
//
//   Other services, directly (the gateway doesn't route /internal/*), with the
//   shared service token:
//     POST /internal/orders         create the order for a checkout (Cart API)
//
// Who the customer is comes from the Auth API (the session cookie), never from
// the request: a customer can't ask for someone else's orders.

export type AppOptions = {
  orders: OrderStore;
  identity: Identity;
  /** The shared secret other services send (INTERNAL_API_TOKEN). */
  serviceToken: string;
  logger?: boolean;
  healthChecks?: ServiceOptions['healthChecks'];
};

const SLUG = { type: 'string', pattern: '^[a-z0-9-]{1,100}$' } as const;

export function buildApp({ orders, identity, serviceToken, logger = false, healthChecks }: AppOptions) {
  const app = createService({ name: 'orders-api', logger, healthChecks });

  function fail(reply: FastifyReply, status: number, error: ApiErrorCode, message: string) {
    return sendError(reply, status, error, message);
  }

  /** The signed-in customer, or null after answering 401/503 on the reply. */
  async function customerOf(request: FastifyRequest, reply: FastifyReply): Promise<Customer | null> {
    try {
      const customer = await identity(request.headers.cookie);
      if (!customer) fail(reply, 401, 'not_signed_in', 'Sign in to see your orders.');
      return customer;
    } catch (error) {
      if (!(error instanceof UpstreamUnavailableError)) throw error;
      fail(reply, 503, 'auth_unavailable', 'Sign-in can’t be checked right now, try again.');
      return null;
    }
  }

  app.get('/api/orders', async (request, reply) => {
    const customer = await customerOf(request, reply);
    if (!customer) return reply;
    const body: OrdersResponse = { orders: await orders.listForCustomer(customer.id) };
    return body;
  });

  app.get<{ Params: { orderId: string } }>('/api/orders/:orderId', async (request, reply) => {
    const customer = await customerOf(request, reply);
    if (!customer) return reply;
    const order: OrderView | undefined = await orders.find(request.params.orderId, customer.id);
    // Someone else's order is "not found" too: its existence isn't anyone else's business.
    if (!order) return fail(reply, 404, 'order_not_found', `No order #${request.params.orderId}.`);
    return order;
  });

  app.post<{ Body: CreateOrderBody }>(
    '/internal/orders',
    {
      preHandler: requireServiceToken(serviceToken),
      schema: {
        body: {
          type: 'object',
          required: ['checkoutId', 'customer', 'items'],
          properties: {
            checkoutId: { type: 'string', minLength: 1, maxLength: 100 },
            customer: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'string', minLength: 1, maxLength: 100 },
                name: { type: 'string', minLength: 1, maxLength: 100 },
              },
            },
            items: {
              type: 'array',
              minItems: 1,
              maxItems: 100,
              items: {
                type: 'object',
                required: ['productSlug', 'name', 'quantity', 'unitPrice'],
                properties: {
                  productSlug: SLUG,
                  name: { type: 'string', minLength: 1, maxLength: 200 },
                  quantity: { type: 'integer', minimum: 1, maximum: 100 },
                  unitPrice: { type: 'number', minimum: 0, maximum: 1_000_000 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { orderId, created } = await orders.create(request.body);
      request.log.info({ orderId, checkoutId: request.body.checkoutId, created }, created ? 'order created' : 'order already existed');
      const body: CreateOrderResult = { orderId };
      // 201 the first time; 200 when this checkout already had its order (a retry).
      return reply.code(created ? 201 : 200).send(body);
    },
  );

  return app;
}
