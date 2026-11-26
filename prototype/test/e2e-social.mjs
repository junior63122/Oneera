// Connexion Apple / Google de bout en bout : serveur de test (clés de test) + interface + pont natif simulé
import { createRequire } from 'node:module';
const req = createRequire('/home/user/Oneera/packages/backend/package.json');
const { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } = req('jose');
const { chromium, devices } = createRequire('/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/proto2/package.json')('playwright');
const { createApi } = await import('/home/user/Oneera/packages/backend/src/api.ts');
const { createPool, migrate } = await import('/home/user/Oneera/packages/backend/src/db.ts');
const { Gateway } = await import('/home/user/Oneera/packages/backend/src/gateway.ts');
const DB = 'postgres://oneera@127.0.0.1:55432/oneera_e2e_social';
const pool = createPool(DB); await migrate(pool);
const ap = await generateKeyPair('RS256'), gg = await generateKeyPair('RS256');
const jwk = async (k, kid) => ({ ...(await exportJWK(k)), kid, alg: 'RS256', use: 'sig' });
const secret = new TextEncoder().encode('e2e-social-secret-0123456789-0123456789');
const gw = new Gateway({ pool, listenUrl: DB, secret, http: createApi({ pool, secret, appleAudiences: ['com.mapping.festival'], googleAudiences: ['g.apps.googleusercontent.com'], jwks: { apple: createLocalJWKSet({ keys: [await jwk(ap.publicKey, 'a')] }), google: createLocalJWKSet({ keys: [await jwk(gg.publicKey, 'g')] }) } }) });
const port = await gw.listen(0);
const sign = (prov, sub, extra) => new SignJWT({ sub, ...extra }).setProtectedHeader({ alg: 'RS256', kid: prov === 'apple' ? 'a' : 'g' }).setIssuer(prov === 'apple' ? 'https://appleid.apple.com' : 'https://accounts.google.com').setAudience(prov === 'apple' ? 'com.mapping.festival' : 'g.apps.googleusercontent.com').setIssuedAt().setExpirationTime('5m').sign(prov === 'apple' ? ap.privateKey : gg.privateKey);
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
const b = await chromium.launch();
const phone = async (identity) => {
  const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.exposeFunction('__testSign', async (provider) => provider === 'apple' ? { identityToken: await sign('apple', identity.sub, { email: 'x@privaterelay.appleid.com' }), fullName: identity.first } : { idToken: await sign('google', identity.sub, { given_name: identity.first, email: 'g@gmail.com' }), name: identity.first });
  await p.addInitScript(() => { window.ONEERA_NATIVE = { apple: true, google: true }; window.ReactNativeWebView = { postMessage: async (s) => { const m = JSON.parse(s); const r = await window.__testSign(m.provider); setTimeout(() => window.__oneeraNative({ id: m.id, ...r }), 50); } }; });
  await p.goto(`http://127.0.0.1:8090/local.html?nouveau&api=http://127.0.0.1:${port}`); await p.waitForTimeout(700); return p;
};
const A = await phone({ sub: 'apple-001', first: 'Inès' });
ok(await A.locator('#ap').isVisible() && await A.locator('#gg').isVisible(), 'accueil : boutons Apple et Google');
await A.click('#ap'); await A.waitForSelector('.studio', { timeout: 15000 }).then(() => ok(true, 'Apple, 1re fois : compte créé en un geste → studio d’avatar')).catch(() => ok(false, 'Apple → studio'));
ok(await A.evaluate(() => REAL.user && REAL.user.displayName) === 'Inès', 'prénom transmis par Apple : Inès');
await A.click('#go'); await A.waitForSelector('#all', { timeout: 8000 }); await A.click('#all'); await A.waitForTimeout(600);
const sys = A.locator('.sysBack button, .sys button').first(); if (await sys.count()) await sys.click();
await A.waitForTimeout(1500);
ok(await A.evaluate(async () => (await (await fetch(REAL.api + '/v1/me', { headers: { authorization: 'Bearer ' + REAL.token } })).json()).locationConsent === true), 'autorisation de position → consentement enregistré sur le serveur');
// Reconnexion Apple sur un autre téléphone → même compte, directement sur la carte
const A2 = await phone({ sub: 'apple-001', first: null });
await A2.click('#ap'); await A2.waitForSelector('#mv', { timeout: 15000 }).then(() => ok(true, 'Apple, fois suivante : directement sur la carte (même compte)')).catch(() => ok(false, 'Apple reconnexion → carte'));
ok(await A2.evaluate(() => REAL.user.displayName) === 'Inès', 'même compte retrouvé (Inès)');
const G = await phone({ sub: 'google-77', first: 'Maya' });
await G.click('#gg'); await G.waitForSelector('.studio', { timeout: 15000 }).then(() => ok(true, 'Google : compte créé en un geste (Maya)')).catch(() => ok(false, 'Google → studio'));
// Dans un simple navigateur (sans l'app) : message clair
const W = await b.newPage(); await W.goto(`http://127.0.0.1:8090/local.html?nouveau&api=http://127.0.0.1:${port}`); await W.waitForTimeout(600); await W.click('#ap'); await W.waitForTimeout(200);
ok(/app ONEERA/.test(await W.textContent('#werr')), 'hors de l’app : message clair (utiliser l’e-mail)');
ok([A, A2, G].every(p => p.errs.length === 0), 'erreurs JS : ' + ([A, A2, G].flatMap(p => p.errs).join(' | ') || 'aucune'));
await A.screenshot({ path: '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/e2e/social_A.png' });
const W2 = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); await W2.goto(`http://127.0.0.1:8090/local.html?nouveau`); await W2.waitForTimeout(700); await W2.screenshot({ path: '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/e2e/social_welcome.png' });
console.log(`${n - f}/${n}`); await b.close(); await gw.close(); await pool.end(); process.exit(0);
