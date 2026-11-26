import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createApi } from '../src/api';
import { Pool } from '../src/db';
import { Gateway, ServerMsg } from '../src/gateway';
import { freshDb, TEST_URL } from './helpers';

const DB = 'oneera_test_messages';
const secret = new TextEncoder().encode('test-secret-not-for-production-0123456789');
let pool: Pool, gw: Gateway, base: string;
beforeAll(async () => {
  pool = await freshDb(DB);
  const url = new URL(TEST_URL); url.pathname = `/${DB}`;
  gw = new Gateway({ pool, listenUrl: url.toString(), secret, http: createApi({ pool, secret }) });
  base = `http://127.0.0.1:${await gw.listen(0)}`;
});
afterAll(async () => { await gw?.close(); await pool?.end(); });
const call = async (m: string, path: string, body?: unknown, tok?: string) => { const r = await fetch(base + path, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, json: (await r.json()) as Record<string, any> }; };
const signup = async (email: string, name: string) => { const j = (await call('POST', '/v1/auth/signup', { email, password: 'motdepasse1', displayName: name })).json; return { tok: j.token as string, id: j.user.id as string }; };
const befriend = async (a: { tok: string }, b: { tok: string; id: string }, aId: string) => { await call('POST', '/v1/friends/requests', { userIds: [b.id] }, a.tok); await call('POST', `/v1/friends/${aId}/accept`, {}, b.tok); };
const wait = async (f: () => boolean, ms = 3000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 20)); return f(); };

describe('messagerie entre amis', () => {
  it('seuls des amis peuvent s’écrire ; fil, non-lus, lecture, livraison en direct', async () => {
    const lea = await signup('lea@m.fr', 'Léa'), tom = await signup('tom@m.fr', 'Tom'), eve = await signup('eve@m.fr', 'Ève');
    // Pas encore amis : refusé
    expect((await call('POST', '/v1/messages', { to: tom.id, body: 'salut' }, lea.tok)).status).toBe(403);
    await befriend(lea, tom, lea.id);
    // Tom écoute en direct
    const ev = await call('GET', '/v1/events/BDF-DEMO');
    const wsTok = (await call('POST', '/v1/realtime-token', { eventId: ev.json.id }, tom.tok)).json.token;
    const port = new URL(base).port; const msgs: ServerMsg[] = [];
    const ws = new WebSocket(`ws://127.0.0.1:${port}/rt?token=${wsTok}`); ws.on('message', (d) => msgs.push(JSON.parse(d.toString())));
    await new Promise((r) => ws.once('open', r));
    const t0 = Date.now();
    const s1 = await call('POST', '/v1/messages', { to: tom.id, body: 'On se retrouve où ? <script>alert(1)</script>' }, lea.tok);
    expect(s1.status).toBe(200);
    expect(await wait(() => msgs.some((m) => m.type === 'message'))).toBe(true);
    const live = msgs.find((m) => m.type === 'message') as Extract<ServerMsg, { type: 'message' }>;
    expect(live.message.from).toBe(lea.id); expect(live.message.body).toContain('On se retrouve');
    expect(Date.now() - t0).toBeLessThan(1500);
    // Position partagée et « rejoins-moi ici »
    expect((await call('POST', '/v1/messages', { to: lea.id, kind: 'loc', body: '📍 Ma position', loc: { x: 42.4, y: 61.9, floor: 'bdf', label: 'Bar <Ouest>' } }, tom.tok)).status).toBe(200);
    expect((await call('POST', '/v1/messages', { to: lea.id, kind: 'meet', body: 'Rejoins-moi ici', loc: { x: 150, y: 2 } }, tom.tok)).status).toBe(400);
    // Fil vu par Léa, dans l'ordre ; le libellé est nettoyé
    const th = (await call('GET', `/v1/messages/${tom.id}`, undefined, lea.tok)).json.messages;
    expect(th.map((m: any) => [m.mine, m.kind])).toEqual([[true, 'text'], [false, 'loc']]);
    expect(th[1].loc).toEqual({ x: 42.4, y: 61.9, floor: 'bdf', label: 'Bar Ouest' });
    // Non-lus et lecture
    let cv = (await call('GET', '/v1/conversations', undefined, lea.tok)).json.conversations;
    expect(cv).toHaveLength(1); expect(cv[0].unread).toBe(1); expect(cv[0].last.kind).toBe('loc');
    expect((await call('POST', `/v1/messages/${tom.id}/read`, {}, lea.tok)).json.read).toBe(1);
    cv = (await call('GET', '/v1/conversations', undefined, lea.tok)).json.conversations; expect(cv[0].unread).toBe(0);
    // Une tierce personne ne lit rien de ce fil et ne peut pas écrire
    expect((await call('GET', `/v1/messages/${tom.id}`, undefined, eve.tok)).json.messages).toEqual([]);
    expect((await call('GET', '/v1/conversations', undefined, eve.tok)).json.conversations).toEqual([]);
    expect((await call('POST', '/v1/messages', { to: lea.id, body: 'coucou' }, eve.tok)).status).toBe(403);
    // Après suppression de l'amitié : plus d'envoi possible
    await call('DELETE', `/v1/friends/${tom.id}`, undefined, lea.tok);
    expect((await call('POST', '/v1/messages', { to: tom.id, body: 'encore' }, lea.tok)).status).toBe(403);
    ws.close();
  });

  it('refuse les messages vides, trop longs, mal formés ou sans compte, et limite le débit', async () => {
    const a = await signup('a@m.fr', 'A'), b = await signup('b@m.fr', 'B');
    await befriend(a, b, a.id);
    expect((await call('POST', '/v1/messages', { to: b.id, body: 'x' })).status).toBe(401);
    for (const body of ['', '   ', 'x'.repeat(1001), 42, null]) expect((await call('POST', '/v1/messages', { to: b.id, body }, a.tok)).status).toBe(400);
    expect((await call('POST', '/v1/messages', { to: 'pas-un-id', body: 'x' }, a.tok)).status).toBe(400);
    expect((await call('POST', '/v1/messages', { to: a.id, body: 'à moi-même' }, a.tok)).status).toBe(403);
    expect((await call('GET', `/v1/messages/${b.id}?before=1;DROP TABLE users&limit=99999`, undefined, a.tok)).status).toBe(200);
    let last = 0; for (let i = 0; i < 45; i++) last = (await call('POST', '/v1/messages', { to: b.id, body: 'spam ' + i }, a.tok)).status;
    expect(last).toBe(429);
  });
});
