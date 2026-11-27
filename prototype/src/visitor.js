// ===== App visiteur : carte, lieux, amis, chat, notifications, réglages, signalement, récap =====
let MV = null; // carte courante
const unreadChat = () => Object.values(ST.unread.by).reduce((a, b) => a + b, 0);
const myFriends = () => FRIENDS.filter(f => ST.friends.includes(f.id));
const guest = () => ST.account === 'guest';
const needAccount = () => { openSheet(`<div style="text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center"><img src="${A}av/2_happy.webp" alt="" style="height:140px"><h2 class="h2">Crée ton compte en 20 secondes</h2><p class="small">Pour voir tes amis, leur écrire et partager ta position.</p></div><button class="btn dark" id="ca">Continuer avec Apple</button><button class="btn white" id="cp">Téléphone</button>`).parentElement; $('#ca').onclick = () => { closeSheet(true); V.apple(); }; $('#cp').onclick = () => { closeSheet(true); V.phone(); }; };

function navBar(active) {
  const b = (k, ic, l, badge) => `<button data-nav="${k}" class="${active === k ? 'on' : ''}" aria-label="${l}">${ic}<span>${l}</span>${badge ? `<span class="badge" style="top:2px;right:8px">${badge}</span>` : ''}</button>`;
  const g = guest(); return `<nav class="nav"><button class="rb" data-nav="search" aria-label="Rechercher">${I.search}</button><div class="bar">${b('map', I.map, 'Carte')}${b('amis', I.users, 'Amis', g ? '' : ST.pending.length || '')}${b('chat', I.chat, 'Chat', g ? '' : unreadChat() || '')}${b('config', I.gear, 'Réglages')}</div><button class="me" data-nav="profile" aria-label="Mon profil">${g ? `<span style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;color:#9AA0B4">${I.user}</span>` : `<img src="${meHead()}" alt="">`}</button></nav>`;
}
function wireNav(el) {
  $$('[data-nav]', el).forEach(b => b.onclick = () => {
    const k = b.dataset.nav; if (guest() && ['amis', 'chat', 'profile'].includes(k)) return needAccount();
    ({ map: V.map, amis: V.friendsTab, chat: V.chatList, config: V.settings, profile: V.settings, search: V.search })[k]();
  });
}

// ---------- CARTE ----------
let mapFilter = 'all', showCrowd = false, nightMap = false;
V.map = (opts = {}) => {
  const live = LINEUP.filter(l => l.s === 'scene' && isLive(l));
  const stageName = (VENUE.stages[0] || ['', 'Scène'])[1];
  const el = mount(`<div id="mv"></div>${statusBar()}
    <div class="mapTop"><div class="evbar"><button id="disc" aria-label="Découvrir les événements" style="display:flex"><img class="lg" src="${A}logo.webp" alt=""></button><button id="evinfo" style="flex:1;text-align:left;min-width:0"><div style="font-weight:800;font-size:15px">${EVENT.name}</div><div class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ST.offline ? '<span style="color:#9A5800;font-weight:800">Hors réseau</span> · programme enregistré à ' + fmtClock(ST.clock - 62) : `<span style="color:#E5484D;font-weight:800">● En direct</span> ${live[0] ? live[0].a : 'Pause'} · ${stageName}`}${demoPlan() ? ' · plan d’exemple' : ''}</div></button>
      <button class="rb" id="tkt" aria-label="Billet et cashless" style="width:40px;height:40px">${I.ticket}</button><button class="rb" id="bell" aria-label="Notifications" style="position:relative;width:40px;height:40px">${I.bell}${ST.unread.notif ? `<span class="badge">${ST.unread.notif}</span>` : ''}</button></div>
      <div class="chips" id="flt">${[['all', 'Tout'], ['friends', 'Amis'], ['bar', 'Bars'], ['scene', 'Scènes'], ['food', 'Manger'], ['service', 'Services'], ['secu', 'Secours']].map(f => `<button class="chip ${mapFilter === f[0] ? 'on' : ''}" data-f="${f[0]}">${f[1]}</button>`).join('')}</div>
      ${VENUE.floors ? `<div class="chips" id="floors">${VENUE.floors.map(f => `<button class="chip ${(ST.me.floor || 'club') === f[0] ? 'on' : ''}" data-fl="${f[0]}">${f[1]}</button>`).join('')}</div>` : ''}<div id="qual"></div></div>
    <div class="ctrls"><div class="stack">${viewCtl()}<button id="loc" aria-label="Me recentrer">${I.locate}</button><button id="lay" aria-label="Calques">${I.layers}</button></div>
      <button class="rb" id="sos" aria-label="Signaler un problème ou SOS" style="background:#E5484D;color:#fff;flex-direction:column;gap:0;font-size:10px;font-weight:900">${I.shield.replace('<svg', '<svg width="18"')}SOS</button></div>
    <div class="livebar" id="lb"></div>${navBar('map')}`);
  wireNav(el);
  if (MV) MV.destroy();
  MV = new MapView($('#mv', el), { at: opts.at || [ST.me.pos[0], ST.me.pos[1] - 8], zoom: opts.zoom || VENUE.zoom, rotate: true, strict: false, markers: mapMarkers, onLong: at => V.rdvSheet(at), onTapEmpty: () => {}, fx: () => ({ crowd: !showCrowd }) }); wireViewCtl(el, MV);
  ST.introSeen = ST.introSeen || {}; if (!opts.at && !ST.introSeen[VENUE.id]) { ST.introSeen[VENUE.id] = 1; FX.intro(MV, [ST.me.pos[0], ST.me.pos[1] - 8], VENUE.zoom); }
  $('#flt', el).onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; mapFilter = b.dataset.f; $$('#flt .chip', el).forEach(c => c.classList.toggle('on', c === b)); if (mapFilter === 'friends' && myFriends().length) { const p = myFriends().map(f => friendPos(f.id)); MV.flyTo([p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length], .45); } };
  $('#floors', el) && ($('#floors', el).onclick = e => { const b = e.target.closest('[data-fl]'); if (!b) return; if (b.dataset.fl !== 'club') { toast('Tes amis au casino apparaissent à l’escalier avec « au RDC (Casino) ↑ ». Itinéraire par l’escalier de l’entrée.'); return; } });
  $('#loc', el).onclick = () => MV.flyTo(ST.me.pos, Math.max(MV.s, .5));
  $('#lay', el).onclick = V.layers;
  $('#sos', el).onclick = V.report; $('#disc', el).onclick = V.discover; $('#tkt', el).onclick = () => guest() ? needAccount() : V.wallet(); $('#bell', el).onclick = V.notifs; $('#evinfo', el).onclick = V.eventSheet;
  const lb = $('#lb', el), qual = $('#qual', el);
  const drawLb = () => {
    if (!document.body.contains(lb)) { listeners.delete(drawLb); return; }
    const fr = myFriends();
    let html = '';
    if (ST.offline) html += `<div class="mini" style="background:#FFF1DC"><span style="color:#9A5800">${I.wifi}</span><div style="flex:1"><b style="font-size:14px">Pas de réseau</b><div class="small">${hasFlag('mesh') ? 'Relais Bluetooth actif : 14 téléphones ONEERA autour de toi transmettent les positions de tes amis (≈ 30 m de portée).' : 'Plan enregistré sur ton téléphone ✓ · tes amis : dernières positions connues'}</div></div></div>`;
    const myR = ST.reports.find(r => r.mine && r.status !== 'Résolu'); if (myR) html += `<button class="mini" id="myr" style="border-left:5px solid #E5484D"><img src="${IC(CATS.find(c => c[0] === myR.cat)[2])}" alt="" style="width:34px"><div style="flex:1"><b style="font-size:14px">Ton alerte : ${myR.status}</b><div class="small">${myR.agent ? esc(myR.agent) + ' · ' : ''}${myR.zone}</div></div></button>`;
    if (ST.rdv) html += `<button class="mini" id="rdvb"><img src="${IC('point_de_rdv')}" alt="" style="width:34px"><div style="flex:1"><b style="font-size:14px">RDV ${ST.rdv.time} · ${esc(ST.rdv.n)}</b><div class="small">${ST.rdv.who.length} ami(s) prévenu(s) · à ${metersPath(route(nearestNode(ST.me.pos), nearestNode(ST.rdv.at)), ST.me.pos)} m</div></div><span class="pill">Y aller</span></button>`;
    if (guest()) html += `<button class="mini" id="cta"><img src="${A}av/2_happy.webp" alt="" style="height:38px"><div style="flex:1"><b style="font-size:14px">Où sont tes amis ?</b><div class="small">Crée ton compte en 20 s pour les voir ici</div></div><span class="pill">Créer</span></button>`;
    else if (!fr.length) html += `<button class="mini" id="addf"><div class="ico">${I.users}</div><div style="flex:1"><b style="font-size:14px">Ajoute tes amis</b><div class="small">Depuis tes contacts, en une touche</div></div><span class="pill">Ajouter</span></button>`;
    else html += `<div class="chips" style="padding:2px">${fr.map(f => { const s = FR_STATE[f.id], d = metersPath(route(nearestNode(ST.me.pos), nearestNode(s.pos)), ST.me.pos); return `<button class="chip" data-fr="${f.id}" style="padding:5px 12px 5px 5px"><img src="${fHead(f.id)}" alt="" style="width:30px;height:30px;border-radius:15px;box-shadow:0 0 0 2px ${f.col};${f.stale || ST.offline ? 'opacity:.55' : ''}"><span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.1"><b style="font-size:13px">${f.n}</b><span style="font-size:11px;color:${f.stale || ST.offline ? '#9A5800' : '#6B7084'}">${f.stale ? 'il y a ' + f.stale + ' min' : ST.offline ? 'il y a 2 min · ' + zoneOf(s.pos) : '≈ ' + d + ' m · ' + zoneOf(s.pos)}</span></span></button>`; }).join('')}</div>`;
    lb.innerHTML = html;
    qual.innerHTML = ST.perms.loc ? `<button class="pill ${ST.offline ? 'warn' : ST.sharing.mode === 'off' ? 'gray' : 'ok'}" id="mepill" style="box-shadow:0 2px 8px rgba(20,30,60,.12)">${ST.offline ? '± 8 m · hors réseau' : VENUE.id === 'bdf' ? '± 3 m' : `± 2 m · ${VENUE.id === 'bisous' ? 'niveau −1' : 'intérieur'}`}${guest() ? '' : ` · ${(n => n === 0 ? 'aucun ami ici' : n === 1 ? '1 ami ici' : n + ' amis ici')(myFriends().filter(f => !f.floor).length)} · ${ST.sharing.mode === 'off' ? 'partage coupé' : ST.sharing.ghost ? 'mode fantôme' : 'tu es visible'}`}</button>`
      : guest() ? '' : `<button class="pill bad" id="fixloc" style="box-shadow:0 2px 8px rgba(20,30,60,.12)">Localisation désactivée · Activer</button>`;
    const fx = $('#fixloc', qual); if (fx) fx.onclick = V.fixLocation; const mp = $('#mepill', qual); if (mp) mp.onclick = () => guest() ? needAccount() : V.meSheet();
    $$('[data-fr]', lb).forEach(b => b.onclick = () => V.friendSheet(b.dataset.fr));
    $('#addf', lb) && ($('#addf', lb).onclick = () => V.addFriends(false)); $('#cta', lb) && ($('#cta', lb).onclick = needAccount);
    $('#rdvb', lb) && ($('#rdvb', lb).onclick = () => V.goTo(ST.rdv.at, 'Point de RDV')); $('#myr', lb) && ($('#myr', lb).onclick = () => V.reportStatus(myR.id));
  };
  listeners.add(drawLb); drawLb(); clearInterval(V._lbT); V._lbT = setInterval(() => { if (document.body.contains(lb)) drawLb(); }, 3000);
  applyNight();
  if (!guest() && ST.metrics.start && !ST.metrics.steps.map) setTimeout(() => markStep('map'), 400);
  
};
function applyNight() { return;  const img = $('#mv img.base'); if (img) img.style.filter = nightMap ? 'brightness(.55) saturate(1.25) hue-rotate(-12deg)' : ''; const m = $('#mv'); if (m) m.style.background = nightMap ? 'linear-gradient(180deg,#1B1838,#2A1F4A)' : ''; }
function mapMarkers(mv) {
  const out = [], f = mapFilter;
  if (f !== 'friends') POIS.filter(o => f === 'all' || o.cat === f || (f === 'secu' && o.cat === 'secu')).forEach(o => out.push(poiMarker(o, () => V.poiSheet(o.id), '', mv.s < .5 && f === 'all' && !['scene', 'barO', 'barE', 'barC', 'entree'].includes(o.id))));
  if (showCrowd) ZONES.forEach(z => { const r = occNow(z) / z.cap, c = r > .85 ? '#E5484D' : r > .6 ? '#E58A00' : '#16A34A'; out.push({ id: 'z_' + z.id, at: z.at, html: `<div class="lbl" style="background:${c};color:#fff;transform:translateY(50%)">${r > .85 ? 'Très animé' : r > .6 ? 'Animé' : 'Calme'}</div>`, halo: { m: z.r * 4.1, c }, z: 1 }); });
  if (hasFlag('familyOn')) out.push(personMarker('child', CHILD.n.split(' ')[0], avURI(CHILD.av), CHILD.at, { col: '#E8C23A', acc: 3, sub: 'bracelet', onClick: V.family }));
  if (hasFlag('camping') && ST.tents && ST.tents[VENUE.id]) out.push({ id: 'tent', at: ST.tents[VENUE.id], html: `<div class="poi" style="border-color:#2F8F5A"><img src="${IC('chill_zone')}" alt=""></div><div class="lbl">Ma tente</div>`, onClick: () => V.goTo(ST.tents[VENUE.id], 'Ma tente'), z: 6 });
  if (ST.rdv) out.push({ id: 'rdv', at: ST.rdv.at, html: `<div class="poi" style="border-color:#4F6BF5"><img src="${IC('point_de_rdv')}" alt=""></div><div class="lbl">RDV ${ST.rdv.time}</div>`, onClick: () => V.goTo(ST.rdv.at, 'Point de RDV'), z: 7 });
  if (!guest()) myFriends().forEach(fr => { const s = FR_STATE[fr.id]; if (fr.floor && fr.floor !== (ST.me.floor || 'club')) { out.push(personMarker(fr.id, fr.n, fHead(fr.id), s.pos, { col: fr.col, stale: true, acc: 6, sub: 'au RDC (Casino) ↑', onClick: () => V.friendSheet(fr.id) })); return; } out.push(personMarker(fr.id, fr.n, fHead(fr.id), s.pos, { col: fr.col, stale: fr.stale || ST.offline, acc: fr.stale ? 25 : ST.offline ? 12 : fr.acc, sub: fr.stale ? `il y a ${fr.stale} min` : ST.offline ? 'il y a 2 min' : '', onClick: () => V.friendSheet(fr.id) })); });
  if (ST.perms.loc) out.push(personMarker('me', 'Moi', meHead(), ST.me.pos, { me: true, acc: ST.offline ? 8 : 3, onClick: () => V.shareSettings() }));
  ST.reports.filter(r => r.mine && r.status !== 'Résolu').forEach(r => out.push({ id: 'rep' + r.id, at: [r.at[0] + 3, r.at[1] - 4], cls: 'alert', aria: 'Mon alerte : ' + r.status, html: '<div class="poi" style="width:34px;height:34px">!</div>', onClick: () => V.reportStatus(r.id), z: 12 }));
  return out;
}
V.fixLocation = async () => { const v = await sysAlert({ title: 'Autoriser « ONEERA » à utiliser votre position ?', text: 'Pour te placer sur le plan et que tes amis te trouvent.', map: 1, buttons: [{ t: 'Autoriser une fois', v: 'once' }, { t: 'Autoriser lorsque l’app est active', v: 'app', b: 1 }, { t: 'Ne pas autoriser', v: null }] }); ST.perms.loc = v; emit(); if (MV) V.map(); };
V.askAlways = async () => {
  if (ST.perms.always || ST.role !== 'visitor' || $('#dash') || !MV || !document.body.contains(MV.host) || sheetEl) return;
  const sb = openSheet(`<div style="display:flex;gap:12px;align-items:center"><img src="${fHead('lea')}" alt="" class="av"><div><b>Pour que tes amis te voient même avec ton téléphone dans la poche</b><div class="small">Sinon ton avatar se fige quand l’écran est éteint. Impact batterie : environ 4 % par heure.</div></div></div>
    <div class="card" style="background:#F3F5FB"><div class="small">Choisis <b>« Toujours autoriser »</b> dans la fenêtre suivante. La position n’est utilisée que pendant l’événement et s’arrête automatiquement à la sortie du site.</div></div>
    <button class="btn" id="al">Garder mes amis à jour</button><button class="link" id="no">Pas maintenant</button>`);
  $('#no', sb).onclick = () => closeSheet();
  $('#al', sb).onclick = async () => { closeSheet(true); const v = await sysAlert({ title: 'Autoriser « ONEERA » à utiliser votre position même lorsque vous n’utilisez pas l’app ?', text: 'Pour que tes amis te voient sur la carte quand ton téléphone est en veille.', buttons: [{ t: 'Conserver « Lorsque l’app est active »', v: false }, { t: 'Changer pour « Toujours autoriser »', v: true, b: 1 }] }); ST.perms.always = v; toast(v ? 'Position en arrière-plan activée' : 'Tu pourras l’activer dans Config › Autorisations'); };
};

