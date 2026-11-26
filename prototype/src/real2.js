// ===== Version réelle (suite) : onglet Amis, fiche ami, discussions — uniquement des données du serveur =====
REAL.convos = {}; REAL.convList = null; REAL.chatOpen = null;
const rFriend = id => REAL.friends.find(f => f.id === id && f.status === 'accepted');
const rReceived = () => REAL.friends.filter(f => f.status === 'pending' && !f.requestedByMe);
const rSent = () => REAL.friends.filter(f => f.status === 'pending' && f.requestedByMe);
const rAccepted = () => REAL.friends.filter(f => f.status === 'accepted');
const rHere = id => { const p = REAL.pos[id]; return p && p.floor === VENUE.id ? p : null; };
const rPos = id => { const s = FR_STATE[id]; return (s && s.pos) || (rHere(id) || {}).at || null; };
const rAgeMin = id => { const p = REAL.pos[id]; return p ? Math.max(0, Math.round((Date.now() - p.t) / 60000)) : null; };
const rDist = pos => { try { return metersPath(route(nearestNode(ST.me.pos), nearestNode(pos)), ST.me.pos); } catch (_) { return Math.round(dist(ST.me.pos, pos) * PCT_TO_M); } };
function rStatus(id) {
  const here = rHere(id), age = rAgeMin(id), on = REAL.online[id];
  if (here) { const live = on !== false && age <= 2; return { cls: live ? 'ok' : 'warn', t: live ? 'À l’instant' : `Vu il y a ${fmtAge(age)}`, live, here: true }; }
  if (on) return { cls: 'gray', t: 'En ligne · position non partagée', live: false };
  return { cls: 'gray', t: 'Hors ligne', live: false };
}
const fmtAge = m => m < 60 ? `${Math.max(1, m)} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} j`;
const fmtTime = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
// Badges de la barre du bas (demandes reçues, messages non lus) mis à jour sans recharger l'écran.
function realBadges() {
  if (!realOn()) return;
  ST.pending = rReceived().map(f => ({ id: f.id, n: f.displayName }));
  const set = (k, n) => $$(`.nav [data-nav="${k}"]`).forEach(b => { let bd = b.querySelector('.badge'); if (!n) { bd && bd.remove(); return; } if (!bd) { bd = document.createElement('span'); bd.className = 'badge'; bd.style.cssText = 'top:2px;right:8px'; b.append(bd); } bd.textContent = n > 99 ? '99+' : n; });
  set('amis', ST.pending.length); set('chat', unreadChat());
}
const _applyFriends2 = realApplyFriends;
realApplyFriends = function () { _applyFriends2(); realBadges(); if (REAL.onFriends) REAL.onFriends(); };
// À la première synchro : plus aucune donnée de démonstration (bulles, discussions, demandes).
function realPurgeDemo() { if (REAL._purged) return; REAL._purged = true; ST.bubbles = {}; ST.convos = {}; ST.unread = { by: {} }; ST.pending = []; }
const _sync2 = realSyncFriends;
realSyncFriends = async function () { if (realOn()) realPurgeDemo(); await _sync2(); if (realOn() && !REAL._convOnce) { REAL._convOnce = true; realSyncConvos().catch(() => {}); } };

