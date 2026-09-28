import type { ModuleFederationRuntimePlugin } from '@module-federation/enhanced/runtime';
import { createLogger, errorData } from '@micro-shop/observability';

// A Module Federation RUNTIME PLUGIN: hooks into the federation runtime itself,
// so every remote load is measured and every failure reported, without touching
// the code that calls loadRemote(). In production, the logger's sinks forward
// these entries to monitoring: "p95 load time of orders/OrdersApp", "failure rate
// of shipping after deploy 0.2.0"...

const log = createLogger('shell');

export function observabilityPlugin(): ModuleFederationRuntimePlugin {
  const startedAt = new Map<string, number>();

  return {
    name: 'micro-shop-observability',

    beforeRequest(args) {
      startedAt.set(args.id, performance.now());
      log.info(`loading remote module ${args.id}`);
      return args;
    },

    onLoad(args) {
      const start = startedAt.get(args.id);
      const ms = start === undefined ? undefined : Math.round(performance.now() - start);
      log.info(`loaded remote module ${args.id}`, { ms });
    },

    errorLoadRemote(args) {
      log.error(`failed to load remote module ${args.id}`, {
        ...errorData(args.error),
        lifecycle: args.lifecycle,
      });
      // Returning undefined re-throws the original error, so the nearest
      // RemoteBoundary still shows its fallback. A plugin could instead return
      // a fallback module here.
      return undefined;
    },
  };
}
