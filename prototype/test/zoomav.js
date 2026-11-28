// Gros plans d'avatars (qualité du trait) : node zoomav.js <url> <sortie.png> '<json [[libellé,cfg],...]>'
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await p.goto(process.argv[2] + '?nouveau'); await p.waitForTimeout(800);
  await p.evaluate((items) => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#E9ECF5;display:flex;gap:8px;padding:8px'; items.forEach(([l, c, mode]) => { const e = document.createElement('div'); e.style.cssText = 'background:#fff;border-radius:12px;padding:4px;font:600 14px sans-serif;text-align:center;flex:1'; e.innerHTML = `<img src="${av2URI(c, mode || 'full')}" style="height:840px;width:100%;object-fit:contain"><div>${l}</div>`; d.append(e); }); document.body.append(d); }, JSON.parse(process.argv[4]));
  await p.waitForTimeout(900); await p.screenshot({ path: process.argv[3] }); await b.close(); })();
