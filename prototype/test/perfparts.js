const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch();
  const variants = (process.argv[2] ? JSON.parse(process.argv[2]) : [['tout', ''], ['sans décor', 'decor'], ['sans atmosphère', 'atmo'], ['sans mer animée', 'sea'], ['sans nuages bord', 'clouds'], ['sans foule', 'crowd'], ['rien de nouveau', 'decor,atmo,sea']]);
  for (const [name, off] of variants) { const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage(); const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(800);
    await p.evaluate((off) => { quickSetup(); ST.tourDone = true; ST.introSeen = { bdf: 1 }; V.map(); const o = off.split(','); const f0 = MV.fxCfg; MV.fxCfg = () => { const r = { ...(f0 ? f0() : {}) }; o.forEach(k => { if (k && k !== 'sea') r[k] = false; }); return r; };
      if (o.includes('sea')) { const st = document.createElement('style'); st.textContent = '.seaL{display:none}'; document.head.append(st); } if (o.includes('atmo')) { const st = document.createElement('style'); st.textContent = '.atmo{display:none}'; document.head.append(st); }
      o.filter(k => k.startsWith('.')).forEach(k => { const st = document.createElement('style'); st.textContent = '.atmo ' + k + '{display:none!important}'; document.head.append(st); }); }, off);
    await p.waitForTimeout(2500);
    const box = await p.locator('#mv').boundingBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const fps = async (act) => { await p.evaluate(() => { window.__f = []; let l = performance.now(); const f = (t) => { window.__f.push(t - l); l = t; if (window.__f.length < 1e4) requestAnimationFrame(f); }; requestAnimationFrame(f); }); await act(); return p.evaluate(() => { const f = window.__f.slice(3); return Math.round(1000 / (f.reduce((a, b) => a + b, 0) / f.length)); }); };
    const rest = await fps(() => p.waitForTimeout(3000));
    const pan = await fps(async () => { for (let k = 0; k < 3; k++) { await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 0; i < 20; i++) { await p.mouse.move(cx + (k % 2 ? -1 : 1) * i * 6, cy + i * 3); await p.waitForTimeout(16); } await p.mouse.up(); } });
    const zoom = await fps(async () => { for (let i = 0; i < 10; i++) { await p.mouse.move(cx, cy); await p.mouse.wheel(0, i % 6 < 3 ? -120 : 120); await p.waitForTimeout(200); } });
    console.log(name.padEnd(18), 'repos', rest, '· glisser', pan, '· zoom', zoom); await c.close(); }
  await b.close(); })();
