// @ts-check
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import mfConfig from './module-federation.config.mjs';
import pkg from './package.json' with { type: 'json' };

// The version this build will be released as. Shown in the UI so you can SEE which
// release is live. APP_VERSION overrides package.json for quick release demos.
const APP_VERSION = process.env.APP_VERSION ?? pkg.version;

const PORT = 3002;

export default defineConfig({
  entry: { main: './src/index.ts' },

  resolve: { extensions: ['.ts', '.tsx', '.js'] },

  output: {
    // Namespaces the chunk-loading global (rspackChunkorders) so two apps on one
    // page never overwrite each other's chunk registry.
    uniqueName: 'orders',
    // 'auto' = "work out my own URL at runtime". The remote does not know where it
    // will be deployed; its chunks are resolved relative to wherever it was loaded from.
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

  // Rspack 2 lazily compiles dynamic imports in dev by default. That fights
  // federation: the remote's chunks are requested by ANOTHER app's page, and the
  // hot updates it triggers target a container chunk that page never loaded.
  // Compile everything up front instead; it is a small app.
  lazyCompilation: false,

  devServer: {
    port: PORT,
    // The shell (another origin: localhost:3000) fetch()es mf-manifest.json from
    // here. fetch() is subject to CORS; without this header the browser blocks it.
    headers: { 'Access-Control-Allow-Origin': '*' },
    historyApiFallback: true,
  },

  plugins: [
    // Only used when Orders runs standalone (http://localhost:3002).
    // publicPath '/' for this page only: a deep link like /orders/1003 must load
    // /main.js, not /orders/main.js. The remote's own chunks keep publicPath 'auto'.
    new rspack.HtmlRspackPlugin({ template: './index.html', publicPath: '/' }),
    new rspack.DefinePlugin({ __APP_VERSION__: JSON.stringify(APP_VERSION) }),
    new ModuleFederationPlugin(mfConfig),
  ],
});
