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
    day: { veil: ['#CBD5E3', '#AAB8CC'], fog: '255,255,255', deep: '150,166,190', glow: 'rgba(255,248,226,.55)' },
    dusk: { veil: ['#DCC6D4', '#B99CB4'], fog: '255,246,250', deep: '170,130,160', glow: 'rgba(255,214,190,.5)' },
    night: { veil: ['#262646', '#15152C'], fog: '178,174,230', deep: '70,66,128', glow: 'rgba(190,180,255,.3)' } }[kind] };
}
// ---------- brouillard : textures douces et raccordables (des centaines de nappes floues), générées une fois
const pFogCache = {};
function pFogTex(kind, v, P) { const key = kind + v; if (pFogCache[key]) return pFogCache[key];
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const R = i => fxRnd(v * 131 + i * 7 + 3);
  for (let i = 0; i < 46; i++) { const x = R(i) * N, y = R(i + 500) * N, r = 40 + R(i + 900) * (v === 0 ? 150 : 110), a = (v === 0 ? .3 : .38) + R(i + 1300) * .32, col = R(i + 1700) < .42 ? P.deep : P.fog;
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { const cx = x + dx, cy = y + dy; if (cx + r < 0 || cx - r > N || cy + r < 0 || cy - r > N) continue;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.55, `rgba(${col},${a * .45})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); } }
  return (pFogCache[key] = c); }
// une image : c = fermeture (le brouillard arrive et s'épaissit), o = ouverture (on le traverse : il s'étire, s'éclaircit et se dissipe depuis le centre)
// Une image : on ne redessine rien, on déplace seulement des calques (transform + opacité) → animé par la puce graphique, fluide même sur un vieux téléphone
function portalFrame(ctx, W, H, st, now) {
  const P = st.pal.P, c = st.c, o = st.o, t = (now - st.t0) / 1000;
  if (!st.L) { const mk = (cls, css) => { const d = document.createElement('div'); d.className = cls; d.style.cssText = css; st.el.insertBefore(d, st.lg); return d; };
    st.V = mk('fogV', `background:linear-gradient(160deg,${P.veil[0]},${P.veil[1]});opacity:0`);
    st.L = [0, 1, 2, 3].map(k => { const tex = pFogTex(st.pal.kind, k, P), u = tex._url || (tex._url = tex.toDataURL('image/png')), sz = Math.round(Math.max(W, H) * [.62, .82, 1.05, 1.35][k]);
      const d = mk('fogL', `background-image:url(${u});background-size:${sz}px ${sz}px;left:${-sz}px;top:${-sz}px;width:${W + sz * 2}px;height:${H + sz * 2}px;opacity:0`); d._sz = sz; return d; }); }
  const va = pSmooth(.15, .85, c) * (1 - pSmooth(.05, .75, o)); st.V.style.opacity = va.toFixed(3);
  [[14, -1], [24, 1], [36, -1], [52, 1]].forEach(([sp, side], k) => { const d = k / 3, el = st.L[k], sz = el._sz;
    const ci = pE.out(pClamp((c - (1 - d) * .25) / .75)), oj = pE.in(pClamp(o * 1.3 - (1 - d) * .3)), a = ci * (1 - oj) * (k === 3 ? .75 : 1);
    const ox = (((t * sp * side) + (1 - ci) * side * W * .6) % sz + sz) % sz, oy = ((t * sp * .35) % sz + sz) % sz, z = 1 + oj * (1.2 + d);
    el.style.opacity = a.toFixed(3); el.style.transform = `translate3d(${(W / 2) * (1 - z) + ox * z}px,${(H * .46) * (1 - z) + oy * z}px,0) scale(${z.toFixed(4)})`; });
  const la = pSmooth(.75, 1, c) * (1 - pSmooth(0, .18, o)) * (st.logo ? 1 : 0);
  if (st.lg) { const v = la.toFixed(3); if (st.lgA !== v) { st.lgA = v; st.lg.style.opacity = v; st.lg.style.visibility = la > .01 ? 'visible' : 'hidden'; }
    if (la > .01 && !st.lgImg) { const mk = pLogoMark(); if (mk) { st.lgImg = true; st.lg.querySelector('img').src = mk.toDataURL('image/png'); } } }
}

// ---------- calque unique, réutilisé entre fermeture et ouverture
function pLayer() {
  if (PORTAL.el && document.body.contains(PORTAL.el)) return PORTAL.st;
  const el = document.getElementById('portal') || document.createElement('div'); el.id = 'portal'; el.setAttribute('aria-hidden', 'true'); el.classList.add('clouds');
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; cv.className = 'fogC'; el.append(cv); if (!el.parentNode) SCREEN.append(el); // repère gardé pour les tests ; le brouillard est en calques
  const W = SCREEN.clientWidth, H = SCREEN.clientHeight, dpr = 1; /* brouillard doux : résolution standard (4× moins de pixels) ; logo net en HTML par-dessus */ 
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  el.addEventListener('pointerdown', () => { const s = PORTAL.st; if (!s) return; s.skip = true; if (s.anim) s.anim.dur = Math.min(s.anim.dur, performance.now() - s.anim.t0 + 160); });
  const lg = document.createElement('div'); lg.className = 'pLg ' + portalPalette().kind; lg.innerHTML = '<img alt=""><b>ONEERA</b><span class="dots"><i></i><i></i><i></i></span>'; lg.style.opacity = '0'; el.append(lg);
  const st = { el, ctx, lg, W, H, c: 0, o: 0, logo: false, pal: portalPalette(), t0: performance.now(), raf: 0, anim: null };
  const loop = (now) => { if (!document.body.contains(el)) { SCREEN.classList.remove('pCov'); if (PORTAL.st === st) { PORTAL.el = PORTAL.st = null; PORTAL.busy = false; } return; }
    if (st.anim) { const a = st.anim, k = pClamp((now - a.t0) / a.dur); st[a.key] = a.from + (a.to - a.from) * k; if (k >= 1) { st.anim = null; a.done(); } }
    const cov = st.c >= 1 && !st.o; if (cov !== st.cov || cov !== SCREEN.classList.contains('pCov')) { st.cov = cov; SCREEN.classList.toggle('pCov', cov); }
    if (PORTAL.hideUI && !SCREEN.classList.contains('pIn')) SCREEN.classList.add('pIn'); // un écran qui se monte remet ses classes à zéro : on recache l'interface // écran couvert : la carte dessous ne se dessine plus
    try { portalFrame(ctx, W, H, st, now); } catch (_) {} st.raf = requestAnimationFrame(loop); };
  st.raf = requestAnimationFrame(loop); PORTAL.el = el; PORTAL.st = st; return st; }
// une animation qui en remplace une autre sur la même valeur reprend ses « attentes » : personne n'est libéré trop tôt (sinon l'interface apparaît avant le brouillard)
const pTween = (st, key, to, dur) => new Promise(r => { const prev = st.anim, waiters = [r]; if (prev) { if (prev.key === key) waiters.push(...prev.waiters); else prev.waiters.forEach(f => f()); }
  if (prev && prev.key === key && prev.to === to) { prev.waiters = waiters; return; } // même cible : on garde l'animation en cours
  st.anim = { key, from: st[key], to, dur, t0: performance.now(), waiters, done: () => waiters.forEach(f => f()) }; });
function pDrop() { PORTAL.hideUI = false; SCREEN && SCREEN.classList.remove('pIn'); SCREEN && SCREEN.classList.remove('pCov'); const st = PORTAL.st; if (st) cancelAnimationFrame(st.raf); PORTAL.el && PORTAL.el.remove(); PORTAL.el = PORTAL.st = null; PORTAL.busy = false; }
const pWait = ms => new Promise(r => { const t0 = performance.now(), tick = () => (PORTAL.st && PORTAL.st.skip) || performance.now() - t0 >= ms ? r() : setTimeout(tick, 40); tick(); });
const pClosed = () => !!(PORTAL.st && PORTAL.st.c >= 1 && !PORTAL.st.o);

// Fermer : les nuages recouvrent l'écran (résout quand tout est couvert)
PORTAL.close = (o = {}) => { if (!portalAllowed() || !SCREEN) return Promise.resolve(); PORTAL.busy = true; const st = pLayer(); st.logo = !!o.logo; st.o = 0;
  if (o.instant || st.c >= 1) { st.c = 1; return Promise.resolve(); } return pTween(st, 'c', 1, o.dur || 700); };
// Ouvrir : les nuages se déchirent depuis le centre ; toucher l'écran accélère
PORTAL.open = (o = {}) => { const st = PORTAL.st; if (!st) { PORTAL.busy = false; return Promise.resolve(); } st.c = 1; o.onStart && o.onStart();
  return pTween(st, 'o', 1, st.skip ? 320 : (o.dur || 1400)).then(() => { if (PORTAL.st === st) pDrop(); }); };

// Entrée sur la carte : la carte est déjà en place (un peu plus large) sous les nuages ; ils s'ouvrent et on zoome doucement
PORTAL.enter = (mode = 'sky', hold = 420) => {
  if (!portalAllowed() || !MV) return PORTAL.st ? PORTAL.open() : Promise.resolve();
  if (PORTAL.st && PORTAL.st.entering) return Promise.resolve();
  const mv = MV, at = [ST.me.pos[0], ST.me.pos[1] - 8], zoom = VENUE.zoom; mv.intro = null;
  SCREEN.classList.add('pIn'); PORTAL.hideUI = true;
  return PORTAL.close({ logo: mode === 'logo' }).then(() => { PORTAL.st.entering = true; mv.alive && mv.center(at, Math.max(mv.minS, zoom)); /* la carte est déjà à sa place, fixe : seul le brouillard bouge */ return pWait(hold); })
    .then(() => PORTAL.open({ onStart: () => { setTimeout(() => { PORTAL.hideUI = false; SCREEN.classList.remove('pIn'); SCREEN.classList.add('pShow'); setTimeout(() => SCREEN.classList.remove('pShow'), 1400); }, 380); } }))
    .then(() => { PORTAL.hideUI = false; SCREEN.classList.remove('pIn'); });
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
  const v = document.createElement('div'); v.id = 'portal'; v.className = 'veil'; v.setAttribute('aria-hidden', 'true'); v.innerHTML = `<img class="pre" src="${A}logo-glow.webp" alt="">`; /* halo fondu dans le fond : aucun carré visible */ SCREEN.append(v); PORTAL.busy = true; PORTAL.hideUI = true; SCREEN.classList.add('pIn'); /* interface de la carte cachée dès la première image */ // voile immédiat : aucun flash
  setTimeout(() => PORTAL.close({ logo: true, dur: 560 }).then(() => { const im = v.querySelector('img.pre'); im && im.remove(); v.classList.remove('veil');
    return ($('#mv') && MV) ? PORTAL.enter('logo', 650) : pWait(650).then(() => PORTAL.open()); }), 40); };
// 2. première visite d'un lieu (la carte vient d'être montée)
const _fxIntro = FX.intro, _fxLeave = FX.leave;
FX.intro = (mv, at, zoom) => { if (!portalAllowed()) return _fxIntro(mv, at, zoom); if (PORTAL.busy && !pClosed()) return; PORTAL.enter(PORTAL.pending || 'sky'); PORTAL.pending = null; };
// 3. changer de lieu : les nuages se ferment, on change de monde dessous, puis ils s'ouvrent sur le nouveau lieu
FX.leave = (cb) => { if (!portalAllowed()) return _fxLeave(cb);
  PORTAL.close({}).then(() => { cb(); setTimeout(() => { if (!PORTAL.st || PORTAL.st.entering) return; if (MV && MV.alive && $('#mv')) PORTAL.enter('sky'); else PORTAL.open(); }, 80); }); };
