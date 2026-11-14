/**
 * Accès base de données. Toute requête « métier » passe par `withContext`, qui :
 *  - ouvre une transaction ;
 *  - bascule sur le rôle `oneera_app` (non propriétaire des tables → Row-Level Security appliquée) ;
 *  - pose l'utilisateur et l'établissement courants (SET LOCAL), lus par les politiques RLS.
 * Les opérations système (migrations, purge, création de session invitée) utilisent `withSystem`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export type Pool = pg.Pool;
export type Client = pg.PoolClient;

export interface RequestContext {
  userId?: string;
  orgId?: string;
}

export function createPool(connectionString: string, max = 10): Pool {
  return new pg.Pool({ connectionString, max });
}

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export async function migrate(pool: Pool): Promise<string[]> {
  const c = await pool.connect();
  try {
    await c.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await c.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const applied: string[] = [];
    for (const f of readdirSync(MIGRATIONS).filter((n) => n.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await c.query('BEGIN');
      try {
        await c.query(readFileSync(join(MIGRATIONS, f), 'utf8'));
        await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await c.query('COMMIT');
        applied.push(f);
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    }
    return applied;
  } finally {
    c.release();
  }
}

export async function withContext<T>(pool: Pool, ctx: RequestContext, fn: (c: Client) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SET LOCAL ROLE oneera_app');
    await c.query("SELECT set_config('app.user_id', $1, true), set_config('app.org_id', $2, true)", [ctx.userId ?? '', ctx.orgId ?? '']);
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

export async function withSystem<T>(pool: Pool, fn: (c: Client) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}
