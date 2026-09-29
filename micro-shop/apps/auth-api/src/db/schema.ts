import { index, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

// The Auth API's tables, in its own Postgres schema `auth`. No other service
// reads them: other services ask the Auth API "who is this?" (GET /api/auth/session).

export const authSchema = pgSchema('auth');

export const users = authSchema.table('users', {
  /** Stable, public id (e.g. 'u-ada'). Other services store this, never the email. */
  id: text('id').primaryKey(),
  /** Stored lowercased, so sign-in is case-insensitive. */
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /** scrypt, with its parameters and salt (passwords.ts). Never the password. */
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = authSchema.table(
  'sessions',
  {
    /**
     * SHA-256 of the token in the browser's cookie. Only the browser has the
     * token itself, so a leaked copy of this table can't be used to sign in.
     */
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId), index('sessions_expires_at_idx').on(table.expiresAt)],
);
