// ===== v5 : exigences appliquées au tableau de bord organisateur et à l'app staff =====
D.audit = D.audit || [];
const audit = t => D.audit.unshift([fmtClock(ST.clock), 'Organisateur', t]);
const shortZone = z => String(z).replace(/^(La |Le |Les |L’|L')/i, '');
const dsheet = (html) => openSheetIn($('#dash'), html);
const ICONS_POI = [['scene', 'Scène'], ['bar', 'Bar'], ['food', 'Restauration'], ['toilettes', 'Toilettes'], ['infirmerie', 'Secours'], ['point_info', 'Info'], ['cashless', 'Cashless'], ['vestiaire', 'Vestiaire'], ['photobooth', 'Photo'], ['shop', 'Boutique']];

// Menu : création d'événement, modération, relais d'alertes, admin plateforme
[['create', I.plus, 'Créer un événement', 'prep'], ['moder', I.flag, 'Modération', 'alerts'], ['relay', I.chat, 'Relais d’alertes', 'comm'], ['platform', I.grid, 'Admin plateforme ONEERA', 'data']].forEach(([k, ic, n, after]) => { if (!DMENU.some(m => m[0] === k)) DMENU.splice(DMENU.findIndex(m => m[0] === after) + (k === 'create' ? 0 : 1), 0, [k, ic, n]); });

// ---------- Création d'événement guidée (autonomie totale de l'organisateur) ----------
Dv.create = (c) => {
  const W = D.wiz = D.wiz || { step: 0, name: 'Bal des Fous · Été 2027', kind: 'festival', start: '2027-07-10T20:00', end: '2027-07-11T04:00', rec: 'none', plan: null, pois: 0, georef: 0 };
  const steps = ['Infos', 'Plan du lieu', 'Zones et lieux', 'Balises et précision', 'Publication'];
  const nightEnd = () => W.end.slice(0, 10) > W.start.slice(0, 10);
  const body = [
    () => `<div class="grid2" style="gap:12px"><label class="small">Nom<input class="inp" id="wn" value="${esc(W.name)}"></label><label class="small">Type<select class="inp" id="wk"><option value="festival" ${W.kind === 'festival' ? 'selected' : ''}>Festival / événement ponctuel</option><option value="club" ${W.kind === 'club' ? 'selected' : ''}>Lieu permanent (club, soirées récurrentes)</option></select></label>
      <label class="small">Début<input class="inp" type="datetime-local" id="ws" value="${W.start}"></label><label class="small">Fin<input class="inp" type="datetime-local" id="we" value="${W.end}"></label></div>
      <div class="note" id="wnote">${nightEnd() ? 'La soirée se termine le lendemain : c’est bien géré (fin après minuit).' : 'Fin le même jour.'}</div>
      <label class="small">Récurrence<select class="inp" id="wr"><option value="none">Une seule date</option><option value="days">Plusieurs jours consécutifs</option><option value="weekly">Chaque semaine (club)</option><option value="yearly">Chaque année (même carte, nouvelle édition)</option></select></label>`,
    () => `<div class="dcard" style="border:2px dashed #C5C9D6;align-items:center;text-align:center;gap:8px"><b>Importer le plan</b><div class="small">PDF, DWG, SVG ou JSON · 50 Mo max · aucune image floue : le plan est vectorisé</div><button class="dbtn" id="imp">${W.plan ? 'Remplacer le plan' : 'Choisir un fichier'}</button><div id="prog" style="width:100%"></div>${W.plan ? `<span class="pill ok">${W.plan} importé</span>` : ''}</div>
      <div class="dcard"><h3>Géoréférencement</h3><div class="small">Clique 3 points connus (ex. : coin de la scène, entrée, poste de secours) puis leur position GPS : le plan se cale au mètre près sur le terrain.</div><div style="display:flex;gap:8px">${[1, 2, 3].map(i => `<button class="dbtn ${W.georef >= i ? '' : 'w'}" data-g="${i}">Point ${i}${W.georef >= i ? ' ✓' : ''}</button>`).join('')}</div></div>`,
    () => `<div class="small">Dessine les zones et ajoute les lieux sur la carte (outil « Préparation »). Ils apparaissent tout de suite dans l’app des visiteurs.</div><div class="row4"><div class="kpi"><span>Zones</span><b>${ZONES.length}</b></div><div class="kpi"><span>Lieux (POI)</span><b>${POIS.length}</b></div><div class="kpi"><span>Allées praticables</span><b>${EDGES.length}</b></div><div class="kpi"><span>Zones staff only</span><b>2</b></div></div><button class="dbtn" id="gop">Ouvrir l’éditeur de carte</button>`,
    () => `<div class="small">Pose les balises (≈ 1 pour 50 à 80 m², 2,5 à 4 m de haut), puis lance la calibration lieu vide (≈ 1 h). La carte ne peut être publiée que si la précision mesurée atteint les seuils.</div>
      <table><tbody>${[['Erreur médiane', '≤ 3 m', '2,8 m', 1], ['Erreur P90', '≤ 6 m', '5,4 m', 1], ['Bonne zone', '≥ 93 %', '94 %', 1], ['Bon étage', '≥ 98 %', '—', 1]].map(r => `<tr><td>${r[0]}</td><td class="tiny">cible ${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3] ? '<span class="pill ok">Atteint</span>' : '<span class="pill warn">À mesurer</span>'}</td></tr>`).join('')}</tbody></table><div class="tiny">Valeurs mesurées sur place avec l’app ONEERA Mesure, jamais des chiffres de fabricant.</div>`,
    () => `<div style="display:flex;gap:14px;align-items:center"><div class="qr" style="width:120px;height:120px;padding:8px"><canvas id="wq"></canvas></div><div class="small"><b>oneera.app/e/${W.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}</b><br>Activation automatique le ${W.start.replace('T', ' à ')} · passage automatique en mode « après l’événement » à la fin.</div></div>
      <div class="list">${[['Inviter le staff (lien ou code, durée et nombre d’usages)', 'team'], ['Programmer la notification « L’événement est actif »', 'comm'], ['Imprimer les QR codes (affiche A3, stickers)', 'prep']].map(r => `<button class="dbtn w" data-go="${r[1]}" style="justify-content:flex-start">${r[0]}</button>`).join('')}</div>`];
  c.innerHTML = `<h1>Créer un événement</h1><p class="sub">5 étapes, sans aide technique. Rien n’est visible du public avant la publication.</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${steps.map((s, i) => `<button class="dbtn ${i === W.step ? '' : 'w'}" data-s="${i}">${i + 1}. ${s}${i < W.step ? ' ✓' : ''}</button>`).join('')}</div>
    <div class="dcard" style="gap:12px">${body[W.step]()}</div>
    <div style="display:flex;gap:8px;justify-content:space-between"><button class="dbtn w" id="pv" ${W.step ? '' : 'disabled'}>Précédent</button><button class="dbtn" id="nx">${W.step === 4 ? 'Publier l’événement' : 'Continuer'}</button></div>`;
  const save = () => { const g = id => $('#' + id, c); if (g('wn')) { W.name = g('wn').value; W.kind = g('wk').value; W.start = g('ws').value; W.end = g('we').value; W.rec = g('wr').value; } };
  c.onclick = async e => {
    const s = e.target.closest('[data-s]'); if (s) { save(); W.step = +s.dataset.s; return Dv.create(c); }
    if (e.target.closest('#pv')) { save(); W.step--; return Dv.create(c); }
    if (e.target.closest('#nx')) { save(); if (W.step === 1 && !W.plan) return dToast('Importe d’abord le plan du lieu'); if (W.step === 4) { audit('Événement publié : ' + W.name); dToast(`<b>${esc(W.name)}</b> publié · activation automatique à la date prévue`); W.step = 0; return; } W.step++; return Dv.create(c); }
    if (e.target.closest('#imp')) { const pr = $('#prog', c); let k = 0; const it = setInterval(() => { k = Math.min(100, k + 9); pr.innerHTML = `<div class="bar"><i style="width:${k}%"></i></div><div class="tiny">Import et vectorisation… ${k} %</div>`; if (k >= 100) { clearInterval(it); W.plan = 'plan-bdf-2027.pdf'; audit('Plan importé : ' + W.plan); Dv.create(c); } }, 90); }
    const g = e.target.closest('[data-g]'); if (g) { W.georef = Math.max(W.georef, +g.dataset.g); Dv.create(c); }
    if (e.target.closest('#gop')) openDash('prep'); const go = e.target.closest('[data-go]'); if (go) openDash(go.dataset.go);
  };
  c.onchange = e => { if (e.target.id === 'we' || e.target.id === 'ws') { save(); $('#wnote', c).textContent = nightEnd() ? 'La soirée se termine le lendemain : c’est bien géré (fin après minuit).' : 'Fin le même jour.'; } };
  $('#wq', c) && drawQR($('#wq', c), W.name);
};

// ---------- Préparation : ajout réel de lieux et de zones, balises configurables (rôle, rayon, action), sans doublon ----------
const _prep = Dv.prep;
Dv.prep = (c) => {
  _prep(c); D.uzone = D.uzone || [];
  if (!DMV) return; const mv = DMV, base = mv.getMarkers;
  mv.getMarkers = m => [...base(m), ...D.uzone.map((p, i) => ({ id: 'uz' + i, at: p, html: '<div class="poi" style="width:14px;height:14px;background:#8B5CF6"></div>', z: 8 }))];
  mv.onTapEmpty = at => {
    if (D.tool === 'beacon') { const near = D.beacons.find(b => Math.hypot(b.at[0] - at[0], (b.at[1] - at[1]) / MAP_ASPECT) < 1.4); if (near) return dToast(`Une balise existe déjà ici (n° ${near.n}) : pas de doublon`); const b = { n: Math.max(...D.beacons.map(x => x.n)) + 1, at, fresh: 1, role: 'repère', r: 8, act: 'none' }; D.beacons.push(b); audit(`Balise ${b.n} posée (${zoneOf(at)})`); return V5.beaconSheet(b); }
    if (D.tool === 'poi') { const s = dsheet(`<h3>Nouveau lieu · ${esc(zoneOf(at))}</h3><label class="small">Nom<input class="inp" id="pn" placeholder="Ex. : Bar de la plage"></label><label class="small">Type<select class="inp" id="pi">${ICONS_POI.map(x => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select></label><label class="small">Horaires<input class="inp" id="ph" value="20:00 – 03:00"></label><button class="dbtn" id="ok">Ajouter sur la carte</button>`);
      $('#ok', s).onclick = () => { const n = $('#pn', s).value.trim(); if (!n) return $('#pn', s).focus(); const ic = $('#pi', s).value; POIS.push({ id: 'u' + Date.now() % 1e6, n, ic: ic === 'bar' ? 'bar' : ic, cat: ic === 'bar' ? 'bar' : ic === 'food' ? 'food' : ic === 'scene' ? 'scene' : 'service', at, node: nearestNode(at), hours: $('#ph', s).value, desc: '' }); audit('Lieu ajouté : ' + n); s.parentElement.remove(); dToast(`<b>${esc(n)}</b> ajouté · visible tout de suite dans l’app des visiteurs`); }; return; }
    if (D.tool === 'zone') { D.uzone.push(at); if (D.uzone.length === 1) dToast('Clique les coins de la zone, puis « Terminer la zone »'); if (D.uzone.length >= 3 && !$('#fz')) { const b = document.createElement('button'); b.id = 'fz'; b.className = 'dbtn'; b.textContent = 'Terminer la zone'; $('#tools', c).append(b); b.onclick = () => { const s = dsheet(`<h3>Nouvelle zone (${D.uzone.length} points)</h3><label class="small">Nom<input class="inp" id="zn" placeholder="Ex. : Terrasse sud"></label><label class="small">Capacité<input class="inp" id="zc" type="number" value="300"></label><label class="small"><input type="checkbox" id="zs"> Staff only (jamais de position visiteur)</label><button class="dbtn" id="ok">Enregistrer</button>`); $('#ok', s).onclick = () => { audit('Zone créée : ' + ($('#zn', s).value || 'sans nom')); D.uzone = []; b.remove(); s.parentElement.remove(); dToast('Zone enregistrée · les statistiques par zone la prennent en compte'); }; }; } return; }
    dToast('Allées praticables : les positions, itinéraires et flux restent sur ces tracés (jamais à travers un mur)');
  };
};
const V5 = {};
V5.beaconSheet = (b) => {
  const s = dsheet(`<h3>Balise ${b.n} · ${esc(zoneOf(b.at))}</h3><label class="small">Rôle<select class="inp" id="br">${['repère', 'entrée', 'sortie', 'zone de service', 'zone critique'].map(r => `<option ${b.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
    <label class="small">Rayon d’action (m)<input class="inp" id="bra" type="number" min="2" max="30" value="${b.r || 8}"></label>
    <label class="small">Action au passage<select class="inp" id="ba"><option value="none">Aucune</option><option value="msg">Message de bienvenue (entrée)</option><option value="bye">Message de sortie + récap</option><option value="alert">Alerte staff au passage (zone critique)</option></select></label>
    <div class="tiny">Une balise n’est liée à aucune carte en particulier : elle peut être réaffectée à un autre événement.</div><button class="dbtn" id="ok">Enregistrer</button>`);
  $('#ba', s).value = b.act || 'none';
  $('#ok', s).onclick = () => { b.role = $('#br', s).value; b.r = +$('#bra', s).value; b.act = $('#ba', s).value; audit(`Balise ${b.n} : ${b.role}, ${b.r} m, action ${b.act}`); s.parentElement.remove(); dToast(`Balise ${b.n} enregistrée`); };
};
const _beacons = Dv.beacons;
Dv.beacons = (c) => { _beacons(c); const tk = $('#tk', c); if (tk) tk.className = 'dbtn'; $$('tbody tr', c).forEach((tr, i) => { tr.style.cursor = 'pointer'; tr.onclick = () => { D.beacons = D.beacons || []; const b = D.beacons.find(x => x.n === i + 1) || { n: i + 1, at: [50, 50] }; V5.beaconSheet(b); }; }); c.querySelector('.sub').insertAdjacentHTML('afterend', '<div class="tiny">Clique une balise pour régler son rôle, son rayon et son action.</div>'); };

// ---------- Programmation : recherche d'artiste, fiche du passage liée à la scène (POI), export ----------
const _prog = Dv.prog;
Dv.prog = (c) => {
  _prog(c);
  c.querySelector('.sub').insertAdjacentHTML('afterend', `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label class="search" style="max-width:320px">${I.search.replace('<svg', '<svg width="16"')}<input id="aq" placeholder="Rechercher un artiste" style="border:0;outline:0;flex:1;font:inherit;background:transparent" aria-label="Rechercher un artiste"></label><button class="dbtn w" id="pex">${I.download.replace('<svg', '<svg width="14"')} Exporter la programmation (CSV)</button><span class="pill ok">Actuellement live : ${LINEUP.filter(isLive).length} artiste(s)</span></div>`);
  $('#aq', c).oninput = e => { const q = e.target.value.toLowerCase(); $$('[data-ed]', c).forEach(b => { b.style.opacity = !q || b.dataset.ed.toLowerCase().includes(q) ? 1 : .2; }); };
  $('#pex', c).onclick = () => { audit('Export programmation (CSV)'); dToast(`CSV prêt : ${LINEUP.length} passages (artiste, scène, début, fin, style)`); };
  $$('[data-ed]', c).forEach(b => b.onclick = () => { const l = LINEUP.find(x => x.a === b.dataset.ed), poi = POIS.find(o => o.id === l.s);
    const s = dsheet(`<h3>${esc(l.a)}</h3><label class="small">Scène (lieu sur la carte)<select class="inp" id="sc">${VENUE.stages.map(st => `<option value="${st[0]}" ${st[0] === l.s ? 'selected' : ''}>${st[1]}</option>`).join('')}</select></label><div class="tiny">${poi ? `Lié au lieu « ${esc(poi.n)} » : les visiteurs voient ce passage sur la fiche de la scène.` : 'Aucun lieu lié : choisis une scène.'}</div>
      <div class="grid2"><label class="small">Début<input class="inp" id="f" value="${l.f}"></label><label class="small">Fin<input class="inp" id="t" value="${l.t}"></label></div><label class="small">Style<input class="inp" id="stl" value="${esc(l.st)}"></label><label class="small">Liens (Instagram, Spotify, SoundCloud)<input class="inp" placeholder="https://…"></label><button class="dbtn" id="ok">Enregistrer</button>`);
    $('#ok', s).onclick = () => { const ns = $('#sc', s).value, nf = $('#f', s).value, nt = $('#t', s).value, clash = LINEUP.find(x => x !== l && x.s === ns && toMin20(x.f) < toMin20(nt) && toMin20(nf) < toMin20(x.t)); if (clash) return dToast(`Chevauchement avec « ${esc(clash.a)} » (${clash.f}–${clash.t}) sur cette scène`); Object.assign(l, { s: ns, f: nf, t: nt, st: $('#stl', s).value }); audit('Programmation modifiée : ' + l.a); s.parentElement.remove(); Dv.prog(c); dToast('Enregistré · visiteurs abonnés prévenus du changement'); }; });
};

// ---------- Alertes : alertes automatiques (densité, flux anormal, immobilité prolongée) ----------
const _alerts = Dv.alerts;
Dv.alerts = (c) => {
  _alerts(c); if (D.crisis) return; const h = c.querySelector('h1'); if (!h) return;
  const z = ZONES.slice().sort((a, b) => occNow(b) / b.cap - occNow(a) / a.cap)[0], r = occNow(z) / z.cap;
  h.closest('div').parentElement.insertAdjacentHTML('afterend', `<div class="dcard" style="gap:6px"><h3>Alertes automatiques</h3>
    <div style="display:flex;gap:8px;align-items:center;font-size:13px"><span class="pill ${r > .85 ? 'bad' : 'warn'}">Densité</span>${esc(z.n)} : ${Math.round(r * 100)} % de la capacité (borne haute de l’estimation) · seuil 85 %</div>
    <div style="display:flex;gap:8px;align-items:center;font-size:13px"><span class="pill warn">Flux anormal</span>Entrée → Fosse : 2,3 × le flux habituel à cette heure depuis 6 min</div>
    <div style="display:flex;gap:8px;align-items:center;font-size:13px"><span class="pill vio">Immobilité prolongée</span>Un appareil anonyme immobile depuis 24 min, zone isolée derrière le Bar Est · agent le plus proche : Karim (≈ 40 m) <button class="dbtn w" id="aim" style="min-height:28px">Envoyer un agent</button></div>
    <div class="tiny">Règles réglables dans « Relais d’alertes ». L’immobilité est détectée sans identité : l’agent voit seulement un point sur la carte.</div></div>`);
  $('#aim', c) && ($('#aim', c).onclick = () => { $('#aim', c).textContent = '✓ Karim prévenu'; audit('Immobilité prolongée : agent envoyé'); });
};

// ---------- Modération : signalements entre utilisateurs, contenu masqué jusqu'à décision, actions en masse ----------
D.mod = D.mod || [{ id: 1, who: '@nuit.blanche', why: 'Message insultant', what: 'Message sur la carte', t: '23:12', by: 2, st: 'À traiter' }, { id: 2, who: '@kev06', why: 'Usurpation d’identité', what: 'Profil', t: '22:47', by: 1, st: 'À traiter' }, { id: 3, who: '@sunny', why: 'Contenu inapproprié', what: 'Photo de profil', t: '22:30', by: 3, st: 'À traiter' }, { id: 4, who: '@marco.p', why: 'Harcèlement (messages répétés)', what: 'Messages', t: '21:58', by: 1, st: 'Silence 24 h' }];
Dv.moder = (c) => {
  const sel = new Set();
  const draw = () => {
    c.innerHTML = `<h1>Modération</h1><p class="sub">Signalements entre utilisateurs (pas les alertes de sécurité). Le contenu signalé reste masqué jusqu’à votre décision.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dbtn w" data-b="Avertissement">Avertir la sélection</button><button class="dbtn w" data-b="Silence 24 h">Silence 24 h</button><button class="dbtn w" data-b="Banni">Bannir</button><button class="dbtn w" data-b="Rejeté">Rejeter le signalement</button><span class="tiny" style="align-self:center">${sel.size} sélectionné(s)</span></div>
      <div class="dcard"><div class="tw"><table><thead><tr><th></th><th>Compte</th><th>Motif</th><th>Contenu</th><th>Signalé par</th><th>Heure</th><th>Statut</th></tr></thead><tbody>${D.mod.map(m => `<tr><td><input type="checkbox" data-k="${m.id}" ${sel.has(m.id) ? 'checked' : ''} aria-label="Sélectionner ${m.who}"></td><td><b>${m.who}</b></td><td>${m.why}</td><td>${m.shown ? `<span class="small">« contenu affiché pour décision »</span>` : `<button class="dbtn w" data-v="${m.id}" style="min-height:28px">Masqué · afficher</button>`}</td><td>${m.by} personne(s)</td><td>${m.t}</td><td><span class="pill ${m.st === 'À traiter' ? 'warn' : m.st === 'Rejeté' ? 'gray' : 'bad'}">${m.st}</span></td></tr>`).join('')}</tbody></table></div></div>
      <div class="note">Les personnes qui signalent restent anonymes pour la personne signalée. Chaque décision est inscrite au journal d’audit.</div>`;
  };
  draw();
  c.onclick = e => { const k = e.target.closest('[data-k]'); if (k) { const id = +k.dataset.k; k.checked ? sel.add(id) : sel.delete(id); return draw(); } const v = e.target.closest('[data-v]'); if (v) { D.mod.find(m => m.id === +v.dataset.v).shown = 1; audit('Contenu signalé consulté'); return draw(); }
    const b = e.target.closest('[data-b]'); if (b) { if (!sel.size) return dToast('Sélectionne au moins un signalement'); D.mod.forEach(m => { if (sel.has(m.id)) m.st = b.dataset.b; }); audit(`Modération : ${b.dataset.b} (${sel.size})`); dToast(`${b.dataset.b} · ${sel.size} compte(s)`); sel.clear(); draw(); } };
};

// ---------- Relais d'alertes : règles par type × zone × rôle, journal, statuts de livraison ----------
Dv.relay = (c) => {
  D.rules = D.rules || [['Urgence médicale', 'Toutes', 'Médical + Manager', 'Critique', 1], ['Danger / bagarre', 'Toutes', 'Sécurité', 'Critique', 1], ['Trop de monde', 'Fosse, Avant-scène', 'Sécurité + Manager', 'Majeur', 1], ['Objet perdu', 'Toutes', 'Accueil', 'Mineur', 1]];
  c.innerHTML = `<h1>Relais d’alertes</h1><p class="sub">Chaque signalement part automatiquement vers les bonnes équipes, avec la position sur la carte et la priorité.</p>
    <div class="dcard"><h3>Règles</h3><div class="tw"><table><thead><tr><th>Type</th><th>Zone</th><th>Destinataires</th><th>Priorité</th><th>Active</th></tr></thead><tbody>${D.rules.map((r, i) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><span class="pill ${r[3] === 'Critique' ? 'bad' : r[3] === 'Majeur' ? 'warn' : 'gray'}">${r[3]}</span></td><td><button class="tog ${r[4] ? 'on' : ''}" data-r="${i}" aria-label="Activer la règle"></button></td></tr>`).join('')}</tbody></table></div>
      <div class="small">Canaux : notification de l’app staff (principal), WhatsApp Business (modèles de messages approuvés, lien direct vers l’alerte), SMS de secours si non lu en 60 s. Anti-doublon et anti-boucle : un même signalement n’est envoyé qu’une fois par destinataire.</div></div>
    <div class="dcard"><h3>Journal des envois</h3><div class="tw"><table><thead><tr><th>Heure</th><th>Alerte</th><th>Destinataires</th><th>Canal</th><th>Statut</th></tr></thead><tbody>${ST.reports.slice(0, 6).map((r, i) => `<tr><td>${r.time}</td><td>${esc(r.label)} · ${esc(r.zone)}</td><td>${['Médical', 'Sécurité', 'Accueil'][i % 3]} (${3 + i})</td><td>${i % 3 === 2 ? 'SMS (secours)' : 'App staff + WhatsApp'}</td><td><span class="pill ${i === 4 ? 'warn' : 'ok'}">${i === 4 ? 'Renvoyé (échec 1)' : 'Lu'}</span></td></tr>`).join('')}</tbody></table></div><div class="tiny">Aucune position ni identité de visiteur n’est envoyée par WhatsApp : le message contient la zone et un lien vers l’alerte dans l’app staff.</div></div>`;
  c.onclick = e => { const t = e.target.closest('[data-r]'); if (!t) return; const r = D.rules[+t.dataset.r]; r[4] = r[4] ? 0 : 1; t.classList.toggle('on', !!r[4]); audit(`Règle « ${r[0]} » ${r[4] ? 'activée' : 'désactivée'}`); };
};

// ---------- Admin plateforme ONEERA : partenaires, événements, supervision technique ----------
Dv.platform = (c) => {
  c.innerHTML = `<h1>Admin plateforme ONEERA</h1><p class="sub">Réservé à l’équipe ONEERA · les données d’un partenaire ne sont jamais visibles par un autre</p>
    <div class="row4"><div class="kpi"><span>Événements actifs</span><b>3</b></div><div class="kpi"><span>Connectés maintenant</span><b>${fmtN(appUsers(nowMin()) + 640)}</b></div><div class="kpi"><span>Latence ami → ami (p95)</span><b>1,4 s</b><small>cible ≤ 3 s</small></div><div class="kpi"><span>API et temps réel</span><b style="color:#16A34A">Opérationnels</b></div></div>
    <div class="cols"><div class="dcard"><h3>Partenaires</h3><div class="tw"><table><thead><tr><th>Partenaire</th><th>Modules</th><th>Statut</th></tr></thead><tbody>${[['Bal des Fous (Cannes)', 'Carte, staff, analytics, relais', 'Actif'], ['Bisous Bisous (Cannes)', 'Carte, analytics club', 'Actif'], ['Selva (Monaco)', 'Carte, staff', 'Actif'], ['Nouveau partenaire', 'À configurer', 'En validation']].map(p => `<tr><td><b>${p[0]}</b></td><td class="small">${p[1]}</td><td><span class="pill ${p[2] === 'Actif' ? 'ok' : 'warn'}">${p[2]}</span></td></tr>`).join('')}</tbody></table></div></div>
      <div class="dcard"><h3>Événements</h3>${Object.values(VENUES).map(v => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #F1F2F7"><span>${esc(v.name)}</span><span class="pill ok">En direct</span></div>`).join('')}<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span>Bal des Fous · édition 2025</span><span class="pill gray">Archivé (carte réutilisée)</span></div></div></div>
    <div class="dcard"><h3>Supervision technique</h3><div class="small">Charge, pics, incidents et état des services, mis à jour toutes les 10 s. Hébergement dans l’Union européenne.</div><div class="row4"><div class="kpi"><span>Messages temps réel / s</span><b>2 480</b></div><div class="kpi"><span>Taux sans crash (7 j)</span><b>99,7 %</b></div><div class="kpi"><span>Erreurs API (1 h)</span><b>0,02 %</b></div><div class="kpi"><span>Dernière sauvegarde</span><b>04:00</b></div></div></div>`;
};

// ---------- Équipe : rôles du cahier des charges, droits modifiables en direct, double authentification ----------
const _team = Dv.team;
Dv.team = (c) => {
  _team(c); D.rights = D.rights || { 'Administrateur festival': [1, 1, 1, 1, 1], 'Manager / superviseur': [1, 1, 1, 1, 0], 'Sécurité': [1, 1, 0, 0, 0], 'Staff': [1, 0, 0, 0, 0] };
  const cols = ['Carte staff', 'Alertes', 'Messages ciblés', 'Édition carte et balises', 'Accès et rôles'];
  c.insertAdjacentHTML('beforeend', `<div class="dcard"><h3>Rôles et droits (modifiables en direct)</h3><div class="tw"><table><thead><tr><th>Rôle</th>${cols.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${Object.entries(D.rights).map(([r, v]) => `<tr><td><b>${r}</b></td>${v.map((x, i) => `<td><button class="tog ${x ? 'on' : ''}" data-rr="${r}" data-ri="${i}" aria-label="${r} : ${cols[i]}"></button></td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="tiny">Rôles complémentaires : Médical, Bar, Runner, Lecture seule, Partenaire. Personne ne peut s’attribuer un rôle lui-même.</div></div>
    <div class="dcard"><h3>Sécurité du compte organisateur</h3><div class="small">Double authentification obligatoire (application d’authentification ou clé de sécurité). Sessions expirées après 12 h. Alerte en cas de connexion inhabituelle.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pill ok">Double authentification active</span><span class="pill gray">2 sessions ouvertes</span><button class="dbtn w" id="rvs" style="min-height:30px">Fermer les autres sessions</button></div></div>`);
  c.addEventListener('click', e => { const t = e.target.closest('[data-rr]'); if (t) { const v = D.rights[t.dataset.rr]; v[+t.dataset.ri] = v[+t.dataset.ri] ? 0 : 1; t.classList.toggle('on'); audit(`Droit modifié : ${t.dataset.rr} · ${cols[+t.dataset.ri]}`); dToast('Appliqué immédiatement sur les téléphones du staff'); } if (e.target.closest('#rvs')) { e.target.closest('#rvs').textContent = '✓ Sessions fermées'; audit('Autres sessions fermées'); } });
};

// ---------- Données : export des contacts opt-in (mailing) ----------
const _data = Dv.data;
Dv.data = (c) => { _data(c); c.insertAdjacentHTML('beforeend', `<div class="dcard"><h3>Contacts pour vos e-mailings</h3><div class="small">Uniquement les visiteurs qui ont accepté de recevoir les communications de l’organisateur (case non cochée par défaut). Ces données vous appartiennent et restent exportables à tout moment.</div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>1 284 contacts opt-in</b><button class="dbtn w" id="mex">${I.download.replace('<svg', '<svg width="14"')} Exporter (CSV)</button></div></div>`); $('#mex', c).onclick = () => { audit('Export mailing opt-in (1 284 contacts)'); dToast('CSV prêt : e-mail, date du consentement, événement'); }; };

// ---------- Rouge réservé à l'urgence et aux actions destructrices (« le rouge c'est agressif ») ----------
const _dashConfirm = dashConfirm;
dashConfirm = (title, text, okLabel) => { const p = _dashConfirm(title, text, okLabel); setTimeout(() => { const b = [...document.querySelectorAll('[data-v="1"]')].pop(); if (b && !/Supprim|Révoq|Évacu|Bannir|critique|Mode crise|Retirer/i.test(okLabel + title)) { b.className = b.className.replace(/\br\b/, '').trim(); b.style.background = 'var(--pri)'; b.style.color = '#fff'; } }, 0); return p; };

// ---------- App staff : appeler la personne (numéro masqué), escalader au manager ----------
const _salert = S.alert;
S.alert = (id) => {
  _salert(id); const r = ST.reports.find(x => x.id === id), sb = $('.sheet .sbody'); if (!sb || !r) return;
  const nx = $('#nx', sb); if (nx) nx.classList.remove('red');
  sb.insertAdjacentHTML('beforeend', `<div class="grid2"><button class="btn white" id="call">${I.phone.replace('<svg', '<svg width="18"')} Appeler la personne</button><button class="btn white" id="esc">Escalader au manager</button></div>`);
  $('#call', sb).onclick = () => toast(r.mine || r.by.startsWith('@') ? 'Appel via numéro masqué : ni toi ni la personne ne voyez le vrai numéro' : 'Cette alerte vient du staff : appel direct');
  $('#esc', sb).onclick = () => { r.prio = 'Critique'; (r.hist = r.hist || []).push([fmtClock(ST.clock), 'Escaladée au manager de secteur', r.status]); emit(); toast('Escaladée : le manager de secteur est prévenu, priorité critique'); };
};