V.layers = () => {
  const sb = openSheet(`<h2 class="h2">Affichage de la carte</h2>
    <div class="grid3">${[['all', 'Festival', 'scene'], ['friends', 'Mes amis', 'point_de_rdv'], ['service', 'Services', 'point_info']].map(v => `<button class="card" data-v="${v[0]}" style="align-items:center;gap:6px;${mapFilter === v[0] ? 'box-shadow:0 0 0 2px var(--pri)' : ''}"><img src="${IC(v[2])}" alt="" style="width:44px"><b style="font-size:13px">${v[1]}</b></button>`).join('')}</div>
    <button class="row" id="crowd" style="background:#F3F5FB;border-radius:14px"><div class="ico">${I.crowd}</div><div class="grow"><div class="t">Affluence en direct</div><div class="s">Estimée à partir des visiteurs qui partagent des stats anonymes et du comptage aux entrées</div></div><span class="tog ${showCrowd ? 'on' : ''}"></span></button>
    <div style="background:#F3F5FB;border-radius:14px;padding:12px 14px"><div class="t" style="font-weight:750">Ambiance de la carte</div><div class="s small" style="margin:2px 0 8px">Automatique : la carte passe en nuit au coucher du soleil, scènes, bars et allées s’éclairent.</div><div class="seg" id="amb">${[['auto', 'Auto'], ['day', 'Jour'], ['night', 'Nuit']].map(m => `<button class="${mapMode() === m[0] ? 'on' : ''}" data-amb="${m[0]}">${m[1]}</button>`).join('')}</div></div>
    <button class="row" id="anim" style="background:#F3F5FB;border-radius:14px"><div class="ico">${I.crowd}</div><div class="grow"><div class="t">Carte animée</div><div class="s">Foule, lumières, nuages. Désactive pour économiser la batterie.</div></div><span class="tog ${ST.mapAnim !== false ? 'on' : ''}"></span></button>
    ${hasFlag('camping') ? `<button class="btn white" id="tentb">${ST.tents && ST.tents[VENUE.id] ? 'Déplacer ma tente ici' : 'Marquer ma tente à ma position'}</button>` : ''}
    <div class="small">Astuce : appui long sur la carte pour créer un point de rendez-vous. Deux doigts pour zoomer.</div>`);
  sb.onclick = e => { const v = e.target.closest('[data-v]'); if (v) { mapFilter = v.dataset.v; closeSheet(); V.map({ at: MV.centerPct(), zoom: MV.s }); } if (e.target.closest('#crowd')) { showCrowd = !showCrowd; $('#crowd .tog', sb).classList.toggle('on', showCrowd); } if (e.target.closest('#tentb')) { closeSheet(); V.tent(); }
    const am = e.target.closest('[data-amb]'); if (am) { ST.mapMode = am.dataset.amb; $$('#amb button', sb).forEach(b => b.classList.toggle('on', b === am)); }
    if (e.target.closest('#anim')) { ST.mapAnim = ST.mapAnim === false; $('#anim .tog', sb).classList.toggle('on', ST.mapAnim !== false); toast(ST.mapAnim === false ? 'Carte fixe : économie de batterie' : 'Carte animée'); } };
};

V.eventSheet = () => {
  const sb = openSheet(`<div style="display:flex;gap:12px;align-items:center"><img src="${A}logo.webp" alt="" style="width:54px;height:54px;border-radius:14px"><div><h2 class="h2">${EVENT.name}</h2><div class="small">${EVENT.date} · ${EVENT.hours} · ${EVENT.place}</div></div></div>
    <div class="grid3"><div class="stat"><span>En ce moment</span><b style="font-size:16px">${(LINEUP.find(l => isLive(l)) || { a: 'Pause' }).a}</b></div><div class="stat"><span>Ambiance</span><b style="font-size:16px;color:#B86E00">${presentAt(nowMin()) / EVENT.capacity > .7 ? 'Très animé' : 'Animé'}</b></div><div class="stat"><span>Fin</span><b style="font-size:16px">${EVENT.hours.slice(-5)}</b></div></div>
    ${hasFlag('seats') ? `<button class="card" id="seat" style="flex-direction:row;align-items:center;gap:12px;text-align:left;background:#EEF2FF"><div class="ico" style="background:#fff">${I.ticket}</div><div style="flex:1"><b>Ta place : Bloc B · Rang 12 · Siège 8</b><div class="small">Porte B conseillée · bar et toilettes à 40 m</div></div><span class="pill">Y aller</span></button>` : ''}
    ${hasFlag('multiday') ? `<div class="seg" id="days">${['Ven. 24', 'Sam. 25', 'Dim. 26'].map((d, i) => `<button class="${i === 1 ? 'on' : ''}" data-d="${i}">${d}</button>`).join('')}</div>` : ''}
    <div class="sec">Programmation</div>${lineupList('scene')}
    <button class="btn white" id="prog">Voir toute la programmation</button><div class="sec">Autres lieux ONEERA ce soir</div><div class="list">${Object.values(VENUES).filter(v => v.id !== VENUE.id).map(v => `<button class="row" data-ven="${v.id}"><img src="${v.map.src}" alt="" style="width:54px;height:40px;object-fit:cover;border-radius:8px"><div class="grow"><div class="t">${v.name}</div><div class="s">${v.kind} · ${v.place}</div></div></button>`).join('')}</div>`);
  $$('[data-ven]', sb).forEach(b => b.onclick = () => { closeSheet(true); FX.leave(() => { setVenue(b.dataset.ven); V.map(); toast('Bienvenue à ' + EVENT.name + ' · plan et lieux chargés'); }); });
  $('#prog', sb).onclick = () => V.programme(); $('#seat', sb) && ($('#seat', sb).onclick = V.mySeat); $('#days', sb) && ($('#days', sb).onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; $$('#days button', sb).forEach(x => x.classList.toggle('on', x === b)); toast(b.textContent + ' : programme du jour affiché (prototype)'); });
  wireFav(sb);
};
function lineupList(stage) {
  return `<div class="list">${LINEUP.filter(l => !stage || l.s === stage).map(l => `<div class="row" ${isLive(l) ? 'style="background:#F3F5FF"' : ''}><div style="width:48px;font-variant-numeric:tabular-nums;font-weight:800;font-size:13px">${l.f}<div class="tiny">${l.t}</div></div><div class="grow"><div class="t">${l.a}</div><div class="s">${l.st}${isLive(l) ? ' · <b style="color:#E5484D">en cours</b>' : ''}</div></div><button class="rb ghost" data-fav="${esc(l.a)}" aria-label="Me prévenir" style="color:${ST.favs[l.a] ? '#E5484D' : '#9AA0B4'}">${I.heart}</button></div>`).join('')}</div>`;
}
function wireFav(root) { root.addEventListener('click', e => { const b = e.target.closest('[data-fav]'); if (!b) return; const a = b.dataset.fav; ST.favs[a] = !ST.favs[a]; b.style.color = ST.favs[a] ? '#E5484D' : '#9AA0B4'; toast(ST.favs[a] ? `Tu seras prévenu 10 min avant ${a}` : 'Rappel retiré'); }); }
V.programme = () => {
  const sb = openSheet(`<h2 class="h2">Programmation · ce soir</h2><div class="seg" id="st">${VENUE.stages.map((s, i) => `<button class="${i ? '' : 'on'}" data-s="${s[0]}">${s[1]}</button>`).join('')}</div><div id="pl">${lineupList('scene')}</div>`, { full: true });
  $('#st', sb).onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; $$('#st button', sb).forEach(x => x.classList.toggle('on', x === b)); $('#pl', sb).innerHTML = lineupList(b.dataset.s); };
  wireFav(sb);
};

