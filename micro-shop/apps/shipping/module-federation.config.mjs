// @ts-check
import { createModuleFederationConfig } from '@module-federation/enhanced/rspack';
import pkg from './package.json' with { type: 'json' };

/**
 * The federation contract of the Shipping application.
 *
 * Shipping owns shipments and their tracking timeline. It knows an order only by
 * its id (a reference). It never imports Orders' code or data.
 */
export default createModuleFederationConfig({
  name: 'shipping',
  filename: 'remoteEntry.js',

  exposes: {
    // Mounted by the shell under /shipping/*. Owns everything below that prefix.
    './ShippingApp': './src/ShippingApp.tsx',
  },

  shared: {
    react: { singleton: true, requiredVersion: pkg.dependencies.react },
    'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
    // The router holds the current location in React context. Shipping's <Routes>
    // must read the SHELL's router context, which only works with one shared copy.
    'react-router': { singleton: true, requiredVersion: pkg.dependencies['react-router'] },
  },

  manifest: true,
  dts: false,
});
