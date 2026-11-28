import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createApi } from '../src/api';
import { Pool, withSystem } from '../src/db';
import { Gateway, ServerMsg } from '../src/gateway';
import { rollupNow } from '../src/maintenance';
import { Fixture, freshDb, seed, TEST_URL } from './helpers';

/**
 * Exploitation réelle (migration 008) : signalements du public avec anti-spam, suivi par le staff,
 * invitations staff et révocation, statistiques minute par minute (k ≥ 5), alertes, programmation.
 */
const DB = 'oneera_test_ops';
const secret = new TextEncoder().encode('test-secret-not-for-production-0123456789');
let pool: Pool, gw: Gateway, base: string, fx: Fixture;

beforeAll(async () => {
  pool = await freshDb(DB);
  fx = await seed(pool);
  const url = new URL(TEST_URL); url.pathname = `/${DB}`;
  gw = new Gateway({ pool, listenUrl: url.toString(), secret, maxRate: 5, flushMs: 100, pingMs: 1000, offlineGraceMs: 300, http: createApi({ pool, secret, authPerMinute: 500 }) });
  base = `http://127.0.0.1:${await gw.listen(0)}`;
});
afterAll(async () => { await gw?.close(); await pool?.end(); });

async function call(method: string, path: string, body?: unknown, token?: string) {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: (await r.json()) as Record<string, any> };
}
let n = 0;
async function account(name: string) {
  const r = await call('POST', '/v1/auth/signup', { email: `u${++n}-${Date.now()}@ops.test`, password: 'secret123', displayName: name });
  expect(r.status).toBe(200);
  return { token: r.json.token as string, id: r.json.user.id as string };
}
const grant = (user: string, org: string, role: string) => withSystem(pool, (c) => c.query('INSERT INTO staff_memberships (user_id, organization_id, role) VALUES ($1, $2, $3) ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role, revoked_at = NULL', [user, org, role]));
const open = async (token: string, eventId: string) => {
  const tok = (await call('POST', '/v1/realtime-token', { eventId }, token)).json.token;
  return new Promise<{ ws: WebSocket; msgs: ServerMsg[] }>((r, j) => { const ws = new WebSocket(`ws://127.0.0.1:${new URL(base).port}/rt?token=${tok}`); const msgs: ServerMsg[] = []; ws.on('message', (d) => msgs.push(JSON.parse(d.toString()))); ws.once('open', () => r({ ws, msgs })); ws.once('error', j); });
};
const until = async (f: () => boolean, ms = 3000) => { const t = Date.now(); while (!f() && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 20)); return f(); };
const rid = () => 'c' + Math.random().toString(36).slice(2, 12);

