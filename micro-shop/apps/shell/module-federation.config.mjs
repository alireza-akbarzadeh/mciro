// @ts-check
import { createModuleFederationConfig } from '@module-federation/enhanced/rspack';
import pkg from './package.json' with { type: 'json' };

/**
 * The federation contract of the Shell.
 *
 * The shell is a HOST: it exposes nothing and consumes remotes at runtime.
 */
export default createModuleFederationConfig({
  name: 'shell',

  // alias -> "<remote container name>@<manifest URL>"
  //
  // `import('orders/OrdersApp')` in shell code is NOT resolved at build time. The
  // bundler turns it into "ask the federation runtime for module ./OrdersApp of
  // the remote registered as `orders`". The runtime fetches the manifest below,
  // then remoteEntry.js, then the chunk(s) for ./OrdersApp.
  //
  // Hard-coded to localhost for now. A later stage replaces this with per-environment URLs.
  remotes: {
    auth: 'auth@http://localhost:3001/mf-manifest.json',
    orders: 'orders@http://localhost:3002/mf-manifest.json',
    shipping: 'shipping@http://localhost:3003/mf-manifest.json',
  },

  // Must be compatible with what the remotes declare. Each is "singleton": exactly
  // one copy ends up on the page. Which copy wins is negotiated at runtime
  // (highest satisfying version by default).
  shared: {
    react: { singleton: true, requiredVersion: pkg.dependencies.react },
    'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
    // The shell owns the <BrowserRouter>. Remotes render <Routes> inside it, so
    // they must use the SAME react-router module to see its context.
    'react-router': { singleton: true, requiredVersion: pkg.dependencies['react-router'] },
  },

  dts: false,
});
