import { registerPlugins } from '@module-federation/enhanced/runtime';
import { observabilityPlugin } from './mf-observability';
import { loadRemoteRegistry } from './registry';

// Startup, in order:
//   1. Plug observability into the federation runtime (measures every remote load).
//   2. Fetch the remote registry and register the remotes it lists.
//   3. The async boundary: import('./bootstrap') lets the runtime initialise
//      shared React before any React code runs (see apps/orders/src/index.ts).
//
// Steps 1–2 use the federation runtime and plain fetch, not React, so they may
// run before the boundary.

async function start(): Promise<void> {
  registerPlugins([observabilityPlugin()]);
  await loadRemoteRegistry();
  await import('./bootstrap');
}

start().catch((error: unknown) => {
  console.error('[shell] failed to bootstrap', error);
});
