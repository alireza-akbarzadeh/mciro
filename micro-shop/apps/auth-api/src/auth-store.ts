// Where users and sessions are kept. The routes only know this interface: the
// API runs on Postgres (postgres-auth-store.ts) or, without a database, in
// memory (below; also used by unit tests).

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

export type LiveSession = { user: StoredUser; expiresAt: Date };

export type AuthStore = {
  /** `email` must already be lowercased. */
  findUserByEmail(email: string): Promise<StoredUser | undefined>;
  /** Creates or updates a user (seeding). */
  upsertUser(user: StoredUser): Promise<void>;
  /** Creates a new user (sign-up). False when the email is already taken. */
  createUser(user: StoredUser): Promise<boolean>;
  /** Stores a new session, and forgets that user's expired ones. */
  createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  /** The user behind a session that exists and hasn't expired. */
  findSession(tokenHash: string): Promise<LiveSession | undefined>;
  deleteSession(tokenHash: string): Promise<void>;
};

export function createMemoryAuthStore(): AuthStore {
  const users = new Map<string, StoredUser>();
  const sessions = new Map<string, { userId: string; expiresAt: Date }>();

  return {
    async findUserByEmail(email) {
      return [...users.values()].find((user) => user.email === email);
    },

    async upsertUser(user) {
      users.set(user.id, user);
    },

    async createUser(user) {
      if (users.has(user.id) || [...users.values()].some(({ email }) => email === user.email)) return false;
      users.set(user.id, user);
      return true;
    },

    async createSession(tokenHash, userId, expiresAt) {
      const now = Date.now();
      for (const [hash, session] of sessions) {
        if (session.userId === userId && session.expiresAt.getTime() <= now) sessions.delete(hash);
      }
      sessions.set(tokenHash, { userId, expiresAt });
    },

    async findSession(tokenHash) {
      const session = sessions.get(tokenHash);
      if (!session || session.expiresAt.getTime() <= Date.now()) return undefined;
      const user = users.get(session.userId);
      return user && { user, expiresAt: session.expiresAt };
    },

    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },
  };
}
