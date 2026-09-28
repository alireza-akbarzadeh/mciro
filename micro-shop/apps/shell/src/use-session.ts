import { use, useSyncExternalStore } from 'react';
import type { AuthSessionModule, Session } from '@micro-shop/contracts';
import { loadRemoteModule } from './load-remote';

// The shell's adapter from Auth's framework-agnostic API to a React hook.
//
// The remote module is requested on first use (not at startup, so a missing
// Auth server can't break pages that don't need a session), and every caller
// shares that one promise. `use()` suspends until it resolves.
//
// A failed promise stays cached until the user clicks Retry (see
// resetSessionApi). Dropping it automatically would make React's re-renders
// start a new request each time, the same burst described in remote.tsx.
let sessionApi: Promise<AuthSessionModule> | null = null;

function loadSessionApi(): Promise<AuthSessionModule> {
  sessionApi ??= loadRemoteModule('auth/session');
  return sessionApi;
}

/** Called by the Retry button of the boundary around the session check. */
export function resetSessionApi(): void {
  sessionApi = null;
}

export function useSession(): Session | null {
  const { subscribe, getSession } = use(loadSessionApi());
  return useSyncExternalStore(subscribe, getSession);
}
