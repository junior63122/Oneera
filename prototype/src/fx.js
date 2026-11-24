// ===== Carte vivante =====
// Ciel et nuages autour du plan (pas de fond uni), vrai jour/nuit (éclairages des scènes, bars et allées, pas un simple filtre),
// foule animée qui suit les chiffres d'affluence, passants sur les allées, flux animés (tableau de bord), ambulance en route,
// feu d'artifice, reflets sur l'eau, entrée et sortie « vue des Dieux » (on descend des nuages sur la carte).
const FXRM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const FX = { vehicles: [], rockets: [], c: null, last: 0 };
const mapMode = () => ST.mapMode || 'auto';
const mapAnim = () => ST.mapAnim !== false && !FXRM;
const fxRnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fxEase = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
// 0 = plein jour, 1 = pleine nuit ; crépuscule progressif (Cannes en juillet : coucher ≈ 21 h 15)
function nightK(clk) {
  if (mapMode() === 'day') return 0; if (mapMode() === 'night') return 1;
  const h = (((clk % 1440) + 1440) % 1440) / 60;
  if (h >= 21.6 || h < 5.2) return 1; if (h >= 20.4) return (h - 20.4) / 1.2; if (h < 6.4) return 1 - (h - 5.2) / 1.2; return 0;
}
const fxSprites = (() => {
  const make = col => { const c = document.createElement('canvas'); c.width = 256; c.height = 150; const g = c.getContext('2d');
    [[66, 98, 54], [118, 74, 66], [172, 90, 58], [212, 108, 38], [40, 112, 34], [126, 110, 60], [92, 112, 48]].forEach(([x, y, r]) => {
      const gr = g.createRadialGradient(x, y - r * .25, r * .15, x, y, r); gr.addColorStop(0, col(1)); gr.addColorStop(.7, col(.9)); gr.addColorStop(1, col(0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }); return c; };
  return { day: make(a => `rgba(255,255,255,${a})`), dusk: make(a => `rgba(255,214,228,${a})`), night: make(a => `rgba(104,96,178,${a})`), shadow: make(a => `rgba(18,22,58,${a})`) };
})();
function fxData() {
  if (FX.c && FX.c.k === VENUE.id) return FX.c;
  const stIds = (VENUE.stages || []).map(s => s[0]);
  const lights = POIS.filter(o => o.at).map(o => ({ at: o.at, id: o.id, kind: stIds.includes(o.id) ? 'stage' : o.bar ? 'bar' : 'lamp' }));
  const adj = {}, lamps = [];
  EDGES.forEach((e, i) => { const [a, b] = edgePair(e); if (!NODES[a] || !NODES[b]) return; (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a);
    const p = NODES[a], q = NODES[b], L = Math.hypot(q[0] - p[0], (q[1] - p[1]) / MAP_ASPECT), n = Math.max(1, Math.round(L / 2.6));
    for (let j = 0; j < n; j++) { const f = (j + .5) / n; lamps.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, fxRnd(i * 31 + j)]); } });
  const keys = Object.keys(adj), walkers = [];
  const nW = VENUE.id === 'bdf' ? 34 : 14;
  for (let i = 0; i < nW && keys.length; i++) { const a = keys[Math.floor(fxRnd(i * 7) * keys.length)], nb = adj[a]; walkers.push({ a, b: nb[Math.floor(fxRnd(i * 13) * nb.length)], f: fxRnd(i * 3), sp: .7 + fxRnd(i * 17) * .6, c: i }); }
  let glints = [];
  if (VENUE.water) { const P = VENUE.water, xs = P.map(p => p[0]), ys = P.map(p => p[1]); const inP = (x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; };
    for (let i = 0; glints.length < 46 && i < 600; i++) { const x = Math.min(...xs) + fxRnd(i * 5 + 1) * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + fxRnd(i * 9 + 2) * (Math.max(...ys) - Math.min(...ys)); if (inP(x, y)) glints.push([x, y, fxRnd(i)]); } }
  FX.c = { k: VENUE.id, lights, adj, lamps, walkers, glints }; return FX.c;
}
const PEOPLE = ['#2B2F45', '#4F6BF5', '#E5484D', '#F5B841', '#0E9F8A', '#B58CF5', '#F26B6B', '#FFFFFF', '#1D1F2C', '#86A6F5'];
function fxGlow(ctx, x, y, r, rgb, a) { if (r < 1 || a <= 0) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.35, `rgba(${rgb},${a * .45})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
function polyAt(pts, u) { // point à la fraction u (0..1) de la longueur d'une polyligne, + direction
  let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], (pts[i][1] - pts[i - 1][1]) / MAP_ASPECT); seg.push(d); tot += d; }
  let r = u * tot; for (let i = 0; i < seg.length; i++) { if (r <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, r / seg[i]) : 0, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])]; } r -= seg[i]; }
  return [...pts[pts.length - 1], 0];
}
const fxSea = {};
function fxSeaURL(kind) { // mer de nuages en volume (ombre, corps, reflets) : aucun aplat de couleur autour des plans détourés
  if (fxSea[kind] !== undefined) return fxSea[kind]; const N = 600, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const pal = { day: ['#CFDDF7', 'rgba(120,140,200,', 'rgba(255,255,255,', 'rgba(255,255,255,'], dusk: ['#D9A9C8', 'rgba(120,80,140,', 'rgba(255,214,228,', 'rgba(255,240,235,'], night: ['#2B2660', 'rgba(8,6,30,', 'rgba(132,122,208,', 'rgba(190,180,245,'] }[kind];
  const blob = (col, cx, cy, r, a) => { const g = x.createRadialGradient(cx, cy - r * .2, r * .1, cx, cy, r); g.addColorStop(0, col + a + ')'); g.addColorStop(.65, col + a * .85 + ')'); g.addColorStop(1, col + '0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  const wrap = f => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) f(dx, dy); };
  x.fillStyle = pal[0]; x.fillRect(0, 0, N, N);
  const C = Array.from({ length: 34 }, (_, i) => [fxRnd(i * 3 + 2) * N, fxRnd(i * 7 + 3) * N, 60 + fxRnd(i * 5 + 1) * 90]);
  C.forEach(([cx, cy, r]) => wrap((dx, dy) => blob(pal[1], cx + dx + r * .15, cy + dy + r * .35, r * 1.15, .35)));
  C.forEach(([cx, cy, r], i) => wrap((dx, dy) => { for (let k = 0; k < 4; k++) blob(pal[2], cx + dx + (fxRnd(i * 13 + k) - .5) * r * 1.4, cy + dy + (fxRnd(i * 17 + k) - .5) * r * .5, r * (.55 + fxRnd(i + k * 7) * .4), .95); }));
  C.forEach(([cx, cy, r], i) => wrap((dx, dy) => blob(pal[3], cx + dx - r * .2, cy + dy - r * .25, r * .45, kind === 'night' ? .5 : .7)));
  try { fxSea[kind] = c.toDataURL('image/webp', .85); } catch (_) { fxSea[kind] = ''; } return fxSea[kind];
}
FX.draw = (mv, now) => {
  const cv = mv.fx; if (!cv) return;
  const w = mv.vw, h = mv.vh, dpr = Math.min(2, devicePixelRatio || 1), px0 = mv.tiltTo || mv.tilt ? Math.round(w * .6) : 0, py0 = mv.tiltTo || mv.tilt ? Math.round(h * 1.1) : 0, cw = w + 2 * px0, ch = h + py0;
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.style.left = -px0 + 'px'; cv.style.top = -py0 + 'px'; }
  let ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, px0 * dpr, py0 * dpr); ctx.clearRect(-px0, -py0, cw, ch);
  const top = mv.fx2; if (top && (top.width !== Math.round(w * dpr) || top.height !== Math.round(h * dpr))) { top.width = Math.round(w * dpr); top.height = Math.round(h * dpr); top.style.width = w + 'px'; top.style.height = h + 'px'; }
  const cfg = (mv.fxCfg && mv.fxCfg()) || {}, anim = mapAnim(), t = anim ? now / 1000 : 12;
  const dt = Math.min(.05, Math.max(0, (now - (mv._fxLast || now)) / 1000)); mv._fxLast = now;
  const minute = cfg.minute != null ? cfg.minute : nowMin(), clk = (20 * 60 + minute) % 1440, nk = cfg.night != null ? cfg.night : nightK(clk), dk = Math.max(0, 1 - Math.abs(nk - .5) * 2.2);
  // plan : éclairage de nuit (pas un simple filtre : les lumières sont dessinées plus bas)
  const f = (nk > .01 ? `brightness(${(1 - .56 * nk).toFixed(2)}) saturate(${(1 + .35 * nk).toFixed(2)}) hue-rotate(${(-16 * nk).toFixed(0)}deg) contrast(${(1 + .1 * nk).toFixed(2)})` : '') + (cfg.filter ? ' ' + cfg.filter : '');
  if (mv._f !== f) { mv.base.style.filter = f; mv._f = f; }
  const nkr = Math.round(nk * 20) / 20; if (mv._nk !== nkr) { mv._nk = nkr; mv.host.classList.toggle('nite', nk > .5);
    const sk = nk > .5 ? 'night' : nk > .05 ? 'dusk' : 'day', sea = fxSeaURL(sk); mv.host.style.backgroundImage = (sea ? `url(${sea}),` : '') + (nk > .5 ? `radial-gradient(120% 80% at 50% 0%,#2C2468 0%,#151436 55%,#0B0B22 100%)` : nk > .05 ? `linear-gradient(180deg,#7E86D8,#E7A9C4 60%,#F6C7A8)` : `linear-gradient(180deg,#A9C4F5,#DCE6FB 55%,#F6E1EE)`); mv.host.style.backgroundSize = sea ? '600px 600px, 100% 100%' : ''; }
  const bp = `${Math.round(mv.tx * .3)}px ${Math.round(mv.ty * .3)}px, 0 0`; if (mv._bp !== bp) { mv._bp = bp; mv.host.style.backgroundPosition = bp; }
  const D0 = fxData(), C00 = mv.proj([0, 0]), C10 = mv.proj([100, 0]), C11 = mv.proj([100, 100]), C01 = mv.proj([0, 100]), Wm = mv.W * mv.s, Hm = mv.H * mv.s, zs = Math.max(.55, Math.min(1.7, mv.s / (VENUE.zoom || .5)));
  const vis = (x, y, m = 80) => x > -m - px0 && y > -m - py0 && x < w + px0 + m && y < h + m;
  // 1. ombres de nuages qui glissent sur le site (jour)
  if (nk < .9 && cfg.shadows !== false) { ctx.save(); ctx.translate(C00[0], C00[1]); ctx.rotate(mv.rot); ctx.beginPath(); ctx.rect(0, 0, Wm, Hm); ctx.clip(); ctx.globalAlpha = .09 * (1 - nk);
    for (let i = 0; i < 4; i++) { const sw = Wm * .42, sh = sw * .58, u = ((t * .006 + i * .27 + fxRnd(i) * .2) % 1.4) - .2; ctx.drawImage(fxSprites.shadow, u * Wm - sw / 2, (.15 + fxRnd(i + 9) * .7) * Hm - sh / 2, sw, sh); }
    ctx.restore(); }
  // 2. eau : scintillements le jour, reflets colorés la nuit
  D0.glints.forEach(([gx, gy, r], i) => { const [px, py] = mv.proj([gx, gy]); if (!vis(px, py)) return; const a = Math.max(0, Math.sin(t * (1.6 + r * 2) + i * 2.1)); if (a < .35) return;
    if (nk < .5) { ctx.globalAlpha = (a - .35) * 1.3 * (1 - nk); ctx.fillStyle = '#fff'; const s = 1.5 + 2.5 * zs * a; ctx.fillRect(px - s, py - .6, 2 * s, 1.2); ctx.fillRect(px - .6, py - s * .6, 1.2, s * 1.2); }
    else { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (a - .35) * nk * .7; ctx.fillStyle = ['#FF5FD2', '#6FD8FF', '#FFC35F'][i % 3]; ctx.fillRect(px - 7 * zs, py, 14 * zs, 1.4); ctx.globalCompositeOperation = 'source-over'; } });
  ctx.globalAlpha = 1;
  // 3. lumières de nuit : allées (guirlandes), bars (chaleureux), scènes (couleur au tempo + faisceaux ou lasers)
  if (nk > .02 && cfg.lights !== false) {
    ctx.globalCompositeOperation = 'lighter';
    const club = VENUE.kind !== 'Festival plein air' && VENUE.id !== 'bdf';
    D0.lamps.forEach(([lx, ly, r], i) => { const [px, py] = mv.proj([lx, ly]); if (!vis(px, py)) return; const tw = .65 + .35 * Math.sin(t * (1 + r * 2) + i);
      fxGlow(ctx, px, py, 16 * zs, club ? '170,120,255' : '255,196,120', .32 * nk * tw); ctx.fillStyle = `rgba(255,236,200,${.85 * nk * tw})`; ctx.beginPath(); ctx.arc(px, py, 1.3 * Math.min(1.4, zs), 0, 7); ctx.fill(); });
    const bpm = 2.07; // 124 BPM
    D0.lights.forEach((L, i) => { const [px, py] = mv.proj(L.at); if (!vis(px, py, 400)) return;
      if (L.kind === 'bar') { fxGlow(ctx, px, py, mv.mPx(9) + 26, '255,170,80', .45 * nk); return; }
      if (L.kind === 'lamp') { fxGlow(ctx, px, py, mv.mPx(4) + 18, '255,220,170', .22 * nk); return; }
      const live = LINEUP.some(l => l.s === L.id && isLive(l)) || !LINEUP.some(l => l.s === L.id); const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * bpm)), 6);
      const hue = (t * 40 + i * 120) % 360, col = `hsl(${hue},95%,62%)`, rgb = (() => { const c = Math.round(hue / 60) % 6; return ['255,80,200', '255,90,90', '255,200,90', '90,255,170', '90,200,255', '170,110,255'][c]; })();
      fxGlow(ctx, px, py, mv.mPx(club ? 16 : 26) + 40, rgb, (live ? .5 + .35 * beat : .25) * nk);
      if (!live) return;
      const len = Math.min(h * .55, mv.mPx(club ? 22 : 40) + 60);
      for (let k = 0; k < (club ? 6 : 4); k++) {
        const ang = -Math.PI / 2 + Math.sin(t * (club ? 1.3 : .55) + k * 1.7) * (club ? 1.25 : .7) + (k - 1.5) * .22, ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len * .8;
        if (club) { ctx.strokeStyle = k % 2 ? `rgba(80,255,140,${.55 * nk})` : `rgba(255,60,200,${.5 * nk})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke(); continue; }
        const g = ctx.createLinearGradient(px, py, ex, ey); g.addColorStop(0, `hsla(${(hue + k * 50) % 360},95%,65%,${.42 * nk})`); g.addColorStop(1, `hsla(${(hue + k * 50) % 360},95%,65%,0)`);
        const sp = .085, lx = px + Math.cos(ang - sp) * len, ly = py + Math.sin(ang - sp) * len * .8, rx = px + Math.cos(ang + sp) * len, ry = py + Math.sin(ang + sp) * len * .8;
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lx, ly); ctx.lineTo(rx, ry); ctx.closePath(); ctx.fill(); }
      void col; });
    ctx.globalCompositeOperation = 'source-over';
  }
  // 4. foule : nombre de silhouettes = affluence de la zone (même modèle que le tableau de bord), danse au tempo devant une scène en direct
  if (cfg.crowd !== false) {
    const pr = Math.max(1.2, Math.min(3.6, mv.mPx(.55))), stageIds = (VENUE.stages || []).map(s => s[0]);
    ZONES.forEach((z, zi) => { const occ = occAt(z, minute); if (occ < 3) return; const n = Math.round(Math.min(95, occ / z.cap * (12 + z.r * 5.5))), R = z.r * .95, RY = z.r * MAP_ASPECT * .58;
      const dance = /fosse|scene|piste/.test(z.id) && LINEUP.some(l => stageIds.includes(l.s) && isLive(l));
      for (let i = 0; i < n; i++) { const a = fxRnd(zi * 97 + i) * 6.283 + t * .04 * (fxRnd(i + zi) - .5), rr = Math.sqrt(fxRnd(zi * 53 + i * 7));
        let [px, py] = mv.proj([z.at[0] + Math.cos(a) * rr * R + Math.sin(t * .5 + i) * .12, z.at[1] + Math.sin(a) * rr * RY + Math.cos(t * .45 + i * 1.3) * .1]); if (!vis(px, py, 10)) continue;
        const hop = dance ? Math.pow(Math.abs(Math.sin(t * Math.PI * 2.07 + i * .7)), 3) * pr * 1.4 : 0;
        ctx.fillStyle = 'rgba(15,18,40,.28)'; ctx.beginPath(); ctx.ellipse(px, py + pr * .9, pr * 1.1, pr * .45, 0, 0, 7); ctx.fill();
        ctx.fillStyle = PEOPLE[(i + zi * 3) % PEOPLE.length]; ctx.globalAlpha = nk > .5 ? .75 : .92; ctx.beginPath(); ctx.arc(px, py - hop, pr, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        if (nk > .3 && fxRnd(i * 11 + zi) < .1) { const fl = Math.max(0, Math.sin(t * 3 + i * 5)); if (fl > .7) { ctx.globalCompositeOperation = 'lighter'; fxGlow(ctx, px, py - hop - pr * 2, pr * 5, '235,235,255', (fl - .7) * 2.2 * nk); ctx.globalCompositeOperation = 'source-over'; } } }
    });
    // passants sur les allées (vitesse de marche réaliste, accélérée ×3 pour la démo)
    const crowdK = Math.min(1, presentAt(minute) / (EVENT.capacity || 1000) * 1.6);
    D0.walkers.forEach((wk, i) => { if (i / D0.walkers.length > crowdK) return; const A = NODES[wk.a], B = NODES[wk.b]; if (!A || !B) return;
      const L = Math.max(.2, Math.hypot(B[0] - A[0], (B[1] - A[1]) / MAP_ASPECT)); if (anim) wk.f += dt * wk.sp * 1.4 * 3 / PCT_TO_M / L;
      if (wk.f >= 1) { wk.f = 0; const nb = (D0.adj[wk.b] || [wk.a]).filter(x => x !== wk.a); wk.a = wk.b; wk.b = nb.length ? nb[Math.floor(fxRnd(i + now) * nb.length) % nb.length] : wk.a; }
      const [px, py] = mv.proj([A[0] + (B[0] - A[0]) * wk.f, A[1] + (B[1] - A[1]) * wk.f]); if (!vis(px, py, 10)) return; const step = Math.abs(Math.sin(t * 9 + i)) * pr * .5;
      ctx.fillStyle = 'rgba(15,18,40,.25)'; ctx.beginPath(); ctx.ellipse(px, py + pr * .9, pr, pr * .4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = PEOPLE[(i * 3 + 1) % PEOPLE.length]; ctx.beginPath(); ctx.arc(px, py - step, pr * .95, 0, 7); ctx.fill(); });
  }
  // 5. flux (tableau de bord) : particules le long des trajets, quantité = volume mesuré
  if (cfg.flows) { const kV = VENUE.id === 'bdf' ? 1 : .25;
    FLOWS.forEach(([seq, v], fi) => { const vol = flowVol(v * kV, minute); if (vol < 5) return; const pts = (seq.match(/R2|[A-Z]/g) || []).map(k => NODES[k]).filter(Boolean); if (pts.length < 2) return;
      const n = Math.min(34, Math.round(vol / 10) + 3), sp = .045;
      if (nk > .3) ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) { const u = ((t * sp + i / n + fi * .13) % 1), [ax, ay, ang] = polyAt(pts, u), [px, py] = mv.proj([ax, ay]); if (!vis(px, py, 10)) continue;
        const tl = 9 + 6 * zs; ctx.strokeStyle = nk > .3 ? 'rgba(120,230,255,.9)' : 'rgba(40,90,230,.85)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px - Math.cos(ang) * tl, py - Math.sin(ang) * tl * .8); ctx.lineTo(px, py); ctx.stroke(); ctx.fillStyle = nk > .3 ? '#E6FBFF' : '#fff'; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 7); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over'; });
  }
  // calque du dessus (au-dessus des marqueurs) : secours, feu d'artifice, entrée/sortie
  if (top) { ctx = top.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); }
  const visS = (x, y, m = 80) => x > -m && y > -m && x < w + m && y < h + m;
  // 6. secours en route vers une alerte (ambulance si médical, agent sinon)
  FX.vehicles = FX.vehicles.filter(v => { const r = ST.reports.find(x => x.id === v.rid); return r && ['Prise en charge', 'En route', 'Sur place'].includes(r.status); });
  FX.vehicles.forEach(v => { const r = ST.reports.find(x => x.id === v.rid), k = r.status === 'Sur place' ? 1 : Math.min(1, (now - v.t0) / v.dur), [ax, ay, ang0] = polyAt(v.pts, fxEase(k)), [px, py] = mv.projS([ax, ay]), ang = ang0 + mv.rot; if (!visS(px, py)) return;
    const blink = Math.sin(now / 90) > 0, sc = Math.max(1.15, Math.min(1.8, zs * 1.3));
    ctx.font = '800 11px system-ui,sans-serif'; const lbl = r.status === 'Sur place' ? 'Secours sur place' : 'Secours en route', lw = ctx.measureText(lbl).width + 14; ctx.fillStyle = v.kind === 'amb' ? '#E5484D' : '#E58A00'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - lw / 2, py - 44 * sc, lw, 18, 9) : ctx.rect(px - lw / 2, py - 44 * sc, lw, 18); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(lbl, px, py - 44 * sc + 13); ctx.textAlign = 'start';
    ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc);
    if (v.kind === 'amb') { ctx.fillStyle = 'rgba(15,18,40,.3)'; ctx.beginPath(); ctx.ellipse(0, 7, 17, 5, 0, 0, 7); ctx.fill();
      const fl = Math.cos(ang) < 0 ? -1 : 1; ctx.scale(fl, 1);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#C9CDE0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-15, -11, 30, 16, 3) : ctx.rect(-15, -11, 30, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9FC2FF'; ctx.fillRect(7, -9, 7, 6); ctx.fillStyle = '#E5484D'; ctx.fillRect(-15, -1, 30, 3); ctx.fillRect(-6, -9, 3, 9); ctx.fillRect(-9, -6, 9, 3);
      ctx.fillStyle = '#2B2F45'; ctx.beginPath(); ctx.arc(-8, 5.5, 3, 0, 7); ctx.arc(9, 5.5, 3, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; fxGlow(ctx, blink ? -4 : 4, -13, 14, blink ? '255,60,60' : '60,120,255', .9); ctx.fillStyle = blink ? '#FF5A5A' : '#5A8CFF'; ctx.fillRect(blink ? -6 : 2, -14, 4, 3); }
    else { const p = (now / 700) % 1; ctx.strokeStyle = `rgba(229,138,0,${1 - p})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 6 + p * 16, 0, 7); ctx.stroke(); ctx.fillStyle = '#E58A00'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore(); });
  // 7. feu d'artifice
  if (FX.rockets.length) { ctx.globalCompositeOperation = 'lighter';
    FX.rockets = FX.rockets.filter(rk => now - rk.t0 < 3200);
    FX.rockets.forEach(rk => { const tau = (now - rk.t0) / 1000; if (tau < 0) return; const [bx, by] = mv.projS(rk.at), H = rk.h * Math.max(.7, Math.min(1.4, zs)), cx = bx + rk.dx, cy = by - H;
      if (tau < .9) { const e = 1 - Math.pow(1 - tau / .9, 2), yy = by - H * e; ctx.strokeStyle = 'rgba(255,220,160,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + rk.dx * e, yy); ctx.lineTo(bx + rk.dx * e * .9, yy + 14); ctx.stroke(); return; }
      const s = tau - .9, a = Math.max(0, 1 - s / 2.1); if (s < .35) fxGlow(ctx, cx, cy, 160 * zs, rk.rgb, .35 * (1 - s / .35));
      for (let i = 0; i < 90; i++) { const an = i / 90 * 6.283 + rk.seed, v = (60 + 40 * fxRnd(i + rk.seed * 9)) * Math.max(.7, Math.min(1.3, zs)), e = 1 - Math.exp(-3 * s), x = cx + Math.cos(an) * v * e, y = cy + Math.sin(an) * v * e + 22 * s * s;
        ctx.fillStyle = `rgba(${rk.rgb},${a})`; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); if (i % 3 === 0) fxGlow(ctx, x, y, 10, rk.rgb, a * .55); } });
    ctx.globalCompositeOperation = 'source-over'; }
  // 8. nuages qui encadrent le site (bornes de la carte) avec léger effet de profondeur
  if (cfg.clouds !== false) {
    const sz = Math.max(150, Math.min(420, Wm * .09)), par = [(w / 2 - (C00[0] + C11[0]) / 2) * .06, (h / 2 - (C00[1] + C11[1]) / 2) * .06], rc = Math.cos(mv.rot), rn = Math.sin(mv.rot), N = (x, y) => [x * rc - y * rn, x * rn + y * rc];
    const spr = nk > .5 ? fxSprites.night : dk > .3 ? fxSprites.dusk : fxSprites.day;
    const edge = (ax, ay, bx, by, out, seed) => { const len = Math.hypot(bx - ax, by - ay), n = Math.max(4, Math.min(36, Math.ceil(len / (sz * .5))));
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i <= n; i++) { const u = (i + ((t * .01 + fxRnd(seed + i)) % 1) * .6) / n, wob = Math.sin(t * .2 + i + seed) * sz * .04;
        const cx = ax + (bx - ax) * u + out[0] * (sz * (ring ? .55 : .05) + wob) + par[0] * (1 + ring), cy = ay + (by - ay) * u + out[1] * (sz * (ring ? .55 : .05) + wob) + par[1] * (1 + ring), S = sz * (ring ? 1.35 : 1) * (.8 + fxRnd(seed * 3 + i) * .5);
        if (cx + S < -px0 || cy + S < -py0 || cx - S > w + px0 || cy - S > h) continue; ctx.globalAlpha = ring ? .97 : .9; ctx.drawImage(spr, cx - S / 2, cy - S * .3, S, S * .6); } };
    edge(C00[0], C00[1], C10[0], C10[1], N(0, -1), 1); edge(C01[0], C01[1], C11[0], C11[1], N(0, 1), 2); edge(C00[0], C00[1], C01[0], C01[1], N(-1, 0), 3); edge(C10[0], C10[1], C11[0], C11[1], N(1, 0), 4); ctx.globalAlpha = 1;
  }
  // 9. entrée / sortie « vue des Dieux » : les nuages s'écartent pendant la descente (ou se referment en partant)
  const io = mv.intro || mv.outro; if (io) { let k = Math.min(1, (now - io.t0) / io.dur); if (mv.outro) k = 1 - k;
    if (mv.intro && k >= 1) { mv.intro = null; mv.ov.style.opacity = ''; mv.svg.style.opacity = ''; }
    else { const e = fxEase(k), spr = nk > .5 ? fxSprites.night : fxSprites.day; mv.host.classList.toggle('godsN', nk > .5); ctx.fillStyle = nk > .5 ? `rgba(28,24,64,${(1 - e) * .85})` : `rgba(255,255,255,${(1 - e) * .8})`; ctx.fillRect(-px0, -py0, cw, ch);
      for (let i = 0; i < 26; i++) { const ax = fxRnd(i * 3) * w, ay = fxRnd(i * 7) * h, dx = ax - w / 2, dy = ay - h / 2, d = Math.hypot(dx, dy) || 1, push = e * (w * .9 + fxRnd(i) * w * .5), S = w * (.7 + fxRnd(i * 11) * .8) * (1 + e * .8);
        ctx.globalAlpha = Math.max(0, 1 - e * .9); ctx.drawImage(spr, ax + dx / d * push - S / 2, ay + dy / d * push - S * .3, S, S * .6); } ctx.globalAlpha = 1;
      mv.ov.style.opacity = Math.max(0, (e - .55) / .45).toFixed(2); mv.svg.style.opacity = mv.ov.style.opacity; } }
};
// Descente depuis les nuages sur le site, puis sur sa propre position
FX.intro = (mv, at, zoom) => {
  if (!mapAnim() || !mv) return; mv.center([50, 50], mv.minS); mv.intro = { t0: performance.now(), dur: 2300 };
  const tx = document.createElement('div'); tx.className = 'gtx' + (nightK((20 * 60 + nowMin()) % 1440) > .5 ? ' n' : ''); tx.setAttribute('aria-hidden', 'true'); tx.innerHTML = `<img src="${A}logo.webp" alt=""><b>${esc(EVENT.name)}</b><span>${esc(VENUE.kind || '')} · ${esc(VENUE.place || '')}</span>`; mv.host.parentNode.append(tx);
  setTimeout(() => tx.remove(), 2600);
  setTimeout(() => mv.alive && mv.flyTo(at, zoom, 1700), 380);
  const skip = () => { mv.intro && (mv.intro.dur = Math.min(mv.intro.dur, performance.now() - mv.intro.t0 + 200)); tx.remove(); mv.host.removeEventListener('pointerdown', skip); };
  mv.host.addEventListener('pointerdown', skip);
};
// Quitter un lieu : les nuages se referment, puis on arrive sur le suivant
FX.leave = cb => {
  if (!mapAnim() || !MV || !MV.alive || !document.body.contains(MV.host)) { cb(); return; }
  MV.outro = { t0: performance.now(), dur: 560 }; MV.ov.style.opacity = '0'; MV.flyTo(MV.centerPct(), MV.minS, 520); setTimeout(cb, 580);
};
FX.fireworks = (at, n = 9) => { const now = performance.now(), cols = ['255,90,200', '120,220,255', '255,210,90', '170,120,255', '255,110,110', '140,255,170'];
  for (let i = 0; i < n; i++) FX.rockets.push({ at, t0: now + i * 520 + fxRnd(i + now) * 260, h: 150 + fxRnd(i * 3 + now) * 110, dx: (fxRnd(i * 7 + now) - .5) * 200, rgb: cols[i % cols.length], seed: fxRnd(i * 5 + now) * 6 }); };
FX.dispatch = r => { // l'équipe part vers l'alerte : trajet réel sur le graphe des allées
  if (FX.vehicles.some(v => v.rid === r.id) || !r.at) return;
  const from = r.cat === 'medical' ? (POIS.find(o => o.id === 'secours') || POIS.find(o => o.id === 'entree')) : null;
  const n0 = from ? (from.node || nearestNode(from.at)) : staffNode(STAFF.find(s => s.id === 'nadia') || STAFF[0]), n1 = nearestNode(r.at);
  let pts = [NODES[n0], ...route(n0, n1).map(k => NODES[k] || k), r.at].filter(p => Array.isArray(p));
  if (pts.length < 2) pts = [from ? from.at : NODES[n0], r.at];
  FX.vehicles.push({ rid: r.id, pts, t0: performance.now(), dur: 9000, kind: r.cat === 'medical' ? 'amb' : 'agent' });
};
