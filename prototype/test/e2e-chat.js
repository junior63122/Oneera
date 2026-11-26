// Deux téléphones, deux vrais comptes : amis, onglet Amis réel, discussion en direct, position partagée, retrait d'ami.
const { chromium, devices } = require('playwright');
const API = process.argv[2] || 'http://127.0.0.1:8787';
(async () => {
  const b = await chromium.launch(); let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) f++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
  const U = 'http://127.0.0.1:8090/local.html?api=' + encodeURIComponent(API);
  const mk = async (name, dev) => { const ctx = await b.newContext({ ...devices[dev] }); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    const em = `${name.toLowerCase()}${Date.now()}@chat.test`;
    const r = await (await fetch(API + '/v1/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: em, password: 'Motdepasse-42', displayName: name }) })).json();
    await p.goto(U + '&nouveau'); await p.waitForTimeout(400);
    await p.evaluate((j) => { localStorage.setItem('oneera.real.v1', JSON.stringify({ token: j.token, user: j.user, email: 'x' })); }, r);
    await p.goto(U); await p.waitForTimeout(1800); await p.evaluate(() => { ST.tourDone = true; document.querySelectorAll('.tour').forEach(e => e.remove()); });
    p.tok = r.token; p.uid = r.user.id; return p; };
  const A = await mk('Léa', 'iPhone 14'), B = await mk('Tom', 'iPhone SE');
  const call = (p, m, path, body) => fetch(API + path, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + p.tok }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
  // Onglet Amis vide : aucune donnée de démo
  await A.evaluate(() => V.friendsTab()); await A.waitForTimeout(600);
  const t0 = await A.evaluate(() => document.querySelector('#screen').innerText);
  ok(!/Jade|Noah|Maya|personnes de ton réseau|Tu connais peut-être/.test(t0), 'onglet Amis (compte réel) : aucune personne inventée');
  ok(/Ajoute tes premiers amis/.test(t0), 'onglet Amis vide : invitation claire à ajouter des amis');
  // Tom demande Léa en ami → Léa voit la demande en direct (badge + onglet Demandes)
  await call(B, 'POST', '/v1/friends/requests', { userIds: [A.uid] });
  await A.waitForTimeout(1500);
  const badge = await A.evaluate(() => (document.querySelector('.nav [data-nav="amis"] .badge') || {}).textContent || '');
  ok(badge === '1', `badge « Amis » mis à jour en direct (${badge || 'aucun'})`);
  await A.evaluate(() => V.friendsTab()); await A.waitForTimeout(500);
  const t1 = await A.evaluate(() => document.querySelector('#fl').innerText);
  ok(/Tom/.test(t1) && /Accepter/.test(t1), 'Léa voit la demande de Tom');
  await A.click('[data-acc]'); await A.waitForTimeout(1500);
  const fr = await A.evaluate(() => rAccepted().map(f => f.displayName));
  ok(fr.includes('Tom'), 'demande acceptée → amis');
  // Discussion
  await A.evaluate((id) => V.chat(id), B.uid); await A.waitForTimeout(900);
  await A.fill('#tx', 'Salut Tom ! <img src=x onerror=window.__pw=1>'); await A.click('#snd');
  await B.waitForTimeout(1500);
  const bBadge = await B.evaluate(() => unreadChat());
  ok(bBadge === 1, `Tom : 1 message non lu (${bBadge})`);
  const pushTxt = await B.evaluate(() => (document.querySelector('.push') || {}).innerText || '');
  ok(/Léa/.test(pushTxt), 'Tom reçoit une notification « Léa »');
  await B.evaluate(() => V.chatList()); await B.waitForTimeout(900);
  const cl = await B.evaluate(() => document.querySelector('#cl').innerText);
  ok(/Léa/.test(cl) && /Salut Tom/.test(cl), 'liste des discussions de Tom : dernier message de Léa');
  await B.evaluate((id) => V.chat(id), A.uid); await B.waitForTimeout(1000);
  const bm = await B.evaluate(() => [...document.querySelectorAll('#ms .bub')].map(e => e.className + '|' + e.textContent));
  ok(bm.length === 1 && /them/.test(bm[0]) && bm[0].includes('<img src=x'), 'Tom lit le message (affiché comme texte, jamais exécuté)');
  const dbg = await B.evaluate(() => [window.__pw, JSON.stringify(ST.unread.by), REAL.chatOpen]); ok(dbg[0] === undefined && dbg[1] === '{}', 'aucune injection ; non-lus remis à zéro ' + dbg.join(' '));
  // Réponse en direct pendant que Léa a la discussion ouverte
  const tA = Date.now(); await B.fill('#tx', 'J’arrive 🏃'); await B.press('#tx', 'Enter');
  let got = false; for (let i = 0; i < 60 && !got; i++) { await A.waitForTimeout(50); got = await A.evaluate(() => [...document.querySelectorAll('#ms .bub.them')].some(e => /J’arrive/.test(e.textContent))); }
  ok(got, `Léa voit la réponse en direct (${Date.now() - tA} ms)`);
  // Position partagée « Rejoins-moi ici » → carte avec bouton « Y aller »
  await A.evaluate(() => { ST.perms.loc = 'app'; ST.me.pos = [40, 55]; });
  await A.click('#qr [data-k="meet"]'); await B.waitForTimeout(1500);
  const loc = await B.evaluate(() => { const l = [...document.querySelectorAll('#ms .locmsg')].pop(); return l ? l.innerText : ''; });
  ok(/Rejoins-moi ici/.test(loc) && /Y aller/.test(loc), 'Tom reçoit « Rejoins-moi ici » avec « Y aller »');
  await B.click('#ms [data-go]'); await B.waitForTimeout(900);
  ok(await B.evaluate(() => !!document.querySelector('#mv')), '« Y aller » ouvre l’itinéraire sur la carte');
  // Bulle sur la carte côté Tom
  ok(await B.evaluate(() => !!(ST.bubbles[Object.keys(ST.bubbles)[0]] || {}).t), 'le dernier message de Léa s’affiche en bulle sur la carte');
  // Persistance : rechargement → fil conservé
  await A.reload(); await A.waitForTimeout(1800); await A.evaluate((id) => V.chat(id), B.uid); await A.waitForTimeout(1200);
  const kept = await A.evaluate(() => document.querySelectorAll('#ms .bub, #ms .locmsg').length);
  ok(kept === 3, `fil conservé après redémarrage de l’app (${kept} messages)`);
  // Fiche ami réelle (pas de batterie inventée)
  await A.evaluate((id) => V.friendSheet(id), B.uid); await A.waitForTimeout(500);
  const fs = await A.evaluate(() => document.querySelector('.sheet').innerText);
  ok(/Tom/.test(fs) && !/🔋|@lea|@tom/.test(fs), 'fiche ami : données réelles uniquement');
  // Retrait d'ami → plus d'envoi
  await A.click('#rm'); await A.waitForTimeout(300); await A.click('.sheet #ok'); await A.waitForTimeout(1500);
  ok(await A.evaluate(() => rAccepted().length === 0), 'ami retiré');
  const s = await call(B, 'POST', '/v1/messages', { to: A.uid, body: 'toujours là ?' });
  ok(s.error === 'forbidden', 'après retrait : Tom ne peut plus écrire à Léa');
  await B.waitForTimeout(800);
  ok(await B.evaluate(() => rAccepted().length === 0), 'côté Tom : Léa disparaît de ses amis en direct');
  ok(await A.evaluate(() => window.__pw === undefined) && await B.evaluate(() => window.__pw === undefined), 'aucun code injecté exécuté sur les deux téléphones');
  ok(A.errs.length + B.errs.length === 0, 'erreurs JS : ' + ([...A.errs, ...B.errs].join(' | ') || 'aucune'));
  console.log(`${n - f}/${n}`); await b.close();
})();
