// @ts-check
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import mfConfig from './module-federation.config.mjs';

const PORT = 3000;

export default defineConfig({
  entry: { main: './src/index.ts' },

  resolve: { extensions: ['.ts', '.tsx', '.js'] },

  output: {
    uniqueName: 'shell',
    // The shell owns the page and its URLs, so it can use an absolute path.
    publicPath: '/',
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
    historyApiFallback: true,
    // Dev only: serves public/mfe-registry.json. It is NOT copied into dist/;
    // in production the registry comes from the CDN (see src/registry.ts).
    static: { directory: 'public' },
  },

  plugins: [
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    new ModuleFederationPlugin(mfConfig),
  ],
});
