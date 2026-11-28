// Fenêtres (feuilles) : taille raisonnable, rien ne dépasse, et les 3 façons de fermer marchent
// (toucher à côté, glisser la poignée vers le bas, touche Échap). iPhone SE et iPhone 14.
const { chromium, devices } = require('playwright');
const U = process.argv[2] || 'http://127.0.0.1:8090/local.html';
const OPEN = [
  ['Signaler', 'V.report()'], ['Signalement : aide', "V.reportDetail('medical')"], ['Programme', 'V.programme()'], ['Calques', 'V.layers()'],
  ['Partage', 'V.shareSettings()'], ['Moi', 'V.meSheet()'], ['Ami', 'V.friendSheet(FRIENDS[0].id)'], ['Événement', 'V.eventSheet && V.eventSheet()'],
  ['Thème', 'V.themeSheet()'], ['Langue', 'V.langSheet()'], ['Recherche', 'V.search()'], ['Lieu (bar)', 'V.poiSheet(POIS.find(o => o.bar).id)'],
  ['Lieu (scène)', "V.poiSheet(POIS.find(o => o.cat === 'scene').id)"], ['Lieu (premier)', 'V.poiSheet(POIS[0].id)'], ['Lieu (dernier)', 'V.poiSheet(POIS[POIS.length - 1].id)'],
  ['Rendez-vous', 'V.rdvSheet && V.rdvSheet()'], ['Notifications (préférences)', 'V.notifPrefs && V.notifPrefs()'], ['Partager', "V.shareSheet('Test')"],
];
(async () => { const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('FAIL ' + m); } };
  const errs = [];
  for (const d of ['iPhone SE', 'iPhone 14']) {
    const p = await (await b.newContext({ ...devices[d] })).newPage(); p.on('pageerror', e => errs.push(d + ' ' + e.message));
    await p.goto(U + '?nouveau'); await p.waitForTimeout(900);
    await p.evaluate(() => { if (!ST.account) quickSetup(); ST.tourDone = true; ST.perms.loc = 'app'; V.map(); }); await p.waitForTimeout(800);
    for (const [name, js] of OPEN) {
      for (const how of ['à côté', 'poignée', 'Échap']) {
        await p.evaluate(() => { closeSheet(true); document.querySelectorAll('.push,.toast').forEach(e => e.style.display = 'none'); });
        const opened = await p.evaluate((js) => { try { eval(js); } catch (e) { return 'err:' + e.message; } return !!document.querySelector('#screen .sheet'); }, js);
        if (opened !== true) { if (how === 'à côté') console.log(`—    ${d} · ${name} : ${opened === false ? 'pas une feuille (écran plein ou absent)' : opened}`); break; }
        await p.waitForTimeout(350);
        if (how === 'à côté') {
          const m = await p.evaluate(() => { const S = document.querySelector('#screen').getBoundingClientRect(), sh = document.querySelector('#screen .sheet'), r = sh.getBoundingClientRect(), body = sh.querySelector('.sbody');
            const over = [...sh.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width > 0 && (q.right > S.right + 1 || q.left < S.left - 1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.chips,.stTiles,[style*="overflow-x"],[style*="overflow:auto"]'); }).length;
            return { full: sh.classList.contains('full'), top: r.top - S.top, h: r.height, H: S.height, over, scroll: body.scrollHeight > body.clientHeight + 2, h2: !!sh.querySelector('h2,.h2') }; });
          ok(m.over === 0, `${d} · ${name} : ${m.over} élément(s) dépassent sur le côté`);
          ok(m.full || m.top >= 55, `${d} · ${name} : la feuille couvre le haut de l'écran (haut à ${Math.round(m.top)} px) sans être en plein écran`);
          ok(m.h2, `${d} · ${name} : pas de titre`);
          if (m.full) { ok(await p.evaluate(() => { const c = document.querySelector('#screen .sheet .sClose'); return !!c && getComputedStyle(c).display !== 'none'; }), `${d} · ${name} : plein écran sans bouton Fermer visible`); await p.click('#screen .sheet .sClose'); }
          else await p.mouse.click(30, 30); // zone hors feuille (en haut de l'écran)
        } else if (how === 'poignée') {
          const g = await p.$('#screen .sheet .grab'); const box = await g.boundingBox();
          await p.mouse.move(box.x + box.width / 2, box.y + 10); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2, box.y + 70, { steps: 4 }); await p.mouse.move(box.x + box.width / 2, box.y + 200, { steps: 6 }); await p.mouse.up();
        } else await p.keyboard.press('Escape');
        await p.waitForTimeout(450);
        const left = await p.evaluate(() => document.querySelectorAll('#screen .sheet, #screen .sheetBack').length);
        ok(left === 0, `${d} · ${name} : la fermeture « ${how} » ne ferme pas`);
      }
    }
  }
  ok(errs.length === 0, 'erreurs JS : ' + errs.join(' | '));
  console.log(`${n - f}/${n}`); await b.close(); })();