// ---------- fiche d'un lieu ----------
function waitOf(id) { if (ST.barWait && ST.barWait[id] != null) return ST.barWait[id]; return { barP: 6, barT: 2, barS2: 4, barO: 9, barE: 3, barC: 14, barS: 1, food: 7, vestiaire: 4, cashless: 5 }[id]; }
V.poiSheet = (id) => {
  const o = POIS.find(p => p.id === id), rt = route(nearestNode(ST.me.pos), o.node), m = metersPath(rt, ST.me.pos);
  const w = waitOf(id); let extra = '';
  if (o.bar) {
    const best = POIS.filter(p => p.bar).map(p => p.id).filter(b => b !== id).map(b => ({ b, w: waitOf(b), m: metersPath(route(nearestNode(ST.me.pos), POIS.find(p => p.id === b).node), ST.me.pos) })).sort((a, c) => a.w + a.m / 70 - c.w - c.m / 70)[0];
    extra = `<div class="grid2"><div class="stat"><span>Attente estimée</span><b style="color:${w > 10 ? '#E5484D' : w > 5 ? '#E58A00' : '#16A34A'}">≈ ${w} min</b><span class="tiny">${ST.barWait?.[id] != null ? 'indiquée par l’équipe du bar' : 'calculée sur ' + ({ barO: 31, barE: 12, barC: 44, barS: 6 }[id] || 18) + ' personnes ces 10 min'}</span></div><div class="stat"><span>Paiement</span><b style="font-size:16px">Cashless</b><span class="tiny">bracelet ou carte</span></div></div>
    ${w > 5 ? `<button class="mini" id="alt" data-b="${best.b}" style="background:#E4F6EA;box-shadow:none"><img src="${IC(POIS.find(p => p.id === best.b).ic)}" alt="" style="width:34px"><div style="flex:1"><b style="font-size:14px">${POIS.find(p => p.id === best.b).n} : ≈ ${best.w} min d’attente</b><div class="small">à ${best.m} m · gagne ${w - best.w} min</div></div><span class="pill ok">Y aller</span></button>` : ''}
    <div class="sec">La carte</div>${MENU[id].map(([cat, items]) => `<div class="card" style="padding:10px 14px;gap:2px"><b style="font-size:13px;color:var(--ink2)">${cat}</b>${items.map(([n, p]) => { const r = ST.ruptures[id + ':' + n]; return `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #F1F2F7;${r ? 'opacity:.5' : ''}"><span>${n}${r ? ' <span class="pill bad" style="font-size:10.5px">Épuisé</span>' : ''}</span><b style="font-variant-numeric:tabular-nums">${p ? p.toFixed(p % 1 ? 2 : 0).replace('.', ',') + ' €' : 'Gratuit'}</b></div>`; }).join('')}</div>`).join('')}
    <div class="tiny">Prix affichés par l’organisateur. Les ruptures sont signalées en direct par l’équipe du bar.</div>`;
  } else if (o.cat === 'scene') extra = `<div class="sec">Ce soir</div>${lineupList(o.id === 'dj' ? 'dj' : 'scene')}`;
  else if (o.partner) extra = `<div class="card" style="background:linear-gradient(135deg,#FFF4D6,#FFE0EF)"><b>Offert : un soda Riviera</b><div class="small">Pour les 500 premiers visiteurs ONEERA. Montre ce code au stand.</div><div style="display:flex;justify-content:center;padding:6px"><div class="qr" style="width:140px;height:140px"><canvas id="oq"></canvas></div></div><div class="tiny" style="text-align:center">312 offres utilisées sur 500</div></div>`;
  else if (w) extra = `<div class="grid2"><div class="stat"><span>Attente estimée</span><b>≈ ${w} min</b></div><div class="stat"><span>Horaires</span><b style="font-size:16px">${o.hours || '—'}</b></div></div>`;
  const sb = openSheet(`<div style="display:flex;gap:12px;align-items:center"><div style="width:64px;height:64px;border-radius:20px;background:#F3F5FB;display:flex;align-items:center;justify-content:center;flex-shrink:0"><img src="${IC(o.ic)}" alt="" style="width:52px"></div>
      <div style="flex:1;min-width:0"><h2 class="h2">${o.n}</h2><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${o.hours ? (ST.barState?.[o.id] ? `<span class="pill warn">${ST.barState[o.id]}</span>` : `<span class="pill ok">Ouvert · ${o.hours}</span>`) : ''}${o.restricted ? '<span class="pill vio">Bracelet VIP</span>' : ''}<span class="pill gray">${m} m · ${walkMin(m)} min à pied</span></div></div></div>
    ${o.desc ? `<p class="small" style="margin:0">${o.desc}</p>` : ''}
    <div class="grid2"><button class="btn" id="go">${I.route.replace('<svg', '<svg width="18"')} Y aller</button><button class="btn white" id="sh">${I.share.replace('<svg', '<svg width="18"')} Envoyer à un ami</button></div>${extra}`);
  $('#go', sb).onclick = () => V.goTo(o.at, o.n, o.node);
  $('#sh', sb).onclick = () => V.pickFriend(f => { (ST.convos[f] = ST.convos[f] || []).push({ me: 1, loc: o.n }); toast(`${o.n} envoyé à ${FRIENDS.find(x => x.id === f)?.n || 'ton ami'}`); });
  $('#alt', sb) && ($('#alt', sb).onclick = () => V.poiSheet($('#alt', sb).dataset.b));
  $('#oq', sb) && drawQR($('#oq', sb), 'RIVIERA-' + ST.me.pseudo);
  wireFav(sb);
  if (MV) MV.flyTo([o.at[0], o.at[1] + 6], Math.max(MV.s, .55));
};

// Itinéraire réel le long des allées + marche simulée (aucune téléportation)
let walking = null;
V.goTo = (at, name, node) => {
  closeSheet(true); if (walking) { tickers.delete(walking); walking = null; } if (!MV || !document.body.contains(MV.host) || !$('#screen .nav')) V.map();
  const from = nearestNode(ST.me.pos), to = node || nearestNode(at), rt = route(from, to), pts = [ST.me.pos, ...rt.map(k => NODES[k]), at], m = metersPath(rt, ST.me.pos);
  MV.setRoute(pts);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); MV.flyTo([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2 + 4], Math.max(MV.minS, Math.min(.7, 0.42 * 40 / Math.max(10, Math.max(...xs) - Math.min(...xs)))));
  $$('.banner', SCREEN).forEach(b => b.remove());
  const bn = document.createElement('div'); bn.className = 'banner'; bn.style.cssText += 'bottom:158px;background:#1C1F2A;color:#fff;padding:10px 12px';
  bn.innerHTML = `${I.route.replace('<svg', '<svg width="20"')}<div style="flex:1"><b>${esc(name)}</b><div style="font-size:12px;opacity:.8">${m} m · ${walkMin(m)} min · par les allées</div></div><button class="btn sm" id="walk" style="min-height:34px">Marcher</button><button class="rb" id="stop" style="width:34px;height:34px;background:rgba(255,255,255,.15);color:#fff" aria-label="Arrêter">${I.close}</button>`;
  SCREEN.querySelector('.scr').append(bn);
  $('#stop', bn).onclick = () => { MV.setRoute(null); bn.remove(); if (walking) tickers.delete(walking); walking = null; };
  $('#walk', bn).onclick = () => {
    $('#walk', bn).remove(); let i = 1; const sp = 0.9; // %/s (accéléré ×6 pour la démo)
    if (walking) tickers.delete(walking);
    walking = dt => { if (i >= pts.length) { tickers.delete(walking); walking = null; MV.setRoute(null); bn.remove(); toast(`Tu es arrivé : ${esc(name)}`); ST.me.node = to; return; }
      const p = ST.me.pos, q = pts[i], d = dist(p, q), stp = sp * dt * 1.586; if (d <= stp) { ST.me.pos = [...q]; i++; } else ST.me.pos = [p[0] + (q[0] - p[0]) / d * stp, p[1] + (q[1] - p[1]) / d * stp]; };
    tickers.add(walking);
  };
};

