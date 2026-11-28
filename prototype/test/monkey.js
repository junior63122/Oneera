// Testeur aléatoire : touche, tape, glisse, revient en arrière au hasard ; aucune erreur JS, jamais bloqué.
const { chromium, devices } = require('playwright');
const SEEDS = +(process.argv[2] || 6), STEPS = +(process.argv[3] || 400);
const MODE = process.argv[4] || 'both';
(async () => {
  const b = await chromium.launch(); let fail = 0; const allErr = new Map();
  const runs = []; for (let s = 1; s <= SEEDS; s++) { if (MODE !== 'real') runs.push(['demo', s]); if (MODE !== 'demo') runs.push(['real', s]); }
  for (const [mode, seed] of runs) {
    let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const dev = devices[seed % 2 ? 'iPhone 14' : 'iPhone SE'];
    const ctx = await b.newContext({ ...dev }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => { errs.push(e.message.split('\n')[0]); if (!global.__st) global.__st = new Set(); const k1 = e.message.split('\n')[0]; if (!global.__st.has(k1)) { global.__st.add(k1); console.log('   pile : ' + (e.stack || '').split('\n').slice(0, 4).join(' ← ').replace(/http:\/\/127\.0\.0\.1:8090\/local\.html/g, '').slice(0, 400)); } }); p.on('dialog', d => d.dismiss().catch(() => {}));
    const url = mode === 'demo' ? 'http://127.0.0.1:8090/local.html?nouveau' : 'http://127.0.0.1:8090/local.html?nouveau&api=http://127.0.0.1:8787';
    await p.goto(url); await p.waitForTimeout(800);
    if (mode === 'real') { // vrai compte sur le serveur local
      const em = `m${seed}_${Date.now()}@monkey.test`;
      await p.evaluate(async (em) => { const r = await fetch('http://127.0.0.1:8787/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: em, password: 'Monkey-pass-42', displayName: 'Singe' }) }); const j = await r.json(); localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user, email: em }));
        // un vrai ami, qui a déjà écrit et envoyé sa position
        const H = (t) => ({ 'content-type': 'application/json', authorization: 'Bearer ' + t });
        const k = await (await fetch('http://127.0.0.1:8787/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ami.' + em, password: 'Monkey-pass-42', displayName: 'Kim' }) })).json();
        await fetch('http://127.0.0.1:8787/v1/friends/requests', { method: 'POST', headers: H(k.token), body: JSON.stringify({ userIds: [j.user.id] }) });
        await fetch(`http://127.0.0.1:8787/v1/friends/${k.user.id}/accept`, { method: 'POST', headers: H(j.token), body: '{}' });
        await fetch('http://127.0.0.1:8787/v1/messages', { method: 'POST', headers: H(k.token), body: JSON.stringify({ to: j.user.id, body: 'Tu es où ?' }) });
        await fetch('http://127.0.0.1:8787/v1/messages', { method: 'POST', headers: H(k.token), body: JSON.stringify({ to: j.user.id, kind: 'meet', body: 'Rejoins-moi', loc: { x: 50, y: 50, floor: 'bdf', label: 'Scène' } }) }); }, em);
      await p.goto(url.replace('?nouveau&', '?')); await p.waitForTimeout(2000);
      const li = await p.evaluate(() => !!(REAL.token && REAL.user)); if (!li) { fail++; console.log(`FAIL real #${seed} : compte non connecté`); }
      await p.evaluate(() => { document.querySelectorAll('.tour,.tourOv,.coach').forEach(e => e.remove()); }).catch(() => {});
    }
    let stuck = 0, last = '';
    for (let i = 0; i < STEPS; i++) {
      const a = rnd();
      try {
        if (a < 0.72) {
          const n = await p.evaluate(() => { const L = [...document.querySelectorAll('#screen button,#screen [onclick],#screen .tile,#screen .row,#screen summary,#screen a,#screen .chip,#screen .mk,#screen [role=button],#screen .tab,#screen label')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 4 && b.height > 4 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth && !e.disabled; }); L.forEach((e, i) => e.dataset.mk = i); return L.length; });
          if (n) { const k = Math.floor(rnd() * n); await p.click(`[data-mk="${k}"]`, { timeout: 800, force: true, noWaitAfter: true }).catch(() => {}); }
        } else if (a < 0.84) {
          const n = await p.evaluate(() => { const L = [...document.querySelectorAll('#screen input:not([type=hidden]),#screen textarea')].filter(e => e.offsetParent); L.forEach((e, i) => e.dataset.mi = i); return L.length; });
          if (n) { const k = Math.floor(rnd() * n); const T = ['', 'a', 'Léa 🎉', '<b>x</b>', "' OR 1=1 --", '0612345678', 'ABC123', 'x'.repeat(300), '   ', 'test@test.fr']; await p.fill(`[data-mi="${k}"]`, T[Math.floor(rnd() * T.length)], { timeout: 800 }).catch(() => {}); if (rnd() < .4) await p.keyboard.press('Enter').catch(() => {}); }
        } else if (a < 0.92) {
          const W = dev.viewport.width, H = dev.viewport.height; const x = rnd() * W, y = 100 + rnd() * (H - 200);
          await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + (rnd() - .5) * 300, y + (rnd() - .5) * 300, { steps: 4 }); await p.mouse.up();
        } else if (a < 0.97) { await p.evaluate(() => { const bk = document.querySelector('#screen #bk,#screen .back,#screen [data-back]'); if (bk) bk.click(); }); }
        else { await p.mouse.click(rnd() * dev.viewport.width, rnd() * dev.viewport.height); }
      } catch (_) {}
      await p.waitForTimeout(60 + rnd() * 90);
      if (i % 25 === 24) {
        const st = await p.evaluate(() => ({ scr: document.querySelectorAll('#screen .scr').length, html: (document.querySelector('#screen') || {}).innerHTML?.length || 0, ov: document.documentElement.scrollWidth > innerWidth + 1 })).catch(() => ({ scr: -1 }));
        if (st.scr < 1) { fail++; console.log(`FAIL ${mode} #${seed} pas ${i} : écran vide`); await p.evaluate(() => V.map && V.map()).catch(() => {}); }
        if (st.ov) { fail++; console.log(`FAIL ${mode} #${seed} pas ${i} : débordement horizontal`); }
        const sig = st.scr + ':' + st.html; if (sig === last) stuck++; else stuck = 0; last = sig;
        if (stuck >= 6) { console.log(`--   ${mode} #${seed} pas ${i} : même écran depuis 150 pas`); stuck = 0; }
      }
    }
    const alive = await p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 500) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
    if (alive < 10) { fail++; console.log(`FAIL ${mode} #${seed} : boucle d'animation figée (${alive} images / 0,5 s)`); }
    for (const e of errs) allErr.set(e, (allErr.get(e) || 0) + 1);
    console.log(`${errs.length ? 'FAIL' : 'OK  '} ${mode} #${seed} (${dev === devices['iPhone 14'] ? '14' : 'SE'}) : ${STEPS} actions, ${errs.length} erreur(s) JS`);
    if (errs.length) fail++;
    await ctx.close();
  }
  for (const [e, n] of allErr) console.log(`   ${n}× ${e}`);
  console.log(fail ? `ÉCHECS : ${fail}` : 'TOUT OK'); await b.close();
})();
