// ===== Découvrir : événements ONEERA en direct et à venir (accueil hors événement) =====
V.discover = () => {
  const live = Object.values(VENUES), upcoming = [['Festival Horizon', 'Fréjus · 7 – 9 août', 'Festival plusieurs jours', 3], ['Monaco Grand Prix Village', 'Monaco · 23 – 25 mai', 'Stade / Grand Prix', 1], ['Zénith · Nuit électro', 'Nice · samedi 12', 'Salle de concert', 0]];
  const el = mount(`${statusBar()}<div class="topbar"><button class="rb" id="bk" aria-label="Retour">${I.back}</button><h1 class="left" style="font-size:26px;font-weight:800">Découvrir</h1></div>
    <div class="body" style="padding-bottom:30px"><div class="seg" id="sg"><button class="on">Ce soir</button><button>À venir</button><button>Mes événements</button></div>
    <div id="lst" style="display:flex;flex-direction:column;gap:12px"></div></div>`);
  const draw = i => {
    const L = $('#lst', el);
    if (i === 0) L.innerHTML = live.map(v => `<button class="card" data-v="${v.id}" style="padding:0;overflow:hidden;text-align:left"><div style="height:120px;background:url(${v.map.src}) 50% 50%/cover;position:relative"><span class="pill live" style="position:absolute;left:10px;top:10px;background:#fff;color:#E5484D">En direct</span>${v.id === VENUE.id ? '<span class="pill ok" style="position:absolute;right:10px;top:10px">Tu y es</span>' : ''}</div><div style="padding:10px 14px 12px"><b style="font-size:17px">${v.name}</b><div class="small">${v.kind} · ${v.place} · ${v.hours}</div><div class="small" style="margin-top:4px;display:flex;gap:4px;align-items:center">${['lea', 'ines', 'tom'].slice(0, v.id === 'selva' ? 1 : 3).map(f => `<img src="${fHead(f)}" alt="" style="width:22px;height:22px;border-radius:11px;background:#EEF2FF">`).join('')} ${v.id === 'selva' ? '1 ami y est' : '3 amis y sont'}</div></div></button>`).join('');
    else if (i === 1) L.innerHTML = upcoming.map(u => `<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:16px">${u[0]}</b><span class="pill gray">${u[2]}</span></div><div class="small">${u[1]}</div><div class="small">${u[3] ? u[3] + ' ami(s) intéressé(s)' : 'Sois le premier de ta bande'}</div><div style="display:flex;gap:8px"><button class="btn sm" data-r="${u[0]}">Me prévenir</button><button class="btn sm white" data-s="${u[0]}">Partager</button></div></div>`).join('');
    else L.innerHTML = `<div class="list">${[['Le Bal des Fous', '25 juillet 2026 · récap disponible'], ['Bisous Bisous', '18 juillet 2026 · récap disponible'], ['Le Bal des Fous', '18 juillet 2026 · récap disponible']].map((e, k) => `<button class="row" data-h="${k}"><div class="ico">${I.replay}</div><div class="grow"><div class="t">${e[0]}</div><div class="s">${e[1]}</div></div></button>`).join('')}</div>`;
    $$('[data-v]', L).forEach(b => b.onclick = () => { const go = () => { if (b.dataset.v !== VENUE.id) setVenue(b.dataset.v); V.map(); toast('Carte de ' + EVENT.name); }; b.dataset.v !== VENUE.id ? FX.leave(go) : go(); });
    $$('[data-r]', L).forEach(b => b.onclick = () => { b.textContent = '✓ Prévenu'; b.disabled = true; toast('Tu seras prévenu à l’ouverture de la carte'); });
    $$('[data-s]', L).forEach(b => b.onclick = () => V.shareSheet('On y va ? ' + b.dataset.s + ' 👉 oneera.app'));
    $$('[data-h]', L).forEach(b => b.onclick = V.recap);
  };
  $('#sg', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#sg button', el).forEach((x, k) => { x.classList.toggle('on', x === b); if (x === b) draw(k); }); };
  $('#bk', el).onclick = () => V.map(); draw(0);
};
