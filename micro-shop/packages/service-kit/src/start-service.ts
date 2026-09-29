import type { FastifyInstance } from 'fastify';

/** A port from the environment, or the service's default. */
export function portFromEnv(variable: string, fallback: number): number {
  const port = Number(process.env[variable]);
  return Number.isInteger(port) && port > 0 ? port : fallback;
}

/**
 * Starts listening and closes cleanly on Ctrl+C / SIGTERM, so in-flight
 * requests finish before the process exits. HOST defaults to 127.0.0.1: only the
 * gateway on this machine reaches the service. In a container, set HOST=0.0.0.0.
 */
export async function startService(app: FastifyInstance, { port }: { port: number }): Promise<void> {
  await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close().then(() => process.exit(0));
    });
  }
}