describe('signalements du public → staff', () => {
  it('3 choix du cahier, staff prévenu en direct, suivi Reçue → En route → Sur place → Résolue', async () => {
    const boss = await account('Chef sécu'); await grant(boss.id, fx.orgA, 'security');
    const vis = await account('Visiteur');
    const S = await open(boss.token, fx.eventA), V = await open(vis.token, fx.eventA);
    await new Promise((r) => setTimeout(r, 150));

    const bad = await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'medical', clientId: rid() }, vis.token);
    expect(bad.status).toBe(400); // seuls les 3 choix du cahier (+ « autre ») sont proposés au public
    const r = await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'help', clientId: rid(), x: 40, y: 55, floor: 'L0', zone: 'bar', description: 'Personne au sol' }, vis.token);
    expect(r.status).toBe(200);
    expect(r.json.report).toMatchObject({ category: 'help', priority: 'critical', status: 'open', zone: 'bar', x: 40, y: 55, duplicate: false });
    const id = r.json.report.id;
    expect(await until(() => S.msgs.some((m) => m.type === 'incident' && m.id === id && m.isNew))).toBe(true);

    const list = await call('GET', `/v1/staff/events/${fx.eventA}/incidents?open=1`, undefined, boss.token);
    expect(list.json.incidents.map((i: any) => i.id)).toContain(id);

    for (const st of ['assigned', 'in_progress', 'resolved']) {
      const u = await call('POST', `/v1/staff/incidents/${id}/status`, { status: st, note: st === 'resolved' ? 'Pris en charge par la Croix-Rouge' : '' }, boss.token);
      expect(u.status).toBe(200);
      expect(u.json.incident.status).toBe(st);
      expect(await until(() => V.msgs.some((m) => m.type === 'report' && m.id === id && m.status === st))).toBe(true);
    }
    // Pas de retour en arrière.
    expect((await call('POST', `/v1/staff/incidents/${id}/status`, { status: 'assigned' }, boss.token)).status).toBe(409);
    const mine = await call('GET', `/v1/events/${fx.eventA}/reports/mine`, undefined, vis.token);
    expect(mine.json.reports[0].history.map((h: any) => h.status)).toEqual(['open', 'assigned', 'in_progress', 'resolved']);
    expect(mine.json.reports[0].firstResponseAt).not.toBeNull();
    expect(mine.json.reports[0].resolvedAt).not.toBeNull();
    S.ws.close(); V.ws.close();
  });

  it('anti-spam : pas de doublon en 3 min, 3 au plus en 10 min ; envoi différé idempotent', async () => {
    const vis = await account('Pressé');
    const cid = rid();
    const a = await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'crowd', clientId: cid }, vis.token);
    const again = await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'crowd', clientId: cid }, vis.token);
    expect(again.json.report).toMatchObject({ id: a.json.report.id, duplicate: true });
    const dup = await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'crowd', clientId: rid() }, vis.token);
    expect(dup.json.report).toMatchObject({ id: a.json.report.id, duplicate: true }); // même type en moins de 3 min
    expect((await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'lost_found', clientId: rid() }, vis.token)).json.report.duplicate).toBe(false);
    expect((await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'other', clientId: rid() }, vis.token)).json.report.duplicate).toBe(false);
    const fourth = await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'help', clientId: rid() }, vis.token);
    expect(fourth.status).toBe(429);
    expect(fourth.json.message).toContain('112');
    expect((await withSystem(pool, (c) => c.query('SELECT count(*)::int AS n FROM incidents WHERE reported_by = $1', [vis.id]))).rows[0].n).toBe(3);
  });

  it('cloisonnement : un visiteur ou le staff d’un autre établissement ne voit rien ; un analyste ne modifie rien', async () => {
    const vis = await account('Curieux');
    const other = await account('Staff B'); await grant(other.id, fx.orgB, 'manager');
    const analyst = await account('Analyste'); await grant(analyst.id, fx.orgA, 'analyst');
    const r = await call('POST', `/v1/events/${fx.eventA}/reports`, { category: 'other', clientId: rid() }, (await account('Témoin')).token);
    const id = r.json.report.id;
    expect((await call('GET', `/v1/staff/events/${fx.eventA}/incidents`, undefined, vis.token)).status).toBe(403);
    expect((await call('GET', `/v1/staff/events/${fx.eventA}/incidents`, undefined, other.token)).status).toBe(403);
    expect((await call('POST', `/v1/staff/incidents/${id}/status`, { status: 'assigned' }, other.token)).status).toBe(403);
    expect((await call('POST', `/v1/staff/incidents/${id}/status`, { status: 'assigned' }, analyst.token)).status).toBe(403);
    expect((await call('GET', `/v1/staff/events/${fx.eventA}/incidents`, undefined, analyst.token)).status).toBe(200);
    expect((await call('GET', `/v1/events/${fx.eventA}/reports/mine`, undefined, vis.token)).json.reports).toEqual([]);
    expect((await call('GET', `/v1/dashboard/events/${fx.eventA}/live`, undefined, vis.token)).status).toBe(403);
  });
});

