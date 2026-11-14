/**
 * Tests de sécurité et de confidentialité appliqués PAR LA BASE (Row-Level Security).
 * Chaque test correspond à un seuil bloquant de docs/validation-grid.md (Sécurité / RGPD).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool, withContext, withSystem } from '../src/db';
import { Fixture, freshDb, seed } from './helpers';

let pool: Pool;
let f: Fixture;

beforeAll(async () => {
  pool = await freshDb('oneera_test_security');
  f = await seed(pool);
});
afterAll(async () => pool?.end());

const as = <T>(userId: string, fn: Parameters<typeof withContext<T>>[2], orgId?: string) => withContext(pool, { userId, orgId }, fn);
const count = async (userId: string, sql: string, args: unknown[] = [], orgId?: string) =>
  as(userId, async (c) => (await c.query(sql, args)).rowCount ?? 0, orgId);

async function makeFriends(a: string, b: string) {
  await withSystem(pool, (c) => c.query(
    "INSERT INTO friendships (user_a, user_b, status, requested_by) VALUES (least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid), 'accepted', $1) ON CONFLICT DO NOTHING", [a, b]));
}
async function consent(user: string, purpose: string) {
  await as(user, (c) => c.query("INSERT INTO consents (user_id, purpose, policy_version) VALUES ($1, $2, 'v2-draft')", [user, purpose]));
}
async function publish(user: string, event: string, seq: number, x: number, y: number) {
  await as(user, (c) => c.query(
    `INSERT INTO live_positions (user_id, event_id, organization_id, seq, measured_at, floor_id, pos, r68, zone_key, zone_prob, quality)
     VALUES ($1, $2, $3, $4, now(), 'L0', ST_MakePoint($5, $6), 2.5, 'bar', 0.9, 'precise')
     ON CONFLICT (user_id, event_id) DO UPDATE SET seq = EXCLUDED.seq, pos = EXCLUDED.pos, measured_at = EXCLUDED.measured_at`,
    [user, event, f.orgA, seq, x, y]));
}

describe('isolement entre établissements', () => {
  it("un manager ne voit que son établissement", async () => {
    expect(await count(f.managerA, 'SELECT 1 FROM events', [], f.orgA)).toBe(1);
    expect(await count(f.managerA, 'SELECT 1 FROM events WHERE id = $1', [f.eventB], f.orgA)).toBe(0);
  });
  it("usurper l'identifiant d'un autre établissement ne donne aucun accès", async () => {
    expect(await count(f.managerA, 'SELECT 1 FROM events', [], f.orgB)).toBe(0);
    expect(await count(f.managerA, 'SELECT 1 FROM zones', [], f.orgB)).toBe(0);
  });
  it("un visiteur ne lit pas les tables d'exploitation mais accède à la carte via le QR", async () => {
    expect(await count(f.alice, 'SELECT 1 FROM events')).toBe(0);
    const code = await withSystem(pool, async (c) => (await c.query('SELECT access_code FROM events WHERE id = $1', [f.eventA])).rows[0].access_code);
    expect(await count(f.alice, 'SELECT * FROM app.event_by_code($1)', [code])).toBe(1);
    expect(await count(f.alice, 'SELECT * FROM app.event_by_code($1)', ['inexistant'])).toBe(0);
  });
});

describe('amitiés', () => {
  it("on ne peut pas s'auto-déclarer ami accepté", async () => {
    await expect(as(f.alice, (c) => c.query(
      "INSERT INTO friendships (user_a, user_b, status, requested_by) VALUES (least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid), 'accepted', $1)", [f.alice, f.carol])))
      .rejects.toThrow();
  });
  it("seul le destinataire peut accepter une demande", async () => {
    await as(f.alice, (c) => c.query(
      "INSERT INTO friendships (user_a, user_b, status, requested_by) VALUES (least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid), 'pending', $1)", [f.alice, f.carol]));
    await expect(as(f.alice, (c) => c.query(
      "UPDATE friendships SET status = 'accepted' WHERE $1 IN (user_a, user_b) AND $2 IN (user_a, user_b)", [f.alice, f.carol]))).rejects.toThrow();
    await as(f.carol, (c) => c.query(
      "UPDATE friendships SET status = 'accepted' WHERE $1 IN (user_a, user_b) AND $2 IN (user_a, user_b)", [f.alice, f.carol]));
    expect(await count(f.alice, "SELECT 1 FROM friendships WHERE status = 'accepted'")).toBe(1);
    await withSystem(pool, (c) => c.query('DELETE FROM friendships'));
  });
  it("invitation QR : usage unique, non réutilisable, pas d'auto-invitation", async () => {
    const tok = await as(f.carol, async (c) => (await c.query('INSERT INTO friend_invites (inviter) VALUES ($1) RETURNING token', [f.carol])).rows[0].token);
    await expect(as(f.carol, (c) => c.query('SELECT app.accept_invite($1)', [tok]))).rejects.toThrow(/invalide/);
    await as(f.bob, (c) => c.query('SELECT app.accept_invite($1)', [tok]));
    expect(await count(f.bob, "SELECT 1 FROM friendships WHERE status = 'accepted'")).toBe(1);
    await expect(as(f.alice, (c) => c.query('SELECT app.accept_invite($1)', [tok]))).rejects.toThrow(/invalide/);
    await withSystem(pool, (c) => c.query('DELETE FROM friendships'));
  });
});

describe('positions entre amis', () => {
  const visible = (viewer: string) => count(viewer, 'SELECT 1 FROM live_positions WHERE user_id = $1', [f.alice]);

  it("rien n'est visible sans partage actif, même entre amis", async () => {
    await makeFriends(f.alice, f.bob);
    await consent(f.alice, 'location_friends');
    await publish(f.alice, f.eventA, 1, 3, 3);
    expect(await visible(f.bob)).toBe(0);
  });
  it("partage actif → visible par un ami, jamais par un non-ami ni par l'organisateur", async () => {
    await as(f.alice, (c) => c.query("INSERT INTO location_shares (owner_id, event_id, expires_at) VALUES ($1, $2, now() + interval '2 hours')", [f.alice, f.eventA]));
    expect(await visible(f.bob)).toBe(1);
    expect(await visible(f.carol)).toBe(0);
    expect(await count(f.managerA, 'SELECT 1 FROM live_positions', [], f.orgA)).toBe(0);
    expect(await count(f.managerA, 'SELECT 1 FROM position_fixes', [], f.orgA)).toBe(0);
  });
  it("arrêt du partage → invisible immédiatement", async () => {
    await as(f.alice, (c) => c.query('UPDATE location_shares SET revoked_at = now() WHERE owner_id = $1', [f.alice]));
    expect(await visible(f.bob)).toBe(0);
  });
  it("partage expiré → invisible", async () => {
    await as(f.alice, (c) => c.query("INSERT INTO location_shares (owner_id, starts_at, expires_at) VALUES ($1, now() - interval '3 hours', now() - interval '1 minute')", [f.alice]));
    expect(await visible(f.bob)).toBe(0);
  });
  it("retrait du consentement → invisible même avec un partage en cours", async () => {
    await as(f.alice, (c) => c.query("INSERT INTO location_shares (owner_id, expires_at) VALUES ($1, now() + interval '1 hour')", [f.alice]));
    expect(await visible(f.bob)).toBe(1);
    await as(f.alice, (c) => c.query("UPDATE consents SET withdrawn_at = now() WHERE user_id = $1 AND purpose = 'location_friends'", [f.alice]));
    expect(await visible(f.bob)).toBe(0);
  });
  it("partage ciblé : seul l'ami désigné voit", async () => {
    await consent(f.alice, 'location_friends');
    await makeFriends(f.alice, f.carol);
    await as(f.alice, (c) => c.query('UPDATE location_shares SET revoked_at = now() WHERE owner_id = $1', [f.alice]));
    await as(f.alice, (c) => c.query("INSERT INTO location_shares (owner_id, audience_user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')", [f.alice, f.carol]));
    expect(await visible(f.carol)).toBe(1);
    expect(await visible(f.bob)).toBe(0);
  });
  it("on ne peut pas publier la position de quelqu'un d'autre", async () => {
    await expect(publish(f.bob, f.eventA, 1, 0, 0).then(() =>
      as(f.bob, (c) => c.query("UPDATE live_positions SET pos = ST_MakePoint(0,0) WHERE user_id = $1 RETURNING 1", [f.alice])))).resolves.toMatchObject({ rowCount: 0 });
  });
  it("une position plus ancienne (séquence inférieure) n'écrase pas la plus récente", async () => {
    await publish(f.alice, f.eventA, 10, 5, 5);
    await publish(f.alice, f.eventA, 9, 9, 9);
    const x = await as(f.alice, async (c) => (await c.query('SELECT ST_X(pos) AS x, seq FROM live_positions WHERE user_id = $1', [f.alice])).rows[0]);
    expect(Number(x.seq)).toBe(10);
    expect(x.x).toBe(5);
  });
  it("l'établissement d'une position est imposé par l'événement, pas par le téléphone", async () => {
    await as(f.bob, (c) => c.query(
      "INSERT INTO position_fixes (user_id, event_id, organization_id, measured_at, floor_id, pos, r68) VALUES ($1, $2, $3, now(), 'L0', ST_MakePoint(1,1), 3)",
      [f.bob, f.eventB, f.orgA]));
    const org = await withSystem(pool, async (c) => (await c.query('SELECT organization_id FROM position_fixes WHERE user_id = $1', [f.bob])).rows[0].organization_id);
    expect(org).toBe(f.orgB);
  });
});

describe('indicateurs organisateur (k-anonymat, couverture, consentement)', () => {
  it("masque les zones de moins de 5 personnes et n'inclut que les consentants", async () => {
    const users = await withSystem(pool, async (c) => {
      const ids: string[] = [];
      for (let i = 0; i < 7; i++) {
        ids.push((await c.query("INSERT INTO users (tenant_id, display_name) VALUES ($1, $2) RETURNING id", [f.tenant, `V${i}`])).rows[0].id);
      }
      return ids;
    });
    // 4 consentants dans le bar
    for (const u of users.slice(0, 4)) await consent(u, 'location_venue_stats');
    for (const u of users) {
      await as(u, (c) => c.query(
        "INSERT INTO position_fixes (user_id, event_id, organization_id, measured_at, floor_id, pos, r68, zone_key) VALUES ($1, $2, $3, now(), 'L0', ST_MakePoint(2,2), 3, 'bar')",
        [u, f.eventA, f.orgA]));
    }
    const q = () => as(f.managerA, async (c) => (await c.query('SELECT * FROM app.zone_occupancy($1)', [f.eventA])).rows, f.orgA);
    let rows = await q();
    const bar = rows.find((r) => r.zone_key === 'bar')!;
    expect(bar.devices).toBeNull();
    expect(bar.devices_masked).toBe(true);
    expect(bar.located_total).toBe(4);
    expect(bar.expected_attendance).toBe(800);
    await consent(users[4], 'location_venue_stats');
    await as(users[4], (c) => c.query(
      "INSERT INTO position_fixes (user_id, event_id, organization_id, measured_at, floor_id, pos, r68, zone_key) VALUES ($1, $2, $3, now() + interval '1 second', 'L0', ST_MakePoint(2,2), 3, 'bar')",
      [users[4], f.eventA, f.orgA]));
    rows = await q();
    expect(rows.find((r) => r.zone_key === 'bar')!.devices).toBe(5);
  });
  it("un autre établissement ne peut pas interroger ces indicateurs", async () => {
    await expect(as(f.managerB, (c) => c.query('SELECT * FROM app.zone_occupancy($1)', [f.eventA]), f.orgB)).rejects.toThrow(/refusé/);
    await expect(as(f.managerB, (c) => c.query('SELECT * FROM app.zone_occupancy($1)', [f.eventA]), f.orgA)).rejects.toThrow(/refusé/);
  });
});

describe('incidents', () => {
  it("un visiteur signale ; seul le staff de l'établissement voit et traite", async () => {
    await as(f.carol, (c) => c.query(
      "INSERT INTO incidents (event_id, organization_id, category, priority, reported_by, client_id) VALUES ($1, $2, 'medical', 'critical', $3, 'c-1')",
      [f.eventA, f.orgA, f.carol]));
    await expect(as(f.carol, (c) => c.query(
      "INSERT INTO incidents (event_id, organization_id, category, priority, reported_by, client_id, status) VALUES ($1, $2, 'other', 'info', $3, 'c-2', 'resolved')",
      [f.eventA, f.orgA, f.carol]))).rejects.toThrow();
    expect(await count(f.managerA, 'SELECT 1 FROM incidents', [], f.orgA)).toBe(1);
    expect(await count(f.managerB, 'SELECT 1 FROM incidents', [], f.orgB)).toBe(0);
    expect(await count(f.carol, "UPDATE incidents SET status = 'resolved' RETURNING 1")).toBe(0);
  });
  it("un signalement rejoué après coupure réseau n'est créé qu'une fois", async () => {
    const ins = () => as(f.carol, (c) => c.query(
      "INSERT INTO incidents (event_id, organization_id, category, priority, reported_by, client_id) VALUES ($1, $2, 'crowd', 'high', $3, 'c-3') ON CONFLICT (event_id, client_id) DO NOTHING",
      [f.eventA, f.orgA, f.carol]));
    await ins();
    await ins();
    expect(await count(f.managerA, "SELECT 1 FROM incidents WHERE client_id = 'c-3'", [], f.orgA)).toBe(1);
  });
});

describe('RGPD', () => {
  it("purge des positions brutes au-delà de la durée de conservation", async () => {
    await withSystem(pool, (c) => c.query(
      "INSERT INTO position_fixes (user_id, event_id, organization_id, measured_at, floor_id, pos, r68) VALUES ($1, $2, $3, now() - interval '30 days', 'L0', ST_MakePoint(0,0), 3)",
      [f.carol, f.eventA, f.orgA]));
    const n = await withSystem(pool, async (c) => Number((await c.query("SELECT app.purge_positions(interval '7 days') AS n")).rows[0].n));
    expect(n).toBeGreaterThanOrEqual(1);
    expect(await withSystem(pool, async (c) => (await c.query("SELECT 1 FROM position_fixes WHERE measured_at < now() - interval '7 days'")).rowCount)).toBe(0);
  });
  it("export de ses données puis suppression effective du compte", async () => {
    const exp = await as(f.bob, async (c) => (await c.query('SELECT app.export_my_data() AS d')).rows[0].d);
    expect(exp.profile.display_name).toBe('Bob');
    expect(exp.profile.auth_subject).toBeUndefined();
    expect(Array.isArray(exp.positions)).toBe(true);
    await as(f.bob, (c) => c.query('SELECT app.delete_my_account()'));
    const left = await withSystem(pool, async (c) => (await c.query(
      'SELECT (SELECT count(*) FROM users WHERE id = $1) + (SELECT count(*) FROM position_fixes WHERE user_id = $1) + (SELECT count(*) FROM live_positions WHERE user_id = $1) + (SELECT count(*) FROM friendships WHERE $1 IN (user_a, user_b)) AS n',
      [f.bob])).rows[0].n);
    expect(Number(left)).toBe(0);
  });
});
