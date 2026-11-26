// ===== Version réelle : comptes, amis et positions via le serveur ONEERA (+ mode test de la carte) =====
// Le mode démo (données simulées) reste accessible depuis l'accueil. Le mode réel remplace les amis simulés
// par les vrais amis du compte, reçus en direct par la passerelle temps réel.
const REAL = {
  api: (() => { try { const q = new URLSearchParams(location.search).get('api'); if (q) return q.replace(/\/$/, ''); } catch (_) {} return 'https://oneera-api.onrender.com'; })(),
  token: null, user: null, email: '', friends: [], eventId: null, ws: null, wsOk: false, retry: 0,
  pos: {}, online: {}, lastSent: null, sharingSent: null, testMap: true, demo: false,
};
const REAL_KEY = 'oneera.real.v1';
const realSave = () => { try { localStorage.setItem(REAL_KEY, JSON.stringify({ token: REAL.token, user: REAL.user, email: REAL.email, testMap: REAL.testMap })); } catch (_) {} };
const realLoad = () => { try { const o = JSON.parse(localStorage.getItem(REAL_KEY) || 'null'); if (o && o.token) Object.assign(REAL, { token: o.token, user: o.user, email: o.email || '', testMap: o.testMap !== false }); } catch (_) {} };
const realOn = () => !!REAL.token && !REAL.demo;

