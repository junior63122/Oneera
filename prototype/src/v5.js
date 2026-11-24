// ===== v5 : exigences des documents appliquées (app visiteur) =====
// Chaque bloc cite l'exigence d'origine (cahier des charges V1, recette du 14/08, échanges avec le fondateur).

// ---------- Reprise de session : rouvrir l'app ramène sur la carte (« quand on quitte l'app, ne pas sortir de la map ») ----------
const SESSION_KEY = 'oneera.session.v5';
const SESSION_KEYS = ['account', 'me', 'perms', 'friends', 'sharing', 'theme', 'lang', 'mapMode', 'map3d', 'mapAnim', 'favs', 'introSeen', 'showBub', 'bubbles', 'quietHours', 'notifPrefs'];
function saveSession() { try { if (!ST.account || ST.role !== 'visitor') return; const o = { venue: VENUE.id, t: Date.now() }; SESSION_KEYS.forEach(k => o[k] = ST[k]); localStorage.setItem(SESSION_KEY, JSON.stringify(o)); } catch (_) {} }
function loadSession() { try { const o = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); if (!o || !o.account || Date.now() - o.t > 7 * 864e5) return null; return o; } catch (_) { return null; } }
function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (_) {} }
addEventListener('pagehide', saveSession); let _saveT = 0; listeners.add(() => { clearTimeout(_saveT); _saveT = setTimeout(saveSession, 400); });
const _resetDemo = resetDemo; resetDemo = function () { clearSession(); _resetDemo(); };
const _boot = boot; boot = function () {
  _boot(); if (/[?&]nouveau/.test(location.search)) { clearSession(); return; }
  const o = loadSession(); if (!o) return;
  SESSION_KEYS.forEach(k => { if (o[k] !== undefined) ST[k] = o[k]; }); if (o.venue && VENUES[o.venue]) setVenue(o.venue);
  ST.introSeen = Object.assign({}, ST.introSeen, { [VENUE.id]: 1 }); V.map(); toast('Tu reprends là où tu étais : ' + EVENT.name);
};

// ---------- Avatars superposés : répartis en éventail, pseudo toujours lisible (« superposition pas parfaite ») ----------
// (le calcul est fait dans MapView.renderMarkers via MapView.fan)
MapView.fan = function (list, mv) {
  const pp = list.filter(m => m.id && m.id.startsWith('p_')).map(m => ({ m, p: mv.projS(m.at) })), off = {};
  pp.forEach(a => { if (off[a.m.id]) return; const g = pp.filter(b => !off[b.m.id] && Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]) < 30); if (g.length > 1) g.forEach((b, j) => { const k = j - (g.length - 1) / 2; off[b.m.id] = [k * 36, Math.abs(k) * 6]; }); });
  return off;
};

// ---------- Bulles de messages sur la carte (visibles des seuls amis) + masquer / afficher ----------
ST.showBub = ST.showBub !== false; ST.bubbles = ST.bubbles || { lea: { t: 'Devant la scène 🔥', at: 23 * 60 + 30, v: 'bdf' }, sami: { t: 'Qui vient au bar ?', at: 23 * 60 + 36, v: 'bdf' } };
const bubFresh = b => b && (!b.v || b.v === VENUE.id) && ((ST.clock - b.at + 1440) % 1440) < 30;
const _mapMarkers = mapMarkers;
mapMarkers = function (mv) {
  const out = _mapMarkers(mv);
  out.forEach(m => {
    if (m.id === 'p_me') m.onClick = V.meSheet;
    const id = m.id && m.id.startsWith('p_') ? m.id.slice(2) : null, b = id && ST.bubbles[id === 'me' ? 'me' : id];
    if (ST.showBub && bubFresh(b) && typeof m.html === 'string' && /^<div class="fr( fullb)?">/.test(m.html)) m.html = m.html.replace(/^(<div class="fr(?: fullb)?">)/, `$1<div class="bub">${esc(b.t)}</div>`);
  });
  return out;
};

