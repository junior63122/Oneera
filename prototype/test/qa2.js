// Vérifie un par un les correctifs de la revue QA v2
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(600);
  const ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m);
  const t = s => p.evaluate(s);
  for (const v of ['bdf', 'bisous', 'selva']) {
    await t(`quickSetup();setVenue('${v}');ST.role='bar';S.bar()`); await p.waitForTimeout(200);
    const h = await t(`document.querySelector('#screen h1')?.textContent`); const bars = await t(`POIS.filter(o=>o.bar).map(o=>o.n)`);
    ok(bars.includes(h), `${v} : le barman voit un bar du lieu (${h})`);
    await t(`ST.role='staff';S.map()`); await p.waitForTimeout(200);
    const txt = await t(`document.querySelector('#screen').innerText`);
    ok(!/Bar Ouest/.test(txt) || v === 'bdf', `${v} : carte agent sans « Bar Ouest » codé en dur`);
    await t(`closeDash&&document.querySelector('#dash')&&closeDash();D.ev='${v === 'bdf' ? 'bdf' : v}';openDash('bars')`); await p.waitForTimeout(300);
    const dt = await t(`document.querySelector('#dash')?.innerText||''`);
    ok(bars.every(n => dt.includes(n)), `${v} : tableau de bord bars = bars du lieu`);
    await t(`document.querySelector('#dash')&&closeDash()`);
    await t(`quickSetup();setVenue('${v}');V.map();V.eventSheet()`); await p.waitForTimeout(200);
    ok(!(await t(`document.body.innerText.includes('Kalia b2b Remo')`)) || v === 'bdf', `${v} : fiche événement générique`);
    await t(`V.recap()`); await p.waitForTimeout(200);
    const rz = await t(`ZONES.slice(0,1).map(z=>z.n)[0]`); ok(await t(`document.querySelector('#screen').innerText.includes(${JSON.stringify(rz)})`), `${v} : récap utilise les zones du lieu`);
  }
  await t(`setVenue('bdf');quickSetup();V.map();ST.walking=1`);
  await t(`V.goTo(NODES.S,'test');setVenue('bisous');V.map()`); await p.waitForTimeout(300);
  ok(await t(`!walking`), 'changement de lieu : marche arrêtée');
  ok(await t(`ST.lang==='fr'`), 'langue par défaut : français');
  await t(`quickSetup();window._a=JSON.stringify(myAv2());V.avatarEditor(null)`); await p.waitForTimeout(200);
  await p.click('[data-t="bottom"]'); await p.click('[data-k="bottom"][data-v="shorts"]'); await p.click('#bk'); await p.waitForTimeout(300);
  ok(await t(`JSON.stringify(ST.me.av2)===window._a`), 'avatar : brouillon annulé si on quitte sans enregistrer');
  await t(`quickSetup();setVenue('bdf');ST.friends=['lea'];V.map()`); await t(`document.querySelector('[data-p="near"]')?.click()`); await p.waitForTimeout(400);
  const nt = await t(`document.querySelector('.push,.notif')?.innerText||''`); ok(!/Yanis/.test(nt) || await t(`FRIENDS.some(f=>f.id==='yanis')`), 'push « ami arrivé » = ami existant : ' + nt.slice(0, 60).replace(/\n/g, ' '));
  await t(`quickSetup();setVenue('selva');applyTemplate('festival');V.map()`); ok(!(await t(`!!document.querySelector('[data-id="tent"]')`)), 'tente cachée hors camping');
  await t(`setVenue('bisous')`); ok(await t(`presentAt(150)===0 && presentAt(300)>0`), 'Bisous : 0 présent avant ouverture (3h30)');
  await t(`setVenue('bdf')`);
  await t(`quickSetup();ST.theme='dark';V.settings()`); await p.waitForTimeout(200);
  const c = await t(`getComputedStyle(document.querySelector('#screen .row .t')).color`); ok(c !== 'rgb(26, 29, 46)', 'thème sombre : texte clair (' + c + ')');
  ok(errs.length === 0, 'erreurs JS : ' + (errs.join(' | ') || 'aucune'));
  await b.close();
})();
