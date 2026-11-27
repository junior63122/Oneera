const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 940 } });
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  const items = JSON.parse(require('fs').readFileSync(process.argv[3], 'utf8'));
  await p.evaluate((items) => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#E9ECF5;display:flex;flex-wrap:wrap;gap:5px;padding:5px'; items.forEach(([l, c, v]) => { const e = document.createElement('div'); e.style.cssText = 'background:#fff;border-radius:10px;font:600 10px sans-serif;text-align:center;width:180px'; e.innerHTML = `<img src="${av2URI(c, v || 'full')}" style="width:180px;height:440px;object-fit:contain"><br>${l}`; d.append(e); }); document.body.append(d); }, items);
  await p.waitForTimeout(700); await p.screenshot({ path: process.argv[2] }); await b.close(); })();
