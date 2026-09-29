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

/** A health check for createService({ healthChecks }): can we run a query? */
export function databaseHealthCheck(pool: DatabasePool): () => Promise<void> {
  return async () => {
    await pool.query('select 1');
  };
}
