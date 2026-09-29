// @ts-check
// Simulated independent deployment of micro-frontends to a CDN.
//
//   node infra/deploy/release.mjs orders            publish apps/orders/dist as a new version and make it live
//   node infra/deploy/release.mjs all               the same for auth, orders, shipping and cart
//   node infra/deploy/release.mjs rollback orders 0.1.0
//   node infra/deploy/release.mjs status
//
// A release does two separate things, exactly like real pipelines:
//   1. UPLOAD:  copy the build to an immutable, versioned folder
//               infra/cdn/public/orders/0.2.0/…   (never overwritten, cached forever)
//   2. PROMOTE: point the registry at it
//               infra/cdn/public/mfe-registry.json  (tiny, never cached)
//
// Rollback is step 2 alone, pointing back at a folder that still exists. It takes
// milliseconds and needs no rebuild. The shell is never rebuilt for any of this.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cdnRoot = path.join(repoRoot, 'infra/cdn/public');
const registryPath = path.join(cdnRoot, 'mfe-registry.json');
const CDN_ORIGIN = process.env.CDN_ORIGIN ?? 'http://localhost:8081';
const REMOTES = ['auth', 'orders', 'shipping', 'cart'];

/**
 * @typedef {{ entry: string, version: string }} LiveRemote
 * @typedef {{ remotes: Record<string, LiveRemote>, releases: Record<string, string[]> }} Registry
 */

/** @returns {Registry} */
function readRegistry() {
  if (!fs.existsSync(registryPath)) return { remotes: {}, releases: {} };
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

/** @param {Registry} registry */
function writeRegistry(registry) {
  fs.mkdirSync(cdnRoot, { recursive: true });
  // Write-then-rename: readers never see a half-written registry.
  const tmp = `${registryPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(registry, null, 2) + '\n');
  fs.renameSync(tmp, registryPath);
}

/** @param {string} app @param {string} version */
function entryUrl(app, version) {
  return `${CDN_ORIGIN}/${app}/${version}/mf-manifest.json`;
}

/** @param {string} app */
function release(app) {
  if (!REMOTES.includes(app)) throw new Error(`unknown remote "${app}" (expected ${REMOTES.join(', ')})`);

  const appDir = path.join(repoRoot, 'apps', app);
  const dist = path.join(appDir, 'dist');
  if (!fs.existsSync(path.join(dist, 'mf-manifest.json'))) {
    throw new Error(`${app}: no build found. Run "pnpm build:${app}" first.`);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  const version = process.env.APP_VERSION ?? pkg.version;

  // 1. UPLOAD. Immutable: a version that already exists is never overwritten.
  const target = path.join(cdnRoot, app, version);
  if (fs.existsSync(target)) {
    console.log(`[release] ${app}@${version} already uploaded; promoting it without re-uploading`);
  } else {
    fs.cpSync(dist, target, { recursive: true });
    console.log(`[release] uploaded ${app}@${version} → ${path.relative(repoRoot, target)}`);
  }

  // 2. PROMOTE.
  const registry = readRegistry();
  registry.remotes[app] = { version, entry: entryUrl(app, version) };
  registry.releases[app] = [...new Set([...(registry.releases[app] ?? []), version])];
  writeRegistry(registry);
  console.log(`[release] ${app} is now live at ${version}`);
}

/** @param {string} app @param {string} version */
function rollback(app, version) {
  if (!fs.existsSync(path.join(cdnRoot, app, version, 'mf-manifest.json'))) {
    throw new Error(`${app}@${version} was never uploaded; nothing to roll back to`);
  }
  const registry = readRegistry();
  const previous = registry.remotes[app]?.version ?? 'none';
  registry.remotes[app] = { version, entry: entryUrl(app, version) };
  writeRegistry(registry);
  console.log(`[release] rolled back ${app}: ${previous} → ${version} (registry only, no rebuild)`);
}

function status() {
  const registry = readRegistry();
  for (const app of REMOTES) {
    const live = registry.remotes[app]?.version ?? '(not released)';
    const all = registry.releases[app]?.join(', ') ?? '';
    console.log(`${app.padEnd(9)} live: ${live.padEnd(16)} uploaded: ${all}`);
  }
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === 'status') status();
  else if (command === 'rollback') {
    const [app, version] = rest;
    if (!app || !version) throw new Error('usage: release.mjs rollback <app> <version>');
    rollback(app, version);
  } else if (command === 'all') REMOTES.forEach(release);
  else if (command) release(command);
  else throw new Error('usage: release.mjs <app>|all|rollback <app> <version>|status');
} catch (error) {
  console.error(`[release] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
