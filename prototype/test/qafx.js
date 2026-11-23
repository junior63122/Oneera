// Tests de la carte vivante
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(800);
  const ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m); const t = s => p.evaluate(s);
  // canevas présents et animés
  await t(`quickSetup();ST.introSeen={bdf:1};ST.mapMode='night';V.map()`); await p.waitForTimeout(500);
  const px = () => t(`(()=>{const c=MV.fx,g=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0;for(let i=0;i<g.length;i+=397)h=(h*31+g[i])%1000003;return h})()`);
  const a1 = await px(); await p.waitForTimeout(400); const a2 = await px(); ok(a1 !== a2, 'carte animée : le calque change d’une image à l’autre');
  ok(await t(`MV.base.style.filter.includes('brightness')`), 'nuit : plan éclairé différemment');
  await t(`ST.mapAnim=false`); await p.waitForTimeout(300); const b1 = await px(); await p.waitForTimeout(400); const b2 = await px(); ok(b1 === b2, 'carte animée désactivée : image fixe (batterie)'); await t(`ST.mapAnim=true`);
  await t(`ST.mapMode='day'`); await p.waitForTimeout(200); ok(await t(`!MV.base.style.filter.includes('brightness')`), 'jour : plan sans assombrissement');
  await t(`ST.mapMode='auto';ST.clock=14*60`); await p.waitForTimeout(200); ok(await t(`nightK((20*60+nowMin())%1440)===0`), 'auto 14 h = jour'); await t(`ST.clock=21*60`); ok(await t(`(k=>k>0&&k<1)(nightK((20*60+nowMin())%1440))`), 'auto 21 h = crépuscule progressif'); await t(`ST.clock=23*60+42`);
  // foule proportionnelle à l'affluence
  ok(await t(`occAt(ZONES[0], 290) > occAt(ZONES[0], 30)`), 'foule : plus de monde au pic qu’en début de soirée (même modèle que le tableau de bord)');
  // descente « vue des Dieux » : une fois par lieu
  await t(`ST.introSeen={};V.map()`); await p.waitForTimeout(150); ok(await t(`!!MV.intro && !!document.querySelector('.gtx')`), 'arrivée : descente depuis les nuages');
  await p.waitForTimeout(2700); ok(await t(`!MV.intro && MV.ov.style.opacity===''`), 'arrivée : marqueurs visibles à la fin');
  await t(`V.friendsTab();V.map()`); await p.waitForTimeout(150); ok(await t(`!MV.intro`), 'retour sur la carte : pas de nouvelle descente');
  // changement de lieu avec transition
  await t(`V.eventSheet()`); await p.waitForTimeout(300); await p.locator('[data-ven="bisous"]').click(); await p.waitForTimeout(250); ok(await t(`VENUE.id==='bdf' && !!MV.outro`), 'changement de lieu : les nuages se referment');
  await p.waitForTimeout(700); ok(await t(`VENUE.id==='bisous' && !!MV.intro`), 'changement de lieu : arrivée sur Bisous Bisous');
  await p.waitForTimeout(2500); ok(await t(`MV.base.src.includes('bisous_a.webp')`), 'club : plan détouré sur les nuages');
  // réglages d'ambiance
  await t(`V.layers()`); await p.waitForTimeout(300); await p.locator('[data-amb="night"]').click(); ok(await t(`ST.mapMode==='night'`), 'calques : ambiance nuit');
  await p.locator('#anim').click(); ok(await t(`ST.mapAnim===false`), 'calques : carte fixe'); await p.locator('#anim').click(); await p.locator('[data-amb="auto"]').click();
  // secours : l'agent part → ambulance sur toutes les cartes
  await t(`closeSheet(true);setVenue('bdf');ST.introSeen.bdf=1;V.map();V.report()`); await p.waitForTimeout(300);
  await t(`V.reportDetail('medical')`); await p.waitForTimeout(300); await p.locator('#send').click(); await p.waitForTimeout(500);
  const rid = await t(`ST.reports.find(r=>r.mine&&r.cat==='medical').id`);
  await t("ST.role='staff';S.map();S.alert(" + rid + ")"); await p.waitForTimeout(400);
  for (const lab of ['Je prends en charge', 'Je suis en route']) { const bt = p.locator('#screen button, .sheet button', { hasText: lab }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(500); } }
  ok(await t(`FX.vehicles.some(v=>v.rid===RID&&v.kind==='amb')`.replace('RID',rid)), 'secours : ambulance lancée quand l’agent part');
  await t(`ST.role='visitor';V.map()`); await p.waitForTimeout(300); ok(await t(`FX.vehicles.length>0`), 'visiteur : il voit les secours arriver');
  await t(`ST.reports.find(r=>r.id===RID).status='Résolu'`.replace('RID',rid)); await p.waitForTimeout(200); ok(await t(`!FX.vehicles.some(v=>v.rid===RID)`.replace('RID',rid)), 'alerte résolue : ambulance retirée');
  // feu d'artifice
  await p.click('[data-p="fw"]'); await p.waitForTimeout(900); ok(await t(`FX.rockets.length>=10`), 'feu d’artifice lancé depuis le panneau');
  // tableau de bord : flux animés
  await t(`D.ev='bdf';D.layers.flow=true;openDash('global')`); await p.waitForTimeout(800); ok(await t(`!!document.querySelector('#dash canvas.fx')`), 'tableau de bord : carte vivante');
  ok(errs.length === 0, 'erreurs JS : ' + (errs.join(' | ') || 'aucune'));
  // mouvement réduit (accessibilité)
  const c = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1360, height: 900 } }); const q = await c.newPage(); await q.goto('http://127.0.0.1:8090/local.html'); await q.waitForTimeout(600);
  await q.evaluate(`quickSetup();ST.introSeen={};V.map()`); await q.waitForTimeout(200); ok(await q.evaluate(`!MV.intro`), 'mouvement réduit : pas d’animation d’entrée');
  await b.close();
})();