// ---------- Onglet Amis ----------
const _friendsTabDemo = V.friendsTab;
V.friendsTab = (tab0) => {
  if (!realOn()) return _friendsTabDemo();
  let tab = tab0 || (rReceived().length ? 'req' : rAccepted().some(f => rHere(f.id)) ? 'here' : 'all');
  const el = mount(`${statusBar()}<div class="topbar"><h1 class="left" style="font-size:28px;font-weight:800">Amis</h1><button class="rb" id="add" aria-label="Ajouter des amis">${I.plus}</button></div>
    <div style="padding:0 18px 8px"><div class="seg" id="tb"></div></div><div class="body" id="fl" style="padding-bottom:110px"></div>${navBar('amis')}`);
  wireNav(el); el.dataset.real = 'friends';
  const row = (f) => { const s = rStatus(f.id), pos = s.here && rPos(f.id), m = pos ? rDist(pos) : null;
    return `<button class="row" data-f="${f.id}"><span style="position:relative;flex-shrink:0"><img class="av ${s.live || !s.here ? '' : 'stale'}" src="${fHead(f.id)}" alt=""><span class="odot ${REAL.online[f.id] ? 'on' : ''}"></span></span><div class="grow"><div class="t">${esc(f.displayName)}</div><div class="s"><span class="pill ${s.cls}" style="padding:1px 8px">${s.t}</span>${m ? ` · ${m} m · ${walkMin(m)} min à pied` : ''}</div></div><span class="rb ghost" data-chat="${f.id}" role="button" aria-label="Écrire à ${esc(f.displayName)}">${I.chat}</span></button>`; };
  const empty = (t, s) => `<div class="card" style="align-items:center;text-align:center;gap:10px"><img src="${A}av/7_happy.webp" alt="" style="width:78%;max-width:260px"><b style="font-size:17px">${t}</b><span class="small">${s}</span><button class="btn" id="add2">Ajouter des amis</button></div>`;
  const draw = () => {
    const acc = rAccepted(), here = acc.filter(f => rHere(f.id)), rec = rReceived(), sent = rSent();
    $('#tb', el).innerHTML = `<button data-t="here" class="${tab === 'here' ? 'on' : ''}">Ici (${here.length})</button><button data-t="all" class="${tab === 'all' ? 'on' : ''}">Tous (${acc.length})</button><button data-t="req" class="${tab === 'req' ? 'on' : ''}">Demandes${rec.length ? ` (${rec.length})` : ''}</button>`;
    const fl = $('#fl', el);
    if (tab === 'req') fl.innerHTML = (rec.length ? `<div class="sec">Reçues</div><div class="list">${rec.map(f => `<div class="row"><img class="av" src="${fHead(f.id)}" alt=""><div class="grow"><div class="t">${esc(f.displayName)}</div><div class="s">veut t’ajouter</div></div><button class="btn sm" data-acc="${f.id}" style="width:auto;padding:0 14px">Accepter</button><button class="rb ghost" data-dec="${f.id}" aria-label="Refuser">${I.close}</button></div>`).join('')}</div>` : '')
      + (sent.length ? `<div class="sec">Envoyées</div><div class="list">${sent.map(f => `<div class="row"><img class="av" src="${fHead(f.id)}" alt=""><div class="grow"><div class="t">${esc(f.displayName)}</div><div class="s">En attente de réponse</div></div><button class="btn sm white" data-dec="${f.id}" style="width:auto;padding:0 14px">Annuler</button></div>`).join('')}</div>` : '')
      || empty('Aucune demande en cours', 'Ajoute tes amis depuis tes contacts ou avec leur code ONEERA.');
    else { const list = tab === 'here' ? here : acc.slice().sort((a, b) => (!!rHere(b.id) - !!rHere(a.id)) || ((REAL.online[b.id] ? 1 : 0) - (REAL.online[a.id] ? 1 : 0)) || a.displayName.localeCompare(b.displayName));
      fl.innerHTML = list.length ? `<div class="list">${list.map(row).join('')}</div>${tab === 'here' ? `<div class="tiny" style="text-align:center;padding:6px 10px">Seuls les amis qui partagent leur position sur ce lieu apparaissent ici.</div>` : ''}`
        : tab === 'here' ? (acc.length ? empty('Aucun ami sur ce lieu pour l’instant', 'Dès qu’un ami partage sa position ici, il apparaît sur la carte et dans cette liste.') : empty('Ajoute tes premiers amis', 'Retrouve en un geste ceux qui ont déjà ONEERA dans tes contacts.'))
        : empty('Ajoute tes premiers amis', 'Retrouve en un geste ceux qui ont déjà ONEERA dans tes contacts.'); }
    $('#add2', fl) && ($('#add2', fl).onclick = () => V.addFriends(false));
  };
  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; draw(); return; }
    const ch = e.target.closest('[data-chat]'); if (ch) { e.stopPropagation(); return V.chat(ch.dataset.chat); }
    const acc = e.target.closest('[data-acc]'), dec = e.target.closest('[data-dec]');
    if (acc || dec) { const b = acc || dec; b.disabled = true; try { await api('POST', `/v1/friends/${b.dataset.acc || b.dataset.dec}/${acc ? 'accept' : 'decline'}`, {}); if (acc) toast('Vous êtes maintenant amis 🎉'); await realSyncFriends(); } catch (er) { toast(esc(er.message)); b.disabled = false; } return; }
    const f = e.target.closest('[data-f]'); if (f) V.friendSheet(f.dataset.f);
  });
  $('#add', el).onclick = () => V.addFriends(false);
  REAL.onFriends = () => { if (document.body.contains(el)) draw(); };
  draw(); realBadges(); realSyncFriends().catch(() => {});
};

