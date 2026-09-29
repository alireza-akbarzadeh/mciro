import pg from 'pg';

// A Postgres connection pool with settings that suit Neon (serverless Postgres
// that scales to zero), used the same way by every service. Each service still
// owns its own tables, in its own Postgres schema, through its own Drizzle
// schema and migrations: the kit only provides the connection.

export type DatabasePool = pg.Pool;

export type DatabasePoolOptions = {
  /** Connections per service instance. Small: Neon pools on its side too. */
  max?: number;
};

export function createDatabasePool(
  connectionString: string,
  { max = 5 }: DatabasePoolOptions = {},
): DatabasePool {
  const pool = new pg.Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    // A cold Neon compute takes a moment to wake up; don't wait forever.
    connectionTimeoutMillis: 10_000,
  });
  // An idle connection dropped by the server (compute suspended, network blip)
  // must not crash the process; the pool opens a new one on the next query.
  pool.on('error', () => {});
  return pool;
}

export type WaitOptions = {
  attempts?: number;
  /** Delay before the 2nd attempt; doubles after each failure. */
  delayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
};

/**
 * Resolves once the database answers a query. A suspended Neon compute
 * sometimes drops the first connection while it wakes up, so scripts
 * (migrate, seed) call this first instead of failing on a cold start.
 */
export async function waitForDatabase(
  pool: DatabasePool,
  { attempts = 4, delayMs = 1_000, onRetry }: WaitOptions = {},
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query('select 1');
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
      onRetry?.(attempt, error);
      await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** (attempt - 1)));
    }
  }
}

/** Logs retries of waitForDatabase from a command-line script. */
export function logRetry(label: string): WaitOptions['onRetry'] {
  return (attempt, error) =>
    console.warn(
      `[${label}] database not reachable yet (attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}); retrying…`,
    );
}

/** A health check for createService({ healthChecks }): can we run a query? */
export function databaseHealthCheck(pool: DatabasePool): () => Promise<void> {
  return async () => {
    await pool.query('select 1');
  };
}
