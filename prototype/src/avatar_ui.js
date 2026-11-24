// ===== Créateur / modificateur d'avatar =====
ST.me.av = ST.me.av || { ...AV_DEFAULT, ...AV_PRESETS[0] };
const FRIEND_AV = { lea: AV_PRESETS[1], ines: AV_PRESETS[2], tom: AV_PRESETS[4], yanis: AV_PRESETS[3], sami: AV_PRESETS[6], chloe: AV_PRESETS[5], maya: AV_PRESETS[9], elsa: AV_PRESETS[11], nathan: AV_PRESETS[8] };
const _avCache = new Map();
function avURI(cfg, view = 'head') { const k = view + JSON.stringify(cfg); if (!_avCache.has(k)) { if (_avCache.size > 400) _avCache.clear(); _avCache.set(k, avData(cfg, view)); } return _avCache.get(k); }
const fHead = id => FRIEND_CHAR[id] ? CH(FRIEND_CHAR[id], 'h') : FRIEND_AV[id] ? avURI(FRIEND_AV[id]) : A + 'logo.webp';
meHead = () => avURI(ST.me.av);
const meFull = (style = '') => `<img src="${CH(ST.me.char || 'lins')}" alt="Ton avatar" style="${style};object-fit:contain">`;

const AVCATS = [
  ['body', I.user, 'Corps', [['build', 'Silhouette'], ['skin', 'Peau'], ['pose', 'Pose']]],
  ['face', I.smile, 'Visage', [['eyes', 'Yeux'], ['brows', 'Sourcils'], ['mouth', 'Bouche'], ['beard', 'Pilosité'], ['details', 'Détails']]],
  ['hairs', I.scissors, 'Cheveux', [['hair', 'Coiffure']]],
  ['clothes', I.hanger, 'Habits', [['top', 'Haut'], ['bottom', 'Bas'], ['shoes', 'Chaussures'], ['outfit', 'Tenue']]],
  ['acc', I.glasses, 'Accessoires', [['glasses', 'Lunettes'], ['hat', 'Chapeau'], ['ears', 'Oreilles'], ['neck', 'Cou'], ['extras', 'Festival']]]
];
// pour chaque sous-onglet : liste d'options, clé de couleur éventuelle, palette, cadrage de la vignette, cadrage de la caméra
const AVSUB = {
  build: { list: AV.build, view: 'full' }, skin: { color: 'skin', pal: AV.skin, view: 'head', list: null }, pose: { list: AV.pose, view: 'full' },
  eyes: { list: AV.eyes, color: 'eyeC', pal: AV.eyeC, view: 'head' }, brows: { list: AV.brows, view: 'head' }, mouth: { list: AV.mouth, view: 'head' }, beard: { list: AV.beard, color: 'beardC', pal: AV.hairC, view: 'head' },
  details: { multi: [['blush', 'Joues roses'], ['freckles', 'Taches de rousseur'], ['glitter', 'Paillettes']], view: 'head' },
  hair: { list: AV.hair, color: 'hairC', pal: AV.hairC, view: 'head' },
  top: { list: AV.top, color: 'topC', pal: AV.cloth, view: 'torso', clear: { outfit: 'none' } }, bottom: { list: AV.bottom, color: 'bottomC', pal: AV.cloth, view: 'legs', clear: { outfit: 'none' } },
  shoes: { list: AV.shoes, color: 'shoesC', pal: AV.cloth, view: 'feet' }, outfit: { list: AV.outfit, color: 'outfitC', pal: AV.cloth, view: 'full' },
  glasses: { list: AV.glasses, color: 'glassesC', pal: AV.cloth, view: 'head' }, hat: { list: AV.hat, color: 'hatC', pal: AV.cloth, view: 'head' }, ears: { list: AV.ears, view: 'head' }, neck: { list: AV.neck, view: 'torso' },
  extras: { multi: [['wristband', 'Bracelet cashless'], ['bag', 'Banane']], view: 'full' }
};
const CAM = { head: [22, 8, 156, 250], torso: [20, 90, 160, 220], legs: [10, 190, 180, 230], feet: [10, 250, 180, 170], full: [0, 10, 200, 412] };
const THUMB = { head: '22 12 156 156', torso: '20 100 160 170', legs: '20 220 160 200', feet: '40 340 120 72', full: '0 20 200 400' };

