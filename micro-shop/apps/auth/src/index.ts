// Standalone page CSS lives in the entry chunk so hosts can never receive it.
// See apps/orders/src/index.ts.
import './standalone.css';

// The async boundary. See apps/orders/src/index.ts for the full explanation.
import('./bootstrap').catch((error: unknown) => {
  console.error('[auth] failed to bootstrap', error);
});
