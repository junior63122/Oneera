import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApi, normalizePhone, sha256 } from '../src/api';
import { Pool } from '../src/db';
import { Gateway } from '../src/gateway';
import { freshDb, TEST_URL } from './helpers';

const DB = 'oneera_test_contacts';
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
const signup = async (email: string, name: string) => (await call('POST', '/v1/auth/signup', { email, password: 'motdepasse1', displayName: name })).json.token as string;

describe('amis depuis les contacts', () => {
  it('normalise les numéros français et internationaux de la même façon', () => {
    for (const v of ['06 12 34 56 78', '06.12.34.56.78', '+33 6 12 34 56 78', '0033612345678', '+33 (0)6 12 34 56 78', '612345678']) expect(normalizePhone(v)).toBe('+33612345678');
    expect(normalizePhone('+377 6 12 34 56 78')).toBe('+377612345678');
    expect(normalizePhone('12')).toBeNull(); expect(normalizePhone('abc')).toBeNull();
  });

  it('retrouve les contacts inscrits (e-mail et téléphone), demande groupée, acceptation', async () => {
    const me = await signup('moi@test.fr', 'Moi');
    const lea = await signup('lea@test.fr', 'Léa');
    const tom = await signup('tom@test.fr', 'Tom');
    expect((await call('POST', '/v1/me/phone', { phone: '06 11 22 33 44' }, tom)).json.phoneSet).toBe(true);
    // Mes contacts : l'e-mail de Léa, le numéro de Tom (écrit autrement), un inconnu, et moi-même.
    const hashes = [sha256('lea@test.fr'), sha256(normalizePhone('+33 6 11 22 33 44')!), sha256('inconnu@x.fr'), sha256('moi@test.fr')];
    const m = await call('POST', '/v1/contacts/match', { hashes }, me);
    expect(m.json.users.map((u: any) => u.displayName).sort()).toEqual(['Léa', 'Tom']);
    // « Tout ajouter » en un clic
    const ids = m.json.users.map((u: any) => u.id);
    const r = await call('POST', '/v1/friends/requests', { userIds: ids }, me);
    expect(Object.values(r.json.results)).toEqual(['pending', 'pending']);
    // Léa voit la demande et l'accepte ; Tom la refuse.
    const lf = (await call('GET', '/v1/friends', undefined, lea)).json.friends;
    expect(lf[0].status).toBe('pending'); expect(lf[0].requestedByMe).toBe(false);
    expect((await call('POST', `/v1/friends/${lf[0].id}/accept`, {}, lea)).json.status).toBe('accepted');
    const tf = (await call('GET', '/v1/friends', undefined, tom)).json.friends;
    await call('POST', `/v1/friends/${tf[0].id}/decline`, {}, tom);
    const mine = (await call('GET', '/v1/friends', undefined, me)).json.friends;
    expect(mine.map((f: any) => `${f.displayName}:${f.status}`)).toEqual(['Léa:accepted']);
    // Le demandeur ne peut pas accepter sa propre demande : il redemande à Tom (en attente), puis tente « accept » → reste en attente.
    const tomId = m.json.users.find((u: any) => u.displayName === 'Tom').id;
    await call('POST', '/v1/friends/requests', { userIds: [tomId] }, me);
    const self = await call('POST', `/v1/friends/${tomId}/accept`, {}, me);
    expect(self.json.status).toBe('pending');
    // Demande croisée : si Tom me demande alors que je l'avais demandé → amis aussitôt.
    const myId = (await call('GET', '/v1/me', undefined, me)).json.id;
    expect((await call('POST', '/v1/friends/requests', { userIds: [myId] }, tom)).json.results[myId]).toBe('accepted');
  });

  it('refuse les entrées invalides et limite les recherches', async () => {
    const t = await signup('x@test.fr', 'X');
    expect((await call('POST', '/v1/me/phone', { phone: '12' }, t)).status).toBe(400);
    expect((await call('POST', '/v1/contacts/match', { hashes: ['pas-une-empreinte'] }, t)).json.users).toEqual([]);
    let last = 0; for (let i = 0; i < 8; i++) last = (await call('POST', '/v1/contacts/match', { hashes: [sha256('a')] }, t)).status;
    expect(last).toBe(429);
    expect((await call('POST', '/v1/contacts/match', { hashes: [] })).status).toBe(401);
  });
});
