// ===== v6 : création d'avatar haute qualité — genre, style, teint, cheveux, tenue, chaussures =====
// Chaque personnage HQ a un masque (1 peau, 2 cheveux, 3 haut, 4 bas, 5 chaussures). La couleur est changée en gardant
// l'ombrage et les reflets d'origine : la qualité du rendu est conservée, sur la carte comme dans le profil.
const LOOKS = {
  f: [['rousse', 'Bohème', 'Longs ondulés · robe'], ['noir', 'Street', 'Tresses · cargo'], ['c31', 'Festival', 'Boucles · cargo'], ['short', 'Riviera', 'Longs lisses · short']],
  m: [['lins', 'Lin', 'Ondulés · chemise'], ['c30', 'Sport', 'Courts · bermuda'], ['metisse', 'Urbain', 'Bouclés · total look noir']]
};
const HEADBOX = { lins: [0, .0046, .876, .2947], metisse: [.3036, .0046, .6964, .2514], noir: [.1646, .0046, .5985, .2188], rousse: [.2011, .0046, .7328, .2425], short: [.0436, .0046, .6974, .2479], c30: [.3872, .035, .5056, .19], c31: [.2047, .12, .4706, .16] };
const PAL = {
  skin: [['#F3D3BD', 'Porcelaine'], ['#E8BE9C', 'Clair'], ['#D9A37B', 'Doré'], ['#C48A62', 'Ambré'], ['#A66B48', 'Caramel'], ['#87522F', 'Noisette'], ['#6A3C24', 'Ébène clair'], ['#4C2A19', 'Ébène']],
  hair: [['#1B1513', 'Noir'], ['#3F2618', 'Brun'], ['#6B4429', 'Châtain'], ['#9A6C43', 'Châtain clair'], ['#CFA46A', 'Blond'], ['#E7D2AE', 'Platine'], ['#A9411D', 'Roux'], ['#5B2C46', 'Prune'], ['#2A3552', 'Bleu nuit']],
  wear: [['#F3EFE7', 'Blanc cassé'], ['#1D1D22', 'Noir'], ['#D7C3A6', 'Beige'], ['#25314F', 'Marine'], ['#6C6A48', 'Kaki'], ['#6E1F2D', 'Bordeaux'], ['#9CC1E3', 'Bleu ciel'], ['#E5B6C1', 'Rose poudré'], ['#9DB497', 'Sauge'], ['#C46A45', 'Terracotta'], ['#4E6C93', 'Denim'], ['#B6A4D8', 'Lilas']]
};
const AVK = (() => {
  const base = {}, out = new Map();
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function prep(k, sz) { // pixels + masque + moyennes par zone
    const key = k + sz; if (base[key]) return base[key];
    base[key] = (async () => { const [im, lb] = await Promise.all([load(CH(k, sz ? 'm' : '')), load(A + 'c/' + k + (sz ? '_m' : '') + '_lab.png')]);
      const W = im.naturalWidth, H = im.naturalHeight, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0); const px = x.getImageData(0, 0, W, H); x.clearRect(0, 0, W, H); x.drawImage(lb, 0, 0, W, H); const ld = x.getImageData(0, 0, W, H).data;
      const lab = new Uint8Array(W * H), sum = Array.from({ length: 6 }, () => [0, 0, 0, 0, 0]);
      for (let i = 0; i < W * H; i++) { const l = ld[i * 4]; lab[i] = l; if (!l || px.data[i * 4 + 3] < 100) continue; const r = px.data[i * 4], g = px.data[i * 4 + 1], b = px.data[i * 4 + 2], s = sum[l]; s[0] += r; s[1] += g; s[2] += b; s[3] += .299 * r + .587 * g + .114 * b; s[4]++; }
      return { W, H, px, lab, mean: sum.map(s => s[4] ? [s[0] / s[4], s[1] / s[4], s[2] / s[4], s[3] / s[4]] : null) }; })();
    return base[key];
  }
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  async function render(look, sz) {
    const b = await prep(look.char, sz), d = new ImageData(new Uint8ClampedArray(b.px.data), b.W, b.H), D = d.data, tg = [null, look.skin, look.hair, look.top, look.bot, look.shoe].map(h => h ? hex(h) : null);
    for (let i = 0, n = b.W * b.H; i < n; i++) {
      const l = b.lab[i], t = l && tg[l]; if (!t) continue; const m = b.mean[l]; if (!m) continue; const o = i * 4, r = D[o], g = D[o + 1], bl = D[o + 2];
      if (l === 1) { D[o] = r * t[0] / m[0]; D[o + 1] = g * t[1] / m[1]; D[o + 2] = bl * t[2] / m[2]; continue; } // peau : même grain, même rougeurs
      const y = (.299 * r + .587 * g + .114 * bl) / (m[3] || 1); // tissus et cheveux : on garde l'ombrage et les reflets d'origine
      if (y <= 1) { D[o] = t[0] * y; D[o + 1] = t[1] * y; D[o + 2] = t[2] * y; } else { const k = Math.min(.85, (y - 1) * .38); D[o] = t[0] + (255 - t[0]) * k; D[o + 1] = t[1] + (255 - t[1]) * k; D[o + 2] = t[2] + (255 - t[2]) * k; }
    }
    const cv = document.createElement('canvas'); cv.width = b.W; cv.height = b.H; cv.getContext('2d').putImageData(d, 0, 0); return cv;
  }
  const keyOf = (look, v) => v + JSON.stringify([look.char, look.skin, look.hair, look.top, look.bot, look.shoe]);
  const plain = look => !look.skin && !look.hair && !look.top && !look.bot && !look.shoe;
  // url immédiate si prête (sinon l'image d'origine), calcul en arrière-plan puis rafraîchissement
  function get(look, v = 'full') {
    if (!look || !look.char) return null; if (plain(look)) return CH(look.char, v === 'full' ? '' : v === 'map' ? 'm' : 'h');
    const k = keyOf(look, v); if (out.has(k)) { const u = out.get(k); return typeof u === 'string' ? u : CH(look.char, v === 'full' ? '' : v === 'map' ? 'm' : 'h'); }
    out.set(k, 1);
    render(look, v === 'map').then(cv => {
      let c = cv; if (v === 'head') { const hb = HEADBOX[look.char]; c = document.createElement('canvas'); c.width = c.height = 256; c.getContext('2d').drawImage(cv, hb[0] * cv.width, hb[1] * cv.height, hb[2] * cv.width, hb[3] * cv.height, 0, 0, 256, 256); }
      out.set(k, c.toDataURL('image/webp', .9)); if (out.size > 60) out.delete(out.keys().next().value); emit();
    }).catch(() => out.delete(k));
    return CH(look.char, v === 'full' ? '' : v === 'map' ? 'm' : 'h');
  }
  return { get, render, plain };
})();
// Mon apparence (rétro-compatible avec ST.me.char)
const myLook = () => { ST.me.look = ST.me.look || { g: ['rousse', 'noir', 'c31', 'short'].includes(ST.me.char) ? 'f' : 'm', char: ST.me.char || 'lins' }; return ST.me.look; };
meHead = () => AVK.get(myLook(), 'head');
const meBody = () => AVK.get(myLook(), 'full');
const _pm6 = personMarker;
personMarker = function (id, name, head, at, o = {}) {
  const m = _pm6(id, name, head, at, o); if (o.me && typeof m.html === 'string' && m.html.includes('class="bodyimg"')) m.html = m.html.replace(/class="bodyimg" src="[^"]*"/, `class="bodyimg" src="${AVK.get(myLook(), 'map')}"`);
  else if (o.me && !m.html.includes('bodyimg')) { const mm = _pm6(id, name, CH(myLook().char, 'h'), at, o); mm.html = mm.html.replace(/class="bodyimg" src="[^"]*"/, `class="bodyimg" src="${AVK.get(myLook(), 'map')}"`); return mm; }
  return m;
};

// ---------- Le studio de création ----------
V.avatarPick = (onDone, step = true) => {
  const start = JSON.parse(JSON.stringify(myLook())), L = JSON.parse(JSON.stringify(start)), undo = []; let tab = 'style';
  const TABS = [['style', 'Style'], ['skin', 'Peau'], ['hair', 'Cheveux'], ['top', 'Haut'], ['bot', 'Bas'], ['shoe', 'Chaussures']];
  const el = mount(`${statusBar()}<div class="studio">
    <div class="stTop">${step ? '<span class="tiny" style="font-weight:800;color:var(--pri)">ÉTAPE 2 SUR 4</span>' : `<button class="rb" id="bk" aria-label="Retour">${I.back}</button>`}<b>Ton avatar</b><span style="flex:1"></span><button class="rb" id="un" aria-label="Annuler la dernière modification">${I.undo || '↶'}</button><button class="rb" id="rd" aria-label="Surprends-moi">${I.dice}</button></div>
    <div class="stStage">${clouds()}<div class="stPed"></div><img id="big" alt="Ton avatar" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><button class="stMapBtn" id="pv">Voir sur la carte</button><div class="stMap" id="mp" hidden><img src="${VENUE.map.src}" alt="" class="stMapBg" style="object-position:${ST.me.pos[0]}% ${ST.me.pos[1]}%"><div class="stMapMe"><span class="name">Moi</span><img id="mpi" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><i></i></div></div></div>
    <div class="stPanel"><div class="seg" id="gd"><button data-g="f">Femme</button><button data-g="m">Homme</button></div>
      <div class="stTabs" id="tb">${TABS.map(t => `<button data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
      <div class="stBody" id="bd"></div>
      <button class="btn" id="go">${step ? 'C’est moi !' : 'Enregistrer'}</button>${step ? '<button class="link" id="later" style="min-height:30px">Une prochaine fois</button>' : ''}</div></div>`, 'sky');
  const big = $('#big', el), bd = $('#bd', el);
  const look = () => AVK.get(L, 'full');
  const paintBig = () => { big.src = look(); $('#mpi', el).src = AVK.get(L, 'map'); };
  const sw = (key, list) => `<div class="stSw"><button data-v="" class="orig ${!L[key] ? 'on' : ''}" aria-label="Couleur d’origine"><span>Original</span></button>${list.map(([h, n]) => `<button data-v="${h}" class="${L[key] === h ? 'on' : ''}" aria-label="${n}" title="${n}"><i style="background:${h}"></i></button>`).join('')}</div><div class="tiny stName">${(list.find(x => x[0] === L[key]) || [0, 'Couleur d’origine du personnage'])[1]}</div>`;
  const draw = () => {
    $$('#gd button', el).forEach(b => b.classList.toggle('on', b.dataset.g === L.g)); $$('#tb button', el).forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    if (tab === 'style') bd.innerHTML = `<div class="stStyles">${LOOKS[L.g].map(([k, n, d]) => `<button data-c="${k}" class="${L.char === k ? 'on' : ''}"><img src="${CH(k, 'm')}" alt=""><b>${n}</b><span>${d}</span></button>`).join('')}</div>`;
    else bd.innerHTML = sw(tab, tab === 'skin' ? PAL.skin : tab === 'hair' ? PAL.hair : PAL.wear);
    paintBig();
  };
  const set = (k, v) => { undo.push(JSON.stringify(L)); if (undo.length > 40) undo.shift(); L[k] = v; big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop'); draw(); };
  $('#gd', el).onclick = e => { const b = e.target.closest('[data-g]'); if (!b || b.dataset.g === L.g) return; undo.push(JSON.stringify(L)); L.g = b.dataset.g; L.char = LOOKS[L.g][0][0]; tab = 'style'; draw(); };
  $('#tb', el).onclick = e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; draw(); } };
  bd.onclick = e => { const c = e.target.closest('[data-c]'); if (c) return set('char', c.dataset.c); const v = e.target.closest('[data-v]'); if (v) set(tab, v.dataset.v || null); };
  $('#un', el).onclick = () => { const p = undo.pop(); if (p) { Object.keys(L).forEach(k => delete L[k]); Object.assign(L, JSON.parse(p)); draw(); } };
  $('#rd', el).onclick = () => { undo.push(JSON.stringify(L)); ['skin', 'hair', 'top', 'bot', 'shoe'].forEach(k => delete L[k]); const r = a => a[Math.floor(Math.random() * a.length)]; L.char = r(LOOKS[L.g])[0]; L.skin = Math.random() < .5 ? null : r(PAL.skin)[0]; L.hair = Math.random() < .5 ? null : r(PAL.hair)[0]; L.top = r(PAL.wear)[0]; L.bot = r(PAL.wear)[0]; L.shoe = Math.random() < .5 ? null : r(PAL.wear)[0]; big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop'); draw(); };
  $('#pv', el).onclick = () => { const mp = $('#mp', el); mp.hidden = !mp.hidden; $('#pv', el).textContent = mp.hidden ? 'Voir sur la carte' : 'Voir en grand'; };
  const done = () => { ST.me.look = JSON.parse(JSON.stringify(L)); ST.me.char = L.char; emit(); if (step) markStep('avatar'); onDone ? onDone() : V.perms(); };
  $('#go', el).onclick = done;
  $('#later', el) && ($('#later', el).onclick = () => { if (step) markStep('avatar'); onDone ? onDone() : V.perms(); });
  $('#bk', el) && ($('#bk', el).onclick = () => onDone ? onDone() : V.settings());
  const rf = () => { if (!document.body.contains(big)) { listeners.delete(rf); return; } paintBig(); }; listeners.add(rf);
  draw();
};
V.avatarQuick = () => V.avatarPick(null, true);
// profils et réglages : l'apparence personnalisée partout
const _settings7 = V.settings;
V.settings = () => { _settings7(); const im = $('.scr .body .card img'); if (im) im.src = meBody(); };
