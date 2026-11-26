// ===== Avatar vivant : il danse quand tu danses, bâille en fin de nuit, s'endort quand la batterie lâche, brille près de tes amis, passe en néon la nuit =====
const LIVE = (() => { let o = {}; try { o = JSON.parse(localStorage.getItem('oneera.live') || '{}'); } catch (_) {} return {
  on: o.on !== false, neon: o.neon !== false, share: o.share !== false, // réglages (sur ce téléphone)
  act: 'still', energy: 0, bat: null, charging: false, src: null, sim: {}, // état mesuré (et simulation en mode test)
  hist: [], danceSince: 0, calmSince: 0 }; })();
const liveSave = () => { try { localStorage.setItem('oneera.live', JSON.stringify({ on: LIVE.on, neon: LIVE.neon, share: LIVE.share })); } catch (_) {} };
const liveAct = () => LIVE.sim.act || LIVE.act;
const liveBat = () => LIVE.sim.bat != null ? LIVE.sim.bat : LIVE.bat == null ? null : Math.round(LIVE.bat);
let _liveT = 0;
function liveChanged() { clearTimeout(_liveT); _liveT = setTimeout(() => { try { emit(); } catch (_) {} }, 250); }

// ---------- capteurs : l'app native envoie l'énergie du mouvement (accéléromètre) et la batterie ----------
const _nativeIn = window.__oneeraNative;
window.__oneeraNative = (m) => {
  if (m && m.type === 'motion' && typeof m.energy === 'number') { LIVE.src = 'native'; liveMotion(m.energy); return; }
  if (m && m.type === 'battery' && typeof m.level === 'number') { const b = Math.max(0, Math.min(100, m.level <= 1 ? m.level * 100 : m.level)); const ch = !!m.charging; if (Math.round(b) !== Math.round(LIVE.bat ?? -1) || ch !== LIVE.charging) { LIVE.bat = b; LIVE.charging = ch; liveChanged(); } return; }
  return _nativeIn && _nativeIn(m);
};
// navigateur (Android / tests) : accéléromètre web si disponible
(() => { let buf = [], last = 0;
  addEventListener('devicemotion', (e) => { if (LIVE.src === 'native') return; const a = e.accelerationIncludingGravity; if (!a || a.x == null) return; buf.push(Math.hypot(a.x, a.y, a.z) / 9.81); const t = performance.now();
    if (t - last > 2000) { last = t; const n = buf.length; if (n > 10) { const mu = buf.reduce((x, y) => x + y, 0) / n; const sd = Math.sqrt(buf.reduce((x, y) => x + (y - mu) ** 2, 0) / n); LIVE.src = LIVE.src || 'web'; liveMotion(sd); } buf = []; } });
})();
// Classification : énergie forte sans se déplacer = danse ; énergie moyenne ou déplacement = marche ; sinon immobile (avec hystérésis).
function liveMotion(energy) {
  LIVE.energy = energy; const now = Date.now(), p = ST.me && ST.me.pos ? ST.me.pos : [0, 0];
  LIVE.hist.push({ t: now, p: [...p] }); LIVE.hist = LIVE.hist.filter(h => now - h.t < 12000);
  const moved = LIVE.hist.length > 1 ? Math.hypot(p[0] - LIVE.hist[0].p[0], p[1] - LIVE.hist[0].p[1]) * PCT_TO_M : 0;
  let act = LIVE.act;
  if (energy > .28 && moved < 6) { if (!LIVE.danceSince) LIVE.danceSince = now; if (now - LIVE.danceSince > 3500) act = 'dance'; LIVE.calmSince = 0; }
  else { LIVE.danceSince = 0; if (act === 'dance') { if (!LIVE.calmSince) LIVE.calmSince = now; if (now - LIVE.calmSince > 6000) act = moved > 4 || energy > .1 ? 'walk' : 'still'; } else act = moved > 4 || energy > .12 ? 'walk' : 'still'; }
  if (act !== LIVE.act) { LIVE.act = act; liveChanged(); }
}

