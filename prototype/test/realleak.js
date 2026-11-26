// Compte réel : aucun écran ne doit montrer des personnes / messages / chiffres inventés de la démo.
const { chromium, devices } = require('playwright');
const API = 'http://127.0.0.1:8787';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const r = await (await fetch(API + '/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `leak${Date.now()}@leak.test`, password: 'Motdepasse-42', displayName: 'Zoé' }) })).json();
  await p.goto('http://127.0.0.1:8090/local.html?nouveau&api=' + API); await p.evaluate((j) => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user })), r);
  await p.goto('http://127.0.0.1:8090/local.html?api=' + API); await p.waitForTimeout(1800); await p.evaluate(() => { ST.tourDone = true; ST.perms.loc = 'app'; });
  const DEMO = /\b(Léa|Lea|Tom|Sami|Inès|Ines|Maya|Jade|Noah|Alex|Hugo|Chloé|Nina|Yanis|Lucas|Emma)\b|La bande du Bal|amis en commun|personnes de ton réseau|🔋/;
  const screens = ['V.map()', 'V.friendsTab()', 'V.chatList()', 'V.settings()', 'V.notifs()', 'V.search()', 'V.recap()', 'V.replay()', 'V.meSheet()', 'V.shareSettings()', 'V.addFriends(false)', 'V.eventSheet && V.eventSheet()', 'V.realSettings()', 'V.profile && V.profile()', 'V.discover && V.discover()', 'V.rdvSheet(null)', 'V.report()', 'V.layers && V.layers()'];
  for (const s of screens) { await p.evaluate(s).catch(e => errs.push(s + ' : ' + e.message)); await p.waitForTimeout(700);
    const t = await p.evaluate(() => document.querySelector('#screen').innerText);
    const m = t.match(DEMO); console.log((m ? 'FUITE ' : 'OK    ') + s.padEnd(32) + (m ? ' → « ' + t.slice(Math.max(0, t.indexOf(m[0]) - 40), t.indexOf(m[0]) + 50).replace(/\n/g, ' ') + ' »' : '')); }
  console.log('erreurs', errs); await b.close(); })();
