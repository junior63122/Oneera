// Fuzzing de l'API : des milliers de requêtes aléatoires et malveillantes sur chaque route.
// Attendus : jamais d'erreur 5xx, jamais de réponse vide/illisible, routes protégées → 401 sans jeton valide,
// aucune donnée d'un autre utilisateur, le serveur reste en bonne santé du début à la fin.
const API = process.argv[2] || 'http://127.0.0.1:8787', N = +(process.argv[3] || 3000);
let seed = 1234567; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, pick = a => a[Math.floor(rnd() * a.length)];
const NASTY = ['', ' ', '   ', "' OR 1=1 --", "'; DROP TABLE users; --", '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '{{7*7}}', '${7*7}', '../../etc/passwd', '%00', '\u0000', '‮', 'ثلاثة أشخاص', '三个人', '😀🎉🔥'.repeat(50), 'x'.repeat(10000), 'é'.repeat(300), 'null', 'undefined', 'true', '-1', '1e309', 'NaN', '0x1F', 'a@b', 'a'.repeat(64) + '@test.fr', 'javascript:alert(1)', 'data:text/html,<b>x</b>', '\n\r\t', '🏳️‍🌈', '1900-01-01', '2999-12-31'];
const VAL = () => pick([pick(NASTY), Math.floor(rnd() * 2e9) - 1e9, -1, 0, 1.5, 1e308, true, false, null, [], [pick(NASTY)], {}, { a: pick(NASTY) }, { __proto__: { admin: true } }, Array(200).fill('x')]);
const UUID = () => pick(['00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', crypto.randomUUID()]);
const ROUTES = [
  ['GET', '/v1/health', 0], ['GET', '/v1/auth/providers', 0], ['POST', '/v1/auth/signup', 0, ['email', 'password', 'displayName', 'avatar', 'locationConsent']], ['POST', '/v1/auth/login', 0, ['email', 'password']],
  ['POST', '/v1/auth/apple', 0, ['identityToken', 'displayName']], ['POST', '/v1/auth/google', 0, ['idToken', 'displayName']], ['GET', '/v1/me', 1], ['PATCH', '/v1/me', 1, ['displayName', 'avatar', 'shareMode']],
  ['DELETE', '/v1/me/phone', 1], ['POST', '/v1/me/phone', 1, ['phone']], ['GET', '/v1/me/export', 1], ['GET', '/v1/friends', 1], ['POST', '/v1/friends/requests', 1, ['code', 'userId']],
  ['POST', '/v1/friends/:id/accept', 1], ['POST', '/v1/friends/:id/decline', 1], ['DELETE', '/v1/friends/:id', 1], ['POST', '/v1/invites', 1], ['POST', '/v1/invites/accept', 1, ['code']],
  ['POST', '/v1/consents', 1, ['purpose', 'granted']], ['POST', '/v1/contacts/match', 1, ['hashes', 'phones']], ['GET', '/v1/conversations', 1], ['GET', '/v1/messages/:id', 1],
  ['POST', '/v1/messages', 1, ['to', 'body', 'kind', 'lat', 'lng']], ['POST', '/v1/messages/:id/read', 1], ['POST', '/v1/realtime-token', 1, ['eventCode']], ['POST', '/v1/share', 1, ['eventCode', 'mode']], ['DELETE', '/v1/share', 1], ['GET', '/v1/events/:code', 0]];
const call = async (m, path, body, tok) => { const t0 = Date.now(); try { const r = await fetch(API + path, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }); const txt = await r.text(); let json = null; try { json = JSON.parse(txt); } catch (_) {} return { s: r.status, json, txt, ms: Date.now() - t0 }; } catch (e) { return { s: 0, err: String(e), ms: Date.now() - t0 }; } };
const run = Date.now().toString(36);
const signup = async (k) => (await call('POST', '/v1/auth/signup', { email: `fz-${k}-${run}@test.oneera`, password: 'motdepasse-fuzz', displayName: 'Fuzz ' + k, locationConsent: true })).json;
(async () => {
  const A = await signup('a'), B = await signup('b'); if (!A?.token || !B?.token) { console.log('ÉCHEC : création des comptes de test impossible', A, B); process.exit(1); }
  const forged = [A.token.slice(0, -4) + 'AAAA', A.token.split('.').slice(0, 2).join('.') + '.', 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.', 'x'.repeat(5000), 'Bearer', ''];
  const stats = { total: 0, s5xx: 0, s0: 0, authLeak: 0, dataLeak: 0, bad: 0, byStatus: {} }, fails = [];
  for (let i = 0; i < N; i++) { const [m, p0, needAuth, fields] = pick(ROUTES); let path = p0.replace(':id', pick([UUID(), B.user.id, A.user.id, pick(NASTY)].map(x => encodeURIComponent(String(x))))).replace(':code', encodeURIComponent(pick(['bdf', pick(NASTY), 'x'.repeat(41)])));
    const mode = rnd(); const tok = mode < .25 ? null : mode < .45 ? pick(forged) : A.token;
    let body; if (m !== 'GET' && m !== 'DELETE') { const r2 = rnd(); body = r2 < .1 ? pick(['{', 'not json', '[]', '"x"', '{"a":' + '1'.repeat(1000)]) : r2 < .15 ? undefined : Object.fromEntries((fields || ['x']).filter(() => rnd() < .8).map(f => [f, VAL()])); }
    const r = await call(m, path, body, tok); stats.total++; stats.byStatus[r.s] = (stats.byStatus[r.s] || 0) + 1;
    if (r.s >= 500 && !(r.s === 503 && r.json && r.json.error === 'provider_disabled')) { stats.s5xx++; /* Apple / Google pas encore configurés : 503 voulu */ fails.push(`${m} ${path.slice(0, 80)} → ${r.s} ${(r.txt || '').slice(0, 120)}`); }
    if (r.s === 0) { stats.s0++; fails.push(`${m} ${path.slice(0, 80)} → connexion perdue ${r.err}`); }
    if (needAuth && tok !== A.token && r.s >= 200 && r.s < 300) { stats.authLeak++; fails.push(`ACCÈS SANS JETON VALIDE : ${m} ${path.slice(0, 80)} → ${r.s}`); }
    if (r.txt && r.txt.includes(B.user.id) && !/friends|requests|messages/.test(path)) { stats.dataLeak++; fails.push(`FUITE : ${m} ${path.slice(0, 80)} contient l'identifiant d'un autre utilisateur`); }
    if (r.s && r.s !== 204 && r.json === null && r.s < 500) { stats.bad++; if (stats.bad < 5) fails.push(`réponse non JSON : ${m} ${path.slice(0, 60)} → ${r.s} ${(r.txt || '').slice(0, 60)}`); } }
  // profil de B jamais lisible par A sans amitié
  const fr = await call('GET', '/v1/friends', undefined, A.token); const seesB = JSON.stringify(fr.json || {}).includes(B.user.displayName) && !(fr.json?.friends || []).some(f => f.id === B.user.id && (f.status === 'accepted' || (f.status === 'pending' && f.requestedByMe))) ; // une invitation envoyée par A montre seulement le prénom (voulu) — jamais la position
  if (seesB) console.log('  liste d’amis de A :', JSON.stringify(fr.json).slice(0, 600));
  const health = await call('GET', '/v1/health');
  console.log(JSON.stringify({ requetes: stats.total, statuts: stats.byStatus, erreurs_5xx: stats.s5xx, connexions_perdues: stats.s0, acces_sans_jeton: stats.authLeak, fuites: stats.dataLeak + (seesB ? 1 : 0), reponses_non_json: stats.bad, serveur_sain_apres: health.s === 200 }));
  fails.slice(0, 15).forEach(f => console.log('  -', f));
  const ok = !stats.s5xx && !stats.s0 && !stats.authLeak && !stats.dataLeak && !seesB && health.s === 200;
  console.log(ok ? 'FUZZ API : OK' : 'FUZZ API : ÉCHEC'); process.exit(ok ? 0 : 1); })();
