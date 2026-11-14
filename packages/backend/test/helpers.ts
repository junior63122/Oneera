import pg from 'pg';
import { createPool, migrate, Pool, withSystem } from '../src/db';

/**
 * Base de test isolée par fichier de test.
 * Nécessite TEST_DATABASE_URL (ex. via scripts/dev-db.sh, ou le service Postgres de la CI).
 */
export const TEST_URL = process.env.TEST_DATABASE_URL ?? 'postgres://oneera@127.0.0.1:55432/postgres';

export async function freshDb(name: string): Promise<Pool> {
  const admin = new pg.Client({ connectionString: TEST_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const url = new URL(TEST_URL);
  url.pathname = `/${name}`;
  const pool = createPool(url.toString());
  await migrate(pool);
  return pool;
}

export interface Fixture {
  tenant: string;
  orgA: string;
  orgB: string;
  eventA: string;
  eventB: string;
  managerA: string;
  managerB: string;
  alice: string;
  bob: string;
  carol: string;
}

/** Deux établissements, un événement chacun, trois visiteurs. */
export async function seed(pool: Pool): Promise<Fixture> {
  return withSystem(pool, async (c) => {
    const one = async (sql: string, args: unknown[] = []) => (await c.query(sql, args)).rows[0].id as string;
    const tenant = await one("INSERT INTO tenants (slug, name) VALUES ('oneera', 'ONEERA') RETURNING id");
    const orgA = await one("INSERT INTO organizations (tenant_id, name) VALUES ($1, 'Club A') RETURNING id", [tenant]);
    const orgB = await one("INSERT INTO organizations (tenant_id, name) VALUES ($1, 'Festival B') RETURNING id", [tenant]);
    const mkEvent = async (org: string, name: string) => {
      const venue = await one("INSERT INTO venues (organization_id, name, kind) VALUES ($1, $2, 'club') RETURNING id", [org, name]);
      const map = await one("INSERT INTO venue_maps (venue_id, organization_id, version, definition, published_at) VALUES ($1, $2, 1, '{}', now()) RETURNING id", [venue, org]);
      await c.query("INSERT INTO zones (map_id, organization_id, key, name, kind, floor_id, area) VALUES ($1, $2, 'bar', 'Bar', 'bar', 'L0', ST_GeomFromText('POLYGON((0 0,10 0,10 10,0 10,0 0))', 0))", [map, org]);
      return one("INSERT INTO events (venue_id, organization_id, map_id, name, during, expected_attendance) VALUES ($1, $2, $3, $4, tstzrange(now() - interval '1 hour', now() + interval '5 hours'), 800) RETURNING id", [venue, org, map, name]);
    };
    const eventA = await mkEvent(orgA, 'Soirée A');
    const eventB = await mkEvent(orgB, 'Festival B');
    const user = (n: string) => one('INSERT INTO users (tenant_id, display_name, is_guest) VALUES ($1, $2, false) RETURNING id', [tenant, n]);
    const managerA = await user('Manager A');
    const managerB = await user('Manager B');
    const alice = await user('Alice');
    const bob = await user('Bob');
    const carol = await user('Carol');
    await c.query("INSERT INTO staff_memberships (user_id, organization_id, role) VALUES ($1, $2, 'manager'), ($3, $4, 'manager')", [managerA, orgA, managerB, orgB]);
    return { tenant, orgA, orgB, eventA, eventB, managerA, managerB, alice, bob, carol };
  });
}
