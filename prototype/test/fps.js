const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
 await p.goto('http://127.0.0.1:8090/local.html'); await p.waitForTimeout(800);
 for (const [n, s] of [['carte nuit', `quickSetup();ST.introSeen={bdf:1};ST.mapMode='night';V.map()`], ['carte jour', `ST.mapMode='day';V.map()`], ['club nuit', `setVenue('bisous');ST.introSeen.bisous=1;ST.mapMode='night';V.map()`], ['tableau de bord', `setVenue('bdf');D.ev='bdf';D.layers.flow=true;openDash('global')`]]) {
  await p.evaluate(s); await p.waitForTimeout(600);
  const r = await p.evaluate(() => new Promise(res => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = now => { worst = Math.max(worst, now - last); last = now; n++; if (now - t0 < 3000) requestAnimationFrame(f); else res({ fps: Math.round(n / 3), worst: Math.round(worst) }); }; requestAnimationFrame(f); }));
  console.log(n, r.fps + ' img/s', 'pire image ' + r.worst + ' ms');
 }
 await b.close(); })();
