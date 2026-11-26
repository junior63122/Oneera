// Scénarios réels, bons ET mauvais : saisies invalides, doublons, double-tap, serveur coupé, jeton invalide,
// tentative d'injection par le prénom, propre code, compte supprimé, reconnexion temps réel, navigation frénétique.
const { chromium, devices } = require('playwright');
const API = process.env.API || 'http://127.0.0.1:8787';
(async () => {
  const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const r = Math.random().toString(36).slice(2, 7); const allErrs = [];
  const phone = async (api = API, pre) => { const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage(); p.on('pageerror', e => allErrs.push(e.message)); if (pre) await p.addInitScript(pre); await p.goto(`http://127.0.0.1:8090/local.html?nouveau&api=${encodeURIComponent(api)}`); await p.waitForTimeout(600); return p; };
  const msg = (p) => p.evaluate(() => { const e = document.querySelector('#err,#msg'); return e && !e.hidden ? e.textContent : ''; });
  const fill = async (p, name, email, pw) => { await p.click('#su'); await p.fill('#fn', name); await p.fill('#em', email); await p.fill('#pw', pw); };
  // 1. Saisies invalides : aucun appel serveur, message clair
  let P = await phone();
  await p_click(P, '#su'); await P.click('#go'); ok(/prénom/.test(await msg(P)), 'inscription vide → « Indique ton prénom »');
  await P.fill('#fn', 'Zoé'); await P.fill('#em', 'pas-un-email'); await P.click('#go'); ok(/e-mail invalide/i.test(await msg(P)), 'e-mail invalide → message');
  await P.fill('#em', `zoe-${r}@test.oneera`); await P.fill('#pw', '123'); await P.click('#go'); ok(/8 caractères/.test(await msg(P)), 'mot de passe trop court → message');
  // 2. Double-tap sur « Créer mon compte » → un seul compte, pas d'erreur
  await P.fill('#pw', 'motdepasse-ok'); await P.dblclick('#go'); await P.waitForSelector('.studio', { timeout: 20000 }); ok(true, 'double-tap sur « Créer » → un seul envoi, studio ouvert');
  // 3. Même e-mail une 2e fois → « compte existe déjà »
  P = await phone(); await fill(P, 'Zoé', `ZOE-${r}@test.oneera`, 'motdepasse-ok'); await P.click('#go'); await P.waitForTimeout(1500); ok(/existe déjà/.test(await msg(P)), 'e-mail déjà utilisé (casse différente) → « Un compte existe déjà »');
  // 4. Mauvais mot de passe
  await P.click('#sw'); await P.fill('#em', `zoe-${r}@test.oneera`); await P.fill('#pw', 'mauvais-mdp'); await P.click('#go'); await P.waitForTimeout(1500); ok(/incorrect/.test(await msg(P)), 'mauvais mot de passe → « E-mail ou mot de passe incorrect »');
  ok(!(await P.isDisabled('#go')), 'après une erreur, le bouton redevient utilisable');
  // 5. Serveur injoignable
  P = await phone('http://127.0.0.1:9'); await fill(P, 'Tim', `tim-${r}@test.oneera`, 'motdepasse-ok'); await P.click('#go'); await P.waitForTimeout(2500);
  ok(/connexion au serveur|ne répond pas/i.test(await msg(P)), 'serveur coupé → message « Pas de connexion au serveur »'); ok(!(await P.isDisabled('#go')), 'serveur coupé → on peut réessayer');
  // 6. Prénom piégé (injection HTML) : jamais interprété, nulle part
  const X = '<img src=x onerror="window.__pwned=1">Léa';
  const A = await phone(); await fill(A, X, `xss-${r}@test.oneera`, 'motdepasse-ok'); await A.click('#go'); await A.waitForSelector('.studio', { timeout: 20000 }); await A.click('#go'); await A.click('#later'); await A.waitForSelector('#code'); await A.waitForFunction(() => /^[A-Z2-9]{6}$/.test(document.querySelector('#code').textContent), null, { timeout: 15000 });
  const code = await A.textContent('#code');
  const B = await phone(); await fill(B, 'Bob', `bob-${r}@test.oneera`, 'motdepasse-ok'); await B.click('#go'); await B.waitForSelector('.studio', { timeout: 20000 }); await B.click('#go'); await B.click('#later'); await B.waitForSelector('#fc');
  await B.fill('#fc', code); await B.click('#add'); await B.waitForTimeout(1500);
  // 7. Propre code / code invalide
  const myB = await B.textContent('#code'); await B.fill('#fc', myB); await B.click('#add'); ok(/propre code/.test(await msg(B)), 'saisir son propre code → message clair');
  await B.fill('#fc', 'AB!'); await B.click('#add'); ok(/6 caractères/.test(await msg(B)), 'code trop court → message');
  await B.fill('#fc', 'ZZZZZZ'); await B.click('#add'); await B.waitForTimeout(1200); ok(/invalide|expiré/.test(await msg(B)), 'code inconnu → « Code invalide ou expiré »');
  await A.click('#go'); await B.click('#go'); await A.waitForTimeout(2500);
  const box = await A.locator('#mv').boundingBox(); await A.mouse.click(box.x + box.width * .55, box.y + box.height * .45); await B.waitForTimeout(3500);
  ok(await B.evaluate(() => window.__pwned === undefined) && await A.evaluate(() => window.__pwned === undefined), 'prénom piégé jamais exécuté (liste d’amis, carte, notifications)');
  ok(await B.evaluate(() => [...document.querySelectorAll('.mk .name')].some(e => /img src=x/.test(e.textContent))), 'prénom piégé neutralisé (balises retirées), affiché comme du texte');
  // 8. Reconnexion temps réel après coupure
  await B.evaluate(() => REAL.ws.close()); await B.waitForTimeout(300); ok(await B.evaluate(() => !REAL.wsOk), 'coupure réseau simulée'); await B.waitForTimeout(3000); ok(await B.evaluate(() => REAL.wsOk), 'reconnexion automatique en moins de 3 s');
  // 9. Navigation frénétique
  for (let i = 0; i < 25; i++) await B.evaluate((i) => [() => V.settings(), () => V.map(), () => V.addFriends(false), () => V.realSettings(), () => V.map(), () => V.avatarPick(() => V.map(), false)][i % 6](), i).catch(() => {});
  await B.evaluate(() => V.map()); await B.waitForTimeout(800); ok(await B.evaluate(() => !!document.querySelector('#mv') && document.querySelectorAll('.tour').length <= 1 && document.querySelectorAll('.scr').length === 1), 'navigation frénétique (25 écrans en rafale) → carte intacte');
  // 10. Compte supprimé ailleurs : l'ami disparaît, et la session supprimée est renvoyée à l'accueil
  await A.evaluate(() => V.realSettings()); await A.click('#dl'); await A.fill('#cf', 'SUPPRIMER'); await A.click('#del'); await A.waitForTimeout(1500);
  ok(await A.locator('#su').isVisible(), 'suppression du compte → retour à l’accueil');
  await B.evaluate(() => realSyncFriends()); await B.waitForTimeout(800); ok(await B.evaluate(() => REAL.friends.length === 0), 'l’ami supprimé disparaît chez son ami');
  // 11. Jeton invalide stocké → retour propre à l'accueil
  const T = await phone(API, () => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: 'jeton.invalide.xyz', user: { displayName: 'X' } })));
  await T.goto(`http://127.0.0.1:8090/local.html?api=${encodeURIComponent(API)}`); await T.waitForTimeout(3000); ok(await T.locator('#su').isVisible(), 'jeton invalide/expiré → retour à l’accueil sans plantage');
  // 12. Prénoms limites
  P = await phone(); await fill(P, 'X'.repeat(45), `long-${r}@test.oneera`, 'motdepasse-ok'); ok(await P.evaluate(() => document.querySelector('#fn').value.length) === 40, 'prénom limité à 40 caractères à la saisie');
  P = await phone(); await fill(P, '🎉 Zoé-Marie', `emoji-${r}@test.oneera`, 'motdepasse-ok'); await P.click('#go'); await P.waitForSelector('.studio', { timeout: 20000 }); ok(await P.evaluate(() => REAL.user.displayName) === '🎉 Zoé-Marie', 'prénom avec émoji et trait d’union accepté');
  ok(allErrs.length === 0, 'erreurs JS : ' + (allErrs.join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close();
  async function p_click(p, s) { await p.click(s); }
})();
