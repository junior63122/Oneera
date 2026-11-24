// ===== v6 : avatars haute qualité (rendus du Drive ONEERA) — en pied sur la carte, au choix à l'inscription, dans les profils =====
// Double rendu demandé par le fondateur : premium à l'édition et dans les profils (≈ 1100 px), version légère sur la carte (260 px).
const CHAR_PICK = ['lins', 'c30', 'metisse', 'rousse', 'noir', 'c31', 'short'];
ST.me.char = ST.me.char || 'lins';
meHead = () => CH(ST.me.char || 'lins', 'h');
// pied de l'avatar : socle coloré (couleur de l'ami), ombre portée, et l'avatar debout sur la carte
const _personMarker = personMarker;
personMarker = function (id, name, head, at, o = {}) {
  const m = _personMarker(id, name, head, at, o), k = /\/c\/(\w+)_h\.webp/.exec(head || '');
  if (!k) return m;
  const c = o.me ? '#4F6BF5' : o.stale ? '#8A8FA6' : o.col || (o.staff ? '#E58A00' : '#0E9F8A');
  m.html = `<div class="fr fullb"><div class="name">${esc(name)}${o.sub ? `<span style="color:${o.stale ? '#9A5800' : '#6B7084'};font-weight:650">· ${o.sub}</span>` : ''}</div><img class="bodyimg" src="${CH(k[1], 'm')}" alt=""><div class="foot" style="--c:${c}"></div></div>`;
  m.cls = (m.cls || '') + ' hasbody'; if (m.halo && !o.stale && (o.acc || 4) <= 5) delete m.halo; // position précise : le socle suffit ; incertaine : halo conservé
  return m;
};
// Choix de l'avatar : les personnages haute qualité, présentés en grand sur leur socle
V.avatarPick = (onDone, step = true) => {
  let sel = ST.me.char || 'lins';
  const el = mount(`${statusBar()}<div style="padding:4px 18px 0">${step ? '<div class="tiny" style="font-weight:700;color:var(--pri)">ÉTAPE 2 SUR 4</div>' : ''}<h1 class="h2">Crée ton propre avatar !</h1><p class="small" style="margin:2px 0 0">C’est lui que tes amis verront sur la carte.</p></div>
    <div class="avstage pick" style="min-height:300px;align-items:flex-end">${clouds()}<div class="ped"></div><img id="big" alt="Ton avatar" src="${CH(sel)}"></div>
    <div class="avpanel" style="gap:10px;padding-bottom:24px"><div class="chargrid" id="cg">${CHAR_PICK.map(k => `<button data-c="${k}" class="${k === sel ? 'on' : ''}" aria-label="Choisir ce personnage"><img src="${CH(k, 'h')}" alt=""></button>`).join('')}</div>
    <button class="btn" id="go">C’est moi !</button>${step ? '<button class="link" id="later" style="min-height:30px">Une prochaine fois</button>' : '<button class="link" id="later" style="min-height:30px">Annuler</button>'}
    <div class="tiny" style="text-align:center">Tenues, coiffures et accessoires sur mesure : arrivent avec les modèles 3D de l’app.</div></div>`, 'sky');
  const big = $('#big', el);
  $('#cg', el).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; sel = b.dataset.c; $$('#cg button', el).forEach(x => x.classList.toggle('on', x === b)); big.classList.remove('pop'); void big.offsetWidth; big.src = CH(sel); big.classList.add('pop'); };
  $('#go', el).onclick = () => { ST.me.char = sel; emit(); if (step) markStep('avatar'); onDone ? onDone() : V.perms(); };
  $('#later', el).onclick = () => { if (step) markStep('avatar'); onDone ? onDone() : V.perms(); };
};
V.avatarQuick = () => V.avatarPick(null, true);
// Réglages : « Modifier mon avatar » et « Changer la photo » ouvrent le même choix
const _settings6 = V.settings;
V.settings = () => { _settings6(); const b = $('#av'); if (b) b.onclick = () => V.avatarPick(() => V.settings(), false); };
const _editProfile6 = V.editProfile;
V.editProfile = () => { _editProfile6(); const b = $('#ph'); if (b) b.onclick = () => { closeSheet(true); V.avatarPick(() => V.settings(), false); }; };
