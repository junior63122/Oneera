const { chromium } = require('playwright'); const OUT = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/rev/sea_';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); const e = []; p.on('pageerror', x => e.push(x.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s);
  for (const [v, m] of [['bisous', 'night'], ['bisous', 'day'], ['selva', 'night'], ['selva', 'day']]) { await t(`quickSetup();setVenue('${v}');ST.introSeen={${v}:1};ST.mapMode='${m}';V.map();MV.zoomBy(.2)`); await p.waitForTimeout(900); await p.screenshot({ path: OUT + v + '_' + m + '.png' }); }
  console.log(e); await b.close(); })();
