import { parse as parseQueryString } from 'node:querystring';
import Fastify, { type FastifyInstance, type FastifyRequest, LogController } from 'fastify';
import type { ErrorBody } from './errors.ts';

// Every backend service starts here, so they all behave the same way:
//
//   - logs are JSON, tagged with the service name, and describe what the service
//     DID ("item added"), not every request
//   - GET /health answers { status, service, checks } for load balancers and ops,
//     503 when a check (e.g. the database) fails
//   - every error has one shape: { error, message }
//       400 for invalid input, 404 for unknown routes, 500 for bugs (details logged,
//       never sent to the client)
//   - plain HTML form posts are parsed like JSON, so a form works without JavaScript
//
// What the service does (its routes, rules and data) is written in the service.

export type ServiceOptions = {
  /** Tags every log line, like createLogger(app) does on the frontend. */
  name: string;
  /** Off in tests; on in server.ts. */
  logger?: boolean;
  /**
   * What /health verifies besides "the process answers", e.g.
   * { database: databaseHealthCheck(pool) }. A failing check makes /health 503.
   */
  healthChecks?: Record<string, () => Promise<unknown>>;
};

export function createService({ name, logger = false, healthChecks = {} }: ServiceOptions): FastifyInstance {
  const app = Fastify({
    logger: logger && { level: 'info', base: { service: name } },
    logController: new LogController({ disableRequestLogging: true }),
  });

  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_request, body, done) => done(null, parseQueryString(String(body))),
  );

  app.get('/health', async (request, reply) => {
    const checks: Record<string, 'ok' | 'failing'> = {};
    await Promise.all(
      Object.entries(healthChecks).map(async ([check, run]) => {
        try {
          await run();
          checks[check] = 'ok';
        } catch (error) {
          request.log.warn({ err: error, check }, 'health check failing');
          checks[check] = 'failing';
        }
      }),
    );
    const healthy = Object.values(checks).every((result) => result === 'ok');
    return reply.code(healthy ? 200 : 503).send({ status: healthy ? 'ok' : 'failing', service: name, checks });
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ErrorBody = { error: 'not_found', message: `No route for ${request.method} ${request.url}` };
    return reply.code(404).send(body);
  });

  app.setErrorHandler((error, request, reply) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status >= 400 && status < 500) {
      const body: ErrorBody = { error: 'bad_request', message: (error as Error).message };
      return reply.code(status).send(body);
    }
    // A bug or an outage: log everything, tell the client nothing internal.
    request.log.error({ err: error }, 'unhandled error');
    const body: ErrorBody = { error: 'internal', message: 'Something went wrong.' };
    return reply.code(500).send(body);
  });

  return app;
}

/** True for a plain HTML form submission (as opposed to a fetch with JSON). */
export function isFormPost(request: FastifyRequest): boolean {
  return (request.headers['content-type'] ?? '').startsWith('application/x-www-form-urlencoded');
}
