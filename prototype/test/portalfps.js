const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage();
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(400);
  await p.evaluate(() => { quickSetup(); ST.tourDone = true; ST.introSeen = { bdf: 1, selva: 1 }; V.map(); emit(); }); await p.waitForTimeout(1500);
  const cdp = await c.newCDPSession(p); for (const thr of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
    const r = await p.evaluate(() => new Promise(res => { const ts = []; let on = true; const f = t => { ts.push(t); if (on) requestAnimationFrame(f); }; requestAnimationFrame(f);
      FX.leave(() => { setVenue(VENUE.id === 'selva' ? 'bdf' : 'selva'); quickSetup(); V.map(); });
      setTimeout(() => { on = false; const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b); res({ fps: Math.round((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000)), p95: Math.round(d[Math.floor(d.length * .95)]), max: Math.round(d[d.length - 1]) }); }, 2800); }));
    console.log(`processeur ×${thr} : ${r.fps} img/s · image P95 ${r.p95} ms · pire ${r.max} ms`); await p.waitForTimeout(1500); }
  await b.close(); })();
