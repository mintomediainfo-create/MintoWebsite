import pg from 'pg';
const { Pool } = pg;
type Pool = pg.Pool;
// DATE columns come back as 'YYYY-MM-DD' text (no time zone shift); counts as numbers
pg.types.setTypeParser(1082, (v: string) => v);
pg.types.setTypeParser(20, (v: string) => Number(v));
import { attachDatabasePool } from '@vercel/functions';
import { env } from './env';

// one pool per server / serverless instance
// On Vercel the function is frozen between requests; a connection left open during that time is cut by the database,
// and the next query on it hangs until the function times out (FUNCTION_INVOCATION_TIMEOUT: "Saving..." forever).
// So: idle connections are closed quickly, Vercel's attachDatabasePool closes them before a freeze, and every wait has
// a short limit, so a problem becomes a clear error in a few seconds instead of a hang.
const g = globalThis as unknown as { __mmPool?: Pool };
export const pool =
  g.__mmPool ||
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
    keepAlive: true,
    ssl: /localhost|127\.0\.0\.1/.test(env.DATABASE_URL) ? undefined : { rejectUnauthorized: false },
  });
if (!g.__mmPool) {
  pool.on('error', (e) => console.error('db pool:', e.message)); // a connection dropped while idle: just log it
  if (process.env.VERCEL) attachDatabasePool(pool);
}
g.__mmPool = pool;

export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(text, params as any[]);
  return r.rows as T[];
}
export async function one<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] || null;
}
