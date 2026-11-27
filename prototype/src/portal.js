// ===== Portail ONEERA : transition « nuages » façon jeu de stratégie =====
// La carte remplit toujours tout l'écran (on n'en voit jamais le bord). Pour entrer, sortir ou changer de lieu,
// de gros nuages en relief arrivent de partout et recouvrent l'écran (≈0,5 s), dérivent pendant le chargement
// (logo au centre), puis se déchirent depuis le centre vers les bords et dévoilent la carte déjà en place, avec
// un léger zoom. Un seul canvas, sprites de nuages dessinés une fois (fluide sur téléphone).
// API : PORTAL.close() / open() / enter() / exit() / reveal() / launch() ; window.ONEERA_PORTAL().
const PORTAL = { busy: false, pending: null, el: null, st: null };
const pLogo = new Image(); pLogo.src = A + 'logo.webp';
const pE = { io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, in: k => k * k, out: k => 1 - Math.pow(1 - k, 3), o2: k => 1 - (1 - k) * (1 - k) };
// le « O » du logo détouré (l'icône a un fond bleu nuit) et rempli aux couleurs de la marque
let pMark = null; const pLogoMark = () => { if (pMark) return pMark; if (!pLogo.complete || !pLogo.naturalWidth) return null;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.drawImage(pLogo, 0, 0, n, n); const d = g.getImageData(0, 0, n, n), px = d.data;
  for (let i = 0; i < px.length; i += 4) { const l = px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11, a = Math.max(0, Math.min(1, (l - 34) / 70)); px[i + 3] = Math.round(a * 255); }
  g.putImageData(d, 0, 0); g.globalCompositeOperation = 'source-in'; const gr = g.createLinearGradient(0, 0, n, n); gr.addColorStop(0, '#3A4FD8'); gr.addColorStop(.55, '#5B3FD0'); gr.addColorStop(1, '#C13FB8'); g.fillStyle = gr; g.fillRect(0, 0, n, n);
  return (pMark = c); };
const pClamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const pSmooth = (a, b, v) => { const t = pClamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const portalAllowed = () => mapAnim() && !(navigator.webdriver && !/[?&]portal=1/.test(location.search));
// petits nuages doux de l'atmosphère de la carte (utilisés par fx.js)
const pCloudSpr = {}; function pSpr(kind) { if (pCloudSpr[kind]) return pCloudSpr[kind];
  const c = document.createElement('canvas'); c.width = 360; c.height = 220; const g = c.getContext('2d');
  const col = { day: ['255,255,255', '214,226,248'], dusk: ['255,226,236', '214,170,206'], night: ['150,140,220', '70,62,140'] }[kind];
  const blob = (x, y, r, rgb, a) => { const gr = g.createRadialGradient(x, y - r * .2, r * .1, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(.6, `rgba(${rgb},${a * .8})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  [[180, 132, 70], [120, 128, 54], [240, 126, 58], [150, 104, 58], [210, 98, 52], [92, 140, 40], [270, 140, 40]].forEach(([x, y, r]) => blob(x + 6, y + 14, r, col[1], .5));
  [[180, 124, 70], [120, 122, 54], [240, 118, 58], [150, 96, 58], [210, 90, 52], [92, 134, 40], [270, 134, 40], [182, 80, 44]].forEach(([x, y, r]) => blob(x, y, r, col[0], .95));
  return (pCloudSpr[kind] = c); }

// ---------- palette selon l'heure (jour / crépuscule / nuit)
function portalPalette() {
  const nk = nightK((20 * 60 + nowMin()) % 1440), kind = nk > .5 ? 'night' : nk > .05 ? 'dusk' : 'day';
  return { kind, P: {
    day: { top: '#FFFFFF', mid: '#F2F5FB', low: '#D3DDEE', sh: '#A9BBD8', fill: ['#EEF3FB', '#DDE6F4'], glow: 'rgba(255,248,226,.55)', dot: '#6C7AA6' },
    dusk: { top: '#FFF8F4', mid: '#F8E8EE', low: '#DDBFD6', sh: '#B293BF', fill: ['#F6E7EE', '#E4CCDD'], glow: 'rgba(255,214,190,.5)', dot: '#8E6A9A' },
    night: { top: '#E9E8FF', mid: '#C9C6F0', low: '#8F8AC8', sh: '#5B5598', fill: ['#BDB9EA', '#9C97D4'], glow: 'rgba(190,180,255,.35)', dot: '#4B4590' } }[kind] };
}
// ---------- sprites : cumulus stylisés, chaque lobe ombré (relief), base aplatie plus sombre, ombre portée bleutée
const pSprCache = {};
function pPuff(kind, v, P) { const key = kind + v; if (pSprCache[key]) return pSprCache[key];
  const W = 460, H = 300, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const R = i => fxRnd(v * 97 + i * 13 + 5);
  const lobes = [], base = 222;
  const n0 = 5 + Math.floor(R(1) * 2); for (let i = 0; i < n0; i++) { const t = (i + .5) / n0, e = Math.sin(t * Math.PI); lobes.push([66 + t * 328 + (R(i + 2) - .5) * 18, base - 14 - e * 10 + (R(i + 9) - .5) * 12, 40 + e * 22 + R(i + 20) * 18, 0]); }
  const n1 = 2 + Math.floor(R(3) * 2); for (let i = 0; i < n1; i++) { const t = (i + .5) / n1; lobes.push([130 + t * 200 + (R(i + 30) - .5) * 30, 150 + (R(i + 40) - .5) * 20, 70 + R(i + 50) * 24, 1]); }
  if (R(4) > .3) lobes.push([190 + R(60) * 80, 96 + R(61) * 16, 56 + R(62) * 18, 2]);
  const order = lobes.slice().sort((a, b) => b[3] - a[3] || a[1] - b[1]); // sommets (fond) d'abord, rangée du bas (devant) ensuite
  g.save(); g.translate(8, 16); g.fillStyle = P.sh; g.globalAlpha = .38; g.filter = 'blur(6px)'; order.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r * .96, 0, 7); g.fill(); }); g.filter = 'none'; g.restore();
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const sil = () => { g.beginPath(); order.forEach(([x, y, r]) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); }); };
  // une seule masse (les lobes se fondent, pas de contour entre eux), teinte d'ombre ; puis la lumière vient du haut
  sil(); g.fillStyle = P.low; g.fill(); g.save(); sil(); g.clip();
  const vg = g.createLinearGradient(0, 60, 0, base + 60); vg.addColorStop(0, P.mid); vg.addColorStop(.6, P.low); vg.addColorStop(1, P.sh); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  order.forEach(([x, y, r]) => { const lx = x - r * .18, ly = y - r * .34, gr = g.createRadialGradient(lx, ly, 0, lx, ly, r * 1.02); gr.addColorStop(0, hexA(P.top, 1)); gr.addColorStop(.45, hexA(P.top, .92)); gr.addColorStop(.75, hexA(P.mid, .55)); gr.addColorStop(1, hexA(P.mid, 0));
    g.fillStyle = gr; g.fillRect(lx - r * 1.1, ly - r * 1.1, r * 2.2, r * 2.2); });
  const bg = g.createLinearGradient(0, base - 40, 0, base + 60); bg.addColorStop(0, hexA(P.sh, 0)); bg.addColorStop(1, hexA(P.sh, .55)); g.fillStyle = bg; g.fillRect(0, base - 40, W, 120);
  g.restore();
  return (pSprCache[key] = c); }

// ---------- champ de nuages (grille décalée qui déborde de l'écran)
function pField(W, H) { const cols = Math.ceil(W / 150) + 2, rows = Math.ceil(H / 118) + 2, out = []; let i = 0;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++, i++) { const x = (q - .5 + (r % 2) * .5) * (W + 300) / (cols - 1) - 150 + (fxRnd(i * 3 + 1) - .5) * 70, y = (r - .5) * (H + 240) / (rows - 1) - 120 + (fxRnd(i * 5 + 2) - .5) * 60;
    const z = fxRnd(i * 7 + 3); out.push({ x, y, z, s: .62 + z * .55 + fxRnd(i * 11 + 4) * .18, v: i % 6, a: fxRnd(i * 13 + 5) * 6.283 }); }
  return out.sort((a, b) => a.z - b.z); }

// Une image : c = fermeture (0 → 1 : les nuages arrivent), o = ouverture (0 → 1 : ils se déchirent depuis le centre)
function portalFrame(ctx, W, H, st, now) {
  const { pal, field } = st, P = pal.P, cx = W / 2, cy = H * .46, diag = Math.hypot(W, H) / 2, c = st.c, o = st.o, t = (now - st.t0) / 1000;
  ctx.clearRect(0, 0, W, H);
  const fa = pSmooth(.35, .9, c) * (1 - pSmooth(0, .6, o)); // fond de nuages : garantit une couverture totale
  if (fa > .002) { ctx.save(); ctx.globalAlpha = fa; const lg = ctx.createLinearGradient(0, 0, W * .4, H); lg.addColorStop(0, P.fill[0]); lg.addColorStop(1, P.fill[1]); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    if (o > 0) { ctx.globalCompositeOperation = 'destination-out'; const r0 = pE.in(o) * diag * 1.3, rg = ctx.createRadialGradient(cx, cy, r0, cx, cy, r0 + 220); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
    ctx.restore(); }
  const Wf = W + 360, Hf = H + 300, dx = t * 26, dy = -t * 11; // dérive en diagonale, parallaxe selon la profondeur
  for (const p of field) {
    let x = ((p.x + dx * (.6 + p.z * .8)) % Wf + Wf) % Wf - 180, y = ((p.y + dy * (.6 + p.z * .8)) % Hf + Hf) % Hf - 150;
    let vx = x - cx, vy = y - cy; const d = Math.hypot(vx, vy) || 1; if (d < 40) { vx = Math.cos(p.a); vy = Math.sin(p.a); } else { vx /= d; vy /= d; } const dn = Math.min(1, d / diag);
    const ki = pE.out(pClamp((c - dn * .28) / .72)), kj = pE.in(pClamp(o * 1.35 - dn * .3 - p.z * .05));
    const push = (1 - ki) * (diag * .9 + 160) + kj * (diag * 1.1 + 200);
    x += vx * push; y += vy * push * .9;
    const al = Math.min(1, ki * 1.6) * (1 - pSmooth(.55, 1, kj)); if (al <= .01) continue;
    const sc = p.s * (1 + (1 - ki) * .35 + kj * .45), img = pPuff(pal.kind, p.v, P), w = img.width * sc * .78, h = img.height * sc * .78;
    ctx.globalAlpha = al; ctx.drawImage(img, x - w / 2, y - h / 2, w, h); }
  ctx.globalAlpha = 1;
  const la = pSmooth(.75, 1, c) * (1 - pSmooth(0, .18, o)) * (st.logo ? 1 : 0); // logo + chargement pendant que tout est couvert
  if (st.lg) { const v = la.toFixed(3); if (st.lgA !== v) { st.lgA = v; st.lg.style.opacity = v; st.lg.style.visibility = la > .01 ? 'visible' : 'hidden'; }
    if (la > .01 && !st.lgImg) { const mk = pLogoMark(); if (mk) { st.lgImg = true; st.lg.querySelector('img').src = mk.toDataURL('image/png'); } } }
}

// ---------- calque unique, réutilisé entre fermeture et ouverture
function pLayer() {
  if (PORTAL.el && document.body.contains(PORTAL.el)) return PORTAL.st;
  const el = document.getElementById('portal') || document.createElement('div'); el.id = 'portal'; el.setAttribute('aria-hidden', 'true'); el.classList.add('clouds');
  const cv = document.createElement('canvas'); el.append(cv); if (!el.parentNode) SCREEN.append(el);
  const W = SCREEN.clientWidth, H = SCREEN.clientHeight, dpr = 1; // nuages doux : résolution standard (4× moins de pixels) ; logo net en HTML par-dessus cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  el.addEventListener('pointerdown', () => { const s = PORTAL.st; if (!s) return; s.skip = true; if (s.anim) s.anim.dur = Math.min(s.anim.dur, performance.now() - s.anim.t0 + 160); });
  const lg = document.createElement('div'); lg.className = 'pLg ' + portalPalette().kind; lg.innerHTML = '<img alt=""><b>ONEERA</b><i></i><i></i><i></i>'; lg.style.opacity = '0'; el.append(lg);
  const st = { el, ctx, lg, W, H, c: 0, o: 0, logo: false, pal: portalPalette(), field: pField(W, H), t0: performance.now(), raf: 0, anim: null };
  const loop = (now) => { if (!document.body.contains(el)) { SCREEN.classList.remove('pCov'); if (PORTAL.st === st) { PORTAL.el = PORTAL.st = null; PORTAL.busy = false; } return; }
    if (st.anim) { const a = st.anim, k = pClamp((now - a.t0) / a.dur); st[a.key] = a.from + (a.to - a.from) * k; if (k >= 1) { st.anim = null; a.done(); } }
    const cov = st.c >= 1 && !st.o; if (cov !== st.cov) { st.cov = cov; SCREEN.classList.toggle('pCov', cov); } // écran couvert : la carte dessous ne se dessine plus
    try { portalFrame(ctx, W, H, st, now); } catch (_) {} st.raf = requestAnimationFrame(loop); };
  st.raf = requestAnimationFrame(loop); PORTAL.el = el; PORTAL.st = st; return st; }
const pTween = (st, key, to, dur) => new Promise(r => { if (st.anim) st.anim.done(); st.anim = { key, from: st[key], to, dur, t0: performance.now(), done: r }; });
function pDrop() { SCREEN && SCREEN.classList.remove('pCov'); const st = PORTAL.st; if (st) cancelAnimationFrame(st.raf); PORTAL.el && PORTAL.el.remove(); PORTAL.el = PORTAL.st = null; PORTAL.busy = false; }
const pWait = ms => new Promise(r => { const t0 = performance.now(), tick = () => (PORTAL.st && PORTAL.st.skip) || performance.now() - t0 >= ms ? r() : setTimeout(tick, 40); tick(); });
const pClosed = () => !!(PORTAL.st && PORTAL.st.c >= 1 && !PORTAL.st.o);

// Fermer : les nuages recouvrent l'écran (résout quand tout est couvert)
PORTAL.close = (o = {}) => { if (!portalAllowed() || !SCREEN) return Promise.resolve(); PORTAL.busy = true; const st = pLayer(); st.logo = !!o.logo; st.o = 0;
  if (o.instant || st.c >= 1) { st.c = 1; return Promise.resolve(); } return pTween(st, 'c', 1, o.dur || 480); };
// Ouvrir : les nuages se déchirent depuis le centre ; toucher l'écran accélère
PORTAL.open = (o = {}) => { const st = PORTAL.st; if (!st) { PORTAL.busy = false; return Promise.resolve(); } st.c = 1; o.onStart && o.onStart();
  return pTween(st, 'o', 1, st.skip ? 320 : (o.dur || 1150)).then(() => { if (PORTAL.st === st) pDrop(); }); };

// Entrée sur la carte : la carte est déjà en place (un peu plus large) sous les nuages ; ils s'ouvrent et on zoome doucement
PORTAL.enter = (mode = 'sky', hold = 420) => {
  if (!portalAllowed() || !MV) return PORTAL.st ? PORTAL.open() : Promise.resolve();
  if (PORTAL.st && PORTAL.st.entering) return Promise.resolve();
  const mv = MV, at = [ST.me.pos[0], ST.me.pos[1] - 8], zoom = VENUE.zoom; mv.intro = null;
  SCREEN.classList.add('pIn');
  return PORTAL.close({ logo: mode === 'logo' }).then(() => { PORTAL.st.entering = true; mv.alive && mv.center(at, Math.max(mv.minS, zoom * .84)); return pWait(hold); })
    .then(() => PORTAL.open({ onStart: () => { setTimeout(() => mv.alive && mv.flyTo(at, zoom, 1300), 60); setTimeout(() => { SCREEN.classList.remove('pIn'); SCREEN.classList.add('pShow'); setTimeout(() => SCREEN.classList.remove('pShow'), 1400); }, 380); } }))
    .then(() => SCREEN.classList.remove('pIn'));
};
// Sortie : les nuages se referment sur la carte (le logo apparaît quand on quitte l'univers)
PORTAL.exit = (mode = 'sky') => { if (!portalAllowed() || !SCREEN) return Promise.resolve(); MV && MV.ov && (MV.ov.style.opacity = '0');
  return PORTAL.close({ logo: mode === 'logo' }).then(() => pWait(mode === 'logo' ? 650 : 120)); };
// Écran sans carte (accueil) : les nuages s'ouvrent sur l'écran
PORTAL.reveal = () => { if (!portalAllowed() || !SCREEN) return Promise.resolve(); return PORTAL.close({ logo: true, instant: !PORTAL.st }).then(() => pWait(500)).then(() => PORTAL.open()); };
PORTAL.play = (o = {}) => o.dir === 'out' ? PORTAL.exit(o.mode || 'sky') : PORTAL.reveal(); // compatibilité
window.ONEERA_PORTAL = (o = {}) => o.dir === 'out' ? PORTAL.exit(o.mode || 'logo') : PORTAL.reveal();

// ---------- branchements ----------
// 1. ouverture de l'app : écran de démarrage, les nuages arrivent sur le logo, puis s'ouvrent sur la carte
PORTAL.launch = () => { let seen = false; try { seen = sessionStorage.getItem('oneera.portal') === '1'; sessionStorage.setItem('oneera.portal', '1'); } catch (_) {}
  if (seen || !portalAllowed() || !SCREEN) return;
  const v = document.createElement('div'); v.id = 'portal'; v.className = 'veil'; v.setAttribute('aria-hidden', 'true'); v.innerHTML = `<img class="pre" src="${A}logo.webp" alt="">`; SCREEN.append(v); PORTAL.busy = true; $('#mv') && SCREEN.classList.add('pIn'); // voile immédiat : aucun flash
  setTimeout(() => PORTAL.close({ logo: true, dur: 560 }).then(() => { const im = v.querySelector('img.pre'); im && im.remove(); v.classList.remove('veil');
    return ($('#mv') && MV) ? PORTAL.enter('logo', 650) : pWait(650).then(() => PORTAL.open()); }), 40); };
// 2. première visite d'un lieu (la carte vient d'être montée)
const _fxIntro = FX.intro, _fxLeave = FX.leave;
FX.intro = (mv, at, zoom) => { if (!portalAllowed()) return _fxIntro(mv, at, zoom); if (PORTAL.busy && !pClosed()) return; PORTAL.enter(PORTAL.pending || 'sky'); PORTAL.pending = null; };
// 3. changer de lieu : les nuages se ferment, on change de monde dessous, puis ils s'ouvrent sur le nouveau lieu
FX.leave = (cb) => { if (!portalAllowed()) return _fxLeave(cb);
  PORTAL.close({}).then(() => { cb(); setTimeout(() => { if (!PORTAL.st || PORTAL.st.entering) return; if (MV && MV.alive && $('#mv')) PORTAL.enter('sky'); else PORTAL.open(); }, 80); }); };
