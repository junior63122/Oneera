// Planche de contrôle visuel des avatars : chaque bas / tenue en vue jambes et pieds, hauts, barbes, bijoux.
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/avsheet';
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
  const sheet = async (name, items) => { await p.evaluate((items) => { document.querySelector('#avq')?.remove(); const d = document.createElement('div'); d.id = 'avq'; d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#E9ECF5;display:flex;flex-wrap:wrap;gap:6px;padding:8px;align-content:flex-start;overflow:hidden';
      items.forEach(([lab, cfg, view, h]) => { const c = document.createElement('div'); c.style.cssText = 'background:#fff;border-radius:12px;padding:4px;display:flex;flex-direction:column;align-items:center;font:600 11px sans-serif'; c.innerHTML = `<img src="${av2URI(cfg, view || 'full')}" style="height:${h || 240}px;max-width:200px"><span>${lab}</span>`; d.append(c); }); document.body.append(d); }, items); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}_${name}.png` }); };
  const bottoms = ['cargo', 'jeans', 'flare', 'chinos', 'bermuda', 'shorts', 'skirt', 'maxi', 'joggers'];
  const outfits = ['suit', 'overalls', 'jumpsuit', 'slip', 'midi'];
  await sheet('bas', [...bottoms.map(x => [x + ' F', { g: 'f', bottom: x, bottomC: 4 }]), ...bottoms.map(x => [x + ' H', { g: 'm', bottom: x, bottomC: 6 }])].map(([l, c]) => [l, c, 'full', 300]));
  await sheet('pieds', [...bottoms, ...outfits].map(x => [x, bottoms.includes(x) ? { g: 'm', bottom: x, bottomC: 5 } : { g: 'm', outfit: x, outfitC: 5 }, 'legs', 210]));
  await sheet('tenues', [...outfits.map(x => [x + ' F', { g: 'f', outfit: x, outfitC: 5, jewel: ['necklace'] }]), ...outfits.map(x => [x + ' H', { g: 'm', outfit: x, outfitC: 5, jewel: ['necklace'] }])].map(([l, c]) => [l, c, 'full', 300]));
  await sheet('barbes', ['none', 'stubble', 'short', 'mustache', 'goatee'].flatMap(bd => [[bd, { g: 'm', beard: bd, skin: 5 }, 'head', 170], [bd + ' clair', { g: 'm', beard: bd, skin: 1, hairC: 5 }, 'head', 170]]));
  console.log('erreurs', errs); await b.close(); })();
