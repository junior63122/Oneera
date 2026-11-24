// Plusieurs personnes au même endroit : toujours visibles
const { chromium } = require('playwright'); const OUT = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/rev/grp_';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage(); const e = []; p.on('pageerror', x => e.push(x.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  await t(`quickSetup();ST.introSeen={bdf:1};ST.mapMode='day';V.map()`); await p.waitForTimeout(900);
  const syn = k => `MapView.fan(Array.from({length:${k}},(_,i)=>({id:'p_x'+i,at:[50,50]})),MV)`;
  ok(await t(`(()=>{const r=${syn(2)},o=Object.values(r.off);return o.length===2&&Math.abs(o[0][0]-o[1][0])>=30&&!r.hide.size})()`), '2 personnes au même endroit : côte à côte, les 2 visibles');
  ok(await t(`(()=>{const r=${syn(4)},xs=Object.values(r.off).map(o=>o[0]).sort((a,b)=>a-b);return xs.length===4&&xs.every((x,i)=>!i||x-xs[i-1]>=28)&&!r.hide.size})()`), '4 personnes : en arc, toutes visibles, sans chevauchement');
  ok(await t(`(()=>{const r=${syn(10)};const bd=Object.values(r.badge)[0];return Object.keys(r.off).length===3&&r.hide.size===7&&bd&&bd.n===7&&bd.ids.length===10})()`), '10 personnes : 3 visibles + pastille « +7 » qui donne accès aux 10');
  // visuel : Léa et moi au même endroit, puis 5 personnes
  await t(`delete FR_STATE.lea.seq;FR_STATE.lea.pos=[...ST.me.pos];MV.flyTo(ST.me.pos,.8,10)`); await p.waitForTimeout(700); await p.screenshot({ path: OUT + '2.png' });
  await t(`['ines','tom','sami'].forEach(i=>{delete FR_STATE[i].seq;FR_STATE[i].pos=[...ST.me.pos]})`); await p.waitForTimeout(700); await p.screenshot({ path: OUT + '5.png' });
  ok(await t(`!!document.querySelector('.mk .grpb')`), 'pastille « +N » affichée sur le groupe');
  await t(`[...MV.markers.values()].find(x=>x.querySelector('.grpb'))._click()`); await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'sheet.png' });
  ok(/personnes ici/.test(await t(`document.querySelector('.sheet .sbody').innerText`)) && await t(`document.querySelectorAll('.sheet [data-u]').length`) >= 5, 'toucher la pastille : liste de tout le groupe');
  await p.click('#zz'); await p.waitForTimeout(900); ok(await t(`!document.querySelector('.sheet')`), '« Zoomer pour les voir » rapproche la carte');
  ok(e.length === 0, 'erreurs JS : ' + (e.join(' | ') || 'aucune')); console.log(`${n - f}/${n}`); await b.close(); })();
