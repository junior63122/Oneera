const { chromium } = require('playwright'); const OUT = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/rev/av6_';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage(); const e = []; p.on('pageerror', x => e.push(x.message)); p.on('requestfailed', r => e.push('REQ ' + r.url()));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s);
  await t(`quickSetup();ST.introSeen={bdf:1};ST.mapMode='day';V.map()`); await p.waitForTimeout(1200); await t(`MV.flyTo(ST.me.pos,.75,10)`); await p.waitForTimeout(900); await p.screenshot({ path: OUT + 'map.png' });
  await t(`ST.mapMode='night'`); await p.waitForTimeout(900); await p.screenshot({ path: OUT + 'night.png' });
  await t(`ST.mapMode='day';ST.map3d=true;V.map()`); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '3d.png' });
  await t(`ST.map3d=false;V.avatarPick(null,true)`); await p.waitForTimeout(800); await p.screenshot({ path: OUT + 'pick.png' });
  await t(`V.map();V.friendSheet('lea')`); await p.waitForTimeout(900); await p.screenshot({ path: OUT + 'friend.png' });
  console.log(e); await b.close(); })();
