const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(1000);
  const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now(); await p.evaluate(() => V.avatarPick(() => {}, false)); await p.waitForSelector('#big svg'); const open = Date.now() - t0;
  const fps = (ms) => p.evaluate((ms) => new Promise(res => { const ts = []; let on = true; const f = t => { ts.push(t); if (on) requestAnimationFrame(f); }; requestAnimationFrame(f); setTimeout(() => { on = false; const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b); res({ fps: Math.round((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000)), p95: Math.round(d[Math.floor(d.length * .95)]), worst: Math.round(d[d.length - 1]) }); }, ms); }), ms);
  await p.waitForTimeout(3500); const idle = await fps(3000);
  const tabs = {}; for (const t of ['hair', 'top', 'cost', 'acc', 'face', 'shoes']) { const s = Date.now(); await p.click(`#tb button[data-t="${t}"]`); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); tabs[t] = Date.now() - s; }
  const s1 = Date.now(); await p.click('#tb button[data-t="top"]'); await p.click('.stTiles [data-k="top"]:nth-child(2)'); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); const pick = Date.now() - s1;
  const s2 = Date.now(); await p.fill('#sq', 'cheveux'); await p.waitForFunction(() => document.querySelector('[data-sr]')); const search = Date.now() - s2;
  const tiles = await p.evaluate(() => document.querySelectorAll('#bd svg').length);
  console.log(JSON.stringify({ ouverture_ms: open, animation_au_repos: idle, onglets_ms: tabs, choix_ms: pick, recherche_ms: search, vignettes_svg: tiles }));
  await b.close(); })();