// ---------- appels au serveur (le serveur gratuit peut mettre ~1 min à se réveiller) ----------
async function api(method, path, body) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 75000);
  const slow = setTimeout(() => toast('Connexion au serveur ONEERA… (il se réveille, ça peut prendre une minute)'), 4000);
  try {
    const r = await fetch(REAL.api + path, { method, signal: ctl.signal, headers: { 'content-type': 'application/json', ...(REAL.token ? { authorization: 'Bearer ' + REAL.token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && REAL.token && !/\/auth\//.test(path)) { realLogout(true); throw new Error('Session expirée : reconnecte-toi.'); }
    if (!r.ok) throw new Error(j.message || 'Erreur ' + r.status);
    return j;
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'Le serveur ne répond pas. Vérifie ta connexion et réessaie.' : e.message === 'Failed to fetch' || e.message === 'Load failed' ? 'Pas de connexion au serveur. Vérifie ton réseau.' : e.message);
  } finally { clearTimeout(to); clearTimeout(slow); }
}

// ---------- accueil : vrai compte, ou mode démo ----------
const _welcomeDemo = V.welcome;
V.welcome = () => {
  if (REAL.demo) return _welcomeDemo();
  const el = mount(`${statusBar()}
    <div style="height:300px;margin:0 14px;border-radius:26px;overflow:hidden;position:relative;flex-shrink:0;background:url(${A}bdf_fest.webp) 45% 45%/250% auto">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0) 40%,rgba(20,15,40,.8))"></div>
      <div style="position:absolute;left:16px;right:16px;bottom:16px;color:#fff"><div style="font-size:13px;font-weight:700;opacity:.9">Version de test</div><div style="font-size:28px;font-weight:800">ONEERA</div><div style="font-size:13.5px;opacity:.92">Retrouve tes amis sur la carte, en direct.</div></div>
    </div>
    <div class="body" style="gap:10px;padding-top:16px">
      <h1 class="h2">Entre en un geste</h1>
      <p class="lead" style="font-size:14px">Pas de mot de passe à retenir : ton compte Apple ou Google suffit. Tes amis te retrouvent avec ton code ONEERA.</p>
      <button class="btn dark" id="ap"><svg width="17" height="20" viewBox="0 0 17 20" fill="#fff" aria-hidden="true"><path d="M14 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.5 4.8 1.9 5.8 1 7.4c-1.9 3.2-.5 8 1.3 10.6.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.8-1.1-3-4.4zM11.5 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z"/></svg> Continuer avec Apple</button>
      <button class="btn white" id="gg"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continuer avec Google</button>
      <div class="grid2"><button class="btn white" id="su" style="font-size:14px">Avec mon e-mail</button><button class="btn white" id="li" style="font-size:14px">J’ai un compte e-mail</button></div>
      <div id="werr" class="small" style="color:#C62828;font-weight:700;text-align:center" hidden></div>
      <button class="link" id="demo">Découvrir en mode démo (données simulées)</button>
      <p class="tiny" style="text-align:center;margin:0">En continuant, tu acceptes les <button class="tiny" data-legal style="text-decoration:underline">Conditions d’utilisation</button> et la <button class="tiny" data-legal style="text-decoration:underline">Politique de confidentialité</button>.</p>
    </div>`);
  $('#su', el).onclick = V.signup; $('#li', el).onclick = V.login;
  const go = async (provider, btn) => {
    const err = $('#werr', el); err.hidden = true;
    if (!window.ReactNativeWebView) { err.textContent = `La connexion ${provider === 'apple' ? 'Apple' : 'Google'} fonctionne dans l’app ONEERA (TestFlight). Ici, utilise ton e-mail.`; err.hidden = false; return; }
    const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Connexion…';
    try { await realSocial(provider); }
    catch (e) { err.textContent = e.message; err.hidden = false; }
    finally { if (document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = label; } }
  };
  const N = window.ONEERA_NATIVE;
  if (N && window.ReactNativeWebView) {
    if (!N.apple) $('#ap', el).style.display = 'none'; if (!N.google) $('#gg', el).style.display = 'none';
    if (!N.apple && !N.google) { // ni Apple ni Google disponibles : parcours e-mail mis en avant, texte cohérent
      $('h1', el).textContent = 'Ton compte en 20 secondes';
      $('.lead', el).textContent = 'Un prénom, un e-mail, un mot de passe : c’est tout. Tes amis te retrouvent ensuite avec ton code ONEERA ou depuis leurs contacts.';
      const su = $('#su', el), li = $('#li', el), g = su.parentElement; su.className = 'btn'; su.textContent = 'Créer mon compte'; su.style.fontSize = '';
      li.className = 'btn white'; li.textContent = 'J’ai déjà un compte'; li.style.fontSize = ''; g.replaceWith(su, li);
    } else if (!N.apple || !N.google) $('.lead', el).textContent = `Pas de mot de passe à retenir : ton compte ${N.apple ? 'Apple' : 'Google'} suffit. Tes amis te retrouvent avec ton code ONEERA.`;
  }
  $('#ap', el).onclick = () => go('apple', $('#ap', el));
  $('#gg', el).onclick = () => go('google', $('#gg', el));
  $('#demo', el).onclick = () => { realSetDemo(true); _welcomeDemo(); };
  $$('[data-legal]', el).forEach(u => u.onclick = V.legal);
};

// ---------- connexion Apple / Google : l'app native fournit un jeton d'identité, le serveur le vérifie ----------
const NATIVE_WAIT = new Map(); let _nativeId = 0;
window.__oneeraNative = (m) => { const w = NATIVE_WAIT.get(m && m.id); if (w) { NATIVE_WAIT.delete(m.id); w(m); } };
const nativeCall = (msg) => new Promise((res, rej) => { const id = 'n' + (++_nativeId); NATIVE_WAIT.set(id, res); try { window.ReactNativeWebView.postMessage(JSON.stringify({ ...msg, id })); } catch (e) { NATIVE_WAIT.delete(id); rej(e); } setTimeout(() => { if (NATIVE_WAIT.delete(id)) rej(new Error('La connexion n’a pas répondu. Réessaie.')); }, 120000); });
async function realSocial(provider) {
  const r = await nativeCall({ type: 'auth', provider });
  if (r.cancelled) return;
  if (r.error) throw new Error(r.error);
  const out = provider === 'apple' ? await api('POST', '/v1/auth/apple', { identityToken: r.identityToken, fullName: r.fullName }) : await api('POST', '/v1/auth/google', { idToken: r.idToken, name: r.name });
  REAL.token = out.token; REAL.user = out.user; REAL.email = provider === 'apple' ? 'Compte Apple' : 'Compte Google'; realSetDemo(false); realSave();
  realApplyUser(); ST.account = provider; markStep('account');
  if (out.isNew) V.avatarPick(() => V.perms(), true);
  else { await realSyncFriends().catch(() => {}); realConnect(); ST.introSeen = Object.assign({}, ST.introSeen, { [VENUE.id]: 1 }); V.map(); toast(`Content de te revoir, ${esc(REAL.user.displayName)} !`); }
}

// Consentement au partage : donné quand on autorise sa position (étape « Place-toi sur la carte ») ou quand on active le partage.
async function realGrantSharing(hours = 12) { await api('POST', '/v1/consents', { purpose: 'location_friends', granted: true }); await api('POST', '/v1/share', { hours }); }
const _permsReal = V.perms;
V.perms = () => {
  _permsReal();
  if (!realOn()) return;
  const all = $('.scr #all'); if (!all) return; const orig = all.onclick;
  all.onclick = async (e) => { realGrantSharing().catch(() => {}); return orig && orig.call(all, e); };
};

const authForm = (signup) => `${statusBar()}<div class="topbar"><button class="rb" data-back aria-label="Retour">${I.back}</button><h1>${signup ? 'Créer mon compte' : 'Connexion'}</h1><span style="width:44px"></span></div>
  <form class="body" id="f" style="padding-top:4px" novalidate>
    ${signup ? '<div class="field"><label for="fn">Prénom (affiché à tes amis)</label><input class="inp" id="fn" autocomplete="given-name" maxlength="40" required></div>' : ''}
    <div class="field"><label for="em">E-mail (jamais affiché)</label><input class="inp" id="em" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" required></div>
    <div class="field"><label for="pw">Mot de passe${signup ? ' (8 caractères minimum)' : ''}</label><div style="position:relative"><input class="inp ${signup ? 'pwmask' : ''}" id="pw" type="${signup ? 'text' : 'password'}" autocomplete="${signup ? 'off' : 'current-password'}" autocapitalize="none" autocorrect="off" spellcheck="false" minlength="${signup ? 8 : 1}" required style="padding-right:96px!important;width:100%;box-sizing:border-box"><button type="button" class="link" id="see" style="position:absolute;right:6px;left:auto;width:auto!important;height:auto;border:0;box-shadow:none;top:50%;transform:translateY(-50%);min-height:30px;background:#fff;padding:0 8px">Afficher</button></div></div>
    ${signup ? '<button type="button" class="row" id="cs" style="background:#F3F5FB;border-radius:14px"><div class="grow"><div class="t">Partager ma position avec mes amis</div><div class="s">Seuls tes amis la voient. Tu peux arrêter à tout moment.</div></div><span class="tog on" role="switch" aria-checked="true"></span></button>' : ''}
    <div id="err" class="small" style="color:#C62828;font-weight:700" hidden></div>
    <button class="btn" id="go" type="submit">${signup ? 'Créer mon compte' : 'Me connecter'}</button>
    <button type="button" class="link" id="sw">${signup ? 'J’ai déjà un compte' : 'Créer un compte'}</button>
  </form>`;

function wireAuth(el, signup) {
  let consent = true;
  $('[data-back]', el).onclick = V.welcome;
  $('#sw', el).onclick = signup ? V.login : V.signup;
  $('#see', el).onclick = () => { const p = $('#pw', el); let hidden;
    if (signup) { p.classList.toggle('pwmask'); hidden = p.classList.contains('pwmask'); } else { p.type = p.type === 'password' ? 'text' : 'password'; hidden = p.type === 'password'; }
    $('#see', el).textContent = hidden ? 'Afficher' : 'Masquer'; p.focus(); };
  $('#cs', el) && ($('#cs', el).onclick = () => { consent = !consent; const t = $('#cs .tog', el); t.classList.toggle('on', consent); t.setAttribute('aria-checked', consent); });
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    const err = $('#err', el), go = $('#go', el);
    const email = $('#em', el).value.trim(), password = $('#pw', el).value, name = signup ? $('#fn', el).value.trim() : '';
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    if (signup && !name) return fail('Indique ton prénom.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Adresse e-mail invalide.');
    if (signup && password.length < 8) return fail('Le mot de passe doit faire au moins 8 caractères.');
    err.hidden = true; go.disabled = true; go.textContent = signup ? 'Création…' : 'Connexion…';
    try {
      const r = await api('POST', signup ? '/v1/auth/signup' : '/v1/auth/login', signup ? { email, password, displayName: name, locationConsent: consent, avatar: ST.me.av2 || {} } : { email, password });
      REAL.token = r.token; REAL.user = r.user; REAL.email = email; realSetDemo(false); realSave();
      realApplyUser(); ST.account = 'email'; markStep('account');
      if (signup) { if (consent) api('POST', '/v1/share', { hours: 12 }).catch(() => {}); V.avatarPick(() => V.perms(), true); }
      else { await realSyncFriends().catch(() => {}); realConnect(); ST.introSeen = Object.assign({}, ST.introSeen, { [VENUE.id]: 1 }); V.map(); toast(`Content de te revoir, ${esc(REAL.user.displayName)} !`); }
    } catch (e2) { fail(e2.message); go.disabled = false; go.textContent = signup ? 'Créer mon compte' : 'Me connecter'; }
  };
}
V.signup = () => { const el = mount(authForm(true), 'white'); wireAuth(el, true); };
V.login = () => { const el = mount(authForm(false), 'white'); wireAuth(el, false); };

// Prénoms et avatars venus du serveur : rendus inoffensifs avant tout affichage (l'interface historique insère parfois du HTML).
const safeName = (v) => String(v ?? '').replace(/[<>&"'`]/g, (c) => ({ '<': '‹', '>': '›', '&': '＆', '"': '＂', "'": '’', '`': 'ˋ' })[c]).slice(0, 60);
const safeAvatar = (a) => { if (!a || typeof a !== 'object' || Array.isArray(a)) return null; const o = {}; for (const [k, x] of Object.entries(a)) { if (!/^[A-Za-z0-9_-]{1,24}$/.test(k)) continue; if (typeof x === 'number' && isFinite(x)) o[k] = x; else if (typeof x === 'boolean') o[k] = x; else if (typeof x === 'string' && /^[A-Za-z0-9_-]{0,24}$/.test(x)) o[k] = x; else if (Array.isArray(x) && x.every(y => typeof y === 'string' && /^[A-Za-z0-9_-]{0,24}$/.test(y))) o[k] = x.slice(0, 12); } return o.g ? o : null; };
function realApplyUser() {
  const u = REAL.user; if (!u) return;
  ST.me.first = safeName(u.displayName); ST.me.pseudo = safeName(u.displayName);
  const av = safeAvatar(u.avatar); if (av) ST.me.av2 = av;
  if (REAL.testMap && !ST.perms.loc) ST.perms.loc = 'app';
}

// ---------- avatar : enregistré sur le serveur ----------
const _avatarPick = V.avatarPick;
V.avatarPick = (onDone, step) => _avatarPick(() => {
  if (realOn() && ST.me.av2) api('PATCH', '/v1/me', { avatar: ST.me.av2 }).then(u => { REAL.user = u; realSave(); }).catch(() => toast('Avatar enregistré sur ce téléphone ; envoi au serveur à la prochaine connexion.'));
  onDone ? onDone() : V.perms();
}, step);

// ---------- amis réels ----------
const REAL_COLS = ['#0E9F8A', '#E0457B', '#F08C00', '#4F6BF5', '#8E44AD', '#16A085', '#D35400', '#2C3E50'];
async function realSyncFriends() {
  if (!realOn()) return;
  const r = await api('GET', '/v1/friends');
  const before = new Set(REAL.friends.filter(f => f.status === 'pending' && !f.requestedByMe).map(f => f.id));
  const wasAcc = new Set(REAL.friends.filter(f => f.status === 'accepted').map(f => f.id));
  r.friends.filter(f => f.status === 'pending' && !f.requestedByMe && !before.has(f.id) && REAL._synced).forEach(f => toast(`${esc(f.displayName)} veut t’ajouter en ami · <b>Amis</b>`));
  r.friends.filter(f => f.status === 'accepted' && !wasAcc.has(f.id) && REAL._synced).forEach(f => toast(`${esc(f.displayName)} et toi êtes maintenant amis 🎉`));
  REAL._synced = true;
  REAL.friends = r.friends.map(f => ({ ...f, displayName: safeName(f.displayName), avatar: safeAvatar(f.avatar) }));
  realApplyFriends();
}
function realApplyFriends() {
  const acc = REAL.friends.filter(f => f.status === 'accepted');
  FRIENDS.splice(0, FRIENDS.length, ...acc.map((f, i) => ({ id: f.id, n: f.displayName, col: REAL_COLS[i % REAL_COLS.length], acc: 3, zone: '', at: 'F', bat: null })));
  Object.keys(FRIEND_AV2).forEach(k => { if (!REAL.friends.some(f => f.id === k)) delete FRIEND_AV2[k]; });
  REAL.friends.forEach(f => { FRIEND_AV2[f.id] = f.avatar && f.avatar.g ? f.avatar : { g: 'm', hair: 'crop' }; });
  acc.forEach(f => { if (!FR_STATE[f.id]) FR_STATE[f.id] = { pos: null }; });
  realRefreshVisible(true);
}
// Sur la carte : seuls les amis dont on connaît une position sur CE plan.
function realRefreshVisible(force) {
  if (!realOn()) return;
  const ids = FRIENDS.filter(f => { const p = REAL.pos[f.id]; return p && p.floor === VENUE.id; }).map(f => f.id);
  ids.forEach(id => { const p = REAL.pos[id], s = FR_STATE[id]; if (!s || !s.pos) FR_STATE[id] = { pos: [...p.at], target: [...p.at] }; else s.target = [...p.at]; });
  FRIENDS.forEach(f => { const p = REAL.pos[f.id]; if (!p) return; const age = (Date.now() - p.t) / 60000; f.stale = REAL.online[f.id] === false || age > 2 ? Math.max(1, Math.round(age)) : 0; });
  const changed = ids.length !== ST.friends.length || ids.some(id => !ST.friends.includes(id));
  if (changed || force) { ST.friends = ids; emit(); }
}
// Les amis réels se déplacent en douceur vers leur dernière position reçue (pas de téléportation).
tickers.add(dt => {
  if (!realOn()) return;
  FRIENDS.forEach(f => { const s = FR_STATE[f.id]; if (!s || !s.target || !s.pos) return; const dx = s.target[0] - s.pos[0], dy = s.target[1] - s.pos[1], d = Math.hypot(dx, dy); if (d < .01) return; const k = d > 25 ? 1 : Math.min(1, dt * 2.2); s.pos = [s.pos[0] + dx * k, s.pos[1] + dy * k]; });
});
// La simulation des amis de démo ne doit jamais bloquer la boucle d'animation (amis réels sans état).
const _stepFriendsReal = stepFriends;
stepFriends = function (dt) { FRIENDS.forEach(f => { if (!FR_STATE[f.id]) FR_STATE[f.id] = { pos: null }; }); _stepFriendsReal(dt); };
// L'initialisation de démonstration ne doit pas écraser les vrais amis.
const _initFriendsReal = initFriends;
initFriends = function () { _initFriendsReal(); if (realOn()) FRIENDS.forEach(f => { const p = REAL.pos[f.id]; if (p) FR_STATE[f.id] = { pos: [...p.at], target: [...p.at] }; }); };

// ---------- temps réel ----------
async function realConnect() {
  if (!realOn() || (REAL.ws && REAL.ws.readyState <= 1) || REAL.connecting) return;
  REAL.connecting = true;
  try {
    if (!REAL.eventId) REAL.eventId = (await api('GET', '/v1/events/BDF-DEMO')).id;
    const { token } = await api('POST', '/v1/realtime-token', { eventId: REAL.eventId });
    if (!realOn()) { REAL.connecting = false; return; }
    const ws = new WebSocket(REAL.api.replace(/^http/, 'ws') + '/rt?token=' + encodeURIComponent(token));
    REAL.ws = ws; REAL.connecting = false;
    ws.onopen = () => { REAL.wsOk = true; REAL.retry = 0; REAL.lastSent = null; emit(); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      if (m.type === 'snapshot') m.friends.forEach(p => realApplyPos(p));
      else if (m.type === 'friend') realApplyPos(m.pos);
      else if (m.type === 'presence') { REAL.online[m.userId] = m.online; if (m.online && !FRIENDS.some(f => f.id === m.userId)) realSyncFriends().catch(() => {}); realRefreshVisible(); }
      else if (m.type === 'gone') { delete REAL.pos[m.userId]; delete FR_STATE[m.userId]; realRefreshVisible(true); }
      else if (m.type === 'message') realOnMessage(m.message);
      else if (m.type === 'refresh') realSyncFriends().then(() => REAL.onFriends && REAL.onFriends()).catch(() => {});
      if (m.type === 'snapshot' || m.type === 'friend') realRefreshVisible(); };
    ws.onclose = () => { REAL.wsOk = false; emit(); if (!realOn()) return; const d = [1, 2, 5, 10, 20][Math.min(REAL.retry++, 4)]; setTimeout(realConnect, d * 1000); };
  } catch (_) { REAL.connecting = false; const d = [2, 5, 10, 20][Math.min(REAL.retry++, 3)]; setTimeout(realConnect, d * 1000); }
}
function realApplyPos(p) {
  if (!p || !p.userId) return;
  REAL.pos[p.userId] = { at: [p.x, p.y], t: p.t || Date.now(), floor: p.floorId };
  if (p.online !== undefined) REAL.online[p.userId] = p.online; else REAL.online[p.userId] = true;
  if (!FRIENDS.some(f => f.id === p.userId)) realSyncFriends().catch(() => {});
}
// Envoi de ma position : ≤ 1/s quand je bouge, toutes les 10 s à l'arrêt (preuve de vie).
let _realAcc = 0;
tickers.add(dt => {
  _realAcc += dt; if (_realAcc < .25) return; _realAcc = 0;
  if (!realOn() || !REAL.wsOk || !ST.perms.loc || (ST.sharing && ST.sharing.mode === 'off')) return;
  const now = Date.now(), p = ST.me.pos, L = REAL.lastSent;
  const moved = !L || L.floor !== VENUE.id || Math.hypot(p[0] - L.at[0], p[1] - L.at[1]) > .6;
  if (L && now - L.t < 1000) return;
  if (!moved && L && now - L.t < 10000) return;
  try { REAL.ws.send(JSON.stringify({ type: 'pos', seq: now, t: now, floorId: VENUE.id, x: +p[0].toFixed(2), y: +p[1].toFixed(2), r68: 3, quality: 'precise' })); REAL.lastSent = { at: [...p], t: now, floor: VENUE.id }; } catch (_) {}
});
// Partage : les réglages « Partager ma position » pilotent le serveur.
listeners.add(() => {
  if (!realOn() || !ST.sharing) return;
  const m = ST.sharing.mode || 'event'; if (m === REAL.sharingSent) return; REAL.sharingSent = m;
  if (m === 'off') api('DELETE', '/v1/share').catch(() => {});
  else realGrantSharing({ '15m': .25, '1h': 1, '3h': 3 }[m] || 12).catch(() => {});
});

// ---------- ajouter des amis : mon code / le code d'un ami ----------
const _addFriendsDemo = V.addFriends;
// Amis : demandes reçues, contacts qui ont ONEERA (ajout de tous en 1 geste), mon numéro, mon code, ma liste.
V.addFriends = (onboarding) => {
  if (!realOn()) return _addFriendsDemo(onboarding);
  const el = mount(`${statusBar()}<div class="topbar">${onboarding ? '<span style="width:44px"></span>' : `<button class="rb" data-back aria-label="Retour">${I.back}</button>`}<h1>${onboarding ? '' : 'Mes amis'}</h1><span style="width:44px"></span></div>
    <div class="body" style="padding-top:0;gap:12px">
      ${onboarding ? '<div class="tiny" style="font-weight:700;color:var(--pri)">ÉTAPE 4 SUR 4</div><h1 class="h2">Retrouve ta bande</h1>' : ''}
      <div id="req"></div>
      <div class="card ctc" id="ctc"><div style="display:flex;align-items:center;gap:12px"><div class="ctcIco">${I.contacts || '👥'}</div><div style="flex:1"><b style="font-size:16px">Mes contacts qui ont ONEERA</b><div class="small">Ajoute-les tous en un geste. Leurs noms et numéros ne quittent jamais ton téléphone.</div></div></div><button class="btn" id="scan">Trouver mes contacts</button><div id="cres"></div></div>
      <div class="card" style="align-items:center;text-align:center;background:linear-gradient(135deg,#4A63E8,#6E8BF7);color:#fff;gap:6px">
        <div class="small" style="color:#fff;opacity:.9;font-weight:700">Mon code ONEERA</div>
        <div id="code" style="font-size:36px;font-weight:800;letter-spacing:6px;font-variant-numeric:tabular-nums">······</div>
        <div style="display:flex;gap:8px;width:100%"><button class="btn sm white" id="cp" style="flex:1">Copier</button><button class="btn sm white" id="sh" style="flex:1">Partager</button></div>
      </div>
      <div class="field"><label for="fc">Code d’un ami</label><div style="display:flex;gap:8px"><input class="inp" id="fc" maxlength="8" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="EX. K7P2QX" style="text-transform:uppercase;letter-spacing:3px;font-weight:800;flex:1;min-width:0"><button class="btn sm" id="add" style="width:auto;padding:0 18px">Ajouter</button></div></div>
      <div id="msg" class="small" role="status" hidden></div>
      <details class="phone" id="phd"><summary>Mon numéro (pour que mes contacts me trouvent)</summary><div style="display:flex;gap:8px;margin-top:8px"><input class="inp" id="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="06 12 34 56 78" style="flex:1;min-width:0"><button class="btn sm" id="phs" style="width:auto;padding:0 16px">OK</button></div><div class="tiny" style="margin-top:6px">Seule une empreinte chiffrée de ton numéro est enregistrée.</div></details>
      <div class="sec" style="margin:0">Mes amis</div><div class="list" id="ls"><div class="small">Chargement…</div></div>
    </div>${onboarding ? `<div style="padding:8px 18px 30px;background:#fff;border-top:1px solid var(--line)"><button class="btn" id="go">Voir la carte</button></div>` : ''}`, 'white');
  let code = '', matches = null, contactNames = new Map();
  const msg = (t, ok) => { const m = $('#msg', el); if (!m) return; m.hidden = false; m.style.color = ok ? '#0B7A3B' : '#C62828'; m.style.fontWeight = '700'; m.textContent = t; };
  const head = (f) => (f.avatar && f.avatar.g) ? av2URI(f.avatar, 'head') : FRIEND_AV2[f.id] ? av2URI(FRIEND_AV2[f.id], 'head') : A + 'logo.webp';
  const paint = () => {
    if (!document.body.contains(el)) return;
    const inc = REAL.friends.filter(f => f.status === 'pending' && !f.requestedByMe);
    $('#req', el).innerHTML = inc.length ? `<div class="sec" style="margin:0 0 6px">Demandes reçues (${inc.length})</div><div class="list">${inc.map(f => `<div class="row"><img class="av" src="${head(f)}" alt=""><div class="grow"><div class="t">${esc(f.displayName)}</div><div class="s">veut t’ajouter</div></div><button class="btn sm" data-acc="${f.id}" style="width:auto;padding:0 14px">Accepter</button><button class="link" data-dec="${f.id}" style="min-height:30px;color:#6B7084">Refuser</button></div>`).join('')}</div>` : '';
    const acc = REAL.friends.filter(f => f.status === 'accepted'), out = REAL.friends.filter(f => f.status === 'pending' && f.requestedByMe);
    $('#ls', el).innerHTML = acc.length || out.length ? acc.map(f => { const p = REAL.pos[f.id], on = REAL.online[f.id]; const st = p ? (on === false ? `Hors ligne · vu il y a ${Math.max(1, Math.round((Date.now() - p.t) / 60000))} min` : '<span style="color:#0B7A3B;font-weight:700">● Sur la carte</span>') : 'Pas encore de position partagée'; return `<div class="row"><img class="av" src="${head(f)}" alt=""><div class="grow"><div class="t">${esc(f.displayName)}</div><div class="s">${st}</div></div><button class="link" data-rm="${f.id}" style="min-height:30px;color:#9A3B3B">Retirer</button></div>`; }).join('') + out.map(f => `<div class="row"><img class="av" src="${head(f)}" alt=""><div class="grow"><div class="t">${esc(f.displayName)}</div><div class="s">Demande envoyée</div></div><button class="link" data-dec="${f.id}" style="min-height:30px;color:#6B7084">Annuler</button></div>`).join('') : '<div class="small">Aucun ami pour l’instant : trouve tes contacts ou échange vos codes.</div>';
    if (matches) {
      const st = (u) => { const f = REAL.friends.find(x => x.id === u.id); return f ? (f.status === 'accepted' ? 'ami' : f.requestedByMe ? 'sent' : 'in') : 'none'; };
      const todo = matches.filter(u => st(u) === 'none' || st(u) === 'in');
      $('#cres', el).innerHTML = matches.length ? `<div class="small" style="margin:10px 0 6px;font-weight:700">${matches.length} de tes contacts ${matches.length > 1 ? 'ont' : 'a'} ONEERA</div>${todo.length ? `<button class="btn" id="all" style="margin-bottom:8px">Tout ajouter (${todo.length})</button>` : ''}<div class="list">${matches.map(u => { const s = st(u); return `<div class="row"><img class="av" src="${head(u)}" alt=""><div class="grow"><div class="t">${esc(u.displayName)}</div><div class="s">${esc(contactNames.get(u.matched) || '')}</div></div>${s === 'ami' ? '<span class="pill ok">Ami</span>' : s === 'sent' ? '<span class="pill gray">Envoyée</span>' : `<button class="btn sm" data-req="${u.id}" style="width:auto;padding:0 14px">${s === 'in' ? 'Accepter' : 'Ajouter'}</button>`}</div>`; }).join('')}</div>` : '<div class="small" style="margin-top:10px">Aucun de tes contacts n’a encore ONEERA. Partage ton code ci-dessous pour les inviter.</div>';
    }
    const g = $('#go', el); if (g) { const n = REAL.friends.filter(f => f.status === 'accepted').length; g.textContent = n ? `Voir la carte (${n} ami${n > 1 ? 's' : ''})` : 'Voir la carte'; }
  };
  REAL.onFriends = paint;
  api('POST', '/v1/invites').then(r => { code = r.code; $('#code', el) && ($('#code', el).textContent = code); }).catch(e => msg(e.message));
  realSyncFriends().then(paint).catch(e => { paint(); msg(e.message); });
  $('#scan', el).onclick = async () => {
    const b = $('#scan', el);
    if (!window.ReactNativeWebView) { msg('La recherche dans tes contacts fonctionne dans l’app ONEERA. Ici, échange ton code.'); return; }
    b.disabled = true; b.textContent = 'Recherche…';
    try {
      const r = await nativeCall({ type: 'contacts' });
      if (r.denied) { msg('Accès aux contacts refusé. Tu peux l’autoriser dans Réglages › ONEERA › Contacts.'); return; }
      if (r.error) throw new Error(r.error);
      contactNames = new Map(); const hashes = [];
      (r.entries || []).forEach(c => c.hashes.forEach(h => { hashes.push(h); if (!contactNames.has(h)) contactNames.set(h, c.name); }));
      const out = await api('POST', '/v1/contacts/match', { hashes: hashes.slice(0, 5000) });
      matches = out.users.map(u => ({ ...u, displayName: safeName(u.displayName), avatar: safeAvatar(u.avatar) })); paint(); b.textContent = 'Actualiser';
    } catch (e) { msg(e.message); b.textContent = 'Trouver mes contacts'; }
    finally { b.disabled = false; }
  };
  const request = async (ids) => {
    try { const r = await api('POST', '/v1/friends/requests', { userIds: ids }); const acc = Object.values(r.results).filter(x => x === 'accepted').length, pend = Object.values(r.results).filter(x => x === 'pending').length;
      msg(acc && pend ? `${acc} ami${acc > 1 ? 's' : ''} ajouté${acc > 1 ? 's' : ''}, ${pend} demande${pend > 1 ? 's' : ''} envoyée${pend > 1 ? 's' : ''}` : acc ? `${acc} ami${acc > 1 ? 's' : ''} ajouté${acc > 1 ? 's' : ''} 🎉` : `${pend} demande${pend > 1 ? 's' : ''} envoyée${pend > 1 ? 's' : ''} : ils l’acceptent en un geste`, true);
      await realSyncFriends(); paint(); realConnect(); } catch (e) { msg(e.message); } };
  el.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'all') { t.disabled = true; const ids = matches.filter(u => { const f = REAL.friends.find(x => x.id === u.id); return !f || (f.status === 'pending' && !f.requestedByMe); }).map(u => u.id); await request(ids); return; }
    if (t.dataset.req) { t.disabled = true; await request([t.dataset.req]); return; }
    if (t.dataset.acc) { t.disabled = true; try { await api('POST', `/v1/friends/${t.dataset.acc}/accept`); await realSyncFriends(); paint(); realConnect(); msg('C’est noté : vous êtes amis 🎉', true); } catch (e2) { msg(e2.message); t.disabled = false; } return; }
    if (t.dataset.dec) { t.disabled = true; try { await api('POST', `/v1/friends/${t.dataset.dec}/decline`); await realSyncFriends(); paint(); } catch (e2) { msg(e2.message); t.disabled = false; } return; }
    if (t.dataset.rm) { const f = REAL.friends.find(x => x.id === t.dataset.rm); if (!f || !confirm(`Retirer ${f.displayName} de tes amis ?`)) return; try { await api('DELETE', '/v1/friends/' + f.id); delete REAL.pos[f.id]; await realSyncFriends(); paint(); } catch (e2) { msg(e2.message); } }
  });
  $('#cp', el).onclick = async () => { if (!code) return; try { await navigator.clipboard.writeText(code); toast('Code copié'); } catch (_) { toast('Ton code : ' + code); } };
  $('#sh', el).onclick = async () => { if (!code) return; const text = `Ajoute-moi sur ONEERA avec mon code : ${code}`; try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Message copié : colle-le à ton ami'); } } catch (_) {} };
  const add = async () => { const v = $('#fc', el).value.trim().toUpperCase(); if (v.replace(/[^A-Z0-9]/g, '').length !== 6) return msg('Le code fait 6 caractères.');
    if (v === code) return msg('C’est ton propre code : donne-le plutôt à un ami.');
    const b = $('#add', el); b.disabled = true;
    try { const r = await api('POST', '/v1/invites/accept', { code: v }); msg(`${r.friend.displayName} est maintenant ton ami 🎉`, true); $('#fc', el).value = ''; await realSyncFriends(); paint(); realConnect(); }
    catch (e) { msg(e.message); } finally { b.disabled = false; } };
  $('#add', el).onclick = add; $('#fc', el).onkeydown = e => { if (e.key === 'Enter') add(); };
  $('#phs', el).onclick = async () => { const b = $('#phs', el); b.disabled = true; try { await api('POST', '/v1/me/phone', { phone: $('#ph', el).value }); msg('Numéro enregistré : tes contacts peuvent te trouver.', true); $('#phd', el).open = false; } catch (e) { msg(e.message); } finally { b.disabled = false; } };
  $('[data-back]', el) && ($('[data-back]', el).onclick = () => V.map());
  const go = $('#go', el); if (go) go.onclick = () => { markStep('friends'); realConnect(); V.map(); };
  const iv = setInterval(() => { if (!document.body.contains(el)) { clearInterval(iv); if (REAL.onFriends === paint) REAL.onFriends = null; return; } realSyncFriends().then(paint).catch(() => {}); }, 15000);
};

// ---------- carte : mode test (je me place en touchant la carte) ----------
const _vmapReal = V.map;
V.map = (opts) => {
  _vmapReal(opts);
  if (!realOn()) return;
  realConnect();
  const scr = SCREEN.querySelector('.scr'); if (!scr || !MV) return;
  const pill = document.createElement('button');
  pill.className = 'realPill'; pill.type = 'button';
  const paint = () => { pill.innerHTML = REAL.testMap ? `🧪 Mode test · touche la carte pour te déplacer ${REAL.wsOk ? '<span style="color:#7CE3A1">●</span>' : '<span style="color:#FFB4B4">● hors ligne</span>'}` : `📍 Position réelle ${REAL.wsOk ? '<span style="color:#7CE3A1">●</span>' : '<span style="color:#FFB4B4">●</span>'}`; };
  paint(); scr.append(pill); listeners.add(function pp() { if (!document.body.contains(pill)) return listeners.delete(pp); paint(); });
  pill.onclick = () => V.realSettings();
  // Toucher bref (sans glisser) sur la carte → je marche jusqu'à ce point.
  let down = null; const host = MV.host;
  host.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  host.addEventListener('pointerup', e => {
    if (!REAL.testMap || !down || !MV) return; const d0 = down; down = null;
    if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 8 || performance.now() - d0.t > 450) return;
    if (e.target.closest('.mk, button, .sheet')) return;
    const r = host.getBoundingClientRect(), k = r.width / host.offsetWidth || 1;
    const f = MV.s2flat((e.clientX - r.left) / k, (e.clientY - r.top) / k), at = MV.unproj(f[0], f[1]);
    if (!(at[0] >= 0 && at[0] <= 100 && at[1] >= 0 && at[1] <= 100)) return;
    REAL.walkTo = [at[0], at[1]]; if (!ST.perms.loc) ST.perms.loc = 'app';
  });
};
tickers.add(dt => { // déplacement de test vers le point touché (≈ 3 m/s, pour tester sans attendre)
  if (!REAL.walkTo) return; const p = ST.me.pos, q = REAL.walkTo, d = Math.hypot(q[0] - p[0], q[1] - p[1]), step = dt * 3 / (PCT_TO_M || 4);
  if (d <= step) { ST.me.pos = [...q]; REAL.walkTo = null; } else ST.me.pos = [p[0] + (q[0] - p[0]) / d * step, p[1] + (q[1] - p[1]) / d * step];
});

// ---------- réglages du compte réel ----------
V.realSettings = () => {
  const sb = openSheet(`<h2 class="h2">Mon compte ONEERA</h2>
    <div class="row" style="background:#F3F5FB;border-radius:14px"><img class="av" src="${meHead()}" alt=""><div class="grow"><div class="t">${esc(REAL.user ? REAL.user.displayName : '')}</div><div class="s">${esc(REAL.email || '')} · serveur ${REAL.wsOk ? '<b style="color:#0B7A3B">connecté</b>' : '<b style="color:#C62828">hors ligne</b>'}</div></div></div>
    <button class="row" id="tm" style="background:#F3F5FB;border-radius:14px"><div class="grow"><div class="t">Mode test de la carte</div><div class="s">Sans balises : touche la carte pour te placer, tes amis te voient bouger en direct</div></div><span class="tog ${REAL.testMap ? 'on' : ''}" role="switch" aria-checked="${REAL.testMap}"></span></button>
    <button class="btn white" id="fr">Mes amis et mon code</button>
    <button class="btn white" id="sh">Partager ma position…</button>
    <button class="btn white" id="lo">Me déconnecter</button>
    <button class="btn red" id="dl">Supprimer mon compte</button>
    <div class="tiny">Version de test : tes amis et vos positions passent par le serveur ONEERA (Francfort). La position « réelle » (balises) viendra avec l’installation sur site.</div>`);
  $('#tm', sb).onclick = () => { REAL.testMap = !REAL.testMap; realSave(); $('#tm .tog', sb).classList.toggle('on', REAL.testMap); emit(); };
  $('#fr', sb).onclick = () => { closeSheet(true); V.addFriends(false); };
  $('#sh', sb).onclick = () => { closeSheet(true); V.shareSettings(); };
  $('#lo', sb).onclick = () => { closeSheet(true); realLogout(); };
  $('#dl', sb).onclick = () => { closeSheet(true); V.deleteAccount(); };
};
const _settingsReal = V.settings;
V.settings = () => {
  _settingsReal();
  if (!realOn()) return;
  const body = SCREEN.querySelector('.scr .body'); if (!body) return;
  const b = document.createElement('button'); b.className = 'row'; b.style.cssText = 'background:#EEF1FF;border-radius:14px';
  b.innerHTML = `<div class="grow"><div class="t">Mon compte ONEERA · amis · mode test</div><div class="s">${esc(REAL.email || '')}</div></div>${I.chev || '›'}`;
  b.onclick = V.realSettings; body.prepend(b);
};
const _deleteAccountReal = V.deleteAccount;
V.deleteAccount = () => {
  _deleteAccountReal();
  if (!realOn()) return;
  const del = $('.sheet #del'); if (!del) return;
  del.onclick = async () => { del.disabled = true; try { await api('DELETE', '/v1/me'); closeSheet(true); realLogout(true); toast('Compte supprimé : tes données ont été effacées du serveur.'); } catch (e) { toast(e.message); del.disabled = false; } };
};
function realLogout(silent) {
  try { REAL.ws && REAL.ws.close(); } catch (_) {}
  Object.assign(REAL, { token: null, user: null, friends: [], pos: {}, online: {}, wsOk: false, sharingSent: null });
  realSave(); try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  FRIENDS.splice(0); ST.friends = []; ST.account = null;
  if (!silent) toast('Déconnecté');
  V.welcome();
}

// Mode démo mémorisé (le parcours simulé reprend là où il en était).
function realSetDemo(v) { REAL.demo = v; try { v ? localStorage.setItem('oneera.demo', '1') : localStorage.removeItem('oneera.demo'); } catch (_) {} }
const _quickSetupReal = quickSetup; quickSetup = function () { if (!REAL.token) realSetDemo(true); _quickSetupReal(); };
// ---------- démarrage : session réelle mémorisée → directement sur la carte ----------
const _bootReal = boot;
boot = function () {
  realLoad();
  let demo = false; try { demo = localStorage.getItem('oneera.demo') === '1' && !/[?&]nouveau/.test(location.search); } catch (_) {}
  if (/[?&]nouveau/.test(location.search)) realSetDemo(false);
  REAL.demo = demo && !REAL.token;
  _bootReal();
  if (REAL.demo && $('#mv')) return; // session de démo reprise par le démarrage d'origine
  if (!REAL.token) { REAL.demo = false; V.welcome(); return; }
  ST.account = 'email'; realApplyUser(); FRIENDS.splice(0); ST.friends = [];
  ST.introSeen = Object.assign({}, ST.introSeen, { [VENUE.id]: 1 }); ST.tourDone = ST.tourDone ?? true;
  V.map();
  api('GET', '/v1/me').then(u => { REAL.user = u; realSave(); realApplyUser(); emit(); }).catch(() => {});
  realSyncFriends().catch(() => {}); realConnect();
};
