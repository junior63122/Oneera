// Rendu image par image du portail (entrée depuis le logo) pour contrôle visuel, de jour et de nuit.
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '/tmp/portal';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  for (const [tag, mode] of [['jour', 'day'], ['nuit', 'night']]) {
    await p.evaluate((mode) => { quickSetup(); ST.tourDone = true; ST.introSeen = { bdf: 1 }; ST.mapMode = mode; V.map(); MV.center([50, 50], MV.minS); }, mode); await p.waitForTimeout(1500);
    const us = [0, .06, .12, .18, .24, .3, .4, .5, .62, .74, .86, 1];
    const shots = await p.evaluate(async (us) => { const W = SCREEN.clientWidth, H = SCREEN.clientHeight, pal = portalPalette(), seaImg = pal.sea ? pImg(pal.sea) : null, map = pImg(VENUE.map.src);
      await new Promise(r => setTimeout(r, 300)); const out = [];
      for (const u of us) { const c = document.createElement('canvas'); c.width = W; c.height = H; portalFrame(c.getContext('2d'), W, H, u, { mode: 'logo', pal, map, seaImg, rect: portalMapRect() }); out.push(c.toDataURL('image/jpeg', .8)); }
      return out; }, us);
    require('fs').writeFileSync(`${OUT}_${tag}.json`, JSON.stringify(shots));
    await p.screenshot({ path: `${OUT}_${tag}_carte.png` });
  }
  console.log('erreurs', errs); await b.close(); })();
