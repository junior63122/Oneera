const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(1000);
  const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.evaluate(() => V.avatarPick(() => {}, false)); await p.waitForTimeout(1200);
  const out = {};
  for (const [tab, sel] of [['top', '.stTiles [data-k="top"]'], ['hair', '.stTiles [data-k="hair"]'], ['cost', '.stTiles [data-k="costume"]']]) { await p.click(`#tb button[data-t="${tab}"]`); await p.waitForTimeout(3000); const ms = [];
    for (let i = 0; i < 12; i++) { ms.push(await p.evaluate((sel) => new Promise(res => { const btns = document.querySelectorAll(sel); const t = performance.now(); btns[1 + (Math.random() * (btns.length - 1) | 0)].click(); requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t))); }), sel)); await p.waitForTimeout(350); }
    ms.sort((a, b) => a - b); out[tab] = { median: Math.round(ms[6]), p90: Math.round(ms[10]) }; }
  console.log(JSON.stringify(out)); await b.close(); })();
