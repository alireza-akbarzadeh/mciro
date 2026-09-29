// Contract for the Auth micro-frontend's public API.
//
// Producer: apps/auth implements it (src/session.ts).
// Consumers: apps/shell (and later anyone else) type their imports of `auth/session` with it.
//
// Both sides compile against THIS file, so a breaking change here fails the
// build of every consumer in the monorepo, instead of failing in the browser.

export type User = {
  id: string;
  name: string;
  email: string;
};

/** Identity as other applications may see it. Never contains credentials. */
export type Session = {
  user: User;
  /** ISO 8601 timestamp. */
  expiresAt: string;
};

// The Auth API's one cross-team endpoint: any SERVICE may ask who a request
// comes from, by forwarding the browser's Cookie header to it. (Browsers use
// the `auth/session` module below instead.)

/** Where to ask, on the Auth API. */
export type SessionEndpoint = '/api/auth/session';

/** Its answer. */
export type SessionResponse = { session: Session | null };

/** Shape of the module exposed as `auth/session`. */
export type AuthSessionModule = {
  /**
   * Resolves once the session is known (Auth has asked its API). Until then
   * getSession() returns null for everyone, so wait before deciding "signed out".
   */
  ready(): Promise<void>;
  getSession(): Session | null;
  subscribe(listener: () => void): () => void;
  logout(): void;
};
