// Récap / replay / invitation / signalement sur un vrai compte : à partir du vrai trajet (mode test de la carte).
const { chromium, devices } = require('playwright');
const API = 'http://127.0.0.1:8787';
(async () => { const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const p = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const r = await (await fetch(API + '/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `rc${Date.now()}@recap.test`, password: 'Motdepasse-42', displayName: 'Iris' }) })).json();
  await p.goto('http://127.0.0.1:8090/local.html?nouveau&api=' + API); await p.evaluate((j) => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user })), r);
  await p.goto('http://127.0.0.1:8090/local.html?api=' + API); await p.waitForTimeout(1500); await p.evaluate(() => { ST.tourDone = true; ST.perms.loc = 'app'; });
  await p.evaluate(() => V.recap()); await p.waitForTimeout(400);
  ok(/se construit pendant la soirée/.test(await p.evaluate(() => document.querySelector('#screen').innerText)), 'récap sans trajet : état vide honnête (aucun chiffre inventé)');
  // Simule 40 min de soirée réelle : points horodatés le long des allées
  await p.evaluate(() => { const T = realTrack(); const now = Date.now(); const pts = [[30, 70], [35, 65], [42, 58], [48, 52], [52, 48], [52, 48], [52, 48], [58, 44], [62, 40], [62, 40]]; pts.forEach((q, i) => T.push({ t: now - (pts.length - i) * 240e3, x: q[0], y: q[1], v: VENUE.id })); });
  await p.evaluate(() => V.recap()); await p.waitForTimeout(400);
  const t = await p.evaluate(() => document.querySelector('#screen').innerText);
  const S = await p.evaluate(() => { const s = realTrackStats(); return { km: s.distM, dur: s.onSite, z: s.zones.length }; });
  ok(/36 min/.test(t), 'durée réelle affichée (36 min)'); ok(S.km > 100 && S.km < 400 && t.includes((S.km / 1000).toFixed(1).replace('.', ',') + ' km'), `distance réelle calculée (${Math.round(S.km)} m)`);
  ok(!/5 h 17|3,4 km|4 620/.test(t), 'aucun chiffre de démonstration');
  await p.click('#rp'); await p.waitForTimeout(600); await p.click('#pp'); await p.waitForTimeout(2500);
  const rp = await p.evaluate(() => [document.querySelector('#rh').textContent, document.querySelector('#rd').textContent, document.querySelector('#rz').textContent]);
  ok(/\d\d:\d\d/.test(rp[0]) && /km/.test(rp[1]) && rp[2].length > 1, 'replay du vrai parcours : ' + rp.join(' · '));
  await p.evaluate(() => V.map()); await p.waitForTimeout(700); await p.evaluate(() => V.meSheet()); await p.waitForTimeout(400);
  const ms = await p.evaluate(() => document.querySelector('.sheet').innerText);
  ok(!/Écrire un message sur la carte/.test(ms) && /Inviter un ami/.test(ms), 'fiche « Moi » : invitation réelle, pas de bulle locale trompeuse');
  await p.evaluate(() => V.report()); await p.waitForTimeout(400);
  { const t2 = await p.evaluate(() => document.querySelector('.sheet').innerText); ok(/Transmis en direct à l’équipe du lieu/.test(t2) && /112/.test(t2), 'signalement : transmis à l’équipe réelle du lieu + rappel 112'); }
  ok(errs.length === 0, 'erreurs JS : ' + (errs.join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close(); })();
