const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 420 } });
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#7B6BEB;display:flex;gap:6px;padding:6px'; d.innerHTML = [{ g: 'm', pose: 'wave', top: 'jacket', topC: 5, skin: 7, hair: 'afro', hairC: 0 }, { g: 'f', pose: 'wave', top: 'tank', skin: 2, hair: 'long' }].map(c => `<div style="width:480px;height:400px">${avatar2SVG(c, { live: true, pedestal: false, vb: '20 -30 180 260', style: 'width:100%;height:100%' })}</div>`).join(''); document.body.append(d); });
  for (const [i, t] of [0, 220, 450, 680].entries()) { if (i) await p.waitForTimeout(t - [0, 220, 450, 680][i - 1]); await p.screenshot({ path: `${process.argv[2]}_${i}.png` }); }
  await b.close(); })();
