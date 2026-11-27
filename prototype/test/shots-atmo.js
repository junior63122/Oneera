const { chromium, devices } = require('playwright');
const D = process.argv[2] || '/tmp/atmo';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  const shots = [];
  for (const [mode, ven] of [['day', 'bdf'], ['night', 'bdf'], ['day', 'selva'], ['night', 'bisous']]) {
    await p.evaluate(([mode, ven]) => { quickSetup(); ST.tourDone = true; ST.introSeen = { bdf: 1, selva: 1, bisous: 1 }; if (VENUE.id !== ven) setVenue(ven); quickSetup(); ST.mapMode = mode; V.map(); }, [mode, ven]); await p.waitForTimeout(1800);
    await p.evaluate(() => MV.center([50, 50], MV.minS * 1.02)); await p.waitForTimeout(1200); const f1 = `${D}_${ven}_${mode}_loin.png`; await p.screenshot({ path: f1 }); shots.push(f1);
    await p.evaluate(() => MV.center([45, 50], (VENUE.zoom || .5) * 1.5)); await p.waitForTimeout(1200); const f2 = `${D}_${ven}_${mode}_pres.png`; await p.screenshot({ path: f2 }); shots.push(f2);
  }
  console.log(JSON.stringify(shots)); console.log('erreurs', errs); await b.close(); })();