// ---------- amis ----------
function dirWord(a, b) { const near = POIS.filter(o => ['scene', 'barO', 'barE', 'barC', 'entree', 'rotonde', 'vestiaire', 'fosse'].includes(o.id)).sort((x, y) => dist(x.at, b) - dist(y.at, b))[0]; return 'vers ' + near.n.replace('La ', 'la ').replace('Scène principale', 'la scène').replace('Fosse', 'la Fosse'); }
V.friendSheet = (id) => {
  const f = FRIENDS.find(x => x.id === id), s = FR_STATE[id]; if (!f) return;
  const rt = route(nearestNode(ST.me.pos), nearestNode(s.pos)), m = metersPath(rt, ST.me.pos), stale = (f.stale || ST.offline) && !f.floor;
  const sb = openSheet(`<div style="display:flex;gap:14px;align-items:center"><img src="${CH(FRIEND_CHAR[f.id] || 'lins')}" alt="" style="height:110px"><div style="flex:1"><h2 class="h2">${f.n}</h2><div class="small">@${f.id} · ${zoneOf(s.pos)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${f.floor ? `<span class="pill vio">Au RDC (Casino) · par l’escalier · 2 min</span>` : stale ? `<span class="pill warn">Vu il y a ${f.stale || 2} min</span>` : '<span class="pill ok">À l’instant</span>'}<span class="pill gray">± ${stale ? 25 : f.acc} m</span><span class="pill ${f.bat < 20 ? 'bad' : 'gray'}">🔋 ${f.bat} %</span><span class="pill gray">${m} m · ${walkMin(m)} min</span><span class="pill" title="Direction"><svg width="14" height="14" viewBox="0 0 24 24" style="transform:rotate(${Math.round(Math.atan2((s.pos[1] - ST.me.pos[1]), (s.pos[0] - ST.me.pos[0]) * 1.586) * 180 / Math.PI + 90)}deg)"><path d="M12 2l6 18-6-4-6 4z" fill="currentColor"/></svg> ${dirWord(ST.me.pos, s.pos)}</span></div></div></div>
    ${f.stale ? `<div class="card" style="background:#FFF7E8"><b style="font-size:14px">Position ancienne</b><div class="small">Dernière position connue : ${zoneOf(s.pos)}, il y a ${f.stale} min. Batterie à ${f.bat} % à ce moment-là : son téléphone s’est sans doute éteint. On n’invente jamais une position.</div></div>` : ''}
    ${!f.stale ? `<button class="btn dark" id="find">${I.locate.replace('<svg', '<svg width="18"')} Je te cherche (boussole)</button>` : ''}
    <div class="grid2"><button class="btn" id="join">${I.route.replace('<svg', '<svg width="18"')} Rejoindre</button><button class="btn white" id="here">📍 Viens ici !</button></div>
    <div class="grid2"><button class="btn white" id="msg">${I.chat.replace('<svg', '<svg width="18"')} Écrire</button><button class="btn white" id="rdv">${I.pin.replace('<svg', '<svg width="18"')} Point de RDV</button></div>
    <button class="link" id="more" style="justify-content:flex-start;gap:8px;color:var(--ink3)">${I.more.replace('<svg', '<svg width="18"')} Masquer ma position pour ${f.n}, bloquer, signaler</button>`);
  $('#join', sb).onclick = () => V.goTo(s.pos, f.n); $('#find', sb) && ($('#find', sb).onclick = () => V.findFriend(id));
  $('#here', sb).onclick = () => { closeSheet(); (ST.convos[id] = ST.convos[id] || []).push({ me: 1, t: '📍 Viens ici ! (' + zoneOf(ST.me.pos) + ')', loc: zoneOf(ST.me.pos) }); toast(`<img src="${fHead(f.id)}" alt="">${f.n} a reçu ta position avec un itinéraire`); if (!ST.perms.always && !ST._askedAlways) { ST._askedAlways = 1; V._alwaysT = setTimeout(V.askAlways, 1800); } setTimeout(() => { if (!f.stale) push({ title: f.n, text: 'J’arrive dans 2 min 🏃‍♀️', icon: fHead(f.id), onTap: () => V.chat(id) }); }, 3500); };
  $('#msg', sb).onclick = () => V.chat(id); $('#rdv', sb).onclick = () => V.rdvSheet(null, [id]);
  $('#more', sb).onclick = () => { const s2 = openSheet(`<div class="list"><button class="row" data-a="hide"><div class="ico">${I.eyeOff}</div><div class="grow"><div class="t">Masquer ma position pour ${f.n}</div></div></button><button class="row" data-a="rm"><div class="ico" style="background:#FDECEC;color:#E5484D">${I.trash}</div><div class="grow"><div class="t" style="color:#E5484D">Retirer de mes amis</div></div></button><button class="row" data-a="bl"><div class="ico" style="background:#FDECEC;color:#E5484D">${I.block}</div><div class="grow"><div class="t" style="color:#E5484D">Bloquer</div></div></button><button class="row" data-a="rp"><div class="ico" style="background:#FDECEC;color:#E5484D">${I.flag}</div><div class="grow"><div class="t" style="color:#E5484D">Signaler le profil</div></div></button></div>`);
    s2.onclick = e => { const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return; closeSheet(); toast({ hide: `${f.n} ne voit plus ta position`, rm: `${f.n} retiré de tes amis`, bl: `${f.n} bloqué`, rp: 'Signalement envoyé à la modération' }[a]); if (a === 'rm' || a === 'bl') { ST.friends = ST.friends.filter(x => x !== id); emit(); } }; };
  if (MV) MV.flyTo([s.pos[0], s.pos[1] + 7], Math.max(MV.s, .6));
};
V.rdvSheet = (at, who = null) => {
  if (guest()) return needAccount();
  const opts = [['vestiaire', 'Devant le vestiaire'], ['info', 'Point info'], ['eau', 'Fontaine à eau'], ['entree', 'Entrée'], ['terrasse', 'Terrasse'], ['barP', 'Bar principal'], ['barS2', 'Bar de la Selva'], ['lounge', 'Îlot central']].filter(o => POIS.some(p => p.id === o[0])).slice(0, 4);
  let sel = at ? 'here' : 'vestiaire', time = 'Maintenant', ppl = who || myFriends().filter(f => !f.stale).map(f => f.id);
  const sb = openSheet(`<h2 class="h2">Point de rendez-vous</h2>
    <div class="list" id="pl">${at ? `<button class="row" data-p="here"><img src="${IC('point_de_rdv')}" alt="" style="width:36px"><div class="grow"><div class="t">Le point choisi sur la carte</div><div class="s">${zoneOf(at)}</div></div><span class="dot" data-r></span></button>` : ''}${opts.map(o => `<button class="row" data-p="${o[0]}"><img src="${IC(POIS.find(p => p.id === o[0]).ic)}" alt="" style="width:36px"><div class="grow"><div class="t">${o[1]}</div><div class="s">${walkMin(metersPath(route(nearestNode(ST.me.pos), POIS.find(p => p.id === o[0]).node), ST.me.pos))} min de toi${ppl[0] ? ' · ' + walkMin(metersPath(route(nearestNode(friendPos(ppl[0])), POIS.find(p => p.id === o[0]).node), friendPos(ppl[0]))) + ' min de ' + FRIENDS.find(f => f.id === ppl[0]).n : ''}</div></div><span class="dot" data-r></span></button>`).join('')}</div>
    <div class="chips" id="tm" style="flex-wrap:wrap">${['Maintenant', 'Dans 15 min', '00:30', '01:00'].map(t => `<button class="chip ${t === time ? 'on' : ''}" data-t="${t}">${t}</button>`).join('')}</div>
    <div class="sec">Prévenir</div><div class="chips" id="pp">${myFriends().map(f => `<button class="chip ${ppl.includes(f.id) ? 'on' : ''}" data-u="${f.id}"><img src="${fHead(f.id)}" alt="" style="border-radius:10px">${f.n}</button>`).join('')}</div>
    <button class="btn" id="send">Envoyer le point de RDV</button>`);
  const paint = () => { $$('#pl [data-p]', sb).forEach(r => { const on = r.dataset.p === sel; r.querySelector('[data-r]').style.cssText = `width:20px;height:20px;border-radius:10px;border:${on ? '6px solid #4F6BF5' : '2px solid #C5C9D6'}`; }); };
  sb.onclick = e => { const p = e.target.closest('[data-p]'), t = e.target.closest('[data-t]'), u = e.target.closest('[data-u]');
    if (p) { sel = p.dataset.p; paint(); } if (t) { time = t.dataset.t; $$('#tm .chip', sb).forEach(c => c.classList.toggle('on', c === t)); } if (u) { u.classList.toggle('on'); ppl = $$('#pp .chip.on', sb).map(c => c.dataset.u); } };
  $('#send', sb).onclick = () => { const poi = POIS.find(p => p.id === sel); const t = time === 'Maintenant' ? fmtClock(ST.clock) : time === 'Dans 15 min' ? fmtClock(ST.clock + 15) : time;
    ST.rdv = { at: sel === 'here' ? at : poi.at, n: sel === 'here' ? zoneOf(at) : poi.n, time: t, who: ppl }; ppl.forEach(id => (ST.convos[id] = ST.convos[id] || []).push({ me: 1, t: `📍 RDV ${t} · ${ST.rdv.n}`, loc: ST.rdv.n }));
    closeSheet(); emit(); toast(`Point de RDV envoyé à ${ppl.length} ami(s)`); if (!ST.perms.always && !ST._askedAlways) { ST._askedAlways = 1; V._alwaysT = setTimeout(V.askAlways, 1800); } if (MV) MV.flyTo(ST.rdv.at, Math.max(MV.s, .5)); logEv('RDV créé : ' + ST.rdv.n);
    setTimeout(() => ppl[0] && push({ title: FRIENDS.find(f => f.id === ppl[0]).n, text: 'Ok j’y vais 👍', icon: fHead(ppl[0]), onTap: () => V.chat(ppl[0]) }), 3000); };
  paint();
};
V.pickFriend = (cb) => { const sb = openSheet(`<h2 class="h2">Envoyer à</h2><div class="list">${myFriends().map(f => `<button class="row" data-u="${f.id}"><img class="av" src="${fHead(f.id)}" alt=""><div class="grow"><div class="t">${f.n}</div></div></button>`).join('') || '<div class="row small">Ajoute d’abord des amis.</div>'}</div>`); sb.onclick = e => { const u = e.target.closest('[data-u]'); if (u) { closeSheet(true); cb(u.dataset.u); } }; };

V.shareSettings = () => {
  const s = ST.sharing;
  const sb = openSheet(`<h2 class="h2">Partager ma position</h2>
    <div class="seg" id="md">${[['event', 'Pendant l’événement'], ['1h', '1 h'], ['off', 'Désactivé']].map(m => `<button data-m="${m[0]}" class="${s.mode === m[0] ? 'on' : ''}">${m[1]}</button>`).join('')}</div>
    <div class="small" id="ex"></div>
    <div id="who" class="list">${[['friends', 'Tous mes amis'], ['except', 'Mes amis, sauf…'], ['only', 'Seulement ces amis']].map(w => `<button class="row" data-w="${w[0]}"><div class="grow"><div class="t">${w[1]}</div></div><span data-r></span></button>`).join('')}</div>
    <button class="row" id="gh" style="background:#F3F5FB;border-radius:14px"><div class="ico">${I.eyeOff}</div><div class="grow"><div class="t">Mode fantôme</div><div class="s">Tu vois tes amis, eux voient ta dernière zone seulement</div></div><span class="tog ${s.ghost ? 'on' : ''}"></span></button>
    <div class="tiny">Arrêt automatique à la sortie du site. Seuls tes amis voient ta position. L’équipe de sécurité la reçoit uniquement si tu envoies une alerte.</div>`);
  const paint = () => { $$('#md button', sb).forEach(b => b.classList.toggle('on', b.dataset.m === s.mode)); $('#ex', sb).textContent = s.mode === 'off' ? 'Tes amis ne te voient plus. Tu continues de voir la carte et les lieux.' : s.mode === '1h' ? 'Partage jusqu’à ' + fmtClock(ST.clock + 60) + ', puis arrêt automatique.' : 'Partage jusqu’à la fin de l’événement (04 h 00).';
    $('#who', sb).style.opacity = s.mode === 'off' ? .4 : 1; $('#who', sb).style.pointerEvents = s.mode === 'off' ? 'none' : '';
    $$('#who [data-w]', sb).forEach(r => r.querySelector('[data-r]').style.cssText = `width:20px;height:20px;border-radius:10px;border:${r.dataset.w === s.who ? '6px solid #4F6BF5' : '2px solid #C5C9D6'}`); $('#gh .tog', sb).classList.toggle('on', s.ghost); };
  sb.onclick = e => { const m = e.target.closest('[data-m]'), w = e.target.closest('[data-w]'); if (m) s.mode = m.dataset.m; if (w) s.who = w.dataset.w; if (e.target.closest('#gh')) s.ghost = !s.ghost; paint(); emit(); };
  paint();
};

