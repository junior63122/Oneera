// Portail ONEERA : ouverture de l'app (logo → ciel → nuages → carte), saut au toucher, changement de lieu (sortie puis entrée),
// déconnexion (retour au logo), mouvement réduit (aucune animation), interface révélée après l'entrée, aucune erreur.
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const page = async (extra = {}) => { const c = await b.newContext({ ...devices['iPhone 14'], ...extra }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p; };
  // 1. ouverture de l'app sur la carte
  let p = await page(); await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(500);
  await p.evaluate(() => { quickSetup(); ST.tourDone = true; ST.introSeen = { bdf: 1 }; emit(); try { sessionStorage.clear(); } catch (_) {} });
  await p.goto('http://127.0.0.1:8090/local.html?portal=1'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !!document.querySelector('#portal canvas')), 'ouverture : le portail démarre sur le logo (même image que l’écran de démarrage)');
  ok(await p.evaluate(() => SCREEN.classList.contains('pIn')), 'pendant l’entrée, l’interface de la carte est cachée');
  await p.waitForTimeout(250); ok(await p.evaluate(() => { const S = SCREEN.getBoundingClientRect(), ls = [...document.querySelectorAll('#portal .fogL, #portal .fogV')]; return ls.length === 5 && ls.every(l => { const r = l.getBoundingClientRect(); return r.left <= S.left + 1 && r.top <= S.top + 1 && r.right >= S.right - 1 && r.bottom >= S.bottom - 1; }); }), 'le brouillard couvre tout l’écran (jamais un petit rectangle)');
  await p.waitForTimeout(3900);
  ok(await p.evaluate(() => !document.querySelector('#portal')), 'le portail se termine seul (≈ 3 s) et disparaît');
  ok(await p.evaluate(() => !!document.querySelector('#mv') && getComputedStyle(document.querySelector('.mapTop')).opacity === '1'), 'on se pose sur la carte, interface révélée');
  await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.querySelector('#portal')), 'une seule fois par lancement (pas à chaque rechargement d’écran)');
  // 2. toucher pour passer
  await p.evaluate(() => { sessionStorage.clear(); }); await p.reload(); await p.waitForTimeout(400);
  const t0 = Date.now(); await p.mouse.click(200, 400); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !document.querySelector('#portal')) && Date.now() - t0 < 1500, 'un toucher passe l’animation immédiatement');
  // 3. changement de lieu : sortie (remontée) puis entrée (descente)
  await p.evaluate(() => { window.__ev = []; const cl = PORTAL.close, op = PORTAL.open; PORTAL.close = (o) => { window.__ev.push('close:' + VENUE.id); return cl(o); }; PORTAL.open = (o) => { window.__ev.push('open:' + VENUE.id); return op(o); }; FX.leave(() => { setVenue('selva'); quickSetup(); V.map(); }); });
  await p.waitForTimeout(300); ok(await p.evaluate(() => window.__ev[0] === 'close:bdf' && PORTAL.st && PORTAL.st.c > 0), 'changer de lieu : les nuages se referment sur l’ancien lieu');
  await p.waitForTimeout(800); ok(await p.evaluate(() => VENUE.id === 'selva' && PORTAL.st && PORTAL.st.c >= 1), 'le lieu change sous les nuages (écran entièrement couvert)');
  await p.waitForTimeout(2500); ok(await p.evaluate(() => window.__ev.includes('open:selva') && !document.querySelector('#portal')), 'puis les nuages s’ouvrent sur le nouveau lieu');
  ok(await p.evaluate(() => MV.minS >= Math.max(MV.vw / MV.W, MV.vh / MV.H)), 'la carte remplit toujours l’écran (zoom minimum = plein écran, jamais le bord)');
  // 4. mouvement réduit : jamais d'animation
  const q = await page({ reducedMotion: 'reduce' }); await q.goto('http://127.0.0.1:8090/local.html?nouveau&portal=1'); await q.waitForTimeout(300);
  ok(await q.evaluate(() => !document.querySelector('#portal')), 'réglage « réduire les animations » respecté : pas de portail');
  // 5. variante partenaires (depuis le centre du logo)
  ok(await p.evaluate(() => typeof window.ONEERA_PORTAL === 'function'), 'variante intégrations / API : window.ONEERA_PORTAL({ mode: "logo" })');
  ok(p.errs.length + q.errs.length === 0, 'erreurs JS : ' + ([...p.errs, ...q.errs].join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close(); })();
