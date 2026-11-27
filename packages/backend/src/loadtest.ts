/**
 * Test de charge de la passerelle temps réel.
 * Usage : TEST_DATABASE_URL=... tsx src/loadtest.ts <clients> <durée_s> [taille_groupe]
 *
 * Simule des visiteurs en groupes d'amis (cliques), tous en partage actif, publiant une position
 * toutes les ~1,5 s. Mesure la latence capteur → écran d'un ami (même horloge machine), le débit
 * et les pertes. Les clients tournent dans le même processus que le générateur : sur une seule
 * machine, ce sont souvent eux le goulot — le résultat est une borne basse de la capacité serveur.
 */
import { fork } from 'node:child_process';
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

const WORKERS = Number(process.env.WORKERS ?? 0);
const secretKey = new TextEncoder().encode('loadtest-secret-0123456789-abcdef');

/** Processus « téléphones » : connecte sa tranche d'utilisateurs, publie, mesure, renvoie ses chiffres. */
async function clientWorker() {
  const { port, eventId, duration, rate } = JSON.parse(process.env.LT_JOB!) as { port: number; eventId: string; duration: number; rate: number };
  // la liste des utilisateurs arrive par message (une variable d'environnement est limitée à quelques centaines de Ko)
  const users = await new Promise<string[]>((r) => process.once('message', (m: { type: string; users: string[] }) => m.type === 'users' && r(m.users)));
  const lat: number[] = []; let sent = 0, received = 0, retries = 0, failed = 0; const t0 = Date.now();
  const clients: (WebSocket | undefined)[] = new Array(users.length);
  const onMsg = (d: unknown) => { const m = JSON.parse(String(d)) as ServerMsg; if (m.type === 'friend') { received++; if (Date.now() - t0 > 5000) lat.push(Date.now() - m.pos.t); } };
  const connect = (i: number, attempt = 0): Promise<void> => new Promise((resolve) => {
    void issueToken(secretKey, users[i], eventId).then((tok) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/rt?token=${tok}`);
      ws.on('message', onMsg); ws.on('error', () => {});
      ws.once('open', () => { clients[i] = ws; resolve(); });
      ws.once('close', () => { if (clients[i] === ws) return; if (attempt >= 4) { failed++; resolve(); return; } retries++; setTimeout(() => void connect(i, attempt + 1).then(resolve), [1000, 2000, 5000, 5000][attempt]); });
    });
  });
  const pend: Promise<void>[] = [];
  for (let i = 0; i < users.length; i++) { pend.push(connect(i)); if (i % rate === rate - 1) await new Promise((r) => setTimeout(r, 1000)); }
  await Promise.all(pend);
  process.send!({ type: 'ready', connectS: (Date.now() - t0) / 1000 });
  await new Promise((r) => process.once('message', r)); // départ synchronisé
  const t1 = Date.now(); const seqs = new Array(users.length).fill(0);
  const timers = clients.map((ws, i) => setInterval(() => { if (!ws || ws.readyState !== WebSocket.OPEN) return; ws.send(JSON.stringify({ type: 'pos', seq: ++seqs[i], t: Date.now(), floorId: 'L0', x: Math.random() * 40, y: Math.random() * 30, r68: 3, quality: 'precise' })); sent++; }, 1500 + Math.random() * 200));
  await new Promise((r) => setTimeout(r, duration * 1000)); timers.forEach(clearInterval); await new Promise((r) => setTimeout(r, 1500));
  process.send!({ type: 'done', sent, received, retries, failed, lat, sinceStart: t1 - t0 });
  clients.forEach((ws) => ws?.terminate()); setTimeout(() => process.exit(0), 200);
}

async function main() {
  if (process.env.LT_JOB) return clientWorker();
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
    const tenant = await one("INSERT INTO tenants (slug, name) VALUES ('oneera','ONEERA') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id");
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

  const secret = secretKey;
  const gw = new Gateway({ pool, listenUrl: url.toString(), secret, maxRate: 3, flushMs: 300 });
  const port = await gw.listen(0);

  const latencies: number[] = [];
  let sent = 0;
  let received = 0;
  if (WORKERS > 0) {
    const cpu0 = process.cpuUsage(); const slices = Array.from({ length: WORKERS }, (_, k) => users.filter((_, i) => i % WORKERS === k));
    const RATE = Number(process.env.RATE ?? 500);
    const kids = slices.map((sl) => fork(process.argv[1], process.argv.slice(2), { env: { ...process.env, LT_JOB: JSON.stringify({ port, eventId, duration: DURATION, rate: Math.max(1, Math.round(RATE / WORKERS)) }) }, execArgv: process.execArgv, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] }));
    kids.forEach((k, i) => k.send({ type: 'users', users: slices[i] }));
    kids.forEach((k, i) => k.on('exit', (code) => { if (code) { console.error(`processus téléphones ${i} arrêté (code ${code})`); process.exit(1); } }));
    console.log(`argv1=${process.argv[1]} execArgv=${JSON.stringify(process.execArgv)}`);
    const ready = await Promise.all(kids.map((k) => new Promise<{ connectS: number }>((r) => k.on('message', (m: { type: string; connectS: number }) => m.type === 'ready' && r(m)))));
    const done = kids.map((k) => new Promise<{ sent: number; received: number; retries: number; failed: number; lat: number[] }>((r) => k.on('message', (m: any) => m.type === 'done' && r(m))));
    const c1 = process.cpuUsage(cpu0); const cpuStart = process.cpuUsage();
    kids.forEach((k) => k.send('go'));
    const res = await Promise.all(done); const cpu = process.cpuUsage(cpuStart);
    const lat = res.flatMap((r) => r.lat).sort((a, b) => a - b); const q = (p: number) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
    const sentT = res.reduce((a, r) => a + r.sent, 0), recT = res.reduce((a, r) => a + r.received, 0), failedT = res.reduce((a, r) => a + r.failed, 0);
    const rows = (await pool.query('SELECT count(*)::int AS n FROM position_fixes')).rows[0].n;
    console.log(JSON.stringify({ mode: `serveur seul dans ce processus, téléphones dans ${WORKERS} processus`, clients: N, connected: N - failedT, retries: res.reduce((a, r) => a + r.retries, 0), connectS: Math.max(...ready.map((r) => r.connectS)), groupSize: GROUP, durationS: DURATION, machineCpus: cpus().length,
      msgsInPerS: +(sentT / DURATION).toFixed(0), deliveredPerS: +(recT / DURATION).toFixed(0), deliveryRatio: +(recT / Math.max(1, sentT * (GROUP - 1))).toFixed(3),
      latencyMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: lat.at(-1) }, persistedFixes: rows,
      serverCpuPctDuringRun: +(((cpu.user + cpu.system) / 1000 / (DURATION * 1000)) * 100).toFixed(0), serverCpuConnectS: +((c1.user + c1.system) / 1e6).toFixed(1), gateway: gw.stats }, null, 2));
    await gw.close(); await pool.end(); return;
  }
  const clients: WebSocket[] = new Array(N);
  const t0 = Date.now();
  let retries = 0, failed = 0;
  const onMsg = (d: unknown) => {
    const m = JSON.parse(String(d)) as ServerMsg;
    if (m.type === 'friend') { received++; if (Date.now() - t0 > 5000) latencies.push(Date.now() - m.pos.t); }
  };
  // Comme l'app : en cas de refus, nouvel essai après 1, 2, 5 s (5 essais max).
  const connect = (i: number, attempt = 0): Promise<void> => new Promise((resolve) => {
    void issueToken(secret, users[i], eventId).then((tok) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/rt?token=${tok}`);
      ws.on('message', onMsg);
      ws.once('open', () => { clients[i] = ws; resolve(); });
      ws.on('error', () => { /* géré par close */ });
      ws.once('close', () => { if (clients[i] === ws) return; if (attempt >= 4) { failed++; resolve(); return; } retries++; setTimeout(() => void connect(i, attempt + 1).then(resolve), [1000, 2000, 5000, 5000][attempt]); });
    });
  });
  // Arrivées étalées (RATE connexions/s), comme un public qui entre dans le lieu.
  const RATE = Number(process.env.RATE ?? 500);
  const pending: Promise<void>[] = [];
  for (let i = 0; i < N; i++) { pending.push(connect(i)); if (i % RATE === RATE - 1) await new Promise((r) => setTimeout(r, 1000)); }
  await Promise.all(pending);
  console.log(`${N - failed} / ${N} clients connectés en ${((Date.now() - t0) / 1000).toFixed(1)} s (${retries} nouvelles tentatives, ${failed} échecs)`);

  const seqs = new Array(N).fill(0);
  const timers = clients.map((ws, i) => setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
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
    clients: N, connected: N - failed, retries, groupSize: GROUP, durationS: DURATION, machineCpus: cpus().length,
    msgsInPerS: +(sent / DURATION).toFixed(0),
    deliveredPerS: +(received / DURATION).toFixed(0),
    deliveryRatio: +(received / Math.max(1, expected)).toFixed(3),
    latencyMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: latencies.at(-1) },
    persistedFixes: rows,
    processCpuPct: +(((cpu.user + cpu.system) / 1000 / (DURATION * 1000)) * 100).toFixed(0),
    gateway: gw.stats,
  };
  console.log(JSON.stringify(report, null, 2));
  clients.forEach((ws) => ws?.terminate());
  await gw.close();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