// ---------- Fiche d'un ami ----------
const _friendSheetDemo = V.friendSheet;
V.friendSheet = (id) => {
  if (!realOn()) return _friendSheetDemo(id);
  const f = rFriend(id); if (!f) return;
  const s = rStatus(id), pos = s.here ? rPos(id) : null, m = pos ? rDist(pos) : null;
  const sb = openSheet(`<div style="display:flex;gap:14px;align-items:center"><img src="${av2URI(FRIEND_AV2[id] || { g: 'm' })}" alt="" style="height:118px;width:auto"><div style="flex:1;min-width:0"><h2 class="h2" style="overflow-wrap:anywhere">${esc(f.displayName)}</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><span class="pill ${s.cls}">${s.t}</span>${m ? `<span class="pill gray">${m} m · ${walkMin(m)} min</span><span class="pill gray">${esc(zoneOf(pos))}</span>` : ''}</div></div></div>
    ${pos && !s.live ? `<div class="card" style="background:#FFF7E8"><b style="font-size:14px">Position ancienne</b><div class="small">Dernière position connue : ${esc(zoneOf(pos))}, il y a ${fmtAge(rAgeMin(id))}. On n’invente jamais une position.</div></div>` : ''}
    ${!pos ? `<div class="card" style="background:#F3F5FB"><div class="small">${esc(f.displayName)} ne partage pas sa position sur ce lieu en ce moment. Tu peux lui écrire ou lui envoyer la tienne.</div></div>` : ''}
    ${pos ? `<div class="grid2"><button class="btn" id="join">${I.route.replace('<svg', '<svg width="18"')} Rejoindre</button><button class="btn dark" id="find">${I.locate.replace('<svg', '<svg width="18"')} Boussole</button></div>` : ''}
    <div class="grid2"><button class="btn white" id="msg">${I.chat.replace('<svg', '<svg width="18"')} Écrire</button><button class="btn white" id="here">📍 Viens ici !</button></div>
    <button class="link" id="rm" style="justify-content:flex-start;gap:8px;color:#C0392B">${I.trash.replace('<svg', '<svg width="18"')} Retirer de mes amis</button>`);
  $('#join', sb) && ($('#join', sb).onclick = () => { closeSheet(true); V.goTo(rPos(id), f.displayName); });
  $('#find', sb) && ($('#find', sb).onclick = () => V.findFriend(id));
  $('#msg', sb).onclick = () => V.chat(id);
  $('#here', sb).onclick = async () => { const b = $('#here', sb); b.disabled = true; try { await realSendLoc(id, 'meet'); closeSheet(); toast(`<img src="${fHead(id)}" alt="">${esc(f.displayName)} a reçu ta position avec l’itinéraire`); } catch (e) { toast(esc(e.message)); b.disabled = false; } };
  $('#rm', sb).onclick = () => { const s2 = openSheet(`<h2 class="h2">Retirer ${esc(f.displayName)} ?</h2><div class="small">Vous ne verrez plus vos positions et ne pourrez plus vous écrire. Tu pourras le rajouter plus tard.</div><button class="btn red" id="ok">Retirer de mes amis</button><button class="btn white" id="no">Annuler</button>`);
    $('#no', s2).onclick = () => closeSheet(); $('#ok', s2).onclick = async () => { $('#ok', s2).disabled = true; try { await api('DELETE', `/v1/friends/${id}`); delete REAL.pos[id]; delete FR_STATE[id]; closeSheet(true); toast(`${esc(f.displayName)} retiré de tes amis`); await realSyncFriends(); } catch (e) { toast(esc(e.message)); $('#ok', s2).disabled = false; } }; };
  if (MV && pos) MV.flyTo([pos[0], pos[1] + 7], Math.max(MV.s, .6));
};

