// Standalone page CSS (reset + theme tokens) is imported HERE, in the entry chunk
// (main.js), which only Orders' own index.html loads. Hosts load remoteEntry.js
// instead, so they can never receive it.
//
// It used to be imported from bootstrap.tsx. In dev, Rspack put bootstrap.tsx in
// the same chunk as the shared react-dom module the exposed components need, so
// the shell downloaded this CSS and Orders' tokens overrode the shell's.
// Plain CSS is not a shared module, so importing it before the boundary is fine.
import './standalone.css';

// The async boundary.
//
// Nothing that touches a shared dependency (react, react-dom) may run in this
// first chunk. The dynamic import gives the Module Federation runtime one tick to
// initialise the share scope and decide WHICH copy of React this app will use
// (its own, or one already provided by a host). Only then does bootstrap run.
//
// Put `import { createRoot } from 'react-dom/client'` directly in this file and the
// browser throws "Shared module is not available for eager consumption".
import('./bootstrap').catch((error: unknown) => {
  console.error('[orders] failed to bootstrap', error);
});
