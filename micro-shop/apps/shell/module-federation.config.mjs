// @ts-check
import { createModuleFederationConfig } from '@module-federation/enhanced/rspack';
import pkg from './package.json' with { type: 'json' };

/**
 * The federation contract of the Shell.
 *
 * The shell is a HOST: it exposes nothing and consumes remotes at runtime.
 *
 * Note what is NOT here: `remotes`. Early stages hard-coded
 *   orders: 'orders@http://localhost:3002/mf-manifest.json'
 * which baked an environment and a version into the shell's build. Now the
 * remotes come from /mfe-registry.json at startup (src/registry.ts), so
 * deploying or rolling back a remote never requires rebuilding the shell.
 */
export default createModuleFederationConfig({
  name: 'shell',

  // Must be compatible with what the remotes declare. Each is "singleton": exactly
  // one copy ends up on the page.
  shared: {
    react: { singleton: true, requiredVersion: pkg.dependencies.react },
    'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
    // The shell owns the <BrowserRouter>. Remotes render <Routes> inside it, so
    // they must use the SAME react-router module to see its context.
    'react-router': { singleton: true, requiredVersion: pkg.dependencies['react-router'] },
  },

  // 'version-first' (the default) fetches EVERY remote's manifest at startup to
  // pick the highest shared versions, so one unreachable remote blanked the
  // whole shell. 'loaded-first' reuses what is already loaded (the shell's own
  // React) and fetches a remote only when it's first used.
  shareStrategy: 'loaded-first',

  dts: false,
});
