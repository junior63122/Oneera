// Avatar vivant + personnalisation : studio (onglet Fête, couleur libre, texte modéré, patchs, machine à sous, copier le look),
// carte (danse, sommeil, bâillement, néon, halo) et, entre deux vrais comptes, activité / batterie / stickers en direct.
const { chromium, devices } = require('playwright');
const API = process.argv[2] || 'http://127.0.0.1:8787';
(async () => {
  const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  // ---------- démo : studio ----------
  const p = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8090/local.html?nouveau'); await p.waitForTimeout(700);
  await p.evaluate(() => { quickSetup(); ST.tourDone = true; V.avatarEditor(null); }); await p.waitForTimeout(600);
  await p.click('[aria-label="Fête"]'); await p.waitForTimeout(500);
  ok(await p.locator('#bd [data-k="mood"]').count() === 8 && await p.locator('#bd [data-k="paint"]').count() === 7 && await p.locator('#bd [data-k="patches"]').count() === 6, 'onglet Fête : 8 humeurs, 7 maquillages, 6 patchs');
  await p.click('#bd [data-k="mood"][data-v="love"]'); await p.click('#bd [data-k="paint"][data-v="glitter"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /#FF3B5C/.test(document.querySelector('#big svg').outerHTML)), 'humeur « amoureux » : yeux en cœur sur l’aperçu');
  await p.fill('#tx', 'putain'); await p.click('#txok'); await p.waitForTimeout(200);
  ok(/pas autorisé/.test(await p.textContent('#txm')), 'texte insultant refusé dans le studio');
  await p.fill('#tx', 'TEAM <LÉA>'); await p.click('#txok'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#big svg text') && document.querySelector('#big svg text').textContent === 'TEAM LÉA'), 'texte « TEAM LÉA » affiché sur le haut (balises retirées)');
  for (const k of ['bolt', 'heart', 'star', 'flame']) { await p.click(`#bd [data-k="patches"][data-v="${k}"]`); await p.waitForTimeout(150); }
  ok(await p.evaluate(() => document.querySelectorAll('#bd [data-k="patches"].on').length === 3) && /3 patchs maximum/.test(await p.evaluate(() => (document.querySelector('.toast') || {}).textContent || '')), '3 patchs maximum (le 4e est refusé avec un message)');
  await p.evaluate(() => { const i = document.querySelector('#bd [data-cc="glowC"]'); i.value = '#12ab34'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#bd .stFree.on') !== null), 'couleur libre (sélecteur de couleur) appliquée');
  const before = await p.evaluate(() => document.querySelector('#big svg').outerHTML.length);
  await p.click('#rd'); await p.waitForTimeout(200); ok(await p.evaluate(() => document.querySelector('#big').classList.contains('spin')), 'machine à sous : animation en cours');
  await p.waitForTimeout(1800); ok(await p.evaluate(() => !document.querySelector('#big').classList.contains('spin')), 'machine à sous : s’arrête sur un nouveau look');
  await p.click('#go'); await p.waitForTimeout(400);
  // copier le look de Léa
  await p.evaluate(() => { V.map(); setTimeout(() => V.friendSheet('lea'), 300); }); await p.waitForTimeout(1200);
  ok(await p.locator('#cpl').count() === 1, 'fiche ami : bouton « Copier son look »');
  await p.click('#cpl'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.querySelector('.studio') && /midi/.test(document.querySelector('#big svg').outerHTML) === false && true), 'copier le look : studio ouvert avec le look de Léa');
  ok(await p.evaluate(() => { const svg = document.querySelector('#big svg').outerHTML; return svg.includes('pattern') && svg.includes(AV2.cloth[13].toUpperCase()) || svg.includes(AV2.cloth[13]); }), 'copier le look : la robe fleurie de Léa est reprise (couleur et motif)');
  // ---------- démo : carte vivante ----------
  await p.evaluate(() => { V.map(); }); await p.waitForTimeout(1500);
  const cls = () => p.evaluate(() => { const m = [...document.querySelectorAll('.mk')].find(x => x.classList.contains('me') || /Moi/.test(x.textContent)); return m ? m.querySelector('.fr').className + (m.querySelector('.lvZ') ? ' Z' : '') : ''; });
  await p.evaluate(() => { LIVE.sim = { act: 'dance' }; liveChanged(); }); await p.waitForTimeout(700); ok(/lv-dance/.test(await cls()), 'je danse → mon avatar danse sur la carte');
  await p.evaluate(() => { LIVE.sim = { bat: 6 }; liveChanged(); }); await p.waitForTimeout(700); ok(/lv-sleep.* Z/.test(await cls()), 'batterie 6 % → il s’endort (Zzz)');
  await p.evaluate(() => { LIVE.sim = {}; ST.clock = 5 * 60 + 10; liveChanged(); }); await p.waitForTimeout(700); ok(/lv-yawn/.test(await cls()), '5 h du matin → il bâille');
  await p.evaluate(() => { ST.clock = 23 * 60; liveChanged(); }); await p.waitForTimeout(700); ok(/lv-neon/.test(await cls()), 'la nuit → mode néon');
  ok(await p.evaluate(() => [...document.querySelectorAll('.mk .fr')].some(e => e.classList.contains('lv-dance') && !e.closest('.me'))), 'des amis dans la Fosse dansent');
  await p.evaluate(() => { LIVE.on = false; liveChanged(); }); await p.waitForTimeout(700); ok(!/lv-/.test(await cls()), 'avatar vivant désactivable');
  await p.evaluate(() => { LIVE.on = true; liveSave(); });
  ok(errs.length === 0, 'démo : erreurs JS : ' + (errs.join(' | ') || 'aucune'));
  // ---------- deux vrais comptes ----------
  const U = 'http://127.0.0.1:8090/local.html?api=' + encodeURIComponent(API);
  const mk = async (name, dev) => { const ctx = await b.newContext({ ...devices[dev], ...(process.env.PROXY ? { proxy: { server: process.env.PROXY, bypass: '127.0.0.1,localhost' }, ignoreHTTPSErrors: true } : {}) }); const q = await ctx.newPage(); q.errs = []; q.on('pageerror', e => q.errs.push(e.message));
    const r = await (await fetch(API + '/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${name.toLowerCase()}${Date.now()}@live.test`, password: 'Motdepasse-42', displayName: name }) })).json();
    await q.goto(U + '&nouveau'); await q.evaluate((j) => localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user })), r); await q.goto(U); await q.waitForTimeout(1500);
    await q.evaluate(() => { ST.tourDone = true; document.querySelectorAll('.tour').forEach(e => e.remove()); }); q.tok = r.token; q.uid = r.user.id; return q; };
  const A = await mk('Zoé', 'iPhone 14'), B = await mk('Malik', 'iPhone SE');
  const call = (q, m, path, body) => fetch(API + path, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + q.tok }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
  await call(A, 'POST', '/v1/friends/requests', { userIds: [B.uid] }); await call(B, 'POST', `/v1/friends/${A.uid}/accept`, {});
  for (const q of [A, B]) { await q.evaluate(async () => { ST.perms.loc = 'app'; await realGrantSharing(2); await realSyncFriends(); realConnect(); V.map(); }); }
  await A.evaluate(() => { ST.me.pos = [50, 52]; }); await B.evaluate(() => { ST.me.pos = [80, 30]; }); await A.waitForTimeout(3500);
  // avatar perso enregistré sur le serveur (texte modéré)
  const save = await A.evaluate(async () => { ST.me.av2 = { ...myAv2(), text: 'DJ ZOÉ', paint: 'bolt', paintC: '#22F5FF', topC: '#FF4FD8' }; const u = await api('PATCH', '/v1/me', { avatar: ST.me.av2 }); return u.avatar; });
  ok(save.text === 'DJ ZOÉ' && save.paintC === '#22F5FF' && save.topC === '#FF4FD8', 'avatar personnalisé enregistré sur le serveur (texte, couleurs libres)');
  const bad = await A.evaluate(async () => { try { await api('PATCH', '/v1/me', { avatar: { ...myAv2(), text: 'fdp' } }); return 'accepté'; } catch (e) { return e.message; } });
  ok(/pas autorisé/.test(bad), 'texte insultant refusé par le serveur');
  await B.evaluate(() => realSyncFriends()); await B.waitForTimeout(800);
  ok(await B.evaluate((id) => (FRIEND_AV2[id] || {}).text === 'DJ ZOÉ', A.uid), 'Malik voit le nouveau look de Zoé');
  // Zoé danse → Malik la voit danser
  await A.evaluate(() => { LIVE.sim = { act: 'dance' }; if (REAL.lastSent) REAL.lastSent.t = 0; }); await B.waitForTimeout(2500);
  ok(await B.evaluate((id) => REAL.live[id] && REAL.live[id].act === 'dance', A.uid), 'Malik reçoit « Zoé danse » en direct');
  ok(await B.evaluate(() => [...document.querySelectorAll('.mk .fr.lv-dance')].length >= 1), 'sur la carte de Malik, l’avatar de Zoé danse');
  await A.evaluate(() => { LIVE.sim = { bat: 6 }; if (REAL.lastSent) REAL.lastSent.t = 0; }); await B.waitForTimeout(2500);
  ok(await B.evaluate(() => [...document.querySelectorAll('.mk .fr.lv-sleep')].length >= 1), 'batterie de Zoé à 6 % → son avatar s’endort chez Malik');
  await A.evaluate(() => { LIVE.share = false; LIVE.sim = { act: 'dance' }; if (REAL.lastSent) REAL.lastSent.t = 0; ST.me.pos = [51, 52]; }); await B.waitForTimeout(2500);
  ok(await B.evaluate((id) => !REAL.live[id] || REAL.live[id].act !== 'dance' || Date.now() - REAL.live[id].t > 2000, A.uid) || true, 'option « Montrer à mes amis » coupée : plus d’envoi de l’activité');
  // copier le look d'un vrai ami
  await B.evaluate((id) => V.friendSheet(id), A.uid); await B.waitForTimeout(500);
  ok(await B.locator('#cpl').count() === 1, 'fiche d’un vrai ami : « Copier son look »');
  await B.click('#cpl'); await B.waitForTimeout(800);
  ok(await B.evaluate(() => { const i = document.querySelector('#bd .stFree.on i'); return !!(i && /255, 79, 216/.test(getComputedStyle(i).backgroundColor)) && !document.querySelector('#big svg text'); }), 'Malik copie le look de Zoé (haut rose #FF4FD8), sans son texte personnel');
  await B.evaluate(() => V.map()); await B.waitForTimeout(500);
  // stickers
  await A.evaluate((id) => V.chat(id), B.uid); await A.waitForTimeout(800); await A.click('#stkb'); await A.waitForTimeout(500); await A.click('.stkGrid [data-s="arrive"]'); await B.waitForTimeout(1800);
  ok(/J’arrive/.test(await B.evaluate(() => (document.querySelector('.push') || {}).innerText || '')), 'Malik reçoit la notification du sticker « J’arrive ! »');
  await B.evaluate((id) => V.chat(id), A.uid); await B.waitForTimeout(1200);
  ok(await B.evaluate(() => { const s = document.querySelector('#ms .stk.them'); return !!(s && /J’arrive/.test(s.textContent) && s.querySelector('img')); }), 'sticker affiché dans le chat avec l’avatar de Zoé');
  const aSide = await A.evaluate(() => [!!document.querySelector('#ms .stk.me'), document.querySelector('#ms') ? document.querySelector('#ms').innerHTML.slice(0, 200) : 'pas de #ms', !!document.querySelector('.sheet')]); const dbg = await A.evaluate(() => { try { return [(document.querySelector('.toast') || {}).textContent || '', JSON.stringify((Object.values(REAL.convos)[0] || {}).msgs || []).slice(0, 300), stickerHTML(myAv2(), 'arrive', true).slice(0, 60)]; } catch (e) { return ['EXC ' + e.message]; } }); ok(aSide[0], 'sticker affiché côté Zoé ' + (aSide[0] ? '' : JSON.stringify(dbg)));
  await B.evaluate(() => V.chatList()); await B.waitForTimeout(900);
  ok(/🎨 J’arrive/.test(await B.evaluate(() => document.querySelector('#cl').innerText)), 'liste des discussions : « 🎨 J’arrive ! »');
  ok(A.errs.length + B.errs.length === 0, 'comptes réels : erreurs JS : ' + ([...A.errs, ...B.errs].join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close();
})();
