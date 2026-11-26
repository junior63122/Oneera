import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApi } from '../src/api';
import { Pool } from '../src/db';
import { Gateway } from '../src/gateway';
import { freshDb, TEST_URL } from './helpers';

const DB = 'oneera_test_social';
const secret = new TextEncoder().encode('test-secret-not-for-production-0123456789');
let pool: Pool, gw: Gateway, base: string;
let apple: Awaited<ReturnType<typeof generateKeyPair>>, google: Awaited<ReturnType<typeof generateKeyPair>>, rogue: Awaited<ReturnType<typeof generateKeyPair>>;

const jwk = async (k: CryptoKey, kid: string) => ({ ...(await exportJWK(k)), kid, alg: 'RS256', use: 'sig' });
const tok = (key: CryptoKey, kid: string, iss: string, aud: string, claims: Record<string, unknown>, exp = '10m') =>
  new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid }).setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime(exp).sign(key);

beforeAll(async () => {
  pool = await freshDb(DB);
  [apple, google, rogue] = await Promise.all([generateKeyPair('RS256'), generateKeyPair('RS256'), generateKeyPair('RS256')]);
  const url = new URL(TEST_URL); url.pathname = `/${DB}`;
  gw = new Gateway({ pool, listenUrl: url.toString(), secret, http: createApi({ pool, secret, appleAudiences: ['com.mapping.festival'], googleAudiences: ['ios-client.apps.googleusercontent.com'],
    jwks: { apple: createLocalJWKSet({ keys: [await jwk(apple.publicKey, 'a1')] }), google: createLocalJWKSet({ keys: [await jwk(google.publicKey, 'g1')] }) } }) });
  base = `http://127.0.0.1:${await gw.listen(0)}`;
});
afterAll(async () => { await gw?.close(); await pool?.end(); });
const post = async (path: string, body: unknown) => { const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: (await r.json()) as Record<string, any> }; };

describe('connexion Apple / Google', () => {
  it('Apple : 1re connexion = inscription (prénom transmis), 2e = connexion au même compte', async () => {
    const t1 = await tok(apple.privateKey, 'a1', 'https://appleid.apple.com', 'com.mapping.festival', { sub: '001234.apple', email: 'x@privaterelay.appleid.com' });
    const a = await post('/v1/auth/apple', { identityToken: t1, fullName: 'Léa' });
    expect(a.status).toBe(200); expect(a.json.isNew).toBe(true); expect(a.json.user.displayName).toBe('Léa');
    const t2 = await tok(apple.privateKey, 'a1', 'https://appleid.apple.com', 'com.mapping.festival', { sub: '001234.apple' });
    const b = await post('/v1/auth/apple', { identityToken: t2 });
    expect(b.json.isNew).toBe(false); expect(b.json.user.id).toBe(a.json.user.id);
  });
  it('Google : prénom pris dans le jeton', async () => {
    const t = await tok(google.privateKey, 'g1', 'https://accounts.google.com', 'ios-client.apps.googleusercontent.com', { sub: 'g-42', email: 'tom@gmail.com', given_name: 'Tom' });
    const r = await post('/v1/auth/google', { idToken: t });
    expect(r.status).toBe(200); expect(r.json.user.displayName).toBe('Tom'); expect(r.json.isNew).toBe(true);
  });
  it('refuse : mauvaise signature, mauvais destinataire, jeton expiré, mauvais émetteur', async () => {
    const bad = [
      await tok(rogue.privateKey, 'a1', 'https://appleid.apple.com', 'com.mapping.festival', { sub: 'x' }),
      await tok(apple.privateKey, 'a1', 'https://appleid.apple.com', 'com.autre.app', { sub: 'x' }),
      await tok(apple.privateKey, 'a1', 'https://appleid.apple.com', 'com.mapping.festival', { sub: 'x' }, '-1m'),
      await tok(apple.privateKey, 'a1', 'https://evil.example', 'com.mapping.festival', { sub: 'x' }),
    ];
    for (const t of bad) expect((await post('/v1/auth/apple', { identityToken: t })).status).toBe(401);
    expect((await post('/v1/auth/apple', { identityToken: 'pas-un-jeton' })).status).toBe(401);
  });
});
