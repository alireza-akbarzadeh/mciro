// The async boundary. See apps/orders/src/index.ts for the full explanation:
// the federation runtime must negotiate shared React before any code uses it.
import('./bootstrap').catch((error: unknown) => {
  console.error('[shell] failed to bootstrap', error);
});
