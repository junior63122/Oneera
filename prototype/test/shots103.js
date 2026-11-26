const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 1 }); const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  const API = 'http://127.0.0.1:8787', U = 'http://127.0.0.1:8090/local.html?api=' + API;
  const sh = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: 'shots103/' + n + '.png' }); };
  await p.goto(U + '&nouveau'); await p.waitForTimeout(900); await sh('01-accueil');
  await p.evaluate(() => V.signup && V.signup()); await sh('02-inscription');
  await p.fill('#fn', 'Camille').catch(()=>{}); await p.fill('#em', `shot${Date.now()}@t.fr`).catch(()=>{}); await p.fill('#pw', 'Motdepasse-42').catch(()=>{}); await sh('03-inscription-rempli');
  await p.click('#go, #screen .btn:not(.white)', { timeout: 2000 }).catch(()=>{}); await p.waitForTimeout(1500); await sh('04-apres-inscription');
  for (let i=0;i<4;i++){ const t = await p.evaluate(() => document.querySelector('#screen').innerText.slice(0,60).replace(/\n/g,' ')); console.log('écran', i, ':', t); if (/C'est moi|Enregistrer|Plus tard/.test(await p.evaluate(()=>document.querySelector('#screen').innerText))) { await sh('05-studio'); await p.click('#go').catch(()=>{}); await p.waitForTimeout(1200); await sh('06-apres-studio'); } else break; }
  await p.evaluate(() => V.addFriends(false)); await sh('07-ajout-amis');
  await p.evaluate(() => V.map()); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll('.tour,.tourOv,.coach').forEach(e=>e.remove())); await sh('08-carte');
  await p.evaluate(() => V.settings()); await sh('09-reglages');
  await p.evaluate(() => V.realSettings && V.realSettings()); await sh('10-compte');
  await p.evaluate(() => V.friendsTab && V.friendsTab()); await sh('11-amis');
  await p.evaluate(() => V.shareSettings()); await sh('12-partage');
  console.log('erreurs', errs); await b.close(); })();
