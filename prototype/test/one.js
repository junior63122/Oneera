const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(500);
  await p.evaluate(() => V.welcome()); await p.waitForTimeout(500);
  await p.locator('#screen').screenshot({ path: 'w.png' });
  console.log(await p.evaluate(() => { const g = document.querySelector('#google'); const r = g.getBoundingClientRect(); return JSON.stringify([r.width, r.height, g.outerHTML.slice(0, 200), document.querySelector('#phone').getBoundingClientRect().height]); }));
  await b.close(); })();
