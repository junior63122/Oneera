const { chromium, devices } = require('playwright');
const OUT = process.argv[2];
(async () => { const b = await chromium.launch();
  for (const mode of ['day', 'night']) {
    const c0 = await b.newContext({ ...devices['iPhone 14'] }); const p0 = await c0.newPage(); await p0.goto('http://127.0.0.1:8090/local.html?nouveau'); await p0.waitForTimeout(400);
    await p0.evaluate((mode) => { quickSetup(); ST.tourDone = true; ST.introSeen = { bdf: 1, bisous: 1, selva: 1 }; ST.mapMode = mode; V.map(); emit(); }, mode); await p0.waitForTimeout(1500);
    const state = await c0.storageState(); await c0.close();
    const vp = devices['iPhone 14'].viewport; const c = await b.newContext({ ...devices['iPhone 14'], storageState: state, recordVideo: { dir: OUT + '/' + mode, size: { width: vp.width, height: vp.height } } }); const p = await c.newPage();
    await p.addInitScript(() => { document.documentElement.style.background = '#010922'; });
    await p.goto('http://127.0.0.1:8090/local.html?portal=1'); await p.waitForTimeout(6200);
    await p.evaluate(() => document.querySelectorAll('.tour').forEach(e => e.remove()));
    // la carte vit : on recule pour voir le site dans les nuages, puis on revient
    await p.evaluate(() => MV.flyTo([50, 50], MV.minS, 1600)); await p.waitForTimeout(3800);
    await p.evaluate(() => MV.flyTo([47, 52], VENUE.zoom * 1.2, 1600)); await p.waitForTimeout(3000);
    // changement de lieu : remontée puis descente
    await p.evaluate(() => FX.leave(() => { setVenue('selva'); quickSetup(); V.map(); })); await p.waitForTimeout(5600);
    await c.close(); }
  await b.close(); })();
