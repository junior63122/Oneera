// Créateur d'avatar v7 : genres séparés, éléments interchangeables, rendu sur la carte, bouton toujours visible
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); }; const e = [];
  for (const [vw, vh] of [[390, 844], [360, 640]]) {
    const p = await (await b.newContext({ viewport: { width: vw, height: vh }, isMobile: true, hasTouch: true })).newPage(); p.on('pageerror', x => e.push(x.message));
    await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s);
    await t(`quickSetup();V.avatarPick(null,true)`); await p.waitForTimeout(500);
    ok(await t(`(()=>{const r=document.querySelector('#go').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>0})()`), `${vw}×${vh} : bouton « C’est moi ! » visible`);
    ok(await t(`[...document.querySelectorAll('#tb button')].every(b=>b.getBoundingClientRect().height>=30)`), `${vw}×${vh} : onglets lisibles`);
    if (vw === 390) {
      await p.click('[data-t="hair"]'); const mh = await t(`[...document.querySelectorAll('[data-k="hair"]')].map(b=>b.dataset.v).join()`);
      await p.click('[data-g="f"]'); await p.click('[data-t="hair"]'); const fh = await t(`[...document.querySelectorAll('[data-k="hair"]')].map(b=>b.dataset.v).join()`);
      ok(mh.split(',').length >= 8 && fh.split(',').length >= 8 && mh !== fh, 'coupes : catalogue homme et catalogue femme distincts (' + mh.split(',').length + ' / ' + fh.split(',').length + ')');
      await p.click('[data-t="bottom"]'); const s0 = await t(`document.querySelector('#big').innerHTML.length`); await p.click('[data-k="bottom"][data-v="maxi"]'); await p.waitForTimeout(150);
      ok(await t(`document.querySelector('[data-k="bottom"][data-v="maxi"]').classList.contains('on')`) && await t(`document.querySelector('#big').innerHTML.length`) !== s0, 'changer le bas : jupe longue appliquée');
      await p.click('[data-t="top"]'); await p.click('[data-k="outfit"][data-v="midi"]'); await p.click('[data-t="bottom"]'); ok(/tenue une pièce/.test(await t(`document.querySelector('#bd').innerText`)), 'robe choisie : le bas est désactivé avec explication');
      await p.click('[data-t="shoes"]'); await p.click('[data-k="shoes"][data-v="boots"]'); ok(await t(`document.querySelector('[data-k="shoes"][data-v="boots"]').classList.contains('on')`), 'chaussures : bottines');
      await p.click('[data-t="acc"]'); await p.click('[data-k="glasses"][data-v="sun"]'); await p.click('[data-k="jewel"][data-v="hoops"]'); ok(await t(`document.querySelector('[data-k="jewel"][data-v="hoops"]').classList.contains('on')`), 'accessoires : solaires + créoles');
      await p.click('[data-t="body"]'); await p.click('[data-k="build"][data-v="courbes"]'); await p.click('[data-k="pose"][data-v="hip"]'); ok(await t(`document.querySelector('[data-k="pose"][data-v="hip"]').classList.contains('on')`), 'silhouette et posture');
      await p.click('#un'); ok(!(await t(`document.querySelector('[data-k="pose"][data-v="hip"]').classList.contains('on')`)), 'annuler');
      await p.click('#rd'); await p.click('#go'); await p.waitForTimeout(300); ok(await t(`ST.me.av2.g==='f'`), 'avatar enregistré');
      await t(`ST.introSeen={bdf:1};V.map()`); await p.waitForTimeout(1200);
      ok(await t(`(()=>{const m=MV.markers.get('p_me');const i=m&&m.querySelector('.bodyimg.av2');return !!i&&i.src.startsWith('data:image/svg')})()`), 'carte : mon avatar dessiné, en pied');
      ok(await t(`(()=>{const m=MV.markers.get('p_lea');return !!(m&&m.querySelector('.bodyimg.av2'))})()`), 'carte : avatars des amis en pied');
    }
  }
  ok(e.length === 0, 'erreurs JS : ' + (e.join(' | ') || 'aucune')); console.log(`${n - f}/${n}`); await b.close(); })();
