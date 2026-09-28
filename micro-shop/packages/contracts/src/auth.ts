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

/** Shape of the module exposed as `auth/session`. */
export type AuthSessionModule = {
  getSession(): Session | null;
  subscribe(listener: () => void): () => void;
  logout(): void;
};
