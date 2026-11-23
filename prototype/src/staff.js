// ===== App staff (même app, interface selon le rôle) =====
const S = {};
const AUTO = [{ id: 9001, cat: 'crowd', label: 'Densité élevée (automatique)', note: 'Avant-scène au-dessus de 90 % de sa capacité estimée', at: [39, 39], zone: 'Avant-scène', time: '23:36', status: 'Reçue', by: 'Système', prio: 'Majeur', hist: [['23:36', 'Seuil 90 % dépassé', 'Reçue']] },
  { id: 9002, cat: 'lost', label: 'Objet perdu', note: 'Téléphone noir, coque rose', at: [51, 66], zone: 'Bar à cocktails', time: '23:21', status: 'Prise en charge', agent: 'Point info', by: '@ines', prio: 'Mineur', hist: [['23:21', 'Reçue', 'Reçue'], ['23:24', 'Point info prend en charge', 'Prise en charge']] }];
AUTO.forEach(a => ST.reports.push(a));
const staffBadge = () => ST.reports.filter(r => r.status === 'Reçue').length;
function staffNav(active) {
  const isBar = ST.role === 'bar';
  const items = isBar ? [['map', I.map, 'Map'], ['bar', I.grid, 'Mon bar'], ['team', I.users, 'Équipe']] : [['map', I.map, 'Map'], ['alerts', I.alert, 'Alertes'], ['team', I.users, 'Équipe'], ['me', I.user, 'Staff']];
  return `<nav class="nav"><div class="bar" style="background:rgba(28,31,42,.95)">${items.map(i => `<button data-sn="${i[0]}" class="${active === i[0] ? 'on' : ''}" style="color:${active === i[0] ? '#8FA4FF' : '#C5C9D6'}" aria-label="${i[2]}">${i[1]}<span>${i[2]}</span>${i[0] === 'alerts' && staffBadge() ? `<span class="badge" style="top:2px;right:6px;border-color:#1C1F2A">${staffBadge()}</span>` : ''}</button>`).join('')}</div><button class="rb" id="sos2" aria-label="Demander du renfort" style="width:52px;height:52px;border-radius:26px;background:#E5484D;color:#fff">${I.alert}</button></nav>`;
}
function wireStaffNav(el) {
  $$('[data-sn]', el).forEach(b => b.onclick = () => ({ map: S.map, alerts: S.alerts, team: S.team, me: S.me, bar: S.bar })[b.dataset.sn]());
  $('#sos2', el).onclick = async () => { const v = await sysAlert({ title: 'Demander du renfort ?', text: 'Ta position est envoyée aux managers et à la sécurité la plus proche.', buttons: [{ t: 'Envoyer', v: 1, b: 1 }, { t: 'Annuler', v: 0 }] }); if (v) { ST.reports.unshift({ id: Date.now() % 100000, cat: 'danger', label: 'Renfort demandé (staff)', note: ST.role === 'bar' ? 'Bar Ouest' : 'Fosse', at: ST.role === 'bar' ? NODES.M : NODES.G, zone: ST.role === 'bar' ? 'Bar Ouest' : 'Fosse', time: fmtClock(ST.clock), status: 'Reçue', by: ST.role === 'bar' ? 'Lucas M. (bar)' : 'Nadir K.', prio: 'Critique', hist: [[fmtClock(ST.clock), 'Renfort demandé']] }); emit(); toast('Renfort demandé : 2 agents prévenus'); } };
}
S.map = () => {
  const me = ST.role === 'bar' ? STAFF[4] : STAFF[0];
  const el = mount(`<div id="mv"></div>${statusBar()}<div class="mapTop"><div class="evbar" style="background:rgba(28,31,42,.95);color:#fff"><img class="lg" src="${HEAD(me.h)}" alt="" style="border-radius:17px"><div style="flex:1"><b>${me.n} · ${me.role}</b><div style="font-size:12px;opacity:.75">En service · ${ST.role === 'bar' ? 'Bar Ouest' : 'Secteur Fosse'} · fin 04:30</div></div><span class="pill ok">Dispo</span></div>
    <div class="chips" id="sf">${['Tout', 'Sécurité', 'Médical', 'Bar', 'Alertes'].map((c, i) => `<button class="chip ${i ? '' : 'on'}">${c}</button>`).join('')}</div></div>
    <div class="ctrls" style="top:150px"><div class="stack"><button id="zin" aria-label="Zoomer">${I.plus}</button><button id="zout" aria-label="Dézoomer">${I.minus}</button><button id="hm" aria-label="Densité">${I.fire}</button></div></div>
    <div class="livebar" id="lb"></div>${staffNav('map')}`, '');
  wireStaffNav(el);
  let heat = true, flt = 'Tout';
  if (MV) MV.destroy();
  MV = new MapView($('#mv', el), { at: [48, 52], zoom: .36, cluster: false, markers: () => {
    const out = [];
    if (heat && flt !== 'Alertes') ZONES.forEach(z => { const r = occNow(z) / z.cap, c = r > .85 ? '#E5484D' : r > .6 ? '#E58A00' : '#16A34A'; out.push({ id: 'z' + z.id, at: z.at, aria: z.n, html: `<div class="lbl" style="background:${c};color:#fff;transform:translateY(50%)">${Math.round(r * 100)} %</div>`, halo: { m: z.r * 4.1, c }, onClick: () => toast(`${z.n} : ${Math.round(r * 100)} % · ≈ ${fmtN(occNow(z))} pers. · ${STAFF.filter(s => dist(NODES[staffNode(s)], z.at) < 12).length} agent(s) proche(s)`), z: 1 }); });
    POIS.filter(o => ['secours', 'entree', 'barO', 'barE', 'barC', 'scene', 'info'].includes(o.id)).forEach(o => out.push({ ...poiMarker(o, () => toast(`${o.n}${o.bar ? ' · attente ≈ ' + waitOf(o.id) + ' min' : ''} · ${metersPath(route('G', o.node), NODES.G)} m de toi`)), z: 2 }));
    STAFF.filter(s => flt === 'Tout' || s.role === flt).filter(() => flt !== 'Alertes').forEach(s => out.push(personMarker('st' + s.id, s.n.split(' ')[0], staffHead(s), NODES[staffNode(s)], { staff: true, col: s.col, sub: s.st === 'Dispo' ? s.role : s.st, acc: 4, onClick: () => S.member(s) })));
    ST.reports.filter(r => r.status !== 'Résolu' && r.status !== 'En attente réseau' && ['Tout', 'Alertes', 'Sécurité', 'Médical'].includes(flt)).forEach(r => out.push({ id: 'al' + r.id, at: r.at, cls: 'alert', html: `<div class="poi" style="width:36px;height:36px">!</div><div class="lbl">${esc(r.label)}</div>`, onClick: () => S.alert(r.id), z: 9 }));
    return out; } });
  $('#zin', el).onclick = () => MV.zoomBy(1.4); $('#zout', el).onclick = () => MV.zoomBy(1 / 1.4); $('#hm', el).onclick = () => { heat = !heat; };
  $$('#sf .chip', el).forEach(c => c.onclick = () => { flt = c.textContent; $$('#sf .chip', el).forEach(x => x.classList.toggle('on', x === c)); });
  const lb = $('#lb', el); const draw = () => { if (!document.body.contains(lb)) { listeners.delete(draw); return; } const open = ST.reports.filter(r => r.status === 'Reçue');
    lb.innerHTML = open.length ? open.slice(0, 2).map(r => `<button class="mini" data-a="${r.id}" style="border-left:5px solid ${r.prio === 'Critique' ? '#E5484D' : '#E58A00'}"><img src="${IC(CATS.find(c => c[0] === r.cat)[2])}" alt="" style="width:34px"><div style="flex:1;min-width:0"><b style="font-size:14px">${esc(r.label)}</b><div class="small">${r.zone} · ${r.time} · ${metersPath(route('G', nearestNode(r.at)), NODES.G)} m</div></div><span class="pill bad">${r.prio}</span></button>`).join('') : '<div class="mini"><span class="pill ok">Calme</span><span class="small">Aucune alerte en attente dans ton secteur</span></div>';
    $$('[data-a]', lb).forEach(b => b.onclick = () => S.alert(+b.dataset.a)); };
  listeners.add(draw); draw();
};
S.alerts = () => {
  const el = mount(`${statusBar()}<div class="topbar"><h1 class="left" style="font-size:28px;font-weight:800">Alertes</h1></div><div class="body" id="al" style="padding-bottom:110px"></div>${staffNav('alerts')}`);
  wireStaffNav(el);
  const draw = () => { const al = $('#al', el); if (!al) { listeners.delete(draw); return; }
    al.innerHTML = ['Reçue', 'Prise en charge', 'En route', 'Sur place', 'Résolu'].map(st => { const l = ST.reports.filter(r => r.status === st); return l.length ? `<div class="sec">${st === 'Reçue' ? 'À prendre' : st} (${l.length})</div><div class="list">${l.map(r => `<button class="row" data-a="${r.id}"><img src="${IC(CATS.find(c => c[0] === r.cat)[2])}" alt="" style="width:38px"><div class="grow"><div class="t">${esc(r.label)}</div><div class="s">${r.zone} · ${r.time}${r.status === 'Reçue' ? ` · <b style="color:${ageMin(r.time) >= 2 ? '#E5484D' : 'inherit'}">depuis ${ageMin(r.time)} min</b>` : ''} · par ${esc(reporterLabel(r))}${r.agent ? ' · ' + esc(r.agent) : ''}</div></div><span class="pill ${r.prio === 'Critique' ? 'bad' : r.prio === 'Majeur' ? 'warn' : 'gray'}">${r.prio}</span></button>`).join('')}</div>` : ''; }).join('');
    $$('[data-a]', al).forEach(b => b.onclick = () => S.alert(+b.dataset.a)); };
  listeners.add(draw); draw();
};
S.alert = (id) => {
  const r = ST.reports.find(x => x.id === id); if (!r) return;
  const m = metersPath(route('G', nearestNode(r.at)), NODES.G);
  const next = { 'Reçue': 'Je prends en charge', 'Prise en charge': 'Je suis en route', 'En route': 'Je suis sur place', 'Sur place': 'Clôturer l’alerte' }[r.status];
  const sb = openSheet(`<div style="display:flex;gap:10px;align-items:center"><img src="${IC(CATS.find(c => c[0] === r.cat)[2])}" alt="" style="width:52px"><div style="flex:1"><h2 class="h2">${esc(r.label)}</h2><div class="small">${r.zone} · ${r.time} · ${m} m de toi</div></div><span class="pill ${r.prio === 'Critique' ? 'bad' : 'warn'}">${r.prio}</span></div>
    ${r.note ? `<div class="card" style="background:#F3F5FB"><div class="small">« ${esc(r.note)} »</div></div>` : ''}
    <div class="list">${r.hist.map(h => `<div class="row" style="min-height:40px"><span class="tiny" style="width:40px">${h[0]}</span><div class="grow"><div class="s" style="color:var(--ink)">${esc(h[1])}</div></div></div>`).join('')}</div>
    <div class="small">Signalé par ${esc(reporterLabel(r))} · position ± 3 m. ${r.by.startsWith('@') ? (r.status === 'Reçue' ? 'Le pseudo du visiteur s’affiche quand tu prends l’alerte en charge.' : 'Pseudo visible uniquement pendant ton intervention.') : ''}</div>
    ${next ? `<button class="btn ${r.status === 'Reçue' ? 'red' : ''}" id="nx">${next}</button>` : '<span class="pill ok">Résolue</span>'}
    <div class="grid2"><button class="btn white" id="it">${I.route.replace('<svg', '<svg width="18"')} Itinéraire</button><button class="btn white" id="rf">Renfort</button></div>`);
  $('#nx', sb) && ($('#nx', sb).onclick = () => {
    if (r.status === 'Reçue') staffTake(r.id, ST.role === 'bar' ? 'Lucas M.' : 'Nadir K.');
    else { const nx = { 'Prise en charge': 'En route', 'En route': 'Sur place', 'Sur place': 'Résolu' }[r.status]; r.status = nx; r.hist.push([fmtClock(ST.clock), { 'En route': 'En route', 'Sur place': 'Arrivée sur place', 'Résolu': 'Alerte clôturée' }[nx], nx]); emit();
      if (r.mine && nx === 'Sur place') push({ title: 'L’agent est sur place', text: 'Fais-lui signe, il porte un tee-shirt STAFF.', icon: IC('securite') }); }
    logEv('Staff : ' + r.label + ' → ' + r.status); closeSheet(true); S.alert(id);
  });
  $('#it', sb).onclick = () => { closeSheet(true); if (!MV || !document.body.contains(MV.host)) S.map(); setTimeout(() => { MV.setRoute([NODES.G, ...route('G', nearestNode(r.at)).map(k => NODES[k]), r.at], '#E5484D'); MV.flyTo(r.at, .5); }, 100); };
  $('#rf', sb).onclick = () => { r.hist.push([fmtClock(ST.clock), 'Renfort demandé']); emit(); toast('Hugo P. (sécurité) prévenu'); };
};
S.member = (s) => { const sb = openSheet(`<div style="display:flex;gap:12px;align-items:center"><img class="av" src="${staffHead(s)}" alt="" style="width:60px;height:60px;border-radius:30px"><div><h2 class="h2">${s.n}</h2><div class="small">${s.role} · ${s.sector} · ${s.st}</div></div></div><div class="grid2"><button class="btn" id="mm">${I.chat.replace('<svg', '<svg width="18"')} Message</button><button class="btn white" id="mr">${I.phone.replace('<svg', '<svg width="18"')} Appel radio</button></div>`); $('#mm', sb).onclick = () => { closeSheet(); toast('Message envoyé à ' + s.n + ' · lu'); }; $('#mr', sb).onclick = () => { closeSheet(); toast('Canal radio ouvert avec ' + s.n + ' (prototype)'); }; };
S.team = () => {
  const el = mount(`${statusBar()}<div class="topbar"><h1 class="left" style="font-size:28px;font-weight:800">Équipe</h1></div><div class="body" style="padding-bottom:110px">
    <div class="grid3"><div class="stat"><span>En service</span><b>128</b></div><div class="stat"><span>En intervention</span><b style="color:#E58A00">${STAFF.filter(s => s.st === 'En intervention').length + 3}</b></div><div class="stat"><span>Pause</span><b>9</b></div></div><input class="inp" id="tq" placeholder="Rechercher parmi les 128 agents" style="font-size:15px;min-height:44px">
    <div class="list">${STAFF.map(s => `<button class="row" data-m="${s.id}"><img class="av" src="${HEAD(s.h === 'secu' ? 'secu' : s.h === 'valide_sante' ? 'valide_sante' : 'staff_pro')}" alt=""><div class="grow"><div class="t">${s.n}</div><div class="s"><span class="dot" style="background:${s.col}"></span> ${s.role} · ${s.sector}</div></div><span class="pill ${s.st === 'Dispo' ? 'ok' : s.st === 'Pause' ? 'gray' : 'warn'}">${s.st}</span></button>`).join('')}</div>
    <div class="card" style="margin-bottom:20px"><b>Message à l’équipe</b><div class="chips" style="flex-wrap:wrap">${['Sécurité', 'Médical', 'Bar', 'Secteur Fosse'].map((c, i) => `<button class="chip ${i ? '' : 'on'}">${c}</button>`).join('')}</div><input class="inp" placeholder="Ex. : renfort entrée dans 5 min" style="font-size:15px"><button class="btn" id="sd">Envoyer</button></div></div>${staffNav('team')}`);
  wireStaffNav(el); $$('[data-m]', el).forEach(b => b.onclick = () => S.member(STAFF.find(s => s.id === b.dataset.m)));
  const N = { 'Sécurité': 64, 'Médical': 18, 'Bar': 46, 'Secteur Fosse': 14 }; $('#sd', el).onclick = () => { const sel = $$('.chips .chip.on', el).map(c => c.textContent), n = sel.reduce((a, k) => a + N[k], 0); if (!n) { toast('Choisis au moins un groupe'); return; } toast(`Message envoyé à ${n} agents (${sel.join(', ')}) · accusés de lecture en cours`); }; $$('.chips .chip', el).forEach(c => c.onclick = () => c.classList.toggle('on'));
  $('#tq', el).oninput = e => { const q = e.target.value.toLowerCase(); $$('[data-m]', el).forEach(r => r.hidden = q && !r.textContent.toLowerCase().includes(q)); };
};
S.me = () => {
  const el = mount(`${statusBar()}<div class="body" style="padding-bottom:110px;padding-top:10px"><div class="card" style="flex-direction:row;gap:12px;align-items:center"><img src="${AVB('secu')}" alt="" style="height:110px"><div><b style="font-size:20px">Nadir K.</b><div class="small">Sécurité · Secteur Fosse</div><div class="small">Service 20:00 → 04:30</div></div></div>
    <div class="list"><button class="row" id="pause"><div class="grow"><div class="t">Je suis en pause</div><div class="s">Ta position n’est plus partagée pendant la pause</div></div><span class="tog"></span></button><div class="row"><div class="grow"><div class="t">Interventions ce soir</div></div><b>3</b></div><div class="row"><div class="grow"><div class="t">Temps de réponse moyen</div></div><b>2 min 40</b></div></div>
    <div class="tiny">Ta position est visible par le staff et l’organisateur uniquement pendant ton service, puis conservée 7 jours pour le bilan.</div></div>${staffNav('me')}`);
  wireStaffNav(el); $('#pause', el).onclick = e => { const on = e.currentTarget.querySelector('.tog').classList.toggle('on'); STAFF[0].st = on ? 'Pause' : 'Dispo'; emit(); toast(on ? 'En pause : ta position n’est plus partagée' : 'De retour en service'); };
};
S.bar = () => {
  const id = 'barO';
  const el = mount(`${statusBar()}<div class="topbar"><h1 class="left" style="font-size:26px;font-weight:800">Bar Ouest</h1><span class="pill ok">Ouvert</span></div><div class="body" style="padding-bottom:110px">
    <div class="grid2"><div class="stat"><span>Attente affichée</span><b style="color:#E58A00">≈ ${ST.barWait?.barO ?? 9} min</b><span class="tiny">${ST.barWait?.barO != null ? 'saisie par toi' : 'estimée (31 personnes)'}</span></div><div class="stat"><span>Corriger l’attente</span><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${[3, 5, 10, 15].map(w => `<button class="chip" data-w="${w}" style="min-height:30px;padding:4px 8px">${w}′</button>`).join('')}</div></div></div>
    <div class="chips" style="flex-wrap:wrap">${['Ouvert', 'Caisse en panne', 'Fermeture 10 min'].map(x => `<button class="chip ${(ST.barState?.barO || 'Ouvert') === x ? 'on' : ''}" data-st="${x}">${x}</button>`).join('')}</div>
    <div class="small">Touchez un produit pour le passer en rupture : il s’affiche « Épuisé » dans l’app des visiteurs en quelques secondes.</div>
    ${MENU[id].map(([cat, items]) => `<div class="sec">${cat}</div><div class="list">${items.map(([n, p]) => `<button class="row" data-p="${esc(n)}"><div class="grow"><div class="t">${n}</div><div class="s">${p} €</div></div><span class="pill ${ST.ruptures[id + ':' + n] ? 'bad' : 'ok'}">${ST.ruptures[id + ':' + n] ? 'Épuisé' : 'Dispo'}</span></button>`).join('')}</div>`).join('')}
    <button class="btn white" id="ask">Demander un réassort au stock</button>${D.reassort.length ? `<div class="list">${D.reassort.map(r => `<div class="row"><div class="grow"><div class="t">Réassort ${r.t}</div><div class="s">Runner : Paul</div></div><span class="pill vio">${r.st}</span></div>`).join('')}</div>` : ''}<div style="height:20px"></div></div>${staffNav('bar')}`);
  wireStaffNav(el);
  $$('[data-p]', el).forEach(b => b.onclick = () => { const k = id + ':' + b.dataset.p; ST.ruptures[k] = !ST.ruptures[k]; if (!ST.ruptures[k]) delete ST.ruptures[k]; logEv('Bar Ouest : ' + b.dataset.p + (ST.ruptures[k] ? ' en rupture' : ' de nouveau dispo')); emit(); S.bar(); });
  $('#ask', el).onclick = () => { const r = { bar: 'barO', t: fmtClock(ST.clock), st: 'Demandé' }; D.reassort.unshift(r); logEv('Réassort demandé · Bar Ouest'); S.bar(); setTimeout(() => { r.st = 'Pris en charge'; emit(); if ($('#ask')) S.bar(); }, 3000); setTimeout(() => { r.st = 'Livré'; emit(); if ($('#ask')) S.bar(); }, 9000); };
  $$('[data-w]', el).forEach(b => b.onclick = () => { ST.barWait = { ...(ST.barWait || {}), barO: +b.dataset.w }; logEv('Bar Ouest : attente corrigée à ' + b.dataset.w + ' min'); S.bar(); });
  $$('[data-st]', el).forEach(b => b.onclick = () => { ST.barState = { ...(ST.barState || {}) }; if (b.dataset.st === 'Ouvert') delete ST.barState.barO; else ST.barState.barO = b.dataset.st; logEv('Bar Ouest : ' + b.dataset.st); S.bar(); });
};