// ---------- Fiche « Moi » : inviter un ami à me rejoindre ici, écrire sur la carte, partage ----------
V.meSheet = () => {
  if (guest()) return needAccount();
  const mine = ST.bubbles.me && bubFresh(ST.bubbles.me);
  const sb = openSheet(`<div style="display:flex;gap:12px;align-items:center"><img src="${meHead()}" alt="" style="width:56px;height:56px;border-radius:28px;box-shadow:0 0 0 3px #4F6BF5"><div><h2 class="h2">Moi · ${esc(zoneOf(ST.me.pos))}</h2><div class="small">Visible par ${ST.sharing.mode === 'off' ? 'personne' : myFriends().length + ' amis'}</div></div></div>
    <button class="btn" id="inv">${I.users.replace('<svg', '<svg width="18"')} Inviter un ami à me rejoindre ici</button>
    <button class="btn white" id="wr">${I.chat.replace('<svg', '<svg width="18"')} ${mine ? 'Modifier mon message sur la carte' : 'Écrire un message sur la carte'}</button>
    <button class="row" id="sb" style="background:#F3F5FB;border-radius:14px"><div class="grow"><div class="t">Afficher les messages sur la carte</div><div class="s">Bulles de tes amis, 30 min</div></div><span class="tog ${ST.showBub ? 'on' : ''}"></span></button>
    <button class="row" id="sh"><div class="ico">${I.eye}</div><div class="grow"><div class="t">Partage de ma position</div><div class="s">${shareLabel()}</div></div></button>`);
  $('#inv', sb).onclick = () => V.pickFriends('Inviter à me rejoindre ici', ids => { ids.forEach(id => (ST.convos[id] = ST.convos[id] || []).push({ me: 1, t: '📍 Rejoins-moi ici (' + zoneOf(ST.me.pos) + ')', loc: zoneOf(ST.me.pos) })); const n = ids.map(i => FRIENDS.find(f => f.id === i).n); toast(`Invitation envoyée à ${n.join(', ')} : ta position et l’itinéraire`); emit();
    setTimeout(() => { if (!document.body.contains(MV && MV.host)) return; ST.bubbles[ids[0]] = { t: 'J’arrive ! 🏃', at: ST.clock, v: VENUE.id }; emit(); }, 2500); });
  $('#wr', sb).onclick = V.mapMessage;
  $('#sb', sb).onclick = () => { ST.showBub = !ST.showBub; $('#sb .tog', sb).classList.toggle('on', ST.showBub); emit(); toast(ST.showBub ? 'Messages affichés sur la carte' : 'Messages masqués sur la carte'); };
  $('#sh', sb).onclick = V.shareSettings;
};
V.mapMessage = () => {
  let ment = [];
  const sb = openSheet(`<h2 class="h2">Message sur la carte</h2><div class="small" style="margin-top:-6px">Une bulle au-dessus de ton avatar pendant 30 min, visible par tes amis seulement.</div>
    <input class="inp" id="mt" maxlength="60" placeholder="Ex. : On est au bar ouest !" value="${esc((ST.bubbles.me && bubFresh(ST.bubbles.me) && ST.bubbles.me.t) || '')}" aria-label="Message">
    <div class="small"><b>Mentionner</b> (notification avec ta position) :</div><div class="chips" style="flex-wrap:wrap" id="mn">${myFriends().map(f => `<button class="chip" data-m="${f.id}"><img src="${fHead(f.id)}" alt="" style="width:22px;height:22px;border-radius:11px"> @${f.n}</button>`).join('')}</div>
    <div class="grid2"><button class="btn white" id="rm">Retirer</button><button class="btn" id="ok">Publier</button></div>`);
  $('#mt', sb).oninput = e => { const v = e.target.value, m = v.match(/@([\p{L}\w.-]+)/gu) || []; m.forEach(x => { const f = myFriends().find(f => f.n.toLowerCase() === x.slice(1).toLowerCase()); if (f && !ment.includes(f.id)) { ment.push(f.id); $(`[data-m="${f.id}"]`, sb).classList.add('on'); } }); };
  $('#mn', sb).onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; const id = b.dataset.m; ment = ment.includes(id) ? ment.filter(x => x !== id) : ment.concat(id); b.classList.toggle('on'); };
  $('#rm', sb).onclick = () => { delete ST.bubbles.me; closeSheet(); emit(); toast('Message retiré de la carte'); };
  $('#ok', sb).onclick = () => { const t = $('#mt', sb).value.trim(); if (!t) { $('#mt', sb).focus(); return; } ST.bubbles.me = { t, at: ST.clock, v: VENUE.id }; ment.forEach(id => (ST.convos[id] = ST.convos[id] || []).push({ me: 1, t: '@' + FRIENDS.find(f => f.id === id).n + ' ' + t + ' 📍 ' + zoneOf(ST.me.pos), loc: zoneOf(ST.me.pos) })); closeSheet(); emit();
    toast(ment.length ? `Publié · ${ment.map(i => FRIENDS.find(f => f.id === i).n).join(', ')} prévenu(s) avec ta position` : 'Publié sur la carte · visible par tes amis 30 min'); };
};
V.pickFriends = (title, cb, pre = []) => {
  let sel = [...pre];
  const sb = openSheet(`<h2 class="h2">${title}</h2><div class="list" id="pf">${myFriends().map(f => `<button class="row" data-u="${f.id}"><img class="av" src="${fHead(f.id)}" alt=""><div class="grow"><div class="t">${f.n}</div><div class="s">${zoneOf(FR_STATE[f.id].pos)}</div></div><span data-c></span></button>`).join('') || '<div class="row small">Ajoute d’abord des amis.</div>'}</div><button class="btn" id="ok" disabled>Valider</button>`);
  const paint = () => { $$('#pf [data-u]', sb).forEach(r => r.querySelector('[data-c]').style.cssText = `width:22px;height:22px;border-radius:6px;${sel.includes(r.dataset.u) ? 'background:#4F6BF5;box-shadow:inset 0 0 0 5px #fff,0 0 0 2px #4F6BF5' : 'box-shadow:inset 0 0 0 2px #C5C9D6'}`); $('#ok', sb).disabled = !sel.length; };
  $('#pf', sb).onclick = e => { const u = e.target.closest('[data-u]')?.dataset.u; if (!u) return; sel = sel.includes(u) ? sel.filter(x => x !== u) : sel.concat(u); paint(); };
  $('#ok', sb).onclick = () => { closeSheet(true); cb(sel); }; paint();
};

