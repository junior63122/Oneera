// ===== Parcours d'arrivée : QR → installation → compte → avatar → autorisations → amis → carte =====
const V = {};

V.camera = () => {
  ST.metrics = { taps: 0, start: null, steps: {} };
  const el = mount(`${statusBar(true)}
    <div style="flex:1;position:relative;background:radial-gradient(circle at 50% 40%,#3a3550,#0d0d12 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff">
      <div style="position:absolute;top:58px;left:0;right:0;text-align:center;font-size:13px;opacity:.75">Appareil photo · tu scannes l’affiche à l’entrée</div>
      <div style="width:230px;height:300px;border-radius:18px;background:linear-gradient(160deg,#F7B6E0,#C9B8F4);padding:16px;display:flex;flex-direction:column;align-items:center;gap:10px;color:#2A1B4A;box-shadow:0 20px 50px rgba(0,0,0,.5);transform:perspective(600px) rotateX(8deg)">
        <b style="font-size:20px;letter-spacing:.02em">Le Bal des Fous</b><span style="font-size:12px;font-weight:700">Retrouve tes amis sur la carte</span>
        <div style="width:150px;height:150px;background:#fff;border-radius:12px;padding:8px;position:relative"><canvas id="qrc" style="width:100%;height:100%"></canvas><div style="position:absolute;inset:-6px;border:3px solid #FFD60A;border-radius:16px;animation:blink 1.2s infinite"></div></div>
        <span style="font-size:11px;font-weight:700">ONEERA · scanne-moi</span>
      </div>
      <button id="qrChip" class="btn" style="width:auto;padding:0 18px;background:#FFD60A;color:#000;box-shadow:none;animation:pop .4s .5s both">
        <img src="${A}logo.webp" alt="" style="width:22px;height:22px;border-radius:6px"> Ouvrir « Le Bal des Fous » dans ONEERA</button>
    </div>`, 'dark');
  drawQR($('#qrc', el), EVENT.venueQR);
  $('#qrChip', el).onclick = () => { markStep('qr'); V.store(); };
};

V.welcome = () => {
  const el = mount(`${statusBar()}
    <div style="height:290px;margin:0 14px;border-radius:26px;overflow:hidden;position:relative;flex-shrink:0;background:url(${A}bdf_fest.webp) 45% 45%/250% auto">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0) 45%,rgba(20,15,40,.75))"></div>
      <div style="position:absolute;left:14px;top:14px" class="pill live" >En direct</div>
      <div style="position:absolute;left:16px;right:16px;bottom:14px;color:#fff"><div style="font-size:13px;font-weight:700;opacity:.9">${EVENT.date} · ${EVENT.hours}</div><div style="font-size:26px;font-weight:800">${EVENT.name}</div><div style="font-size:13px;opacity:.9">${EVENT.place} · ce soir : Kalia b2b Remo, Les Fous Orchestra…</div></div>
    </div>
    <div class="body" style="gap:10px;padding-top:14px">
      <h1 class="h2">Retrouve tes amis sur la carte du festival</h1>
      <p class="lead" style="font-size:14px">Un compte suffit pour toutes les soirées ONEERA. Pas de mot de passe.</p>
      <button class="btn dark" id="apple"><svg width="18" height="20" viewBox="0 0 17 20" fill="#fff"><path d="M14 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.5 4.8 1.9 5.8 1 7.4c-1.9 3.2-.5 8 1.3 10.6.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.8-1.1-3-4.4zM11.5 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z"/></svg> Continuer avec Apple</button>
      <div class="grid2"><button class="btn white" id="google"><b style="color:#4285F4">G</b> Google</button><button class="btn white" id="tel">${I.phone.replace('<svg', '<svg width="18"')} Téléphone</button></div>
      <button class="link" id="guest">Voir la carte sans compte</button><button class="chip" id="lng" style="align-self:center">🌐 ${ST.lang === 'en' ? 'Français' : 'English'}</button>
      <p class="tiny" style="text-align:center;margin:0">En continuant, tu acceptes les <button class="tiny" data-legal style="text-decoration:underline">Conditions d’utilisation</button> et la <button class="tiny" data-legal style="text-decoration:underline">Politique de confidentialité</button>.</p>
    </div>`);
  $('#apple', el).onclick = V.apple; $('#google', el).onclick = V.google; $('#tel', el).onclick = V.phone;
  if (ST.os === 'android') { const ap = $('#apple', el), go = $('#google', el); ap.className = 'btn white'; go.className = 'btn dark'; go.innerHTML = '<b style="color:#fff">G</b> Continuer avec Google'; ap.innerHTML = ' Apple'; const grid = go.parentElement; ap.replaceWith(go); grid.prepend(ap); }
  $('#lng', el).onclick = () => { ST.lang = ST.lang === 'en' ? 'fr' : 'en'; V.welcome(); };
  $('#guest', el).onclick = () => { ST.account = 'guest'; V.map(); toast('Mode invité : la carte et les lieux. Crée un compte pour voir tes amis.'); };
  $$('[data-legal]', el).forEach(u => u.onclick = V.legal);
};
V.legal = () => openSheet(`<h2 class="h2">Ce que tu acceptes, en clair</h2>
  <div class="list">${[['Ta position', 'Partagée seulement avec les amis que tu choisis, et seulement pendant l’événement. Tu peux couper à tout moment.'], ['Ce que voit l’organisateur', 'Des chiffres de foule anonymes (combien de personnes par zone), jamais ton nom ni ton parcours.'], ['Durée de conservation', 'Positions détaillées effacées 24 h après la fin de l’événement. Ton récap reste dans ton compte si tu le gardes.'], ['Tes droits', 'Télécharger ou supprimer tes données depuis Réglages, en 2 touches.']].map(r => `<div class="row" style="align-items:flex-start"><div class="grow"><div class="t">${r[0]}</div><div class="s">${r[1]}</div></div></div>`).join('')}</div>
  <p class="tiny">Texte juridique complet : CGU et politique de confidentialité ONEERA (à valider par un juriste avant publication).</p>`);

