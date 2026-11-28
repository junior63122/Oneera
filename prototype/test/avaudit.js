// Audit visuel complet des avatars : planches de toutes les tenues de métier (femme / homme), poses, coiffures,
// tirages « Surprends-moi » et parcours du studio (création → modification → enregistrement).
// Usage : node avaudit.js <url local.html> <dossier>
const { chromium, devices } = require('playwright'); const fs = require('fs');
const U = process.argv[2] || 'http://127.0.0.1:8090/local.html', OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(U + '?nouveau'); await p.waitForTimeout(900);
  const keys = await p.evaluate(() => Object.keys(AV2)); console.log('listes AV2 :', keys.join(' '));
  const sheet = async (name, items, h = 300) => { // items : [libellé, cfg]
    for (let i = 0; i < items.length; i += 24) {
      await p.evaluate(([items, h]) => { const old = document.querySelector('#avsheet'); if (old) old.outerHTML = ''; const d = document.createElement('div'); d.id = 'avsheet'; d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#E9ECF5;display:flex;flex-wrap:wrap;gap:6px;padding:8px;align-content:flex-start'; items.forEach(([l, c]) => { const e = document.createElement('div'); e.style.cssText = `background:#fff;border-radius:12px;padding:4px;font:600 12px sans-serif;text-align:center;width:${Math.round(h * .62)}px`; e.innerHTML = `<img src="${av2URI(c, 'full')}" style="height:${h}px;width:100%;object-fit:contain"><div>${l}</div>`; d.append(e); }); document.body.append(d); }, [items.slice(i, i + 24), h]);
      await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${name}-${i / 24 + 1}.png` }); } };
  const base = { f: { g: 'f', skin: 3, hair: 'long', hairC: 2 }, m: { g: 'm', skin: 4, hair: 'short', hairC: 1 } };
  const cost = await p.evaluate(() => AV2.costume.map(c => [c[0], c[1], c[3] || c[1]]));
  const ci = []; cost.filter(c => c[0] !== 'none').forEach(([k, nm, nf]) => { ci.push([nf + ' (F)', { ...base.f, costume: k }]); ci.push([nm + ' (H)', { ...base.m, costume: k }]); });
  await sheet('costumes', ci, 290);
  const poses = await p.evaluate(() => (AV2.pose || []).map(x => x[0])); await sheet('poses', poses.flatMap(k => [[k + ' F', { ...base.f, top: 'tee', bottom: 'jeans', pose: k }], [k + ' H', { ...base.m, top: 'hoodie', bottom: 'joggers', pose: k }]]), 290);
  const hairs = await p.evaluate(() => { const h = AV2.hair; return (Array.isArray(h) ? h : [...(h.f || []), ...(h.m || []), ...Object.values(h).flat()]).map(x => Array.isArray(x) ? x[0] : x).filter((v, i, a) => typeof v === 'string' && a.indexOf(v) === i); }); await sheet('coiffures', hairs.flatMap(k => [[k + ' F', { ...base.f, hair: k, skin: 5 }], [k + ' H', { ...base.m, hair: k, skin: 2 }]]), 260);
  // Parcours studio sur iPhone 14 : chaque onglet, puis 24 tirages « Surprends-moi ».
  const c = await b.newContext({ ...devices['iPhone 14'] }); const q = await c.newPage(); q.on('pageerror', e => errs.push('studio ' + e.message));
  await q.goto(U + '?nouveau'); await q.waitForTimeout(900); await q.evaluate(() => { if (!ST.account) quickSetup(); ST.tourDone = true; V.avatarEditor(); }); await q.waitForTimeout(1200);
  const tb = await q.$$('.stTabs button, [data-tab]'); let i = 0;
  for (const t of tb) { try { await t.click(); await q.waitForTimeout(700); await q.screenshot({ path: `${OUT}/studio-onglet-${String(++i).padStart(2, '0')}.png` }); } catch (_) {} }
  for (let k = 0; k < 24; k++) { await q.click('#rd'); await q.waitForTimeout(650); if (k % 2 === 0) await q.screenshot({ path: `${OUT}/studio-surprise-${String(k).padStart(2, '0')}.png` }); }
  console.log('onglets capturés :', i, '· erreurs JS :', errs.length ? [...new Set(errs)].join(' | ') : 'aucune'); await b.close(); })();
