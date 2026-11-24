const { chromium } = require('playwright'); const OUT = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/rev/st_';
(async () => { const b = await chromium.launch(); const e = [];
  for (const [vw, vh] of [[390, 664], [360, 640]]) {
    const p = await (await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage(); p.on('pageerror', x => e.push(x.message));
    await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s);
    await t(`quickSetup();V.avatarPick(null,true)`); await p.waitForTimeout(600);
    for (const tab of ['hair', 'top', 'bottom', 'shoes', 'body', 'face', 'acc']) { await p.click(`[data-t="${tab}"]`); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}${vw}_${tab}.png` }); }
    await p.click('[data-g="f"]'); await p.click('[data-t="hair"]'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}${vw}_fhair.png` });
    await p.click('[data-t="top"]'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}${vw}_ftop.png` });
    await p.click('#go'); await t(`ST.introSeen={bdf:1};V.map();MV.flyTo(ST.me.pos,.8,10)`); await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}${vw}_map.png` });
  }
  console.log(e); await b.close(); })();