describe('staff : invitations, rôles, révocation immédiate', () => {
  it('code sécurisé à rôle imposé, nombre d’utilisations, pas d’auto-attribution, révocation', async () => {
    const owner = await account('Directrice'); await grant(owner.id, fx.orgA, 'owner');
    const mgr = await account('Manager'); await grant(mgr.id, fx.orgA, 'manager');
    expect((await call('POST', `/v1/staff/orgs/${fx.orgA}/invites`, { role: 'manager' }, mgr.token)).status).toBe(403); // un manager ne nomme pas de manager
    const inv = await call('POST', `/v1/staff/orgs/${fx.orgA}/invites`, { role: 'security', hours: 24, maxUses: 2 }, mgr.token);
    expect(inv.status).toBe(200);
    expect(inv.json.invite.code).toMatch(/^[0-9A-F]{12}$/);
    const code = inv.json.invite.code;
    const s1 = await account('Agent 1'), s2 = await account('Agent 2'), s3 = await account('Agent 3');
    expect((await call('POST', '/v1/staff/join', { code: code.toLowerCase() }, s1.token)).json).toMatchObject({ role: 'security', already: false });
    expect((await call('POST', '/v1/staff/join', { code }, s2.token)).status).toBe(200);
    expect((await call('POST', '/v1/staff/join', { code }, s3.token)).status).toBe(400); // 2 utilisations maximum
    expect((await call('GET', '/v1/staff/me', undefined, s1.token)).json.organizations).toEqual([{ id: fx.orgA, name: 'Club A', role: 'security' }]);
    expect((await call('GET', `/v1/staff/orgs/${fx.orgA}/members`, undefined, s1.token)).status).toBe(403);
    const members = (await call('GET', `/v1/staff/orgs/${fx.orgA}/members`, undefined, mgr.token)).json.members;
    expect(members.some((m: any) => m.id === s1.id && m.role === 'security' && m.active)).toBe(true);

    expect((await call('GET', `/v1/staff/events/${fx.eventA}/incidents`, undefined, s1.token)).status).toBe(200);
    expect((await call('PATCH', `/v1/staff/orgs/${fx.orgA}/members/${owner.id}`, { active: false }, mgr.token)).status).toBe(403); // le manager ne touche pas au propriétaire
    expect((await call('PATCH', `/v1/staff/orgs/${fx.orgA}/members/${s1.id}`, { active: false }, mgr.token)).json.member.active).toBe(false);
    expect((await call('GET', `/v1/staff/events/${fx.eventA}/incidents`, undefined, s1.token)).status).toBe(403); // effet immédiat
    expect((await call('PATCH', `/v1/staff/orgs/${fx.orgA}/members/${mgr.id}`, { role: 'staff' }, owner.token)).json.member.role).toBe('staff');
    const audit = (await withSystem(pool, (c) => c.query("SELECT action FROM audit_log WHERE organization_id = $1 AND action LIKE 'staff.%' ORDER BY id", [fx.orgA]))).rows.map((r) => r.action);
    expect(audit).toEqual(expect.arrayContaining(['staff.invite', 'staff.join', 'staff.revoke', 'staff.update']));
  });
});

