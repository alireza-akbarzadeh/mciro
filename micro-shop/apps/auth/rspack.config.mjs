// @ts-check
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import mfConfig from './module-federation.config.mjs';

// Deliberately a copy of apps/orders/rspack.config.mjs, not a shared import.
// Each team owns its build; a shared build config is a coupling point to add
// consciously later (packages/config), not by default.

const PORT = 3001;

export default defineConfig({
  entry: { main: './src/index.ts' },

  resolve: { extensions: ['.ts', '.tsx', '.js'] },

  output: {
    uniqueName: 'auth',
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
    // which routes /api/auth to the Auth API. Here, the dev server does it.
    proxy: [{ context: ['/api/auth'], target: 'http://localhost:4001' }],
  },

  plugins: [
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    new ModuleFederationPlugin(mfConfig),
  ],
});
