import type { AuthStore } from '../auth-store.ts';
import { hashPassword } from '../passwords.ts';

// Demo users: the same everywhere (Neon via `pnpm db:seed`, or in memory when
// there's no database), so the login hint on the sign-in form is always true.
// A demo password is fine for a demo; real users sign up and choose their own.

export const DEMO_PASSWORD = 'demo';

export const demoUsers = [
  { id: 'u-ada', email: 'ada@example.com', name: 'Ada Lovelace' },
  { id: 'u-grace', email: 'grace@example.com', name: 'Grace Hopper' },
  { id: 'u-margaret', email: 'margaret@example.com', name: 'Margaret Hamilton' },
] as const;

/** Creates or updates the demo users. Safe to run any number of times. */
export async function seedDemoUsers(store: AuthStore): Promise<void> {
  for (const user of demoUsers) {
    await store.upsertUser({ ...user, passwordHash: await hashPassword(DEMO_PASSWORD) });
  }
}
