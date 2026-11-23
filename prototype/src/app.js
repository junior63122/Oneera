// ===== Coque : téléphone + panneau de démonstration =====
function boot() {
  const dk = document.createElement('div'); dk.id = 'desk'; document.body.append(dk); dk.outerHTML = `<div id="desk"><div id="phoneWrap"><div id="phone"><div id="screen"><div class="island"></div><button id="fab-panel" aria-label="Panneau de démo">☰</button></div></div></div><aside id="panel"></aside></div>`;
  SCREEN = $('#screen'); fitPhone(); addEventListener('resize', fitPhone);
  $('#fab-panel').onclick = () => { const m = document.createElement('div'); m.id = 'mobileMenu'; m.innerHTML = `<div class="msheet">${panelHTML()}</div>`; m.onclick = e => { if (e.target === m) m.remove(); }; SCREEN.append(m); wirePanel(m); };
  wirePanel($('#panel')); renderPanel(); listeners.add(renderPanelLight);
  V.camera();
}
function fitPhone() {
  const ph = $('#phone'); if (!ph) return; if (innerWidth <= 820) { ph.style.transform = ''; ph.parentElement.style.width = ph.parentElement.style.height = ''; return; }
  const k = Math.min(1, (innerHeight - 24) / 844); ph.style.transform = `scale(${k})`; ph.parentElement.style.width = 390 * k + 'px'; ph.parentElement.style.height = 844 * k + 'px'; ph.style.transformOrigin = '0 0';
}
function panelHTML() {
  const m = ST.metrics, done = m.steps.map, t = done ? m.steps.map.t : m.start ? (performance.now() - m.start) / 1000 : 0;
  return `<section class="pcard"><h2>Défi : de l’entrée à la carte en moins de 2 min</h2>
      <div class="chrono ${done ? (t <= 120 ? 'ok' : 'late') : ''}"><b id="chr">${fmtT(t)}</b><span>${m.taps} touches</span></div>
      <div class="steps">${STEP_NAMES.map(([k, n]) => `<div class="${m.steps[k] ? 'done' : ''}"><span>${m.steps[k] ? '✓' : '○'} ${n}</span><span>${m.steps[k] ? fmtT(m.steps[k].t) : ''}</span></div>`).join('')}</div>
      <p>${done ? (t <= 120 ? 'Objectif atteint dans le prototype.' : 'Au-delà de 2 min : regarde quelle étape a pris le plus de temps.') : 'Lance le parcours et joue le visiteur.'}</p>${done ? `<p><b>En conditions réelles ≈ ${fmtT(t + 25)}</b> : ouverture de l’App Clip sur réseau chargé (+5 à 10 s), saisie réelle du pseudo (+5 s), réponse des amis au lien de bande (+10 s). À confirmer par un test terrain avec de vrais téléphones.</p>` : ''}
      <div class="pbtns"><button class="pbtn" data-p="restart">Recommencer depuis le QR</button><button class="pbtn" data-p="skip">Passer à la carte</button></div></section>
    <section class="pcard"><h2>Téléphone</h2><div class="pbtns">${[['ios', 'iPhone'], ['android', 'Android']].map(o => `<button class="pbtn ${ST.os === o[0] ? 'on' : ''}" data-p="os:${o[0]}">${o[1]}</button>`).join('')}</div><p>Fenêtres d’autorisation, connexion et App Clip / Instant App propres à chaque système.</p></section>
    <section class="pcard"><h2>Scénario testé</h2><div class="pbtns">${TEMPLATES.map(t => `<button class="pbtn ${ST.template === t.id ? 'on' : ''}" data-p="tpl:${t.id}">${t.n}</button>`).join('')}</div><div class="pbtns">${Object.values(VENUES).map(v => `<button class="pbtn ${VENUE.id === v.id ? 'on' : ''}" data-p="venue:${v.id}">Plan : ${v.name}</button>`).join('')}</div><p>${VENUE.name} · ${VENUE.tech}. ${(TEMPLATES.find(t => t.id === ST.template) || {}).visitor?.join(' · ') || ''}</p></section>
    <section class="pcard"><h2>Voir l’app en tant que</h2><div class="pbtns">${[['visitor', 'Visiteur'], ['staff', 'Agent sécurité'], ['bar', 'Barman'], ['dash', 'Organisateur (web)']].map(r => `<button class="pbtn ${ST.role === r[0] ? 'on' : ''}" data-p="role:${r[0]}">${r[1]}</button>`).join('')}</div>
      <p>Toutes les vues partagent les mêmes données : un signalement envoyé par le visiteur arrive chez l’agent et l’organisateur ; une rupture déclarée au bar s’affiche dans la carte des boissons.</p></section>
    <section class="pcard"><h2>Simuler</h2><div class="pbtns">
      <button class="pbtn" data-p="msg">Message de Léa</button><button class="pbtn" data-p="near">Ami arrivé</button><button class="pbtn" data-p="orga">Annonce de l’organisateur</button>
      <button class="pbtn ${ST.offline ? 'on' : ''}" data-p="offline">Pas de réseau</button><button class="pbtn" data-p="recap">Fin de soirée (récap)</button><button class="pbtn" data-p="guest">Mode invité</button><button class="pbtn" data-p="lock">Écran verrouillé</button><button class="pbtn" data-p="find">Chercher Léa (boussole)</button></div></section>
    <section class="pcard"><h2>Journal en direct</h2><div class="logline">${ST.log.slice(-30).map(l => `<span>${esc(l)}</span>`).join('') || '<span>Les actions des 3 vues s’affichent ici.</span>'}</div></section>
    <section class="pcard"><p>Prototype de démonstration : données fictives, installation, connexions Apple/Google et SMS simulées. Plan, avatars et icônes : visuels ONEERA existants.</p></section>`;
}
const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function renderPanel() { const p = $('#panel'); if (!p) return; const lg = p.querySelector('.logline'), sc = lg ? lg.scrollTop : 0; p.innerHTML = panelHTML(); const l2 = p.querySelector('.logline'); if (l2) l2.scrollTop = sc; }
let lastPanel = 0;
function renderPanelLight() { const now = performance.now(); if (now - lastPanel < 250) return; lastPanel = now; renderPanel(); }
setInterval(() => { const c = $('#chr'); if (c && ST.metrics.start && !ST.metrics.steps.map) c.textContent = fmtT((performance.now() - ST.metrics.start) / 1000); }, 250);
function wirePanel(root) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return; const p = b.dataset.p; $('#mobileMenu')?.remove();
    if (p === 'restart') { resetDemo(); V.camera(); }
    if (p === 'skip') { quickSetup(); V.map(); }
    if (p.startsWith('role:')) { const r = p.slice(5); if (r === 'dash') { openDash('global'); renderPanel(); return; } ST.role = r; $('#dash') && closeDash(); if (r === 'visitor') { if (!ST.account) quickSetup(); V.map(); flushPush(); } else { S.map(); flushPush(); } }
    if (p === 'msg') { ensureVisitor(); ST.convos.lea.push({ me: 0, t: 'Je suis au bar à cocktails, tu viens ? 🍹' }); ST.unread.by.lea = (ST.unread.by.lea || 0) + 1; push({ title: 'Léa', text: 'Je suis au bar à cocktails, tu viens ? 🍹', icon: fHead('lea'), onTap: () => V.chat('lea') }); }
    if (p === 'near') { ensureVisitor(); if (!ST.friends.includes('yanis')) ST.friends.push('yanis'); push({ title: 'Yanis est arrivé', text: 'Il est à la Rotonde, à 120 m de toi.', icon: fHead('yanis'), onTap: () => V.friendSheet('yanis') }); }
    if (p === 'orga') { ensureVisitor(); push({ title: 'Le Bal des Fous', text: 'Le bar Est est le plus rapide en ce moment (≈ 3 min).', app: 'ONEERA · Le Bal des Fous', onTap: () => V.poiSheet('barE') }); }
    if (p === 'offline') { ST.offline = !ST.offline; logEv(ST.offline ? 'Réseau perdu' : 'Réseau revenu'); if (!ST.offline) flushOffline(); emit(); if (ST.role === 'visitor' && MV && document.body.contains(MV.host) && $('#screen .nav')) V.map({ at: MV.centerPct(), zoom: MV.s }); else toast(ST.offline ? 'Réseau coupé' : 'Réseau revenu'); }
    if (p === 'recap') { ensureVisitor(); push({ title: 'Merci pour cette soirée ✨', text: 'Ton récap du Bal des Fous est prêt : 5 h 17, 3,4 km.', onTap: V.recap }); setTimeout(V.recap, 1200); }
    if (p === 'guest') { resetDemo(); ST.account = 'guest'; V.map(); }
    if (p.startsWith('os:')) { ST.os = p.slice(3); toast(ST.os === 'android' ? 'Mode Android' : 'Mode iPhone'); }
    if (p.startsWith('tpl:')) { applyTemplate(p.slice(4)); if ($('#dash')) openDash(D.view); else if (ST.role === 'visitor') { if (!ST.account) quickSetup(); V.map(); toast('Scénario : ' + TEMPLATES.find(t => t.id === ST.template).n); } else S.map(); }
    if (p.startsWith('venue:')) { setVenue(p.slice(6)); if ($('#dash')) openDash(D.view === 'club' || D.view === 'clubcmp' ? 'global' : D.view); else if (ST.role === 'visitor') { if (!ST.account) quickSetup(); V.map(); } else S.map(); }
    if (p === 'lock') { ensureVisitor(); V.lock(); }
    if (p === 'find') { ensureVisitor(); V.findFriend('lea'); }
    renderPanel();
  });
}
function ensureVisitor() { if (ST.role !== 'visitor') { ST.role = 'visitor'; if (!ST.account) quickSetup(); V.map(); } $('#dash') && closeDash(); flushPush(); }
function quickSetup() { if (!ST.account || ST.account === 'guest') { ST.account = 'apple'; ST.me.pseudo = 'alex.m'; Object.assign(ST.perms, { loc: 'app', bt: true, notif: true, motion: true, contacts: 'full' }); ST.friends = ['lea', 'ines', 'tom', 'sami']; } }
const INIT = { st: JSON.parse(JSON.stringify(ST)), staff: JSON.parse(JSON.stringify(STAFF)), rv: JSON.parse(JSON.stringify(ST._rv)) };
function resetDemo() {
  setVenue('bdf'); const keepLog = ST.log; Object.keys(ST).forEach(k => delete ST[k]); Object.assign(ST, JSON.parse(JSON.stringify(INIT.st)), { log: keepLog, pushQueue: [] }); ST._rv = JSON.parse(JSON.stringify(INIT.rv)); defineReports(ST._rv.bdf);
  STAFF.forEach((s, i) => Object.assign(s, INIT.staff[i], { revoked: false })); D.reassort = []; D.commUsed = 2; D.pendingPush = []; D.crisis = false;
  if (walking) { tickers.delete(walking); walking = null; } if (MV) { MV.destroy(); MV = null; } clearTimeout(V._alwaysT); mapFilter = 'all'; showCrowd = false; nightMap = false;
   ST.account = null; ST.friends = []; ST.sent = []; ST.rdv = null; ST.role = 'visitor'; ST.offline = false; ST._askedAlways = 0; ST.me.pos = [50, 63]; Object.assign(ST.perms, { loc: null, always: false, bt: null, notif: null, motion: null, contacts: null, stats: false }); ST.metrics = { taps: 0, start: null, steps: {} }; $('#dash') && closeDash(); }
boot();