// ---------- Partage de position : 15 min / 1 h / 3 h / jusqu'à la fin, « sauf… » et « seulement… » avec choix des amis ----------
function shareLabel() { const s = ST.sharing; if (s.mode === 'off') return 'Désactivé'; const d = { event: 'Jusqu’à la fin', '15m': '15 min', '1h': '1 h', '3h': '3 h' }[s.mode] || 'Jusqu’à la fin'; const w = s.who === 'except' ? `amis sauf ${(s.except || []).length}` : s.who === 'only' ? `${(s.only || []).length} ami(s)` : 'tous mes amis'; return `${d} · ${s.ghost ? 'mode fantôme' : w}`; }
V.shareSettings = () => {
  const s = ST.sharing; s.except = s.except || []; s.only = s.only || [];
  const sb = openSheet(`<h2 class="h2">Partager ma position</h2>
    <div class="seg" id="md">${[['event', 'Soirée'], ['15m', '15 min'], ['1h', '1 h'], ['3h', '3 h'], ['off', 'Arrêter']].map(m => `<button data-m="${m[0]}">${m[1]}</button>`).join('')}</div>
    <div class="small" id="ex"></div>
    <div id="who" class="list">${[['friends', 'Tous mes amis'], ['except', 'Mes amis, sauf…'], ['only', 'Seulement ces amis']].map(w => `<button class="row" data-w="${w[0]}"><div class="grow"><div class="t">${w[1]}</div><div class="s" data-n></div></div><span data-r></span></button>`).join('')}</div>
    <button class="row" id="gh" style="background:#F3F5FB;border-radius:14px"><div class="ico">${I.eyeOff}</div><div class="grow"><div class="t">Mode fantôme</div><div class="s">Tu vois tes amis, eux voient ta dernière zone seulement</div></div><span class="tog"></span></button>
    <button class="row" id="ao" style="background:#F3F5FB;border-radius:14px"><div class="grow"><div class="t">Arrêt automatique à la sortie du lieu</div><div class="s">Ta position n’est plus partagée dès que tu quittes le site</div></div><span class="tog ${s.autoOff !== false ? 'on' : ''}"></span></button>
    <div class="tiny">Seuls tes amis voient ta position. L’organisateur ne voit jamais ta position, seulement des statistiques anonymes. L’équipe de sécurité la reçoit uniquement si tu envoies une alerte.</div>`);
  const end = m => fmtClock(ST.clock + ({ '15m': 15, '1h': 60, '3h': 180 }[m] || 0));
  const paint = () => {
    $$('#md button', sb).forEach(b => b.classList.toggle('on', b.dataset.m === s.mode));
    $('#ex', sb).textContent = s.mode === 'off' ? 'Tes amis ne te voient plus, immédiatement. Tu continues de voir la carte et les lieux.' : s.mode === 'event' ? 'Partage jusqu’à la fin de l’événement, puis arrêt automatique.' : `Partage jusqu’à ${end(s.mode)}, puis arrêt automatique.`;
    $('#who', sb).style.opacity = s.mode === 'off' ? .4 : 1; $('#who', sb).style.pointerEvents = s.mode === 'off' ? 'none' : '';
    $$('#who [data-w]', sb).forEach(r => { r.querySelector('[data-r]').style.cssText = `width:20px;height:20px;border-radius:10px;border:${r.dataset.w === s.who ? '6px solid #4F6BF5' : '2px solid #C5C9D6'}`; const l = r.dataset.w === 'except' ? s.except : r.dataset.w === 'only' ? s.only : null; r.querySelector('[data-n]').textContent = l && l.length ? l.map(i => FRIENDS.find(f => f.id === i).n).join(', ') : ''; });
    $('#gh .tog', sb).classList.toggle('on', s.ghost); $('#ao .tog', sb).classList.toggle('on', s.autoOff !== false);
  };
  sb.onclick = e => {
    const m = e.target.closest('[data-m]'), w = e.target.closest('[data-w]');
    if (m) { s.mode = m.dataset.m; if (s.mode !== 'off') s.until = s.mode === 'event' ? null : ST.clock + ({ '15m': 15, '1h': 60, '3h': 180 }[s.mode]); }
    if (w) { const k = w.dataset.w; if (k === 'friends') s.who = k; else { V.pickFriends(k === 'except' ? 'Masquer ma position pour…' : 'Partager seulement avec…', ids => { s[k] = ids; s.who = k; emit(); V.shareSettings(); }, s[k]); return; } }
    if (e.target.closest('#gh')) s.ghost = !s.ghost; if (e.target.closest('#ao')) s.autoOff = s.autoOff === false; paint(); emit();
  };
  paint();
};