describe('tableau de bord : minutes agrégées, replay, flux, comparaison, alertes', () => {
  it('compte par zone et par minute, masque sous 5 personnes, flux zone → zone, alerte de densité', async () => {
    const mgr = await account('Régie'); await grant(mgr.id, fx.orgA, 'manager');
    const analyst = await account('Data'); await grant(analyst.id, fx.orgA, 'analyst');
    // 8 personnes consentantes au bar de t-20 à t-11 min, 6 d'entre elles passent à la piste ensuite ; 3 au vestiaire.
    const minute = (k: number) => new Date(Math.floor(Date.now() / 60_000) * 60_000 - k * 60_000);
    await withSystem(pool, async (c) => {
      const t = (await c.query("SELECT id FROM tenants WHERE slug = 'oneera'")).rows[0].id;
      const people: string[] = [];
      for (let i = 0; i < 11; i++) people.push((await c.query('INSERT INTO users (tenant_id, display_name, is_guest) VALUES ($1, $2, true) RETURNING id', [t, 'P' + i])).rows[0].id);
      for (const p of people) await c.query("INSERT INTO consents (user_id, purpose, policy_version) VALUES ($1, 'location_venue_stats', 't')", [p]);
      const fix = (u: string, at: Date, zone: string) => c.query("INSERT INTO position_fixes (user_id, event_id, organization_id, measured_at, floor_id, pos, r68, zone_key) VALUES ($1, $2, $3, $4, 'L0', ST_SetSRID(ST_MakePoint(5, 5), 0), 3, $5)", [u, fx.eventA, fx.orgA, at, zone]);
      for (let k = 20; k >= 2; k--) {
        for (let i = 0; i < 8; i++) await fix(people[i], new Date(+minute(k) + 10_000), k > 10 || i >= 6 ? 'bar' : 'piste');
        for (let i = 8; i < 11; i++) await fix(people[i], new Date(+minute(k) + 20_000), 'vestiaire');
      }
      await c.query("UPDATE zones SET capacity = 2 WHERE organization_id = $1 AND key = 'bar'", [fx.orgA]);
    });
    expect(await rollupNow(pool)).toBeGreaterThan(0);

    const from = minute(25).toISOString(), to = minute(0).toISOString();
    const tl = await call('GET', `/v1/dashboard/events/${fx.eventA}/timeline?from=${from}&to=${to}`, undefined, analyst.token);
    expect(tl.status).toBe(200);
    const at = (k: number, z: string) => tl.json.points.find((p: any) => +new Date(p.minute) === +minute(k) && p.zone === z);
    expect(at(15, 'bar')).toMatchObject({ devices: 8, masked: false });
    expect(at(5, 'piste')).toMatchObject({ devices: 6, masked: false });
    expect(at(5, 'bar')).toMatchObject({ devices: null, masked: true }); // 2 personnes : jamais montré
    expect(at(5, 'vestiaire')).toMatchObject({ devices: null, masked: true });

    const fl = await call('GET', `/v1/dashboard/events/${fx.eventA}/flows?from=${from}&to=${to}`, undefined, analyst.token);
    expect(fl.json.flows).toEqual([{ from: 'bar', to: 'piste', n: 6, masked: false }]);

    const cmp = await call('GET', `/v1/dashboard/events/${fx.eventA}/compare?aFrom=${minute(20).toISOString()}&aTo=${minute(10).toISOString()}&bFrom=${minute(10).toISOString()}&bTo=${to}`, undefined, mgr.token);
    const zA = cmp.json.a.zones.find((z: any) => z.zone === 'bar'), zB = cmp.json.b.zones.find((z: any) => z.zone === 'piste');
    expect(zA).toMatchObject({ peak: 8, name: 'Bar', capacity: 2, fill: 400 });
    expect(zB).toMatchObject({ peak: 6 });

    // Rejouable : un second calcul ne double rien.
    await withSystem(pool, (c) => c.query('SELECT app.rollup_minutes($1, $2, $3)', [fx.eventA, minute(30), minute(0)]));
    expect((await call('GET', `/v1/dashboard/events/${fx.eventA}/flows?from=${from}&to=${to}`, undefined, analyst.token)).json.flows[0].n).toBe(6);

    // Alerte flux anormal à t-9 (6 arrivées d'un coup à la piste) ; alerte densité au bar à t-11 (8 pour 2 places).
    const alerts = (await withSystem(pool, async (c) => {
      await c.query("SELECT set_config('app.user_id', $1, true)", [mgr.id]);
      return (await c.query('SELECT * FROM app.event_alerts($1, $2)', [fx.eventA, minute(10)])).rows;
    }));
    expect(alerts.some((a) => a.kind === 'flow' && a.zone_key === 'piste')).toBe(true);
    const dens = await withSystem(pool, async (c) => { await c.query("SELECT set_config('app.user_id', $1, true)", [mgr.id]); return (await c.query('SELECT * FROM app.event_alerts($1, $2)', [fx.eventA, minute(11)])).rows; });
    expect(dens.find((a) => a.kind === 'density')).toMatchObject({ level: 'critical', zone_key: 'bar' });

    const live = await call('GET', `/v1/dashboard/events/${fx.eventA}/live`, undefined, mgr.token);
    expect(live.status).toBe(200);
    expect(live.json.zones.find((z: any) => z.zone === 'piste')).toMatchObject({ peak: 6 });
    expect(Array.isArray(live.json.alerts)).toBe(true);
    expect((await call('GET', `/v1/dashboard/events/${fx.eventB}/live`, undefined, mgr.token)).status).toBe(403);
    expect((await call('GET', `/v1/dashboard/events/${fx.eventA}/timeline?from=2020-01-01T00:00:00Z&to=2026-01-01T00:00:00Z`, undefined, mgr.token)).status).toBe(400);
  });

  it('purge des positions brutes : les agrégats restent (replay possible des années après)', async () => {
    const mgr = await account('Archiviste'); await grant(mgr.id, fx.orgA, 'readonly');
    const before = (await withSystem(pool, (c) => c.query('SELECT count(*)::int AS n FROM zone_minute_stats WHERE event_id = $1', [fx.eventA]))).rows[0].n;
    await withSystem(pool, (c) => c.query("SELECT app.purge_positions(interval '0 seconds')"));
    expect((await withSystem(pool, (c) => c.query('SELECT count(*)::int AS n FROM position_fixes WHERE event_id = $1', [fx.eventA]))).rows[0].n).toBe(0);
    expect((await withSystem(pool, (c) => c.query('SELECT count(*)::int AS n FROM zone_minute_stats WHERE event_id = $1', [fx.eventA]))).rows[0].n).toBe(before);
    expect((await call('GET', `/v1/dashboard/events/${fx.eventA}/timeline`, undefined, mgr.token)).json.points.length).toBeGreaterThan(0);
  });
});

