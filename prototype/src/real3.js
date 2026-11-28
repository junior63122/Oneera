// ---------- Espace staff réel (compte réel) : rejoindre une équipe par code, alertes du public en direct ----------
// Rôles serveur → libellés : owner = Administrateur festival, manager = Manager, security = Sécurité, staff = Staff,
// analyst = Analyste, readonly = Lecture seule. Seuls owner/manager/security/staff font avancer une alerte.
const STAFF_ROLE = { owner: 'Administrateur festival', manager: 'Manager', security: 'Sécurité', staff: 'Staff', analyst: 'Analyste', readonly: 'Lecture seule' };
const INC_CAT = { help: 'medical', crowd: 'crowd', lost_found: 'lost', other: 'other', medical: 'medical', security: 'danger', technical: 'other' };
const INC_ST = { open: 'Reçue', assigned: 'En route', in_progress: 'Sur place', resolved: 'Résolu', cancelled: 'Résolu' };
const INC_PRIO = { critical: 'Critique', high: 'Majeur', normal: 'Mineur', info: 'Mineur' };
// Heure affichée sur l'horloge de l'app (comme les signalements du visiteur), pour que « depuis N min » soit juste.
const clockOf = (iso) => fmtClock((((ST.clock - Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))) % 1440) + 1440) % 1440);
const realStaffOn = () => realOn() && !!REAL.staffOrg && ST.role !== 'visitor';
const realStaffMe = () => ({ id: 'me', n: (REAL.user || {}).displayName || 'Moi', role: STAFF_ROLE[REAL.staffOrg.role] || 'Staff', h: 'secu', node: nearestNode(ST.me.pos), col: '#4F6BF5', st: 'Dispo', sector: REAL.staffOrg.name });

async function realStaffLoad() { if (!realOn()) return []; const o = await api('GET', '/v1/staff/me'); REAL.staffOrgs = o.organizations; return o.organizations; }
function incToReport(i, old) {
  const cat = INC_CAT[i.category] || 'other', c = CATS.find(x => x[0] === cat), label = i.category === 'help' ? 'Quelqu’un a besoin d’aide' : i.category === 'crowd' ? 'Zone bondée / danger potentiel' : i.category === 'lost_found' ? 'Objets perdus / retrouvés' : (c ? c[1] : 'Autre');
  const r = old || { id: 700000 + (parseInt(i.id.slice(0, 6), 16) % 99999), hist: [] };
  Object.assign(r, { serverId: i.id, real: true, staffReal: true, cat, label, note: i.description || '', at: i.x !== null && i.y !== null ? [Number(i.x), Number(i.y)] : null, zone: i.x !== null ? zoneOf([Number(i.x), Number(i.y)]) : 'Position inconnue', time: clockOf(i.createdAt), status: INC_ST[i.status] || 'Reçue', srvStatus: i.status, by: 'Visiteur', prio: INC_PRIO[i.priority] || 'Mineur', agent: i.assignedTo ? (i.assignedTo === (REAL.user || {}).id ? 'Toi' : 'Un collègue') : '' });
  r.hist = [[clockOf(i.createdAt), 'Alerte reçue', 'Reçue']].concat(i.firstResponseAt ? [[clockOf(i.firstResponseAt), r.agent === 'Toi' ? 'Tu as pris en charge' : r.agent ? r.agent + ' a pris en charge' : 'Prise en charge', 'En route']] : []).concat(i.resolvedAt ? [[clockOf(i.resolvedAt), i.status === 'cancelled' ? 'Alerte close' : 'Alerte résolue', 'Résolu']] : []);
  return r;
}
async function realStaffSync() {
  if (!realStaffOn()) return; if (!REAL.eventId) REAL.eventId = (await api('GET', '/v1/events/BDF-DEMO')).id;
  const o = await api('GET', `/v1/staff/events/${REAL.eventId}/incidents`);
  const prev = new Map(ST.reports.filter(r => r.staffReal).map(r => [r.serverId, r]));
  ST.reports = o.incidents.map(i => incToReport(i, prev.get(i.id))); emit();
}
function realStaffEnter(org) {
  REAL.staffOrg = org; if (!REAL._visReports) REAL._visReports = ST.reports; ST.reports = [];
  ST.role = 'security'; closeSheet(true); S.alerts(); realStaffSync().catch(e => toast(esc(e.message))); realConnect();
}
function realStaffLeave() {
  if (REAL._visReports) { ST.reports = REAL._visReports; REAL._visReports = null; }
  REAL.staffOrg = null; ST.role = 'visitor'; V.map();
}
// Message temps réel « incident » (voir real.js) : nouvelle alerte ou changement d'état.
function realOnIncident(m) { if (!realStaffOn()) return; realStaffSync().then(() => { if (m.isNew) { const r = ST.reports.find(x => x.serverId === m.id); if (r) push({ for: 'staff', rid: r.id, title: 'Nouvelle alerte · ' + r.prio, text: r.label + ' · ' + r.zone, icon: IC('securite'), onTap: () => S.alert(r.id) }); } }).catch(() => {}); }