// ---------- Signalement : les 3 choix exacts du cahier des charges, rappel 112, anti-spam ----------
const REPORT_MAIN = [['medical', 'Quelqu’un a besoin d’aide ici', 'infirmerie', '#E5484D'], ['crowd', 'Zone bondée / danger potentiel', 'dancefloor', '#E58A00'], ['lost', 'Objets perdus / retrouvés', 'objets_trouves', '#4F6BF5']];
V.report = () => {
  const sb = openSheet(`<h2 class="h2">Signaler un problème</h2><p class="small" style="margin:-6px 0 0">Ta position est jointe. L’équipe du lieu reçoit l’alerte en direct.</p>
    <div class="list">${REPORT_MAIN.map(c => `<button class="row" data-c="${c[0]}" style="min-height:64px;box-shadow:inset 4px 0 0 ${c[3]}"><img src="${IC(c[2])}" alt="" style="width:44px"><div class="grow"><div class="t" style="font-size:16px">${c[1]}</div></div><span style="color:#9AA0B4">›</span></button>`).join('')}</div>
    <div class="sec" style="margin-top:2px">Autre situation</div>
    <div class="chips" style="flex-wrap:wrap">${CATS.filter(c => !['medical', 'crowd', 'lost'].includes(c[0])).map(c => `<button class="chip" data-c="${c[0]}">${c[1]}</button>`).join('')}</div>
    <div class="card" style="background:#FDECEC;gap:8px"><b style="color:#B42318">Urgence vitale ? Appelle le ${tpl().sos[0]}</b><div class="small">ONEERA ne remplace pas les secours.</div><div class="grid2"><button class="btn red" id="c112">${I.phone.replace('<svg', '<svg width="18"')} Appeler le ${tpl().sos[0]}</button>${tpl().sos[1] ? `<button class="btn white" id="c114">SMS au ${tpl().sos[1]}</button>` : `<button class="btn white" id="cpost">Poste de secours</button>`}</div></div>`);
  sb.onclick = async e => { const c = e.target.closest('[data-c]'); if (c) return V.reportDetail(c.dataset.c); if (e.target.closest('#cpost')) { const s = POIS.find(o => o.cat === 'secu'); closeSheet(true); if (s) V.goTo(s.at, s.n, s.node); return; }
    if (e.target.closest('#c112,#c114')) { const is112 = !!e.target.closest('#c112'), n = is112 ? tpl().sos[0] : tpl().sos[1]; await sysAlert({ title: is112 ? `Appeler le ${n} ?` : `Écrire au ${n} ?`, text: 'Sur ton téléphone, l’appel ou le SMS s’ouvre directement (démonstration : aucun appel n’est passé).', buttons: [{ t: 'Annuler', v: 0 }, { t: is112 ? 'Appeler' : 'Écrire', v: 1, b: 1 }] }); } };
};
const _reportDetail = V.reportDetail;
V.reportDetail = (cat) => {
  const mine = ST.reports.filter(r => r.mine && !r.demo), same = mine.find(r => r.cat === cat && r.status !== 'Résolu' && ((ST.clock - clockMin(r.time) + 1440) % 1440) < 3);
  if (same) { toast('Ton signalement est déjà transmis à l’équipe : suis son avancement ici'); return V.reportStatus(same.id); }
  if (mine.filter(r => ((ST.clock - clockMin(r.time) + 1440) % 1440) < 10).length >= 3) { toast('Tu as déjà envoyé 3 signalements en 10 min. En cas d’urgence vitale, appelle le ' + tpl().sos[0]); return; }
  _reportDetail(cat); const main = REPORT_MAIN.find(c => c[0] === cat); const h = $('.sheet .h2'); if (main && h) h.textContent = main[1];
};

// ---------- Notifications : les textes exigés (avant, pendant, après) ----------
const EVENT_NOTIFS = () => [
  { title: 'Un signalement a été émis dans votre zone', text: 'Bar Est : l’équipe est sur place. Rien à faire de ton côté.', t: '23:31', icon: IC('securite'), k: 'secu' },
  { title: 'Vos amis sont à proximité', text: 'Léa et Inès sont à moins de 60 m, près de la Fosse.', t: '23:04', icon: fHead('lea'), k: 'amis' },
  { title: 'Activez le Bluetooth pour améliorer la précision de la carte', text: 'À l’intérieur et dans la foule, ta position est plus juste.', t: '22:36', icon: IC('point_info'), k: 'event' },
  { title: 'Tu arrives : ' + EVENT.name, text: 'Active ta localisation et lance la carte pour retrouver tes amis.', t: '22:31', icon: A + 'logo.webp', k: 'event' },
  { title: 'L’événement est actif', text: EVENT.name + ' a ouvert ses portes. La carte est en direct.', t: '20:00', icon: A + 'logo.webp', k: 'event' }];
const _notifs = V.notifs;
V.notifs = () => {
  if (!ST._v5n) { ST._v5n = 1; ST.notifs = ST.notifs.concat(EVENT_NOTIFS()); }
  _notifs();
  const el = $('.scr'); if (!el) return;
  $$('.chips .chip', el).forEach((c, i) => c.onclick = () => { $$('.chips .chip', el).forEach(x => x.classList.toggle('on', x === c)); $$('.list .row', el).forEach(r => { const t = r.textContent; r.hidden = i && !(i === 1 ? /ami|Léa|Inès|Tom|Sami|proximité|RDV|Rejoins/i.test(t) : i === 2 ? /scène|commence|événement|Bluetooth|localisation|carte|merci|Revivez|Partagez/i.test(t) : /signalement|sécurité|alerte|secours/i.test(t)); }); });
};
V.endOfEvent = () => {
  ST.ended = true; push({ title: 'L’événement est terminé · merci d’être venu ✨', text: 'Merci pour cette soirée (' + EVENT.name + '). Revivez l’événement : ton récap est prêt.', onTap: V.recap });
  setTimeout(() => push({ title: 'Revivez l’événement', text: 'Ta soirée en replay : 5 h 17, 3,4 km, tes moments avec tes amis.', onTap: V.recap }), 2800);
  setTimeout(() => push({ title: 'Partagez l’application avec vos amis', text: 'Ils retrouveront leurs amis au prochain événement ONEERA.', onTap: () => V.shareSheet('Retrouve-moi sur ONEERA : la vue des Dieux dans ta poche. oneera.app') }), 5600);
};

