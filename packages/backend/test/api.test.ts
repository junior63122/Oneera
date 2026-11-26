import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createApi, hashPassword, verifyPassword } from '../src/api';
import { Pool } from '../src/db';
import { Gateway, ServerMsg } from '../src/gateway';
import { freshDb, TEST_URL } from './helpers';

const DB = 'oneera_test_api';
const secret = new TextEncoder().encode('test-secret-not-for-production-0123456789');
let pool: Pool;
let gw: Gateway;
let base: string;

beforeAll(async () => {
  pool = await freshDb(DB);
  const url = new URL(TEST_URL);
  url.pathname = `/${DB}`;
  gw = new Gateway({ pool, listenUrl: url.toString(), secret, maxRate: 5, flushMs: 100, pingMs: 1000, offlineGraceMs: 300, http: createApi({ pool, secret }) });
  base = `http://127.0.0.1:${await gw.listen(0)}`;
});
afterAll(async () => { await gw?.close(); await pool?.end(); });

async function call(method: string, path: string, body?: unknown, token?: string) {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: (await r.json()) as Record<string, any> };
}

describe('API comptes et amis', () => {
  it('hache les mots de passe (jamais en clair, vérification correcte)', async () => {
    const h = await hashPassword('motdepasse123');
    expect(h).not.toContain('motdepasse123');
    expect(await verifyPassword('motdepasse123', h)).toBe(true);
    expect(await verifyPassword('mauvais', h)).toBe(false);
  });

  it('parcours complet : 2 comptes, amis par code, partage, position reçue par l’ami', async () => {
    const a = await call('POST', '/v1/auth/signup', { email: 'lea@test.fr', password: 'secret123', displayName: 'Léa', avatar: { g: 'f', hair: 'waves' }, locationConsent: true });
    expect(a.status).toBe(200);
    expect(a.json.user.displayName).toBe('Léa');
    expect((await call('POST', '/v1/auth/signup', { email: 'LEA@test.fr', password: 'secret123', displayName: 'X' })).status).toBe(409);
    expect((await call('POST', '/v1/auth/login', { email: 'lea@test.fr', password: 'faux-mdp' })).status).toBe(401);
    const b = await call('POST', '/v1/auth/signup', { email: 'tom@test.fr', password: 'secret456', displayName: 'Tom', locationConsent: true });
    const ta = a.json.token as string, tb = b.json.token as string;
    const login = await call('POST', '/v1/auth/login', { email: 'tom@test.fr', password: 'secret456' });
    expect(login.status).toBe(200);

    // Léa crée un code, Tom le saisit → amis des deux côtés.
    const inv = await call('POST', '/v1/invites', {}, ta);
    expect(inv.json.code).toMatch(/^[A-Z2-9]{6}$/);
    const acc = await call('POST', '/v1/invites/accept', { code: inv.json.code.toLowerCase() }, tb);
    expect(acc.json.friend.displayName).toBe('Léa');
    expect((await call('GET', '/v1/friends', undefined, ta)).json.friends.map((f: any) => f.displayName)).toEqual(['Tom']);
    expect((await call('POST', '/v1/invites/accept', { code: inv.json.code }, tb)).status).toBe(400); // usage unique

    // Profil : avatar mis à jour, visible par l'ami.
    await call('PATCH', '/v1/me', { avatar: { g: 'f', hair: 'curls' } }, ta);
    expect((await call('GET', '/v1/friends', undefined, tb)).json.friends[0].avatar.hair).toBe('curls');

    // Partage + temps réel : Tom reçoit la position de Léa.
    await call('POST', '/v1/share', { hours: 2 }, ta);
    const ev = await call('GET', '/v1/events/BDF-DEMO');
    expect(ev.status).toBe(200);
    const wsA = (await call('POST', '/v1/realtime-token', { eventId: ev.json.id }, ta)).json.token;
    const wsB = (await call('POST', '/v1/realtime-token', { eventId: ev.json.id }, tb)).json.token;
    const port = new URL(base).port;
    const open = (tok: string) => new Promise<{ ws: WebSocket; msgs: ServerMsg[] }>((r, j) => { const ws = new WebSocket(`ws://127.0.0.1:${port}/rt?token=${tok}`); const msgs: ServerMsg[] = []; ws.on('message', (d) => msgs.push(JSON.parse(d.toString()))); ws.once('open', () => r({ ws, msgs })); ws.once('error', j); });
    const B = await open(wsB);
    const A = await open(wsA);
    await new Promise((r) => setTimeout(r, 200));
    A.ws.send(JSON.stringify({ type: 'pos', seq: 1, t: Date.now(), floorId: 'L0', x: 42.5, y: 61.2, r68: 3, quality: 'precise' }));
    const t0 = Date.now();
    while (!B.msgs.some((m) => m.type === 'friend') && Date.now() - t0 < 3000) await new Promise((r) => setTimeout(r, 20));
    const m = B.msgs.find((x) => x.type === 'friend');
    expect(m && m.type === 'friend' && m.pos.x).toBe(42.5);
    expect(B.msgs.some((x) => x.type === 'presence' && x.online)).toBe(true);

    // Arrêt du partage : Tom est prévenu.
    await call('DELETE', '/v1/share', undefined, ta);
    const t1 = Date.now();
    while (!B.msgs.some((x) => x.type === 'gone') && Date.now() - t1 < 3000) await new Promise((r) => setTimeout(r, 20));
    expect(B.msgs.some((x) => x.type === 'gone')).toBe(true);
    A.ws.close(); B.ws.close();

    // Suppression du compte : le jeton ne marche plus.
    expect((await call('DELETE', '/v1/me', undefined, tb)).status).toBe(200);
    expect((await call('GET', '/v1/me', undefined, tb)).status).toBe(401);
  });

  it('refuse les requêtes sans jeton et limite les tentatives de connexion', async () => {
    expect((await call('GET', '/v1/friends')).status).toBe(401);
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await call('POST', '/v1/auth/login', { email: 'x@y.fr', password: 'nopenope' })).status;
    expect(last).toBe(429);
  });
});