V.staffSpace = async () => {
  if (!realOn()) return;
  let orgs = []; try { orgs = await realStaffLoad(); } catch (e) { return toast(esc(e.message)); }
  const sb = openSheet(`<h2 class="h2">Espace staff</h2>
    ${orgs.length ? `<div class="small" style="margin-top:-6px">Tes équipes :</div><div class="list">${orgs.map(o => `<button class="row" data-org="${o.id}"><div class="ico">${I.users}</div><div class="grow"><div class="t">${esc(o.name)}</div><div class="s">${STAFF_ROLE[o.role] || o.role}</div></div><span style="color:#9AA0B4">›</span></button>`).join('')}</div>` : ''}
    <div class="sec">Rejoindre une équipe</div><div class="small" style="margin-top:-6px">Saisis le code de 12 caractères donné par l’organisateur. Ton rôle est fixé par le code.</div>
    <input class="inp" id="sc" aria-label="Code staff" placeholder="Ex. : 3FA92C7B10D4" autocapitalize="characters" maxlength="16" style="font-size:16px;letter-spacing:2px">
    <div class="small" id="se" role="alert" style="color:#B42318;min-height:18px"></div><button class="btn" id="sj">Rejoindre</button>`);
  $$('[data-org]', sb).forEach(b => b.onclick = () => realStaffEnter(orgs.find(o => o.id === b.dataset.org)));
  $('#sj', sb).onclick = async () => { const v = $('#sc', sb).value.trim(); $('#sj', sb).disabled = true;
    try { const r = await api('POST', '/v1/staff/join', { code: v }); const list = await realStaffLoad(); toast(r.already ? 'Tu fais déjà partie de cette équipe' : 'Bienvenue dans l’équipe 🎉'); realStaffEnter(list.find(o => o.id === r.organizationId)); }
    catch (e) { $('#se', sb).textContent = e.message; $('#sj', sb).disabled = false; } };
};

// Réglages d'un compte réel : entrée « Espace staff ».
const _settingsReal3 = V.settings;
V.settings = () => { _settingsReal3(); if (!realOn()) return; const el = $('.scr'); if (!el || $('#stsp', el)) return; const list = $('.list', el); if (!list) return;
  list.insertAdjacentHTML('afterbegin', `<button class="row" id="stsp"><div class="ico">${I.users}</div><div class="grow"><div class="t">Espace staff</div><div class="s">Pour les équipes du lieu, avec un code de l’organisateur</div></div><span style="color:#9AA0B4">›</span></button>`);
  $('#stsp', el).onclick = V.staffSpace; };

