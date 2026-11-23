// ===== Moteur de carte : pan, pinch, molette, inertie, bornes, marqueurs, clusters, itinéraire =====
class MapView {
  constructor(host, opts = {}) {
    this.host = host; this.alpha = opts.src ? /_a\.webp/.test(opts.src) : !!VENUE.map.alpha; this.W = opts.w || VENUE.map.w; this.H = opts.h || VENUE.map.h; this.src = opts.src || VENUE.map.src;
    this.minS = 0; this.maxS = opts.maxS || 1.6; this.markers = new Map(); this.getMarkers = opts.markers || (() => []);
    this.onLong = opts.onLong; this.onTapEmpty = opts.onTapEmpty; this.routePts = null; this.cluster = opts.cluster !== false;
    host.classList.add('map'); host.innerHTML = `<div class="world"><img class="base" alt="Plan illustré du site" draggable="false" width="${this.W}" height="${this.H}" src="${this.src}"></div><canvas class="fx" aria-hidden="true"></canvas><svg class="ovs"></svg><div class="ov"></div><canvas class="fx2" aria-hidden="true"></canvas>`;
    this.world = host.querySelector('.world'); this.fx = host.querySelector('canvas.fx'); this.fx2 = host.querySelector('canvas.fx2'); this.base = host.querySelector('img.base'); this.fxCfg = opts.fx; this.ov = host.querySelector('.ov'); this.svg = host.querySelector('svg.ovs');
    this.s = 1; this.tx = 0; this.ty = 0; this.vx = 0; this.vy = 0; this.ptrs = new Map(); this.alive = true;
    this.resize(); this.center(opts.at || [48, 52], opts.zoom || 0.36);
    this.bind(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    this.ro = new ResizeObserver(() => { const c = this.centerPct(); this.resize(); this.center(c, this.s); }); this.ro.observe(host);
  }
  resize() { this.vw = this.host.clientWidth || 368; this.vh = this.host.clientHeight || 822; this.minS = Math.max(this.vw / this.W, this.vh / this.H) * 0.98 * (this.alpha ? .72 : .8); }
  destroy() { this.alive = false; this.ro.disconnect(); }
  centerPct() { return [(this.vw / 2 - this.tx) / this.s / this.W * 100, (this.vh / 2 - this.ty) / this.s / this.H * 100]; }
  center(at, s) { this.s = Math.min(this.maxS, Math.max(this.minS, s)); this.tx = this.vw / 2 - at[0] / 100 * this.W * this.s; this.ty = this.vh / 2 - at[1] / 100 * this.H * this.s; this.clamp(); this.apply(); }
  flyTo(at, s = this.s, ms = 650) {
    const a0 = this.centerPct(), s0 = this.s, t0 = performance.now(); s = Math.min(this.maxS, Math.max(this.minS, s));
    const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); this.center([a0[0] + (at[0] - a0[0]) * e, a0[1] + (at[1] - a0[1]) * e], s0 + (s - s0) * e); if (k < 1 && this.alive) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  zoomBy(f, cx = this.vw / 2, cy = this.vh / 2) { const ns = Math.min(this.maxS, Math.max(this.minS, this.s * f)); const k = ns / this.s; this.tx = cx - (cx - this.tx) * k; this.ty = cy - (cy - this.ty) * k; this.s = ns; this.clamp(); this.apply(); }
  clamp() {
    const mw = this.W * this.s, mh = this.H * this.s, padX = this.vw * .25, padY = this.vh * .25;
    this.tx = mw + padX * 2 < this.vw ? (this.vw - mw) / 2 : Math.min(padX, Math.max(this.vw - mw - padX, this.tx));
    this.ty = mh + padY * 2 < this.vh ? (this.vh - mh) / 2 : Math.min(padY, Math.max(this.vh - mh - padY, this.ty));
  }
  apply() { this.world.style.transform = `translate3d(${this.tx}px,${this.ty}px,0) scale(${this.s})`; this.dirty = true; }
  proj(at) { return [this.tx + at[0] / 100 * this.W * this.s, this.ty + at[1] / 100 * this.H * this.s]; }
  unproj(x, y) { return [(x - this.tx) / this.s / this.W * 100, (y - this.ty) / this.s / this.H * 100]; }
  mPx(m) { return m / PCT_TO_M / 100 * this.W * this.s; }
  bind() {
    // coordonnées locales corrigées de l'échelle d'affichage (téléphone réduit à l'écran)
    const h = this.host, loc = (x, y) => { const r = h.getBoundingClientRect(), k = r.width / (h.offsetWidth || r.width) || 1; return [(x - r.left) / k, (y - r.top) / k, k]; };
    let last = null, longT = null, downAt = null, moved = 0;
    h.addEventListener('pointerdown', e => {
      if (e.target.closest('.mk') && e.pointerType === 'mouse') return;
      h.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, [e.clientX, e.clientY]); this.vx = this.vy = 0; last = performance.now(); moved = 0; downAt = [e.clientX, e.clientY]; this.downMk = e.target.closest('.mk');
      clearTimeout(longT); if (this.ptrs.size === 1 && this.onLong) longT = setTimeout(() => { if (moved < 8) { const [x, y] = loc(downAt[0], downAt[1]); h.classList.remove('drag'); this.ptrs.clear(); this.onLong(this.unproj(x, y)); } }, 600);
    });
    h.addEventListener('pointermove', e => {
      if (!this.ptrs.has(e.pointerId)) return; const p = this.ptrs.get(e.pointerId), k = loc(0, 0)[2];
      if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()]; const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this.ptrs.set(e.pointerId, [e.clientX, e.clientY]); const [c, d] = [...this.ptrs.values()]; const d1 = Math.hypot(c[0] - d[0], c[1] - d[1]);
        const [mx, my] = loc((c[0] + d[0]) / 2, (c[1] + d[1]) / 2); if (d0 > 0) this.zoomBy(d1 / d0, mx, my); moved += 10; return;
      }
      const dx = (e.clientX - p[0]) / k, dy = (e.clientY - p[1]) / k; moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) h.classList.add('drag');
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
    this.renderMarkers(); if (typeof FX !== 'undefined' && document.visibilityState !== 'hidden') FX.draw(this, performance.now()); requestAnimationFrame(this.loop);
  }
  renderMarkers() {
    let list = this.getMarkers(this);
    // regroupement des points d'intérêt proches à faible zoom
    if (this.cluster) {
      const out = [], used = new Set(), pois = list.filter(m => m.poi), rest = list.filter(m => !m.poi);
      pois.forEach((m, i) => {
        if (used.has(i)) return; const p = this.proj(m.at), grp = [m]; used.add(i);
        pois.forEach((n, j) => { if (used.has(j)) return; const q = this.proj(n.at); if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 44) { grp.push(n); used.add(j); } });
        if (grp.length === 1) out.push(m);
        else { const c = [grp.reduce((a, g) => a + g.at[0], 0) / grp.length, grp.reduce((a, g) => a + g.at[1], 0) / grp.length]; out.push({ id: 'clu_' + grp.map(g => g.id).join('_'), at: c, cls: 'clu', html: `<div class="poi">${grp.length}</div>`, label: '', onClick: () => this.flyTo(c, this.s * 1.9), z: 5 }); }
      });
      list = rest.concat(out);
    }
    const seen = new Set();
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
      el._click = m.onClick; if (el._at && (Math.abs(el._at[0] - m.at[0]) + Math.abs(el._at[1] - m.at[1])) > .015) el._walk = performance.now() + 380; el._at = [m.at[0], m.at[1]]; el.classList.toggle('walk', (el._walk || 0) > performance.now()); const [x, y] = this.proj(m.at); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.zIndex = m.z || 1;
      if (el._halo && m.halo) { const r = this.mPx(m.halo.m); Object.assign(el._halo.style, { left: x + 'px', top: y + 'px', width: 2 * r + 'px', height: 1.3 * r + 'px', background: m.halo.c + '2e', border: `1.5px ${m.halo.dash ? 'dashed' : 'solid'} ${m.halo.c}99` }); }
    });
    this.markers.forEach((el, id) => { if (!seen.has(id)) { el._halo && el._halo.remove(); el.remove(); this.markers.delete(id); } });
    // itinéraire
    if (this.routePts) {
      const pts = this.routePts.map(p => this.proj(p).map(v => v.toFixed(1)).join(',')).join(' ');
      this.svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><polyline points="${pts}" fill="none" stroke="${this.routeColor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 10" style="animation:dash 1s linear infinite"/>`;
    } else if (this.svg.innerHTML) this.svg.innerHTML = '';
  }
}
const dashStyle = document.createElement('style'); dashStyle.textContent = '@keyframes dash{to{stroke-dashoffset:-22}}'; document.head.append(dashStyle);

// Marqueurs standards
function poiMarker(o, onClick, extra = '', noLabel) {
  const rupt = o.bar && Object.keys(ST.ruptures).some(k => k.startsWith(o.id + ':'));
  return { id: 'poi_' + o.id, at: o.at, poi: true, aria: o.n, html: `<div class="poi"><img src="${IC(o.ic)}" alt=""></div>${noLabel ? '' : `<div class="lbl ${rupt ? 'warn' : ''}">${esc(o.n)}${extra}</div>`}`, onClick, z: 3 };
}
function personMarker(id, name, head, at, { me, stale, staff, acc = 4, sub, onClick, col } = {}) {
  const c = me ? '#4F6BF5' : stale ? '#8A8FA6' : col || (staff ? '#E58A00' : '#0E9F8A');
  return {
    id: 'p_' + id, at, cls: (me ? 'me ' : '') + (stale ? 'stale ' : '') + (staff ? 'staff' : ''), aria: name,
    html: `<div class="fr"><div class="name">${esc(name)}${sub ? `<span style="color:${stale ? '#9A5800' : '#6B7084'};font-weight:650">· ${sub}</span>` : ''}</div>${me ? '<div class="cone" style="transform:rotate(-35deg)"></div>' : ''}<div class="head" style="border-color:${c}"><img src="${head}" alt=""></div><div class="stem" style="background:${c}"></div></div>`,
    halo: { m: acc, c, dash: stale }, onClick, z: me ? 9 : 6
  };
}