V.apple = () => {
  const sb = openSheet(`<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:17px"> Identifiant Apple</b><button class="rb ghost" data-x aria-label="Fermer">${I.close}</button></div>
    <div style="text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center"><img src="${A}logo.webp" alt="" style="width:60px;height:60px;border-radius:14px"><b style="font-size:20px">Crée ton compte ONEERA avec ton identifiant Apple</b></div>
    <div class="list"><div class="row"><div class="ico">${I.user}</div><div class="grow"><div class="t">Alex Moreau</div><div class="s">Nom</div></div></div>
    <button class="row" id="mail"><div class="ico">${I.lock}</div><div class="grow"><div class="t">Masquer mon adresse e-mail</div><div class="s">Transfert vers ton adresse, ONEERA ne la voit pas</div></div>${I.check.replace('<svg', '<svg width="20" style="color:#0A7AFF"')}</button></div>
    <button class="btn dark" id="cont">Continuer</button>`);
  $('[data-x]', sb).onclick = () => closeSheet(); $('#cont', sb).onclick = async () => {
    $('#cont', sb).innerHTML = '<span style="font-size:22px">◉</span> Face ID…'; await sleep(900);
    ST.account = 'apple'; ST.me.first = 'Alex'; closeSheet(true); markStep('account'); V.profile();
  };
};
V.google = () => {
  const sb = openSheet(`<div style="text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center"><b style="font-size:22px;color:#4285F4">G</b><b style="font-size:18px">Choisir un compte</b><span class="small">pour continuer vers ONEERA</span></div>
    <div class="list"><button class="row" id="acc"><div class="av" style="background:#4285F4;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">A</div><div class="grow"><div class="t">Alex Moreau</div><div class="s">alex.m•••@gmail.com</div></div></button><button class="row" id="oth"><div class="ico">${I.plus}</div><div class="grow"><div class="t">Utiliser un autre compte</div></div></button></div>
    <p class="tiny">Google partagera ton nom, ton adresse e-mail et ta photo de profil avec ONEERA.</p>`);
  $('#oth', sb).onclick = () => toast('Prototype : connexion à un autre compte Google'); $('#acc', sb).onclick = () => { ST.account = 'google'; closeSheet(true); markStep('account'); V.profile(); };
};
V.otp = (num) => {
  let code = '';
  const el = mount(`${statusBar()}<div class="topbar"><button class="rb" data-back aria-label="Retour">${I.back}</button><h1></h1><span style="width:44px"></span></div>
    <div class="body"><h1 class="h2">Code reçu par SMS</h1><p class="lead">Envoyé au ${esc(num)}</p>
    <div class="otp" id="otp">${'<span></span>'.repeat(6)}</div><button class="link" style="width:auto" id="rs">Renvoyer le code (0:24)</button></div>
    <div style="background:#D1D4DB;padding:6px 6px 0"><button class="suggest" id="sug" style="width:100%">${ST.os === 'android' ? 'Code détecté automatiquement' : 'Depuis Messages'} · <b>482 913</b></button></div>
    <div class="kp" id="kp" style="padding-top:6px">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => (k === '' ? '<span class="n" aria-hidden="true"></span>' : `<button data-k="${k}"${k === '⌫' ? ' aria-label="Effacer"' : ''}>${k}</button>`)).join('')}</div>`, 'white');
  let done = false; const show = () => { $$('#otp span', el).forEach((s, i) => { s.textContent = code[i] || ''; s.classList.toggle('f', i === code.length); }); if (code.length === 6 && !done) { done = true; setTimeout(() => { ST.account = 'phone'; markStep('account'); V.profile(); }, 350); } };
  $('#kp', el).onclick = e => { const k = e.target.closest('button')?.dataset.k; if (k === undefined || k === '') return; code = k === '⌫' ? code.slice(0, -1) : (code + k).slice(0, 6); show(); };
  $('#sug', el).onclick = () => { code = '482913'; show(); }; $('#rs', el).onclick = () => toast('Nouveau code envoyé');
  $('[data-back]', el).onclick = V.phone; show();
};

