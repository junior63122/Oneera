// ===== Portail ONEERA : on n'ouvre pas une carte, on entre dans un univers — et on en ressort par le même chemin =====
// Ouverture de l'app : l'écran de démarrage (logo sur bleu nuit) s'ouvre comme un portail au centre du « O », on traverse
// les nuages et on plonge sur le lieu, suspendu dans une mer de nuages, jusqu'à se poser exactement sur la carte.
// Changement de lieu : même plongée depuis le ciel. Sortie : le même film à l'envers (remontée dans les nuages, puis le logo).
// Variante « depuis le logo » réutilisable par les partenaires : window.ONEERA_PORTAL({ mode: 'logo' }).
const PORTAL = { busy: false, pending: null };
const pLogo = new Image(); pLogo.src = A + 'logo.webp';
const pImgs = {}; const pImg = (src) => pImgs[src] || (pImgs[src] = Object.assign(new Image(), { src, decoding: 'async' }));
const pE = { io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, in: k => k * k * k, out: k => 1 - Math.pow(1 - k, 3), o2: k => 1 - (1 - k) * (1 - k) };
const pClamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const portalAllowed = () => mapAnim() && !(navigator.webdriver && !/[?&]portal=1/.test(location.search));
// nuages en 3D (profondeur z : 1 = loin, 0 = sur la caméra)
const pCloud = Array.from({ length: 54 }, (_, i) => { const a = fxRnd(i * 3 + 1) * 6.283, r = .5 + fxRnd(i * 5 + 2) * 1.1; return { x: Math.cos(a) * r, y: Math.sin(a) * r * .85, z: fxRnd(i * 7 + 3), s: .7 + fxRnd(i * 11 + 4) * 1.1 }; });
// logo détouré (fondu circulaire) : son fond carré ne se voit jamais en grand
const pLogoM = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const done = () => { const g = c.getContext('2d'); g.clearRect(0, 0, 512, 512); g.drawImage(pLogo, 0, 0, 512, 512); g.globalCompositeOperation = 'destination-in'; const r = g.createRadialGradient(256, 256, 150, 256, 256, 256); r.addColorStop(0, '#000'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 512); c.ok = true; };
  if (pLogo.complete && pLogo.naturalWidth) done(); else pLogo.addEventListener('load', done); return c; })();