V.friendsTab = () => {
  let tab = 'here';
  const el = mount(`${statusBar()}<div class="topbar"><h1 class="left" style="font-size:28px;font-weight:800">Amis</h1><button class="rb" id="add" aria-label="Ajouter des amis">${I.plus}</button></div>
    <div style="padding:0 18px 8px"><div class="seg" id="tb"><button data-t="here" class="on">Ici (${myFriends().length})</button><button data-t="all">Tous</button><button data-t="req">Demandes${ST.pending.length ? ' (' + ST.pending.length + ')' : ''}</button></div></div>
    <div class="body" id="fl" style="padding-bottom:110px"></div>${navBar('amis')}`);
  wireNav(el);
  const draw = () => {
    const fl = $('#fl', el);
    if (tab === 'req') fl.innerHTML = ST.pending.length ? `<div class="list">${ST.pending.map(p => `<div class="row"><img class="av" src="${fHead(p.id)}" alt=""><div class="grow"><div class="t">${p.n}</div><div class="s">2 amis en commun</div></div><button class="btn sm" data-acc="${p.id}">Accepter</button><button class="rb ghost" data-ref="${p.id}" aria-label="Refuser">${I.close}</button></div>`).join('')}</div>` : '<div class="card small">Aucune demande en attente.</div>';
    else { const list = tab === 'here' ? myFriends() : CONTACTS_ON.filter(c => ST.friends.includes(c.id));
      fl.innerHTML = list.length ? `<div class="list">${list.map(c => { const f = FRIENDS.find(x => x.id === c.id); const s = f && FR_STATE[f.id]; return `<button class="row" data-f="${c.id}"><img class="av ${f?.stale ? 'stale' : ''}" src="${fHead(c.id)}" alt=""><div class="grow"><div class="t">${(f || c).n}</div><div class="s">${f ? (f.stale ? `<span style="color:#9A5800">Vu il y a ${f.stale} min · ${zoneOf(s.pos)}</span>` : `${zoneOf(s.pos)} · ${metersPath(route(nearestNode(ST.me.pos), nearestNode(s.pos)), ST.me.pos)} m`) : 'Pas à cet événement'}</div></div>${f ? `<span class="pill">${I.map.replace('<svg', '<svg width="14"')} Voir</span>` : ''}</button>`; }).join('')}</div>`
        : `<div class="card" style="align-items:center;text-align:center"><img src="${A}av/7_happy.webp" alt="" style="width:100%"><b>Aucun ami ici pour l’instant</b><button class="btn" id="add2">Ajouter depuis mes contacts</button></div>`; }
    $$('[data-f]', fl).forEach(b => b.onclick = () => { if (!FRIENDS.find(x => x.id === b.dataset.f)) return; V.map({ at: friendPos(b.dataset.f), zoom: .6 }); setTimeout(() => V.friendSheet(b.dataset.f), 300); });
    $$('[data-acc]', fl).forEach(b => b.onclick = () => { const p = ST.pending.find(x => x.id === b.dataset.acc); ST.pending = ST.pending.filter(x => x !== p); if (!ST.friends.includes(p.id)) ST.friends.push(p.id); toast(`${p.n.split(' ')[0]} et toi êtes amis`); emit(); draw(); });
    $$('[data-ref]', fl).forEach(b => b.onclick = () => { ST.pending = ST.pending.filter(p => p.id !== b.dataset.ref); draw(); });
    $('#add2', fl) && ($('#add2', fl).onclick = () => V.addFriends(false));
  };
  $('#tb', el).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; $$('#tb button', el).forEach(x => x.classList.toggle('on', x === b)); draw(); };
  $('#add', el).onclick = () => V.addFriends(false); draw();
};

// ---------- chat ----------
V.chatList = () => {
  const ids = Object.keys(ST.convos);
  const el = mount(`${statusBar()}<div class="topbar"><h1 class="left" style="font-size:28px;font-weight:800">Discussions</h1><button class="rb" id="new" aria-label="Nouvelle discussion">${I.plus}</button></div>
    <div class="body" style="padding-bottom:110px"><div class="list">${ids.map(id => { const f = FRIENDS.find(x => x.id === id) || CONTACTS_ON.find(x => x.id === id); const last = ST.convos[id].slice(-1)[0]; const un = ST.unread.by[id] || 0; return `<button class="row" data-c="${id}"><img class="av" src="${fHead(f.id)}" alt=""><div class="grow"><div class="t">${f.n.split(' ')[0]}</div><div class="s" style="${un ? 'color:var(--ink);font-weight:700' : ''}">${last ? esc(last.t || '📍 ' + last.loc) : ''}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="tiny">${id === 'lea' ? '23:38' : '23:31'}</span>${un ? `<span class="badge" style="position:static;border:0">${un}</span>` : ''}</div></button>`; }).join('')}
    <button class="row" data-c="group"><div class="av" style="display:flex;align-items:center;justify-content:center;background:var(--pale);color:var(--pri)">${I.users}</div><div class="grow"><div class="t">La bande du Bal 🎉</div><div class="s">Tom : on se retrouve au vestiaire à 4h</div></div><span class="tiny">23:12</span></button></div></div>${navBar('chat')}`);
  wireNav(el);
  $$('[data-c]', el).forEach(b => b.onclick = () => b.dataset.c === 'group' ? toast('Discussion de groupe : identique à une discussion privée') : V.chat(b.dataset.c));
  $('#new', el).onclick = () => V.pickFriend(V.chat);
};
V.chat = (id) => {
  closeSheet(true); ST.unread.by[id] = 0;
  const f = FRIENDS.find(x => x.id === id) || CONTACTS_ON.find(x => x.id === id); ST.convos[id] = ST.convos[id] || [];
  const el = mount(`${statusBar()}<div class="topbar chathead" style="background:#fff;border-bottom:1px solid var(--line)"><button class="rb ghost" id="bk" aria-label="Retour">${I.back}</button><img class="av sm" src="${fHead(f.id)}" alt=""><div style="flex:1"><b>${f.n.split(' ')[0]}</b><div class="tiny">${FRIENDS.find(x => x.id === id) ? (f.stale ? 'Vu il y a ' + f.stale + ' min' : 'Ici · ' + zoneOf(friendPos(id))) : 'Pas à cet événement'}</div></div><button class="rb ghost" id="loc2" aria-label="Voir sur la carte">${I.map}</button></div>
    <div class="msgs" id="ms"></div>
    <div class="chips quick" style="padding:6px 12px;background:#F7F7F9;flex-wrap:wrap" id="qr">${['📍 Ma position', 'On se retrouve où ?', 'J’arrive', 'Je suis au bar'].map(q => `<button class="chip" data-q="${q}">${q}</button>`).join('')}</div>
    <div class="composer"><button class="rb ghost" aria-label="Photo" id="ph">${I.camera}</button><input class="inp" id="tx" placeholder="Message" autocomplete="off" aria-label="Message"><button class="rb" id="snd" aria-label="Envoyer" style="background:var(--pri);color:#fff">${I.send}</button></div>`);
  const ms = $('#ms', el);
  const draw = () => { ms.innerHTML = ST.convos[id].map(m => m.loc && !m.t ? `<div class="locmsg" style="align-self:${m.me ? 'flex-end' : 'flex-start'}"><div class="lm"></div><div style="padding:8px 12px"><b style="font-size:14px">📍 ${esc(m.loc)}</b><div class="small">Touche pour l’itinéraire</div></div></div>` : `<div class="bub ${m.me ? 'me' : 'them'}">${esc(m.t)}</div>`).join(''); ms.scrollTop = 1e6;
    $$('.locmsg', ms).forEach((b, i) => b.onclick = () => { const p = POIS.find(o => o.n === ST.convos[id].filter(m => m.loc && !m.t)[i]?.loc); V.map(); if (p) setTimeout(() => V.goTo(p.at, p.n, p.node), 200); }); };
  const send = t => { if (!t.trim()) return; if (t === '📍 Ma position') ST.convos[id].push({ me: 1, loc: zoneOf(ST.me.pos) }); else ST.convos[id].push({ me: 1, t }); draw(); $('#tx', el).value = '';
    if (!f.stale && FRIENDS.find(x => x.id === id)) setTimeout(() => { ST.convos[id].push({ me: 0, t: ['Top, j’arrive 🏃', 'Ok ! Je suis vers ' + zoneOf(friendPos(id)), '👍'][Math.floor(Math.random() * 3)] }); if (document.body.contains(ms)) draw(); }, 1800); };
  $('#snd', el).onclick = () => send($('#tx', el).value); $('#ph', el).onclick = () => toast('Prototype : appareil photo ou galerie'); $('#tx', el).onkeydown = e => { if (e.key === 'Enter') send(e.target.value); };
  $('#qr', el).onclick = e => { const b = e.target.closest('[data-q]'); if (b) send(b.dataset.q); };
  $('#bk', el).onclick = V.chatList; $('#loc2', el).onclick = () => { if (FRIENDS.find(x => x.id === id)) { V.map({ at: friendPos(id), zoom: .6 }); setTimeout(() => V.friendSheet(id), 300); } else toast(f.n.split(' ')[0] + ' n’est pas à cet événement'); };
  draw(); emit();
};

// ---------- notifications ----------
V.notifs = () => {
  ST.unread.notif = 0; emit();
  const base = [...(ST.rdv ? [{ title: `RDV ${ST.rdv.n} à ${ST.rdv.time}`, text: 'Tu es à ' + walkMin(metersPath(route(nearestNode(ST.me.pos), nearestNode(ST.rdv.at)), ST.me.pos)) + ' min à pied.', t: fmtClock(ST.clock), icon: IC('point_de_rdv') }] : []), { title: 'Kalia b2b Remo commence', text: 'Sur la scène principale, dans 10 min.', t: '23:20', icon: IC('scene') }, { title: 'Léa est arrivée', text: 'Elle est près de la Fosse.', t: '22:58', icon: fHead('lea') }];
  const all = ST.notifs.concat(base);
  const el = mount(`${statusBar()}<div class="topbar"><button class="rb" id="bk" aria-label="Retour">${I.back}</button><h1 class="left" style="font-size:26px;font-weight:800">Notifications</h1></div>
    <div style="padding:0 18px 8px"><div class="chips">${['Tout', 'Amis', 'Événement', 'Sécurité'].map((c, i) => `<button class="chip ${i ? '' : 'on'}">${c}</button>`).join('')}</div></div>
    <div class="body"><div class="list">${all.map(n => `<div class="row" style="align-items:flex-start"><img class="av" src="${n.icon || A + 'logo.webp'}" alt="" style="background:#F3F5FB;object-fit:contain"><div class="grow"><div class="t" style="white-space:normal">${esc(n.title)}</div><div class="s">${esc(n.text)}</div></div><span class="tiny">${n.t}</span></div>`).join('')}</div>
    <div class="tiny" style="text-align:center">Les notifications en double sont regroupées. Réglages › Notifications pour choisir ce que tu reçois.</div></div>`);
  $('#bk', el).onclick = () => V.map();
  $$('.chips .chip', el).forEach((c, i) => c.onclick = () => { $$('.chips .chip', el).forEach(x => x.classList.toggle('on', x === c)); $$('.list .row', el).forEach((r, j) => r.hidden = i && !(i === 1 ? /Léa|ami/i.test(r.textContent) : i === 2 ? /Kalia|scène|programm/i.test(r.textContent) : /sécurité|alerte/i.test(r.textContent))); });
};

