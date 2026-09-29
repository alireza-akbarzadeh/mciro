// Request and response shapes of the Auth API. Its clients are the Auth
// frontend (apps/auth) and, server to server, other services that need to know
// who a request comes from (the Cart API at checkout). The session itself is
// the shared contract type from @micro-shop/contracts.

import type { SessionResponse } from '@micro-shop/contracts';

export type LoginBody = { email: string; password: string };

/** GET /api/auth/session (a contract: other services call it), and the answer to login and logout. */
export type { SessionResponse };

export type ApiErrorCode = 'invalid_credentials' | 'json_required';
export type ApiError = { error: ApiErrorCode; message: string };

/** HttpOnly: the browser sends it, no page script can read it. */
export const SESSION_COOKIE = 'micro-shop-session';

/**
 * NOT HttpOnly, and holds only a display name: lets the storefront (another
 * zone, no shared JavaScript) show "Signed in as Ada" without calling the API.
 */
export const DISPLAY_NAME_COOKIE = 'micro-shop-user';
