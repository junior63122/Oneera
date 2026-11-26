const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
 const errs=[]; p.on('pageerror', e => errs.push(e.message));
 await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(800);
 await p.evaluate(`D.ev='bdf';openDash('global')`); await p.waitForTimeout(1200);
 console.log(await p.evaluate(`(()=>{const c=document.querySelector('#dash canvas.fx');const img=document.querySelector('#dash img.base');return JSON.stringify({fx:!!c, filter: img&&img.style.filter, nk: nightK((20*60+nowMin())%1440), mode: mapMode()})})()`));
 console.log(errs); await b.close(); })();
