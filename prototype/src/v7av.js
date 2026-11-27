// ===== v7 : vrai créateur d'avatar (nouveau moteur illustré) — femme / homme séparés, éléments interchangeables =====
const myAv2 = () => { if (!ST.me.av2) ST.me.av2 = { ...AV2_DEFAULT, g: 'm', skin: 3, hair: 'crop', hairC: 2, top: 'openshirt', topC: 2, bottom: 'chinos', bottomC: 2, shoes: 'sneakers', jewel: ['necklace', 'bracelets'], pose: 'pocket' }; return ST.me.av2; };
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
V.avatarPick = (onDone, step = true, init = null) => {
  const L = JSON.parse(JSON.stringify(init || myAv2())), undo = []; let tab = init ? 'top' : 'hair';
  const ic = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const TABS = [
    ['body', 'Corps', ic('<circle cx="12" cy="5" r="2.6"/><path d="M8 21v-6l-2-1 1.5-5.5h9L18 14l-2 1v6"/>')],
    ['face', 'Visage', ic('<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10.5" r=".8" fill="currentColor"/><circle cx="15" cy="10.5" r=".8" fill="currentColor"/><path d="M8.8 14.6c1.8 1.8 4.6 1.8 6.4 0"/>')],
    ['hair', 'Cheveux', ic('<path d="M5 14c-.5-6 3-10 7-10s7.5 4 7 10"/><path d="M5 14c2-1 3-4 3.5-6 2 2.5 6 3.5 10.5 6"/><path d="M5 14v4M19 14v4"/>')],
    ['top', 'Haut', ic('<path d="M8 3.5 4 6l1.5 4.5L7.5 10V20h9V10l2 .5L20 6l-4-2.5c-.7 1.4-2.2 2.3-4 2.3s-3.3-.9-4-2.3z"/>')],
    ['bottom', 'Bas', ic('<path d="M7 3h10l1 18h-4.2L12 10l-1.8 11H6z"/>')],
    ['shoes', 'Pieds', ic('<path d="M3 15.5V9h4l1.5 2.5c2 .5 6 1 9 2.3 1.6.7 2.5 1.6 2.5 2.7v.5H3z"/><path d="M3 18.5h18"/>')],
    ['acc', 'Style', ic('<circle cx="7" cy="13" r="3.4"/><circle cx="17" cy="13" r="3.4"/><path d="M10.4 13h3.2M3.6 12 2.5 9.5M20.4 12l1.1-2.5"/>')],
    ['cost', 'Costumes', ic('<path d="M12 3c-3 0-5 2-5 5 0 2 1 3 1 3l-3 9h14l-3-9s1-1 1-3c0-3-2-5-5-5z"/><circle cx="10" cy="8" r=".9" fill="currentColor"/><circle cx="14" cy="8" r=".9" fill="currentColor"/>')],
    ['looks', 'Looks', ic('<path d="M9 3h6l1 3-4 2-4-2z"/><path d="M8 6 4.5 8 6 12l2-.6V21h8v-9.6l2 .6 1.5-4L16 6"/><path d="M12 8v4"/>')],
    ['fun', 'Fête', ic('<path d="M12 2.5l1.8 4.6 4.7.4-3.6 3.1 1.1 4.7L12 12.8l-4 2.5 1.1-4.7-3.6-3.1 4.7-.4z"/><path d="M5 20l2-3M19 20l-2-3M12 21.5v-3"/>')],
  ];
  const el = mount(`<div class="studio st2">
    <div class="stStage">
      <div class="stGlow"></div><div class="stFloor"></div><div id="big" class="av2big"></div>
      <div class="stTop">${step ? '<button class="stLater" id="later">Plus tard</button>' : `<button class="rb" id="bk" aria-label="Retour">${I.back}</button>`}
        <div class="stG" id="gd" role="group" aria-label="Genre de l'avatar"><button data-g="f">Femme</button><button data-g="m">Homme</button></div>
        <button class="rb" id="un" aria-label="Annuler la dernière modification">↶</button><button class="rb" id="rd" aria-label="Surprends-moi">${I.dice}</button></div>
      <button class="stMapBtn" id="pv">Voir sur la carte</button>
      <div class="stMap" id="mp" hidden><img src="${VENUE.map.src}" alt="" class="stMapBg" style="object-position:${ST.me.pos[0]}% ${ST.me.pos[1]}%"><div class="stMapMe"><span class="name">Moi</span><img id="mpi" alt=""><i></i></div></div>
      <button class="stSave" id="go">${step ? 'C’est moi !' : 'Enregistrer'}</button>
    </div>
    <div class="stPanel">
      <div class="stSearch"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg><input id="sq" type="search" placeholder="Rechercher : lunettes or, pompier, cheveux crépus…" autocomplete="off" autocapitalize="off" enterkeyhint="search" aria-label="Rechercher un élément pour ton avatar"><button id="sqx" aria-label="Effacer la recherche" hidden>✕</button></div>
      <div class="stTabs" id="tb" role="tablist">${TABS.map(t => `<button data-t="${t[0]}" role="tab" aria-label="${t[1]}">${t[2]}<span>${t[1]}</span></button>`).join('')}</div>
      <div class="stBody" id="bd"></div>
    </div></div>`, 'sky');
  const big = $('#big', el), bd = $('#bd', el);
  const MULTI = ['jewel', 'patches', 'acc', 'piercing', 'tattoo', 'feetAcc', 'faceAcc'];
  const tiles = (key, list, view, extra = {}, cls = '') => `<div class="stTiles ${cls}">${list.map(([k, n]) => { const m = MULTI.includes(key), cur = Array.isArray(L[key]) ? L[key] : [], on = m ? cur.includes(k) : (L[key] ?? (key === 'costume' || key === 'headAcc' ? 'none' : undefined)) === k; return `<button data-k="${key}" data-v="${k}" class="${on ? 'on' : ''}" aria-pressed="${on}" aria-label="${n}" title="${n}"><span class="th">${avatar2SVG({ ...L, ...extra, [key]: m ? (cur.includes(k) ? cur : [...cur, k]) : k }, { view, style: 'width:100%;height:100%' })}</span><b>${n}</b></button>`; }).join('')}</div>`;
  const toggle = (key, label) => `<div class="stTog"><span>${label}</span><div class="seg small"><button data-tog="${key}" data-val="0" class="${L[key] ? '' : 'on'}">Non</button><button data-tog="${key}" data-val="1" class="${L[key] ? 'on' : ''}">Oui</button></div></div>`;
  const named = (key, list, label) => `<div class="stLbl">${label}</div><div class="stChips">${list.map(([k, n, h]) => `<button data-k="${key}" data-v="${k}" class="${(L[key] || 'none') === k ? 'on' : ''}">${h ? `<i style="background:${h}"></i>` : ''}${n}</button>`).join('')}</div>`;
  const colors = (key, pal, label) => { const free = typeof L[key] === 'string' && /^#[0-9a-fA-F]{6}$/.test(L[key]);
    return `<div class="stLbl">${label}</div><div class="stSw small stRow"><label class="stFree ${free ? 'on' : ''}" aria-label="Couleur libre"><i style="background:${free ? L[key] : 'conic-gradient(#FF4F4F,#FFD43B,#4CFF7A,#22D3FF,#6A5CFF,#FF4FD8,#FF4F4F)'}"></i><input type="color" data-cc="${key}" value="${free ? L[key] : '#FF4FD8'}"></label>${pal.map((h, i) => `<button data-c="${key}" data-i="${i}" class="${L[key] === i ? 'on' : ''}" aria-label="Couleur ${i + 1}"><i style="background:${h}"></i></button>`).join('')}</div>`; };
  const LOOK_BASE = { outfit: 'none', topP: 'none', bottomP: 'none', glasses: 'none', hat: 'none', paint: 'none', patches: [], text: '' };
  const PRESETS = { f: [['Festival', { top: 'crop', topC: 12, bottom: 'shorts', bottomC: 6, shoes: 'boots', shoesC: 2, hat: 'bucket', hatC: 0, glasses: 'sun', jewel: ['bracelets', 'hoops'], paint: 'glitter', paintC: 0 }],
      ['Club', { outfit: 'slip', outfitC: 1, shoes: 'loafers', shoesC: 1, jewel: ['hoops', 'necklace'] }], ['Chill', { top: 'hoodie', topC: 11, bottom: 'joggers', bottomC: 14, shoes: 'sneakers', shoesC: 0, hat: 'beanie', hatC: 3, jewel: ['bracelets'] }],
      ['Rave', { top: 'crop', topC: 1, topP: 'flames', topPC: 15, bottom: 'flare', bottomC: 1, shoes: 'chunky', shoesC: 1, glasses: 'led', jewel: ['glowstick', 'bracelets'], paint: 'stars', paintC: 1 }],
      ['Été', { top: 'tank', topC: 7, topP: 'dots', topPC: 0, bottom: 'skirt', bottomC: 0, shoes: 'sandals', shoesC: 2, glasses: 'round', jewel: ['hoops'] }], ['Hiver', { top: 'jacket', topC: 3, bottom: 'jeans', bottomC: 1, shoes: 'boots', shoesC: 1, hat: 'beanie', hatC: 5, jewel: ['necklace'] }]],
    m: [['Festival', { top: 'tank', topC: 0, topP: 'tiedye', bottom: 'bermuda', bottomC: 4, shoes: 'canvas', shoesC: 0, hat: 'bucket', hatC: 12, glasses: 'sun', jewel: ['bracelets'] }],
      ['Club', { top: 'shirt', topC: 1, bottom: 'jeans', bottomC: 1, shoes: 'chunky', shoesC: 1, jewel: ['watch', 'necklace'] }], ['Chill', { top: 'hoodie', topC: 14, bottom: 'joggers', bottomC: 1, shoes: 'sneakers', shoesC: 0, hat: 'cap', hatC: 3, jewel: ['bracelets'] }],
      ['Rave', { top: 'tee', topC: 1, topP: 'tiedye', topPC: 0, bottom: 'cargo', bottomC: 1, shoes: 'chunky', shoesC: 1, glasses: 'led', jewel: ['glowstick'], paint: 'bolt', paintC: 1 }],
      ['Été', { top: 'polo', topC: 6, bottom: 'shorts', bottomC: 2, bottomP: 'none', shoes: 'sandals', shoesC: 2, hat: 'cap', hatC: 0, glasses: 'sun', jewel: ['bracelets'] }], ['Hiver', { top: 'jacket', topC: 4, bottom: 'chinos', bottomC: 1, shoes: 'boots', shoesC: 9, hat: 'beanie', hatC: 15, jewel: ['watch'] }]] };
  const lookOf = cfg => Object.fromEntries(LOOK_KEYS.filter(k => cfg[k] !== undefined).map(k => [k, JSON.parse(JSON.stringify(cfg[k]))]).concat(cfg.text ? [['text', cfg.text]] : []));
  const myLooks = () => { if (!Array.isArray(ST.me.looks)) { let v = []; try { v = JSON.parse(localStorage.getItem('oneera.looks') || '[]'); } catch (_) {} ST.me.looks = Array.isArray(v) ? v.filter(x => x && x.cfg && typeof x.name === 'string').slice(0, 6) : []; } return ST.me.looks; };
  const saveLooks = () => { try { localStorage.setItem('oneera.looks', JSON.stringify(myLooks())); } catch (_) {} };
  const applyLook = lk => { push(); Object.assign(L, JSON.parse(JSON.stringify({ ...LOOK_BASE, ...lk }))); if (!L.text) delete L.text; pop(); draw(); try { navigator.vibrate && navigator.vibrate(12); } catch (_) {} };
  const lookTile = (lk, label, i, mine) => `<div class="stLook"><button data-look="${i}" data-mine="${mine ? 1 : 0}" aria-label="Mettre le look ${esc(label)}"><span class="th">${avatar2SVG({ ...L, ...LOOK_BASE, ...lk }, { view: undefined, style: 'width:100%;height:100%' })}</span><b>${esc(label)}</b></button>${mine ? `<button class="stLookX" data-lookx="${i}" aria-label="Supprimer ${esc(label)}">✕</button>` : ''}</div>`;
  const motifs = (key, ckey, view) => `<div class="stLbl">Motif</div><div class="stTiles stMot">${AV2.motif.map(([k, n]) => { const on = (L[key] || 'none') === k; return `<button data-k="${key}" data-v="${k}" class="${on ? 'on' : ''}" aria-pressed="${on}" aria-label="${n}" title="${n}"><span class="th">${avatar2SVG({ ...L, [key]: k }, { view, style: 'width:100%;height:100%' })}</span><b>${n}</b></button>`; }).join('')}</div>${L[key] && L[key] !== 'none' ? colors(ckey, AV2.cloth, 'Couleur du motif') : ''}`;
  // ---------- recherche dans tout le catalogue (mots, synonymes, couleurs, noms au féminin)
  const SQ = { q: '' }, nrm = x => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ').replace(/œ/g, 'oe');
  const CLOTHC = { blanc: 0, blanche: 0, noir: 1, noire: 1, beige: 2, creme: 2, marine: 3, bleu: 3, bleue: 3, kaki: 4, vert: 4, verte: 4, bordeaux: 5, ciel: 6, rose: 7, sauge: 8, terracotta: 9, orange: 9, jean: 10, lavande: 11, violet: 11, violette: 11, mauve: 11, jaune: 12, moutarde: 12, sapin: 13, gris: 14, grise: 14, rouge: 15 };
  const HAIRC = { noir: 0, noirs: 0, brun: 1, bruns: 1, brune: 1, chatain: 2, chatains: 2, auburn: 4, caramel: 5, blond: 7, blonds: 7, blonde: 7, roux: 8, rousse: 8, cuivre: 9, gris: 10, blanc: 11, blancs: 11, prune: 12, bleu: 13, bleus: 13 };
  const SYN = { long: 'lisses raides longs', waves: 'ondules longs', curls: 'boucles frises', braids: 'tresses nattes box braids crepus', bun: 'chignon', ponytail: 'queue de cheval', bob: 'carre', pixie: 'court garconne', afro: 'afro crepus frises volume', crop: 'court degrade fade', messy: 'decoiffe meches', curlytop: 'boucles frises', wavy: 'mi long ondules', buzz: 'rase tres court', twists: 'vanilles twists crepus', man_bun: 'chignon', slick: 'plaque gomine', locs: 'dreadlocks locks dreads rasta crepus', spacebuns: 'space buns deux chignons macarons', puff: 'afro puff chignon crepus', coils: 'crepus frises courts coils', mohawk: 'crete iroquoise punk',
    sun: 'soleil noires solaires', round: 'rondes', clear: 'fines vue', led: 'led neon lumineuses fete', aviator: 'aviateur or doree dorees gold', cateye: 'oeil de chat papillon', heart: 'coeur rose', star: 'etoile', goldround: 'or doree dorees rondes gold', shield: 'futuriste visiere masque',
    cap: 'casquette', bucket: 'bob', beanie: 'bonnet', beret: 'beret', fedora: 'feutre borsalino', cowboyhat: 'cowboy western', visor: 'visiere', headwrap: 'foulard turban wax noue',
    hoodie: 'sweat pull capuche', tee: 'tee shirt t shirt', oversize: 'tee shirt large', tank: 'debardeur marcel', shirt: 'chemise', openshirt: 'chemise ouverte', polo: 'polo', blouse: 'blouse chemisier', jacket: 'veste blouson', crop: 'crop top court', bandeau: 'bandeau bustier',
    jeans: 'jean denim pantalon', cargo: 'cargo pantalon', chinos: 'chino pantalon', flare: 'pattes d eph evase jean', joggers: 'jogging survetement', shorts: 'short', bermuda: 'bermuda short', skirt: 'jupe courte mini', maxi: 'jupe longue',
    suit: 'costume cravate', overalls: 'salopette', jumpsuit: 'combinaison', slip: 'robe nuisette', midi: 'robe fleurie',
    sneakers: 'baskets', canvas: 'baskets montantes toile converse', chunky: 'baskets epaisses', sandals: 'sandales tongs', boots: 'bottines bottes', loafers: 'mocassins', heels: 'talons escarpins', barefoot: 'pieds nus',
    lanyard: 'pass badge festival', bumbag: 'banane sac', toering: 'bague orteil pied', anklet: 'chaine cheville', nails: 'vernis ongles',
    pompier: 'feu', police: 'flic gendarme', medecin: 'docteur hopital', secouriste: 'secours croix rouge', securite: 'vigile staff', barman: 'bar cocktail serveur', astronaute: 'espace nasa fusee', chantier: 'btp casque travaux', foot: 'football maillot sport', squelette: 'halloween os', heros: 'super hero heroine cape', vampire: 'dracula halloween', diable: 'demon halloween', noel: 'pere noel mere noel', sorciere: 'sorcier magie halloween', licorne: 'unicorn' };
  const searchIndex = () => { const G = L.g, out = [], lab = (k, n) => n;
    const add = (key, list, tabId, view, cat, colorKey, extra) => list.forEach(x => out.push({ key, v: x[0], n: G === 'f' && x[3] && key === 'costume' ? x[3] : x[1], tab: tabId, view, cat, colorKey, extra, txt: nrm(`${G === 'f' && x[3] ? x[3] : x[1]} ${x[3] || ''} ${SYN[x[0]] || ''} ${cat}`) }));
    add('hair', AV2.hair[G], 'hair', 'hair', 'cheveux coiffure coupe', 'hairC'); add('glasses', AV2.glasses.filter(x => x[0] !== 'none'), 'acc', 'head', 'lunettes');
    add('hat', AV2.hat.filter(x => x[0] !== 'none'), 'acc', 'hair', 'chapeau couvre chef', 'hatC'); add('headAcc', AV2.headAcc.filter(x => x[0] !== 'none'), 'acc', 'hair', 'accessoire tete');
    add('top', AV2.top[G], 'top', 'torso', 'haut', 'topC'); add('outfit', AV2.outfit[G].filter(x => x[0] !== 'none'), 'top', undefined, 'tenue une piece', 'outfitC'); add('bottom', AV2.bottom[G], 'bottom', 'legs', 'bas', 'bottomC');
    add('shoes', AV2.shoes, 'shoes', 'feet', 'chaussures', 'shoesC', { bottom: 'shorts', outfit: 'none' }); add('costume', AV2.costume.filter(x => x[0] !== 'none'), 'cost', undefined, 'costume deguisement metier tenue');
    add('jewel', AV2.jewel, 'acc', 'torso', 'bijou bijoux'); add('acc', AV2.acc, 'acc', 'torso', 'accessoire'); add('piercing', AV2.piercing, 'face', 'head', 'piercing'); add('tattoo', AV2.tattoo, 'acc', undefined, 'tatouage tattoo');
    add('feetAcc', AV2.feetAcc, 'shoes', 'feet', 'pieds', null, { bottom: 'shorts', outfit: 'none', shoes: 'barefoot' }); add('faceAcc', AV2.faceAcc, 'face', 'head', 'visage'); add('brows', AV2.brows, 'face', 'head', 'sourcils');
    add('lips', AV2.lips.filter(x => x[0] !== 'none'), 'face', 'head', 'rouge a levres maquillage bouche'); add('shadow', AV2.shadow.filter(x => x[0] !== 'none'), 'face', 'head', 'fard paupieres maquillage yeux');
    add('eyes', AV2.eyes, 'face', 'head', 'yeux'); add('mouth', AV2.mouth, 'face', 'head', 'sourire bouche'); if (G === 'm') add('beard', AV2.beard.filter(x => x[0] !== 'none'), 'face', 'head', 'barbe moustache');
    add('mood', AV2.mood, 'fun', 'head', 'humeur expression'); add('paint', AV2.paint.filter(x => x[0] !== 'none'), 'fun', 'head', 'maquillage festival paillettes'); add('pose', AV2.pose, 'body', undefined, 'pose posture'); add('topP', AV2.motif.filter(x => x[0] !== 'none'), 'top', 'torso', 'motif imprime haut', 'topC');
    AV2.hairC.forEach((h, i) => { const nm = Object.keys(HAIRC).find(w => HAIRC[w] === i); if (nm) out.push({ key: 'hairC', v: i, n: `Cheveux ${nm}`, tab: 'hair', view: 'hair', cat: 'cheveux couleur', txt: nrm(`cheveux couleur ${Object.keys(HAIRC).filter(w => HAIRC[w] === i).join(' ')}`) }); });
    return out; };
  const STOP = new Set(['de', 'des', 'du', 'le', 'la', 'les', 'un', 'une', 'en', 'a', 'avec', 'et', 'pour', 'mon', 'ma', 'mes']);
  const searchRun = (q) => { const toks = nrm(q).split(/[^a-z0-9]+/).filter(t => t && !STOP.has(t)); if (!toks.length) return [];
    const res = []; for (const e of searchIndex()) { const words = e.txt.split(/[^a-z0-9]+/); let sc = 0, color = null, ok = true;
      for (const t of toks) { const hit = words.some(w => w.startsWith(t) || (t.length > 3 && w.startsWith(t.replace(/s$/, ''))));
        if (hit) { sc += nrm(e.n).split(/[^a-z0-9]+/).some(w => w.startsWith(t)) ? 3 : 1; continue; }
        const map = e.colorKey === 'hairC' ? HAIRC : CLOTHC, tt = t.replace(/s$/, ''); if (e.colorKey && (map[t] != null || map[tt] != null)) { color = map[t] ?? map[tt]; sc += 1; continue; }
        ok = false; break; }
      if (ok) res.push({ ...e, color, sc }); }
    return res.sort((a, b) => b.sc - a.sc).slice(0, 30); };
  const applyCfg = (e) => { const m = MULTI.includes(e.key), cur = Array.isArray(L[e.key]) ? L[e.key] : []; const o = { [e.key]: m ? (cur.includes(e.v) ? cur : [...cur, e.v]) : (e.key === 'hairC' ? e.v : e.v) };
    if (e.color != null && e.colorKey) o[e.key === 'outfit' ? 'outfitC' : e.colorKey] = e.color; if (e.key === 'outfit' || e.key === 'top' || e.key === 'bottom') { if (e.key !== 'outfit' && L.outfit && L.outfit !== 'none') o.outfit = 'none'; }
    if (['outfit', 'top', 'bottom', 'shoes', 'hat'].includes(e.key) && L.costume && L.costume !== 'none') o.costume = 'none'; return o; };
  const searchHTML = () => { const r = searchRun(SQ.q); if (!r.length) return `<div class="stEmpty">Rien trouvé pour « ${esc(SQ.q)} ».<br><span class="stHint">Essaie : lunettes or, cheveux crépus, pompier, pull rouge, talons, piercing…</span></div>`;
    return `<div class="stLbl">${r.length} résultat${r.length > 1 ? 's' : ''}</div><div class="stTiles stCos stRes">${r.map((e, i) => { const cfg = { ...L, ...(e.extra || {}), ...applyCfg(e) }; const on = MULTI.includes(e.key) ? (Array.isArray(L[e.key]) && L[e.key].includes(e.v)) : L[e.key] === e.v && (e.color == null || L[e.colorKey] === e.color);
      return `<button data-sr="${i}" class="${on ? 'on' : ''}" aria-label="${esc(e.n)}"><span class="th">${avatar2SVG(cfg, { view: e.view, style: 'width:100%;height:100%' })}</span><b>${esc(e.n)}${e.color != null ? ` <i class="stDot" style="background:${(e.colorKey === 'hairC' ? AV2.hairC : AV2.cloth)[e.color]}"></i>` : ''}</b></button>`; }).join('')}</div>`; };
  const draw = () => {
    $$('#gd button', el).forEach(b => b.classList.toggle('on', b.dataset.g === L.g)); $$('#tb button', el).forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const G = L.g, one = L.outfit && L.outfit !== 'none';
    bd.innerHTML = SQ.q ? searchHTML() : ({
      body: () => `${colors('skin', AV2.skin, 'Teint')}<div class="stLbl">Silhouette</div>${tiles('build', AV2.build[G], undefined)}<div class="stLbl">Taille</div><div class="seg small" id="ht">${AV2.height.map(([k, n]) => `<button data-h="${k}" class="${L.height === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="stLbl">Posture</div>${tiles('pose', AV2.pose, undefined)}`,
      face: () => `${colors('eyeC', AV2.eyeC, 'Couleur des yeux')}<div class="stLbl">Yeux</div>${tiles('eyes', AV2.eyes, 'head')}<div class="stLbl">Sourire</div>${tiles('mouth', AV2.mouth, 'head')}${G === 'm' ? `<div class="stLbl">Barbe</div>${tiles('beard', AV2.beard, 'head')}` : ''}<div class="stLbl">Sourcils</div>${tiles('brows', AV2.brows, 'head')}${named('lips', AV2.lips, 'Rouge à lèvres')}${named('shadow', AV2.shadow, 'Fard à paupières')}${toggle('liner', 'Eye-liner')}<div class="stLbl">Détails du visage <span class="stHint">plusieurs possibles</span></div>${tiles('faceAcc', AV2.faceAcc, 'head')}<div class="stLbl">Piercings <span class="stHint">plusieurs possibles</span></div>${tiles('piercing', AV2.piercing, 'head')}`,
      hair: () => `${colors('hairC', AV2.hairC, 'Couleur')}${tiles('hair', AV2.hair[G], 'hair')}<div class="stLbl">Mèches de couleur</div><div class="stChips"><button data-c="hairHL" data-i="-1" class="${L.hairHL == null || L.hairHL < 0 ? 'on' : ''}">Aucune</button></div>${colors('hairHL', AV2.accC, '')}`,
      top: () => `${one ? colors('outfitC', AV2.cloth, 'Couleur de la tenue') : colors('topC', AV2.cloth, 'Couleur du haut')}${L.outfit === 'midi' ? '' : motifs('topP', 'topPC', one ? undefined : 'torso')}${one ? '' : `<div class="stLbl">Haut</div>${tiles('top', AV2.top[G], 'torso')}`}<div class="stLbl">Tenue une pièce</div>${tiles('outfit', AV2.outfit[G], undefined)}`,
      bottom: () => one ? `<div class="tiny" style="padding:12px 0">Tu portes une tenue une pièce. Choisis « Haut + bas » dans l’onglet Haut pour changer le bas.</div>` : `${colors('bottomC', AV2.cloth, 'Couleur')}${motifs('bottomP', 'bottomPC', 'legs')}<div class="stLbl">Coupe</div>${tiles('bottom', AV2.bottom[G], 'legs')}`,
      shoes: () => { const bare = ['sandals', 'barefoot', 'heels'].includes(L.shoes), longP = (!L.outfit || L.outfit === 'none') && ['jeans', 'chinos', 'joggers', 'cargo'].includes(L.bottom);
        return `${colors('shoesC', AV2.cloth, 'Couleur')}${tiles('shoes', AV2.shoes, 'feet', { bottom: 'shorts', outfit: 'none' })}${L.shoes === 'boots' && longP ? toggle('tuck', 'Bas rentré dans les bottines') : ''}<div class="stLbl">Pieds <span class="stHint">${bare ? 'plusieurs possibles' : 'visibles en sandales, escarpins ou pieds nus'}</span></div>${tiles('feetAcc', AV2.feetAcc, 'feet', { bottom: 'shorts', outfit: 'none', shoes: bare ? L.shoes : 'barefoot' })}${Array.isArray(L.feetAcc) && L.feetAcc.includes('nails') ? colors('nailC', AV2.accC, 'Couleur du vernis') : ''}<div class="stLbl">Tatouages des jambes</div>${tiles('tattoo', AV2.tattoo.filter(t => ['calf', 'ankle'].includes(t[0])), 'legs', { bottom: 'shorts', outfit: 'none' })}`; },
      cost: () => { const lab = x => [x[0], G === 'f' ? (x[3] || x[1]) : x[1]], j = AV2.costume.filter(x => x[2] === 'job').map(lab), f = AV2.costume.filter(x => x[2] === 'fun').map(lab);
        return `<div class="stHint" style="margin:2px 0 6px">Ton visage et ta coiffure restent les tiens. Touche une pièce dans Haut, Bas ou Pieds pour revenir à ta tenue.</div>${(L.costume || 'none') !== 'none' ? `<div class="stChips"><button data-k="costume" data-v="none">✕ Enlever le costume</button></div>` : ''}<div class="stLbl">Métiers</div>${tiles('costume', j, undefined, {}, 'stCos')}<div class="stLbl">Déguisements</div>${tiles('costume', f, undefined, {}, 'stCos')}${L.costume === 'heros' ? colors('costumeC', AV2.accC, 'Couleur du costume') : ''}`; },
      looks: () => { const mine = myLooks(), G = L.g, P = PRESETS[G] || PRESETS.m;
        return `<div class="stLbl">Mes looks <span class="stHint">${mine.length}/6 · ton visage et ton corps restent les mêmes</span></div>
        <div class="stTiles stLooks">${mine.map((lk, i) => lookTile(lk.cfg, lk.name, i, true)).join('')}${mine.length < 6 ? `<button class="stLookAdd" id="lkadd" aria-label="Enregistrer ma tenue actuelle comme look"><span>+</span><b>Enregistrer ma tenue</b></button>` : ''}</div>
        <div class="stLbl">Idées de looks</div><div class="stTiles stLooks">${P.map(([n, lk], i) => lookTile(lk, n, i, false)).join('')}</div>`; },
      fun: () => { const chest = !['bandeau', 'slip', 'midi', 'suit', 'jacket', 'openshirt', 'overalls'].includes(one ? L.outfit : L.top);
        return `<div class="stLbl">Humeur</div>${tiles('mood', AV2.mood, 'head')}
        <div class="stLbl">Maquillage festival</div>${tiles('paint', AV2.paint, 'head')}${L.paint && L.paint !== 'none' ? colors('paintC', AV2.neon, 'Couleur du maquillage') : ''}
        <div class="stLbl">Texte sur ton haut <span class="stHint">${chest ? '14 caractères max.' : 'visible sur tee-shirt, sweat, polo, débardeur ou crop top'}</span></div>
        <div class="stTxt"><input class="inp" id="tx" maxlength="14" placeholder="TEAM LÉA, ton surnom…" value="${esc(L.text || '')}" autocomplete="off" autocapitalize="characters" enterkeyhint="done"><button class="btn sm" id="txok" style="width:auto;padding:0 16px">OK</button></div><div class="small" id="txm" style="min-height:18px"></div>
        <div class="stLbl">Patchs <span class="stHint">3 maximum</span></div>${tiles('patches', AV2.patches, 'torso', { top: chest ? (one ? 'tee' : L.top) : 'tee', outfit: chest ? L.outfit : 'none' })}
        <div class="stLbl">Lumières <span class="stHint">bâton lumineux et lunettes LED dans « Style »</span></div>${colors('glowC', AV2.neon, 'Couleur néon')}`; },
      acc: () => `<div class="stLbl">Lunettes</div>${tiles('glasses', AV2.glasses, 'head')}<div class="stLbl">Couvre-chef</div>${L.hat !== 'none' ? colors('hatC', AV2.cloth, 'Couleur du couvre-chef') : ''}${tiles('hat', AV2.hat, 'hair')}<div class="stLbl">Sur la tête</div>${tiles('headAcc', AV2.headAcc, 'hair')}${colors('accC', AV2.accC, 'Couleur des accessoires')}<div class="stLbl">Bijoux <span class="stHint">plusieurs possibles</span></div>${tiles('jewel', AV2.jewel, 'torso', { pose: 'relax' })}<div class="stLbl">Accessoires <span class="stHint">plusieurs possibles</span></div>${tiles('acc', AV2.acc, 'torso', { pose: 'relax' })}<div class="stLbl">Tatouages <span class="stHint">visibles sur les bras nus</span></div>${tiles('tattoo', AV2.tattoo.filter(t => !['calf', 'ankle'].includes(t[0])), 'torso', { pose: 'relax', top: 'tank', outfit: 'none', costume: 'none' })}`
    })[tab]();
    big.innerHTML = avatar2SVG(L, { pedestal: false, live: true, style: 'width:100%;height:100%' }); cam(); $('#un', el).disabled = !undo.length; $('#mpi', el).src = av2URI(L);
  };
  // caméra du studio : zoom sur le visage pour cheveux / visage / accessoires, sur le buste pour le haut, sur les pieds pour les chaussures
  const CAM = { cost: [0, -60, 200, 470], fun: [0, -56, 200, 290], face: [22, -52, 156, 200], hair: [16, -60, 168, 214], acc: [16, -60, 168, 214], top: [0, -30, 200, 300], bottom: [4, 120, 192, 292], shoes: [22, 292, 156, 172] }, FULL = [14, -26, 172, 450]; // cadrages pour la tête agrandie (×1,2 autour du menton)
  let camV = FULL.slice(), camT = 0;
  // Vue en pied : cadrage calculé sur la vraie taille de la scène, pour que la tête passe sous la barre du haut (Femme / Homme)
  const fullCam = () => { const st = el.querySelector('.stStage'), tp = el.querySelector('.stTop'); if (!st || !tp) return FULL;
    const R = st.getBoundingClientRect(), T = tp.getBoundingClientRect(); if (!R.height) return FULL;
    const top = Math.min(.42, Math.max(0, (T.bottom - R.top) / R.height + .02)), bot = .035, H = 436 / (1 - top - bot);
    return [100 - 86, -26 - top * H, 172, H]; };
  const cam = () => { const svg = big.querySelector('svg'); if (!svg) return; const to = CAM[tab] || fullCam(), from = camV.slice(), t0 = performance.now(); cancelAnimationFrame(camT);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = now => { const k = reduce ? 1 : Math.min(1, (now - t0) / 380), e = 1 - Math.pow(1 - k, 3); camV = from.map((v, i) => v + (to[i] - v) * e); const sv = big.querySelector('svg'); sv && sv.setAttribute('viewBox', camV.map(v => v.toFixed(1)).join(' ')); if (k < 1) camT = requestAnimationFrame(step); };
    svg.setAttribute('viewBox', camV.join(' ')); { const fl = el.querySelector('.stPed, .stFloor'); if (fl) fl.style.opacity = CAM[tab] ? 0 : 1; } camT = requestAnimationFrame(step); };
  const push = () => { undo.push(JSON.stringify(L)); if (undo.length > 50) undo.shift(); };
  const pop = () => { big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop'); };
  $('#gd', el).onclick = e => { const b = e.target.closest('[data-g]'); if (!b || b.dataset.g === L.g) return; push(); const G = b.dataset.g; Object.assign(L, { g: G, hair: AV2.hair[G][G === 'f' ? 1 : 1][0], top: G === 'f' ? 'crop' : 'tee', bottom: G === 'f' ? 'cargo' : 'chinos', outfit: 'none', build: 'moyenne', beard: 'none' }); pop(); draw(); };
  const sq = $('#sq', el), sqx = $('#sqx', el); let sqT = 0;
  sq.addEventListener('input', () => { clearTimeout(sqT); sqT = setTimeout(() => { SQ.q = sq.value.trim(); sqx.hidden = !SQ.q; el.classList.toggle('searching', !!SQ.q); draw(); bd.scrollTop = 0; }, 160); });
  sq.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sq.blur(); } });
  sqx.onclick = () => { sq.value = ''; SQ.q = ''; sqx.hidden = true; el.classList.remove('searching'); draw(); };
  bd.addEventListener('click', e => { const b = e.target.closest('[data-sr]'); if (!b || !SQ.q) return; const r = searchRun(SQ.q)[+b.dataset.sr]; if (!r) return; push();
    if (MULTI.includes(r.key)) { const cur = Array.isArray(L[r.key]) ? L[r.key] : []; L[r.key] = cur.includes(r.v) ? cur.filter(x => x !== r.v) : [...cur, r.v]; } else Object.assign(L, applyCfg(r));
    pop(); draw(); });
  $('#tb', el).onclick = e => { const b = e.target.closest('[data-t]'); if (b) { if (SQ.q) { sq.value = ''; SQ.q = ''; sqx.hidden = true; el.classList.remove('searching'); } tab = b.dataset.t; draw(); bd.scrollTop = 0; try { b.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }); } catch (_) {} } };
  bd.onclick = e => { const k = e.target.closest('[data-k]'), c = e.target.closest('[data-c]'), h = e.target.closest('[data-h]');
    if (k) { push(); const key = k.dataset.k, v = k.dataset.v;
      if (['outfit', 'top', 'bottom', 'shoes', 'hat', 'outfitC', 'topC', 'bottomC', 'shoesC'].includes(key) && L.costume && L.costume !== 'none') L.costume = 'none'; // toucher un vêtement = on enlève le costume
      if (MULTI.includes(key)) { const cur = Array.isArray(L[key]) ? L[key] : []; if (cur.includes(v)) L[key] = cur.filter(x => x !== v); else if (key === 'patches' && cur.length >= 3) { toast('3 patchs maximum : retire-en un d’abord'); undo.pop(); return; } else L[key] = [...cur, v]; }
      else L[key] = v; pop(); draw(); }
    if (c) { push(); const i = +c.dataset.i; if (i < 0) delete L[c.dataset.c]; else L[c.dataset.c] = i; if (['topC', 'bottomC', 'shoesC', 'outfitC'].includes(c.dataset.c) && L.costume && L.costume !== 'none') L.costume = 'none'; pop(); draw(); } if (h) { push(); L.height = h.dataset.h; pop(); draw(); }
    const tg = e.target.closest('[data-tog]'); if (tg) { push(); L[tg.dataset.tog] = tg.dataset.val === '1'; pop(); draw(); } };
  bd.addEventListener('input', e => { const cc = e.target.closest('[data-cc]'); if (!cc) return; if (!bd._colPushed) { push(); bd._colPushed = true; } L[cc.dataset.cc] = cc.value.toUpperCase(); big.innerHTML = avatar2SVG(L, { pedestal: false, live: true, style: 'width:100%;height:100%' }); const sv = big.querySelector('svg'); sv && sv.setAttribute('viewBox', camV.join(' ')); const i = cc.previousElementSibling; if (i) i.style.background = cc.value; });
  bd.addEventListener('change', e => { if (e.target.closest('[data-cc]')) { bd._colPushed = false; pop(); draw(); } });
  const setText = () => { const inp = $('#tx', el), m = $('#txm', el); if (!inp) return; const v = inp.value.normalize('NFC').replace(/[<>"&`\\]/g, '').trim().replace(/\s+/g, ' ').slice(0, 14);
    if (v && isOffensiveText(v)) { m.style.color = '#C0392B'; m.textContent = 'Ce texte n’est pas autorisé : tes amis le verront.'; return; }
    push(); L.text = v; m.style.color = '#1E8E5A'; m.textContent = v ? 'Texte ajouté ✓' : 'Texte retiré';
    const noChest = ['bandeau', 'slip', 'midi', 'suit', 'jacket', 'openshirt', 'overalls'];
    if (v && (L.outfit && L.outfit !== 'none' ? noChest.includes(L.outfit) : noChest.includes(L.top))) { L.outfit = 'none'; L.top = L.g === 'f' ? 'tee' : 'tee'; m.textContent = 'Texte ajouté ✓ · haut changé en tee-shirt pour l’afficher'; } pop(); const keep = m.textContent; draw(); const m2 = $('#txm', el); if (m2) { m2.style.color = '#1E8E5A'; m2.textContent = keep; } };
  bd.addEventListener('click', e => { if (e.target.closest('#txok')) setText();
    const x = e.target.closest('[data-lookx]'); if (x) { const mine = myLooks(), i = +x.dataset.lookx, n = mine[i]?.name; mine.splice(i, 1); saveLooks(); draw(); toast(`Look « ${n} » supprimé`); return; }
    const b = e.target.closest('[data-look]'); if (b) { const i = +b.dataset.look; const lk = b.dataset.mine === '1' ? myLooks()[i]?.cfg : (PRESETS[L.g] || PRESETS.m)[i]?.[1]; if (lk) applyLook(lk); return; }
    if (e.target.closest('#lkadd')) { const mine = myLooks(); if (mine.length >= 6) return; const n = `Look ${mine.length + 1}`; mine.push({ name: n, cfg: lookOf(L) }); saveLooks(); draw(); toast(`Tenue enregistrée dans « Mes looks »`); } });
  bd.addEventListener('keydown', e => { if (e.target.id === 'tx' && e.key === 'Enter') { e.preventDefault(); setText(); e.target.blur(); } });
  $('#un', el).onclick = () => { const p = undo.pop(); if (p) { Object.keys(L).forEach(k => delete L[k]); Object.assign(L, JSON.parse(p)); draw(); } };
  let spinning = false;
  const shuffle = () => { const G = L.g, r = a => a[Math.floor(Math.random() * a.length)]; const one = Math.random() < (G === 'f' ? .25 : .1);
    Object.assign(L, { mood: Math.random() < .5 ? r(AV2.mood)[0] : 'none', paint: Math.random() < .3 ? r(AV2.paint.slice(1))[0] : 'none', paintC: Math.floor(Math.random() * AV2.neon.length), patches: Math.random() < .25 ? [r(AV2.patches)[0]] : [], build: r(AV2.build[G])[0], skin: Math.floor(Math.random() * AV2.skin.length), hair: r(AV2.hair[G])[0], hairC: Math.floor(Math.random() * 10), eyes: r(AV2.eyes)[0], mouth: r(AV2.mouth)[0], outfit: one ? r(AV2.outfit[G].slice(1))[0] : 'none', outfitC: Math.floor(Math.random() * AV2.cloth.length), top: r(AV2.top[G])[0], topC: Math.floor(Math.random() * AV2.cloth.length), bottom: r(AV2.bottom[G])[0], bottomC: Math.floor(Math.random() * AV2.cloth.length), shoes: r(AV2.shoes)[0], shoesC: Math.floor(Math.random() * AV2.cloth.length), pose: r(AV2.pose)[0], beard: G === 'm' ? r(AV2.beard)[0] : 'none', glasses: Math.random() < .25 ? r(AV2.glasses.slice(1))[0] : 'none', hat: 'none' }); };
  $('#rd', el).onclick = () => { if (spinning) return; spinning = true; push(); big.classList.add('spin'); let n = 0; const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => { shuffle(); big.innerHTML = avatar2SVG(L, { pedestal: false, live: true, style: 'width:100%;height:100%' }); const sv = big.querySelector('svg'); sv && sv.setAttribute('viewBox', camV.join(' '));
      if (++n < (reduce ? 1 : 10)) setTimeout(tick, 60 + n * 14); else { big.classList.remove('spin'); spinning = false; pop(); draw(); try { navigator.vibrate && navigator.vibrate(20); } catch (_) {} } };
    tick(); };
  $('#pv', el).onclick = () => { const mp = $('#mp', el); mp.hidden = !mp.hidden; $('#pv', el).textContent = mp.hidden ? 'Voir sur la carte' : 'Voir en grand'; };
  const done = () => { ST.me.av2 = JSON.parse(JSON.stringify(L)); emit(); if (step) markStep('avatar'); onDone ? onDone() : V.perms(); };
  $('#go', el).onclick = done;
  $('#later', el) && ($('#later', el).onclick = () => { if (step) markStep('avatar'); onDone ? onDone() : V.perms(); });
  $('#bk', el) && ($('#bk', el).onclick = () => onDone ? onDone() : V.settings());
  draw();
  // ---------- l'avatar est vivant : il dit bonjour, réagit à ce qu'on lui met, s'impatiente si on traîne, danse en attendant
  const stage = el.querySelector('.stStage'), bub = document.createElement('div'); bub.className = 'stSay'; bub.setAttribute('aria-live', 'polite'); bub.hidden = true; stage.append(bub);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, pick = a => a[Math.floor(Math.random() * a.length)], nm = (ST.me && ST.me.name) ? String(ST.me.name).split(' ')[0] : '';
  let sayT = 0, gestT = 0, lastAct = Date.now(), lastSay = 0, idleN = 0, gesturing = false;
  const say = (txt, ms = 2600) => { if (!document.body.contains(el)) return; clearTimeout(sayT); bub.textContent = txt; bub.hidden = false; bub.classList.remove('in'); void bub.offsetWidth; bub.classList.add('in'); lastSay = Date.now(); sayT = setTimeout(() => { bub.classList.remove('in'); setTimeout(() => { if (!bub.classList.contains('in')) bub.hidden = true; }, 260); }, ms); };
  const renderAs = (cfg) => { big.innerHTML = avatar2SVG(cfg, { pedestal: false, live: true, style: 'width:100%;height:100%' }); const sv = big.querySelector('svg'); sv && sv.setAttribute('viewBox', camV.join(' ')); };
  const gesture = (kind, ms = 2400) => { if (reduce || gesturing || spinning) return; gesturing = true; clearTimeout(gestT); const pose = kind === 'dance' ? 'dance' : 'wave';
    renderAs({ ...L, pose, mood: kind === 'dance' ? 'laugh' : L.mood }); big.classList.add(kind === 'dance' ? 'dancing' : 'waving');
    gestT = setTimeout(() => { big.classList.remove('waving', 'dancing'); gesturing = false; if (document.body.contains(el)) renderAs(L); }, ms); };
  const tapFoot = () => { if (reduce) return; big.classList.remove('tapping'); void big.offsetWidth; big.classList.add('tapping'); setTimeout(() => big.classList.remove('tapping'), 1800); };
  const LINES = {
    hello: [`Coucou${nm ? ' ' + nm : ''} ! On me rend encore plus stylé ? 😎`, 'Hey ! Fais-moi beau, la soirée m’attend ✨', 'Salut toi ! Je suis prêt pour un relooking 💅'],
    idle: ['Allez, dépêche-toi, je veux retourner dans la soirée ! 🎶', 'Tu choisis ? Mes potes m’attendent au bar 🍹', 'Psst… essaie les déguisements, je rêve d’être pompier 🚒', 'Je commence à avoir des fourmis dans les jambes…', 'Tu sais que tu peux mettre une couleur libre ? 🌈', 'Le DJ va commencer sans moi 😩'],
    dance: ['Bon, je danse en t’attendant 💃', 'Ce son est trop bien, je peux pas rester immobile 🕺'],
    like: ['Stylé !', 'Ça me va trop bien ✨', 'J’adore 😍', 'Validé ✅', 'Trop frais 🔥', 'On se croirait sur un podium'],
    shuffle: ['Waouh, c’est moi ?!', 'Surprise ! J’aime bien 😄', 'Encore, encore ! 🎰'], undo: ['Ah oui, c’était mieux avant 😅', 'Retour en arrière !'],
    save: [`Merci${nm ? ' ' + nm : ''} ! On retourne faire la fête 🎉`, 'Parfait ! Direction la piste 🪩', 'Je suis prêt, on y va ! 🚀']
  };
  const BY = {
    costume: { pompier: 'Au feu ! Je m’en occupe 🚒', police: 'Police ! Personne ne bouge… sauf pour danser 😎', medecin: 'Docteur de garde, tout le monde respire 🩺', chef: 'Ce soir, c’est moi qui cuisine 👨‍🍳', pilote: 'Ici votre commandant de bord ✈️', astronaute: 'Un petit pas pour moi, un grand pas pour la soirée 🚀', chantier: 'Attention, chantier de la fête en cours 🚧', dj: 'Lâchez les watts ! 🎧', squelette: 'Ouh ouh… on se fait peur ? 💀', heros: 'Pas de panique, je suis là ! 🦸', vampire: 'Je ne bois que des cocktails, promis 🧛', ange: 'Je veille sur toi ce soir 😇', diable: 'Un peu de piment dans la soirée 😈', pirate: 'À l’abordage ! 🏴‍☠️', chat: 'Miaou 🐱', abeille: 'Bzzz, je butine de stand en stand 🐝', noel: 'Ho ho ho ! 🎅', sorciere: 'Abracadabra, la fête commence 🪄', licorne: 'Je suis magique 🦄✨', none: 'Ah, ça fait du bien d’être soi-même' },
    shoes: { heels: 'Je vais souffrir mais je serai belle 💃', barefoot: 'Les pieds dans l’herbe 🌿', sandals: 'Mode été activé ☀️', boots: 'Prêt pour la boue du festival 🥾' },
    piercing: 'Aïe ! Mais ça vaut le coup 😬', tattoo: 'Ça pique un peu… mais j’adore 🖤', headAcc: 'Ça c’est un accessoire !', hairHL: 'Mèches validées 🌈', lips: 'Bisou ! 💋', liner: 'Regard de star ✨', feetAcc: 'Même mes orteils sont stylés 💅', mood: 'C’est tout moi ça', motif: 'Ce motif, quelle audace !'
  };
  const react = (key, v) => { lastAct = Date.now(); idleN = 0; if (Date.now() - lastSay < 1200 && key !== 'costume') return;
    let t = BY[key]; if (t && typeof t === 'object') t = t[v]; if (!t && /P$/.test(key)) t = BY.motif;
    if (!t && Math.random() < .45) t = pick(LINES.like); if (!t) return;
    say(t); if (key === 'costume' && v !== 'none') gesture('wave', 2000); };
  bd.addEventListener('click', e => { const k = e.target.closest('[data-k]'), tg = e.target.closest('[data-tog]'), c2 = e.target.closest('[data-c]');
    if (k) setTimeout(() => react(k.dataset.k, k.dataset.v), 60); else if (tg && tg.dataset.val === '1') setTimeout(() => react(tg.dataset.tog, 1), 60); else if (c2) { lastAct = Date.now(); idleN = 0; if (c2.dataset.c === 'hairHL') setTimeout(() => react('hairHL'), 60); } });
  el.addEventListener('pointerdown', () => { lastAct = Date.now(); }, true);
  $('#rd', el).addEventListener('click', () => { lastAct = Date.now(); setTimeout(() => say(pick(LINES.shuffle)), 900); });
  $('#un', el).addEventListener('click', () => { lastAct = Date.now(); say(pick(LINES.undo), 1800); });
  const go0 = $('#go', el).onclick; $('#go', el).onclick = () => { clearInterval(idleI); clearTimeout(gestT); go0(); setTimeout(() => toast(pick(LINES.save), 2200), 120); }; // enregistrement immédiat (pas de double action possible), le merci s'affiche sur l'écran suivant
  // bonjour à l'ouverture
  setTimeout(() => { say(pick(LINES.hello), 3000); gesture('wave', 2200); }, 450);
  // impatience : bulle + pied qui tape, puis il danse en attendant ; et parfois un petit coucou
  const idleI = setInterval(() => { if (!document.body.contains(el)) { clearInterval(idleI); return; } if (document.hidden || spinning) return;
    const idle = Date.now() - lastAct;
    if (idle > 11000 && idleN === 0) { idleN = 1; say(pick(LINES.idle), 3200); tapFoot(); }
    else if (idle > 24000 && idleN === 1) { idleN = 2; say(pick(LINES.dance), 3000); gesture('dance', 4200); }
    else if (idle > 40000 && idleN === 2) { idleN = 3; say(pick(LINES.idle), 3200); tapFoot(); }
    else if (idle > 6000 && idleN === 0 && Math.random() < .04) { gesture('wave', 1800); } }, 1000);
};
V.avatarQuick = () => V.avatarPick(null, true);
const LOOK_KEYS = ['costume', 'costumeC', 'headAcc', 'accC', 'acc', 'tuck', 'outfit', 'outfitC', 'top', 'topC', 'topP', 'topPC', 'bottom', 'bottomC', 'bottomP', 'bottomPC', 'shoes', 'shoesC', 'glasses', 'hat', 'hatC', 'jewel', 'paint', 'paintC', 'patches', 'glowC'];
V.copyLook = (cfg, name) => { if (!cfg) return; closeSheet(true); const mine = JSON.parse(JSON.stringify(myAv2())); LOOK_KEYS.forEach(k => { if (cfg[k] !== undefined) mine[k] = JSON.parse(JSON.stringify(cfg[k])); else delete mine[k]; });
  V.avatarPick(() => { V.settings(); toast(`Look de ${esc(name)} copié ✨`); }, false, mine); setTimeout(() => toast(`Le look de ${esc(name)} est appliqué : ajuste-le puis enregistre`), 300); };
const copyLookBtn = () => `<button class="link" id="cpl" style="justify-content:flex-start;gap:8px">✨ Copier son look</button>`;
V.avatarEditor = (onDone) => V.avatarPick(onDone || (() => V.settings()), false);
// profils et réglages : nouveau rendu
const _settings8 = V.settings;
V.settings = () => { _settings8(); const im = $('.scr .body .card img'); if (im) { im.src = av2URI({ ...myAv2(), _live: 1 }); im.style.height = '120px'; } const b = $('#av'); if (b) b.onclick = () => V.avatarPick(() => V.settings(), false); };
const _friendSheet8 = V.friendSheet;
V.friendSheet = (id) => { _friendSheet8(id); const sb = $('.sheet .sbody'); const im = $('.sheet .sbody img'); if (im && FRIEND_AV2[id]) im.src = av2URI({ ...FRIEND_AV2[id], _live: 1 });
  if (sb && FRIEND_AV2[id] && !$('#cpl', sb)) { const more = $('#more', sb); (more || sb.lastElementChild).insertAdjacentHTML('beforebegin', copyLookBtn()); const f = FRIENDS.find(x => x.id === id); $('#cpl', sb).onclick = () => V.copyLook(FRIEND_AV2[id], f ? f.n : 'ton ami'); } };