// Boussole : distance réelle à la dernière position reçue, direction sur le plan (haut = haut de la carte).
const _findDemo = V.findFriend;
V.findFriend = (id) => {
  if (!realOn()) return _findDemo(id);
  const f = rFriend(id); if (!f || !rPos(id)) return toast('Position de ton ami indisponible pour l’instant');
  const col = (FRIENDS.find(x => x.id === id) || {}).col || '#4F6BF5';
  closeSheet(true);
  const el = mount(`${statusBar(true)}<div class="topbar"><button class="rb" id="bk" aria-label="Retour" style="background:rgba(255,255,255,.12);color:#fff">${I.back}</button><h1 style="color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Je cherche ${esc(f.displayName)}</h1><span style="width:44px"></span></div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;padding:0 20px">
      <div style="position:relative;width:250px;height:250px;border-radius:125px;border:2px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center">
        <svg id="arr" width="150" height="150" viewBox="0 0 24 24" style="transition:transform .35s"><path d="M12 2l7 19-7-4-7 4z" fill="${col}"/></svg>
        <img src="${fHead(id)}" alt="" style="position:absolute;top:-26px;width:52px;height:52px;border-radius:26px;border:3px solid ${col};background:#fff"></div>
      <b id="dd" style="font-size:54px;font-variant-numeric:tabular-nums;letter-spacing:-.02em">—</b><span id="hint" style="opacity:.8;text-align:center">La flèche indique sa direction sur le plan</span><span class="tiny" id="ag" style="color:rgba(255,255,255,.6)"></span></div>`, 'dark');
  const tk = () => { if (!document.body.contains(el)) { tickers.delete(tk); return; } const p = rPos(id); if (!p) return;
    const d = Math.max(1, Math.round(dist(ST.me.pos, p) * PCT_TO_M)), ang = Math.atan2(p[0] - ST.me.pos[0], -(p[1] - ST.me.pos[1])) * 180 / Math.PI;
    $('#arr', el).style.transform = `rotate(${ang.toFixed(0)}deg)`; $('#dd', el).textContent = d + ' m';
    $('#hint', el).textContent = d <= 3 ? `${f.displayName} est tout près de toi 👋` : 'La flèche indique sa direction sur le plan';
    const a = rAgeMin(id); $('#ag', el).textContent = a > 1 ? `Position reçue il y a ${fmtAge(a)}` : 'Position en direct'; };
  tickers.add(tk); tk();
  $('#bk', el).onclick = () => V.map();
};

// ---------- Discussions ----------
async function realSyncConvos() {
  if (!realOn()) return;
  const r = await api('GET', '/v1/conversations'); REAL.convList = r.conversations;
  ST.unread.by = {}; r.conversations.forEach(c => { if (c.unread && REAL.chatOpen !== c.friendId) ST.unread.by[c.friendId] = c.unread; });
  realBadges();
}
function realMyLoc(kind) {
  const p = ST.me.pos; const label = zoneOf(p);
  return { kind, body: kind === 'meet' ? `📍 Rejoins-moi ici · ${label}` : `📍 Ma position · ${label}`, loc: { x: +p[0].toFixed(2), y: +p[1].toFixed(2), floor: VENUE.id, label } };
}
async function realSendLoc(id, kind) { if (!ST.perms.loc) throw new Error('Active ta position pour l’envoyer.'); const m = realMyLoc(kind); return realSend(id, m.body, m.kind, m.loc); }
async function realSend(id, body, kind = 'text', loc = null) {
  const c = REAL.convos[id] = REAL.convos[id] || { msgs: [], loaded: false };
  const tmp = { id: 'tmp' + Date.now() + Math.random(), mine: true, kind, body, loc, at: new Date().toISOString(), pending: true };
  c.msgs.push(tmp); REAL.onChat && REAL.onChat(id);
  try { const r = await api('POST', '/v1/messages', { to: id, body, kind, loc }); tmp.pending = false; if (c.msgs.some(m => m.id === r.id)) c.msgs.splice(c.msgs.indexOf(tmp), 1); else tmp.id = r.id; tmp.at = r.at; }
  catch (e) { tmp.pending = false; tmp.failed = e.message; REAL.onChat && REAL.onChat(id); throw e; }
  REAL.onChat && REAL.onChat(id); realSyncConvos().catch(() => {});
}
// Message reçu en direct (passerelle temps réel).
function realOnMessage(msg) {
  if (!msg || !REAL.user) return;
  REAL.seen = REAL.seen || new Set(); if (REAL.seen.has(msg.id)) return; REAL.seen.add(msg.id);
  const mine = msg.from === REAL.user.id, other = mine ? msg.to : msg.from;
  const c = REAL.convos[other]; const m = { id: msg.id, mine, kind: msg.kind, body: msg.body, loc: msg.loc, at: msg.at };
  if (c && !c.msgs.some(x => x.id === msg.id)) { if (mine) { const t = c.msgs.find(x => x.pending && x.body === msg.body); if (t) { t.id = msg.id; t.pending = false; } else c.msgs.push(m); } else c.msgs.push(m); }
  if (!mine) {
    ST.bubbles[other] = { t: msg.body.length > 60 ? msg.body.slice(0, 57) + '…' : msg.body, at: ST.clock, v: VENUE.id };
    if (REAL.chatOpen === other) api('POST', `/v1/messages/${other}/read`, {}).catch(() => {});
    else { ST.unread.by[other] = (ST.unread.by[other] || 0) + 1; const f = rFriend(other); showPush({ title: esc(f ? f.displayName : 'Nouveau message'), text: esc(msg.body.length > 140 ? msg.body.slice(0, 137) + '…' : msg.body), icon: fHead(other), onTap: () => V.chat(other) }); }
    emit();
  }
  REAL.onChat && REAL.onChat(other); realBadges();
  if (REAL.onConvos) realSyncConvos().then(() => REAL.onConvos && REAL.onConvos()).catch(() => {});
}