const clouds = () => [[-40, 40, 220], [180, 10, 260], [60, 170, 200], [250, 220, 180], [-60, 300, 240]].map(([x, y, s]) => `<div class="cloud" style="left:${x}px;top:${y}px;width:${s}px;height:${s * .55}px"></div>`).join('');


const isAnd = () => ST.os === 'android';
V.store = () => {
  // Le QR ouvre d'abord une App Clip (iOS) / Instant App (Android) : la carte s'affiche sans attendre l'installation complète
  const sb = openSheet(`<div style="height:150px;border-radius:18px;background:url(${A}bdf_fest.webp) 45% 45%/230% auto;position:relative;overflow:hidden"><div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(20,15,40,.7))"></div><b style="position:absolute;left:14px;bottom:10px;color:#fff;font-size:20px">Le Bal des Fous</b></div>
    <div style="display:flex;gap:12px;align-items:center"><img src="${A}logo.webp" alt="" style="width:52px;height:52px;border-radius:13px"><div style="flex:1"><b style="font-size:16px">Carte du festival et tes amis</b><div class="small">ONEERA · ${isAnd() ? 'Instant App Google Play' : 'App Clip'} · moins de 10 Mo</div></div></div>
    <button class="btn" id="open">Ouvrir</button>
    <div class="small" style="background:#F3F5FB;border-radius:12px;padding:10px">Pas d’installation : la carte s’ouvre tout de suite, même sur un réseau saturé. L’app complète (38 Mo) s’installe ensuite en arrière-plan, et tu gardes ton compte.</div>
    <div class="tiny" style="text-align:center">Prototype : chargement simulé. En réel, ${isAnd() ? 'une Instant App' : 'une App Clip'} de moins de 10 Mo s’ouvre en 3 à 8 s en 4G chargée.</div>`);
  $('#open', sb).onclick = async () => { const b = $('#open', sb); b.disabled = true; for (let p = 0; p <= 100; p += 10) { b.textContent = 'Ouverture… ' + p + ' %'; await sleep(90); } closeSheet(true); markStep('install'); V.welcome(); };
};
V.phone = () => {
  let num = '', cc = '+33', flag = '🇫🇷';
  const el = mount(`${statusBar()}<div class="topbar"><button class="rb" data-back aria-label="Retour">${I.back}</button><h1></h1><span style="width:44px"></span></div>
    <div class="body"><h1 class="h2">Ton numéro de téléphone</h1><p class="lead">On t’envoie un code par SMS. Il sert aussi à te retrouver dans les contacts de tes amis.</p>
    <div style="display:flex;gap:8px"><button class="inp" id="cc" style="width:104px;display:flex;align-items:center;gap:6px;flex-shrink:0" aria-label="Pays">🇫🇷 +33 ▾</button><div class="inp" id="num" style="display:flex;align-items:center;color:var(--ink3)">6 12 34 56 78</div></div>
    <button class="btn" id="send" disabled>Recevoir le code</button></div>
    <div class="kp" id="kp">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => (k === '' ? '<span class="n" aria-hidden="true"></span>' : `<button data-k="${k}"${k === '⌫' ? ' aria-label="Effacer"' : ''}>${k}</button>`)).join('')}</div>`, 'white');
  const show = () => { const d = num.replace(/(\d)(?=(\d{2})+$)/g, '$1 '); $('#num', el).textContent = d || '6 12 34 56 78'; $('#num', el).style.color = num ? 'var(--ink)' : 'var(--ink3)'; $('#send', el).disabled = num.length < 8; $('#cc', el).textContent = flag + ' ' + cc + ' ▾'; };
  $('#cc', el).onclick = () => { const sb = openSheet(`<h2 class="h2">Pays</h2><div class="list">${[['🇫🇷', '+33', 'France'], ['🇬🇧', '+44', 'Royaume-Uni'], ['🇮🇹', '+39', 'Italie'], ['🇩🇪', '+49', 'Allemagne'], ['🇪🇸', '+34', 'Espagne'], ['🇺🇸', '+1', 'États-Unis'], ['🇧🇪', '+32', 'Belgique'], ['🇨🇭', '+41', 'Suisse']].map(c => `<button class="row" data-c="${c[1]}" data-f="${c[0]}"><span style="font-size:22px">${c[0]}</span><div class="grow"><div class="t">${c[2]}</div></div><span class="small">${c[1]}</span></button>`).join('')}</div>`); sb.onclick = e => { const r = e.target.closest('[data-c]'); if (r) { cc = r.dataset.c; flag = r.dataset.f; closeSheet(); show(); } }; };
  $('#kp', el).onclick = e => { const k = e.target.closest('button')?.dataset.k; if (k === undefined || k === '') return; num = k === '⌫' ? num.slice(0, -1) : (num + k).slice(0, 11); show(); };
  $('[data-back]', el).onclick = V.welcome;
  $('#send', el).onclick = () => V.otp(cc + ' ' + num);
  setTimeout(() => { if (!num && document.body.contains(el)) { num = '612345678'; show(); } }, 900);
};
V.profile = () => {
  ST.me.pseudo = ST.me.pseudo || 'alex.m';
  const el = mount(`${statusBar()}<div class="body" style="padding-top:18px">
    <div class="tiny" style="font-weight:700;color:var(--pri)">ÉTAPE 1 SUR 4 · ENVIRON 10 SECONDES</div>
    <h1 class="h2">Comment tes amis te verront</h1>
    <div class="field"><label for="ps">Pseudo (affiché sur la carte, jamais ton e-mail)</label><div style="position:relative"><input class="inp" id="ps" value="${esc(ST.me.pseudo)}" autocomplete="off" maxlength="20"><span id="ok" class="pill ok" style="position:absolute;right:10px;top:13px">Disponible</span></div></div>
    ${tpl().minAge ? `<button class="row" id="maj" style="background:#fff;border-radius:14px;border:1.5px solid var(--line)"><div class="grow"><div class="t">J’ai ${tpl().minAge} ans ou plus</div><div class="s">Événement réservé aux ${tpl().minAge}+ : active pour continuer</div></div><span class="tog" role="switch" aria-checked="false"></span></button>` : ''}
    <div id="why" class="small" style="color:#9A5800" hidden>Confirme que tu es majeur pour continuer.</div>
    </div><div style="padding:0 18px 30px;background:#fff"><button class="btn" id="go">Continuer</button></div>`, 'white');
  const ps = $('#ps', el); let major = !tpl().minAge;
  ps.oninput = () => { const v = ps.value.trim().toLowerCase(); const taken = ['alex', 'admin', 'oneera'].includes(v); $('#ok', el).className = 'pill ' + (v.length < 3 || taken ? 'bad' : 'ok'); $('#ok', el).textContent = v.length < 3 ? '3 caractères min.' : taken ? 'Déjà pris' : 'Disponible'; };
  $('#maj', el) && ($('#maj', el).onclick = () => { major = !major; $('#maj .tog', el).classList.toggle('on', major); $('#why', el).hidden = true; });
  $('#go', el).onclick = () => { const v = ps.value.trim(); if (v.length < 3 || ['alex', 'admin', 'oneera'].includes(v.toLowerCase())) { ps.focus(); return; } if (!major) { $('#why', el).hidden = false; return; } ST.me.pseudo = v; V.avatarQuick(); };
};
// Une seule autorisation au départ : la localisation. Les autres sont demandées au moment où elles servent.
V.perms = () => {
  const el = mount(`${statusBar()}<div class="body" style="padding-top:14px">
    <div class="tiny" style="font-weight:700;color:var(--pri)">ÉTAPE 3 SUR 4</div><h1 class="h2">Place-toi sur la carte</h1>
    <div class="card" style="align-items:center;text-align:center;background:linear-gradient(180deg,#EEF2FF,#fff)"><div style="width:100%;height:clamp(110px,18vh,170px);border-radius:16px;background:url(${A}bdf_fest.webp) 48% 55%/260% auto;position:relative"><span style="position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px;border-radius:9px;background:#4F6BF5;border:3px solid #fff;box-shadow:0 0 0 14px rgba(79,107,245,.22)"></span></div>
      <b>Ta position, seulement pendant l’événement</b><span class="small">Pour te voir sur le plan et que tes amis te retrouvent. Arrêt automatique à la sortie du site.</span></div>
    <button class="link" id="why" style="justify-content:flex-start">Pourquoi une seule autorisation ?</button>
    <button class="row" id="stats" style="background:#F3F5FB;border-radius:16px;align-items:flex-start"><div class="grow"><div class="t">Aider le lieu avec des stats anonymes</div><div class="s">Affluence des bars et des zones, sans ton nom ni ton parcours. Facultatif, désactivé par défaut.</div></div><span class="tog ${ST.perms.stats ? 'on' : ''}" id="tg"></span></button>
    <div id="age" ${ST.perms.stats ? '' : 'hidden'} class="field"><label>Ta tranche d’âge (facultatif, pour ces stats)</label><div class="chips" style="flex-wrap:wrap" id="ages">${['18-24', '25-34', '35-44', '45+'].map(a => `<button class="chip ${ST.me.age === a ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div></div>
    </div><div style="padding:0 18px 30px;background:#fff;display:flex;flex-direction:column;gap:4px"><button class="btn" id="all">Activer ma position</button><button class="link" id="later">Plus tard</button></div>`, 'white');
  $('#stats', el).onclick = () => { ST.perms.stats = !ST.perms.stats; $('#tg', el).classList.toggle('on', ST.perms.stats); $('#age', el).hidden = !ST.perms.stats; };
  $('#ages', el).onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; ST.me.age = b.dataset.a; $$('#ages .chip', el).forEach(c => c.classList.toggle('on', c === b)); };
  $('#all', el).onclick = async () => { $('#all', el).disabled = true; ST.perms.loc = await askLocation(); markStep('perms'); V.addFriends(true); };
  $('#later', el).onclick = () => { markStep('perms'); V.addFriends(true); };
  $('#why', el) && ($('#why', el).onclick = () => openSheet(`<h2 class="h2">Une autorisation à la fois</h2><p class="small">Les notifications sont demandées au premier ami ajouté, les pas au moment de ton récap. ${isAnd() ? 'Les « appareils à proximité » (balises) sont demandés dans les lieux équipés.' : 'Sur iPhone, les balises du lieu fonctionnent avec la localisation.'} ${hasFlag('mesh') ? 'Ici, sans réseau, le Bluetooth sera demandé pour relayer les positions entre téléphones.' : ''}</p>`));
};
function askLocation() {
  return isAnd() ? sysAlert({ title: 'Autoriser ONEERA à accéder à la position de cet appareil ?', text: '', map: 1, buttons: [{ t: 'Lorsque vous utilisez l’appli', v: 'app', b: 1 }, { t: 'Uniquement cette fois-ci', v: 'once' }, { t: 'Ne pas autoriser', v: null }] })
    : sysAlert({ title: 'Autoriser « ONEERA » à utiliser votre position ?', text: 'Ta position te place sur le plan du festival et permet à tes amis de te retrouver.', map: 1, buttons: [{ t: 'Autoriser une fois', v: 'once' }, { t: 'Autoriser lorsque l’app est active', v: 'app', b: 1 }, { t: 'Ne pas autoriser', v: null }] });
}
async function askNotif() { if (ST.perms.notif != null) return; ST.perms.notif = await sysAlert(isAnd() ? { title: 'Autoriser ONEERA à vous envoyer des notifications ?', text: '', buttons: [{ t: 'Autoriser', v: true, b: 1 }, { t: 'Ne pas autoriser', v: false }] } : { title: '« ONEERA » souhaite vous envoyer des notifications', text: 'Pour savoir quand tes amis acceptent, et recevoir les alertes du lieu.', buttons: [{ t: 'Ne pas autoriser', v: false }, { t: 'Autoriser', v: true, b: 1 }] }); }

// Ajout d'amis : la bande par lien (sans validation), QR face à face (immédiat), contacts présents ce soir
V.addFriends = (onboarding) => {
  const el = mount(`${statusBar()}<div class="topbar">${onboarding ? '<span style="width:44px"></span>' : `<button class="rb" data-back aria-label="Retour">${I.back}</button>`}<h1>${onboarding ? '' : 'Ajouter des amis'}</h1><span style="width:44px"></span></div>
    <div class="body" style="padding-top:0">
    ${onboarding ? '<div class="tiny" style="font-weight:700;color:var(--pri)">ÉTAPE 4 SUR 4</div><h1 class="h2">Retrouve ta bande</h1>' : ''}
    <button class="card" id="band" style="flex-direction:row;align-items:center;gap:12px;text-align:left;background:linear-gradient(90deg,#4A63E8,#6E8BF7);color:#fff"><img src="${A}av/7_happy.webp" alt="" style="width:74px"><div style="flex:1"><b style="font-size:16px">Crée ta bande</b><div style="font-size:12.5px;opacity:.92">Un lien dans ton groupe WhatsApp : chacun qui l’ouvre est ajouté, sans validation</div></div></button>
    <div class="grid2"><button class="card" id="contacts" style="flex-direction:row;align-items:center;gap:10px;text-align:left;background:#F3F5FB"><div class="ico" style="background:#fff">${I.contacts}</div><b style="font-size:13.5px">Mes contacts présents ici</b></button><button class="card" data-m="qr" style="flex-direction:row;align-items:center;gap:10px;text-align:left;background:#F3F5FB"><div class="ico" style="background:#fff">${I.qr}</div><b style="font-size:13.5px">Face à face (QR)</b></button></div>
    <div style="display:flex;gap:8px"><button class="chip" data-m="pseudo" style="flex:1;justify-content:center">${I.search.replace('<svg', '<svg width="16"')} Par pseudo</button><button class="chip" data-m="loc" style="flex:1;justify-content:center">${I.link.replace('<svg', '<svg width="16"')} Position par lien (1 h)</button></div>
    <div id="res" style="display:flex;flex-direction:column;gap:10px"></div>
    ${onboarding ? '<div class="card" id="empty" style="align-items:center;text-align:center;background:#F7F7F9;box-shadow:none"><div style="width:100%;height:110px;border-radius:14px;background:url(' + A + 'bdf_fest.webp) 46% 45%/300% auto;opacity:.75"></div><span class="small">Tes amis apparaîtront ici, sur la carte, dès qu’ils sont ajoutés.</span></div>' : ''}
    </div>${onboarding ? `<div style="padding:8px 18px 30px;background:#fff;border-top:1px solid var(--line)"><button class="btn" id="go">Voir la carte</button></div>` : ''}`, 'white');
  const res = $('#res', el);
  const goLabel = () => { const g = $('#go', el); if (g) g.textContent = ST.friends.length ? `Voir la carte (${ST.friends.length} ami${ST.friends.length > 1 ? 's' : ''})` : 'Voir la carte'; };
  const renderMatches = () => {
    $('#empty', el)?.remove(); const here = CONTACTS_ON.filter(c => !c.away), away = CONTACTS_ON.filter(c => c.away);
    const st = id => ST.friends.includes(id) ? 'ami' : ST.sent?.includes(id) ? 'sent' : '';
    const row = c => `<div class="row"><img class="av" src="${fHead(c.id)}" alt=""><div class="grow"><div class="t">${esc(c.n)}</div><div class="s">${c.away ? 'Pas à cet événement' : '<span style="color:#0B7A3B;font-weight:700">● Ici ce soir</span>'}</div></div>${st(c.id) === 'ami' ? '<span class="pill ok">Ami ✓</span>' : st(c.id) === 'sent' ? '<span class="pill gray">En attente</span>' : `<button class="btn sm" data-add="${c.id}">Ajouter</button>`}</div>`;
    res.innerHTML = `<div class="sec" style="margin:0">${here.length} de tes contacts sont ici ce soir</div><button class="btn sm" id="addHere" style="width:100%" ${here.every(c => st(c.id)) ? 'disabled' : ''}>Ajouter les ${here.length} qui sont ici</button>
      <div class="tiny">Ils verront ta position pendant l’événement, et toi la leur quand ils acceptent.</div>
      <div class="list">${here.map(row).join('')}</div><div class="sec" style="margin:0">Ont ONEERA, pas ici ce soir</div><div class="list">${away.map(row).join('')}</div>
      <div class="card" style="flex-direction:row;align-items:center;gap:10px;background:#F3F5FB"><div style="flex:1"><b>${CONTACTS_OFF.length} contacts n’ont pas l’app</b><div class="small">Invite-les : ils voient la carte sans installer</div></div><button class="btn sm white" id="inv">Inviter</button></div>`;
    goLabel();
  };
  const sendReq = async ids => {
    ST.sent = [...new Set([...(ST.sent || []), ...ids])]; renderMatches(); await askNotif();
    ids.forEach((id, i) => { const c = CONTACTS_ON.find(x => x.id === id); if (!c || c.away) return;
      setTimeout(() => { if (!ST.friends.includes(id)) { ST.friends.push(id); emit(); toast(`<img src="${fHead(c.id)}" alt="">${esc(c.n.split(' ')[0])} a accepté`); if (document.body.contains(res)) renderMatches(); } }, 4000 + i * 3500); });
  };
  res.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add) sendReq([b.dataset.add]);
    if (b.id === 'addHere') sendReq(CONTACTS_ON.filter(c => !c.away).map(c => c.id));
    if (b.id === 'inv') V.shareSheet('Rejoins-moi au Bal des Fous 👉 oneera.app/i/alexm (la carte s’ouvre sans installer)'); });
  $('#band', el).onclick = () => { V.shareSheet('On se retrouve sur la carte du Bal des Fous 👉 oneera.app/b/bande-alex (ajout automatique)', async () => {
    await askNotif(); toast('Lien envoyé dans « La bande du Bal »');
    ['lea', 'tom', 'ines'].forEach((id, i) => setTimeout(() => { if (!ST.friends.includes(id)) { ST.friends.push(id); emit(); const c = CONTACTS_ON.find(x => x.id === id); toast(`<img src="${fHead(c.id)}" alt="">${c.n.split(' ')[0]} a rejoint ta bande`); if (document.body.contains(res)) goLabel(); } }, 2500 + i * 2500)); }); };
  $('#contacts', el).onclick = async () => {
    if (ST.perms.contacts == null) {
      const v = await sysAlert(isAnd() ? { title: 'Autoriser ONEERA à accéder à vos contacts ?', text: '', buttons: [{ t: 'Autoriser', v: 'full', b: 1 }, { t: 'Ne pas autoriser', v: null }] } : { title: '« ONEERA » souhaite accéder à vos contacts', text: 'Pour te montrer quels amis utilisent déjà ONEERA. Les numéros sont comparés de façon sécurisée et ne sont jamais conservés.', buttons: [{ t: 'Autoriser l’accès complet', v: 'full', b: 1 }, { t: 'Sélectionner des contacts…', v: 'some' }, { t: 'Ne pas autoriser', v: null }] });
      ST.perms.contacts = v; if (!v) { toast('Sans contacts : utilise ta bande ou le QR.'); return; }
    }
    renderMatches();
  };
  $$('[data-m]', el).forEach(b => b.onclick = () => ({ qr: V.qrFriend, pseudo: V.searchPseudo, loc: () => V.shareSheet('Je suis ici 👉 oneera.app/l/7f3k (position en direct, valable 1 h, sans installer)') })[b.dataset.m]());
  $('[data-back]', el) && ($('[data-back]', el).onclick = V.friendsTab);
  const go = $('#go', el); if (go) go.onclick = () => { markStep('friends'); V.map(); };
  if (ST.perms.contacts) renderMatches(); goLabel(); listeners.add(function gl() { if (!document.body.contains(el)) return listeners.delete(gl); goLabel(); });
};

V.qrFriend = () => {
  const sb = openSheet(`<div class="seg" id="sg"><button class="on" data-v="me">Mon code</button><button data-v="scan">Scanner</button></div><div id="qv"></div>`);
  const draw = v => { $$('#sg button', sb).forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $('#qv', sb).innerHTML = v === 'me' ? `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px"><div class="qr"><canvas id="qc"></canvas></div><b>@${esc(ST.me.pseudo)}</b><span class="small" style="text-align:center">Ton ami scanne ce code avec son appareil photo : vous êtes amis tout de suite, sans demande à accepter.</span></div>`
      : `<div style="height:300px;border-radius:20px;background:#111;position:relative;display:flex;align-items:center;justify-content:center"><div style="width:190px;height:190px;border:3px solid #fff;border-radius:22px;opacity:.85"></div><span style="position:absolute;bottom:14px;color:#fff;font-size:13px">Vise le code de ton ami</span></div><button class="btn" id="fake">Simuler : scanner le code de Chloé</button>`;
    if (v === 'me') drawQR($('#qc', sb), ST.me.pseudo);
    const f = $('#fake', sb); if (f) f.onclick = () => { if (!ST.friends.includes('chloe')) ST.friends.push('chloe'); emit(); closeSheet(); toast(`<img src="${fHead('chloe')}" alt="">Chloé et toi êtes amis`); };
  };
  $('#sg', sb).onclick = e => { const b = e.target.closest('[data-v]'); if (b) draw(b.dataset.v); }; draw('me');
};
V.searchPseudo = () => {
  const sb = openSheet(`<h2 class="h2">Ajouter par pseudo</h2><input class="inp" id="q" placeholder="@pseudo" autocomplete="off"><div id="r" class="list"></div>`);
  const q = $('#q', sb); q.focus();
  q.oninput = () => { const v = q.value.toLowerCase().replace('@', ''); const m = CONTACTS_ON.concat([{ id: 'nathan', n: 'Nathan', h: 'group_20' }]).filter(c => v && c.n.toLowerCase().includes(v));
    $('#r', sb).innerHTML = m.map(c => `<div class="row"><img class="av" src="${fHead(c.id)}" alt=""><div class="grow"><div class="t">${esc(c.n)}</div><div class="s">@${c.id}</div></div><button class="btn sm" data-a="${c.id}">${ST.friends.includes(c.id) ? 'Ami' : 'Ajouter'}</button></div>`).join('') || (v ? '<div class="row"><span class="small">Aucun résultat</span></div>' : ''); };
  $('#r', sb).onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; b.textContent = 'Envoyé'; b.disabled = true; setTimeout(() => { if (!ST.friends.includes(b.dataset.a)) ST.friends.push(b.dataset.a); emit(); toast('Demande acceptée'); }, 1500); };
};
V.shareSheet = (text, after) => {
  const sb = openSheet(`<div class="card" style="background:#F3F5FB"><div class="small">${esc(text)}</div></div>
    <div class="grid3">${[['Messages', '#34C759'], ['WhatsApp', '#25D366'], ['Instagram', '#E1306C'], ['Snapchat', '#FFFC00'], ['Copier le lien', '#8E8E93'], ['Plus', '#C7C7CC']].map(a => `<button class="card" data-app="${a[0]}" style="align-items:center;gap:6px;padding:12px 4px"><span style="width:46px;height:46px;border-radius:12px;background:${a[1]}"></span><span style="font-size:12px;font-weight:650">${a[0]}</span></button>`).join('')}</div>`);
  sb.onclick = async e => { const b = e.target.closest('[data-app]'); if (!b) return; if (b.dataset.app === 'Copier le lien') { try { await navigator.clipboard.writeText(text); } catch (_) { } } closeSheet(); if (after) after(); else toast(b.dataset.app === 'Copier le lien' ? 'Lien copié' : 'Partagé via ' + b.dataset.app); };
};
