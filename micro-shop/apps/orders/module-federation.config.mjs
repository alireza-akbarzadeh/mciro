// @ts-check
import { createModuleFederationConfig } from '@module-federation/enhanced/rspack';
import pkg from './package.json' with { type: 'json' };

/**
 * The federation contract of the Orders application.
 *
 * Orders is a REMOTE: it exposes modules for other applications to load at runtime.
 * Everything listed in `exposes` is public API. Everything else in src/ is private.
 */
export default createModuleFederationConfig({
  // Globally unique container name. The shell refers to this app as `orders@<url>`.
  name: 'orders',

  // Physical file the runtime executes to get the container (get/init functions).
  filename: 'remoteEntry.js',

  // The deliberately tiny public surface: one component. Consumers import it as
  // `orders/OrdersApp`. Internal files (data, helpers, CSS) are NOT reachable.
  // The shell mounts it at /orders/*; Orders owns every route below that prefix.
  exposes: {
    './OrdersApp': './src/OrdersApp.tsx',
  },

  // Libraries that must exist exactly once on the page. React keeps internal
  // state (the hooks dispatcher), so two copies break hooks at runtime.
  shared: {
    react: { singleton: true, requiredVersion: pkg.dependencies.react },
    'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
    // The router keeps the current location in React context. Orders' <Routes>
    // must read the SHELL's router context, which only works with one shared copy.
    'react-router': { singleton: true, requiredVersion: pkg.dependencies['react-router'] },
  },

  // Emit mf-manifest.json: a JSON description of this build (entry, exposes,
  // shared versions, assets) that consumers fetch before loading any JS.
  manifest: true,

  // Type generation is off for Stage 1; the shell declares the remote's type by
  // hand in src/remotes.d.ts so the contract is visible. See docs/module-federation.md.
  dts: false,
});
