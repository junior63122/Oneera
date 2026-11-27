const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 560 }, deviceScaleFactor: 1 });
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  const items = JSON.parse(process.argv[3] || '[]');
  await p.evaluate((items) => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#E9ECF5;display:flex;gap:8px;padding:8px'; items.forEach(([l, c]) => { const e = document.createElement('div'); e.style.cssText = 'background:#fff;border-radius:12px;font:600 13px sans-serif;text-align:center;overflow:hidden;width:340px;height:540px'; e.innerHTML = `<div style="height:510px;overflow:hidden"><img src="${av2URI(c, 'legs')}" style="width:340px;height:auto;margin-top:-210px;transform:scale(1.9);transform-origin:50% 100%"></div>${l}`; d.append(e); }); document.body.append(d); }, items);
  await p.waitForTimeout(600); await p.screenshot({ path: process.argv[2] }); await b.close(); })();
