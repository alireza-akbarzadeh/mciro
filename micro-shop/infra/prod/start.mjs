// @ts-check
// Runs the PRODUCTION simulation: built artifacts only, no dev servers.
//
//   cdn         :8081  infra/cdn/public   released remotes (versioned) + mfe-registry.json
//   shell       :3000  apps/shell/dist    static files, SPA fallback
//   storefront  :3004  next start         prerendered pages
//   cart-api    :4005  node               the Cart API (TypeScript run directly, no build)
//   auth-api    :4001  node               the Auth API: users and sessions
//   orders-api  :4002  node               the Orders API: orders, created by the Cart API at checkout
//   gateway     :8080  one public origin; /mfe-registry.json → CDN
//
// Prerequisites: pnpm build && pnpm release all

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The secret the Cart API shows the Orders API (POST /internal/orders). A new
// one per run, handed only to the two services, never the fixed dev value.
const internalApiToken = process.env.INTERNAL_API_TOKEN ?? randomBytes(32).toString('base64url');

/** @type {{ name: string, command: string, args: string[], cwd: string, env?: Record<string, string> }[]} */
const processes = [
  {
    name: 'cdn',
    command: process.execPath,
    args: ['infra/static/serve.mjs', '--dir', 'infra/cdn/public', '--port', '8081', '--cors', '--name', 'cdn'],
    cwd: repoRoot,
  },
  {
    name: 'shell',
    command: process.execPath,
    args: ['infra/static/serve.mjs', '--dir', 'apps/shell/dist', '--port', '3000', '--spa', '--name', 'shell'],
    cwd: repoRoot,
  },
  {
    name: 'storefront',
    command: process.execPath,
    args: [path.join(repoRoot, 'apps/storefront/node_modules/next/dist/bin/next'), 'start', '--port', '3004'],
    cwd: path.join(repoRoot, 'apps/storefront'),
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  },
  {
    name: 'cart-api',
    command: process.execPath,
    args: ['--env-file-if-exists=.env', '--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'src/server.ts'],
    cwd: path.join(repoRoot, 'apps/cart-api'),
    env: { INTERNAL_API_TOKEN: internalApiToken },
  },
  {
    name: 'auth-api',
    command: process.execPath,
    args: ['--env-file-if-exists=.env', '--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'src/server.ts'],
    cwd: path.join(repoRoot, 'apps/auth-api'),
  },
  {
    name: 'orders-api',
    command: process.execPath,
    args: ['--env-file-if-exists=.env', '--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'src/server.ts'],
    cwd: path.join(repoRoot, 'apps/orders-api'),
    env: { INTERNAL_API_TOKEN: internalApiToken },
  },
  {
    name: 'gateway',
    command: process.execPath,
    args: ['infra/gateway/server.mjs'],
    cwd: repoRoot,
    env: { CDN_PORT: '8081' },
  },
];

const children = processes.map(({ name, command, args, cwd, env }) => {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env } });
  const prefix = `[prod:${name}] `;
  child.stdout.on('data', (data) => process.stdout.write(prefix + String(data).trimEnd().replace(/\n/g, `\n${prefix}`) + '\n'));
  child.stderr.on('data', (data) => process.stderr.write(prefix + String(data).trimEnd().replace(/\n/g, `\n${prefix}`) + '\n'));
  child.on('exit', (code) => console.log(`${prefix}exited with code ${code}`));
  return child;
});

function shutdown() {
  for (const child of children) child.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('[prod] open http://localhost:8080  (stop with Ctrl+C)');
