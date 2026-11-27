const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 820 }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  const items = await p.evaluate(() => Object.entries(typeof FRIEND_AV2 !== 'undefined' ? FRIEND_AV2 : {}).slice(0, 7));
  const more = [['hoodie', { g:'m', top:'hoodie', topC:3, bottom:'joggers', bottomC:1, shoes:'chunky', skin:4 }], ['robe', { g:'f', outfit:'midi', outfitC:6, shoes:'boots', shoesC:1, skin:6, hair:'long' }], ['salopette', { g:'f', outfit:'overalls', outfitC:4, shoes:'canvas', skin:2 }]];
  await p.evaluate((items) => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#E9ECF5;display:flex;flex-wrap:wrap;gap:6px;padding:8px'; items.forEach(([l,c]) => { const e = document.createElement('div'); e.style.cssText='background:#fff;border-radius:12px;padding:4px;font:600 11px sans-serif;text-align:center'; e.innerHTML = `<img src="${av2URI(c,'full')}" style="height:390px;width:265px;object-fit:contain"><br>${l}`; d.append(e); }); document.body.append(d); }, [...items, ...more]);
  await p.waitForTimeout(700); await p.screenshot({ path: OUT }); console.log(errs); await b.close(); })();