// ---------- recherche ----------
V.search = () => {
  const el = mount(`${statusBar()}<div class="topbar"><button class="rb" id="bk" aria-label="Retour">${I.back}</button><input class="inp" id="q" placeholder="Bar, toilettes, artiste, ami…" style="min-height:46px" autocomplete="off"></div>
    <div class="body" id="r"></div>`);
  const r = $('#r', el), q = $('#q', el);
  const draw = () => { const v = q.value.trim().toLowerCase();
    if (!v) { r.innerHTML = `<div class="sec">Catégories</div><div class="grid3">${[['bar', 'Bars', 'bar'], ['scene', 'Scènes', 'scene'], ['wc', 'Toilettes', 'image_178'], ['food', 'Manger', 'food'], ['secours', 'Secours', 'infirmerie'], ['vestiaire', 'Vestiaire', 'vestiaire'], ['cashless', 'Cashless', 'cashless'], ['eau', 'Eau gratuite', 'eau'], ['recharge', 'Recharge', 'recharge_telephone']].filter(c => POIS.some(o => o.id === c[0] || o.cat === c[0])).map(c => `<button class="card" data-p="${c[0]}" style="align-items:center;gap:4px;padding:10px 4px"><img src="${IC(c[2])}" alt="" style="width:48px"><span style="font-size:12.5px;font-weight:700">${c[1]}</span></button>`).join('')}</div>`; }
    else { const p = POIS.filter(o => o.n.toLowerCase().includes(v) || (o.desc || '').toLowerCase().includes(v)), a = LINEUP.filter(l => l.a.toLowerCase().includes(v)), f = myFriends().filter(x => x.n.toLowerCase().includes(v));
      r.innerHTML = (p.length || a.length || f.length) ? `<div class="list">${f.map(x => `<button class="row" data-fr="${x.id}"><img class="av" src="${fHead(x.id)}" alt=""><div class="grow"><div class="t">${x.n}</div><div class="s">Ami · ${zoneOf(friendPos(x.id))}</div></div></button>`).join('')}${p.map(o => `<button class="row" data-p="${o.id}"><img src="${IC(o.ic)}" alt="" style="width:40px"><div class="grow"><div class="t">${o.n}</div><div class="s">${metersPath(route(nearestNode(ST.me.pos), o.node), ST.me.pos)} m</div></div></button>`).join('')}${a.map(l => `<button class="row" data-p="${l.s}"><div class="ico">${I.star}</div><div class="grow"><div class="t">${l.a}</div><div class="s">${l.f} – ${l.t} · ${l.s === 'dj' ? 'Le Cube' : 'Scène principale'}</div></div></button>`).join('')}</div>` : '<div class="card small">Aucun résultat. Essaie « bar », « eau » ou un prénom.</div>'; }
    $$('[data-p]', r).forEach(b => b.onclick = () => { const o = POIS.find(x => x.id === b.dataset.p) || POIS.find(x => x.cat === b.dataset.p); V.map({ at: o.at, zoom: .6 }); setTimeout(() => V.poiSheet(o.id), 250); });
    $$('[data-fr]', r).forEach(b => b.onclick = () => { V.map({ at: friendPos(b.dataset.fr), zoom: .6 }); setTimeout(() => V.friendSheet(b.dataset.fr), 250); }); };
  q.oninput = draw; $('#bk', el).onclick = () => V.map(); draw(); setTimeout(() => q.focus(), 50);
};

// ---------- signalement / SOS ----------
const CATS = [['medical', 'Urgence médicale', 'infirmerie', '#E5484D'], ['danger', 'Danger / bagarre', 'securite', '#E5484D'], ['crowd', 'Trop de monde', 'dancefloor', '#E58A00'], ['child', 'Enfant perdu', 'point_de_rdv', '#E5484D'], ['lost', 'Objet perdu', 'objets_trouves', '#4F6BF5'], ['harass', 'Harcèlement', 'staff', '#8B5CF6'], ['other', 'Autre', 'point_info', '#5B6075']];
V.report = () => {
  const sb = openSheet(`<h2 class="h2">Signaler un problème</h2><p class="small" style="margin:-6px 0 0">Ta position est jointe automatiquement. L’équipe du lieu reçoit l’alerte en direct.</p>
    <div class="grid3">${CATS.map(c => `<button class="card" data-c="${c[0]}" style="align-items:center;gap:6px;padding:12px 4px;box-shadow:inset 0 0 0 1.5px ${c[3]}22"><img src="${IC(c[2])}" alt="" style="width:50px"><span style="font-size:12.5px;font-weight:750;text-align:center">${c[1]}</span></button>`).join('')}</div>
    <div class="card" style="background:#FDECEC;gap:8px"><b style="color:#B42318">Danger de mort ?</b><div class="grid2"><div class="grid2"><button class="btn red" id="c112">${I.phone.replace('<svg', '<svg width="18"')} Appeler le ${tpl().sos[0]}</button>${tpl().sos[1] ? `<button class="btn white" id="c114">SMS au ${tpl().sos[1]}</button>` : `<button class="btn white" id="cpost">Poste de secours</button>`}</div><div class="tiny">${tpl().sos[0] === '911' ? 'Aux États-Unis : 911 (appel ou SMS selon la zone).' : `Le ${tpl().sos[0]} fonctionne sans données mobiles.${tpl().sos[1] ? ' Le 114 : urgence par SMS (France).' : ''}`}</div></div>`);
  sb.onclick = async e => { const c = e.target.closest('[data-c]'); if (c) V.reportDetail(c.dataset.c); if (e.target.closest('#cpost')) { const s = POIS.find(o => o.cat === 'secu'); closeSheet(true); if (s) V.goTo(s.at, s.n, s.node); return; } if (e.target.closest('#c112,#c114')) { const n = e.target.closest('#c112') ? tpl().sos[0] : tpl().sos[1]; await sysAlert({ title: e.target.closest('#c112') ? `Appeler le ${n} ?` : `Écrire au ${n} ?`, text: 'Prototype : aucun appel n’est passé. Sur un vrai téléphone, l’appel ou le SMS s’ouvre directement.', buttons: [{ t: 'Annuler', v: 0 }, { t: e.target.closest('#c112') ? 'Appeler' : 'Écrire', v: 1, b: 1 }] }); } };
};
V.reportDetail = (cat) => {
  const c = CATS.find(x => x[0] === cat); let shareFr = true, note = '';
  const sb = openSheet(`<div style="display:flex;gap:10px;align-items:center"><img src="${IC(c[2])}" alt="" style="width:48px"><h2 class="h2">${c[1]}</h2></div>
    <div class="card" style="background:#F3F5FB;flex-direction:row;gap:10px;align-items:center"><div style="width:74px;height:60px;border-radius:12px;background:url(${VENUE.map.src}) ${ST.me.pos[0]}% ${ST.me.pos[1]}%/900% auto;flex-shrink:0;position:relative"><span style="position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px;border-radius:6px;background:#4F6BF5;border:2px solid #fff"></span></div><div><b style="font-size:14px">${zoneOf(ST.me.pos)}</b><div class="small">Position jointe · ± 3 m</div></div></div>
    <div class="chips" style="flex-wrap:wrap" id="nt">${({ medical: ['Malaise', 'Blessure', 'Alcool / drogue', 'Je ne sais pas'], danger: ['Bagarre', 'Personne agressive', 'Objet dangereux'], crowd: ['On est écrasés', 'Sortie bloquée', 'Bousculade'], lost: ['Téléphone', 'Portefeuille', 'Clés', 'Sac'], child: ['Enfant de moins de 6 ans', '6 à 12 ans', 'Adolescent'], harass: ['Je suis harcelé·e', 'Quelqu’un d’autre', 'Besoin d’être accompagné·e'], other: ['Panne', 'Fuite d’eau', 'Autre'] })[cat].map(t => `<button class="chip" data-n="${t}">${t}</button>`).join('')}</div>
    <input class="inp" id="tx" aria-label="Détail du signalement" placeholder="Détail (facultatif)" style="font-size:15px">
    ${cat === 'harass' ? '<div class="card" style="background:#F1EBFE"><b style="font-size:14px">Alerte discrète</b><div class="small">L’écran reste neutre, sans son. Un agent formé vient vers toi sans te désigner.</div></div>' : ''}<button class="row" id="sf" style="background:#F3F5FB;border-radius:14px"><div class="grow"><div class="t">Prévenir aussi mes amis</div><div class="s">Ils reçoivent ta position</div></div><span class="tog on"></span></button>
    <button class="btn ${cat === 'medical' || cat === 'danger' ? 'red' : ''}" id="send">Envoyer l’alerte</button>
    <div class="tiny" style="text-align:center">Si pas de réseau, l’alerte part dès qu’il revient (en file d’attente).</div>`);
  sb.onclick = e => { const n = e.target.closest('[data-n]'); if (n) { n.classList.toggle('on'); note = $$('#nt .chip.on', sb).map(x => x.dataset.n).join(', '); } if (e.target.closest('#sf')) { shareFr = !shareFr; $('#sf .tog', sb).classList.toggle('on', shareFr); } };
  $('#send', sb).onclick = () => {
    const r = { id: Date.now() % 100000, cat, label: c[1], note: note || $('#tx', sb).value || '', at: [...ST.me.pos], zone: zoneOf(ST.me.pos), time: fmtClock(ST.clock), status: 'Reçue', by: '@' + ST.me.pseudo, mine: true, prio: cat === 'medical' || cat === 'danger' ? 'Critique' : cat === 'crowd' || cat === 'harass' ? 'Majeur' : 'Mineur', hist: [[fmtClock(ST.clock), 'Alerte reçue par l’équipe', 'Reçue']] };
    if (ST.offline) { r.status = 'En attente réseau'; r.hist = [[fmtClock(ST.clock), 'Enregistrée sur ton téléphone, envoi dès le retour du réseau', 'En attente réseau']]; ST.outbox = (ST.outbox || []).concat(r.id); }
    ST.reports.unshift(r); logEv('Signalement visiteur : ' + r.label + ' · ' + r.zone); emit(); closeSheet(true); V.reportStatus(r.id);
    // si personne ne la prend en charge depuis le mode staff, le système simule une prise en charge
    setTimeout(() => { if (r.status === 'Reçue' && ST.role === 'visitor') staffTake(r.id, 'Nadir K.'); }, 9000);
  };
};
V.reportStatus = (id) => {
  const r = ST.reports.find(x => x.id === id); if (!r) return;
  const steps = r.status === 'En attente réseau' ? ['En attente réseau', 'Reçue', 'Prise en charge', 'En route', 'Sur place', 'Résolu'] : ['Reçue', 'Prise en charge', 'En route', 'Sur place', 'Résolu'], k = steps.indexOf(r.status), hOf = (s, i) => r.hist.find(h => h[2] === s) || (i === 0 && !r.hist[0][2] ? r.hist[0] : null);
  const sb = openSheet(`<div style="display:flex;gap:12px;align-items:center"><img src="${A}av/${r.status === 'Reçue' ? 'valide_secu' : 'secu'}.webp" alt="" style="height:110px"><div><h2 class="h2">${r.status === 'En attente réseau' ? 'Envoi dès le retour du réseau' : r.status === 'Reçue' ? 'C’est envoyé !' : r.status === 'Résolu' ? 'Alerte résolue' : 'Un agent arrive'}</h2><div class="small">${r.label} · ${r.zone} · ${r.time}</div></div></div>
    <div class="list">${steps.map((s, i) => `<div class="row" style="min-height:44px"><span style="width:22px;height:22px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;background:${i <= k ? '#16A34A' : '#DADDE6'}">${i <= k ? I.check.replace('<svg', '<svg width="13"') : ''}</span><div class="grow"><div class="t" style="font-size:14px;${i <= k ? '' : 'color:var(--ink3)'}">${s}</div>${hOf(s, i) ? `<div class="s">${hOf(s, i)[0]} · ${esc(hOf(s, i)[1])}</div>` : ''}</div></div>`).join('')}</div>
    <div class="card" style="background:#FDECEC"><div class="small">Reste visible si tu le peux. En cas de danger immédiat : <b style="user-select:all">112</b></div></div>`);
  const upd = () => { if (!document.body.contains(sb)) { listeners.delete(upd); return; } if (r._seen !== r.status) { r._seen = r.status; listeners.delete(upd); V.reportStatus(id); } };
  r._seen = r.status; listeners.add(upd);
};
function staffTake(id, who) {
  const r = ST.reports.find(x => x.id === id); if (!r || r.status !== 'Reçue') return;
  const role = (STAFF.find(s => s.n === who) || { role: 'staff' }).role.toLowerCase(); r.status = 'Prise en charge'; r.agent = who; r.hist.push([fmtClock(ST.clock), who + ' (' + role + ') prend en charge', 'Prise en charge']); emit();
  if (r.mine) push({ rid: id, title: 'Alerte prise en charge', text: `${who} arrive vers toi (≈ 2 min).`, icon: IC('securite'), onTap: () => V.reportStatus(id) });
  setTimeout(() => { if (r.status === 'Prise en charge') { r.status = 'En route'; r.hist.push([fmtClock(ST.clock), who + ' en route · 2 min', 'En route']); emit(); } }, 4000);
}

