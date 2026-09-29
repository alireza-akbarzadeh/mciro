// @ts-check
import { createModuleFederationConfig } from '@module-federation/enhanced/rspack';
import pkg from './package.json' with { type: 'json' };

/**
 * The federation contract of the Cart application.
 *
 * Cart owns the shopping cart and checkout. It keeps product SLUGS (references),
 * looks up names and prices in the catalog's public API (/catalog.json), and
 * hands a completed checkout to Orders as an event. It never imports another
 * app's code.
 */
export default createModuleFederationConfig({
  name: 'cart',
  filename: 'remoteEntry.js',

  exposes: {
    // Mounted by the shell under /cart/*. Guests may use it.
    './CartApp': './src/CartApp.tsx',
    // Mounted by the shell at /checkout, behind sign-in. Props: CheckoutProps.
    './Checkout': './src/Checkout.tsx',
    // The item count in the shell's header.
    './CartBadge': './src/CartBadge.tsx',
  },

  shared: {
    react: { singleton: true, requiredVersion: pkg.dependencies.react },
    'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
    // Cart's <Routes> and links must use the SHELL's router context.
    'react-router': { singleton: true, requiredVersion: pkg.dependencies['react-router'] },
  },

  manifest: true,
  dts: false,
});
