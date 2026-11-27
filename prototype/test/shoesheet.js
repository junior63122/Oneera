const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/shoes';
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 760 }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  const shoes = ['sneakers','canvas','chunky','sandals','boots','loafers'];
  const items = [...shoes.map(s => [s+' short', { g:'f', bottom:'shorts', bottomC:4, shoes:s, shoesC:2 }]), ...shoes.map(s => [s+' jean', { g:'m', bottom:'jeans', bottomC:1, shoes:s, shoesC:1 }])];
  await p.evaluate((items) => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#E9ECF5;display:flex;flex-wrap:wrap;gap:6px;padding:8px'; items.forEach(([l,c]) => { const e = document.createElement('div'); e.style.cssText='background:#fff;border-radius:12px;padding:4px;font:600 11px sans-serif;text-align:center'; e.innerHTML = `<img src="${av2URI(c,'legs')}" style="height:330px;width:215px;object-fit:contain"><br>${l}`; d.append(e); }); document.body.append(d); }, items);
  await p.waitForTimeout(600); await p.screenshot({ path: OUT + '.png' }); console.log(errs); await b.close(); })();