describe('programmation', () => {
  it('création par le staff, statut en direct, conflits d’horaires, annulation diffusée, lecture publique', async () => {
    const mgr = await account('Prog'); await grant(mgr.id, fx.orgA, 'manager');
    const sec = await account('Agent'); await grant(sec.id, fx.orgA, 'security');
    const vis = await account('Fan');
    const h = (k: number) => new Date(Date.now() + k * 3_600_000).toISOString();
    const a = await call('POST', `/v1/staff/events/${fx.eventA}/programme`, { title: 'DJ Nova', kind: 'dj', stage: 'main', startsAt: h(-0.5), endsAt: h(1) }, mgr.token);
    expect(a.status).toBe(200);
    expect(a.json.item.status).toBe('live');
    const b = await call('POST', `/v1/staff/events/${fx.eventA}/programme`, { title: 'Live Orchestra', kind: 'concert', stage: 'main', startsAt: h(0.5), endsAt: h(2) }, mgr.token);
    expect(b.json.item.status).toBe('upcoming');
    await call('POST', `/v1/staff/events/${fx.eventA}/programme`, { title: 'Feu d’artifice', kind: 'fireworks', stage: 'lac', startsAt: h(0.5), endsAt: h(0.7) }, mgr.token);
    expect((await call('POST', `/v1/staff/events/${fx.eventA}/programme`, { title: 'X', kind: 'dj', stage: 'main', startsAt: h(2), endsAt: h(1) }, mgr.token)).status).toBe(400);
    expect((await call('POST', `/v1/staff/events/${fx.eventA}/programme`, { title: 'Pirate', kind: 'dj', stage: 'main', startsAt: h(1), endsAt: h(2) }, vis.token)).status).toBe(403);
    expect((await call('POST', `/v1/staff/events/${fx.eventA}/programme`, { title: 'Pirate', kind: 'dj', stage: 'main', startsAt: h(1), endsAt: h(2) }, sec.token)).status).toBe(403);

    const conf = await call('GET', `/v1/staff/events/${fx.eventA}/programme/conflicts`, undefined, sec.token);
    expect(conf.json.conflicts).toEqual([{ a: expect.any(String), b: expect.any(String), stage: 'main', overlapMinutes: 30 }]);

    const V = await open(vis.token, fx.eventA); await new Promise((r) => setTimeout(r, 150));
    const upd = await call('PATCH', `/v1/staff/events/${fx.eventA}/programme/${b.json.item.id}`, { title: 'Live Orchestra', kind: 'concert', stage: 'main', startsAt: h(0.5), endsAt: h(2), cancelled: true }, mgr.token);
    expect(upd.json.item.status).toBe('cancelled');
    expect(await until(() => V.msgs.some((m) => m.type === 'refresh' && m.what === 'programme'))).toBe(true);
    expect((await call('GET', `/v1/staff/events/${fx.eventA}/programme/conflicts`, undefined, sec.token)).json.conflicts).toEqual([]);

    const pub = await call('GET', `/v1/events/${fx.eventA}/programme`, undefined, vis.token);
    expect(pub.json.items.map((i: any) => [i.title, i.status])).toEqual([['DJ Nova', 'live'], ['Feu d’artifice', 'upcoming'], ['Live Orchestra', 'cancelled']]);
    expect((await call('DELETE', `/v1/staff/events/${fx.eventA}/programme/${b.json.item.id}`, undefined, mgr.token)).json.deleted).toBe(true);
    expect((await call('GET', `/v1/events/${fx.eventA}/programme`, undefined, vis.token)).json.items).toHaveLength(2);
    expect((await call('GET', `/v1/events/${fx.eventB}/programme`, undefined, vis.token)).json.items).toEqual([]);
    V.ws.close();
  });
});
