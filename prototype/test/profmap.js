// Profil de l'ouverture de la carte : durée de V.map() et des longues tâches qui suivent (processeur ralenti ×4).
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage();
  await p.goto((process.argv[2] || 'http://127.0.0.1:8090/local.html') + '?nouveau'); await p.waitForTimeout(800);
  await p.evaluate(() => { quickSetup(); ST.tourDone = true; ST.perms.loc = 'app'; });
  const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.waitForTimeout(+(process.env.WAIT || 0)); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  const r = await p.evaluate(() => new Promise(res => { const lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => lt.push(Math.round(e.duration)))).observe({ type: 'longtask' });
    ST.introSeen = {}; const t = performance.now(); V.map(); const sync = Math.round(performance.now() - t); setTimeout(() => res({ sync, longtasks: lt }), 3500); }));
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n])); const dt = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id); const k = (n.callFrame.functionName || '(anon)') + ' ' + (n.callFrame.lineNumber + 1); self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
  console.log('V.map() synchrone :', r.sync, 'ms · longues tâches (ms) :', r.longtasks.join(', '));
  console.log([...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 1000).toFixed(0).padStart(5)} ms  ${k}`).join('\n'));
  await b.close(); })();
