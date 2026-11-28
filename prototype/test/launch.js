// Lancement de l'app : délai avant le premier affichage, avant la carte utilisable, et fluidité (images par seconde,
// images trop longues) pendant l'entrée (brouillard) et la sortie, à vitesse normale et processeur ralenti ×4.
// Usage : node launch.js <url local.html>
const { chromium, devices } = require('playwright');
const U = process.argv[2] || 'http://127.0.0.1:8090/local.html';
(async () => { const b = await chromium.launch(); const out = [];
  for (const rate of [1, 4]) {
    const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    // 1. premier lancement (aucune donnée) : premier rendu et écran d'accueil interactif
    const t0 = Date.now(); await p.goto(U + '?nouveau', { waitUntil: 'commit' });
    await p.waitForFunction(() => document.querySelector('#screen') && document.querySelector('#screen').children.length > 0, null, { timeout: 30000 });
    const firstPaint = await p.evaluate(() => Math.round(performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || -1));
    await p.waitForFunction(() => [...document.querySelectorAll('#screen button')].some(x => x.getBoundingClientRect().width > 0), null, { timeout: 30000 });
    const ready = Date.now() - t0;
    // 2. entrée sur la carte avec l'animation d'ouverture (brouillard), puis sortie : images mesurées
    await p.evaluate(() => { quickSetup(); ST.tourDone = true; ST.perms.loc = 'app'; });
    const meas = (js, ms) => p.evaluate(([js, ms]) => new Promise(res => { const ts = []; let on = true; const f = t => { ts.push(t); if (on) requestAnimationFrame(f); }; requestAnimationFrame(f); const tStart = performance.now(); eval(js);
      setTimeout(() => { on = false; const d = ts.slice(1).map((t, i) => t - ts[i]); const fps = Math.round(1000 * d.length / (ts[ts.length - 1] - ts[0])); res({ fps, long: d.filter(x => x > 50).length, worst: Math.round(Math.max(...d)), mapAt: Math.round((window.__mapReady || performance.now()) - tStart) }); }, ms); }), [js, ms]);
    const enter = await meas("ST.introSeen = {}; V.map()", 3500);
    const usable = await p.evaluate(() => !!document.querySelector('#screen .nav') && !document.querySelector('#portal:not(.fade)'));
    const leave = await meas("(window.PORTAL && PORTAL.leave) ? PORTAL.leave(() => {}) : V.settings()", 2500);
    out.push({ processeur: rate === 1 ? 'normal' : 'ralenti ×4', 'premier affichage (ms)': firstPaint, 'accueil utilisable (ms)': ready, 'entrée i/s': enter.fps, 'entrée images > 50 ms': enter.long, 'entrée pire image (ms)': enter.worst, 'carte utilisable après entrée': usable, 'sortie i/s': leave.fps, 'sortie images > 50 ms': leave.long, erreurs: errs.length });
    await c.close();
  }
  console.table(out); await b.close(); })();