// Fiche d'une alerte : les boutons font avancer l'alerte sur le serveur (Reçue → En route → Sur place → Résolue).
const _staffAlert = S.alert;
S.alert = (id) => { _staffAlert(id); if (!realStaffOn()) return; const r = ST.reports.find(x => x.id === id), sb = $('.sheet .sbody'); if (!r || !sb) return;
  const can = ['owner', 'manager', 'security', 'staff'].includes(REAL.staffOrg.role), nx = { open: ['assigned', 'Je prends en charge · en route'], assigned: ['in_progress', 'Je suis sur place'], in_progress: ['resolved', 'Clôturer l’alerte'] }[r.srvStatus];
  const b = $('#nx', sb); if (b) { if (!can || !nx) b.remove(); else { b.textContent = nx[1]; b.onclick = async () => { b.disabled = true;
    try { await api('POST', `/v1/staff/incidents/${r.serverId}/status`, { status: nx[0] }); await realStaffSync(); if (nx[0] === 'assigned' && r.at) FX.dispatch(r); closeSheet(true); S.alert(id); }
    catch (e) { toast(esc(e.message)); b.disabled = false; } }; } }
  const rf = $('#rf', sb); if (rf) rf.remove(); /* renfort : messagerie staff pas encore branchée */
  const call = $('#call', sb); if (call) call.closest('.grid2').remove(); /* appel masqué, escalade : pas encore réels */
  if (!can) sb.insertAdjacentHTML('beforeend', `<div class="tiny">Ton rôle (${STAFF_ROLE[REAL.staffOrg.role]}) permet de consulter les alertes, pas de les traiter.</div>`); };

// Écran « Staff » : rôle réel, sortie de l'espace staff ; « Équipe » : membres réels et invitation (manager / propriétaire).
const _staffMe = S.me;
S.me = () => { if (!realStaffOn()) return _staffMe();
  const el = mount(`${statusBar()}<div class="body" style="padding-bottom:110px;padding-top:10px"><div class="card" style="flex-direction:row;gap:12px;align-items:center"><img src="${meHead()}" alt="" style="width:72px;height:72px;border-radius:36px"><div><b style="font-size:20px">${esc((REAL.user || {}).displayName || '')}</b><div class="small">${STAFF_ROLE[REAL.staffOrg.role]} · ${esc(REAL.staffOrg.name)}</div></div></div>
    <div class="list"><button class="row" id="lv"><div class="grow"><div class="t">Revenir au mode visiteur</div><div class="s">Tu restes membre de l’équipe</div></div></button></div></div>${staffNav('me')}`);
  wireStaffNav(el); $('#lv', el).onclick = realStaffLeave; };
const _staffTeam = S.team;
S.team = () => { if (!realStaffOn()) return _staffTeam();
  const boss = ['owner', 'manager'].includes(REAL.staffOrg.role);
  const el = mount(`${statusBar()}<div class="topbar"><h1 class="left" style="font-size:28px;font-weight:800">Équipe</h1></div><div class="body" style="padding-bottom:110px"><div id="tm" class="small">Chargement…</div>
    ${boss ? `<div class="card"><b>Inviter dans l’équipe</b><div class="chips" style="flex-wrap:wrap" id="ir">${['staff', 'security', 'analyst', 'readonly'].concat(REAL.staffOrg.role === 'owner' ? ['manager'] : []).map((k, i) => `<button class="chip ${i ? '' : 'on'}" data-r="${k}">${STAFF_ROLE[k]}</button>`).join('')}</div><button class="btn" id="mk">Créer un code (valable 3 jours)</button><div id="cd" class="small"></div></div>` : ''}</div>${staffNav('team')}`);
  wireStaffNav(el);
  if (boss) { $$('#ir .chip', el).forEach(c => c.onclick = () => $$('#ir .chip', el).forEach(x => x.classList.toggle('on', x === c)));
    $('#mk', el).onclick = async () => { const role = $('#ir .chip.on', el).dataset.r; try { const o = await api('POST', `/v1/staff/orgs/${REAL.staffOrg.id}/invites`, { role, hours: 72, maxUses: 20 }); $('#cd', el).innerHTML = `Code ${STAFF_ROLE[role]} : <b style="font-size:20px;letter-spacing:2px;user-select:all">${o.invite.code}</b><br>20 personnes au plus, jusqu’au ${new Date(o.invite.expiresAt).toLocaleDateString('fr-FR')}.`; } catch (e) { toast(esc(e.message)); } }; }
  (boss ? api('GET', `/v1/staff/orgs/${REAL.staffOrg.id}/members`) : Promise.resolve(null)).then(o => { const tm = $('#tm', el); if (!tm) return;
    tm.outerHTML = o ? `<div class="list">${o.members.map(m => `<div class="row"><div class="grow"><div class="t">${esc(m.displayName)}</div><div class="s">${STAFF_ROLE[m.role]}${m.active ? '' : ' · suspendu'}</div></div>${m.id !== (REAL.user || {}).id && (REAL.staffOrg.role === 'owner' || !['owner', 'manager'].includes(m.role)) ? `<button class="btn sm white" data-sus="${m.id}" data-on="${m.active ? 0 : 1}" style="width:auto;padding:0 12px">${m.active ? 'Suspendre' : 'Réactiver'}</button>` : ''}</div>`).join('')}</div>` : '<div class="small">La liste de l’équipe est réservée aux managers.</div>';
    $$('[data-sus]', el).forEach(b => b.onclick = async () => { b.disabled = true; try { await api('PATCH', `/v1/staff/orgs/${REAL.staffOrg.id}/members/${b.dataset.sus}`, { active: b.dataset.on === '1' }); S.team(); } catch (e) { toast(esc(e.message)); b.disabled = false; } }); })
    .catch(e => { const tm = $('#tm', el); if (tm) tm.textContent = e.message; }); };