V.avatarEditor = (onDone) => {
  let cat = 'body', sub = 'skin'; const start = JSON.parse(JSON.stringify(ST.me.av)); const undo = []; let cam = [...CAM.full], camTo = [...CAM.full];
  const el = mount(`<div style="position:absolute;inset:0;overflow:hidden">${clouds()}</div>${statusBar()}
    <div class="topbar" style="position:relative;z-index:6"><button class="rb" id="cancel" aria-label="Annuler les changements">${I.back}</button><div style="flex:1;text-align:center"><b style="font-size:17px">Mon avatar</b><div class="tiny" id="saved"></div></div><button class="rb" id="undo" aria-label="Annuler la dernière modification">${I.reset}</button><button class="rb" id="ok" aria-label="Enregistrer" style="background:var(--pri);color:#fff">${I.check}</button></div>
    <div id="stage" style="position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center"><div id="big" style="height:100%;max-height:420px;aspect-ratio:200/412;transition:opacity .15s"></div>
      <div class="rail" style="top:4px;gap:6px">${AVCATS.map(c => `<button data-c="${c[0]}" aria-label="${c[2]}" title="${c[2]}" style="flex-direction:column;height:58px;gap:1px">${c[1]}<span style="font-size:9px;font-weight:800">${c[2]}</span></button>`).join('')}<div style="height:8px"></div><button id="dice" aria-label="Avatar au hasard" title="Au hasard">${I.dice}</button></div>
      <div id="tag" class="pill" style="position:absolute;left:14px;bottom:10px;background:#fff;color:var(--ink);box-shadow:0 2px 8px rgba(20,30,60,.12)">Moi · @${esc(ST.me.pseudo || 'alex.m')}</div></div>
    <div class="avpanel" id="avp" style="max-height:340px;min-height:180px;overflow:auto;flex-shrink:0"></div>`, 'sky');
  const big = $('#big', el), panel = $('#avp', el);
  const vb = () => cam.map(v => v.toFixed(1)).join(' ');
  const drawAvatar = () => { big.innerHTML = avatarSVG(ST.me.av, { pedestal: true, vb: vb(), style: 'width:100%;height:100%' }); };
  const animCam = () => { const k = .2; let moving = false; cam = cam.map((v, i) => { const d = camTo[i] - v; if (Math.abs(d) > .4) moving = true; return v + d * k; }); const s = big.querySelector('svg'); if (s) s.setAttribute('viewBox', vb()); if (moving && document.body.contains(el)) requestAnimationFrame(animCam); };
  const setCam = v => { camTo = [...CAM[v === 'full' ? 'full' : v]]; requestAnimationFrame(animCam); };
  const push = () => { undo.push(JSON.stringify(ST.me.av)); if (undo.length > 40) undo.shift(); $('#saved', el).textContent = 'Modifié · pense à enregistrer ✓'; };
  const thumb = (patch, view) => avatarSVG({ ...ST.me.av, ...patch }, { vb: THUMB[view], style: 'width:100%;height:100%' });
  const drawPanel = () => {
    const def = AVSUB[sub], a = ST.me.av; let h = `<div class="subtabs" style="gap:8px;overflow-x:auto;justify-content:flex-start;scrollbar-width:none;flex-shrink:0;padding:2px">${AVCATS.find(c => c[0] === cat)[3].map(s => `<button data-s="${s[0]}" class="${sub === s[0] ? 'on' : ''}" style="width:auto;border-radius:999px;padding:0 14px;height:40px;font-weight:700;font-size:13px">${s[1]}</button>`).join('')}</div>`;
    if (def.color && !(sub === 'glasses' && ['sun', 'none'].includes(a.glasses)) && !(sub === 'hat' && a.hat === 'none') && !(sub === 'outfit' && a.outfit === 'none')) h += `<div class="swatches" style="gap:8px">${def.pal.map((c, i) => `<button data-col="${i}" class="${(a[def.color] ?? -1) === i ? 'on' : ''}" style="background:${c};width:44px;height:44px" aria-label="${def.color === 'skin' ? 'Teinte de peau ' + (i + 1) + ' sur ' + def.pal.length : 'Couleur ' + c}"></button>`).join('')}</div>`;
    if (def.list) h += `<div class="items" style="grid-template-columns:repeat(4,1fr)">${def.list.map(([k, n]) => `<button data-v="${k}" class="${a[sub] === k ? 'on' : ''}" style="aspect-ratio:${def.view === 'feet' ? '1.2' : def.view === 'head' ? '1' : '.8'};background:linear-gradient(#EEF2FF,#fff);align-items:stretch;flex-direction:column" aria-label="${n}"><span style="flex:1;display:block;min-height:0;position:static;background:none;padding:0">${thumb({ [sub]: k, ...(def.clear && k ? def.clear : {}), ...(sub === 'outfit' && k === 'none' ? {} : {}) }, def.view)}</span><span>${n}</span></button>`).join('')}</div>`;
    if (def.multi) h += `<div class="list">${def.multi.map(([k, n]) => `<button class="row" data-m="${k}"><div class="grow"><div class="t">${n}</div></div><span class="tog ${a.extra.includes(k) ? 'on' : ''}"></span></button>`).join('')}</div>`;
    if (sub === 'skin') h += `<div class="small" style="text-align:center">10 teintes. La teinte s’applique au visage, aux bras et aux jambes.</div>`;
    panel.innerHTML = h;
    $$('.rail [data-c]', el).forEach(b => b.classList.toggle('on', b.dataset.c === cat));
  };
  const redraw = () => { drawAvatar(); drawPanel(); };
  el.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return; const a = ST.me.av, def = AVSUB[sub];
    if (t.dataset.c) { cat = t.dataset.c; sub = AVCATS.find(c => c[0] === cat)[3][0][0]; setCam(AVSUB[sub].view); drawPanel(); return; }
    if (t.dataset.s) { sub = t.dataset.s; setCam(AVSUB[sub].view); drawPanel(); return; }
    if (t.dataset.col !== undefined) { push(); a[def.color] = +t.dataset.col; redraw(); return; }
    if (t.dataset.v !== undefined) { push(); a[sub] = t.dataset.v; if (def.clear) Object.assign(a, def.clear); redraw(); return; }
    if (t.dataset.m) { push(); const k = t.dataset.m; a.extra = a.extra.includes(k) ? a.extra.filter(x => x !== k) : [...a.extra, k]; redraw(); return; }
    if (t.id === 'dice') { push(); const r = arr => arr[Math.floor(Math.random() * arr.length)]; Object.assign(a, { skin: Math.floor(Math.random() * AV.skin.length), hair: r(AV.hair)[0], hairC: Math.floor(Math.random() * AV.hairC.length), beardC: Math.floor(Math.random() * 10), outfitC: Math.floor(Math.random() * AV.cloth.length), shoesC: Math.floor(Math.random() * AV.cloth.length), eyes: r(AV.eyes)[0], mouth: r(AV.mouth)[0], top: r(AV.top)[0], topC: Math.floor(Math.random() * AV.cloth.length), bottom: r(AV.bottom)[0], bottomC: Math.floor(Math.random() * AV.cloth.length), outfit: Math.random() < .2 ? r(AV.outfit.slice(1))[0] : 'none', glasses: Math.random() < .3 ? r(AV.glasses)[0] : 'none', hat: Math.random() < .25 ? r(AV.hat)[0] : 'none', build: r(AV.build)[0], beard: Math.random() < .25 ? r(AV.beard)[0] : 'none' }); redraw(); return; }
    if (t.id === 'undo') { if (!undo.length) { toast('Rien à annuler'); return; } ST.me.av = JSON.parse(undo.pop()); redraw(); return; }
    if (t.id === 'cancel') { if (undo.length) { sysAlert({ title: 'Quitter sans enregistrer ?', text: 'Tes modifications seront perdues.', buttons: [{ t: 'Continuer à modifier', v: 0, b: 1 }, { t: 'Quitter', v: 1 }] }).then(v => { if (v) { ST.me.av = start; ST._avRestore = null; onDone ? onDone() : V.settings(); } }); } else { ST._avRestore = null; onDone ? onDone() : V.settings(); } return; }
    if (t.id === 'ok') { ST._avRestore = null; emit(); if (!onDone) toast(`<img src="${meHead()}" alt="">Avatar enregistré · visible par tes amis sur la carte`); onDone ? onDone() : V.settings(); }
  });
  redraw(); setCam('full'); ST._avRestore = start;
};
// Choix rapide (1 touche) pendant l'inscription
V.avatarQuick = () => {
  const el = mount(`${statusBar()}<div style="padding:4px 18px 0"><div class="tiny" style="font-weight:700;color:var(--pri)">ÉTAPE 2 SUR 4</div><h1 class="h2">Choisis ton avatar</h1><p class="small" style="margin:2px 0 0">C’est lui que tes amis verront sur la carte. Tu peux le personnaliser maintenant ou plus tard.</p></div>
    <div class="avstage" style="min-height:250px;align-items:center">${clouds()}<div id="big" style="height:250px;aspect-ratio:200/412;position:relative;z-index:2"></div></div>
    <div class="avpanel" style="gap:10px;padding-bottom:24px"><div class="swatches" id="skq" style="gap:7px">${AV.skin.slice(0, 9).map((c, i) => `<button data-sk="${i}" style="background:${c};width:30px;height:30px" aria-label="Teinte de peau ${i + 1}"></button>`).join('')}<button data-dice="1" aria-label="Avatar au hasard" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:var(--pri)">${I.dice.replace('<svg', '<svg width="18"')}</button></div><div class="items" id="bases" style="grid-template-columns:repeat(6,1fr)">${AV_PRESETS.map((p, i) => `<button class="base" data-i="${i}" aria-label="Avatar ${i + 1}" style="aspect-ratio:1;background:linear-gradient(#EEF2FF,#fff)">${avatarSVG(p, { view: 'head', style: 'width:100%;height:100%' })}</button>`).join('')}</div>
    <button class="btn" id="go">C’est moi !</button><button class="link" id="edit" style="min-height:30px">Personnaliser (coiffure, tenue, accessoires…)</button></div>`, 'sky');
  const draw = () => { $('#big', el).innerHTML = avatarSVG(ST.me.av, { pedestal: true, style: 'width:100%;height:100%' }); $$('#bases .base', el).forEach((b, i) => b.classList.toggle('on', JSON.stringify({ ...AV_DEFAULT, ...AV_PRESETS[i] }) === JSON.stringify(ST.me.av))); };
  $('#skq', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.dice) { const r = arr => arr[Math.floor(Math.random() * arr.length)]; ST.me.av = { ...AV_DEFAULT, ...r(AV_PRESETS), skin: Math.floor(Math.random() * 9) }; } else ST.me.av = { ...ST.me.av, skin: +b.dataset.sk }; draw(); };
  $('#bases', el).onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; ST.me.av = { ...AV_DEFAULT, ...AV_PRESETS[+b.dataset.i] }; draw(); };
  $('#edit', el).onclick = () => V.avatarEditor(() => { markStep('avatar'); V.perms(); });
  $('#go', el).onclick = () => { markStep('avatar'); V.perms(); };
  draw();
};
