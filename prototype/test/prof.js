const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage();
  const cdp = await c.newCDPSession(p);
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  await p.evaluate(`quickSetup();ST.tourDone=true;ST.introSeen={bdf:1};V.map()`); await p.waitForTimeout(2500);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await p.waitForTimeout(4000);
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n]));
  const counts = new Map(); profile.samples.forEach(s => counts.set(s, (counts.get(s) || 0) + 1));
  for (const [id, n] of counts) { const nd = byId.get(id); const k = `${nd.callFrame.functionName || '(anon)'} :${nd.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + n); }
  const tot = profile.samples.length; [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log((100 * v / tot).toFixed(1).padStart(5) + '%  ' + k));
  // métriques de rendu
  await cdp.send('Performance.enable'); const m1 = (await cdp.send('Performance.getMetrics')).metrics; await p.waitForTimeout(2000); const m2 = (await cdp.send('Performance.getMetrics')).metrics;
  const g = (m, k) => (m.find(x => x.name === k) || {}).value; ['LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration'].forEach(k => console.log(k, ((g(m2, k) - g(m1, k)) / 2).toFixed(3), '/s'));
  await b.close();
})();
