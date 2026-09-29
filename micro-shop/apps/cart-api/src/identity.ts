import type { Customer, SessionResponse } from '@micro-shop/contracts';
import { fetchJson, UpstreamUnavailableError } from '@micro-shop/service-kit';

// Who is checking out? The Cart API doesn't know users or passwords; it asks
// the Auth API, forwarding the Cookie header the browser sent (the session
// cookie is scoped to /, so it arrives here too). The browser can't claim to be
// someone else: only a session the Auth API issued counts.

/** The signed-in customer, null when signed out; throws UpstreamUnavailableError when Auth is down. */
export type Identity = (cookieHeader: string | undefined) => Promise<Customer | null>;

/** `sessionUrl`: the Auth API's SessionEndpoint, e.g. http://localhost:4001/api/auth/session. */
export function authApiIdentity(sessionUrl: string): Identity {
  return async (cookieHeader) => {
    if (!cookieHeader) return null;
    const answer = (await fetchJson(sessionUrl, { headers: { cookie: cookieHeader } })) as Partial<SessionResponse>;
    if (answer.session === undefined) throw new UpstreamUnavailableError('unexpected answer from the Auth API');
    if (!answer.session) return null;
    const { id, name } = answer.session.user;
    return { id, name };
  };
}

/** A fixed identity, for tests. */
export function staticIdentity(customer: Customer | null): Identity {
  return async () => customer;
}