const _chatListDemo = V.chatList;
V.chatList = () => {
  if (!realOn()) return _chatListDemo();
  const el = mount(`${statusBar()}<div class="topbar"><h1 class="left" style="font-size:28px;font-weight:800">Discussions</h1><button class="rb" id="new" aria-label="Nouvelle discussion">${I.plus}</button></div><div class="body" id="cl" style="padding-bottom:110px"></div>${navBar('chat')}`);
  wireNav(el); el.dataset.real = 'chats';
  const prev = (l) => l.kind === 'text' ? esc(l.body) : '📍 ' + (l.kind === 'meet' ? 'Rejoins-moi ici' : 'Position partagée');
  const draw = () => {
    const cl = $('#cl', el), conv = (REAL.convList || []).filter(c => rFriend(c.friendId)), withC = new Set(conv.map(c => c.friendId));
    const others = rAccepted().filter(f => !withC.has(f.id));
    cl.innerHTML = (conv.length ? `<div class="list">${conv.map(c => { const f = rFriend(c.friendId), un = ST.unread.by[c.friendId] || 0; return `<button class="row" data-c="${f.id}"><img class="av" src="${fHead(f.id)}" alt=""><div class="grow" style="min-width:0"><div class="t">${esc(f.displayName)}</div><div class="s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${un ? 'color:var(--ink);font-weight:700' : ''}">${c.last.mine ? 'Toi : ' : ''}${prev(c.last)}</div></div><span style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="tiny">${fmtTime(c.last.at)}</span>${un ? `<span class="badge" style="position:static">${un}</span>` : ''}</span></button>`; }).join('')}</div>` : '')
      + (others.length ? `<div class="sec">${conv.length ? 'Démarrer une discussion' : 'Écris à un ami'}</div><div class="list">${others.map(f => `<button class="row" data-c="${f.id}"><img class="av" src="${fHead(f.id)}" alt=""><div class="grow"><div class="t">${esc(f.displayName)}</div><div class="s">${rStatus(f.id).t}</div></div>${I.chat}</button>`).join('')}</div>` : '')
      || (REAL.convList === null ? `<div class="small" style="text-align:center;padding:30px">Chargement…</div>` : `<div class="card" style="align-items:center;text-align:center;gap:10px"><img src="${A}av/7_happy.webp" alt="" style="width:78%;max-width:260px"><b style="font-size:17px">Pas encore de discussion</b><span class="small">Ajoute des amis pour leur écrire et partager ta position en un geste.</span><button class="btn" id="add2">Ajouter des amis</button></div>`);
    $('#add2', cl) && ($('#add2', cl).onclick = () => V.addFriends(false));
  };
  el.addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (c) V.chat(c.dataset.c); });
  $('#new', el).onclick = () => { const acc = rAccepted(); if (!acc.length) return V.addFriends(false); const sb = openSheet(`<h2 class="h2">Écrire à…</h2><div class="list">${acc.map(f => `<button class="row" data-p="${f.id}"><img class="av" src="${fHead(f.id)}" alt=""><div class="grow"><div class="t">${esc(f.displayName)}</div></div></button>`).join('')}</div>`); sb.onclick = e => { const p = e.target.closest('[data-p]'); if (p) V.chat(p.dataset.p); }; };
  REAL.onConvos = () => { if (document.body.contains(el)) draw(); else REAL.onConvos = null; };
  draw(); realSyncConvos().then(draw).catch(e => { if (REAL.convList === null) { REAL.convList = []; draw(); toast(esc(e.message)); } });
};

