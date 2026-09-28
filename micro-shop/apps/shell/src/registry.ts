import { registerRemotes } from '@module-federation/enhanced/runtime';
import { createLogger, errorData } from '@micro-shop/observability';

// The REMOTE REGISTRY: which version of each micro-frontend is live, and where.
//
// The shell's build contains NO remote URLs. At startup it fetches
// /mfe-registry.json and registers what it finds. Releasing Orders 0.2.0, or
// rolling back to 0.1.0, is a change to that JSON file. The shell is never
// rebuilt or redeployed. That is what "independent deployment" means in practice.
//
// Who serves the file:
//   dev         apps/shell/public/mfe-registry.json (dev server, points at localhost:300x)
//   production  the CDN, via the gateway (written by infra/deploy/release.mjs)

const log = createLogger('shell');

export const REGISTRY_URL = '/mfe-registry.json';

export type RegistryEntry = { entry: string; version: string };
export type Registry = { remotes: Record<string, RegistryEntry> };

export async function loadRemoteRegistry(): Promise<void> {
  try {
    const response = await fetch(REGISTRY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const registry = parseRegistry(await response.json());

    registerRemotes(
      Object.entries(registry.remotes).map(([name, remote]) => ({ name, entry: remote.entry })),
    );
    log.info(
      'remote registry loaded',
      Object.fromEntries(Object.entries(registry.remotes).map(([name, r]) => [name, r.version])),
    );
  } catch (error) {
    // Without a registry the shell still renders; every remote shows its fallback.
    log.error(`remote registry unavailable (${REGISTRY_URL})`, errorData(error));
  }
}

function parseRegistry(value: unknown): Registry {
  if (typeof value !== 'object' || value === null) throw new Error('registry is not an object');
  const remotes = (value as { remotes?: unknown }).remotes;
  if (typeof remotes !== 'object' || remotes === null) throw new Error('registry.remotes missing');

  const result: Record<string, RegistryEntry> = {};
  for (const [name, raw] of Object.entries(remotes)) {
    const { entry, version } = (raw ?? {}) as Record<string, unknown>;
    if (typeof entry !== 'string' || typeof version !== 'string') {
      throw new Error(`registry entry "${name}" is invalid`);
    }
    result[name] = { entry, version };
  }
  return { remotes: result };
}
