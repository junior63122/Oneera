const { chromium, devices } = require('playwright');
const OUT = process.argv[2];
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let ok = 0, ko = 0; const t = (n, v) => { v ? ok++ : (ko++, console.log('ÉCHEC', n)); };
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(1000);
  await p.evaluate(() => { localStorage.removeItem('oneera.looks'); V.avatarPick(() => {}, false); }); await p.waitForTimeout(600);
  await p.click('#tb button[data-t="looks"]'); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '_1.png' });
  t('6 idées', await p.locator('[data-look][data-mine="0"]').count() === 6);
  await p.click('[data-look="3"][data-mine="0"]'); await p.waitForTimeout(500);
  const g = await p.evaluate(() => document.querySelector('#big svg').outerHTML.includes('tpP')); t('motif appliqué par le look Rave', g);
  await p.click('#lkadd'); await p.waitForTimeout(400); t('look enregistré', await p.locator('[data-mine="1"]').count() === 1);
  t('stocké sur le téléphone', await p.evaluate(() => JSON.parse(localStorage.getItem('oneera.looks')).length === 1));
  await p.click('[data-look="0"][data-mine="0"]'); await p.waitForTimeout(300); await p.click('[data-look="0"][data-mine="1"]'); await p.waitForTimeout(300);
  t('look perso réappliqué', await p.evaluate(() => document.querySelector('#big svg').outerHTML.includes('tpP')));
  const hatOf = () => p.evaluate(() => ST.me.av2 && document.querySelector('#big svg').outerHTML.length); const before = await p.evaluate(() => document.querySelector('#big svg').outerHTML.replace(/c\d+/g, '').length);
  await p.click('#un'); await p.waitForTimeout(300); t('annuler fonctionne', before !== await p.evaluate(() => document.querySelector('#big svg').outerHTML.replace(/c\d+/g, '').length));
  for (let i = 0; i < 6; i++) { const a = p.locator('#lkadd'); if (await a.count()) { await a.click(); await p.waitForTimeout(150); } }
  t('6 looks maximum', await p.locator('[data-mine="1"]').count() === 6 && await p.locator('#lkadd').count() === 0);
  await p.screenshot({ path: OUT + '_2.png' });
  await p.click('[data-lookx="0"]'); await p.waitForTimeout(300); t('suppression', await p.locator('[data-mine="1"]').count() === 5);
  // motif + couleur du motif dans l'onglet Haut
  await p.click('#tb button[data-t="top"]'); await p.waitForTimeout(300); await p.click('.stMot [data-v="leopard"]'); await p.waitForTimeout(300);
  t('couleur du motif proposée', await p.locator('[data-c="topPC"]').count() > 5); await p.click('[data-c="topPC"][data-i="15"]'); await p.waitForTimeout(300);
  t('couleur du motif appliquée', await p.evaluate(() => document.querySelector('#big svg').outerHTML.includes('#E35D6A')));
  await p.click('#tb button[data-t="bottom"]'); await p.waitForTimeout(300); await p.click('.stMot [data-v="camo"]'); await p.waitForTimeout(300); t('motif du bas', await p.evaluate(() => document.querySelector('#big svg').outerHTML.includes('btP')));
  // couleur libre visible sans défiler
  const fr = await p.evaluate(() => { const r = document.querySelector('.stFree').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }); t('couleur libre visible', fr);
  await p.click('#go'); await p.waitForTimeout(400); t('enregistré dans le profil', await p.evaluate(() => ST.me.av2.bottomP === 'camo' && ST.me.av2.topP === 'leopard'));
  t('aucune erreur', errs.length === 0); if (errs.length) console.log(errs);
  console.log(`looks + motifs : ${ok}/${ok + ko}`); await b.close(); })();
