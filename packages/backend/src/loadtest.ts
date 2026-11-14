/**
 * Test de charge de la passerelle temps réel.
 * Usage : TEST_DATABASE_URL=... tsx src/loadtest.ts <clients> <durée_s> [taille_groupe]
 *
 * Simule des visiteurs en groupes d'amis (cliques), tous en partage actif, publiant une position
 * toutes les ~1,5 s. Mesure la latence capteur → écran d'un ami (même horloge machine), le débit
 * et les pertes. Les clients tournent dans le même processus que le générateur : sur une seule
 * machine, ce sont souvent eux le goulot — le résultat est une borne basse de la capacité serveur.
 */
import { cpus } from 'node:os';
import pg from 'pg';
import { WebSocket } from 'ws';
import { createPool, migrate, withSystem } from './db';
import { Gateway, issueToken, ServerMsg } from './gateway';

const N = Number(process.argv[2] ?? 500);
const DURATION = Number(process.argv[3] ?? 30);
const GROUP = Number(process.argv[4] ?? 4);
const BASE = process.env.TEST_DATABASE_URL ?? 'postgres://oneera@127.0.0.1:55432/postgres';
const DB = 'oneera_loadtest';

async function main() {
  const admin = new pg.Client({ connectionString: BASE });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${DB}`);
  await admin.end();
  const url = new URL(BASE);
  url.pathname = `/${DB}`;
  const pool = createPool(url.toString(), 20);
  await migrate(pool);

  // Données : un événement, N visiteurs en cliques, consentement + partage actifs.
  const { eventId, users } = await withSystem(pool, async (c) => {
    const one = async (q: string, a: unknown[] = []) => (await c.query(q, a)).rows[0].id as string;
    const tenant = await one("INSERT INTO tenants (slug, name) VALUES ('oneera','ONEERA') RETURNING id");
    const org = await one("INSERT INTO organizations (tenant_id, name) VALUES ($1,'Club charge') RETURNING id", [tenant]);
    const venue = await one("INSERT INTO venues (organization_id, name, kind) VALUES ($1,'Club','club') RETURNING id", [org]);
    const map = await one("INSERT INTO venue_maps (venue_id, organization_id, version, definition, published_at) VALUES ($1,$2,1,'{}',now()) RETURNING id", [venue, org]);
    const eventId = await one("INSERT INTO events (venue_id, organization_id, map_id, name, during) VALUES ($1,$2,$3,'Soirée',tstzrange(now()-interval '1 hour', now()+interval '6 hours')) RETURNING id", [venue, org, map]);
    const users = (await c.query("SELECT gen_random_uuid() AS id FROM generate_series(1, $1)", [N])).rows.map((r) => r.id as string);
    await c.query("INSERT INTO users (id, tenant_id, display_name) SELECT u, $2, 'v' FROM unnest($1::uuid[]) u", [users, tenant]);
    await c.query("INSERT INTO consents (user_id, purpose, policy_version) SELECT u, 'location_friends', 'load' FROM unnest($1::uuid[]) u", [users]);
    await c.query("INSERT INTO location_shares (owner_id, event_id, expires_at) SELECT u, $2, now() + interval '6 hours' FROM unnest($1::uuid[]) u", [users, eventId]);
    const pairs: [string, string][] = [];
    for (let g = 0; g < N; g += GROUP) {
      const grp = users.slice(g, g + GROUP);
      for (let i = 0; i < grp.length; i++) for (let j = i + 1; j < grp.length; j++) pairs.push(grp[i] < grp[j] ? [grp[i], grp[j]] : [grp[j], grp[i]]);
    }
    await c.query("INSERT INTO friendships (user_a, user_b, status, requested_by) SELECT a, b, 'accepted', a FROM unnest($1::uuid[], $2::uuid[]) AS t(a, b)",
      [pairs.map((p) => p[0]), pairs.map((p) => p[1])]);
    return { eventId, users };
  });

  const secret = new TextEncoder().encode('loadtest-secret-0123456789-abcdef');
  const gw = new Gateway({ pool, listenUrl: url.toString(), secret, maxRate: 3, flushMs: 300 });
  const port = await gw.listen(0);

  const latencies: number[] = [];
  let sent = 0;
  let received = 0;
  const clients: WebSocket[] = [];
  const t0 = Date.now();
  for (const u of users) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/rt?token=${await issueToken(secret, u, eventId)}`);
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString()) as ServerMsg;
      if (m.type === 'friend') {
        received++;
        if (Date.now() - t0 > 5000) latencies.push(Date.now() - m.pos.t);
      }
    });
    clients.push(ws);
  }
  await Promise.all(clients.map((ws) => new Promise((r) => (ws.readyState === WebSocket.OPEN ? r(null) : ws.once('open', r)))));
  console.log(`${N} clients connectés en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  const seqs = new Array(N).fill(0);
  const timers = clients.map((ws, i) => setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'pos', seq: ++seqs[i], t: Date.now(), floorId: 'L0', x: Math.random() * 40, y: Math.random() * 30, r68: 3, quality: 'precise' }));
    sent++;
  }, 1500 + Math.random() * 200));

  const cpu0 = process.cpuUsage();
  await new Promise((r) => setTimeout(r, DURATION * 1000));
  timers.forEach(clearInterval);
  await new Promise((r) => setTimeout(r, 1000));
  const cpu = process.cpuUsage(cpu0);
  const rows = (await pool.query('SELECT count(*)::int AS n FROM position_fixes')).rows[0].n;

  latencies.sort((a, b) => a - b);
  const q = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))];
  const expected = sent * (GROUP - 1);
  const report = {
    clients: N, groupSize: GROUP, durationS: DURATION, machineCpus: cpus().length,
    msgsInPerS: +(sent / DURATION).toFixed(0),
    deliveredPerS: +(received / DURATION).toFixed(0),
    deliveryRatio: +(received / Math.max(1, expected)).toFixed(3),
    latencyMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: latencies.at(-1) },
    persistedFixes: rows,
    processCpuPct: +(((cpu.user + cpu.system) / 1000 / (DURATION * 1000)) * 100).toFixed(0),
    gateway: gw.stats,
  };
  console.log(JSON.stringify(report, null, 2));
  clients.forEach((ws) => ws.terminate());
  await gw.close();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
