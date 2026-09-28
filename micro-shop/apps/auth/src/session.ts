// PUBLIC API of Auth (exposed as `auth/session`).
//
// A read-only facade over the private store. Consumers can ask "is there a
// session, and who is it?", be notified when that changes, and ask Auth to end
// it. They cannot log in (that is Auth's UI), and they never see the token.
//
// Each export is typed by the shared contract. If the store drifts from what
// consumers were promised, THIS file stops compiling, in Auth's own build.

import type { AuthSessionModule } from '@micro-shop/contracts';
import * as store from './session-store';

export const getSession: AuthSessionModule['getSession'] = store.getSession;
export const subscribe: AuthSessionModule['subscribe'] = store.subscribe;
export const logout: AuthSessionModule['logout'] = store.logout;
