// ===== v7 : vrai créateur d'avatar (nouveau moteur illustré) — femme / homme séparés, éléments interchangeables =====
const myAv2 = () => { if (!ST.me.av2) ST.me.av2 = { ...AV2_DEFAULT, g: 'm', skin: 3, hair: 'wavy', hairC: 2, top: 'openshirt', topC: 2, bottom: 'chinos', bottomC: 2, shoes: 'sneakers', jewel: ['necklace', 'bracelets'], pose: 'pocket' }; return ST.me.av2; };
meHead = () => av2URI(myAv2(), 'head');
// visages des amis : nouveau moteur (la liste FRIEND_CHAR est vidée pour ne plus utiliser les images figées)
Object.keys(FRIEND_CHAR).forEach(k => delete FRIEND_CHAR[k]);
Object.assign(FRIEND_AV, Object.fromEntries(Object.keys(FRIEND_AV2).map(k => [k, null])));
// marqueurs : avatars en pied du nouveau moteur pour moi et mes amis
const _pm7 = personMarker;
personMarker = function (id, name, head, at, o = {}) {
  const cfg = o.me ? myAv2() : FRIEND_AV2[id];
  if (!cfg) return _pm7(id, name, head, at, o);
  const m = _pm6(id, name, CH('lins', 'h'), at, o); // gabarit « en pied »
  m.html = m.html.replace(/class="bodyimg" src="[^"]*"/, `class="bodyimg av2" src="${av2URI(cfg)}"`); return m;
};
// ---------- Le studio ----------
V.avatarPick = (onDone, step = true) => {
  const L = JSON.parse(JSON.stringify(myAv2())), undo = []; let tab = 'hair';
  const TABS = [['body', 'Silhouette'], ['face', 'Visage'], ['hair', 'Cheveux'], ['top', 'Haut'], ['bottom', 'Bas'], ['shoes', 'Chaussures'], ['acc', 'Accessoires']];
  const el = mount(`${statusBar()}<div class="studio">
    <div class="stTop">${step ? '<span class="tiny" style="font-weight:800;color:var(--pri)">ÉTAPE 2 SUR 4</span>' : `<button class="rb" id="bk" aria-label="Retour">${I.back}</button>`}<b>Crée ton avatar</b><span style="flex:1"></span><button class="rb" id="un" aria-label="Annuler la dernière modification">↶</button><button class="rb" id="rd" aria-label="Surprends-moi">${I.dice}</button></div>
    <div class="stStage">${clouds()}<div class="stPed"></div><div id="big" class="av2big"></div><button class="stMapBtn" id="pv">Voir sur la carte</button><div class="stMap" id="mp" hidden><img src="${VENUE.map.src}" alt="" class="stMapBg" style="object-position:${ST.me.pos[0]}% ${ST.me.pos[1]}%"><div class="stMapMe"><span class="name">Moi</span><img id="mpi" alt=""><i></i></div></div></div>
    <div class="stPanel"><div class="seg" id="gd"><button data-g="f">Femme</button><button data-g="m">Homme</button></div>
      <div class="stTabs" id="tb">${TABS.map(t => `<button data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
      <div class="stBody" id="bd"></div>
      <button class="btn" id="go">${step ? 'C’est moi !' : 'Enregistrer'}</button>${step ? '<button class="link" id="later" style="min-height:30px">Une prochaine fois</button>' : ''}</div></div>`, 'sky');
  const big = $('#big', el), bd = $('#bd', el);
  const tiles = (key, list, view, extra = {}) => `<div class="stTiles">${list.map(([k, n]) => { const on = Array.isArray(L[key]) ? L[key].includes(k) : L[key] === k; return `<button data-k="${key}" data-v="${k}" class="${on ? 'on' : ''}" aria-pressed="${on}"><span class="th">${avatar2SVG({ ...L, ...extra, [key]: Array.isArray(L[key]) ? (L[key].includes(k) ? L[key] : [...L[key], k]) : k }, { view, style: 'width:100%;height:100%' })}</span><b>${n}</b></button>`; }).join('')}</div>`;
  const colors = (key, pal, label) => `<div class="stLbl">${label}</div><div class="stSw small">${pal.map((h, i) => `<button data-c="${key}" data-i="${i}" class="${L[key] === i ? 'on' : ''}" aria-label="Couleur ${i + 1}"><i style="background:${h}"></i></button>`).join('')}</div>`;
  const draw = () => {
    $$('#gd button', el).forEach(b => b.classList.toggle('on', b.dataset.g === L.g)); $$('#tb button', el).forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const G = L.g, one = L.outfit && L.outfit !== 'none';
    bd.innerHTML = ({
      body: () => `<div class="stLbl">Silhouette</div>${tiles('build', AV2.build[G], undefined)}<div class="stLbl">Taille</div><div class="seg small" id="ht">${AV2.height.map(([k, n]) => `<button data-h="${k}" class="${L.height === k ? 'on' : ''}">${n}</button>`).join('')}</div>${colors('skin', AV2.skin, 'Teint')}<div class="stLbl">Posture</div>${tiles('pose', AV2.pose, undefined)}`,
      face: () => `<div class="stLbl">Yeux</div>${tiles('eyes', AV2.eyes, 'head')}${colors('eyeC', AV2.eyeC, 'Couleur des yeux')}<div class="stLbl">Sourire</div>${tiles('mouth', AV2.mouth, 'head')}${G === 'm' ? `<div class="stLbl">Barbe</div>${tiles('beard', AV2.beard, 'head')}` : ''}`,
      hair: () => `${tiles('hair', AV2.hair[G], 'hair')}${colors('hairC', AV2.hairC, 'Couleur')}`,
      top: () => `<div class="stLbl">Tenue une pièce</div>${tiles('outfit', AV2.outfit[G], undefined)}${one ? colors('outfitC', AV2.cloth, 'Couleur de la tenue') : `<div class="stLbl">Haut</div>${tiles('top', AV2.top[G], 'torso')}${colors('topC', AV2.cloth, 'Couleur du haut')}`}`,
      bottom: () => one ? `<div class="tiny" style="padding:12px 0">Tu portes une tenue une pièce. Choisis « Haut + bas » dans l’onglet Haut pour changer le bas.</div>` : `${tiles('bottom', AV2.bottom[G], 'legs')}${colors('bottomC', AV2.cloth, 'Couleur')}`,
      shoes: () => `${tiles('shoes', AV2.shoes, 'feet', { bottom: 'shorts', outfit: 'none' })}${colors('shoesC', AV2.cloth, 'Couleur')}`,
      acc: () => `<div class="stLbl">Lunettes</div>${tiles('glasses', AV2.glasses, 'head')}<div class="stLbl">Couvre-chef</div>${tiles('hat', AV2.hat, 'hair')}${L.hat !== 'none' ? colors('hatC', AV2.cloth, 'Couleur') : ''}<div class="stLbl">Bijoux (plusieurs possibles)</div>${tiles('jewel', AV2.jewel, 'torso', { pose: 'relax' })}`
    })[tab]();
    big.innerHTML = avatar2SVG(L, { pedestal: true, style: 'width:100%;height:100%' }); cam(); $('#un', el).disabled = !undo.length; $('#mpi', el).src = av2URI(L);
  };
  // caméra du studio : zoom sur le visage pour cheveux / visage / accessoires, sur le buste pour le haut, sur les pieds pour les chaussures
  const CAM = { face: [42, 4, 116, 146], hair: [38, -2, 124, 156], acc: [38, -2, 124, 156], top: [8, 26, 184, 262], bottom: [4, 120, 192, 292], shoes: [52, 318, 96, 92] }, FULL = [14, -4, 172, 428];
  let camV = FULL.slice(), camT = 0;
  const cam = () => { const svg = big.querySelector('svg'); if (!svg) return; const to = CAM[tab] || FULL, from = camV.slice(), t0 = performance.now(); cancelAnimationFrame(camT);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = now => { const k = reduce ? 1 : Math.min(1, (now - t0) / 380), e = 1 - Math.pow(1 - k, 3); camV = from.map((v, i) => v + (to[i] - v) * e); const sv = big.querySelector('svg'); sv && sv.setAttribute('viewBox', camV.map(v => v.toFixed(1)).join(' ')); if (k < 1) camT = requestAnimationFrame(step); };
    svg.setAttribute('viewBox', camV.join(' ')); el.querySelector('.stPed').style.opacity = CAM[tab] ? 0 : 1; camT = requestAnimationFrame(step); };
  const push = () => { undo.push(JSON.stringify(L)); if (undo.length > 50) undo.shift(); };
  const pop = () => { big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop'); };
  $('#gd', el).onclick = e => { const b = e.target.closest('[data-g]'); if (!b || b.dataset.g === L.g) return; push(); const G = b.dataset.g; Object.assign(L, { g: G, hair: AV2.hair[G][G === 'f' ? 1 : 1][0], top: G === 'f' ? 'crop' : 'tee', bottom: G === 'f' ? 'cargo' : 'chinos', outfit: 'none', build: 'moyenne', beard: 'none' }); pop(); draw(); };
  $('#tb', el).onclick = e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; draw(); bd.scrollTop = 0; } };
  bd.onclick = e => { const k = e.target.closest('[data-k]'), c = e.target.closest('[data-c]'), h = e.target.closest('[data-h]');
    if (k) { push(); const key = k.dataset.k, v = k.dataset.v; if (key === 'jewel') L.jewel = (L.jewel || []).includes(v) ? L.jewel.filter(x => x !== v) : [...(L.jewel || []), v]; else L[key] = v; pop(); draw(); }
    if (c) { push(); L[c.dataset.c] = +c.dataset.i; pop(); draw(); } if (h) { push(); L.height = h.dataset.h; pop(); draw(); } };
  $('#un', el).onclick = () => { const p = undo.pop(); if (p) { Object.keys(L).forEach(k => delete L[k]); Object.assign(L, JSON.parse(p)); draw(); } };
  $('#rd', el).onclick = () => { push(); const G = L.g, r = a => a[Math.floor(Math.random() * a.length)]; const one = Math.random() < (G === 'f' ? .25 : .1);
    Object.assign(L, { build: r(AV2.build[G])[0], skin: Math.floor(Math.random() * AV2.skin.length), hair: r(AV2.hair[G])[0], hairC: Math.floor(Math.random() * 10), eyes: r(AV2.eyes)[0], mouth: r(AV2.mouth)[0], outfit: one ? r(AV2.outfit[G].slice(1))[0] : 'none', outfitC: Math.floor(Math.random() * AV2.cloth.length), top: r(AV2.top[G])[0], topC: Math.floor(Math.random() * AV2.cloth.length), bottom: r(AV2.bottom[G])[0], bottomC: Math.floor(Math.random() * AV2.cloth.length), shoes: r(AV2.shoes)[0], shoesC: Math.floor(Math.random() * AV2.cloth.length), pose: r(AV2.pose)[0], beard: G === 'm' ? r(AV2.beard)[0] : 'none', glasses: Math.random() < .25 ? r(AV2.glasses.slice(1))[0] : 'none', hat: 'none' }); pop(); draw(); };
  $('#pv', el).onclick = () => { const mp = $('#mp', el); mp.hidden = !mp.hidden; $('#pv', el).textContent = mp.hidden ? 'Voir sur la carte' : 'Voir en grand'; };
  const done = () => { ST.me.av2 = JSON.parse(JSON.stringify(L)); emit(); if (step) markStep('avatar'); onDone ? onDone() : V.perms(); };
  $('#go', el).onclick = done;
  $('#later', el) && ($('#later', el).onclick = () => { if (step) markStep('avatar'); onDone ? onDone() : V.perms(); });
  $('#bk', el) && ($('#bk', el).onclick = () => onDone ? onDone() : V.settings());
  draw();
};
V.avatarQuick = () => V.avatarPick(null, true);
V.avatarEditor = (onDone) => V.avatarPick(onDone || (() => V.settings()), false);
// profils et réglages : nouveau rendu
const _settings8 = V.settings;
V.settings = () => { _settings8(); const im = $('.scr .body .card img'); if (im) { im.src = av2URI(myAv2()); im.style.height = '120px'; } const b = $('#av'); if (b) b.onclick = () => V.avatarPick(() => V.settings(), false); };
const _friendSheet8 = V.friendSheet;
V.friendSheet = (id) => { _friendSheet8(id); const im = $('.sheet .sbody img'); if (im && FRIEND_AV2[id]) im.src = av2URI(FRIEND_AV2[id]); };
