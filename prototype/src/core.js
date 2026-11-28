// ===== Noyau : état partagé, outils UI, graphe de circulation =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const SV = d => `<svg viewBox="0 0 24 24" ${P} aria-hidden="true">${d}</svg>`;
// Boussole + vue 2D/3D, partagées par les cartes visiteur et staff
function viewCtl() { return `<button id="cmp" class="cmp" aria-label="Revenir au nord" title="Revenir au nord" hidden><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2.5 15.2 12H8.8Z" fill="#E5484D"/><path d="M12 21.5 8.8 12h6.4Z" fill="#B9BCCB"/><circle cx="12" cy="12" r="1.6" fill="#fff"/></svg></button><button id="d3" aria-label="Vue inclinée 3D" aria-pressed="${ST.map3d ? 'true' : 'false'}" style="font-weight:900;font-size:14px;letter-spacing:-.3px">${ST.map3d ? '2D' : '3D'}</button>`; }
function wireViewCtl(el, mv) {
  const cmp = $('#cmp', el), d3 = $('#d3', el); if (!cmp || !d3) return;
  mv.onView = m => { cmp.hidden = Math.abs(m.rot) < .02; cmp.firstChild.style.transform = `rotate(${m.rot}rad)`; };
  cmp.onclick = () => mv.north(); mv.set3d(!!ST.map3d); if (ST.map3d) mv.tilt = 1;
  d3.onclick = () => { ST.map3d = !ST.map3d; mv.set3d(ST.map3d); d3.textContent = ST.map3d ? '2D' : '3D'; d3.setAttribute('aria-pressed', ST.map3d ? 'true' : 'false'); d3.setAttribute('aria-label', ST.map3d ? 'Vue à plat 2D' : 'Vue inclinée 3D'); toast(ST.map3d ? 'Vue inclinée : fais glisser à deux doigts pour tourner' : 'Vue à plat'); };
}
const I = {
  back: SV('<path d="M15 18l-6-6 6-6"/>'), close: SV('<path d="M18 6L6 18M6 6l12 12"/>'), check: SV('<path d="M20 6L9 17l-5-5"/>'),
  search: SV('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'), bell: SV('<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/>'),
  map: SV('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'), users: SV('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>'),
  chat: SV('<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'), gear: SV('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>'),
  plus: SV('<path d="M12 5v14M5 12h14"/>'), minus: SV('<path d="M5 12h14"/>'), locate: SV('<path d="M3 11l19-9-9 19-2-8-8-2z"/>'), layers: SV('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>'),
  shield: SV('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>'), user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
  hanger: SV('<path d="M12 6a2 2 0 112 2c-1 .5-2 1-2 2v1l9 6a1 1 0 01-.6 1.8H3.6A1 1 0 013 17l9-6"/>'), glasses: SV('<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M10 15h4M2 15l1-6M22 15l-1-6"/>'),
  dice: SV('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'), reset: SV('<path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 102.1-9.4L1 10"/>'),
  share: SV('<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>'), qr: SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
  phone: SV('<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z"/>'),
  send: SV('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>'), pin: SV('<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>'), clock: SV('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  eye: SV('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'), eyeOff: SV('<path d="M17.9 17.9A10 10 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.1-5.9M9.9 4.2A9 9 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.2 3.2M1 1l22 22"/>'),
  heart: SV('<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>'), star: SV('<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
  walk: SV('<circle cx="13" cy="4" r="2"/><path d="M10 22l2-7 3 3v6M7 13l2-4 4 1 3 3M9 9l-2 4"/>'), alert: SV('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'),
  battery: SV('<rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 13v-2"/>'), wifi: SV('<path d="M5 12.6a10 10 0 0114 0M8.5 16.1a5 5 0 017 0M12 20h.01M1.4 9a16 16 0 0121.2 0"/>'),
  bt: SV('<path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"/>'), contacts: SV('<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17a4 4 0 018 0"/>'),
  link: SV('<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>'), more: SV('<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'),
  play: SV('<path d="M6 4l14 8-14 8z" fill="currentColor"/>'), pause: SV('<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/>'), mic: SV('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 19v3"/>'),
  camera: SV('<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>'), lock: SV('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'),
  download: SV('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>'), trash: SV('<path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>'),
  flag: SV('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>'), block: SV('<circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/>'), logout: SV('<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>'),
  sparkle: SV('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>'), scissors: SV('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>'),
  smile: SV('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>'), body: SV('<circle cx="12" cy="4" r="2"/><path d="M12 6v8M8 22l4-8 4 8M5 10h14"/>'), shirt: SV('<path d="M20.4 3.5L16 2a4 4 0 01-8 0L3.6 3.5a2 2 0 00-1.3 2.2l.6 3.5A1 1 0 004 10h2v10a2 2 0 002 2h8a2 2 0 002-2V10h2a1 1 0 001-.9l.6-3.5a2 2 0 00-1.3-2.1z"/>'),
  ring: SV('<circle cx="12" cy="15" r="6"/><path d="M9 4h6l-3 5z"/>'), hat: SV('<path d="M3 17h18M6 17c0-6 2-10 6-10s6 4 6 10"/>'), crowd: SV('<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M2 20a5 5 0 0110 0M12 20a5 5 0 0110 0"/>'),
  route: SV('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/>'), grid: SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
  ticket: SV('<path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2z"/><path d="M13 5v2M13 17v2M13 11v2"/>'),
  chart: SV('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>'), fire: SV('<path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z"/>'), flow: SV('<path d="M3 7h12l-3-3M21 17H9l3 3"/>'),
  home: SV('<path d="M3 10l9-7 9 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'), cal: SV('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'), megaphone: SV('<path d="M3 11v2a2 2 0 002 2h2l6 4V5L7 9H5a2 2 0 00-2 2zM17 8a5 5 0 010 8"/>'),
  beacon: SV('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 010 8.4M7.8 16.2a6 6 0 010-8.4M19 5a10 10 0 010 14M5 19A10 10 0 015 5"/>'), handshake: SV('<path d="M11 17l2 2a1 1 0 003-3M14 14l2.5 2.5a1 1 0 003-3l-3.9-3.9a2 2 0 00-2.8 0l-.9.9a1 1 0 01-3-3l2.8-2.8a5 5 0 016.4-.5l.6.4M2 12l5 5M22 12l-4-4"/>'),
  replay: SV('<path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.7L3 8"/><path d="M3 3v5h5M10 9l5 3-5 3z"/>'), compare: SV('<path d="M18 21V3M6 21V3M3 7l3-4 3 4M15 17l3 4 3-4"/>'), menu: SV('<path d="M3 6h18M3 12h18M3 18h18"/>')
};

// ---------- état partagé (visiteur, staff, organisateur lisent le même état) ----------
const ST = {
  me: { pseudo: '', first: 'Alex', base: 'lins', skin: 1, top: null, topColor: 0, glasses: null, age: null, node: 'F', pos: [50, 63] },
  account: null, perms: { loc: null, always: false, bt: null, notif: null, motion: null, contacts: null, stats: false },
  friends: [], pending: [{ id: 'maya', n: 'Maya D.', h: 'group_21' }], sharing: { mode: 'event', who: 'friends', ghost: false },
  reports: [], ruptures: {}, rdv: null, notifs: [], unread: { by: { lea: 1, ines: 1 }, notif: 0 }, pushQueue: [], offline: false, night: true, ended: false,
  convos: {
    lea: [{ me: 0, t: 'T’es où ?? 😅' }, { me: 0, t: 'On est devant la scène, Kalia joue 🔥' }],
    ines: [{ me: 0, t: 'Je vais au bar ouest, je prends quoi ?' }]
  },
  os: 'ios', favs: { 'Kalia b2b Remo': true }, metrics: { taps: 0, start: null, steps: {} }, log: [], role: 'visitor', clock: 23 * 60 + 42
};
const listeners = new Set();
const emit = () => listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });

