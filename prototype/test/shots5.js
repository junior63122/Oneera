const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/v5_';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800); const t = s => p.evaluate(s);
  await t(`quickSetup();ST.introSeen={bdf:1};ST.mapMode='day';V.map()`); await p.waitForTimeout(900);
  const clip = await t(`(()=>{const r=document.querySelector('#screen').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height}})()`);
  const sh = n => p.screenshot({ path: OUT + n + '.png', clip });
  await t(`MV.zoomBy(1.3)`); await p.waitForTimeout(500); await sh('map'); await t(`V.meSheet()`); await p.waitForTimeout(400); await sh('me');
  await t(`V.report()`); await p.waitForTimeout(400); await sh('report'); await t(`V.shareSettings()`); await p.waitForTimeout(400); await sh('share');
  await t(`V.artist('Kalia b2b Remo')`); await p.waitForTimeout(400); await sh('artist'); await t(`closeSheet();V.notifs()`); await p.waitForTimeout(400); await sh('notifs');
  await t(`D.ev='bdf';openDash('moder')`); await p.waitForTimeout(500); await p.screenshot({ path: OUT + 'dmoder.png' }); await t(`openDash('create')`); await p.waitForTimeout(500); await p.screenshot({ path: OUT + 'dcreate.png' });
  await b.close();
})();
