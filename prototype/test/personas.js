// Personas manquants : clavier seul + lecteur d'écran (noms accessibles), zoom 200 %, deux onglets sur le même compte,
// bouton Précédent / rafraîchissement, rotation paysage, mode sombre, réseau lent, réseau coupé.
const { chromium, devices } = require('playwright');
const API = process.argv[2] || 'http://127.0.0.1:8787', U = 'http://127.0.0.1:8090/local.html?api=' + encodeURIComponent(API);
(async () => { const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const errs = []; const track = p => { p.on('pageerror', e => errs.push(e.message)); return p; };
  const acct = async (name) => { const em = `${name.toLowerCase()}${Date.now()}${Math.random().toString(36).slice(2, 6)}@persona.test`; const r = await (await fetch(API + '/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: em, password: 'Motdepasse-42', displayName: name, locationConsent: true }) })).json(); return r; };
  const login = async (p, r) => { await p.goto(U + '&nouveau'); await p.waitForTimeout(300); await p.evaluate(j => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user, email: 'x' })), r); await p.goto(U); await p.waitForTimeout(1600); await p.evaluate(() => { ST.tourDone = true; document.querySelectorAll('.tour').forEach(e => e.remove()); }); };
  const noOverflow = p => p.evaluate(() => { const W = innerWidth; return [...document.querySelectorAll('#screen button, #screen input, #screen h1, #screen .h2')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.top < innerHeight && r.bottom > 0 && (r.right > W + 2 || r.left < -2) && !e.closest('[style*="overflow"], .chips, .stTabs, .stRow, .seg, .hscroll, .catbar, .filters, .scroller'); }).map(e => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20)); });
  // 1. Lecteur d'écran : chaque bouton / champ visible a un nom ; clavier : Tab atteint les actions de l'accueil et Entrée les active
  let p = track(await (await b.newContext({ ...devices['iPhone 14'] })).newPage()); await p.goto(U + '&nouveau'); await p.waitForTimeout(800);
  const unnamed = async () => p.evaluate(() => [...document.querySelectorAll('#screen button, #screen input, #screen [role=button], #screen a')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden') return false; const nm = (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || e.getAttribute('placeholder') || (e.labels && e.labels[0] && e.labels[0].textContent) || '').trim(); return !nm; }).map(e => e.outerHTML.slice(0, 80)));
  ok((await unnamed()).length === 0, 'lecteur d’écran — accueil : tous les boutons et champs ont un nom ' + JSON.stringify(await unnamed()));
  const seen = new Set(); for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); seen.add(await p.evaluate(() => (document.activeElement && (document.activeElement.textContent || document.activeElement.getAttribute('aria-label') || '')).trim().slice(0, 30))); }
  ok([...seen].some(t => /e-mail|Apple|Google/i.test(t)), 'clavier seul : Tab atteint les boutons de connexion (' + [...seen].filter(Boolean).slice(0, 5).join(' / ') + ')');
  const before = await p.evaluate(() => document.querySelector('#screen').innerText.slice(0, 40)); await p.evaluate(() => { const b = [...document.querySelectorAll('#screen button')].find(x => /Avec mon e-mail/.test(x.textContent)); b && b.focus(); }); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!document.querySelector('#screen input[type=email], #screen #em')) || before !== await p.evaluate(() => document.querySelector('#screen').innerText.slice(0, 40)), 'clavier seul : Entrée ouvre l’inscription par e-mail');
  // carte et studio : noms accessibles
  const r1 = await acct('Zoe'); await login(p, r1);
  ok((await unnamed()).length === 0, 'lecteur d’écran — carte : tous les contrôles ont un nom ' + JSON.stringify((await unnamed()).slice(0, 4)));
  await p.evaluate(() => V.avatarPick(() => {}, false)); await p.waitForTimeout(800);
  const un2 = (await unnamed()).filter(x => !/stFree|thI/.test(x)); ok(un2.length === 0, 'lecteur d’écran — studio : tous les contrôles ont un nom ' + JSON.stringify(un2.slice(0, 4)));
  // 2. Zoom 200 % (équivaut à un écran deux fois plus étroit) : rien ne sort de l'écran
  const z = track(await (await b.newContext({ viewport: { width: 195, height: 422 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage());
  await z.goto(U + '&nouveau'); await z.waitForTimeout(800); const o1 = await noOverflow(z); ok(o1.length === 0, 'zoom 200 % — accueil : rien hors écran ' + JSON.stringify(o1));
  await login(z, await acct('Zoom')); const o2 = await noOverflow(z); ok(o2.length === 0, 'zoom 200 % — carte : rien hors écran ' + JSON.stringify(o2.slice(0, 5)));
  // 3. Deux onglets, même compte : un message envoyé depuis un onglet apparaît dans l'autre, aucun plantage
  const ctx2 = await b.newContext({ ...devices['iPhone 14'] }); const t1 = track(await ctx2.newPage()), t2 = track(await ctx2.newPage());
  const ra = await acct('Ana'), rb = await acct('Ben'); await login(t1, ra); await t2.goto(U); await t2.waitForTimeout(1600);
  const call = (tok, m, path, body) => fetch(API + path, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
  await call(rb.token, 'POST', '/v1/friends/requests', { userIds: [ra.user.id] }); const fl = await call(ra.token, 'GET', '/v1/friends'); const req = (fl.friends || []).find(x => x.id === rb.user.id); if (req) await call(ra.token, 'POST', `/v1/friends/${rb.user.id}/accept`);
  await call(rb.token, 'POST', '/v1/messages', { to: ra.user.id, body: 'Salut des deux onglets', kind: 'text' }); await t1.waitForTimeout(2500);
  const both = await Promise.all([t1, t2].map(t => t.evaluate(() => JSON.stringify(ST.bubbles || {}).includes('Salut des deux onglets'))));
  ok(both[0] && both[1], 'deux onglets du même compte : le message arrive dans les deux (' + both.join('/') + ')');
  await t1.evaluate(() => typeof realLogout === 'function' && realLogout(true)); await t1.waitForTimeout(1200); await t2.reload(); await t2.waitForTimeout(1500);
  ok(await t2.evaluate(() => !!document.querySelector('#screen')) , 'déconnexion dans un onglet : l’autre reste utilisable (pas de page blanche)');
  // 4. Précédent / rafraîchir : jamais de page blanche, la session est gardée
  const h = track(await (await b.newContext({ ...devices['iPhone 14'] })).newPage()); await login(h, await acct('Hugo'));
  await h.evaluate(() => V.friendsTab && V.friendsTab()); await h.waitForTimeout(500); await h.goBack().catch(() => {}); await h.waitForTimeout(800); await h.goForward().catch(() => {}); await h.waitForTimeout(800);
  await h.reload(); await h.waitForTimeout(1800); ok(await h.evaluate(() => !!(REAL && REAL.token) && document.querySelector('#screen').innerText.length > 20), 'rafraîchir / Précédent : session gardée, écran non vide');
  // 5. Paysage, mode sombre, réseau lent, réseau coupé
  const L = track(await (await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, colorScheme: 'dark' })).newPage()); await login(L, await acct('Lou'));
  ok(await L.evaluate(() => !!document.querySelector('#mv') || document.querySelector('#screen').innerText.length > 20), 'paysage + mode sombre : l’app s’affiche');
  const sl = await b.newContext({ ...devices['iPhone 14'] }); const S = track(await sl.newPage()); await sl.route(API + '/**', async r => { await new Promise(x => setTimeout(x, 2500)); r.continue(); });
  const rs = await acct('Sam'); await S.goto(U + '&nouveau'); await S.waitForTimeout(300); await S.evaluate(j => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user, email: 'x' })), rs); await S.goto(U); await S.waitForTimeout(7000);
  ok(await S.evaluate(() => document.querySelector('#screen').innerText.length > 20), 'réseau lent (2,5 s par requête) : l’app finit par s’afficher, pas de blocage');
  await sl.setOffline(true); await S.evaluate(() => V.friendsTab && V.friendsTab()); await S.waitForTimeout(1500);
  ok(await S.evaluate(() => document.querySelector('#screen').innerText.length > 20), 'réseau coupé : l’écran reste utilisable, pas de page blanche');
  await sl.setOffline(false);
  ok(errs.length === 0, 'erreurs JS : ' + (errs.slice(0, 4).join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close(); })();
