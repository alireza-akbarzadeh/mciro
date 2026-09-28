import { use, useSyncExternalStore } from 'react';
import type { Session } from '@micro-shop/contracts';

// The shell's adapter from Auth's framework-agnostic API to a React hook.
//
// The shell needs the session before it can decide what to render, so the
// remote module is requested once, as soon as this file is evaluated, and every
// caller shares that one promise. `use()` suspends until it resolves.
const sessionApi = import('auth/session');

export function useSession(): Session | null {
  const { subscribe, getSession } = use(sessionApi);
  return useSyncExternalStore(subscribe, getSession);
}
