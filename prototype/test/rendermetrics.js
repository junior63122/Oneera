// Répartition du coût de rendu pendant 3 s de carte ouverte (processeur ralenti ×4) : styles, mise en page, scripts.
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage();
  await p.goto((process.argv[2] || 'http://127.0.0.1:8090/local.html') + '?nouveau'); await p.waitForTimeout(800);
  await p.evaluate(() => { quickSetup(); ST.tourDone = true; ST.perms.loc = 'app'; ST.introSeen = { bdf: 1 }; V.map(); }); await p.waitForTimeout(3000);
  const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
  const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const a = await get(); const fr = await p.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); })); const z = await get();
  const d = k => Math.round((z[k] - a[k]) * 1000);
  console.log({ 'i/s': Math.round(fr), styles_ms: d('RecalcStyleDuration'), styles_n: z.RecalcStyleCount - a.RecalcStyleCount, layout_ms: d('LayoutDuration'), layout_n: z.LayoutCount - a.LayoutCount, script_ms: d('ScriptDuration'), tâches_ms: d('TaskDuration'), noeuds: z.Nodes, couches: undefined });
  const info = await p.evaluate(() => ({ marqueurs: document.querySelectorAll('#screen .mk').length, imgs: document.querySelectorAll('#screen img').length, flous: [...document.querySelectorAll('#screen *')].filter(e => { const s = getComputedStyle(e); return s.backdropFilter !== 'none' || (s.filter && s.filter !== 'none'); }).length, animations: document.getAnimations().length }));
  console.log(info); await b.close(); })();
