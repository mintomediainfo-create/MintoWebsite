import pg from 'pg';
const { Pool } = pg;
type Pool = pg.Pool;
// DATE columns come back as 'YYYY-MM-DD' text (no time zone shift); counts as numbers
pg.types.setTypeParser(1082, (v: string) => v);
pg.types.setTypeParser(20, (v: string) => Number(v));
import { env } from './env';

// one pool per server / serverless instance
const g = globalThis as unknown as { __mmPool?: Pool };
export const pool =
  g.__mmPool ||
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    // never wait forever: no free connection in 10 s, or a query running 20 s, is an error (the request then answers 500)
    connectionTimeoutMillis: 10000,
    query_timeout: 20000,
    ssl: /localhost|127\.0\.0\.1/.test(env.DATABASE_URL) ? undefined : { rejectUnauthorized: false },
  });
g.__mmPool = pool;

export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(text, params as any[]);
  return r.rows as T[];
}
export async function one<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] || null;
}
