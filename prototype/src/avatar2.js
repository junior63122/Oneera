// ===== Moteur d'avatar ONEERA v2 — illustration premium inspirée des rendus de la marque =====
// Proportions élancées (≈ 6 têtes), grands yeux expressifs, ombrage doux, vêtements en volume.
// Femme et homme : silhouettes, coupes et vêtements propres à chacun. Un seul objet de paramètres (enregistrable, partageable).
const AV2 = {
  skin: ['#F6D9C6', '#EFC6A6', '#E3AE87', '#D29A6E', '#BC8159', '#A06844', '#835234', '#6A3F27', '#4F2E1D'],
  hairC: ['#17120F', '#33221A', '#4E3122', '#6E4529', '#93613A', '#B88250', '#D9AE73', '#EBD3A2', '#A13E1E', '#C8582A', '#8E8E93', '#E9E6E1', '#5B2C46', '#2A3552'],
  eyeC: ['#3A2517', '#5B3A22', '#7A5532', '#3E6B87', '#4E7A48', '#56606B'],
  cloth: ['#F4F1EA', '#1C1C21', '#D9C6AA', '#26324F', '#6B6948', '#6F1F2D', '#9DC2E4', '#E6B8C3', '#9DB497', '#C46A45', '#4F6E95', '#B7A5D9', '#E8C26A', '#3E7D5B', '#C9CED8', '#E35D6A'],
  build: { f: [['fine', 'Fine'], ['moyenne', 'Moyenne'], ['courbes', 'Courbes']], m: [['fine', 'Fine'], ['moyenne', 'Moyenne'], ['athletique', 'Athlétique'], ['forte', 'Forte']] },
  height: [['petite', 'Petite'], ['moyenne', 'Moyenne'], ['grande', 'Grande']],
  hair: {
    f: [['long', 'Longs lisses'], ['waves', 'Longs ondulés'], ['curls', 'Longs bouclés'], ['braids', 'Tresses'], ['bun', 'Chignon haut'], ['ponytail', 'Queue de cheval'], ['bob', 'Carré'], ['pixie', 'Court'], ['afro', 'Afro']],
    m: [['crop', 'Court dégradé'], ['messy', 'Mèches décoiffées'], ['curlytop', 'Bouclé dessus'], ['wavy', 'Mi-long ondulé'], ['buzz', 'Très court'], ['twists', 'Vanilles'], ['afro', 'Afro'], ['man_bun', 'Chignon'], ['slick', 'Plaqué']]
  },
  beard: [['none', 'Aucune'], ['stubble', 'Barbe de 3 jours'], ['short', 'Barbe courte'], ['mustache', 'Moustache'], ['goatee', 'Bouc']],
  eyes: [['open', 'Ouverts'], ['soft', 'Doux'], ['wink', 'Clin d’œil'], ['smile', 'Rieurs']],
  mouth: [['smile', 'Sourire'], ['grin', 'Grand sourire'], ['smirk', 'En coin'], ['calm', 'Calme']],
  top: {
    f: [['tee', 'Tee-shirt'], ['crop', 'Crop top'], ['bandeau', 'Bandeau'], ['tank', 'Débardeur'], ['openshirt', 'Chemise ouverte'], ['blouse', 'Blouse'], ['hoodie', 'Sweat'], ['jacket', 'Veste courte']],
    m: [['tee', 'Tee-shirt'], ['oversize', 'Tee oversize'], ['tank', 'Débardeur'], ['shirt', 'Chemise'], ['openshirt', 'Chemise ouverte'], ['polo', 'Polo'], ['hoodie', 'Sweat'], ['jacket', 'Veste']]
  },
  bottom: {
    f: [['cargo', 'Cargo large'], ['jeans', 'Jean droit'], ['flare', 'Jean évasé'], ['shorts', 'Short en jean'], ['skirt', 'Jupe courte'], ['maxi', 'Jupe longue'], ['joggers', 'Jogging']],
    m: [['cargo', 'Cargo'], ['jeans', 'Jean'], ['chinos', 'Chino'], ['bermuda', 'Bermuda cargo'], ['shorts', 'Short'], ['joggers', 'Jogging']]
  },
  outfit: { f: [['none', 'Haut + bas'], ['slip', 'Robe nuisette'], ['midi', 'Robe fleurie'], ['jumpsuit', 'Combinaison']], m: [['none', 'Haut + bas'], ['suit', 'Costume'], ['overalls', 'Salopette']] },
  shoes: [['sneakers', 'Baskets'], ['canvas', 'Toile montante'], ['chunky', 'Baskets épaisses'], ['sandals', 'Sandales'], ['boots', 'Bottines'], ['loafers', 'Mocassins']],
  glasses: [['none', 'Aucune'], ['sun', 'Solaires'], ['round', 'Rondes'], ['clear', 'Fines']],
  hat: [['none', 'Aucun'], ['cap', 'Casquette'], ['bucket', 'Bob'], ['beanie', 'Bonnet']],
  jewel: [['bracelets', 'Bracelets'], ['necklace', 'Collier'], ['hoops', 'Créoles'], ['watch', 'Montre']],
  pose: [['pocket', 'Main dans la poche'], ['hip', 'Main sur la hanche'], ['relax', 'Détendu'], ['wave', 'Salut']]
};
const AV2_DEFAULT = { g: 'm', build: 'moyenne', height: 'moyenne', skin: 3, hair: 'messy', hairC: 2, eyes: 'open', eyeC: 0, mouth: 'smile', beard: 'none', outfit: 'none', top: 'tee', topC: 0, bottom: 'cargo', bottomC: 2, shoes: 'sneakers', shoesC: 0, glasses: 'none', hat: 'none', hatC: 1, jewel: ['bracelets'], pose: 'pocket' };
const shd = (hex, a) => avShade(hex, a);
let av2u = 0;
function avatar2SVG(c0, opt = {}) {
  const c = { ...AV2_DEFAULT, ...c0 }, F = c.g === 'f', u = 'b' + (++av2u), J = new Set(c.jewel || []);
  const sk = AV2.skin[c.skin] || AV2.skin[3], hc = AV2.hairC[c.hairC] || AV2.hairC[2], ec = AV2.eyeC[c.eyeC] || AV2.eyeC[0];
  const tc = AV2.cloth[c.topC] ?? AV2.cloth[0], bc = AV2.cloth[c.bottomC] ?? AV2.cloth[2], sc = AV2.cloth[c.shoesC] ?? AV2.cloth[0], oc = AV2.cloth[c.outfitC ?? c.topC] ?? tc;
  // morphologie
  const B = { fine: [-5, -4, -5], moyenne: [0, 0, 0], courbes: [1, 2, 9], athletique: [7, 3, 1], forte: [8, 10, 6] }[c.build] || [0, 0, 0];
  const sh = (F ? 33 : 40) + B[0], wa = (F ? 22 : 29) + B[1], hp = (F ? 33 : 30) + B[2]; // demi-largeurs épaules / taille / hanches
  const L = { petite: -10, moyenne: 0, grande: 9 }[c.height] || 0; // allonge des jambes
  const yS = 128, yW = 200, yH = 228, yK = 312 + L * .5, yA = 384 + L, yF = 398 + L; // épaules, taille, hanches, genoux, chevilles, sol
  const S = []; const add = s => s && S.push(s);
  const g = (id, a, b, x2 = 1, y2 = 0) => `<linearGradient id="${u}${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const defs = [g('sk', shd(sk, .1), shd(sk, -.12)), g('hr', shd(hc, .16), shd(hc, -.28), 0.4, 1), g('tp', shd(tc, .1), shd(tc, -.2)), g('bt', shd(bc, .08), shd(bc, -.22)), g('oc', shd(oc, .1), shd(oc, -.2)), g('sh', shd(sc, .12), shd(sc, -.18), 0, 1),
    `<radialGradient id="${u}fc" cx="42%" cy="40%" r="70%"><stop offset="0" stop-color="${shd(sk, .14)}"/><stop offset=".7" stop-color="${sk}"/><stop offset="1" stop-color="${shd(sk, -.14)}"/></radialGradient>`,
    `<radialGradient id="${u}ir" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="${shd(ec, .45)}"/><stop offset=".55" stop-color="${ec}"/><stop offset="1" stop-color="${shd(ec, -.45)}"/></radialGradient>`,
    `<radialGradient id="${u}bl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F07C8C" stop-opacity=".42"/><stop offset="1" stop-color="#F07C8C" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${u}pd" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#FBD3EA"/><stop offset="1" stop-color="#E792C6"/></radialGradient>`,
    `<pattern id="${u}fl" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="${oc}"/><circle cx="6" cy="6" r="2.6" fill="#F7F1E4"/><circle cx="6" cy="6" r="1" fill="#E8C26A"/><circle cx="16" cy="15" r="2.2" fill="#F2C9D3"/><path d="M12 5 q3 -3 5 0 q-3 3 -5 0" fill="${shd(oc, -.3)}"/></pattern>`,
    `<pattern id="${u}dn" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${bc}"/><path d="M0 6 L6 0" stroke="${shd(bc, .18)}" stroke-width=".7" opacity=".6"/></pattern>`].join('');
  const SK = `url(#${u}sk)`, TP = `url(#${u}tp)`, BT = `url(#${u}bt)`, HR = `url(#${u}hr)`, OC = `url(#${u}oc)`;
  const hcD = shd(hc, -.3), hcL = shd(hc, .3), skD = shd(sk, -.2), tcD = shd(tc, -.28), bcD = shd(bc, -.3);
  const out = c.outfit && c.outfit !== 'none', dress = ['slip', 'midi'].includes(c.outfit);
  // ---------- cheveux (arrière)
  const hb = {
    long: `<path d="M64 70 C58 120 62 176 70 196 L130 196 C138 176 142 120 136 70 Z" fill="${HR}"/>`,
    waves: `<path d="M62 70 C52 108 66 128 56 150 C64 168 54 186 66 204 C82 212 118 212 134 204 C146 186 136 168 144 150 C134 128 148 108 138 70 Z" fill="${HR}"/>`,
    curls: Array.from({ length: 16 }, (_, i) => { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2); return `<circle cx="${100 + s * (34 + (k % 2) * 6)}" cy="${84 + k * 15}" r="${13 - k * .4}" fill="${k % 2 ? hc : hcD}"/>`; }).join('') + `<path d="M66 70 C60 120 64 170 72 200 L128 200 C136 170 140 120 134 70 Z" fill="${hcD}"/>`,
    braids: [-1, 1].map(s => Array.from({ length: 11 }, (_, i) => `<ellipse cx="${100 + s * (31 + Math.sin(i * 1.3) * 2)}" cy="${86 + i * 12}" rx="6.5" ry="7.5" fill="${i % 2 ? hc : hcD}" stroke="${hcD}" stroke-width=".6"/>`).join('')).join('') + `<path d="M70 74 C66 100 68 120 72 132 L128 132 C132 120 134 100 130 74 Z" fill="${hcD}"/>`,
    ponytail: `<path d="M118 40 C150 46 154 92 146 140 C142 160 132 166 128 150 C136 112 132 70 116 52 Z" fill="${HR}"/>`,
    bob: `<path d="M62 68 C56 96 58 114 66 122 C82 128 118 128 134 122 C142 114 144 96 138 68 Z" fill="${HR}"/>`,
    afro: `<circle cx="100" cy="66" r="47" fill="${HR}"/>${Array.from({ length: 14 }, (_, i) => `<circle cx="${100 + Math.cos(i / 14 * 6.28) * 44}" cy="${66 + Math.sin(i / 14 * 6.28) * 44}" r="9" fill="${i % 2 ? hc : hcD}"/>`).join('')}`,
    wavy: `<path d="M68 66 C62 86 66 104 72 112 L128 112 C134 104 138 86 132 66 Z" fill="${HR}"/>`,
    twists: Array.from({ length: 12 }, (_, i) => { const a = -2.6 + i * .43; return `<path d="M${100 + Math.cos(a) * 26} ${62 + Math.sin(a) * 26} q${Math.cos(a) * 10} ${Math.sin(a) * 10 + 8} ${Math.cos(a) * 18} ${Math.sin(a) * 14 + 14}" stroke="${i % 2 ? hc : hcD}" stroke-width="7" stroke-linecap="round" fill="none"/>`; }).join('')
  }[c.hair];
  add(hb);
  // ---------- jambes (peau), chaussures plus bas
  const legL = `M${100 - hp + 3} ${yH} C${100 - hp + 2} ${yK - 40} ${86 - 4} ${yK - 10} ${86} ${yK} C${85} ${yK + 30} ${87} ${yA - 20} ${88} ${yA} L${97} ${yA} C${97} ${yA - 30} ${99} ${yK + 20} ${98} ${yK} C${99} ${yK - 30} ${101} ${yH + 30} ${100} ${yH + 6} Z`;
  const legR = legL.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, x, y) => `${200 - x + Math.max(0, (y - yH) / (yA - yH)) * 5} ${y}`);
  add(`<path d="${legL}" fill="${SK}"/><path d="${legR}" fill="${SK}"/>`);
  // ---------- torse (peau)
  const torso = `M${100 - sh} ${yS + 4} C${100 - sh + 2} ${yS + 40} ${100 - wa - 2} ${yW - 30} ${100 - wa} ${yW} C${100 - wa - 4} ${yW + 14} ${100 - hp} ${yH - 6} ${100 - hp + 2} ${yH + 8} L${100 + hp - 2} ${yH + 8} C${100 + hp} ${yH - 6} ${100 + wa + 4} ${yW + 14} ${100 + wa} ${yW} C${100 + wa + 2} ${yW - 30} ${100 + sh - 2} ${yS + 40} ${100 + sh} ${yS + 4} C${100 + sh - 10} ${yS - 6} ${112} ${yS - 8} ${100} ${yS - 8} C${88} ${yS - 8} ${100 - sh + 10} ${yS - 6} ${100 - sh} ${yS + 4} Z`;
  add(`<path d="${torso}" fill="${SK}"/>`);
  if (F && !out) add(`<ellipse cx="100" cy="${yW + 4}" rx="2" ry="3" fill="${skD}" opacity=".5"/>`);
  // ---------- bas
  const hemShort = yH + 46, hemBerm = yK + 6;
  const pant = (x0, wTop, wKnee, wHem, yEnd) => { const xl = 100 - hp + 1, xr = 100 + hp - 1; return `M${xl} ${yH - 2} L${xr} ${yH - 2} C${xr + 2} ${yH + 30} ${100 + 4 + wKnee} ${yK - 20} ${100 + 4 + wHem} ${yEnd} L${100 + 3} ${yEnd} L${100} ${yH + 34} L${100 - 3} ${yEnd} L${100 - 4 - wHem} ${yEnd} C${100 - 4 - wKnee} ${yK - 20} ${xl - 2} ${yH + 30} ${xl} ${yH - 2} Z`; };
  const bot = !dress && c.outfit !== 'jumpsuit' && c.outfit !== 'suit' && c.outfit !== 'overalls' ? {
    cargo: `<path d="${pant(0, 0, 20, 23, yA + 4)}" fill="${BT}"/><rect x="${100 - hp - 2}" y="${yK - 44}" width="15" height="24" rx="3" fill="${bcD}" opacity=".55"/><rect x="${100 + hp - 13}" y="${yK - 44}" width="15" height="24" rx="3" fill="${bcD}" opacity=".55"/><path d="M100 ${yH + 8} V${yH + 30}" stroke="${bcD}" stroke-width="1.4"/><path d="M${100 - 14} ${yA - 30} q4 10 0 30 M${100 + 14} ${yA - 30} q-4 10 0 30" stroke="${bcD}" stroke-width="1" fill="none" opacity=".5"/>`,
    jeans: `<path d="${pant(0, 0, 14, 13, yA + 2)}" fill="url(#${u}dn)"/><path d="M100 ${yH + 8} V${yH + 30}" stroke="${bcD}" stroke-width="1.4"/><path d="M${100 - hp + 6} ${yH + 6} q10 10 22 6 M${100 + hp - 6} ${yH + 6} q-10 10 -22 6" stroke="#E8C26A" stroke-width=".9" fill="none" opacity=".8"/>`,
    flare: `<path d="${pant(0, 0, 11, 24, yA + 4)}" fill="url(#${u}dn)"/><path d="M100 ${yH + 8} V${yH + 30}" stroke="${bcD}" stroke-width="1.4"/>`,
    chinos: `<path d="${pant(0, 0, 14, 13, yA + 1)}" fill="${BT}"/><path d="M${100 - 12} ${yH + 20} V${yA} M${100 + 12} ${yH + 20} V${yA}" stroke="${bcD}" stroke-width=".9" opacity=".45"/>`,
    joggers: `<path d="${pant(0, 0, 16, 11, yA)}" fill="${BT}"/><rect x="${100 - 18}" y="${yA - 6}" width="15" height="7" rx="3" fill="${bcD}"/><rect x="${100 + 3}" y="${yA - 6}" width="15" height="7" rx="3" fill="${bcD}"/><path d="M${100 - hp + 2} ${yH + 2} Q100 ${yH + 8} ${100 + hp - 2} ${yH + 2}" stroke="${bcD}" stroke-width="2" fill="none"/>`,
    shorts: `<path d="${pant(0, 0, 0, F ? 15 : 17, hemShort)}" fill="url(#${u}dn)"/><path d="M${100 - (F ? 19 : 21) - 4} ${hemShort - 3} H${100 - 2} M${100 + 2} ${hemShort - 3} H${100 + (F ? 19 : 21) + 4}" stroke="${shd(bc, .25)}" stroke-width="5"/>`,
    bermuda: `<path d="${pant(0, 0, 0, 22, hemBerm)}" fill="${BT}"/><rect x="${100 - hp - 2}" y="${yK - 54}" width="14" height="22" rx="3" fill="${bcD}" opacity=".55"/><rect x="${100 + hp - 12}" y="${yK - 54}" width="14" height="22" rx="3" fill="${bcD}" opacity=".55"/>`,
    skirt: `<path d="M${100 - hp} ${yH - 4} L${100 + hp} ${yH - 4} L${100 + hp + 12} ${yH + 44} Q100 ${yH + 50} ${100 - hp - 12} ${yH + 44} Z" fill="${BT}"/><path d="M${100 - 10} ${yH + 4} L${100 - 14} ${yH + 46} M${100 + 10} ${yH + 4} L${100 + 14} ${yH + 46}" stroke="${bcD}" stroke-width="1" opacity=".5"/>`,
    maxi: `<path d="M${100 - hp} ${yH - 4} L${100 + hp} ${yH - 4} C${100 + hp + 10} ${yK} ${100 + hp + 24} ${yA - 20} ${100 + hp + 28} ${yA - 6} Q100 ${yA + 4} ${100 - hp - 28} ${yA - 6} C${100 - hp - 24} ${yA - 20} ${100 - hp - 10} ${yK} ${100 - hp} ${yH - 4} Z" fill="${BT}"/><path d="M${100 - 16} ${yH + 20} Q${100 - 22} ${yK + 20} ${100 - 30} ${yA - 8} M${100 + 12} ${yH + 20} Q${100 + 18} ${yK + 20} ${100 + 24} ${yA - 8} M100 ${yH + 30} V${yA - 4}" stroke="${bcD}" stroke-width="1.2" fill="none" opacity=".45"/>`
  }[c.bottom] : '';
  add(bot);
  // ---------- tenues une pièce
  if (c.outfit === 'slip' || c.outfit === 'midi') { const hem = c.outfit === 'midi' ? yK + 36 : yK + 10, fill = c.outfit === 'midi' ? `url(#${u}fl)` : OC;
    add(`<path d="M${100 - sh + 8} ${yS + 18} C${100 - wa - 2} ${yS + 36} ${100 - wa - 2} ${yW - 10} ${100 - wa} ${yW} C${100 - hp - 6} ${yH + 20} ${100 - hp - 16} ${hem - 30} ${100 - hp - 20} ${hem} Q100 ${hem + 8} ${100 + hp + 20} ${hem} C${100 + hp + 16} ${hem - 30} ${100 + hp + 6} ${yH + 20} ${100 + wa} ${yW} C${100 + wa + 2} ${yW - 10} ${100 + wa + 2} ${yS + 36} ${100 + sh - 8} ${yS + 18} Q100 ${yS + 30} ${100 - sh + 8} ${yS + 18} Z" fill="${fill}"/>`
      + `<path d="M${100 - sh + 9} ${yS + 18} L${100 - sh + 12} ${yS} M${100 + sh - 9} ${yS + 18} L${100 + sh - 12} ${yS}" stroke="${shd(oc, -.3)}" stroke-width="1.6"/>`
      + (c.outfit === 'slip' ? `<path d="M100 ${yW + 10} Q${100 + 6} ${yK - 20} ${100 + 16} ${hem - 2}" stroke="${shd(oc, .25)}" stroke-width="2" fill="none" opacity=".6"/><path d="M${100 + 8} ${yH + 34} L${100 + 22} ${hem}" stroke="${skD}" stroke-width="0" />` : ''));
  }
  if (c.outfit === 'jumpsuit' || c.outfit === 'overalls' || c.outfit === 'suit') { const col = c.outfit === 'suit' ? OC : OC; add(`<path d="${pant(0, 0, c.outfit === 'jumpsuit' ? 18 : 14, c.outfit === 'jumpsuit' ? 20 : 13, yA + 3)}" fill="${col}"/>`); }
  // ---------- haut
  const top0 = (cut, len, cls) => `M${100 - sh - 1} ${yS + 2} C${100 - sh + 4} ${yS - 6} ${100 - 12} ${yS - 6} ${100 - 9} ${yS - 4} Q100 ${yS + cut} ${100 + 9} ${yS - 4} C${100 + 12} ${yS - 6} ${100 + sh - 4} ${yS - 6} ${100 + sh + 1} ${yS + 2} C${100 + sh} ${yS + 40} ${100 + wa + 2 + cls} ${len - 20} ${100 + wa + 3 + cls} ${len} Q100 ${len + 5} ${100 - wa - 3 - cls} ${len} C${100 - wa - 2 - cls} ${len - 20} ${100 - sh} ${yS + 40} ${100 - sh - 1} ${yS + 2} Z`;
  const sleeve = (len, w, col) => [-1, 1].map(s => `<path d="M${100 + s * (sh - 2)} ${yS} C${100 + s * (sh + 10)} ${yS + 4} ${100 + s * (sh + 12 + w)} ${yS + 22} ${100 + s * (sh + 10 + w)} ${yS + len} L${100 + s * (sh - 2)} ${yS + len + 4} Z" fill="${col}"/>`).join('');
  const T = !out || c.outfit === 'overalls' ? {
    tee: `<path d="${top0(10, yH + 4, 6)}" fill="${TP}"/>${sleeve(36, 2, TP)}<path d="M${100 - 7} ${yS - 3} Q100 ${yS + 9} ${100 + 7} ${yS - 3}" stroke="${tcD}" stroke-width="1.4" fill="none"/>`,
    oversize: `<path d="${top0(11, yH + 14, 12)}" fill="${TP}"/>${sleeve(46, 8, TP)}<path d="M${100 - 7} ${yS - 3} Q100 ${yS + 9} ${100 + 7} ${yS - 3}" stroke="${tcD}" stroke-width="1.4" fill="none"/><path d="M${100 - 16} ${yS + 40} q4 30 -2 60 M${100 + 18} ${yS + 46} q-4 30 2 54" stroke="${tcD}" stroke-width="1" fill="none" opacity=".35"/>`,
    crop: `<path d="${top0(9, yW - 22, 0)}" fill="${TP}"/>${sleeve(24, 0, TP)}`,
    bandeau: `<path d="M${100 - sh + 6} ${yS + 18} Q100 ${yS + 12} ${100 + sh - 6} ${yS + 18} L${100 + wa + 6} ${yS + 46} Q100 ${yS + 52} ${100 - wa - 6} ${yS + 46} Z" fill="${TP}"/><path d="M${100 - sh + 8} ${yS + 26} Q100 ${yS + 20} ${100 + sh - 8} ${yS + 26}" stroke="${tcD}" stroke-width="1" fill="none" opacity=".4"/>`,
    tank: `<path d="M${100 - sh + 9} ${yS - 2} L${100 - 13} ${yS - 2} Q100 ${yS + 14} ${100 + 13} ${yS - 2} L${100 + sh - 9} ${yS - 2} C${100 + sh - 2} ${yS + 26} ${100 + wa + 4} ${yW - 10} ${100 + wa + 4} ${F ? yW - 8 : yH + 4} Q100 ${(F ? yW - 4 : yH + 9)} ${100 - wa - 4} ${F ? yW - 8 : yH + 4} C${100 - wa - 4} ${yW - 10} ${100 - sh + 2} ${yS + 26} ${100 - sh + 9} ${yS - 2} Z" fill="${TP}"/>`,
    shirt: `<path d="${top0(16, yH + 6, 6)}" fill="${TP}"/>${sleeve(84, 0, TP)}<path d="M100 ${yS + 8} V${yH + 6}" stroke="${tcD}" stroke-width="1.2"/>${[0, 1, 2, 3].map(i => `<circle cx="102.5" cy="${yS + 22 + i * 22}" r="1.5" fill="${tcD}"/>`).join('')}<path d="M${100 - 11} ${yS - 5} L100 ${yS + 10} L${100 + 11} ${yS - 5} L${100 + 6} ${yS + 4} L100 ${yS + 4} L${100 - 6} ${yS + 4} Z" fill="${shd(tc, .12)}"/>`,
    openshirt: `<path d="M${100 - wa - 8} ${yW - 18} L${100 + wa + 8} ${yW - 18} L${100 + (F ? wa + 4 : hp + 2)} ${F ? yW + 4 : yH + 6} Q100 ${F ? yW + 8 : yH + 10} ${100 - (F ? wa + 4 : hp + 2)} ${F ? yW + 4 : yH + 6} Z" fill="${F ? '#1C1C21' : '#F4F1EA'}"/><path d="M${100 - sh + 6} ${yS + 18} Q100 ${yS + 8} ${100 + sh - 6} ${yS + 18} L${100 + wa + 6} ${yW - 16} L${100 - wa - 6} ${yW - 16} Z" fill="${F ? '#1C1C21' : '#F4F1EA'}"/>${[-1, 1].map(s => `<path d="M${100 + s * (sh + 1)} ${yS + 2} C${100 + s * (sh + 2)} ${yS + 50} ${100 + s * (wa + 12)} ${yH - 10} ${100 + s * (wa + 14)} ${yH + 18} L${100 + s * 14} ${yH + 20} C${100 + s * 18} ${yW} ${100 + s * 12} ${yS + 40} ${100 + s * 10} ${yS - 4} C${100 + s * 18} ${yS - 6} ${100 + s * (sh - 4)} ${yS - 6} ${100 + s * (sh + 1)} ${yS + 2} Z" fill="${TP}"/>`).join('')}${sleeve(54, 4, TP)}<path d="M${100 - 10} ${yS - 4} L${100 - 4} ${yS + 26} M${100 + 10} ${yS - 4} L${100 + 4} ${yS + 26}" stroke="${tcD}" stroke-width="1.2"/>`,
    blouse: `<path d="${top0(14, yW + 4, 4)}" fill="${TP}"/>${sleeve(44, 10, TP)}<path d="M${100 - 18} ${yS + 4} Q100 ${yS + 16} ${100 + 18} ${yS + 4}" stroke="${shd(tc, .25)}" stroke-width="3" fill="none"/>`,
    polo: `<path d="${top0(6, yH + 6, 6)}" fill="${TP}"/>${sleeve(34, 2, TP)}<path d="M${100 - 12} ${yS - 6} L${100 - 2} ${yS + 6} L${100 + 2} ${yS + 6} L${100 + 12} ${yS - 6} L${100 + 6} ${yS + 2} L${100 - 6} ${yS + 2} Z" fill="${shd(tc, .14)}"/><path d="M100 ${yS + 6} V${yS + 24}" stroke="${tcD}" stroke-width="1.2"/>`,
    hoodie: `<path d="${top0(12, yH + 10, 10)}" fill="${TP}"/>${sleeve(90, 6, TP)}<path d="M${100 - 20} ${yS - 6} Q100 ${yS + 18} ${100 + 20} ${yS - 6} Q${100 + 16} ${yS + 26} 100 ${yS + 26} Q${100 - 16} ${yS + 26} ${100 - 20} ${yS - 6} Z" fill="${tcD}" opacity=".5"/><rect x="${100 - 22}" y="${yW - 10}" width="44" height="24" rx="8" fill="${tcD}" opacity=".35"/><path d="M${100 - 5} ${yS + 18} V${yS + 44} M${100 + 5} ${yS + 18} V${yS + 44}" stroke="${shd(tc, .3)}" stroke-width="1.6"/>`,
    jacket: `<path d="M${100 - wa - 4} ${yW - 30} L${100 + wa + 4} ${yW - 30} L${100 + wa + 2} ${yH + 2} L${100 - wa - 2} ${yH + 2} Z" fill="#F4F1EA"/><path d="M${100 - sh + 6} ${yS + 16} Q100 ${yS + 8} ${100 + sh - 6} ${yS + 16} L${100 + wa + 4} ${yW - 28} L${100 - wa - 4} ${yW - 28} Z" fill="#F4F1EA"/>${[-1, 1].map(s => `<path d="M${100 + s * (sh + 3)} ${yS} C${100 + s * (sh + 4)} ${yS + 50} ${100 + s * (wa + 10)} ${yH - 20} ${100 + s * (wa + 10)} ${F ? yW + 2 : yH + 8} L${100 + s * 12} ${F ? yW + 4 : yH + 10} C${100 + s * 14} ${yW - 20} ${100 + s * 12} ${yS + 30} ${100 + s * 10} ${yS - 4} Z" fill="${TP}"/>`).join('')}${sleeve(90, 5, TP)}<path d="M${100 - 10} ${yS - 4} L${100 - 20} ${yS + 22} L${100 - 12} ${yS + 26} M${100 + 10} ${yS - 4} L${100 + 20} ${yS + 22} L${100 + 12} ${yS + 26}" stroke="${tcD}" stroke-width="1.6" fill="none"/>`
  }[c.top] : '';
  if (c.outfit === 'suit') add(`<path d="${top0(22, yH + 12, 8)}" fill="${OC}"/>${sleeve(92, 2, OC)}<path d="M${100 - 9} ${yS - 4} L100 ${yS + 40} L${100 + 9} ${yS - 4}" fill="#F4F1EA"/><path d="M${100 - 10} ${yS - 4} L${100 - 2} ${yS + 44} L${100 - 18} ${yS + 22} Z M${100 + 10} ${yS - 4} L${100 + 2} ${yS + 44} L${100 + 18} ${yS + 22} Z" fill="${shd(oc, -.25)}"/>`);
  if (c.outfit === 'jumpsuit') add(`<path d="${top0(16, yH + 10, 4)}" fill="${OC}"/>${sleeve(26, 0, OC)}<rect x="${100 - wa - 4}" y="${yW - 4}" width="${2 * wa + 8}" height="8" rx="3" fill="${shd(oc, -.3)}"/>`);
  add(T);
  if (c.outfit === 'overalls') add(`<path d="M${100 - wa - 4} ${yS + 40} L${100 + wa + 4} ${yS + 40} L${100 + hp} ${yH + 4} L${100 - hp} ${yH + 4} Z" fill="${OC}"/><path d="M${100 - wa} ${yS + 42} L${100 - sh + 10} ${yS - 2} M${100 + wa} ${yS + 42} L${100 + sh - 10} ${yS - 2}" stroke="${shd(oc, -.2)}" stroke-width="6"/>`);
  // ---------- bras et mains
  const sl = { tee: 36, oversize: 46, crop: 24, shirt: 84, openshirt: 54, blouse: 44, polo: 34, hoodie: 90, jacket: 90, tank: 0, bandeau: 0 }[c.top] ?? 0;
  const armOf = (s, mode) => { const x0 = 100 + s * (sh - 2), xe = 100 + s * (sh + 7), xw = 100 + s * (sh + 2 + (F ? 0 : 2)), aw = F ? 6 : 7.5;
    if (mode === 'hip') { const ex = 100 + s * (sh + 22), ey = yS + 58, hx = 100 + s * (wa + 6), hy = yW + 2; return { path: `<path d="M${x0 - s * 4} ${yS + 2} C${x0 + s * 10} ${yS} ${ex + s * 4} ${ey - 30} ${ex + s * 3} ${ey} L${ex - s * 9} ${ey + 4} C${ex - s * 10} ${ey - 20} ${x0 + s * 2} ${yS + 26} ${x0 - s * 4} ${yS + 2} Z" fill="${SK}"/><path d="M${ex + s * 3} ${ey - 2} C${ex} ${ey + 12} ${hx + s * 10} ${hy - 8} ${hx + s * 2} ${hy - 4} L${hx + s * 4} ${hy + 8} C${hx + s * 14} ${hy + 2} ${ex - s * 6} ${ey + 16} ${ex - s * 9} ${ey + 4} Z" fill="${SK}"/><ellipse cx="${hx + s * 2}" cy="${hy + 2}" rx="${aw}" ry="${aw * .9}" fill="${SK}"/>`, wrist: [hx + s * 6, hy - 2], up: 58 }; }
    if (mode === 'wave') { const ex = 100 + s * (sh + 26), ey = yS + 34, hx = 100 + s * (sh + 30), hy = yS - 30; return { path: `<path d="M${x0 - s * 4} ${yS + 4} C${x0 + s * 10} ${yS - 2} ${ex} ${ey - 12} ${ex + s * 4} ${ey} L${ex - s * 8} ${ey + 6} C${ex - s * 12} ${ey - 4} ${x0 + s * 2} ${yS + 22} ${x0 - s * 4} ${yS + 4} Z" fill="${SK}"/><path d="M${ex + s * 5} ${ey + 4} C${ex + s * 9} ${ey - 20} ${hx + s * 7} ${hy + 20} ${hx + s * 6} ${hy + 6} L${hx - s * 7} ${hy + 6} C${hx - s * 8} ${hy + 22} ${ex - s * 6} ${ey - 14} ${ex - s * 10} ${ey + 8} Z" fill="${SK}"/><path d="M${hx - s * 7} ${hy + 8} C${hx - s * 9} ${hy - 6} ${hx - s * 6} ${hy - 14} ${hx} ${hy - 13} C${hx + s * 7} ${hy - 13} ${hx + s * 9} ${hy - 4} ${hx + s * 6} ${hy + 8} Z" fill="${SK}"/>${[-6, -2, 2, 6].map(d => `<path d="M${hx + d * s} ${hy - 10} v-7" stroke="${SK}" stroke-width="3.2" stroke-linecap="round"/>`).join('')}`, wrist: [hx, hy + 8], up: 40 }; }
    const pk = mode === 'pocket'; const hx = 100 + s * (pk ? hp - 4 : sh + 3), hy = pk ? yH + 16 : yS + 122;
    return { path: `<path d="M${x0 - s * 4} ${yS + 2} C${x0 + s * 8} ${yS} ${xe + s * 5} ${yS + 30} ${xe + s * 2} ${yS + 62} C${xe + s} ${yS + 84} ${hx + s * 6} ${hy - 22} ${hx + s * 5} ${hy - 8} L${hx - s * 6} ${hy - 8} C${hx - s * 6} ${hy - 26} ${xe - s * 10} ${yS + 80} ${xe - s * 11} ${yS + 60} C${xe - s * 12} ${yS + 40} ${x0 - s * 2} ${yS + 24} ${x0 - s * 4} ${yS + 2} Z" fill="${SK}"/>` + (pk ? `<path d="M${hx - s * 7} ${hy - 8} Q${hx} ${hy - 3} ${hx + s * 6} ${hy - 9}" stroke="${shd(bc, -.35)}" stroke-width="1.6" fill="none"/>` : `<path d="M${hx - aw * .8} ${hy - 9} C${hx - aw} ${hy + 2} ${hx - aw * .6} ${hy + 10} ${hx} ${hy + 10} C${hx + aw * .7} ${hy + 10} ${hx + aw * .9} ${hy + 2} ${hx + aw * .8} ${hy - 9} Z" fill="${SK}"/><path d="M${hx - s * aw * .7} ${hy - 6} q${-s * 3} 4 ${-s * 1} 8" stroke="${skD}" stroke-width="1" fill="none" opacity=".5"/><path d="M${hx - s * 3} ${hy + 4} q${s * 3} 5 ${s * 6} 2" stroke="${skD}" stroke-width=".9" fill="none" opacity=".6"/>`), wrist: [hx, hy - 10], up: 0 }; };
  const pose = c.pose || 'pocket', modes = { pocket: ['pocket', 'relax'], hip: ['hip', 'relax'], relax: ['relax', 'relax'], wave: ['relax', 'wave'] }[pose] || ['relax', 'relax'];
  const armL = armOf(-1, modes[0]), armR = armOf(1, modes[1]); const armBase = armL.path + armR.path;
  S.splice(S.length - (T ? 1 : 0), 0, armBase);
  if (c.outfit === 'suit' || (out && c.outfit !== 'overalls' && c.outfit !== 'jumpsuit')) {}
  // manches longues par-dessus les bras
  if (sl >= 80 || c.outfit === 'suit') { const col = c.outfit === 'suit' ? OC : TP; add([armL, armR].map((a, i) => a.path.replace(/<ellipse[^>]*>|<path d="M[^"]*" stroke[^>]*>/g, '').replace(/fill="url\(#[a-z0-9]+sk\)"/g, `fill="${col}"`)).join('')); }
  // ---------- chaussures
  const shoe = s => { const x = 100 + s * 7.5 + s * 0; return {
    sneakers: `<path d="M${x - 11} ${yF} C${x - 12} ${yA + 2} ${x - 6} ${yA - 4} ${x} ${yA - 4} C${x + 6} ${yA - 4} ${x + 12} ${yA + 2} ${x + s * 4 + 10} ${yF} Z" fill="url(#${u}sh)"/><rect x="${x - 12}" y="${yF - 4}" width="${24 + 4}" height="5" rx="2.5" fill="#FFFFFF" transform="translate(${s < 0 ? -4 : 0} 0)"/><path d="M${x - 5} ${yA} l8 -1 M${x - 6} ${yA + 3} l9 -1" stroke="${shd(sc, -.35)}" stroke-width="1"/>`,
    canvas: `<path d="M${x - 10} ${yF} L${x - 9} ${yA - 12} Q${x} ${yA - 16} ${x + 9} ${yA - 12} L${x + s * 4 + 10} ${yF} Z" fill="url(#${u}sh)"/><rect x="${x - 11}" y="${yF - 4}" width="24" height="5" rx="2" fill="#F4F1EA" transform="translate(${s < 0 ? -4 : 0} 0)"/><circle cx="${x + s * 8}" cy="${yA - 6}" r="2.4" fill="#F4F1EA"/>`,
    chunky: `<path d="M${x - 12} ${yF - 2} C${x - 13} ${yA} ${x - 6} ${yA - 6} ${x} ${yA - 6} C${x + 7} ${yA - 6} ${x + 13} ${yA} ${x + s * 4 + 12} ${yF - 2} Z" fill="url(#${u}sh)"/><rect x="${x - 13}" y="${yF - 6}" width="30" height="9" rx="4" fill="#FFFFFF" transform="translate(${s < 0 ? -4 : 0} 0)"/>`,
    sandals: `<path d="M${x - 9} ${yF} L${x + s * 3 + 10} ${yF} L${x + s * 2 + 9} ${yF - 3} L${x - 8} ${yF - 3} Z" fill="${shd(sc, -.2)}"/><path d="M${x - 6} ${yF - 3} L${x + 3} ${yA - 2} M${x + 6} ${yF - 3} L${x - 2} ${yA - 2} M${x - 7} ${yA - 8} Q${x} ${yA - 12} ${x + 7} ${yA - 8}" stroke="${sc}" stroke-width="2" fill="none"/>`,
    boots: `<path d="M${x - 10} ${yF} L${x - 10} ${yA - 26} L${x + 9} ${yA - 26} L${x + 9} ${yA - 4} C${x + 12} ${yA} ${x + s * 4 + 12} ${yF - 4} ${x + s * 4 + 12} ${yF} Z" fill="url(#${u}sh)"/><rect x="${x - 11}" y="${yF - 4}" width="26" height="5" rx="2" fill="${shd(sc, -.4)}" transform="translate(${s < 0 ? -4 : 0} 0)"/>`,
    loafers: `<path d="M${x - 10} ${yF} C${x - 10} ${yA + 2} ${x - 4} ${yA - 1} ${x} ${yA - 1} C${x + 6} ${yA - 1} ${x + 11} ${yA + 3} ${x + s * 4 + 10} ${yF} Z" fill="url(#${u}sh)"/><path d="M${x - 4} ${yA + 2} h8" stroke="${shd(sc, .3)}" stroke-width="1.6"/>`
  }[c.shoes]; };
  const longHem = (['cargo', 'flare', 'maxi'].includes(c.bottom) && !dress) || c.outfit === 'jumpsuit';
  add([-1, 1].map(s => { const x = 100 + s * 7.5 + (s > 0 ? 5 : 0); return `<g transform="translate(${x} ${yF}) scale(1.28) translate(${-x} ${-yF})">${shoe(s).replace(/(<[^>]+?)(?=\/>)/g, '$1')}</g>`; }).join(''));
  if (longHem) add(`<path d="${c.bottom === 'maxi' && !out ? '' : ''}" />`);
  // ---------- cou et tête
  add(`<path d="M${100 - 9} ${yS - 26} L${100 - 10} ${yS - 2} Q100 ${yS + 6} ${100 + 10} ${yS - 2} L${100 + 9} ${yS - 26} Z" fill="${SK}"/><path d="M${100 - 9} ${yS - 20} Q100 ${yS - 12} ${100 + 9} ${yS - 20} L${100 + 9} ${yS - 24} L${100 - 9} ${yS - 24} Z" fill="${skD}" opacity=".45"/>`);
  if (c.top === 'hoodie' && !out) add('');
  const headStart = S.length;
  // oreilles
  add(`<ellipse cx="73" cy="76" rx="5" ry="7.5" fill="${SK}"/><ellipse cx="127" cy="76" rx="5" ry="7.5" fill="${SK}"/><path d="M72 73 q2 3 0 7 M128 73 q-2 3 0 7" stroke="${skD}" stroke-width="1" fill="none" opacity=".6"/>`);
  // visage
  const jaw = F ? `M74 64 C74 40 86 31 100 31 C114 31 126 40 126 64 C126 82 121 92 113 99 C108 103 104 105 100 105 C96 105 92 103 87 99 C79 92 74 82 74 64 Z` : `M73 63 C73 39 86 30 100 30 C114 30 127 39 127 63 C127 83 123 94 115 101 C110 105 105 107 100 107 C95 107 90 105 85 101 C77 94 73 83 73 63 Z`;
  add(`<path d="${jaw}" fill="url(#${u}fc)"/>`);
  if (c.hat === 'none' || c.hat === undefined) {}
  // yeux
  const eye = (x, s) => { const w = F ? 8 : 7.4, h = F ? 7.4 : 6.8; const st = c.eyes;
    if (st === 'wink' && s > 0 || st === 'smile') return `<path d="M${x - w} ${77} Q${x} ${70} ${x + w} ${77}" stroke="#2B1A12" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    const lid = st === 'soft' ? 1.6 : 0;
    return `<path d="M${x - w} 76.4 Q${x} ${68.6} ${x + w} 76.4 Q${x} ${83.6} ${x - w} 76.4 Z" fill="#FFFFFF"/><clipPath id="${u}e${s}"><path d="M${x - w} 76.4 Q${x} ${68.6} ${x + w} 76.4 Q${x} ${83.6} ${x - w} 76.4 Z"/></clipPath><g clip-path="url(#${u}e${s})"><circle cx="${x + s * .3}" cy="77" r="${h - .2}" fill="url(#${u}ir)"/><circle cx="${x + s * .3}" cy="77" r="${(h - .2) * .44}" fill="#120B08"/><path d="M${x - w} 72 Q${x} 69 ${x + w} 72 L${x + w} 75 Q${x} 72.6 ${x - w} 75 Z" fill="#000" opacity=".18"/></g><circle cx="${x - 1.6 + s * .4}" cy="74.6" r="1.7" fill="#FFFFFF"/><circle cx="${x + 1.7 + s * .4}" cy="78.6" r=".8" fill="#FFFFFF" opacity=".85"/>`
      + (lid ? `<path d="M${x - w} 76 Q${x} ${69.4} ${x + w} 76 L${x + w} ${72} L${x - w} ${72} Z" fill="${skD}"/>` : '')
      + `<path d="M${x - w - .4} ${76.6} Q${x} ${68 + lid} ${x + w + .4} ${76.2}" stroke="#24160F" stroke-width="${F ? 2.6 : 2.2}" fill="none" stroke-linecap="round"/>`
      + (F ? `<path d="M${x + s * (w + .2)} ${75.4} q${s * 2.4} -1 ${s * 3.4} -3.2" stroke="#24160F" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : '') + `<path d="M${x - w + 1.4} ${80.6} Q${x} ${83.4} ${x + w - 1.4} ${80.6}" stroke="${shd(sk, -.12)}" stroke-width=".9" fill="none" opacity=".55"/>`; };
  add(eye(88, -1) + eye(112, 1));
  // sourcils
  const bw = F ? 1 : 1.6;
  add(`<path d="M80 ${64} Q88 ${59.5} ${95} ${63.5} L${95} ${63.5 + bw + 1.4} Q88 ${61.5 + bw} 80.5 ${66 + bw * .4} Z" fill="${shd(hc, -.15)}"/><path d="M120 ${64} Q112 ${59.5} ${105} ${63.5} L${105} ${63.5 + bw + 1.4} Q112 ${61.5 + bw} 119.5 ${66 + bw * .4} Z" fill="${shd(hc, -.15)}"/>`);
  // nez, joues, bouche
  add(`<path d="M99 81 Q97 88 98.6 90.4 Q100.6 91.6 103 90.2" stroke="${skD}" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="84" cy="88" rx="8" ry="5" fill="url(#${u}bl)"/><ellipse cx="116" cy="88" rx="8" ry="5" fill="url(#${u}bl)"/>`);
  const lip = F ? '#C25F6A' : shd(sk, -.32);
  add({ smile: `<path d="M92 96 Q100 102.5 108 96" stroke="${lip}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`, grin: `<path d="M91 95.5 Q100 106 109 95.5 Q100 99 91 95.5 Z" fill="#FFFFFF" stroke="${lip}" stroke-width="1.8" stroke-linejoin="round"/>`, smirk: `<path d="M93 98 Q101 100.5 108 95" stroke="${lip}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`, calm: `<path d="M94 98 Q100 100 106 98" stroke="${lip}" stroke-width="2.3" fill="none" stroke-linecap="round"/>` }[c.mouth]);
  // barbe
  const bd = shd(hc, -.1);
  add({ none: '', stubble: `<path d="M77 82 C78 96 88 106 100 107 C112 106 122 96 123 82 C118 94 110 100 100 100 C90 100 82 94 77 82 Z" fill="${bd}" opacity=".28"/>`, short: `<path d="M76 80 C76 98 88 109 100 110 C112 109 124 98 124 80 C119 93 112 99 104 100 L96 100 C88 99 81 93 76 80 Z" fill="${bd}" opacity=".9"/><path d="M92 93.5 Q100 91 108 93.5" stroke="${bd}" stroke-width="3" fill="none"/>`, mustache: `<path d="M90 94 Q100 89.5 110 94 Q104 92.6 100 93.8 Q96 92.6 90 94 Z" fill="${bd}"/>`, goatee: `<path d="M91 94 Q100 90 109 94 M95 101 Q100 108 105 101 Z" stroke="${bd}" stroke-width="3" fill="${bd}"/>` }[c.beard] || '');
  // ---------- cheveux (avant)
  const hf = {
    long: `<path d="M71 70 C66 40 84 26 102 27 C122 28 134 42 129 72 C124 54 116 44 104 41 C96 48 84 56 71 70 Z" fill="${HR}"/>`,
    waves: `<path d="M70 72 C64 38 84 25 102 26 C124 27 136 42 130 74 C126 58 118 46 106 42 C94 50 82 58 70 72 Z" fill="${HR}"/><path d="M84 36 Q96 32 108 36" stroke="${hcL}" stroke-width="2" fill="none" opacity=".5"/>`,
    curls: `<path d="M70 72 C62 36 86 22 102 24 C124 26 138 40 130 74 C126 56 116 44 104 42 C92 52 82 60 70 72 Z" fill="${HR}"/>${[76, 86, 98, 110, 122].map((x, i) => `<circle cx="${x}" cy="${36 + (i % 2) * 4}" r="8" fill="${i % 2 ? hc : hcD}"/>`).join('')}`,
    braids: `<path d="M72 68 C68 36 86 26 100 26 C114 26 132 36 128 68 C120 50 110 42 100 42 C90 42 80 50 72 68 Z" fill="${HR}"/><path d="M100 27 V42" stroke="${shd(sk, -.1)}" stroke-width="1.4"/>${[-1, 1].map(s => [0, 1, 2].map(i => `<path d="M${100 + s * (4 + i * 7)} 30 Q${100 + s * (7 + i * 8)} 40 ${100 + s * (10 + i * 8)} 50" stroke="${hcD}" stroke-width="1.2" fill="none" opacity=".6"/>`).join('')).join('')}`,
    bun: `<circle cx="100" cy="22" r="14" fill="${HR}"/><path d="M72 70 C68 38 86 28 100 28 C114 28 132 38 128 70 C122 50 112 42 100 42 C88 42 78 50 72 70 Z" fill="${HR}"/>`,
    ponytail: `<path d="M72 70 C68 38 86 28 100 28 C114 28 132 38 128 70 C122 50 112 42 100 42 C88 42 78 50 72 70 Z" fill="${HR}"/><ellipse cx="118" cy="42" rx="5" ry="4" fill="${shd(hc, -.4)}"/>`,
    bob: `<path d="M70 76 C62 38 86 26 102 27 C124 28 138 44 130 78 C126 58 116 46 104 43 C92 46 76 56 70 76 Z" fill="${HR}"/>`,
    pixie: `<path d="M72 66 C68 38 86 26 102 27 C122 28 132 40 128 64 C122 50 112 44 100 46 C92 47 84 52 80 60 C78 56 76 60 72 66 Z" fill="${HR}"/>`,
    afro: `<path d="M74 60 C76 46 88 40 100 40 C112 40 124 46 126 60 C118 52 110 50 100 50 C90 50 82 52 74 60 Z" fill="${HR}"/>`,
    crop: `<path d="M72 64 C70 38 86 27 101 27 C118 27 131 38 128 64 C124 50 116 44 106 44 L92 44 C84 45 76 52 72 64 Z" fill="${HR}"/><path d="M80 40 Q92 34 106 36" stroke="${hcL}" stroke-width="1.6" fill="none" opacity=".45"/>`,
    messy: `<path d="M71 66 C66 36 86 22 102 24 C122 25 134 38 129 66 C126 54 120 48 112 46 C114 52 110 56 104 52 C102 58 94 56 92 50 C88 56 80 56 78 50 C76 56 74 60 71 66 Z" fill="${HR}"/>${[[82, 30], [96, 24], [112, 28]].map(([x, y]) => `<path d="M${x} ${y} q8 -8 14 2" stroke="${hcD}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}`,
    curlytop: `<path d="M72 66 C70 42 84 32 100 32 C116 32 130 42 128 66 C124 56 118 50 110 48 L90 48 C82 50 76 56 72 66 Z" fill="${HR}"/>${Array.from({ length: 9 }, (_, i) => `<circle cx="${78 + i * 5.5}" cy="${34 - Math.sin(i / 8 * 3.14) * 8}" r="7" fill="${i % 2 ? hc : hcD}"/>`).join('')}`,
    wavy: `<path d="M70 74 C62 38 86 24 102 25 C124 26 138 40 130 74 C126 56 118 46 106 44 C100 52 90 50 86 46 C80 52 74 60 70 74 Z" fill="${HR}"/><path d="M86 34 Q100 28 114 34" stroke="${hcL}" stroke-width="2" fill="none" opacity=".45"/>`,
    buzz: `<path d="M73 62 C72 40 86 30 100 30 C114 30 128 40 127 62 C124 50 114 44 100 44 C86 44 76 50 73 62 Z" fill="${hc}" opacity=".9"/>`,
    twists: `<path d="M73 62 C72 40 86 30 100 30 C114 30 128 40 127 62 C122 50 112 44 100 44 C88 44 78 50 73 62 Z" fill="${HR}"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${78 + i * 6} ${46} q-2 -14 2 -18" stroke="${i % 2 ? hc : hcD}" stroke-width="5" stroke-linecap="round" fill="none"/>`).join('')}`,
    man_bun: `<circle cx="100" cy="24" r="10" fill="${HR}"/><path d="M73 62 C72 38 86 29 100 29 C114 29 128 38 127 62 C122 48 112 42 100 42 C88 42 78 48 73 62 Z" fill="${HR}"/><path d="M84 36 L96 30 M104 30 L116 36" stroke="${hcL}" stroke-width="1.4" opacity=".5"/>`,
    slick: `<path d="M72 62 C70 36 88 27 102 27 C120 27 131 38 128 62 C126 46 116 38 100 38 C88 38 78 46 72 62 Z" fill="${HR}"/><path d="M80 44 Q98 34 122 42 M82 50 Q100 40 124 48" stroke="${hcL}" stroke-width="1.4" fill="none" opacity=".45"/>`
  }[c.hair];
  add(hf);
  // ---------- lunettes, chapeau, bijoux
  const headEnd = () => S.length;
  const gl = { none: '', sun: `<path d="M78 70 h18 q2 0 1.6 2 l-1.4 7 q-1 4 -6 4 h-5 q-5 0 -6 -4 l-1.6 -7 q-.2 -2 1.4 -2 Z M104 70 h18 q1.6 0 1.4 2 l-1.6 7 q-1 4 -6 4 h-5 q-5 0 -6 -4 l-1.4 -7 q-.4 -2 1.6 -2 Z" fill="#1A1A22"/><path d="M96 72 h8" stroke="#1A1A22" stroke-width="2"/><path d="M82 72 l6 0" stroke="#FFFFFF" stroke-width="1.4" opacity=".5"/>`, round: `<circle cx="88" cy="76" r="9" fill="none" stroke="#3A2A22" stroke-width="1.8"/><circle cx="112" cy="76" r="9" fill="none" stroke="#3A2A22" stroke-width="1.8"/><path d="M97 75 q3 -2 6 0" stroke="#3A2A22" stroke-width="1.6" fill="none"/>`, clear: `<rect x="78" y="69" width="20" height="14" rx="4" fill="#FFFFFF" fill-opacity=".12" stroke="#B9A98F" stroke-width="1.4"/><rect x="102" y="69" width="20" height="14" rx="4" fill="#FFFFFF" fill-opacity=".12" stroke="#B9A98F" stroke-width="1.4"/><path d="M98 74 h4" stroke="#B9A98F" stroke-width="1.4"/>` }[c.glasses] || '';
  add(gl);
  const hcol = AV2.cloth[c.hatC] ?? AV2.cloth[1], hcolD = shd(hcol, -.22);
  add({ none: '', cap: `<path d="M71 60 C70 36 86 26 101 26 C117 26 131 36 130 60 Z" fill="${hcol}"/><path d="M70 58 Q100 50 132 58 Q140 62 146 66 Q120 62 100 62 Q84 62 70 64 Z" fill="${hcolD}"/><circle cx="101" cy="27" r="3" fill="${hcolD}"/>`, bucket: `<path d="M74 58 C74 34 86 28 100 28 C114 28 126 34 126 58 Z" fill="${hcol}"/><path d="M62 62 Q100 50 138 62 L134 68 Q100 58 66 68 Z" fill="${hcolD}"/>`, beanie: `<path d="M71 62 C68 32 86 22 100 22 C114 22 132 32 129 62 Z" fill="${hcol}"/><rect x="69" y="54" width="62" height="12" rx="6" fill="${hcolD}"/>` }[c.hat] || '');
  if (J.has('hoops')) add(`<circle cx="73" cy="88" r="4.2" fill="none" stroke="#E2B451" stroke-width="1.6"/><circle cx="127" cy="88" r="4.2" fill="none" stroke="#E2B451" stroke-width="1.6"/>`);
  { const hs = S.splice(headStart, headEnd() - headStart); S.splice(headStart, 0, `<g transform="translate(100 ${yS - 18}) scale(1.13) translate(-100 ${-(yS - 18)})">${hs.join('')}</g>`); }
  if (J.has('necklace')) add(`<path d="M${100 - 11} ${yS - 6} Q100 ${yS + 12} ${100 + 11} ${yS - 6}" stroke="#E2B451" stroke-width="1.3" fill="none"/><circle cx="100" cy="${yS + 5}" r="2" fill="#E2B451"/>`);
  if (J.has('bracelets') && modes[0] !== 'pocket') { const [xw, yw] = armL.wrist; add(['#E35D6A', '#E8C26A', '#4F9CD9', '#9DB497'].map((col, i) => `<rect x="${xw - 6.5}" y="${yw - 4 + i * 2.6}" width="13" height="2.4" rx="1.2" fill="${col}"/>`).join('')); }
  else if (J.has('bracelets')) { const [xw, yw] = armR.wrist; add(['#E35D6A', '#E8C26A', '#4F9CD9', '#9DB497'].map((col, i) => `<rect x="${xw - 6.5}" y="${yw - 4 + i * 2.6}" width="13" height="2.4" rx="1.2" fill="${col}"/>`).join('')); }
  if (J.has('watch')) { const [xw, yw] = armR.wrist; add(`<rect x="${xw - 6}" y="${yw - 4}" width="12" height="7" rx="2" fill="#2B2B33"/><rect x="${xw - 3}" y="${yw - 2.5}" width="6" height="4" rx="1" fill="#C9CED8"/>`); }
  const ped = opt.pedestal ? `<ellipse cx="100" cy="${yF + 6}" rx="70" ry="14" fill="#E792C6"/><ellipse cx="100" cy="${yF + 3}" rx="70" ry="13" fill="url(#${u}pd)"/>` : `<ellipse cx="100" cy="${yF + 1}" rx="34" ry="5" fill="#1B1430" opacity=".18"/>`;
  const vb = opt.view === 'head' ? '56 14 88 88' : opt.view === 'hair' ? '52 4 96 96' : opt.view === 'torso' ? '38 100 124 140' : opt.view === 'legs' ? '40 200 120 210' : opt.view === 'feet' ? '64 360 72 50' : opt.vb || `20 ${10 - (L > 0 ? L : 0)} 160 ${404 + (L > 0 ? L : 0)}`;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(opt.label || 'Avatar')}" style="${opt.style || ''}"><defs>${defs}</defs>${ped}${S.join('')}</svg>`;
}

const av2URI = (() => { const m = new Map(); return (cfg, view = 'full') => { const k = view + JSON.stringify(cfg); if (!m.has(k)) { if (m.size > 300) m.clear(); m.set(k, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatar2SVG(cfg, { view: view === 'full' ? undefined : view }))); } return m.get(k); }; })();
// amis : apparences inspirées des personnages de la marque
const FRIEND_AV2 = {
  lea: { g: 'f', skin: 1, hair: 'waves', hairC: 8, outfit: 'midi', outfitC: 13, shoes: 'sandals', shoesC: 2, jewel: ['bracelets', 'hoops'], pose: 'hip', eyes: 'wink' },
  ines: { g: 'f', skin: 7, hair: 'braids', hairC: 0, top: 'bandeau', topC: 0, bottom: 'cargo', bottomC: 10, shoes: 'sneakers', jewel: ['bracelets', 'hoops', 'necklace'], pose: 'hip' },
  tom: { g: 'm', skin: 2, hair: 'messy', hairC: 3, top: 'tee', topC: 0, bottom: 'bermuda', bottomC: 1, shoes: 'sneakers', jewel: ['bracelets'], pose: 'relax' },
  yanis: { g: 'm', skin: 4, hair: 'curlytop', hairC: 1, top: 'tee', topC: 1, bottom: 'jeans', bottomC: 1, shoes: 'canvas', shoesC: 1, build: 'athletique', jewel: ['necklace', 'watch'] },
  sami: { g: 'f', skin: 3, hair: 'curls', hairC: 3, top: 'bandeau', topC: 0, bottom: 'cargo', bottomC: 2, shoes: 'chunky', jewel: ['bracelets', 'necklace'], pose: 'relax' },
  maya: { g: 'f', skin: 2, hair: 'long', hairC: 4, top: 'openshirt', topC: 2, bottom: 'shorts', bottomC: 10, shoes: 'canvas', shoesC: 1, pose: 'hip' },
  chloe: { g: 'f', skin: 0, hair: 'bun', hairC: 3, outfit: 'slip', outfitC: 3, shoes: 'loafers', shoesC: 1, jewel: ['hoops'] },
  elsa: { g: 'f', skin: 5, hair: 'afro', hairC: 1, top: 'crop', topC: 7, bottom: 'flare', bottomC: 10, shoes: 'chunky' },
  nathan: { g: 'm', skin: 1, hair: 'crop', hairC: 6, outfit: 'suit', outfitC: 3, shoes: 'loafers', shoesC: 1, beard: 'short', glasses: 'clear' }
};