// ---------- Mode écran : uniquement la carte et les nuages (« qu'on ne voie que la map et les nuages ») ----------
V.kiosk = (on = true) => {
  SCREEN.classList.toggle('kiosk', on); closeSheet(true);
  $$('.kioskExit', SCREEN).forEach(b => b.remove()); if (!on) return;
  const b = document.createElement('button'); b.className = 'kioskExit'; b.textContent = 'Quitter le mode écran'; b.onclick = () => V.kiosk(false); SCREEN.append(b);
  let t; const show = () => { b.classList.add('on'); clearTimeout(t); t = setTimeout(() => b.classList.remove('on'), 2600); }; SCREEN.addEventListener('pointerdown', show); show();
};
const _layers = V.layers;
V.layers = () => { _layers(); const sb = $('.sheet .sbody'); if (!sb) return; sb.insertAdjacentHTML('beforeend', `<div class="list"><button class="row" id="kio"><div class="ico">${I.map}</div><div class="grow"><div class="t">Mode écran</div><div class="s">Seulement la carte et les nuages, pour un écran géant ou une borne</div></div></button><button class="row" id="bubT"><div class="grow"><div class="t">Messages sur la carte</div><div class="s">Bulles de tes amis</div></div><span class="tog ${ST.showBub ? 'on' : ''}"></span></button></div>`);
  $('#kio', sb).onclick = () => V.kiosk(true); $('#bubT', sb).onclick = () => { ST.showBub = !ST.showBub; $('#bubT .tog', sb).classList.toggle('on', ST.showBub); emit(); }; };

// ---------- Carte : compteur d'amis présents + « personnes de ton réseau à proximité » ----------
const _vmap = V.map;
V.map = (opts) => {
  _vmap(opts); saveSession(); if (!ST.tourDone && !guest() && !(opts && opts.at)) setTimeout(V.tour, ST.introSeen && MV && MV.intro ? 2600 : 500);
};

// ---------- Fenêtres : glisser vers le bas depuis tout le panneau pour fermer (pas seulement la poignée) ----------
document.addEventListener('pointerdown', e => {
  const sh = e.target.closest('.sheet'); if (!sh || e.target.closest('input,textarea,select,.grab')) return; const body = sh.querySelector('.sbody'); if (body && body.scrollTop > 0) return;
  const y0 = e.clientY, x0 = e.clientX; let drag = false;
  const mv = ev => { const dy = ev.clientY - y0; if (!drag && dy > 12 && dy > Math.abs(ev.clientX - x0) * 1.5) drag = true; if (drag) sh.style.transform = `translateY(${Math.max(0, dy)}px)`; };
  const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (!drag) return; sh.style.transform = ''; const stop = c => { c.stopPropagation(); c.preventDefault(); }; addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => removeEventListener('click', stop, true), 50); if (ev.clientY - y0 > 110) closeSheet(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
});

