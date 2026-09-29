import { and, eq, gt, lte } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AuthStore } from './auth-store.ts';
import { sessions, users } from './db/schema.ts';

// Users and sessions in Postgres (Neon), through Drizzle.

export function createPostgresAuthStore(db: NodePgDatabase): AuthStore {
  const userColumns = {
    id: users.id,
    email: users.email,
    name: users.name,
    passwordHash: users.passwordHash,
  };

  return {
    async findUserByEmail(email) {
      const [user] = await db.select(userColumns).from(users).where(eq(users.email, email)).limit(1);
      return user;
    },

    async upsertUser(user) {
      await db
        .insert(users)
        .values(user)
        .onConflictDoUpdate({
          target: users.id,
          set: { email: user.email, name: user.name, passwordHash: user.passwordHash },
        });
    },

    async createUser(user) {
      // The unique index on email decides, so two sign-ups racing for the
      // same email can't both win.
      const created = await db.insert(users).values(user).onConflictDoNothing().returning({ id: users.id });
      return created.length > 0;
    },

    async createSession(tokenHash, userId, expiresAt) {
      await db.transaction(async (tx) => {
        await tx
          .delete(sessions)
          .where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, new Date())));
        await tx.insert(sessions).values({ tokenHash, userId, expiresAt });
      });
    },

    async findSession(tokenHash) {
      const [row] = await db
        .select({ user: userColumns, expiresAt: sessions.expiresAt })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
        .limit(1);
      return row;
    },

    async deleteSession(tokenHash) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },
  };
}