const _chatDemo = V.chat;
V.chat = (id) => {
  if (!realOn()) return _chatDemo(id);
  const f = rFriend(id); if (!f) { toast('Discussion indisponible : vous n’êtes plus amis'); return; }
  closeSheet(true); REAL.chatOpen = id; delete ST.unread.by[id]; realBadges();
  const c = REAL.convos[id] = REAL.convos[id] || { msgs: [], loaded: false };
  const el = mount(`${statusBar()}<div class="topbar chathead" style="background:#fff;border-bottom:1px solid var(--line)"><button class="rb ghost" id="bk" aria-label="Retour">${I.back}</button><img class="av sm" src="${fHead(id)}" alt=""><button id="who" style="flex:1;min-width:0;text-align:left;background:none;border:0;padding:0;color:inherit"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.displayName)}</b><div class="tiny" id="st">${rStatus(id).t}</div></button></div>
    <div class="msgs" id="ms"></div>
    <div class="chips quick" style="padding:6px 12px;background:#F7F7F9;flex-wrap:nowrap;overflow-x:auto" id="qr"><button class="chip" data-k="loc">📍 Ma position</button><button class="chip" data-k="meet">🙋 Rejoins-moi ici</button>${['On se retrouve où ?', 'J’arrive', 'Je suis au bar'].map(q => `<button class="chip" data-q="${q}">${q}</button>`).join('')}</div>
    <div class="composer"><input class="inp" id="tx" placeholder="Message" autocomplete="off" enterkeyhint="send" maxlength="1000" aria-label="Message"><button class="rb" id="snd" aria-label="Envoyer" style="background:var(--pri);color:#fff">${I.send}</button></div>`);
  el.dataset.real = 'chat';
  const ms = $('#ms', el);
  const bubble = (m) => {
    const st = m.failed ? `<div class="tiny" style="color:#C0392B;text-align:right">Non envoyé · <button class="link" data-retry="${m.id}" style="display:inline;min-height:0;padding:0;font-size:inherit">Réessayer</button></div>` : m.pending ? '<div class="tiny" style="text-align:right;opacity:.6">Envoi…</div>' : '';
    if (m.kind !== 'text' && m.loc) { const L = m.loc, same = !L.floor || L.floor === VENUE.id;
      return `<div class="locmsg" style="align-self:${m.mine ? 'flex-end' : 'flex-start'}"><div class="lm" style="background-position:${L.x}% ${L.y}%"><span style="position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px;border-radius:8px;background:${m.mine ? 'var(--pri)' : '#FF6B4A'};border:3px solid #fff;box-shadow:0 0 0 6px rgba(79,107,245,.25)"></span></div><div style="padding:8px 12px"><b style="font-size:14px">${m.kind === 'meet' ? '🙋 Rejoins-moi ici' : '📍 Position partagée'}</b><div class="small">${esc(L.label || '')} · ${fmtTime(m.at)}</div>${!m.mine && same ? `<button class="btn sm" data-go="${L.x},${L.y}" style="margin-top:8px">Y aller</button>` : ''}</div></div>${st}`; }
    return `<div class="bub ${m.mine ? 'me' : 'them'}" title="${fmtTime(m.at)}">${esc(m.body)}</div>${st}`;
  };
  const draw = (stick = true) => { const atBottom = ms.scrollHeight - ms.scrollTop - ms.clientHeight < 80;
    ms.innerHTML = !c.loaded && !c.msgs.length ? '<div class="small" style="text-align:center;margin:auto">Chargement…</div>' : c.msgs.length ? c.msgs.map(bubble).join('') : `<div class="small" style="text-align:center;margin:auto;max-width:260px">Dis bonjour à ${esc(f.displayName)} 👋<br>Tu peux aussi lui envoyer ta position en un geste.</div>`;
    if (stick || atBottom) ms.scrollTop = ms.scrollHeight; };
  const send = async (body, kind, loc) => { try { await (kind ? realSendLoc(id, kind) : realSend(id, body)); } catch (e) { toast(esc(e.message)); } };
  $('#snd', el).onclick = () => { const v = $('#tx', el).value.trim(); if (!v) return $('#tx', el).focus(); $('#tx', el).value = ''; send(v); $('#tx', el).focus(); };
  $('#tx', el).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#snd', el).click(); } };
  $('#qr', el).onclick = e => { const q = e.target.closest('[data-q]'), k = e.target.closest('[data-k]'); if (q) send(q.dataset.q); if (k) send(null, k.dataset.k); };
  ms.onclick = e => { const g = e.target.closest('[data-go]'); if (g) { const [x, y] = g.dataset.go.split(',').map(Number); V.goTo([x, y], f.displayName); return; }
    const r = e.target.closest('[data-retry]'); if (r) { const m = c.msgs.find(x => String(x.id) === r.dataset.retry); if (m) { c.msgs.splice(c.msgs.indexOf(m), 1); m.kind === 'text' ? send(m.body) : realSend(id, m.body, m.kind, m.loc).catch(er => toast(esc(er.message))); } } };
  $('#bk', el).onclick = () => { REAL.chatOpen = null; V.chatList(); };
  $('#who', el).onclick = () => V.friendSheet(id);
  REAL.onChat = (fid) => { if (!document.body.contains(el)) { if (REAL.chatOpen === id) REAL.chatOpen = null; return; } if (fid === id) draw(false); };
  draw();
  api('GET', `/v1/messages/${id}?limit=100`).then(r => { const ids = new Set(r.messages.map(m => m.id)), maxId = r.messages.reduce((a, m) => Math.max(a, m.id), 0); c.msgs = r.messages.concat(c.msgs.filter(m => !ids.has(m.id) && (m.pending || m.failed || typeof m.id !== 'number' || m.id > maxId))); c.loaded = true; draw(); api('POST', `/v1/messages/${id}/read`, {}).then(() => { delete ST.unread.by[id]; realBadges(); }).catch(() => {}); })
    .catch(e => { c.loaded = true; draw(); toast(esc(e.message)); });
};
// Quitter l'écran de discussion (navigation) : la discussion n'est plus « ouverte ».
const _mount2 = mount; mount = function (html, cls) { const el = _mount2(html, cls); if (REAL.chatOpen && !/id="ms"/.test(html)) REAL.chatOpen = null; return el; };

