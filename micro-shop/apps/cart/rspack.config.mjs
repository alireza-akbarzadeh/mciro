// @ts-check
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import mfConfig from './module-federation.config.mjs';
import pkg from './package.json' with { type: 'json' };

// The version this build will be released as. Shown in the UI so you can SEE which
// release is live. APP_VERSION overrides package.json for quick release demos.
const APP_VERSION = process.env.APP_VERSION ?? pkg.version;

// Deliberately a copy of the other apps' configs: each team owns its build.

const PORT = 3005;

export default defineConfig({
  entry: { main: './src/index.ts' },

  resolve: { extensions: ['.ts', '.tsx', '.js'] },

  output: {
    uniqueName: 'cart',
    publicPath: 'auto',
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', tsx: true },
            transform: { react: { runtime: 'automatic' } },
          },
        },
        type: 'javascript/auto',
      },
      // postcss-loader runs Tailwind (postcss.config.mjs); Rspack's native CSS support does the rest.
      { test: /\.css$/, use: ['postcss-loader'], type: 'css/auto' },
    ],
  },

  // See apps/orders/rspack.config.mjs: lazy compilation and federation don't mix well in dev.
  lazyCompilation: false,

  devServer: {
    port: PORT,
    headers: { 'Access-Control-Allow-Origin': '*' },
    historyApiFallback: true,
    // Standalone mode only. In the composed app the page's origin is the gateway,
    // which routes /api/cart to the Cart API. Here, the dev server does it.
    proxy: [{ context: ['/api/cart'], target: 'http://localhost:4005' }],
  },

  plugins: [
    // publicPath '/' for the standalone page only: a deep link like /cart/add
    // must load /main.js, not /cart/main.js. The remote's own chunks keep 'auto'.
    new rspack.HtmlRspackPlugin({ template: './index.html', publicPath: '/' }),
    new rspack.DefinePlugin({ __APP_VERSION__: JSON.stringify(APP_VERSION) }),
    new ModuleFederationPlugin(mfConfig),
  ],
});