// ---------- Fiches lieux : affluence estimée partout, menu et prix des stands de restauration ----------
const _poiSheet = V.poiSheet;
V.poiSheet = (id) => {
  _poiSheet(id); const o = POIS.find(p => p.id === id), sb = $('.sheet .sbody'); if (!sb || !o) return;
  const z = ZONES.slice().sort((a, b) => dist(a.at, o.at) - dist(b.at, o.at))[0], r = z ? occNow(z) / z.cap : .5;
  const aff = `<div class="stat" style="flex-direction:row;align-items:center;justify-content:space-between"><span>Affluence estimée</span><b style="font-size:15px;color:${r > .85 ? '#E5484D' : r > .6 ? '#E58A00' : '#16A34A'}">${r > .85 ? 'Très animé' : r > .6 ? 'Animé' : 'Calme'} · ≈ ${Math.round(r * 100)} %</b></div>`;
  const g = sb.querySelector('.grid2'); if (g) g.insertAdjacentHTML('afterend', aff);
  if (MENU[id] && !o.bar) sb.insertAdjacentHTML('beforeend', `<div class="sec">Le menu</div>${MENU[id].map(([cat, items]) => `<div class="card" style="padding:10px 14px;gap:2px"><b style="font-size:13px;color:var(--ink2)">${cat}</b>${items.map(([n, p]) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #F1F2F7"><span>${n}</span><b style="font-variant-numeric:tabular-nums">${p.toFixed(2).replace('.', ',')} €</b></div>`).join('')}</div>`).join('')}<div class="tiny">Prix affichés par l’organisateur.</div>`);
};

// ---------- Programmation : à venir / en cours / terminé, rappel 15 min, fiche artiste, voir la scène ----------
const relMin = t => (clockMin(t) - 1200 + 1440) % 1440;
const setState = l => isLive(l) ? 'live' : relMin(l.t) <= nowMin() && relMin(l.f) < nowMin() ? 'done' : 'next';
lineupList = function (stage) {
  return `<div class="list">${LINEUP.filter(l => !stage || l.s === stage).map(l => { const st = setState(l); return `<div class="row" ${st === 'live' ? 'style="background:#F3F5FF"' : st === 'done' ? 'style="opacity:.55"' : ''}><div style="width:48px;font-variant-numeric:tabular-nums;font-weight:800;font-size:13px">${l.f}<div class="tiny">${l.t}</div></div><button class="grow" data-art="${esc(l.a)}" style="text-align:left;min-width:0"><div class="t">${l.a}</div><div class="s">${l.st} · ${st === 'live' ? '<b style="color:#E5484D">en cours</b>' : st === 'done' ? 'terminé' : 'à venir'}</div></button><button class="rb ghost" data-fav="${esc(l.a)}" aria-label="Me prévenir 15 min avant ${esc(l.a)}" style="color:${ST.favs[l.a] ? '#E5484D' : '#9AA0B4'}">${I.heart}</button></div>`; }).join('')}</div>`;
};
wireFav = function (root) { root.addEventListener('click', e => { const art = e.target.closest('[data-art]'); if (art) return V.artist(art.dataset.art); const b = e.target.closest('[data-fav]'); if (!b) return; const a = b.dataset.fav; ST.favs[a] = !ST.favs[a]; b.style.color = ST.favs[a] ? '#E5484D' : '#9AA0B4'; toast(ST.favs[a] ? `Tu seras prévenu 15 min avant ${a}` : 'Rappel retiré'); emit(); }); };
V.artist = (name) => {
  const l = LINEUP.find(x => x.a === name); if (!l) return; const st = setState(l), stage = (VENUE.stages.find(s => s[0] === l.s) || [l.s, 'Scène'])[1], poi = POIS.find(o => o.id === l.s) || POIS.find(o => o.cat === 'scene');
  const sb = openSheet(`<div class="tiny" style="font-weight:800;color:var(--pri)">${stage.toUpperCase()} · ${l.f} – ${l.t}</div><h2 class="h2">${esc(l.a)}</h2><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill ${st === 'live' ? 'bad' : st === 'done' ? 'gray' : 'ok'}">${st === 'live' ? 'En cours' : st === 'done' ? 'Terminé' : 'À venir'}</span><span class="pill gray">${esc(l.st)}</span></div>
    <div class="grid3">${[['Instagram', '#E1306C'], ['Spotify', '#1DB954'], ['SoundCloud', '#FF5500']].map(x => `<button class="btn white sm" data-l="${x[0]}" style="color:${x[1]}">${x[0]}</button>`).join('')}</div>
    <button class="btn" id="sc">${I.map.replace('<svg', '<svg width="18"')} Voir la scène sur la carte</button>
    <button class="btn white" id="fv">${ST.favs[l.a] ? 'Rappel activé · 15 min avant ✓' : 'Me prévenir 15 min avant'}</button>`);
  sb.onclick = e => { const k = e.target.closest('[data-l]'); if (k) toast(`Ouvre ${k.dataset.l} (lien fourni par l’organisateur)`); if (e.target.closest('#sc')) { closeSheet(true); if (!$('#mv')) V.map(); setTimeout(() => { if (MV && poi) { MV.flyTo(poi.at, Math.max(MV.s, .6)); setTimeout(() => V.poiSheet(poi.id), 700); } }, 100); }
    if (e.target.closest('#fv')) { ST.favs[l.a] = !ST.favs[l.a]; emit(); e.target.closest('#fv').textContent = ST.favs[l.a] ? 'Rappel activé · 15 min avant ✓' : 'Me prévenir 15 min avant'; } };
};

// ---------- Amis : profil, amis en commun, partage du profil, suggestions ----------
const MUTUAL = { lea: ['ines', 'tom'], ines: ['lea'], tom: ['lea', 'sami'], sami: ['tom'], maya: ['lea', 'ines'] };
const _friendSheet = V.friendSheet;
V.friendSheet = (id) => {
  _friendSheet(id); const sb = $('.sheet .sbody'); if (!sb) return; const mu = (MUTUAL[id] || []).filter(x => ST.friends.includes(x));
  const sm = sb.querySelector('.small'); sm && sm.insertAdjacentHTML('beforeend', ` · <button class="link" id="mut" style="display:inline;min-height:0;padding:0;font-size:inherit;color:var(--pri)">${mu.length} ami${mu.length > 1 ? 's' : ''} en commun</button>`);
  const here = $('#here', sb); if (here) here.innerHTML = '📍 Rejoins-moi ici';
  const more = $('#more', sb); if (more) { more.innerHTML = `${I.more.replace('<svg', '<svg width="18"')} Partager son profil, masquer ma position, bloquer, signaler`; more.addEventListener('click', () => setTimeout(() => { const l = $('.sheet .sbody .list'); if (l && !$('#shp')) { l.insertAdjacentHTML('afterbegin', `<button class="row" id="shp"><div class="ico">${I.share}</div><div class="grow"><div class="t">Partager son profil</div></div></button>`); $('#shp').onclick = () => V.pickFriends('Partager le profil de ' + FRIENDS.find(f => f.id === id).n + ' à…', ids => toast(`Profil partagé à ${ids.length} ami(s) : ils peuvent l’ajouter en une touche`)); } }, 30)); }
  $('#mut', sb) && ($('#mut', sb).onclick = () => openSheet(`<h2 class="h2">Amis en commun</h2><div class="list">${mu.map(m => { const f = FRIENDS.find(x => x.id === m); return `<button class="row" data-u="${m}"><img class="av" src="${fHead(m)}" alt=""><div class="grow"><div class="t">${f.n}</div><div class="s">@${m}</div></div></button>`; }).join('') || '<div class="row small">Aucun ami en commun.</div>'}</div>`).onclick = e => { const u = e.target.closest('[data-u]'); if (u) V.friendSheet(u.dataset.u); });
};
const _friendsTab = V.friendsTab;
V.friendsTab = () => {
  _friendsTab(); const fl = $('#fl'); if (!fl) return;
  fl.insertAdjacentHTML('beforebegin', `<div class="small" style="padding:0 18px 8px">👥 ≈ ${({ bdf: 9, bisous: 4, selva: 3 }[VENUE.id] || 3)} personnes de ton réseau (amis d’amis) à proximité · elles ne voient pas ta position</div>`);
  const sug = [['maya', 'Maya D.', 2], ['jade', 'Jade R.', 3], ['noah', 'Noah B.', 1]].filter(s => !ST.friends.includes(s[0]) && !ST.pending.some(p => p.id === s[0]));
  const box = document.createElement('div'); box.className = 'card'; box.style.cssText = 'gap:8px;margin:0 0 12px';
  box.innerHTML = `<b style="font-size:15px">Tu connais peut-être</b><div class="chips">${sug.map(s => `<button class="chip" data-s="${s[0]}" style="padding:6px 12px 6px 6px"><img src="${HEAD(['group_21', 'lins', 'staff1'][sug.indexOf(s) % 3])}" alt="" style="width:28px;height:28px;border-radius:14px"><span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.1"><b style="font-size:13px">${s[1]}</b><span class="tiny">${s[2]} ami${s[2] > 1 ? 's' : ''} en commun</span></span><span class="pill" style="margin-left:4px">Ajouter</span></button>`).join('')}</div><button class="btn white sm" id="allc">Ajouter tous mes contacts qui ont ONEERA</button>`;
  if (sug.length) fl.parentElement.insertBefore(box, fl);
  box.onclick = e => { const s = e.target.closest('[data-s]'); if (s) { s.remove(); toast('Demande envoyée · elle apparaîtra dans ses demandes reçues'); } if (e.target.closest('#allc')) V.addFriends(false); };
};

// ---------- Réglages : modifier le profil (Confirmer), suppression en tapant SUPPRIMER, notifications détaillées, signaler un souci ----------
const COVERS = ['linear-gradient(135deg,#DCE5FF,#F8DDEB)', 'linear-gradient(135deg,#FCE3C8,#F8C8DC)', 'linear-gradient(135deg,#C9F0E6,#D7E3FF)', 'linear-gradient(135deg,#2B2F6B,#6A3FA0)'];
const _settings = V.settings;
V.settings = () => {
  _settings(); const el = $('.scr'); if (!el || guest()) return;
  const card = el.querySelector('.body .card'); if (card) card.style.background = COVERS[ST.me.cover || 0];
  const first = el.querySelector('.sec'); first && first.insertAdjacentHTML('beforebegin', `<div class="list"><button class="row" data-g5="edit"><div class="ico">${I.user}</div><div class="grow"><div class="t">Modifier le profil</div><div class="s">Photo, couverture, pseudo</div></div></button></div>`);
  const ver = [...el.querySelectorAll('.tiny')].pop(); ver && ver.insertAdjacentHTML('beforebegin', `<div class="list"><button class="row" data-g5="bug"><div class="grow"><div class="t">Signaler un souci de l’app</div><div class="s">Ou secoue ton téléphone, n’importe où</div></div></button></div>`);
  el.addEventListener('click', e => {
    const g5 = e.target.closest('[data-g5]')?.dataset.g5, g = e.target.closest('[data-g]')?.dataset.g;
    if (g5 === 'edit') return V.editProfile(); if (g5 === 'bug') return V.bugReport();
    if (g === 'delete') { e.stopImmediatePropagation(); V.deleteAccount(); } if (g === 'notifs') { e.stopImmediatePropagation(); V.notifPrefs(); }
  }, true);
};
V.editProfile = () => {
  let cover = ST.me.cover || 0;
  const sb = openSheet(`<h2 class="h2">Modifier le profil</h2>
    <div id="cv" style="height:96px;border-radius:18px;background:${COVERS[cover]};display:flex;align-items:flex-end;padding:10px"><img src="${meHead()}" alt="" style="width:64px;height:64px;border-radius:32px;border:3px solid #fff;margin-bottom:-30px;background:#fff"></div>
    <div class="grid2" style="margin-top:22px"><button class="btn white sm" id="ph">Changer la photo</button><button class="btn white sm" id="cc">Changer la couverture</button></div>
    <div class="field"><label for="pp">Pseudo</label><input class="inp" id="pp" value="${esc(ST.me.pseudo || '')}" maxlength="20" autocomplete="off"></div>
    <button class="btn" id="ok">Confirmer</button>`);
  $('#cc', sb).onclick = () => { cover = (cover + 1) % COVERS.length; $('#cv', sb).style.background = COVERS[cover]; };
  $('#ph', sb).onclick = () => { closeSheet(true); V.avatarEditor(() => V.settings()); };
  $('#ok', sb).onclick = () => { const v = $('#pp', sb).value.trim(); if (v.length < 3) { $('#pp', sb).focus(); toast('3 caractères minimum'); return; } ST.me.pseudo = v; ST.me.cover = cover; closeSheet(true); emit(); V.settings(); toast('Profil mis à jour'); };
};
V.deleteAccount = () => {
  const sb = openSheet(`<h2 class="h2">Supprimer mon compte ?</h2><div class="card" style="background:#FDECEC"><div class="small">Profil, avatar, amis, messages et récaps seront supprimés définitivement sous 30 jours. Les statistiques anonymes déjà agrégées ne permettent pas de te retrouver.</div></div>
    <button class="btn white" id="exp">${I.download.replace('<svg', '<svg width="18"')} Télécharger mes données avant</button>
    <div class="field"><label for="cf">Pour confirmer, tape SUPPRIMER</label><input class="inp" id="cf" autocomplete="off" autocapitalize="characters"></div>
    <button class="btn red" id="del" disabled>Supprimer définitivement</button>`);
  $('#cf', sb).oninput = e => { $('#del', sb).disabled = e.target.value.trim().toUpperCase() !== 'SUPPRIMER'; };
  $('#exp', sb).onclick = () => toast('Export prêt sous 24 h : lien sécurisé envoyé par e-mail');
  $('#del', sb).onclick = () => { closeSheet(true); clearSession(); ST.account = null; ST.friends = []; toast('Compte supprimé. Tes données seront effacées sous 30 jours.'); V.welcome(); };
};
V.notifPrefs = () => {
  const P = ST.notifPrefs = ST.notifPrefs || { secu: 1, amis: 1, inv: 1, ment: 1, msg: 1, prog: 1, avant: 1, apres: 1, part: 0 };
  const rows = [['secu', 'Alertes de sécurité du lieu', 'Toujours actives : elles passent en priorité'], ['amis', 'Amis : arrivée, « vos amis sont à proximité »'], ['inv', 'Invitations « Rejoins-moi ici » et RDV'], ['ment', 'Mentions sur la carte'], ['msg', 'Messages'], ['prog', 'Programmation : 15 min avant tes favoris'], ['avant', 'Avant l’événement : rappels, Bluetooth, localisation'], ['apres', 'Après l’événement : récap, « Revivez l’événement »'], ['part', 'Offres des partenaires', 'Désactivées par défaut']];
  const sb = openSheet(`<h2 class="h2">Notifications</h2><div class="list">${rows.map(r => `<button class="row" data-p="${r[0]}"><div class="grow"><div class="t">${r[1]}</div>${r[2] ? `<div class="s">${r[2]}</div>` : ''}</div><span class="tog ${P[r[0]] ? 'on' : ''}"></span></button>`).join('')}</div>
    <div class="list"><button class="row" data-p="quiet"><div class="grow"><div class="t">Silence de 6 h à 12 h</div><div class="s">Sauf alertes de sécurité</div></div><span class="tog ${ST.quietHours !== false ? 'on' : ''}"></span></button></div><div class="tiny">Une seule notification par action, jamais de doublon.</div>`);
  sb.onclick = e => { const r = e.target.closest('[data-p]'); if (!r) return; const k = r.dataset.p; if (k === 'secu') { toast('Les alertes de sécurité restent actives'); return; } if (k === 'quiet') ST.quietHours = ST.quietHours === false; else P[k] = P[k] ? 0 : 1; r.querySelector('.tog').classList.toggle('on', k === 'quiet' ? ST.quietHours !== false : !!P[k]); emit(); };
};

// ---------- Signaler un souci de l'app (ou secouer le téléphone) ----------
V.bugReport = () => {
  const sb = openSheet(`<h2 class="h2">Signaler un souci de l’app</h2><div class="small" style="margin-top:-6px">L’équipe ONEERA reçoit ta description, une capture de l’écran et la version de l’app. Jamais ta position.</div>
    <textarea class="inp" id="bt" rows="3" placeholder="Que s’est-il passé ?" aria-label="Description" style="min-height:90px;padding-top:12px"></textarea>
    <button class="row" id="cap" style="background:#F3F5FB;border-radius:14px"><div class="grow"><div class="t">Joindre une capture de l’écran</div></div><span class="tog on"></span></button>
    <button class="btn" id="ok">Envoyer</button><div class="tiny" style="text-align:center">ONEERA 2.0 · build v5</div>`);
  $('#cap', sb).onclick = () => $('#cap .tog', sb).classList.toggle('on');
  $('#ok', sb).onclick = () => { if (!$('#bt', sb).value.trim()) { $('#bt', sb).focus(); return; } closeSheet(); toast('Merci ! Ton retour est transmis à l’équipe ONEERA avec la capture.'); };
};
let _shk = []; addEventListener('devicemotion', e => { const a = e.accelerationIncludingGravity; if (!a) return; const g = Math.hypot(a.x || 0, a.y || 0, a.z || 0); if (g < 24) return; const t = Date.now(); _shk = _shk.filter(x => t - x < 900).concat(t); if (_shk.length >= 3 && !$('.sheet')) { _shk = []; V.bugReport(); } });

// ---------- Premier lancement : 3 repères seulement, puis l'écran reste épuré ----------
V.tour = () => {
  if (ST.tourDone || !$('#mv') || $('.tour')) return;
  const steps = [['#mepill', 'Toi, tes amis', 'Tes amis apparaissent sur la carte. Touche ta pastille pour inviter un ami ou partager ta position.'], ['#flt', 'Trouver un lieu', 'Bars, scènes, toilettes : touche un filtre ou une icône pour voir sa fiche et l’itinéraire.'], ['#sos', 'En cas de problème', 'Le bouton SOS prévient l’équipe du lieu avec ta position.']];
  let i = 0; const box = document.createElement('div'); box.className = 'tour'; SCREEN.append(box);
  const end = () => { ST.tourDone = true; box.remove(); emit(); };
  const show = () => { const s = steps[i], t = $(s[0]); if (!t) { i++; return i < steps.length ? show() : end(); } const r = t.getBoundingClientRect(), R = SCREEN.getBoundingClientRect(), k = R.width / SCREEN.offsetWidth || 1, x = (r.left - R.left) / k, y = (r.top - R.top) / k, w = r.width / k, h = r.height / k, below = y < SCREEN.offsetHeight / 2;
    box.innerHTML = `<div class="tourHole" style="left:${x - 6}px;top:${y - 6}px;width:${w + 12}px;height:${h + 12}px"></div><div class="tourCard" style="${below ? `top:${y + h + 14}px` : `bottom:${SCREEN.offsetHeight - y + 14}px`}"><b>${s[1]}</b><span>${s[2]}</span><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><button class="link" data-x style="min-height:30px">Passer</button><span class="tiny">${i + 1} / ${steps.length}</span><button class="btn sm" data-n style="width:auto;padding:0 18px">${i === steps.length - 1 ? 'C’est parti' : 'Suivant'}</button></div></div>`; };
  box.onclick = e => { if (e.target.closest('[data-x]')) return end(); if (e.target.closest('[data-n]')) { i++; return i < steps.length ? show() : end(); } };
  show();
};
const _quickSetup = quickSetup; quickSetup = function () { _quickSetup(); if (ST.tourDone === undefined) ST.tourDone = true; };
