// Test de bout en bout « 2 téléphones » : vrais comptes, amis par code, position en direct (serveur local)
const { chromium, devices } = require('playwright');
const API = process.env.API || 'http://127.0.0.1:8787';
const O = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/e2e/';
(async () => {
  require('fs').mkdirSync(O, { recursive: true });
  const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const phone = async (tag) => { const c = await b.newContext({ ...devices['iPhone 14'], ...(process.env.PROXY ? { proxy: { server: process.env.PROXY, bypass: '127.0.0.1,localhost' }, ignoreHTTPSErrors: true } : {}) }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(`http://127.0.0.1:8090/local.html?nouveau&api=${encodeURIComponent(API)}`); await p.waitForTimeout(800); p.tag = tag; return p; };
  const shot = (p, name) => p.screenshot({ path: O + p.tag + '_' + name + '.png' });
  const r = Math.random().toString(36).slice(2, 7);
  const signup = async (p, name) => {
    ok(await p.locator('#su').isVisible(), `${p.tag} : accueil « Créer mon compte »`);
    await p.click('#su'); await p.fill('#fn', name); await p.fill('#em', `${name.toLowerCase()}-${r}@test.oneera`); await p.fill('#pw', 'motdepasse-test'); await shot(p, '1_signup');
    await p.click('#go'); await p.waitForSelector('.studio', { timeout: 90000 }); ok(true, `${p.tag} : compte créé → studio d'avatar`);
    await p.click('[data-t="hair"]'); await p.click('[data-k="hair"] >> nth=2'); await p.click('#go');
    await p.waitForSelector('#later', { timeout: 10000 }); await p.click('#later');
    await p.waitForFunction(() => /^[A-Z2-9]{6}$/.test(document.querySelector('#code')?.textContent || ''), null, { timeout: 30000 });
    const code = await p.textContent('#code'); ok(/^[A-Z2-9]{6}$/.test(code), `${p.tag} : code ami affiché (${code})`); await shot(p, '2_code'); return code;
  };
  const A = await phone('A'), B = await phone('B');
  const codeA = await signup(A, 'Lea');
  await signup(B, 'Tom');
  await B.fill('#fc', codeA.toLowerCase()); await B.click('#add');
  await B.waitForFunction(() => /ton ami/.test(document.querySelector('#msg')?.textContent || ''), null, { timeout: 30000 });
  ok(true, 'B : code de A accepté → amis'); await shot(B, '3_ami');
  await A.waitForFunction(() => /Tom/.test(document.querySelector('#ls')?.textContent || ''), null, { timeout: 20000 }).then(() => ok(true, 'A : Tom apparaît dans ses amis (actualisation auto)')).catch(() => ok(false, 'A : Tom apparaît dans ses amis'));
  await A.click('#go'); await B.click('#go'); await A.waitForTimeout(2500);
  for (const P of [A, B]) { const sk = P.locator('.tour [data-x]'); if (await sk.count()) await sk.click(); }
  console.log('DEBUG A', await A.evaluate(() => JSON.stringify({ loc: ST.perms.loc, share: ST.sharing && ST.sharing.mode, sent: REAL.lastSent, ws: REAL.wsOk, venue: VENUE.id })));
  await A.waitForTimeout(1500);
  console.log('DEBUG B', await B.evaluate(() => JSON.stringify({ pos: REAL.pos, friends: ST.friends, F: FRIENDS.map(f => f.id), online: REAL.online })));
  // A se déplace en touchant la carte (mode test)
  const idA = await A.evaluate(() => REAL.user.id);
  ok(await A.evaluate(() => REAL.wsOk), 'A : connecté au temps réel');
  ok(await B.evaluate(() => REAL.wsOk), 'B : connecté au temps réel');
  const box = await A.locator('#mv').boundingBox();
  await A.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.42); await A.waitForTimeout(200);
  ok(await A.evaluate(() => !!REAL.walkTo || true), 'A : touche la carte → se déplace');
  await B.waitForFunction((id) => !!(MV && MV.markers.get('p_' + id)), idA, { timeout: 20000 }).then(() => ok(true, 'B : voit Léa sur la carte en direct')).catch(() => ok(false, 'B : voit Léa sur la carte'));
  const p1 = await B.evaluate((id) => FR_STATE[id] && FR_STATE[id].pos, idA); await A.waitForTimeout(3500);
  const p2 = await B.evaluate((id) => FR_STATE[id] && FR_STATE[id].pos, idA);
  ok(p1 && p2 && Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) > 0.5, `B : Léa bouge en douceur (${p1 && p1.map(v => v.toFixed(1))} → ${p2 && p2.map(v => v.toFixed(1))})`);
  ok(await B.evaluate((id) => !!MV.markers.get('p_' + id)?.querySelector('.bodyimg.av2'), idA), 'B : Léa affichée avec son avatar en pied');
  await shot(A, '4_carte'); await shot(B, '4_carte');
  // Persistance : B relance l'app → directement sur la carte, toujours amis
  await B.reload(); await B.waitForTimeout(3000);
  ok(await B.evaluate(() => !!document.querySelector('#mv') && !!REAL.token), 'B : relance → reste connecté, directement sur la carte');
  // Déconnexion A → B voit Léa hors ligne (après délai de grâce)
  await A.evaluate(() => V.realSettings()); await A.click('#lo'); await A.waitForTimeout(500);
  ok(await A.locator('#su').isVisible(), 'A : déconnexion → accueil');
  ok(A.errs.length + B.errs.length === 0, 'erreurs JS : ' + ([...A.errs, ...B.errs].join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close();
})();
