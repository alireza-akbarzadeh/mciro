// @ts-check
import { createModuleFederationConfig } from '@module-federation/enhanced/rspack';
import pkg from './package.json' with { type: 'json' };

/**
 * The federation contract of the Auth application.
 *
 * Auth owns identity: who the user is, whether a session exists, how login works.
 * It exposes three things and deliberately NOT `login()` or the token.
 */
export default createModuleFederationConfig({
  name: 'auth',
  filename: 'remoteEntry.js',

  exposes: {
    // Framework-agnostic read API: getSession / subscribe / logout.
    // Plain functions, not a React hook, so any consumer (or framework) can adapt it.
    './session': './src/session.ts',
    // Auth-owned UI. The only way to log in is through Auth's own form.
    './LoginForm': './src/LoginForm.tsx',
    './UserMenu': './src/UserMenu.tsx',
  },

  shared: {
    react: { singleton: true, requiredVersion: pkg.dependencies.react },
    'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
  },

  manifest: true,
  dts: false,
});