// Profil réel : le prénom se modifie sur le serveur (tes amis le voient aussitôt).
const _editProfileDemo = V.editProfile;
V.editProfile = () => {
  if (!realOn()) return _editProfileDemo();
  const sb = openSheet(`<h2 class="h2">Modifier le profil</h2>
    <div style="display:flex;gap:14px;align-items:center"><img src="${meHead()}" alt="" style="width:64px;height:64px;border-radius:32px;background:#EEF2FF"><button class="btn white sm" id="av" style="width:auto;padding:0 16px">Modifier mon avatar</button></div>
    <div class="field"><label for="pn">Prénom (affiché à tes amis)</label><input class="inp" id="pn" value="${esc(REAL.user.displayName || '')}" maxlength="40" autocomplete="given-name"></div>
    <div class="small" id="er" style="color:#C0392B" hidden></div><button class="btn" id="ok">Enregistrer</button>`);
  $('#av', sb).onclick = () => { closeSheet(true); V.avatarEditor(() => V.settings()); };
  $('#ok', sb).onclick = async () => { const v = $('#pn', sb).value.trim(), er = $('#er', sb); if (!v) { $('#pn', sb).focus(); return; } $('#ok', sb).disabled = true;
    try { const r = await api('PATCH', '/v1/me', { displayName: v }); REAL.user = r && r.id ? { ...r, displayName: safeName(r.displayName), avatar: safeAvatar(r.avatar) } : { ...REAL.user, displayName: v }; realApplyUser(); realSave(); closeSheet(true); V.settings(); toast('Profil mis à jour'); }
    catch (e) { er.hidden = false; er.textContent = e.message; $('#ok', sb).disabled = false; } };
};
