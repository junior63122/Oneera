const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = [];
  const errs = []; const ck = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);
  // 1) scénario multi-rôles au bureau
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(600);
  const sc = p.locator('#screen'), panel = p.locator('#panel');
  await panel.locator('[data-p="skip"]').click(); await p.waitForTimeout(800);
  await sc.locator('#sos').click(); await sc.locator('[data-c="medical"]').click(); await sc.locator('[data-n="Malaise"]').click(); await sc.locator('#send').click(); await p.waitForTimeout(500);
  ck(await sc.locator('text=C’est envoyé').count() > 0, 'visiteur : alerte envoyée');
  await panel.locator('[data-p="role:staff"]').click(); await p.waitForTimeout(700);
  ck(await sc.locator('.mini[data-a]').count() > 0, 'agent : alerte visible sur sa carte');
  await sc.locator('.mini[data-a]').first().click(); await p.waitForTimeout(300); await sc.locator('#nx').click(); await p.waitForTimeout(500);
  ck(await sc.locator('.push').count() === 0, 'agent : pas de notification visiteur sur son téléphone');
  await panel.locator('[data-p="role:bar"]').click(); await p.waitForTimeout(600); await sc.locator('[data-sn="bar"]').click(); await p.waitForTimeout(400); await sc.locator('[data-p="Spritz"]').click(); await p.waitForTimeout(300);
  await panel.locator('[data-p="role:visitor"]').click(); await p.waitForTimeout(1500);
  ck(await sc.locator('.push').count() > 0, 'visiteur : notification « prise en charge » reçue au retour');
  ck(await sc.locator('#myr').count() > 0, 'visiteur : carte « Ton alerte » dans la barre du bas');
  await p.evaluate(() => V.poiSheet('barO')); await p.waitForTimeout(400); ck(await sc.locator('text=Épuisé').count() > 0, 'visiteur : Spritz « Épuisé » au Bar Ouest');
  // panneau : un clic = une action
  const before = await p.evaluate(() => ST.convos.lea.length); await panel.locator('[data-p="msg"]').click(); await p.waitForTimeout(300);
  ck(await p.evaluate(() => ST.convos.lea.length) === before + 1, 'panneau : « Message de Léa » ajoute 1 seul message');
  await panel.locator('[data-p="offline"]').click(); await p.waitForTimeout(300); ck(await p.evaluate(() => ST.offline) === true, 'panneau : « Pas de réseau » bascule une fois');
  await panel.locator('[data-p="offline"]').click(); await p.waitForTimeout(300);
  // orga -> communication -> téléphone
  await panel.locator('[data-p="role:dash"]').click(); await p.waitForTimeout(800); await p.locator('#dash .mi[data-v="comm"]').click(); await p.waitForTimeout(500); await p.locator('#dash #send').click(); await p.waitForTimeout(300);
  await p.locator('#dash #closeDash').click(); await p.waitForTimeout(1600); ck(await sc.locator('.push').count() > 0, 'orga → visiteur : la notification diffusée apparaît');
  // route ne traverse pas le VIP
  const rt = await p.evaluate(() => route('F', 'L').join('-')); ck(!/J|K/.test(rt), 'itinéraire vers le bar sans alcool hors VIP : ' + rt);
  // reset complet
  await panel.locator('[data-p="restart"]').click(); await p.waitForTimeout(500);
  ck(await p.evaluate(() => ST.notifs.length === 0 && ST.friends.length === 0 && ST.reports.filter(r => r.mine).length === 0), 'recommencer : état remis à zéro');
  // replay ticker leak
  await p.evaluate(() => { for (let i = 0; i < 5; i++) { openDash('replay'); openDash('global'); } }); await p.waitForTimeout(300);
  const tk = await p.evaluate(() => tickers.size); ck(tk <= 6, 'tableau de bord : pas de fuite de tickers (' + tk + ')'); await p.evaluate(() => closeDash());
  // 2) mobile plein écran
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }); m.on('pageerror', e => errs.push('mobile ' + e.message));
  await m.goto('http://127.0.0.1:8090/local.html'); await m.waitForTimeout(700);
  const h = await m.evaluate(() => document.querySelector('#screen').getBoundingClientRect().height); ck(h > 800, 'mobile : écran visible (' + Math.round(h) + ' px)');
  await m.screenshot({ path: 'mob_cam.png' }); await m.locator('#fab-panel').click(); await m.waitForTimeout(300); await m.screenshot({ path: 'mob_menu.png' });
  await m.locator('#mobileMenu [data-p="skip"]').click(); await m.waitForTimeout(900); await m.screenshot({ path: 'mob_map.png' });
  // 3) petite fenêtre : appui long au bon endroit
  const s = await b.newPage({ viewport: { width: 1366, height: 700 } }); s.on('pageerror', e => errs.push('small ' + e.message));
  await s.goto('http://127.0.0.1:8090/local.html'); await s.waitForTimeout(600); await s.locator('#panel [data-p="skip"]').click(); await s.waitForTimeout(800);
  const res = await s.evaluate(() => { const r = MV.host.getBoundingClientRect(); return { vw: MV.vw, w: r.width }; }); ck(Math.abs(res.vw - 368) < 2, 'fenêtre réduite : largeur carte correcte (' + res.vw + ')');
  console.log(out.join('\n')); console.log('ERREURS JS:', errs.length ? errs.join(' | ') : 'aucune');
  await b.close();
})();