// ---------- Programmation réelle : si l'organisateur l'a saisie, elle remplace celle de démonstration ----------
// Mise à jour poussée en direct (annulation, horaires) ; dernière version gardée pour le hors-réseau.
const PROG_KIND = { dj: 'DJ set', concert: 'Concert', show: 'Spectacle', screening: 'Projection', fireworks: 'Feu d’artifice', talk: 'Rencontre', other: 'Animation' };
const PROG_KEY = 'oneera.programme.v1';
const hhmm = (iso) => { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function realProgrammeApply(items) {
  if (!items || !items.length) return false; if (!REAL._demoLineup) REAL._demoLineup = LINEUP.slice();
  LINEUP.splice(0, LINEUP.length, ...items.map(i => ({ s: i.stage, a: i.title, st: (i.status === 'cancelled' ? 'ANNULÉ · ' : '') + (PROG_KIND[i.kind] || 'Animation'), f: hhmm(i.startsAt), t: hhmm(i.endsAt), cancelled: i.status === 'cancelled', srv: i.id })));
  emit(); return true;
}
async function realProgrammeSync() {
  if (!realOn()) return;
  try { if (!REAL.eventId) REAL.eventId = (await api('GET', '/v1/events/BDF-DEMO')).id; const o = await api('GET', `/v1/events/${REAL.eventId}/programme`);
    try { localStorage.setItem(PROG_KEY, JSON.stringify({ ev: REAL.eventId, items: o.items })); } catch (_) {}
    realProgrammeApply(o.items); }
  catch (_) { try { const c = JSON.parse(localStorage.getItem(PROG_KEY) || 'null'); if (c && c.ev === REAL.eventId) realProgrammeApply(c.items); } catch (_) {} }
}

// ---------- Tableau de bord réel (owner, manager, analyste, lecture seule) : agrégats seulement, cases < 5 masquées ----------
V.realDash = async () => {
  if (!realStaffOn()) return; const ev = REAL.eventId;
  const sb = openSheet(`<h2 class="h2">Tableau de bord · en direct</h2><div class="small" style="margin-top:-6px">Comptages anonymes par zone, mis à jour chaque minute. Une zone de moins de 5 personnes n’est jamais chiffrée.</div><div id="rd" class="small">Chargement…</div>`, { full: true });
  const box = $('#rd', sb), nf = (v) => v === null || v === undefined ? '< 5' : String(v);
  try {
    const now = new Date(), h1 = new Date(now - 3600e3), d1a = new Date(now - 86400e3 - 3600e3), d1b = new Date(now - 86400e3);
    const [live, flows, cmp] = await Promise.all([api('GET', `/v1/dashboard/events/${ev}/live`), api('GET', `/v1/dashboard/events/${ev}/flows?from=${h1.toISOString()}&to=${now.toISOString()}`),
      api('GET', `/v1/dashboard/events/${ev}/compare?aFrom=${h1.toISOString()}&aTo=${now.toISOString()}&bFrom=${d1a.toISOString()}&bTo=${d1b.toISOString()}`)]);
    if (!box.isConnected) return;
    const zl = live.zones.length ? `<div class="list">${live.zones.map(z => `<div class="row"><div class="grow"><div class="t">${esc(z.name || z.zone)}</div><div class="s">${z.masked ? 'Moins de 5 personnes' : `Pic ${nf(z.peak)} · moyenne ${z.avg}`}${z.capacity ? ' · capacité ' + z.capacity : ''}</div></div>${z.fill !== null ? `<span class="pill ${z.fill >= 100 ? 'bad' : z.fill >= 90 ? 'warn' : 'ok'}">${z.fill} %</span>` : ''}</div>`).join('')}</div>` : '<div class="small">Aucune donnée ces 3 dernières minutes : personne n’a encore accepté de partager des statistiques anonymes.</div>';
    const al = live.alerts.length ? `<div class="list">${live.alerts.map(a => `<div class="row"><div class="grow"><div class="t">${a.kind === 'density' ? 'Densité' : 'Afflux anormal'} · ${esc(a.zone)}</div><div class="s">${a.kind === 'density' ? a.value + ' % de la capacité' : a.value + ' arrivées en 5 min (seuil ' + a.threshold + ')'}</div></div><span class="pill ${a.level === 'critical' ? 'bad' : 'warn'}">${a.level === 'critical' ? 'Critique' : 'À surveiller'}</span></div>`).join('')}</div>` : '<div class="small">Aucune alerte automatique.</div>';
    const fl = flows.flows.length ? `<div class="list">${flows.flows.slice(0, 6).map(x => `<div class="row"><div class="grow"><div class="t">${esc(x.from)} → ${esc(x.to)}</div></div><b>${nf(x.n)}</b></div>`).join('')}</div>` : '<div class="small">Pas encore de passage entre zones cette dernière heure.</div>';
    const by = Object.fromEntries(cmp.b.zones.map(z => [z.zone, z]));
    const cp = cmp.a.zones.length ? `<div class="list">${cmp.a.zones.map(z => `<div class="row"><div class="grow"><div class="t">${esc(z.name || z.zone)}</div><div class="s">Pic cette heure ${nf(z.peak)} · hier à la même heure ${by[z.zone] ? nf(by[z.zone].peak) : '—'}</div></div></div>`).join('')}</div>` : '<div class="small">Rien à comparer pour l’instant.</div>';
    box.outerHTML = `<div class="grid2"><div class="stat"><span>Alertes ouvertes</span><b style="color:#E5484D">${live.openIncidents}</b></div><div class="stat"><span>Zones suivies</span><b>${live.zones.length}</b></div></div>
      <div class="sec">Zones (3 dernières minutes)</div>${zl}<div class="sec">Alertes automatiques</div>${al}<div class="sec">Flux de la dernière heure</div>${fl}<div class="sec">Comparaison avec hier</div>${cp}`;
  } catch (e) { if (box.isConnected) box.textContent = e.message; }
};
// Entrée « Tableau de bord » dans l'écran Staff pour les rôles qui y ont droit.
const _staffMeR = S.me;
S.me = () => { _staffMeR(); if (!realStaffOn()) return; const lv = $('#lv'); if (!lv) return;
  lv.insertAdjacentHTML('beforebegin', `<button class="row" id="rdb"><div class="ico">${I.chart || I.grid}</div><div class="grow"><div class="t">Tableau de bord</div><div class="s">Fréquentation par zone, flux, alertes, comparaison</div></div><span style="color:#9AA0B4">›</span></button>`);
  $('#rdb').onclick = V.realDash; };