// ---------- chrono du parcours d'arrivée ----------
const STEP_NAMES = [['qr', 'QR scanné'], ['install', 'Carte ouverte (App Clip)'], ['account', 'Compte créé'], ['avatar', 'Avatar choisi'], ['perms', 'Autorisations'], ['friends', 'Amis ajoutés'], ['map', 'Carte + amis visibles']];
function markStep(k) {
  const m = ST.metrics; if (!m.start && k === 'qr') m.start = performance.now();
  if (m.start && !m.steps[k]) { m.steps[k] = { t: (performance.now() - m.start) / 1000, taps: m.taps }; logEv('Étape : ' + STEP_NAMES.find(s => s[0] === k)[1]); }
  emit();
}
function logEv(t) { const c = ST.clock; ST.log.push(fmtClock(c) + ' · ' + t); if (ST.log.length > 80) ST.log.shift(); }
document.addEventListener('pointerdown', e => { if (e.target.closest('#screen') && ST.metrics.start && !ST.metrics.steps.map) ST.metrics.taps++; }, true);

function fmtClock(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

// ---------- graphe de circulation (A*) ----------
function edgePair(e) { return e.includes('-') ? e.split('-') : [e[0], e.slice(1)]; }
let ADJ = {};
function buildGraph() { ADJ = {}; EDGES.forEach(e => { const [a, b] = edgePair(e); (ADJ[a] = ADJ[a] || []).push(b); (ADJ[b] = ADJ[b] || []).push(a); }); }

let MAP_ASPECT = 3000 / 1891; // rapport largeur/hauteur du plan courant
const dist = (a, b) => Math.hypot((a[0] - b[0]) * MAP_ASPECT, a[1] - b[1]);
function nearestNode(p) { let best = null, bd = 1e9; for (const k in NODES) { const d = dist(NODES[k], p); if (d < bd) { bd = d; best = k; } } return best; }
function route(from, to) {
  const open = new Set([from]), g = { [from]: 0 }, prev = {};
  while (open.size) {
    let cur = null, cf = 1e9; open.forEach(n => { const f = g[n] + dist(NODES[n], NODES[to]); if (f < cf) { cf = f; cur = n; } });
    if (cur === to) { const p = [to]; while (prev[p[0]]) p.unshift(prev[p[0]]); return p; }
    open.delete(cur);
    for (const nb of ADJ[cur] || []) { if (RESTRICTED.has(nb) && nb !== to && !RESTRICTED.has(from)) continue; const ng = g[cur] + dist(NODES[cur], NODES[nb]); if (g[nb] === undefined || ng < g[nb]) { g[nb] = ng; prev[nb] = cur; open.add(nb); } }
  }
  return [from, to];
}
function pathLen(nodes) { let L = 0; for (let i = 1; i < nodes.length; i++) L += dist(NODES[nodes[i - 1]], NODES[nodes[i]]); return L; }
let PCT_TO_M = 4.1; // mètres pour 1 % de largeur du plan courant
function metersPath(nodes, fromPt) { let L = pathLen(nodes) * PCT_TO_M; if (fromPt) L += dist(fromPt, NODES[nodes[0]]) * PCT_TO_M; return Math.max(5, Math.round(L / 5) * 5); }
const walkMin = m => Math.max(1, Math.round(m / 45)); // vitesse en foule ≈ 45 m/min

// Positions des amis : déplacement le long des arêtes (jamais à travers un mur)
const FR_STATE = {};
function initFriends() { Object.keys(FR_STATE).forEach(k => delete FR_STATE[k]);
FRIENDS.forEach(f => {
  if (f.loop) FR_STATE[f.id] = { seq: f.loop.match(/R2|[A-Z]/g), i: 0, t: Math.random(), pos: [...NODES[f.loop[0]]] };
  else FR_STATE[f.id] = { pos: [...NODES[f.at]], stale: !!f.stale };
});
}
buildGraph(); initFriends();
function stepFriends(dt) {
  FRIENDS.forEach(f => {
    const s = FR_STATE[f.id]; if (!s.seq) return;
    const a = NODES[s.seq[s.i]], b = NODES[s.seq[(s.i + 1) % s.seq.length]];
    const L = Math.max(.5, dist(a, b)); s.t += dt * f.speed * 60 / L;
    if (s.t >= 1) { s.t = 0; s.i = (s.i + 1) % (s.seq.length - 1); }
    const pause = s.seq[s.i] === s.seq[0] && s.t < .25; // arrêts naturels
    const t = pause ? 0 : s.t;
    s.pos = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  });
}
function friendPos(id) { return FR_STATE[id] ? FR_STATE[id].pos : NODES.F; }
function zoneOf(p) { let best = null, bd = 1e9; POIS.forEach(o => { const d = dist(o.at, p); if (d < bd) { bd = d; best = o; } }); return best ? best.n : 'Site'; }

// boucle de simulation commune
let lastT = performance.now();
function tick(now) {
  const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
  stepFriends(dt);
  tickers.forEach(f => f(dt));
  requestAnimationFrame(tick);
}
const tickers = new Set();
requestAnimationFrame(tick);
setInterval(() => { ST.clock += 1; emit(); }, 30000);

// ---------- chiffres partagés (une seule source pour toutes les vues) ----------
const nowMin = () => ((ST.clock - 20 * 60) + 1440) % 1440;
// Source unique : le compteur de porte donne les présents ; les zones en sont une répartition (le reste circule).
const PROFILE = m => { const v = typeof VENUE !== 'undefined' ? VENUE : { open: 0, close: 480, peak: 290 }; if (m < v.open || m > v.close) return 0; const ramp = Math.min(1, (m - v.open) / 25, (v.close - m) / 25); return ramp * (.12 + .88 * Math.exp(-Math.pow((m - v.peak) / 165, 2))); };
function presentAt(m) { m = Math.max(0, Math.min(540, m)); return Math.round(EVENT.capacity * .9 * PROFILE(m)); }
const ZW = { fosse: 1.15, scene: 1.3, vip: .95, tables: .75, bars: 1, rotonde: .45, terrasse: .55 };
function occAt(z, m) {
  m = Math.max(0, Math.min(540, m)); const p = presentAt(m), tot = ZONES.reduce((a, x) => a + x.cap * (ZW[x.id] || .7), 0);
  let share = z.cap * (ZW[z.id] || .7) / tot;
  if (z.id === 'scene' || z.id === 'fosse') share *= LINEUP.some(l => l.s === 'scene' && toMin20(l.f) <= m && m < toMin20(l.t)) ? 1.08 : .9;
  const inZones = .8 + .06 * Math.cos(m / 35);
  return Math.round(Math.min(z.cap * .99, p * inZones * share));
}
const occNow = z => occAt(z, nowMin());
const zonesTotal = m => ZONES.reduce((a, z) => a + occAt(z, m), 0);
const appUsers = m => Math.round(presentAt(m) * .41);
const contributors = m => Math.round(appUsers(m) * .68);
// densité (personnes par m²) : surface déclarée dans Préparation (≈ capacité / 3,2 m²)
const zoneArea = z => z.area || Math.round(z.cap / 3.2);
const densAt = (z, m) => occAt(z, m) / zoneArea(z);
// marge : 12 % + effet du petit échantillon (contributeurs présents dans la zone)
const zoneN = (z, m) => Math.max(1, Math.round(occAt(z, m) * .41 * .68));
const margin = (z, m) => Math.min(.45, .12 + 1.2 / Math.sqrt(zoneN(z, m)));
const rangeOf = (v, mg) => [Math.round(v * (1 - mg) / 10) * 10, Math.round(v * (1 + mg) / 10) * 10];
// échelle unique de couleurs de densité (p/m²) — partagée par toutes les vues
const DENS_SCALE = [[1, '#CFE8C0', '< 1'], [2, '#9BD46A', '1–2'], [3, '#F5B941', '2–3'], [4, '#F5821E', '3–4'], [99, '#E5323C', '≥ 4']];
const densColor = d => DENS_SCALE.find(s => d < s[0])[1];
const fillColor = r => r >= .9 ? '#E5484D' : r >= .75 ? '#F59E0B' : '#22C55E';
// incidents : une seule table par lieu, générée à partir des mêmes séries (densité) + incidents saisis
function genIncidents() {
  const out = [];
  ZONES.forEach(z => { let start = null; for (let m = 0; m <= 480; m += 5) { const r = occAt(z, m) / z.cap, hi = r * (1 + margin(z, m)) >= .97 || r >= .9; if (hi && start === null) start = m; if ((!hi || m === 480) && start !== null) { if (m - start >= 10) out.push({ t: start, e: m, n: 'Densité > 90 % · ' + z.n, zone: z.n, cat: 'crowd', auto: true, at: z.at }); start = null; } } });
  const man = VENUE.id === 'bdf' ? [[95, 104, 'Objet perdu · Rotonde', 'lost', 'rotonde'], [125, 142, 'Malaise · Fosse', 'medical', 'fosse'], [168, 181, 'Bousculade · Entrée', 'danger', 'terrasse'], [201, 214, 'Objet perdu · Bar à cocktails', 'lost', 'bars'], [262, 270, 'Malaise · Rotonde', 'medical', 'rotonde'], [330, 345, 'Bagarre · Bar Est', 'danger', 'bars'], [372, 380, 'Malaise · Fosse', 'medical', 'fosse'], [410, 418, 'Objet perdu · Terrasse', 'lost', 'terrasse']]
    : [[150, 158, 'Malaise · ' + ZONES[0].n, 'medical', ZONES[0].id], [260, 266, 'Objet perdu · Vestiaire', 'lost', ZONES[ZONES.length - 1].id], [320, 331, 'Altercation · ' + ZONES[2].n, 'danger', ZONES[2].id]];
  man.forEach(x => { const z = ZONES.find(q => q.id === x[4]) || ZONES[0]; out.push({ t: x[0], e: x[1], n: x[2], zone: z.n, cat: x[3], auto: false, at: z.at }); });
  return out.sort((a, b) => a.t - b.t);
}
const incidentsUntil = m => genIncidents().filter(i => i.t <= m);
const isLive = l => { if (l.cancelled) return false; const m = nowMin(); return toMin20(l.f) <= m && m < toMin20(l.t); };
const fmtN = n => Math.round(n).toLocaleString('fr-FR');

// ---------- UI : écrans, feuilles, dialogues système, toasts ----------
let SCREEN; // élément #screen
const statusBar = (dark) => `<div class="status" style="${dark ? 'color:#fff' : ''}"><span>${fmtClock(ST.clock)}</span><span class="r">${ST.offline ? '<span style="font-size:12px">Pas de réseau</span>' : '<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor"/><rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" opacity=".35"/></svg>'}<svg width="26" height="13" viewBox="0 0 26 13"><rect x=".5" y=".5" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="14" height="9" rx="2" fill="currentColor"/><rect x="24" y="4" width="1.6" height="5" rx=".8" fill="currentColor" opacity=".4"/></svg></span></div>`;

function mount(html, cls = '') {
  if (ST._avRestore) { ST.me.av = ST._avRestore; ST._avRestore = null; if (typeof toast === 'function') setTimeout(() => toast('Modifications d’avatar non enregistrées : annulées'), 300); }
  closeSheet(true); clearTimeout(V._alwaysT); SCREEN.querySelectorAll('.tour').forEach(t => t.remove()); $$('.banner', SCREEN).forEach(b => b.remove());
  if (MV && !/id="mv"/.test(html)) { MV.destroy(); MV = null; clearInterval(V._lbT); }
  const el = document.createElement('div'); el.className = 'scr ' + cls; el.innerHTML = html;
  SCREEN.querySelectorAll('.scr').forEach(s => s.remove());
  SCREEN.prepend(el); if (typeof applyTheme === 'function') { applyTheme(); applyLang(); }
  return el;
}
let sheetEl = null, sheetOnClose = null;
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('.sysBack')) return; closeSheet(); } });
// interrupteurs accessibles
document.addEventListener('click', () => setTimeout(() => $$('.tog').forEach(t => { t.setAttribute('role', 'switch'); t.setAttribute('aria-checked', t.classList.contains('on')); }), 0), true);
function openSheet(html, opts = {}) {
  closeSheet(true);
  const back = document.createElement('div'); back.className = 'sheetBack'; back.onclick = () => closeSheet();
  const sh = document.createElement('div'); sh.className = 'sheet' + (opts.full ? ' full' : ''); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = `<div class="grab" title="Glisser pour agrandir ou fermer"></div><div class="sbody">${html}</div>`;
  if (opts.noBack) back.style.background = 'transparent';
  SCREEN.append(back, sh); sheetEl = { back, sh }; sheetOnClose = opts.onClose || null;
  // poignée : tirer vers le haut = plein écran, vers le bas = fermer ; toucher = basculer
  const g = sh.querySelector('.grab'); let y0 = null, moved = false;
  g.addEventListener('pointerdown', e => { y0 = e.clientY; moved = false; g.setPointerCapture(e.pointerId); });
  g.addEventListener('pointermove', e => { if (y0 === null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 6) moved = true; if (dy > 0) sh.style.transform = `translateY(${dy}px)`; });
  g.addEventListener('pointerup', e => { const dy = e.clientY - y0; y0 = null; sh.style.transform = ''; if (!moved) { sh.classList.toggle('full'); return; } if (dy > 90) closeSheet(); else if (dy < -40) sh.classList.add('full'); });
  return sh.querySelector('.sbody');
}
function closeSheet(silent) {
  if (!sheetEl) return; sheetEl.back.remove(); sheetEl.sh.remove(); sheetEl = null;
  const f = sheetOnClose; sheetOnClose = null; if (f && !silent) f();
}
function sysAlert({ title, text, buttons, map }) {
  return new Promise(res => {
    const b = document.createElement('div'); b.className = 'sysBack';
    b.innerHTML = `<div class="sys ${ST.os === 'android' ? 'android' : ''}" role="alertdialog"><div class="st"><b>${title}</b><span>${text || ''}</span></div>${map ? '<div class="mapPrev"></div>' : ''}${buttons.map((x, i) => `<button class="sb ${x.b ? 'b' : ''}" data-i="${i}">${x.t}</button>`).join('')}</div>`;
    b.addEventListener('click', e => { const t = e.target.closest('.sb'); if (!t) return; b.remove(); res(buttons[+t.dataset.i].v); });
    SCREEN.append(b);
  });
}
let toastT;
function toast(html, ms = 2600) {
  $$('.toast', SCREEN).forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.innerHTML = html; SCREEN.append(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms);
}
function push(n) {
  if (n.for !== 'staff' && (ST.role !== 'visitor' || $('#dash'))) { (ST.pushQueue = ST.pushQueue || []).push(n); return; }
  if (n.for === 'staff' && (ST.role === 'visitor' || $('#dash'))) { (ST.pushQueue = ST.pushQueue || []).push(n); return; }
  showPush(n);
}
function flushPush() { const all = (ST.pushQueue || []); const lastByRid = {}; all.forEach((n, i) => { if (n.rid) lastByRid[n.rid] = i; }); ST.pushQueue = all.filter((n, i) => !n.rid || (lastByRid[n.rid] === i && (ST.reports.find(r => r.id === n.rid) || {}).status !== 'Résolu')); const q = (ST.pushQueue || []).filter(n => (n.for === 'staff') === (ST.role !== 'visitor')); ST.pushQueue = (ST.pushQueue || []).filter(n => !q.includes(n)); q.forEach((n, i) => setTimeout(() => showPush(n), 500 + i * 2600)); }
function showPush({ title, text, icon, onTap, app = 'ONEERA' }) {
  $$('.push', SCREEN).forEach(t => t.remove());
  const t = document.createElement('button'); t.className = 'push';
  t.innerHTML = `<div class="pi"><img src="${icon || A + 'logo.webp'}" alt=""></div><div style="flex:1;display:flex;flex-direction:column;gap:1px"><div style="display:flex;justify-content:space-between"><span class="tiny" style="color:#666;font-weight:700;letter-spacing:.04em">${app}</span><span class="tiny" style="color:#888">maintenant</span></div><b>${title}</b><span>${text}</span></div>`;
  t.onclick = () => { t.remove(); onTap && onTap(); };
  SCREEN.append(t); setTimeout(() => t.remove(), 6000);
  ST.notifs.unshift({ title, text, t: fmtClock(ST.clock), icon }); ST.unread.notif++; emit();
}
function avatarOf(k) { return HEAD(k); }
function meHead() { return HEAD(ST.me.base); }

// QR code décoratif (motif déterministe, non scannable)
function drawQR(canvas, seed) {
  const n = 29, c = canvas.getContext('2d'); canvas.width = canvas.height = n * 8; c.fillStyle = '#fff'; c.fillRect(0, 0, n * 8, n * 8); c.fillStyle = '#1C1F2A';
  let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const finder = (x, y) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const e = i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4); if (e) c.fillRect((x + i) * 8, (y + j) * 8, 8, 8); } };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const inF = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9); if (!inF && rnd() > .52) c.fillRect(i * 8, j * 8, 8, 8); }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
}
