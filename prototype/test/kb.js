// Clavier : chaque champ de saisie de l'app reste entièrement visible au-dessus du clavier (iPhone 14 et SE)
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  for (const dev of ['iPhone 14', 'iPhone SE']) {
    const D = devices[dev]; const KB = dev === 'iPhone SE' ? 260 : 336;
    const p = await (await b.newContext({ ...D })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8090/local.html?nouveau&api=http://127.0.0.1:9'); await p.waitForTimeout(700);
    const screens = [
      ['inscription', `V.signup()`], ['connexion', `V.login()`],
      ['ajout ami (code)', `REAL.token='x';REAL.user={displayName:'T'};V.addFriends(false)`],
      ['chat', `REAL.token=null;quickSetup();V.chat ? V.chat('lea') : V.map()`],
      ['recherche', `quickSetup();V.search ? V.search() : 0`],
      ['suppression compte', `quickSetup();V.deleteAccount()`],
      ['message sur la carte', `quickSetup();V.map();V.mapMessage && V.mapMessage()`],
    ];
    for (const [name, js] of screens) {
      await p.setViewportSize({ width: D.viewport.width, height: D.viewport.height }); await p.waitForTimeout(150);
      await p.evaluate(js).catch(() => {}); await p.waitForTimeout(500);
      const ids = await p.evaluate(() => [...document.querySelectorAll('#screen input:not([type=hidden]),#screen textarea')].filter(e => e.offsetParent).map((e, i) => { e.dataset.kbt = i; return i; }));
      if (!ids.length) { console.log(`--   ${dev} · ${name} : aucun champ`); continue; }
      for (const i of ids) {
        await p.setViewportSize({ width: D.viewport.width, height: D.viewport.height }); await p.waitForTimeout(80);
        await p.focus(`[data-kbt="${i}"]`); await p.setViewportSize({ width: D.viewport.width, height: D.viewport.height - KB }); await p.waitForTimeout(450);
        const r = await p.evaluate((i) => { const e = document.querySelector(`[data-kbt="${i}"]`); const b = e.getBoundingClientRect(); const vh = visualViewport.height; const cs = getComputedStyle(e); return { top: b.top, bot: b.bottom, vh, w: b.width, fs: parseFloat(cs.fontSize), label: e.id || e.placeholder || e.name || e.type, over: document.documentElement.scrollWidth > innerWidth + 1 }; }, i);
        ok(r.top >= 0 && r.bot <= r.vh + 0.5, `${dev} · ${name} · champ « ${r.label} » visible au-dessus du clavier (haut ${r.top.toFixed(0)}, bas ${r.bot.toFixed(0)} / ${r.vh.toFixed(0)})`);
        ok(r.fs >= 16, `${dev} · ${name} · « ${r.label} » texte ≥ 16 px (pas de zoom iOS) : ${r.fs}px`);
        if (r.over) ok(false, `${dev} · ${name} · débordement horizontal`);
      }
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
    }
    ok(errs.length === 0, `${dev} : erreurs JS : ${errs.join(' | ') || 'aucune'}`);
  }
  console.log(`${n - f}/${n}`); await b.close();
})();