// ---------- état affiché d'une personne (moi ou un ami) ----------
const liveHour = () => { if (typeof realOn === 'function' && realOn()) { if (LIVE.sim.hour != null) return LIVE.sim.hour; const d = new Date(); return d.getHours() + d.getMinutes() / 60; } return ((ST.clock % 1440) + 1440) % 1440 / 60; };
function liveStateOf(id, me) {
  if (!LIVE.on) return {};
  const h = liveHour(), night = h >= 21.5 || h < 6.5, sleepy = h >= 4.5 && h < 7.5;
  let act, bat, near = false;
  if (me) { act = liveAct(); bat = liveBat(); if (LIVE.charging && LIVE.sim.bat == null) bat = null; }
  else if (typeof realOn === 'function' && realOn()) { const l = REAL.live[id]; if (l && Date.now() - l.t < 120000) { act = l.act; bat = l.bat; } }
  else { const f = FRIENDS.find(x => x.id === id), s = FR_STATE[id]; if (f && s && s.pos) { const z = zoneOf(s.pos); act = /Fosse|scène|Scène|Dancefloor|piste/i.test(z) && !f.stale ? 'dance' : 'walk'; bat = f.bat; } }
  // proche d'un ami (< 20 m, positions fraîches)
  const myPos = ST.me && ST.me.pos, pos = me ? null : (FR_STATE[id] && FR_STATE[id].pos);
  if (myPos) {
    if (me) near = FRIENDS.some(f => !f.stale && FR_STATE[f.id] && FR_STATE[f.id].pos && ST.friends.includes(f.id) && dist(myPos, FR_STATE[f.id].pos) * PCT_TO_M < 20);
    else { const f = FRIENDS.find(x => x.id === id); near = !!(pos && f && !f.stale && dist(myPos, pos) * PCT_TO_M < 20); }
  }
  const low = bat != null && bat <= 10;
  return { dance: act === 'dance' && !low, sleep: low, yawn: sleepy && act !== 'dance' && !low, near, neon: LIVE.neon && (night || (typeof nightMap !== 'undefined' && nightMap)) };
}
// configuration d'avatar « vivante » à partir de l'état
function liveCfg(cfg, st) {
  if (!cfg) return cfg; const c = { ...cfg }; const fx = [];
  if (st.dance) { c.pose = 'dance'; if (!c.mood || c.mood === 'none' || c.mood === 'sleep' || c.mood === 'yawn') c.mood = 'laugh'; }
  else if (st.sleep) { c.mood = 'sleep'; c.pose = 'relax'; }
  else if (st.yawn) c.mood = 'yawn';
  if (st.neon) fx.push('neon'); if (st.near) fx.push('glow');
  if (fx.length) c._fx = fx.join(' ');
  return c;
}
// marqueurs de la carte : avatar vivant + animation (danse, respiration lente, Zzz, halo)
const _pmLive = personMarker;
personMarker = function (id, name, head, at, o = {}) {
  const m = _pmLive(id, name, head, at, o);
  const base = o.me ? myAv2() : FRIEND_AV2[id];
  if (!base || typeof m.html !== 'string' || !m.html.includes('bodyimg')) return m;
  const st = liveStateOf(id, !!o.me); const cls = [st.dance && 'lv-dance', st.sleep && 'lv-sleep', st.yawn && 'lv-yawn', st.near && 'lv-near', st.neon && 'lv-neon'].filter(Boolean);
  if (!cls.length) return m;
  m.html = m.html.replace(/class="bodyimg( av2)?" src="[^"]*"/, `class="bodyimg av2" src="${av2URI(liveCfg(base, st))}"`)
    .replace(/class="fr( fullb)?"/, (x) => x.replace(/"$/, ' ' + cls.join(' ') + '"'))
    .replace(/(<img class="bodyimg)/, (st.sleep ? '<span class="lvZ" aria-hidden="true">z<b>z</b><i>z</i></span>' : st.dance ? '<span class="lvNotes" aria-hidden="true">♪<b>♫</b></span>' : '') + '$1');
  return m;
};
// rafraîchir la carte quand l'heure fait basculer bâillement / néon (toutes les minutes)
setInterval(() => { const k = JSON.stringify(liveStateOf('me', true)); if (k !== LIVE._lastMe) { LIVE._lastMe = k; liveChanged(); } }, 60000);
tickers.add(() => { if (!LIVE._tick || Date.now() - LIVE._tick > 5000) { LIVE._tick = Date.now(); const k = JSON.stringify([liveStateOf('me', true), ...ST.friends.map(id => liveStateOf(id, false))]); if (k !== LIVE._lastAll) { LIVE._lastAll = k; liveChanged(); } } });

// ---------- réglages et simulation (mode test) ----------
V.liveSettings = () => {
  const s = liveStateOf('me', true), test = typeof REAL !== 'undefined' && REAL.testMap;
  const row = (k, t, d, on) => `<button class="row" data-lv="${k}"><div class="grow"><div class="t">${t}</div><div class="s">${d}</div></div><span class="tog ${on ? 'on' : ''}"></span></button>`;
  const sb = openSheet(`<h2 class="h2">Avatar vivant</h2><div class="small" style="margin-top:-6px">Ton avatar réagit à ta soirée sur la carte : il danse quand tu danses, bâille en fin de nuit, s’endort si ta batterie lâche, brille quand un ami est à moins de 20 m.</div>
    <div class="list">${row('on', 'Avatar vivant', 'Animations et humeurs automatiques', LIVE.on)}${row('neon', 'Mode néon la nuit', 'Contours fluo de 21 h 30 à 6 h 30', LIVE.neon)}${row('share', 'Montrer à mes amis', 'Ils voient quand tu danses et si ta batterie est faible', LIVE.share)}</div>
    <div class="tiny">Maintenant : ${s.dance ? 'tu danses 🕺' : s.sleep ? 'batterie faible 😴' : s.yawn ? 'fin de nuit 🥱' : LIVE.act === 'walk' ? 'tu marches' : 'au calme'}${liveBat() != null ? ` · batterie ${liveBat()} %` : ''}${LIVE.src ? '' : ' · capteur de mouvement non disponible ici'}</div>
    ${test ? `<div class="sec">Tester (mode test)</div><div class="chips" id="sim" style="flex-wrap:wrap">${[['dance', '🕺 Je danse'], ['bat', '🪫 Batterie 6 %'], ['hour', '🌅 5 h du matin'], ['night', '🌙 23 h'], ['reset', 'Réel']].map(([k, n]) => `<button class="chip ${k === 'dance' && LIVE.sim.act === 'dance' || k === 'bat' && LIVE.sim.bat != null || k === 'hour' && LIVE.sim.hour === 5 || k === 'night' && LIVE.sim.hour === 23 ? 'on' : ''}" data-sim="${k}">${n}</button>`).join('')}</div>` : ''}`);
  sb.onclick = (e) => { const r = e.target.closest('[data-lv]'), sm = e.target.closest('[data-sim]');
    if (r) { const k = r.dataset.lv; LIVE[k] = !LIVE[k]; liveSave(); r.querySelector('.tog').classList.toggle('on', LIVE[k]); liveChanged(); }
    if (sm) { const k = sm.dataset.sim; if (k === 'dance') LIVE.sim.act = LIVE.sim.act === 'dance' ? null : 'dance'; if (k === 'bat') LIVE.sim.bat = LIVE.sim.bat != null ? null : 6; if (k === 'hour') LIVE.sim.hour = LIVE.sim.hour === 5 ? null : 5; if (k === 'night') LIVE.sim.hour = LIVE.sim.hour === 23 ? null : 23; if (k === 'reset') LIVE.sim = {};
      if (typeof REAL !== 'undefined' && REAL.lastSent) REAL.lastSent.t = 0; liveChanged(); V.liveSettings(); } };
};

// ---------- humeur rapide depuis la fiche « Moi » ----------
function realSaveAvatar() { try { emit(); } catch (_) {} if (typeof realOn === 'function' && realOn() && ST.me.av2) api('PATCH', '/v1/me', { avatar: ST.me.av2 }).then(u => { REAL.user = u; realSave(); }).catch(e => toast(esc(e.message))); }
const moodChips = () => `<div class="sec" style="margin-top:4px">Mon humeur</div><div class="chips" id="mood" style="flex-wrap:nowrap;overflow-x:auto">${[['none', '🙂'], ['laugh', '😂'], ['wink', '😉'], ['love', '😍'], ['wow', '😮'], ['cool', '😎'], ['yawn', '🥱']].map(([k, e]) => `<button class="chip ${(myAv2().mood || 'none') === k ? 'on' : ''}" data-m="${k}" aria-label="${(AV2.mood.find(x => x[0] === k) || [])[1] || k}" style="font-size:20px;padding:6px 10px">${e}</button>`).join('')}</div>`;
const _meSheetLive = V.meSheet;
V.meSheet = () => { _meSheetLive(); const sb = $('.sheet .sbody'); if (!sb || $('#mood', sb)) return;
  const h = sb.querySelector('.btn'); (h || sb.lastElementChild).insertAdjacentHTML('beforebegin', moodChips() + `<button class="row" id="lvs" style="background:#F3F5FB;border-radius:14px"><div class="grow"><div class="t">Avatar vivant ✨</div><div class="s">${LIVE.on ? 'Activé' : 'Désactivé'} · danse, néon, humeurs</div></div></button>`);
  $('#mood', sb).onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; myAv2().mood = b.dataset.m; $$('#mood .chip', sb).forEach(c => c.classList.toggle('on', c === b)); const im = sb.querySelector('img'); if (im) im.src = meHead(); realSaveAvatar(); };
  $('#lvs', sb).onclick = V.liveSettings; };

// ---------- stickers du chat : ton avatar + une légende ----------
const STICKERS = { arrive: ['J’arrive !', { pose: 'wave', mood: 'wink' }], bar: ['Je suis au bar 🍹', { pose: 'relax', mood: 'laugh' }], ouestu: ['Où t’es ??', { pose: 'relax', mood: 'wow' }],
  danse: ['On danse !', { pose: 'dance', mood: 'laugh', jewel: ['glowstick'] }], scene: ['Devant la scène 🔥', { pose: 'dance', mood: 'wow' }], top: ['Trop bien !', { pose: 'dance', mood: 'love' }],
  love: ['Je t’adore ❤️', { pose: 'relax', mood: 'love' }], merci: ['Merci !', { pose: 'wave', mood: 'laugh' }], retard: ['J’ai du retard…', { pose: 'relax', mood: 'cool' }], dodo: ['Je rentre 😴', { pose: 'relax', mood: 'sleep' }] };
const stickerCap = (id) => (STICKERS[id] || ['Sticker'])[0];
function stickerHTML(cfg, id, mine) { const s = STICKERS[id]; if (!s) return `<div class="bub ${mine ? 'me' : 'them'}">🎨</div>`;
  const c = { ...(cfg || { g: 'm' }), ...s[1], jewel: [...new Set([...((cfg && cfg.jewel) || []).filter(j => j !== 'glowstick'), ...(s[1].jewel || [])])] };
  return `<div class="stk ${mine ? 'me' : 'them'}"><img src="${av2URI(c, 'bust')}" alt=""><b>${esc(s[0])}</b></div>`; }
function stickerTray(onPick) {
  const sb = openSheet(`<h2 class="h2">Stickers</h2><div class="small" style="margin-top:-6px">Avec ton avatar, en un geste.</div><div class="stkGrid">${Object.keys(STICKERS).map(k => `<button data-s="${k}" aria-label="${esc(stickerCap(k))}">${stickerHTML(myAv2(), k, true)}</button>`).join('')}</div>`);
  sb.onclick = (e) => { const b = e.target.closest('[data-s]'); if (b) { closeSheet(true); onPick(b.dataset.s); } };
}