// nuage du portail : volumes doux entièrement contenus dans l'image (aucun bord coupé)
const pCloudSpr = {}; function pSpr(kind) { if (pCloudSpr[kind]) return pCloudSpr[kind];
  const c = document.createElement('canvas'); c.width = 360; c.height = 220; const g = c.getContext('2d');
  const col = { day: ['255,255,255', '214,226,248'], dusk: ['255,226,236', '214,170,206'], night: ['150,140,220', '70,62,140'] }[kind];
  const blob = (x, y, r, rgb, a) => { const gr = g.createRadialGradient(x, y - r * .2, r * .1, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(.6, `rgba(${rgb},${a * .8})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  [[180, 132, 70], [120, 128, 54], [240, 126, 58], [150, 104, 58], [210, 98, 52], [92, 140, 40], [270, 140, 40]].forEach(([x, y, r]) => blob(x + 6, y + 14, r, col[1], .5));
  [[180, 124, 70], [120, 122, 54], [240, 118, 58], [150, 96, 58], [210, 90, 52], [92, 134, 40], [270, 134, 40], [182, 80, 44]].forEach(([x, y, r]) => blob(x, y, r, col[0], .95));
  return (pCloudSpr[kind] = c); }
// plan aux bords fondus pendant la descente (les plans à fond transparent sont déjà détourés)
const pFeather = {}; function pMapSoft(img, night = 0) { const key = img.src + '|' + Math.round(night * 10); if (pFeather[key]) return pFeather[key]; if (!img.complete || !img.naturalWidth) return null;
  const c = document.createElement('canvas'), w = c.width = Math.min(1400, img.naturalWidth), h = c.height = Math.round(w * img.naturalHeight / img.naturalWidth), g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  if (night > .05) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(16,12,52,${.5 * night})`; g.fillRect(0, 0, w, h); }
  if (!VENUE.map.alpha) { g.globalCompositeOperation = 'destination-in'; const f = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.09, '#000'); gr.addColorStop(.91, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
    f(0, 0, w, 0); f(0, 0, 0, h); }
  return (pFeather[key] = c); }
const pStars = Array.from({ length: 90 }, (_, i) => [fxRnd(i * 17 + 1), fxRnd(i * 19 + 2), fxRnd(i * 23 + 3)]);

function portalPalette() {
  const nk = nightK((20 * 60 + nowMin()) % 1440), kind = nk > .5 ? 'night' : nk > .05 ? 'dusk' : 'day';
  return { nk, kind, spr: pSpr(kind), sea: fxSeaURL(kind),
    sky: kind === 'night' ? ['#0B0D2A', '#1E1A52', '#3A2C6E'] : kind === 'dusk' ? ['#5560B8', '#C98BC0', '#F6C2A6'] : ['#5D8DE8', '#A9C6F6', '#EAF1FD'],
    ray: kind === 'night' ? '170,180,255' : kind === 'dusk' ? '255,200,214' : '255,246,220' };
}
// Une image du film « entrée » à l'instant u (0 → 1). Le film « sortie » est le même, joué à l'envers.
function portalFrame(ctx, W, H, u, o) {
  const P = o.pal, logoMode = o.mode === 'logo', A0 = logoMode ? .26 : 0; // part du film consacrée au logo
  const now = performance.now() / 1000;
  // --- ciel (fond de toute la scène hors logo)
  const drawSky = (k) => {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.sky[0]); g.addColorStop(.55, P.sky[1]); g.addColorStop(1, P.sky[2]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (P.kind === 'night') { ctx.fillStyle = '#fff'; pStars.forEach(([x, y, r], i) => { ctx.globalAlpha = (.35 + .65 * Math.abs(Math.sin(now * (1 + r) + i))) * (1 - k * .8); ctx.fillRect(x * W, y * H * .7, 1 + r * 1.4, 1 + r * 1.4); }); ctx.globalAlpha = 1; }
    // soleil / lune et rayons divins
    const sx = W * .22, sy = H * .1; ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * .7); sg.addColorStop(0, `rgba(${P.ray},.55)`); sg.addColorStop(.25, `rgba(${P.ray},.16)`); sg.addColorStop(1, `rgba(${P.ray},0)`); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { const a = .9 + i * .16 + Math.sin(now * .3 + i) * .03, L = H * 1.6, wd = .035 + fxRnd(i + 3) * .05;
      const lg = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L); lg.addColorStop(0, `rgba(${P.ray},${.22 - i * .02})`); lg.addColorStop(1, `rgba(${P.ray},0)`);
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - wd) * L, sy + Math.sin(a - wd) * L); ctx.lineTo(sx + Math.cos(a + wd) * L, sy + Math.sin(a + wd) * L); ctx.closePath(); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  };
  // --- l'île : le lieu suspendu dans la mer de nuages, qui grandit jusqu'à la position exacte de la carte
  const drawIsland = (k) => {
    const img = o.map; const R = o.rect; const fw = R ? R.w : W * .9, fh = R ? R.h : fw * (img.naturalHeight / img.naturalWidth || .63);
    const fx0 = R ? R.x : (W - fw) / 2, fy0 = R ? R.y : (H - fh) / 2;
    const e = pE.in(pClamp(k)), sc = .07 + .93 * e, w = fw * sc, h = fh * sc;
    const cx = W / 2 + ((fx0 + fw / 2) - W / 2) * e, cy = H * .54 + ((fy0 + fh / 2) - H * .54) * e, x = cx - w / 2, y = cy - h / 2;
    // mer de nuages autour de l'île (même matière que sous la carte)
    if (o.seaImg && o.seaImg.complete && e > .02) { ctx.save(); ctx.globalAlpha = pClamp((e - .02) * 2.2) * (P.kind === 'night' ? .55 : 1); const ts = 600 * (.35 + .65 * e), pat = ctx.createPattern(o.seaImg, 'repeat'); const m = new DOMMatrix([ts / 600, 0, 0, ts / 600, cx, cy]); pat.setTransform && pat.setTransform(m); ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const soft = pMapSoft(img, P.nk); if (soft) { ctx.save(); ctx.globalAlpha = pClamp(k * 4); ctx.shadowColor = 'rgba(10,14,40,.35)'; ctx.shadowBlur = 40 * sc; ctx.shadowOffsetY = 18 * sc; ctx.drawImage(soft, x, y, w, h); ctx.restore(); }
  };
  // --- traversée des nuages (ils foncent vers la caméra), plus dense au milieu du film
  const drawClouds = (k, dens) => {
    const travel = k * 2.4; pCloud.forEach((c) => { let z = ((c.z - travel) % 1 + 1) % 1; z = .06 + z * .94; const sc = 1 / z;
      const px = W / 2 + c.x * W * .42 * sc, py = H * .54 + c.y * H * .34 * sc, S = W * .3 * c.s * sc;
      const a = .9 * pClamp((1 - z) * 2.4) * pClamp((z - .06) * 4) * dens; if (a < .02 || px + S < 0 || px - S > W || py + S < 0 || py - S > H) return;
      ctx.globalAlpha = a; ctx.drawImage(P.spr, px - S / 2, py - S * .3, S, S * .6); }); ctx.globalAlpha = 1;
    if (dens > .3) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${P.ray},${(P.kind === 'night' ? .07 : .18) * dens})`; ctx.lineWidth = 1.4; // traînées de vitesse
      for (let i = 0; i < 26; i++) { const a = fxRnd(i * 9) * 6.283, ph = ((k * 3 + fxRnd(i * 4)) % 1), r0 = W * (.15 + ph * .9), r1 = r0 + W * .12 * ph; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H * .54 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, H * .54 + Math.sin(a) * r1); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over'; }
  };
  if (logoMode && u < A0) { // ---------- 1. le portail s'ouvre au centre du logo
    const k = u / A0; ctx.fillStyle = '#010922'; ctx.fillRect(0, 0, W, H);
    const r = pE.in(pClamp((k - .25) / .75)) * Math.hypot(W, H) * .62;
    if (r > 1) { ctx.save(); ctx.beginPath(); ctx.ellipse(W / 2, H / 2, r * .78, r, -.35, 0, 7); ctx.clip(); drawSky(0); drawIsland(0); drawClouds(0, 1); ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(W / 2, H / 2, r * .7, W / 2, H / 2, r * 1.15); gr.addColorStop(0, 'rgba(120,170,255,0)'); gr.addColorStop(.5, 'rgba(150,190,255,.55)'); gr.addColorStop(1, 'rgba(120,170,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    // le logo, identique à l'écran de démarrage, qui s'agrandit en traversant l'écran
    const L0 = 180, sl = 1 + pE.in(pClamp((k - .12) / .88)) * 9, ls = L0 * sl, breathe = 1 + Math.sin(now * 3) * .012 * (1 - k);
    if (pLogo.complete) { ctx.globalAlpha = pClamp(1 - (k - .55) / .45); ctx.drawImage(sl > 1.15 && pLogoM.ok ? pLogoM : pLogo, W / 2 - ls * breathe / 2, H / 2 - ls * breathe / 2, ls * breathe, ls * breathe); ctx.globalAlpha = 1; }
    return;
  }
  // ---------- 2. descente : ciel, rayons, nuages, l'île qui approche ; 3. on se pose sur la carte
  const k = logoMode ? (u - A0) / (1 - A0) : u;
  drawSky(k);
  drawIsland(pClamp((k - .08) / .92));
  drawClouds(k, k < .7 ? 1 : pClamp(1 - (k - .7) / .3));
  // voile final : la mer de nuages se dissipe et laisse place à la vraie carte
  if (logoMode && k < .08) { ctx.fillStyle = `rgba(150,190,255,${(1 - k / .08) * .5})`; ctx.fillRect(0, 0, W, H); }
}

// Lecture du film (entrée : 0 → 1, sortie : 1 → 0). Le dernier quart de l'entrée s'efface sur la vraie carte.
PORTAL.play = (o) => new Promise((resolve) => {
  if (!portalAllowed() || !SCREEN) { resolve(); return; }
  PORTAL.busy = true; const pre = document.getElementById('portal'); const el = pre || document.createElement('div'); el.id = 'portal'; el.setAttribute('aria-hidden', 'true');
  const cv = document.createElement('canvas'); el.append(cv); if (!pre) SCREEN.append(el); setTimeout(() => { const im = el.querySelector('img.pre'); im && im.remove(); }, 60);
  const W = SCREEN.clientWidth, H = SCREEN.clientHeight, dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const pal = portalPalette(), seaImg = pal.sea ? pImg(pal.sea) : null, map = pImg(VENUE.map.src);
  const dur = o.dur || (o.dir === 'out' ? (o.mode === 'logo' ? 1700 : 1300) : (o.mode === 'logo' ? 3400 : 2500));
  let t0 = null, stop = false, raf = 0;
  const finish = () => { if (stop) return; stop = true; cancelAnimationFrame(raf); PORTAL.busy = false;
    if (o.dir === 'in') { el.classList.add('fade'); setTimeout(() => el.remove(), 420); } else setTimeout(() => el.remove(), 40);
    resolve(); };
  const step = (ts) => { if (stop) return; if (t0 == null) t0 = ts; const p = pClamp((ts - t0) / dur), u = o.dir === 'out' ? 1 - pE.io(p) : pE.o2(p);
    const rect = o.rect ? o.rect() : null; ctx.clearRect(0, 0, W, H); try { portalFrame(ctx, W, H, u, { mode: o.mode, pal, map, seaImg, rect }); } catch (_) {}
    if (o.dir === 'in' && p > .78 && !el.classList.contains('fade')) { el.classList.add('fade'); o.onReveal && o.onReveal(); }
    if (p >= 1) { finish(); return; } raf = requestAnimationFrame(step); };
  // toucher l'écran = passer (on garde la continuité : fondu rapide)
  el.addEventListener('pointerdown', () => { o.onReveal && !el.classList.contains('fade') && o.onReveal(); finish(); }, { once: true });
  raf = requestAnimationFrame(step);
});
// rectangle exact de la carte à l'écran (pour se poser dessus sans saut)
const portalMapRect = () => { if (!MV || !MV.alive) return null; const a = MV.proj([0, 0]), b = MV.proj([100, 100]); return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] }; };

// Entrée sur la carte (ouverture de l'app ou nouveau lieu) puis descente sur sa position
PORTAL.enter = (mode = 'sky') => {
  if (!portalAllowed() || !MV) return Promise.resolve();
  const mv = MV, at = [ST.me.pos[0], ST.me.pos[1] - 8], zoom = VENUE.zoom; mv.center([50, 50], mv.minS); mv.intro = null;
  SCREEN.classList.add('pIn');
  return PORTAL.play({ mode, dir: 'in', rect: portalMapRect, onReveal: () => { SCREEN.classList.remove('pIn'); SCREEN.classList.add('pShow'); setTimeout(() => SCREEN.classList.remove('pShow'), 1400); setTimeout(() => mv.alive && mv.flyTo(at, zoom, 1500), 120); } })
    .then(() => SCREEN.classList.remove('pIn'));
};
// Sortie : on remonte dans les nuages (et jusqu'au logo pour quitter l'univers)
PORTAL.exit = (mode = 'sky') => {
  if (!portalAllowed() || !MV || !MV.alive || !document.body.contains(MV.host)) return Promise.resolve();
  MV.ov.style.opacity = '0'; MV.flyTo(MV.centerPct(), MV.minS, 380);
  return new Promise(r => setTimeout(r, 380)).then(() => PORTAL.play({ mode, dir: 'out', rect: portalMapRect }));
};
// Ouverture d'un écran sans carte (accueil) : le portail s'ouvre puis se dissipe
PORTAL.reveal = () => portalAllowed() ? PORTAL.play({ mode: 'logo', dir: 'in', dur: 2600 }) : Promise.resolve();
window.ONEERA_PORTAL = (o = {}) => PORTAL.play({ mode: o.mode || 'logo', dir: o.dir || 'in', dur: o.dur, rect: portalMapRect });

// ---------- branchements ----------
// 1. ouverture de l'app : une fois par lancement
PORTAL.launch = () => { let seen = false; try { seen = sessionStorage.getItem('oneera.portal') === '1'; sessionStorage.setItem('oneera.portal', '1'); } catch (_) {}
  if (seen || !portalAllowed() || !SCREEN) return;
  // voile immédiat (avant le premier affichage) : exactement l'écran de démarrage, aucun flash de la carte
  const v = document.createElement('div'); v.id = 'portal'; v.setAttribute('aria-hidden', 'true'); v.innerHTML = `<img class="pre" src="${A}logo.webp" alt="">`; SCREEN.append(v); PORTAL.busy = true;
  setTimeout(() => { PORTAL.busy = false; if ($('#mv') && MV) PORTAL.enter('logo'); else PORTAL.reveal(); }, 30); };
// 2. première visite d'un lieu : la descente « vue des Dieux » devient le portail complet
const _fxIntro = FX.intro, _fxLeave = FX.leave;
FX.intro = (mv, at, zoom) => { if (PORTAL.busy) return; if (!portalAllowed()) return _fxIntro(mv, at, zoom); PORTAL.enter(PORTAL.pending || 'sky'); PORTAL.pending = null; };
// 3. changer de lieu : on remonte dans les nuages, on change de monde, on redescend
FX.leave = (cb) => { if (!portalAllowed()) return _fxLeave(cb); if (!MV || !MV.alive || !document.body.contains(MV.host)) { cb(); return; }
  PORTAL.exit('sky').then(() => { const id0 = VENUE.id; cb(); if ((VENUE.id !== id0 || $('#mv')) && !PORTAL.busy && MV && $('#mv')) PORTAL.enter('sky'); }); };