// ---------- réglages / profil ----------
V.settings = () => {
  if (guest()) return needAccount();
  const p = ST.perms, on = v => v ? '<span class="pill ok">Activé</span>' : '<span class="pill bad">Désactivé</span>';
  const el = mount(`${statusBar()}<div class="body" style="padding-bottom:calc(150px + env(safe-area-inset-bottom,0px));padding-top:8px">
    <div class="card" style="flex-direction:row;align-items:center;gap:12px;background:linear-gradient(135deg,#DCE5FF,#F8DDEB)"><img src="${CH(ST.me.char || 'lins')}" alt="" style="height:110px"><div style="flex:1"><b style="font-size:20px">${esc(ST.me.first)}</b><div class="small">@${esc(ST.me.pseudo || 'alex.m')} · ${ST.friends.length} amis</div><button class="btn sm white" id="av" style="margin-top:8px">Modifier mon avatar</button></div></div>
    <div class="sec">Soirée</div><div class="list">
      <button class="row" data-g="share"><div class="ico">${I.eye}</div><div class="grow"><div class="t">Partage de ma position</div><div class="s">${typeof shareLabel === 'function' ? shareLabel() : ''}</div></div></button>
      <button class="row" data-g="discover"><div class="ico">${I.cal}</div><div class="grow"><div class="t">Découvrir et mes événements</div><div class="s">En direct, à venir, historique</div></div></button><button class="row" data-g="recap"><div class="ico">${I.replay}</div><div class="grow"><div class="t">Mon récap et replay</div><div class="s">Disponible à la fin de la soirée</div></div></button>
      <button class="row" data-g="reports"><div class="ico">${I.flag}</div><div class="grow"><div class="t">Mes signalements</div><div class="s">${ST.reports.filter(r => r.mine).length} en cours ou traités</div></div></button>
      <button class="row" data-g="wallet"><div class="ico">${I.ticket}</div><div class="grow"><div class="t">Billet et cashless</div><div class="s">QR d’entrée · solde ${(ST.balance ?? 34.5).toFixed(2).replace('.', ',')} €</div></div></button>${hasFlag('family') ? `<button class="row" data-g="family"><div class="ico">${I.users}</div><div class="grow"><div class="t">Mode famille</div><div class="s">${hasFlag('familyOn') ? 'Lina suivie par son bracelet' : 'Suivre un enfant (bracelet)'}</div></div></button>` : ''}
      <button class="row" data-g="qr"><div class="ico">${I.qr}</div><div class="grow"><div class="t">Mon QR d’ami</div></div></button><button class="row" data-g="bat"><div class="ico">${I.battery}</div><div class="grow"><div class="t">Économie de batterie automatique</div><div class="s">Sous 20 % : position moins fréquente, dernière position envoyée avant l’extinction</div></div><span class="tog on"></span></button></div>
    <div class="sec">Autorisations</div><div class="list">
      ${[['Localisation', p.loc ? (p.always ? 'Toujours' : 'Lorsque l’app est active') : null, 'loc'], ['Bluetooth', p.bt, 'bt'], ['Notifications', p.notif, 'notif'], ['Mouvements', p.motion, 'motion'], ['Contacts', p.contacts, 'contacts']].map(r => `<button class="row" data-perm="${r[2]}"><div class="grow"><div class="t">${r[0]}</div><div class="s">${typeof r[1] === 'string' ? r[1] : r[1] ? 'Autorisé' : 'Ouvre les réglages du téléphone pour l’activer'}</div></div>${on(r[1])}</button>`).join('')}</div>
    <div class="sec">Confidentialité et données</div><div class="list">
      <button class="row" data-g="stats"><div class="grow"><div class="t">Stats anonymes pour le lieu</div><div class="s">Sans nom ni parcours individuel</div></div><span class="tog ${p.stats ? 'on' : ''}"></span></button>
      <button class="row" data-g="notifs"><div class="grow"><div class="t">Notifications</div><div class="s">Amis, RDV, programmation, sécurité</div></div></button>
      <button class="row" data-g="blocked"><div class="grow"><div class="t">Bloqués</div><div class="s">0</div></div></button>
      <button class="row" data-g="export"><div class="ico">${I.download}</div><div class="grow"><div class="t">Télécharger mes données</div></div></button>
      <button class="row" data-g="delete"><div class="ico" style="background:#FDECEC;color:#E5484D">${I.trash}</div><div class="grow"><div class="t" style="color:#E5484D">Supprimer mon compte</div></div></button></div>
    <div class="list"><button class="row" data-g="lang"><div class="grow"><div class="t">Langue</div><div class="s">Français · English</div></div><span class="pill gray">${(ST.lang || 'fr').toUpperCase()}</span></button><button class="row" data-g="theme"><div class="grow"><div class="t">Thème</div><div class="s">${{ light: 'Clair', dark: 'Sombre', auto: 'Automatique (sombre la nuit)' }[ST.theme]}</div></div></button><button class="row" data-g="help"><div class="grow"><div class="t">Aide et contact</div></div></button><button class="row" data-g="legal"><div class="grow"><div class="t">CGU et confidentialité</div></div></button><button class="row" data-g="out"><div class="ico">${I.logout}</div><div class="grow"><div class="t">Se déconnecter</div></div></button></div>
    <div class="tiny" style="text-align:center">ONEERA 2.0 (prototype)</div></div>${navBar('config')}`);
  wireNav(el); $('#av', el).onclick = () => V.avatarEditor(null);
  el.addEventListener('click', async e => {
    const g = e.target.closest('[data-g]')?.dataset.g, pm = e.target.closest('[data-perm]')?.dataset.perm;
    if (pm) { if (pm === 'contacts') return V.addFriends(false); if (pm === 'loc' && p.loc && !p.always) return V.askAlways(); const v = await sysAlert({ title: 'Réglages › ONEERA', text: 'Sur un vrai iPhone, ce bouton ouvre les réglages de l’app pour changer cet accès.', buttons: [{ t: 'Activer (simulation)', v: true, b: 1 }, { t: 'Désactiver', v: false }] }); p[pm] = pm === 'loc' ? (v ? 'app' : null) : v; V.settings(); return; }
    if (!g) return;
    if (g === 'wallet') V.wallet(); if (g === 'discover') V.discover(); if (g === 'family') V.family();
    if (g === 'share') V.shareSettings(); if (g === 'recap') V.recap(); if (g === 'reports') V.myReports(); if (g === 'qr') V.qrFriend(); if (g === 'legal') V.legal();
    if (g === 'bat') e.target.closest('[data-g]').querySelector('.tog').classList.toggle('on');
    if (g === 'stats') { p.stats = !p.stats; e.target.closest('[data-g]').querySelector('.tog').classList.toggle('on', p.stats); }
    if (g === 'notifs') { const sb = openSheet(`<h2 class="h2">Notifications</h2><div class="list">${[['Alertes de sécurité du lieu', 1, 1], ['Amis : arrivée, RDV, « viens ici »', 1], ['Messages', 1], ['Programmation (favoris)', 1], ['Offres des partenaires', 0]].map(r => `<button class="row"><div class="grow"><div class="t">${r[0]}</div>${r[2] ? '<div class="s">Recommandé, ne peut pas être groupé</div>' : ''}</div><span class="tog ${r[1] ? 'on' : ''}"></span></button>`).join('')}</div><div class="tiny">Jamais de doublon : une même info n’est envoyée qu’une fois.</div>`); sb.onclick = e2 => { const r = e2.target.closest('.row'); r && r.querySelector('.tog').classList.toggle('on'); }; }
    if (g === 'blocked') openSheet('<h2 class="h2">Bloqués</h2><div class="card small">Personne n’est bloqué. Une personne bloquée ne voit plus ta position et ne peut plus t’écrire, sans être prévenue.</div>');
    if (g === 'export') { openSheet(`<h2 class="h2">Télécharger mes données</h2><div class="small">Profil, amis, messages, récaps et autorisations dans un fichier lisible (JSON + PDF).</div><button class="btn" id="ex">Préparer mon export</button>`); $('#ex').onclick = () => { closeSheet(); toast('Export prêt sous 24 h : lien sécurisé envoyé par e-mail'); }; }
    if (g === 'delete') { const sb = openSheet(`<h2 class="h2">Supprimer mon compte ?</h2><div class="card" style="background:#FDECEC"><div class="small">Profil, avatar, amis, messages et récaps seront supprimés définitivement sous 30 jours. Les statistiques anonymes déjà agrégées ne permettent pas de te retrouver.</div></div><button class="btn red" id="del">Supprimer définitivement</button><button class="link" id="no">Annuler</button>`); $('#no', sb).onclick = () => closeSheet(); $('#del', sb).onclick = () => { closeSheet(); toast('Prototype : suppression simulée. Rien n’a été effacé.'); }; }
    if (g === 'help') { const H = [['Je ne vois pas mes amis', 'Ils doivent avoir accepté ta demande et partager leur position. Une position grisée = ancienne.'], ['Ma position est fausse', 'Vérifie que la localisation est autorisée. À l’intérieur, la précision dépend des balises (± 3 à 8 m).'], ['Je n’ai pas de réseau', 'Le plan reste disponible. Tes alertes partent dès que le réseau revient.'], ['Contacter l’équipe ONEERA', 'Réponse sous 24 h. Pendant l’événement, va au point info.']]; const sb = openSheet(`<h2 class="h2">Aide</h2><div class="list">${H.map((t, i) => `<button class="row" data-h="${i}" style="flex-direction:column;align-items:flex-start"><div class="t">${t[0]}</div><div class="s" hidden>${t[1]}</div></button>`).join('')}</div>`); sb.onclick = e2 => { const r = e2.target.closest('[data-h]'); if (r) r.querySelector('.s').hidden = !r.querySelector('.s').hidden; }; }
    if (g === 'lang') V.langSheet(); if (g === 'theme') V.themeSheet();
    if (g === 'out') { ST.account = null; V.welcome(); }
  });
};
V.myReports = () => openSheet(`<h2 class="h2">Mes signalements</h2><div class="list">${ST.reports.filter(r => r.mine).map(r => `<button class="row" data-r="${r.id}"><img src="${IC(CATS.find(c => c[0] === r.cat)[2])}" alt="" style="width:38px"><div class="grow"><div class="t">${r.label}</div><div class="s">${r.zone} · ${r.time}</div></div><span class="pill ${r.status === 'Résolu' ? 'ok' : 'warn'}">${r.status}</span></button>`).join('') || '<div class="row small">Aucun signalement.</div>'}</div>`).onclick = e => { const r = e.target.closest('[data-r]'); r && V.reportStatus(+r.dataset.r); };

