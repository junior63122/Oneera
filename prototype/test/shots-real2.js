const { chromium, devices } = require('playwright');
const API = 'http://127.0.0.1:8787';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 1 })).newPage();
  const r = await (await fetch(API + '/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `s2${Date.now()}@leak.test`, password: 'Motdepasse-42', displayName: 'Zoé' }) })).json();
  await p.goto('http://127.0.0.1:8090/local.html?nouveau&api=' + API); await p.evaluate((j) => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user })), r);
  await p.goto('http://127.0.0.1:8090/local.html?api=' + API); await p.waitForTimeout(1800); await p.evaluate(() => { ST.tourDone = true; ST.perms.loc = 'app'; });
  const L = [['30-recap', 'V.recap()'], ['31-replay', 'V.replay()'], ['32-moi', 'V.map();setTimeout(V.meSheet,600)'], ['33-notifs', 'V.notifs()'], ['34-sos', 'V.map();setTimeout(V.report,600)'], ['35-recherche', 'V.search()'], ['36-evenement', 'V.map();setTimeout(()=>V.eventSheet&&V.eventSheet(),600)'], ['37-profil', 'V.profile&&V.profile()']];
  for (const [n, s] of L) { await p.evaluate(s); await p.waitForTimeout(1300); await p.screenshot({ path: 'shots103/' + n + '.png' }); }
  await b.close(); })();
