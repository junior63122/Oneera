// Fluidité mesurée : images/s et tâches longues sur la carte, CPU ralenti ×4 (≈ téléphone milieu de gamme), au repos et en glissant
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage();
  const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.CPU || 4) });
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  await p.evaluate(`quickSetup();ST.tourDone=true;ST.introSeen={bdf:1};V.map()`); await p.waitForTimeout(2500);
  const measure = async (label, act) => {
    await p.evaluate(() => { window.__f = []; window.__lt = 0; const po = new PerformanceObserver(l => { l.getEntries().forEach(e => { window.__lt += e.duration > 50 ? 1 : 0; }); }); try { po.observe({ entryTypes: ['longtask'] }); } catch (_) {} window.__po = po; let last = performance.now(); const loop = (t) => { window.__f.push(t - last); last = t; if (window.__f.length < 100000) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    await act();
    const r = await p.evaluate(() => { const f = window.__f.slice(5); window.__f = [1e9]; const s = [...f].sort((a, b) => a - b); const fps = 1000 / (f.reduce((a, c) => a + c, 0) / f.length); return { fps: fps.toFixed(0), p95ms: s[Math.floor(s.length * .95)].toFixed(0), jank: f.filter(x => x > 50).length, long: window.__lt }; });
    console.log(label.padEnd(28), `${r.fps} img/s · image P95 ${r.p95ms} ms · saccades >50 ms : ${r.jank} · tâches longues : ${r.long}`);
  };
  const box = await p.locator('#mv').boundingBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await measure('carte au repos (4 s)', () => p.waitForTimeout(4000));
  await measure('glisser la carte (4 s)', async () => { for (let k = 0; k < 4; k++) { await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 0; i < 20; i++) { await p.mouse.move(cx + (k % 2 ? -1 : 1) * i * 6, cy + i * 3); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(150); } });
  await measure('zoom molette (3 s)', async () => { for (let i = 0; i < 12; i++) { await p.mouse.move(cx, cy); await p.mouse.wheel(0, i % 6 < 3 ? -120 : 120); await p.waitForTimeout(200); } });
  await measure('ouvrir/fermer fiches (4 s)', async () => { for (let i = 0; i < 3; i++) { await p.evaluate(`V.friendsTab ? 0 : 0`); await p.click('[data-tab="friends"], #nav [data-v="friends"]').catch(() => {}); await p.waitForTimeout(500); await p.evaluate(`V.map()`); await p.waitForTimeout(700); } });
  const dom = await p.evaluate(() => ({ nodes: document.getElementsByTagName('*').length, markers: MV ? MV.markers.size : 0, fxCanvas: [...document.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height).join(',') }));
  console.log('DOM', JSON.stringify(dom)); await b.close();
})();