// ---------- récap + replay ----------
V.recap = () => {
  const zones = ZONES.slice(0, 5).map((z, i) => [z.n, [132, 58, 41, 37, 49][i], ['#F26B6B', '#86A6F5', '#A6E04A', '#F5B841', '#B58CF5'][i]]), tot = zones.reduce((a, z) => a + z[1], 0);
  let acc = 0; const segs = zones.map(z => { const s = `<circle r="15.9" cx="20" cy="20" fill="none" stroke="${z[2]}" stroke-width="6" stroke-dasharray="${z[1] / tot * 100} ${100 - z[1] / tot * 100}" stroke-dashoffset="${25 - acc}"/>`; acc += z[1] / tot * 100; return s; }).join('');
  const el = mount(`${statusBar()}<div class="topbar"><button class="rb" id="bk" aria-label="Retour">${I.back}</button><h1>Le récap de ta soirée ✨</h1><button class="rb" id="sh" aria-label="Partager">${I.share}</button></div>
    <div class="body"><div class="card" style="flex-direction:row;align-items:center;gap:12px;background:linear-gradient(135deg,#4A63E8,#8B5CF6);color:#fff"><img src="${CH(ST.me.char || 'lins')}" alt="" style="height:124px"><div><div style="font-size:13px;opacity:.85">${EVENT.name} · ${EVENT.date}</div><b style="font-size:30px">5 h 17</b><div style="font-size:13px">sur place · 22:41 → 03:58</div></div></div>
    <div class="grid2"><div class="stat"><span>Distance</span><b>3,4 km</b></div><div class="stat"><span>Pas</span><b>4 620</b></div><div class="stat"><span>Zones visitées</span><b>5</b></div><div class="stat"><span>À l’arrêt</span><b>2 h 06</b><span class="tiny">surtout à ${ZONES[0].n}</span></div></div>
    <div class="card"><b>Où tu as passé ta soirée</b><div style="display:flex;gap:14px;align-items:center"><svg viewBox="0 0 40 40" width="120" height="120">${segs}<text x="20" y="21" text-anchor="middle" font-size="5.5" font-weight="800" fill="#1C1F2A">5 h 17</text></svg><div style="display:flex;flex-direction:column;gap:4px;font-size:13px">${zones.map(z => `<span style="display:flex;gap:6px;align-items:center"><span class="dot" style="background:${z[2]}"></span>${z[0]} · ${Math.floor(z[1] / 60) ? Math.floor(z[1] / 60) + ' h ' : ''}${z[1] % 60} min</span>`).join('')}</div></div></div>
    <button class="btn" id="rp">${I.replay.replace('<svg', '<svg width="20"')} Revoir ma soirée (replay)</button>
    <div class="tiny">Calculé à partir de ta position lissée (± 3 m). Replay disponible 24 h, puis tes positions détaillées sont effacées. Ce récap (chiffres et zones) reste dans ton compte.</div></div>`);
  $('#bk', el).onclick = V.settings; $('#sh', el).onclick = () => V.shareSheet('Ma soirée au Bal des Fous : 5 h 17, 3,4 km, 4 620 pas ✨ via ONEERA'); $('#rp', el).onclick = V.replay;
};
V.replay = () => {
  let path; if (VENUE.id === 'bdf') { path = 'AB BC CD DE EF FG GH HI IH HG GF FM MN NO ON NM MF FE EQ QE ET TG GH HW WH HG GF FE ED DC CB BA'.split(' ').map(e => e[0]); path.push('A'); } else { path = ['A']; POIS.filter(o => !o.restricted).forEach(o => { const r = route(path[path.length - 1], o.node); path.push(...r.slice(1)); }); path.push(...route(path[path.length - 1], 'A').slice(1)); }
  const pts = path.map(k => NODES[k]); let L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
  const el = mount(`<div id="mv"></div>${statusBar()}<div class="mapTop"><div class="evbar"><button class="rb ghost" id="bk" aria-label="Retour">${I.back}</button><div style="flex:1"><b>Replay de ma soirée</b><div class="small"><span class="pill ok" style="padding:1px 7px">● REPLAY</span> ${EVENT.name}</div></div></div></div>
    <div style="position:absolute;right:12px;top:150px;z-index:20;display:flex;flex-direction:column;gap:6px;width:118px">${[['Heure', 'h'], ['Distance', 'd'], ['Pas', 's'], ['Zone', 'z']].map(s => `<div class="mini" style="flex-direction:column;align-items:flex-start;gap:0;padding:8px 10px"><span class="tiny">${s[0]}</span><b id="r${s[1]}" style="font-size:15px;font-variant-numeric:tabular-nums">—</b></div>`).join('')}</div>
    <div class="livebar" style="bottom:26px"><div class="mini" style="flex-direction:column;align-items:stretch;gap:6px"><div style="display:flex;align-items:center;gap:8px"><button class="rb" id="pp" aria-label="Lecture" style="width:40px;height:40px;background:var(--pri);color:#fff">${I.play}</button><input type="range" id="sl" min="0" max="1000" value="0" style="flex:1" aria-label="Position dans la soirée"><button class="chip" id="spd">×1</button></div><div style="display:flex;justify-content:space-between" class="tiny"><span>22:41</span><span>00:00</span><span>01:30</span><span>03:58</span></div></div></div>`);
  if (MV) MV.destroy();
  let k = 0, playing = false, speed = 1; const trail = [];
  MV = new MapView($('#mv', el), { at: [52, 55], zoom: .36, cluster: false, strict: true, markers: () => { const at = posAt(k); return [...POIS.filter(o => ['scene', 'barO', 'barE', 'fosse', 'rotonde', 'entree'].includes(o.id)).map(o => ({ ...poiMarker(o, () => toast(`${o.n} : ${{ scene: '1 h 05', barO: '22 min', barE: '14 min', fosse: '2 h 12', rotonde: '37 min', entree: '6 min' }[o.id]} passés ici ce soir`)), z: 2 })), personMarker('me', 'Moi', meHead(), at, { me: true, acc: 3 })]; } });
  function posAt(k) { const d = k / 1000 * L[L.length - 1]; let i = 1; while (i < L.length - 1 && L[i] < d) i++; const t = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; }
  const upd = () => { const at = posAt(k); const done = []; for (let j = 0; j <= 60; j++) { const kk = j / 60 * k; done.push(posAt(kk)); } MV.setRoute(done, '#8B5CF6');
    $('#rh', el).textContent = fmtClock(22 * 60 + 41 + k / 1000 * 317); $('#rd', el).textContent = (k / 1000 * 3.4).toFixed(1).replace('.', ',') + ' km'; $('#rs', el).textContent = Math.round(k / 1000 * 4620).toLocaleString('fr-FR'); $('#rz', el).textContent = zoneOf(at); $('#sl', el).value = k; };
  const tk = dt => { if (!document.body.contains(el)) { tickers.delete(tk); return; } if (playing) { k = Math.min(1000, k + dt * 40 * speed); if (k >= 1000) playing = false; upd(); $('#pp', el).innerHTML = playing ? I.pause : I.play; } };
  tickers.add(tk);
  $('#pp', el).onclick = () => { playing = !playing; if (k >= 1000) k = 0; $('#pp', el).innerHTML = playing ? I.pause : I.play; };
  $('#sl', el).oninput = e => { k = +e.target.value; upd(); };
  $('#spd', el).onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 5 : 1; $('#spd', el).textContent = '×' + speed; };
  $('#bk', el).onclick = V.recap; upd();
};

// ---------- « Je te cherche » : boussole plein écran pour les 30 derniers mètres ----------
V.findFriend = (id) => {
  closeSheet(true); const f = FRIENDS.find(x => x.id === id);
  const el = mount(`${statusBar(true)}<div class="topbar"><button class="rb" id="bk" aria-label="Retour" style="background:rgba(255,255,255,.12);color:#fff">${I.back}</button><h1 style="color:#fff">Je cherche ${f.n}</h1><span style="width:44px"></span></div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;padding:0 20px">
      <div style="position:relative;width:250px;height:250px;border-radius:125px;border:2px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center">
        <svg id="arr" width="150" height="150" viewBox="0 0 24 24" style="transition:transform .35s"><path d="M12 2l7 19-7-4-7 4z" fill="${f.col}"/></svg>
        <img src="${fHead(f.id)}" alt="" style="position:absolute;top:-26px;width:52px;height:52px;border-radius:26px;border:3px solid ${f.col}"></div>
      <b id="dd" style="font-size:54px;font-variant-numeric:tabular-nums;letter-spacing:-.02em">—</b><span id="hint" style="opacity:.8;text-align:center">Tourne-toi jusqu’à ce que la flèche pointe devant toi</span>
      <div class="pill" style="background:rgba(255,255,255,.12);color:#fff" id="vib">Vibrations : lentes</div>
      <button class="btn" id="flash" style="background:${f.col}">Faire clignoter nos écrans</button>
      <span class="tiny" style="color:rgba(255,255,255,.6);text-align:center">Ton écran et celui de ${f.n} clignotent de la même couleur : levez vos téléphones pour vous repérer dans la foule.</span></div>`, 'dark');
  let d = Math.min(42, metersPath(route(nearestNode(ST.me.pos), nearestNode(friendPos(id))), ST.me.pos)), t = 0;
  const tk = dt => { if (!document.body.contains(el)) { tickers.delete(tk); return; } t += dt; d = Math.max(2, d - dt * 1.1);
    $('#arr', el).style.transform = `rotate(${Math.sin(t * .7) * 25 + 12}deg)`; $('#dd', el).textContent = Math.round(d) + ' m';
    $('#vib', el).textContent = 'Vibrations : ' + (d < 8 ? 'très rapides' : d < 20 ? 'rapides' : 'lentes'); if (d <= 2.5) $('#hint', el).textContent = `${f.n} est tout près de toi 👋`; };
  tickers.add(tk);
  $('#bk', el).onclick = () => V.map({ at: friendPos(id), zoom: .6 });
  $('#flash', el).onclick = async () => { const sc = el; for (let i = 0; i < 6; i++) { sc.style.background = i % 2 ? '#0F1118' : f.col; await sleep(260); } sc.style.background = ''; toast(`${f.n} voit aussi son écran clignoter`); };
};
// ---------- écran verrouillé : suivi en direct (Live Activity / notification permanente) ----------
V.lock = () => {
  const lea = FRIENDS[0], d = metersPath(route(nearestNode(ST.me.pos), nearestNode(friendPos('lea'))), ST.me.pos);
  const el = mount(`<div style="position:absolute;inset:0;background:linear-gradient(180deg,#2A1B4A,#7C5BD6 55%,#E59BC8)"></div>
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;color:#fff;padding-top:70px;gap:2px"><span style="font-size:17px;font-weight:600">samedi 25 juillet</span><b style="font-size:86px;font-weight:300;letter-spacing:-.03em;line-height:1">${fmtClock(ST.clock)}</b></div>
    <div style="position:relative;margin:auto 12px 0;display:flex;flex-direction:column;gap:8px;padding-bottom:60px">
      <button class="mini" id="la" style="background:rgba(20,20,30,.72);color:#fff;backdrop-filter:blur(16px);padding:14px"><img src="${A}logo.webp" alt="" style="width:34px;border-radius:8px"><div style="flex:1;text-align:left"><b>${ST.rdv ? 'RDV ' + ST.rdv.time + ' · ' + esc(ST.rdv.n) : 'Le Bal des Fous · carte en direct'}</b><div style="font-size:13px;opacity:.85;display:flex;gap:6px;align-items:center"><img src="${fHead('lea')}" alt="" style="width:20px;height:20px;border-radius:10px"> Léa à ${d} m · ${zoneOf(friendPos('lea'))} <span style="display:inline-block;transform:rotate(30deg)">↑</span></div></div></button>
      <button class="push" style="position:static;animation:none"><div class="pi"><img src="${fHead('ines')}" alt=""></div><div style="flex:1;display:flex;flex-direction:column"><span class="tiny" style="color:#666;font-weight:700">ONEERA</span><b>Inès</b><span>Je suis au bar à cocktails 🍹</span></div></button>
      <div class="tiny" style="color:rgba(255,255,255,.85);text-align:center">Suivi en direct sur l’écran verrouillé (iPhone : Live Activity · Android : notification permanente). Pas besoin de déverrouiller.</div></div>`, 'dark');
  $('#la', el).onclick = () => V.map(); $('.push', el).onclick = () => V.chat('ines');
};
// alertes mises en file hors ligne : envoyées au retour du réseau
function flushOffline() { (ST.outbox || []).forEach(id => { const r = ST.reports.find(x => x.id === id); if (r && r.status === 'En attente réseau') { r.status = 'Reçue'; r.hist.push([fmtClock(ST.clock), 'Envoyée au retour du réseau, reçue par l’équipe', 'Reçue']); setTimeout(() => { if (r.status === 'Reçue' && ST.role === 'visitor') staffTake(r.id, 'Nadir K.'); }, 9000); } }); ST.outbox = []; }
