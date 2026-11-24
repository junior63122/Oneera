// ===== Moteur de carte : pan, pinch, molette, inertie, bornes, marqueurs, clusters, itinéraire =====
class MapView {
  constructor(host, opts = {}) {
    this.host = host; this.alpha = opts.src ? /_a\.webp/.test(opts.src) : !!VENUE.map.alpha; this.W = opts.w || VENUE.map.w; this.H = opts.h || VENUE.map.h; this.src = opts.src || VENUE.map.src;
    this.minS = 0; this.maxS = opts.maxS || 1.6; this.markers = new Map(); this.getMarkers = opts.markers || (() => []);
    this.onLong = opts.onLong; this.onTapEmpty = opts.onTapEmpty; this.routePts = null; this.cluster = opts.cluster !== false;
    host.classList.add('map'); host.innerHTML = `<div class="tl"><div class="world"><img class="base" alt="Plan illustré du site" draggable="false" width="${this.W}" height="${this.H}" src="${this.src}"></div><canvas class="fx" aria-hidden="true"></canvas><svg class="ovs"></svg></div><div class="ov"></div><canvas class="fx2" aria-hidden="true"></canvas>`;
    this.tl = host.querySelector('.tl'); this.rot = 0; this.tilt = 0; this.tiltTo = 0; this.canRot = !!opts.rotate; this.strict = opts.strict != null ? !!opts.strict : !!opts.rotate; this.onView = opts.onView;
    this.world = host.querySelector('.world'); this.fx = host.querySelector('canvas.fx'); this.fx2 = host.querySelector('canvas.fx2'); this.base = host.querySelector('img.base'); this.fxCfg = opts.fx; this.ov = host.querySelector('.ov'); this.svg = host.querySelector('svg.ovs');
    this.s = 1; this.tx = 0; this.ty = 0; this.vx = 0; this.vy = 0; this.ptrs = new Map(); this.alive = true;
    this.resize(); this.center(opts.at || [48, 52], opts.zoom || 0.36);
    this.bind(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    this.ro = new ResizeObserver(() => { const c = this.centerPct(); this.resize(); this.center(c, this.s); }); this.ro.observe(host);
  }
  resize() { this.vw = this.host.clientWidth || 368; this.vh = this.host.clientHeight || 822; this.minS = Math.max(this.vw / this.W, this.vh / this.H) * (this.strict ? 1.001 : 0.98 * (this.alpha ? .72 : .8)); }
  destroy() { this.alive = false; this.ro.disconnect(); }
  centerPct() { return this.unproj(this.vw / 2, this.vh / 2); }
  center(at, s) { this.s = Math.min(this.maxS, Math.max(this.minS, s)); const c = Math.cos(this.rot), n = Math.sin(this.rot), x = at[0] / 100 * this.W, y = at[1] / 100 * this.H; this.tx = this.vw / 2 - this.s * (x * c - y * n); this.ty = this.vh / 2 - this.s * (x * n + y * c); this.clamp(); this.apply(); }
  rotateBy(d, cx = this.vw / 2, cy = this.vh / 2) { if (!this.canRot) return; this.rot = Math.atan2(Math.sin(this.rot + d), Math.cos(this.rot + d)); const c = Math.cos(d), n = Math.sin(d), dx = this.tx - cx, dy = this.ty - cy; this.tx = cx + dx * c - dy * n; this.ty = cy + dx * n + dy * c; this.clamp(); this.apply(); }
  north(ms = 420) { const r0 = this.rot, t0 = performance.now(), step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3), want = r0 * (1 - e); this.rotateBy(want - this.rot); if (k < 1 && this.alive) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  set3d(on) { this.tiltTo = on ? 1 : 0; }
  // inclinaison : plateau penché en arrière (rotateX) vu en perspective, origine fixe
  get phi() { return this.tilt * 0.82; } // ≈ 47° au maximum
  tiltO() { return [this.vw / 2, this.vh * .62]; }
  flyTo(at, s = this.s, ms = 650) {
    const a0 = this.centerPct(), s0 = this.s, t0 = performance.now(); s = Math.min(this.maxS, Math.max(this.minS, s));
    const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); this.center([a0[0] + (at[0] - a0[0]) * e, a0[1] + (at[1] - a0[1]) * e], s0 + (s - s0) * e); if (k < 1 && this.alive) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  zoomBy(f, cx = this.vw / 2, cy = this.vh / 2) { const ns = Math.min(this.maxS, Math.max(this.minS, this.s * f)); const k = ns / this.s; this.tx = cx - (cx - this.tx) * k; this.ty = cy - (cy - this.ty) * k; this.s = ns; this.clamp(); this.apply(); }
  clamp() {
    if (this.strict) { // bords du plan = bords de l'écran : jamais de fond visible, même en rotation ou en 3D
      for (let it = 0; it < 5; it++) {
        const Q = [[0, 0], [this.vw, 0], [0, this.vh], [this.vw, this.vh]].map(([x, y]) => { const f = this.s2flat(x, y); return this.unproj(f[0], f[1]); });
        const xs = Q.map(q => q[0]), ys = Q.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), sp = Math.max((x1 - x0) / 100, (y1 - y0) / 100);
        if (sp > 1.0005) { const k = sp * 1.003, cx = this.vw / 2, cy = this.vh / 2; this.tx = cx - (cx - this.tx) * k; this.ty = cy - (cy - this.ty) * k; this.s *= k; continue; }
        const dx = x0 < 0 ? -x0 : x1 > 100 ? 100 - x1 : 0, dy = y0 < 0 ? -y0 : y1 > 100 ? 100 - y1 : 0; if (!dx && !dy) break;
        const a = this.proj([50, 50]), b = this.proj([50 + dx, 50 + dy]); this.tx -= b[0] - a[0]; this.ty -= b[1] - a[1];
      }
      return;
    }
    if (this.rot || this.tilt) { const [cx, cy] = this.unproj(this.vw / 2, this.vh / 2), kx = Math.min(100, Math.max(0, cx)), ky = Math.min(100, Math.max(0, cy)); if (kx !== cx || ky !== cy) { const [px, py] = this.proj([kx, ky]); this.tx += this.vw / 2 - px; this.ty += this.vh / 2 - py; } return; }
    const mw = this.W * this.s, mh = this.H * this.s, padX = this.vw * .25, padY = this.vh * .25;
    this.tx = mw + padX * 2 < this.vw ? (this.vw - mw) / 2 : Math.min(padX, Math.max(this.vw - mw - padX, this.tx));
    this.ty = mh + padY * 2 < this.vh ? (this.vh - mh) / 2 : Math.min(padY, Math.max(this.vh - mh - padY, this.ty));
  }
  apply() { this.world.style.transform = `translate3d(${this.tx}px,${this.ty}px,0) rotate(${this.rot}rad) scale(${this.s})`; this.dirty = true; }
  // plan (en %) → écran à plat (rotation + zoom + déplacement)
  proj(at) { const c = Math.cos(this.rot), n = Math.sin(this.rot), x = at[0] / 100 * this.W * this.s, y = at[1] / 100 * this.H * this.s; return [this.tx + x * c - y * n, this.ty + x * n + y * c]; }
  unproj(x, y) { const c = Math.cos(this.rot), n = Math.sin(this.rot), dx = (x - this.tx) / this.s, dy = (y - this.ty) / this.s; return [(dx * c + dy * n) / this.W * 100, (-dx * n + dy * c) / this.H * 100]; }
  // écran à plat → écran réel (vue 3D inclinée) et retour
  flat2s(x, y) { if (!this.tilt) return [x, y, 1]; const [ox, oy] = this.tiltO(), f = this.phi, P = 1100, X = x - ox, Y = y - oy, k = P / (P - Y * Math.sin(f)); return [ox + X * k, oy + Y * Math.cos(f) * k, k]; }
  s2flat(x, y) { if (!this.tilt) return [x, y]; const [ox, oy] = this.tiltO(), f = this.phi, P = 1100, Xs = x - ox, Ys = y - oy, Y = Ys * P / (P * Math.cos(f) + Ys * Math.sin(f)), k = P / (P - Y * Math.sin(f)); return [ox + Xs / k, oy + Y]; }
  projS(at) { const [x, y] = this.proj(at); return this.flat2s(x, y); }
  mPx(m) { return m / PCT_TO_M / 100 * this.W * this.s; }
  bind() {
    // coordonnées locales corrigées de l'échelle d'affichage (téléphone réduit à l'écran)
    const h = this.host, loc = (x, y) => { const r = h.getBoundingClientRect(), k = r.width / (h.offsetWidth || r.width) || 1, f = this.s2flat((x - r.left) / k, (y - r.top) / k); return [f[0], f[1], k]; };
    let rotAcc = 0, rotOn = false;
    let last = null, longT = null, downAt = null, moved = 0;
    h.addEventListener('pointerdown', e => {
      if (e.target.closest('.mk') && e.pointerType === 'mouse') return;
      h.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, [e.clientX, e.clientY]); this.vx = this.vy = 0; last = performance.now(); moved = 0; if (this.ptrs.size === 2) { rotAcc = 0; rotOn = false; } downAt = [e.clientX, e.clientY]; this.downMk = e.target.closest('.mk');
      clearTimeout(longT); if (this.ptrs.size === 1 && this.onLong) longT = setTimeout(() => { if (moved < 8) { const [x, y] = loc(downAt[0], downAt[1]); h.classList.remove('drag'); this.ptrs.clear(); this.onLong(this.unproj(x, y)); } }, 600);
    });
    h.addEventListener('pointermove', e => {
      if (!this.ptrs.has(e.pointerId)) return; const p = this.ptrs.get(e.pointerId), k = loc(0, 0)[2];
      if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()]; const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]), a0 = Math.atan2(b[1] - a[1], b[0] - a[0]);
        this.ptrs.set(e.pointerId, [e.clientX, e.clientY]); const [c, d] = [...this.ptrs.values()]; const d1 = Math.hypot(c[0] - d[0], c[1] - d[1]), a1 = Math.atan2(d[1] - c[1], d[0] - c[0]);
        const [mx, my] = loc((c[0] + d[0]) / 2, (c[1] + d[1]) / 2); if (d0 > 0) this.zoomBy(d1 / d0, mx, my);
        // rotation à deux doigts (comme Plans) : seuil de 12° pour ne pas tourner en zoomant
        let da = a1 - a0; da = Math.atan2(Math.sin(da), Math.cos(da)); rotAcc += da; if (!rotOn && Math.abs(rotAcc) > .21) { rotOn = true; da = rotAcc; } if (rotOn) this.rotateBy(da, mx, my); moved += 10; return;
      }
      const f0 = loc(p[0], p[1]), f1 = loc(e.clientX, e.clientY), dx = f1[0] - f0[0], dy = f1[1] - f0[1]; moved += Math.abs(e.clientX - p[0]) / k + Math.abs(e.clientY - p[1]) / k; if (moved > 6) h.classList.add('drag');
      const now = performance.now(), dt = Math.max(1, now - last); last = now; this.vx = dx / dt * 16; this.vy = dy / dt * 16;
      this.tx += dx; this.ty += dy; this.clamp(); this.apply(); this.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    });
    const up = e => {
      clearTimeout(longT); h.classList.remove('drag'); if (!this.ptrs.has(e.pointerId)) return; this.ptrs.delete(e.pointerId);
      if (moved < 6 && this.downMk && this.ptrs.size === 0) { const mk = this.markers.get(this.downMk.dataset.id); this.downMk = null; mk && mk._click && mk._click(); return; }
      if (moved < 6 && this.ptrs.size === 0) { const [x, y] = loc(e.clientX, e.clientY); const now = performance.now();
        if (this.lastTap && now - this.lastTap < 300) { this.zoomBy(1.8, x, y); this.lastTap = 0; } else { this.lastTap = now; this.onTapEmpty && this.onTapEmpty(this.unproj(x, y)); } }
      if (performance.now() - last > 80) this.vx = this.vy = 0;
    };
    h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    h.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = loc(e.clientX, e.clientY); this.zoomBy(Math.exp(-e.deltaY * .0016), x, y); }, { passive: false });
  }
  setRoute(pts, color = '#4F6BF5') { this.routePts = pts; this.routeColor = color; this.dirty = true; }
  loop() {
    if (!this.alive) return;
    if (!this.ptrs.size && (Math.abs(this.vx) > .2 || Math.abs(this.vy) > .2)) { this.tx += this.vx; this.ty += this.vy; this.vx *= .92; this.vy *= .92; this.clamp(); this.apply(); }
    if (this.tilt !== this.tiltTo) { const d = this.tiltTo - this.tilt; this.tilt = Math.abs(d) < .02 ? this.tiltTo : this.tilt + d * .16; this.clamp(); this.apply(); }
    const tf = this.tilt ? `perspective(1100px) rotateX(${(this.phi * 180 / Math.PI).toFixed(2)}deg)` : ''; if (this._tf !== tf) { this._tf = tf; const [ox, oy] = this.tiltO(); this.tl.style.transformOrigin = `${ox}px ${oy}px`; this.tl.style.transform = tf; this.host.classList.toggle('t3d', !!this.tilt); }
    const vk = Math.round(this.rot * 100) + ':' + (this.tiltTo ? 1 : 0); if (this._vk !== vk) { this._vk = vk; this.onView && this.onView(this); }
    this.renderMarkers(); if (typeof FX !== 'undefined' && document.visibilityState !== 'hidden') FX.draw(this, performance.now()); requestAnimationFrame(this.loop);
  }
  renderMarkers() {
    let list = this.getMarkers(this);
    // regroupement des points d'intérêt proches à faible zoom
    const pk = Math.max(.62, Math.min(1.1, Math.sqrt(this.s / ((typeof VENUE !== 'undefined' && VENUE.zoom) || .4)))); if (this._pk !== pk) { this._pk = pk; this.host.style.setProperty('--pk', pk.toFixed(3)); this.host.classList.toggle('lowz', pk < .8); }
    if (this.cluster) {
      const out = [], pois = list.filter(m => m.poi).sort((a, b) => (b.prio || 0) - (a.prio || 0)), rest = list.filter(m => !m.poi), kept = [];
      pois.forEach(m => { const p = this.projS(m.at); if (kept.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 46 * pk)) return; kept.push(p); out.push(m); });
      list = rest.concat(out);
    }
    const seen = new Set(), fan = MapView.fan ? MapView.fan(list, this) : {};
    list.forEach(m => {
      seen.add(m.id); let el = this.markers.get(m.id);
      if (!el) {
        el = document.createElement('div'); el.className = 'mk ' + (m.cls || ''); el.dataset.id = m.id; el.setAttribute('role', 'button'); el.tabIndex = 0;
        el.setAttribute('aria-label', m.aria || m.id);
        el.addEventListener('click', ev => { ev.stopPropagation(); const cur = this.markers.get(m.id); cur && cur._click && cur._click(); });
        el.addEventListener('keydown', ev => { if (ev.key === 'Enter') { const cur = this.markers.get(m.id); cur && cur._click && cur._click(); } });
        if (m.halo) { el._halo = document.createElement('div'); el._halo.className = 'halo'; this.ov.append(el._halo); }
        this.ov.append(el); this.markers.set(m.id, el);
      }
      if (el._html !== m.html) { el.innerHTML = m.html; el._html = m.html; el.className = 'mk ' + (m.cls || ''); }
      el._click = m.onClick; if (el._at && (Math.abs(el._at[0] - m.at[0]) + Math.abs(el._at[1] - m.at[1])) > .015) el._walk = performance.now() + 380; el._at = [m.at[0], m.at[1]]; el.classList.toggle('walk', (el._walk || 0) > performance.now()); let [x, y, kk] = this.projS(m.at); const fo = (fan.off || fan)[m.id]; if (fo) { x += fo[0]; y += fo[1]; } el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.zIndex = this.tilt ? Math.round(y) + (m.z || 1) * 10000 : (m.z || 1) * 1000 + Math.round(y);
      const hid = !!(fan.hide && fan.hide.has(m.id)); el.style.display = hid ? 'none' : ''; if (el._halo) el._halo.style.display = hid ? 'none' : '';
      const bd = fan.badge && fan.badge[m.id]; let gb = el.querySelector('.grpb'); if (bd) { if (!gb) { gb = document.createElement('span'); gb.className = 'grpb'; el.append(gb); } gb.textContent = '+' + bd.n; el._click = () => MapView.onGroup && MapView.onGroup(bd.ids, this); el.setAttribute('aria-label', `Groupe de ${bd.ids.length} personnes`); } else if (gb) gb.remove();
      if (el._halo && m.halo) { const r = this.mPx(m.halo.m) * kk; Object.assign(el._halo.style, { left: x + 'px', top: y + 'px', width: 2 * r + 'px', height: 1.3 * r * Math.cos(this.phi) + 'px', background: m.halo.c + '2e', border: `1.5px ${m.halo.dash ? 'dashed' : 'solid'} ${m.halo.c}99` }); }
    });
    this.markers.forEach((el, id) => { if (!seen.has(id)) { el._halo && el._halo.remove(); el.remove(); this.markers.delete(id); } });
    const nowD = performance.now(); if (!this._dcT || nowD - this._dcT > 160) { this._dcT = nowD; this.declutter(); }
    // itinéraire
    if (this.routePts) {
      const pts = this.routePts.map(p => this.proj(p).map(v => v.toFixed(1)).join(',')).join(' ');
      this.svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><polyline points="${pts}" fill="none" stroke="${this.routeColor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 10" style="animation:dash 1s linear infinite"/>`;
    } else if (this.svg.innerHTML) this.svg.innerHTML = '';
  }
}
// anti-chevauchement des étiquettes : priorité aux personnes puis aux lieux clés ; jamais sous l'interface posée sur la carte
MapView.prototype.declutter = function () {
  const scr = this.host.closest('.scr') || this.host.parentElement; if (!scr) return; const H = this.host.getBoundingClientRect(), A = H.width * H.height;
  const ui = [...scr.children].filter(e => e !== this.host && !e.contains(this.host) && e.offsetParent !== null && getComputedStyle(e).position !== 'static').flatMap(e => { const r = e.getBoundingClientRect(); if (!r.width || r.width * r.height > A * .45) { return [...e.children].filter(c => c.offsetParent !== null).map(c => c.getBoundingClientRect()).filter(q => q.width && q.width * q.height < A * .45); } return [r]; });
  const hit = (a, b, m = 2) => a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;
  const items = []; this.markers.forEach(el => { if (el.style.display === 'none') return; const per = !el.classList.contains('pm'); el.querySelectorAll(':scope > .lbl, :scope .fr > .name, :scope .fr > .bub').forEach(l => items.push({ l, el, p: (per ? 3 + (el.dataset.id === 'p_me' ? 2 : 0) : el.classList.contains('key') ? 2 : 1) - (l.classList.contains('bub') ? .5 : 0), y: parseFloat(el.style.top) })); });
  items.sort((a, b) => b.p - a.p || a.y - b.y); const kept = [];
  items.forEach(it => { it.l.classList.remove('lblHide'); const r = it.l.getBoundingClientRect(); const bad = ui.some(u => hit(r, u, 4)) || kept.some(k => hit(r, k)) || r.left < H.left + 2 || r.right > H.right - 2; if (bad && (it.p < 5 || ui.some(u => hit(r, u, 4)))) it.l.classList.add('lblHide'); else kept.push(r); });
};
const dashStyle = document.createElement('style'); dashStyle.textContent = '@keyframes dash{to{stroke-dashoffset:-22}}'; document.head.append(dashStyle);

// Marqueurs standards
function poiMarker(o, onClick, extra = '', noLabel) {
  const rupt = o.bar && Object.keys(ST.ruptures).some(k => k.startsWith(o.id + ':'));
  const key = /scene|stage|entree|sortie|wc|secours|secu|info/.test(o.id + ' ' + (o.ic || '')) ? 2 : o.bar ? 1 : 0;
  return { id: 'poi_' + o.id, at: o.at, poi: true, prio: key, cls: 'pm' + (key === 2 ? ' key' : ''), aria: o.n, html: `<div class="poi"><img src="${IC(o.ic)}" alt=""></div>${noLabel ? '' : `<div class="lbl ${rupt ? 'warn' : ''}">${esc(o.n)}${extra}</div>`}`, onClick, z: 3 };
}
function personMarker(id, name, head, at, { me, stale, staff, acc = 4, sub, onClick, col } = {}) {
  const c = me ? '#4F6BF5' : stale ? '#8A8FA6' : col || (staff ? '#E58A00' : '#0E9F8A');
  return {
    id: 'p_' + id, at, cls: (me ? 'me ' : '') + (stale ? 'stale ' : '') + (staff ? 'staff' : ''), aria: name,
    html: `<div class="fr"><div class="name">${esc(name)}${sub ? `<span style="color:${stale ? '#9A5800' : '#6B7084'};font-weight:650">· ${sub}</span>` : ''}</div>${me ? '<div class="cone" style="transform:rotate(-35deg)"></div>' : ''}<div class="head" style="border-color:${c}"><img src="${head}" alt=""></div><div class="stem" style="background:${c}"></div></div>`,
    halo: { m: acc, c, dash: stale }, onClick, z: me ? 9 : 6
  };
}
