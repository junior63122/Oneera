// ===== Moteur d'avatar ONEERA (rendu illustré SVG piloté par paramètres) =====
// Le même objet de paramètres pilotera le rendu 3D de l'app finale.
const AV = {
  skin: ['#FBD9C5', '#F4C3A3', '#EBAE86', '#D99A6C', '#C07F52', '#A0653D', '#82502E', '#653C22', '#4B2C19', '#F7CFB0'],
  hairC: ['#1F1A17', '#3B2A20', '#5C3B26', '#8A5A35', '#B7783F', '#D9A55B', '#E9CF8A', '#B2382A', '#E06A2F', '#9C9C9C', '#F0F0F0', '#E85CA8', '#5B6CF0', '#3BB58C'],
  eyeC: ['#3B2A20', '#6B4423', '#2F6E8E', '#4E8A4A', '#7A7A7A', '#1F1A17'],
  cloth: ['#FFFFFF', '#1F2230', '#B3202A', '#E3762B', '#E8C23A', '#9CC54A', '#2CB5C0', '#3B6FE0', '#7C4FD6', '#E85CA8', '#F4B6DD', '#BFD0F5', '#2F5D3A', '#8A6A4E', '#C9C2B8'],
  hair: [['bald', 'Rasé'], ['buzz', 'Très court'], ['short', 'Court'], ['spiky', 'Épis'], ['curly', 'Bouclé court'], ['afro', 'Afro'], ['bob', 'Carré'], ['long', 'Long lisse'], ['wavy', 'Long ondulé'], ['ponytail', 'Queue de cheval'], ['bun', 'Chignon'], ['buns', 'Deux chignons'], ['braids', 'Tresses'], ['mohawk', 'Crête']],
  eyes: [['round', 'Ronds'], ['almond', 'En amande'], ['lashes', 'Cils'], ['happy', 'Rieurs'], ['wink', 'Clin d’œil'], ['sleepy', 'Mi-clos']],
  brows: [['soft', 'Doux'], ['straight', 'Droits'], ['arched', 'Arqués'], ['thick', 'Épais']],
  mouth: [['smile', 'Sourire'], ['grin', 'Grand sourire'], ['laugh', 'Rire'], ['smirk', 'En coin'], ['neutral', 'Neutre'], ['o', 'Surpris'], ['tongue', 'Langue']],
  beard: [['none', 'Aucune'], ['stubble', 'Barbe de 3 jours'], ['mustache', 'Moustache'], ['goatee', 'Bouc'], ['beard', 'Barbe']],
  top: [['tee', 'Tee-shirt'], ['tank', 'Débardeur'], ['shirt', 'Chemise'], ['hawaii', 'Hawaïenne'], ['hoodie', 'Sweat à capuche'], ['crop', 'Crop top'], ['jacket', 'Veste ouverte'], ['blouse', 'Blouse']],
  bottom: [['jeans', 'Jean'], ['shorts', 'Short'], ['skirt', 'Jupe'], ['cargo', 'Cargo'], ['joggers', 'Jogging'], ['longskirt', 'Jupe longue']],
  outfit: [['none', 'Haut + bas'], ['dress', 'Robe courte'], ['longdress', 'Robe longue'], ['suit', 'Costume'], ['jumpsuit', 'Combinaison']],
  shoes: [['sneakers', 'Baskets'], ['boots', 'Bottes'], ['sandals', 'Sandales'], ['heels', 'Talons'], ['platforms', 'Plateformes']],
  glasses: [['none', 'Aucune'], ['round', 'Rondes'], ['square', 'Carrées'], ['sun', 'Solaires'], ['heart', 'Cœur'], ['star', 'Étoiles']],
  hat: [['none', 'Aucun'], ['cap', 'Casquette'], ['bucket', 'Bob'], ['beanie', 'Bonnet'], ['cowboy', 'Cowboy'], ['flowers', 'Couronne de fleurs'], ['headphones', 'Casque audio']],
  ears: [['none', 'Aucune'], ['studs', 'Puces'], ['hoops', 'Créoles']],
  neck: [['none', 'Aucun'], ['chain', 'Chaîne'], ['pearls', 'Perles']],
  extra: [['wristband', 'Bracelet du festival'], ['bag', 'Banane'], ['glitter', 'Paillettes'], ['blush', 'Joues roses'], ['freckles', 'Taches de rousseur']],
  build: [['m', 'Carrure large'], ['f', 'Silhouette fine']],
  pose: [['stand', 'Debout'], ['wave', 'Salut'], ['peace', 'Peace']]
};
const AV_DEFAULT = { build: 'm', skin: 2, hair: 'curly', hairC: 2, eyes: 'round', eyeC: 0, brows: 'soft', mouth: 'smile', beard: 'none', outfit: 'none', top: 'tee', topC: 0, bottom: 'jeans', bottomC: 7, shoes: 'sneakers', shoesC: 0, glasses: 'none', glassesC: 1, hat: 'none', hatC: 1, ears: 'none', neck: 'none', extra: ['wristband'], pose: 'stand' };
const avShade = (hex, a) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(a < 0 ? v * (1 + a) : v + (255 - v) * a))); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); };
let avUid = 0;

function avatarSVG(c0, opt = {}) {
  const c = { ...AV_DEFAULT, ...c0 }, id = 'a' + (++avUid), sk = AV.skin[c.skin], skD = avShade(sk, -.16), hc = AV.hairC[c.hairC], hcD = avShade(hc, -.25), hcL = avShade(hc, .18);
  const tc = AV.cloth[c.topC], tcD = avShade(tc, -.18), bc = AV.cloth[c.bottomC], bcD = avShade(bc, -.2), sc = AV.cloth[c.shoesC], f = c.build === 'f', ex = new Set(c.extra || []);
  const out = c.outfit !== 'none';
  const S = []; const add = s => S.push(s);
  // ---- calques arrière : cheveux longs, capuche
  const hairBack = {
    long: `<path d="M56 92 C52 150 60 205 66 222 L134 222 C140 205 148 150 144 92 Z" fill="${hcD}"/>`,
    wavy: `<path d="M56 92 C48 130 62 150 54 178 C62 200 58 214 70 226 L130 226 C142 214 138 200 146 178 C138 150 152 130 144 92 Z" fill="${hcD}"/>`,
    bob: `<path d="M54 92 C50 120 56 140 64 146 L136 146 C144 140 150 120 146 92 Z" fill="${hcD}"/>`,
    afro: `<circle cx="100" cy="84" r="66" fill="${hcD}"/>`,
    braids: [0, 1].map(s => { const x = s ? 138 : 62; return Array.from({ length: 8 }, (_, i) => `<ellipse cx="${x + (s ? 4 : -4) * Math.sin(i)}" cy="${120 + i * 15}" rx="9" ry="9.5" fill="${i % 2 ? hc : hcD}"/>`).join(''); }).join(''),
    ponytail: `<path d="M134 70 C176 72 172 150 150 196 C146 160 150 118 128 96 Z" fill="${hcD}"/>`,
    curly: '', short: '', spiky: '', buzz: '', bald: '', bun: '', buns: '', mohawk: ''
  }[c.hair] || '';
  add(hairBack);
  // ---- jambes (peau) puis bas
  const legW = 24, lx = 86, rx = 114, hipY = 238, ankY = 382;
  add(`<path d="M${lx} ${hipY} L${lx - 2} ${ankY}" stroke="${skD}" stroke-width="${legW}" stroke-linecap="round"/><path d="M${rx} ${hipY} L${rx + 2} ${ankY}" stroke="${skD}" stroke-width="${legW}" stroke-linecap="round"/>`);
  const pants = (y2, wide = 0, col = bc, colD = bcD) => `<path d="M${68 - wide} 232 L${71 - wide * 1.6} ${y2} L${97} ${y2} L100 252 L103 ${y2} L${129 + wide * 1.6} ${y2} L${132 + wide} 232 Z" fill="${col}"/><path d="M100 236 L100 ${Math.min(y2, 256)}" stroke="${colD}" stroke-width="2"/><rect x="68" y="228" width="64" height="9" rx="3" fill="${colD}"/>`;
  if (!out || c.outfit === 'suit' || c.outfit === 'jumpsuit') {
    const b = c.outfit === 'suit' ? 'suit' : c.outfit === 'jumpsuit' ? 'jump' : c.bottom;
    if (b === 'jeans') add(pants(380) + `<path d="M76 250 Q84 256 92 250" stroke="${avShade(bc, .3)}" stroke-width="2" fill="none"/><path d="M108 250 Q116 256 124 250" stroke="${avShade(bc, .3)}" stroke-width="2" fill="none"/>`);
    if (b === 'cargo') add(pants(380, 5) + `<rect x="64" y="292" width="17" height="22" rx="3" fill="${bcD}"/><rect x="119" y="292" width="17" height="22" rx="3" fill="${bcD}"/>`);
    if (b === 'joggers') add(pants(370) + `<rect x="72" y="364" width="27" height="12" rx="5" fill="${bcD}"/><rect x="101" y="364" width="27" height="12" rx="5" fill="${bcD}"/><path d="M70 240 L72 370 M130 240 L128 370" stroke="${avShade(bc, .45)}" stroke-width="3"/>`);
    if (b === 'shorts') add(pants(292, 2));
    if (b === 'skirt') add(`<path d="M68 230 L56 300 Q100 312 144 300 L132 230 Z" fill="${bc}"/><path d="M80 236 L72 302 M100 236 L100 306 M120 236 L128 302" stroke="${bcD}" stroke-width="1.6" opacity=".6"/>`);
    if (b === 'longskirt') add(`<path d="M68 230 L52 368 Q100 380 148 368 L132 230 Z" fill="${bc}"/><path d="M84 236 L74 370 M116 236 L126 370" stroke="${bcD}" stroke-width="1.6" opacity=".5"/>`);
    if (b === 'suit') add(pants(380, 0, '#2A2D3A', '#1C1F2A'));
    if (b === 'jump') add(pants(380, 1, tc, tcD));
  }
  if (c.outfit === 'dress') add(`<path d="M66 226 L52 312 Q100 324 148 312 L134 226 Z" fill="${tc}"/>`);
  if (c.outfit === 'longdress') add(`<path d="M66 226 L48 378 Q100 392 152 378 L134 226 Z" fill="${tc}"/><path d="M100 240 L104 380" stroke="${tcD}" stroke-width="1.5" opacity=".5"/>`);
  // ---- chaussures
  const shoe = x => ({
    sneakers: `<path d="M${x - 16} 396 Q${x - 16} 380 ${x} 378 Q${x + 18} 380 ${x + 20} 392 L${x + 20} 398 L${x - 16} 398 Z" fill="${sc}"/><rect x="${x - 17}" y="394" width="38" height="6" rx="3" fill="#F4F4F6"/><path d="M${x - 6} 384 L${x + 6} 384" stroke="${avShade(sc, -.35)}" stroke-width="2"/>`,
    boots: `<path d="M${x - 14} 354 L${x + 12} 354 L${x + 14} 388 Q${x + 22} 390 ${x + 22} 398 L${x - 15} 398 Z" fill="${avShade(sc, -.1)}"/><rect x="${x - 15}" y="394" width="37" height="6" rx="2" fill="${avShade(sc, -.45)}"/>`,
    sandals: `<path d="M${x - 14} 398 L${x + 20} 398" stroke="${avShade(sc, -.2)}" stroke-width="6" stroke-linecap="round"/><path d="M${x - 8} 392 L${x + 12} 386" stroke="${sc}" stroke-width="4" stroke-linecap="round"/><ellipse cx="${x + 2}" cy="390" rx="14" ry="7" fill="${skD}"/>`,
    heels: `<path d="M${x - 12} 392 Q${x} 378 ${x + 18} 390 L${x + 18} 396 L${x - 12} 396 Z" fill="${sc}"/><rect x="${x - 13}" y="394" width="5" height="9" fill="${avShade(sc, -.4)}"/>`,
    platforms: `<path d="M${x - 15} 388 Q${x} 376 ${x + 19} 386 L${x + 19} 392 L${x - 15} 392 Z" fill="${sc}"/><rect x="${x - 16}" y="390" width="37" height="11" rx="3" fill="${avShade(sc, -.3)}"/>`
  }[c.shoes]);
  add(shoe(82) + shoe(118));
  // ---- bras (pose)
  const sh = f ? [64, 136] : [58, 142];
  const arms = { stand: [[sh[0], 160, sh[0] - 10, 250], [sh[1], 160, sh[1] + 10, 250]], wave: [[sh[0], 160, sh[0] - 10, 250], [sh[1], 160, sh[1] + 34, 96]], peace: [[sh[0], 160, sh[0] - 26, 104], [sh[1], 160, sh[1] + 10, 250]] }[c.pose];
  const sleeve = { tee: .38, shirt: .38, hawaii: .38, blouse: .42, tank: 0, crop: .3, hoodie: .95, jacket: .92 }[out ? (c.outfit === 'suit' ? 'jacket' : c.outfit === 'jumpsuit' ? 'tee' : 'tank') : c.top];
  arms.forEach(([x1, y1, x2, y2], i) => {
    add(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${sk}" stroke-width="${f ? 19 : 22}" stroke-linecap="round"/>`);
    if (sleeve) { const xs = x1 + (x2 - x1) * sleeve, ys = y1 + (y2 - y1) * sleeve; const col = c.outfit === 'suit' ? '#2A2D3A' : c.top === 'jacket' && !out ? avShade(tc, -.3) : tc; add(`<path d="M${x1} ${y1} L${xs} ${ys}" stroke="${col}" stroke-width="${f ? 24 : 27}" stroke-linecap="round"/>`); }
    add(`<circle cx="${x2}" cy="${y2}" r="${f ? 10 : 11}" fill="${sk}"/>`);
    if ((c.pose === 'peace' && i === 0) || (c.pose === 'wave' && i === 1)) add(`<path d="M${x2 - 4} ${y2 - 6} L${x2 - 7} ${y2 - 22} M${x2 + 3} ${y2 - 7} L${x2 + 6} ${y2 - 22}" stroke="${sk}" stroke-width="5.5" stroke-linecap="round"/>`);
  });
  if (ex.has('wristband')) { const a = arms[1]; add(`<rect x="${a[2] - 10}" y="${a[3] - 22}" width="20" height="7" rx="3" fill="#E85CA8" transform="rotate(${Math.atan2(a[3] - a[1], a[2] - a[0]) * 57.3 - 90} ${a[2]} ${a[3] - 18})"/>`); }
  // ---- buste
  const torso = f ? 'M66 152 Q100 144 134 152 L140 172 Q128 200 132 238 Q100 246 68 238 Q72 200 60 172 Z' : 'M60 152 Q100 144 140 152 L146 172 L136 240 Q100 248 64 240 L54 172 Z';
  add(`<path d="${torso}" fill="${sk}"/>`);
  const topKind = out ? { dress: 'tank', longdress: 'tank', suit: 'suit', jumpsuit: 'tee' }[c.outfit] : c.top;
  const topFill = c.top === 'hawaii' && !out ? `url(#${id}p)` : tc;
  if (topKind === 'tank') add(`<path d="${torso}" fill="${topFill}" clip-path="url(#${id}tk)"/>`);
  else if (topKind === 'crop') add(`<path d="${torso}" fill="${tc}" clip-path="url(#${id}cr)"/>`);
  else if (topKind === 'suit') add(`<path d="${torso}" fill="#2A2D3A"/><path d="M90 150 L100 200 L110 150 Z" fill="#fff"/><path d="M97 158 L100 200 L103 158 Z" fill="${tc === '#FFFFFF' ? '#B3202A' : tc}"/><path d="M88 150 L100 210 L82 236 M112 150 L100 210 L118 236" stroke="#1C1F2A" stroke-width="2" fill="none"/>`);
  else if (topKind === 'jacket') add(`<path d="${torso}" fill="#F4F4F6"/><path d="M60 152 Q80 146 92 150 L96 244 L64 240 L54 172 Z" fill="${tc}"/><path d="M140 152 Q120 146 108 150 L104 244 L136 240 L146 172 Z" fill="${tc}"/>`);
  else add(`<path d="${torso}" fill="${topFill}"/>`);
  if (topKind === 'shirt' || topKind === 'hawaii') add(`<path d="M86 148 L100 164 L92 172 Z M114 148 L100 164 L108 172 Z" fill="${avShade(tc, -.1)}"/><path d="M100 164 L100 240" stroke="${tcD}" stroke-width="1.5"/>${[180, 198, 216].map(y => `<circle cx="100" cy="${y}" r="1.8" fill="${tcD}"/>`).join('')}`);
  if (topKind === 'hoodie') add(`<path d="M76 150 Q100 176 124 150 L120 146 Q100 166 80 146 Z" fill="${tcD}"/><path d="M80 206 L120 206 L116 230 L84 230 Z" fill="${tcD}" opacity=".6"/><path d="M94 158 L93 186 M106 158 L107 186" stroke="#fff" stroke-width="2"/>`);
  if (topKind === 'blouse') add(`<path d="M84 148 Q100 162 116 148" stroke="${tcD}" stroke-width="3" fill="none"/>`);
  if (topKind === 'tee' || topKind === 'crop') add(`<path d="M86 149 Q100 160 114 149" stroke="${tcD}" stroke-width="3" fill="none"/>`);
  if (ex.has('bag')) add(`<path d="M58 158 L142 222" stroke="#1C1F2A" stroke-width="5"/><rect x="104" y="208" width="34" height="20" rx="7" fill="#2A2D3A"/><rect x="110" y="214" width="14" height="3" rx="1.5" fill="#E85CA8"/>`);
  if (c.neck === 'chain') add(`<path d="M84 150 Q100 176 116 150" stroke="#E9C46A" stroke-width="2.5" fill="none"/>`);
  if (c.neck === 'pearls') add(Array.from({ length: 9 }, (_, i) => { const t = i / 8, x = 84 + 32 * t, y = 150 + 20 * Math.sin(Math.PI * t); return `<circle cx="${x}" cy="${y}" r="2.8" fill="#FAF7F0" stroke="#D9D3C7" stroke-width=".6"/>`; }).join(''));
  // ---- cou et tête
  add(`<rect x="90" y="124" width="20" height="30" rx="8" fill="${skD}"/>`);
  add(`<circle cx="60" cy="98" r="9" fill="${sk}"/><circle cx="140" cy="98" r="9" fill="${sk}"/>`);
  if (c.ears === 'studs') add(`<circle cx="58" cy="106" r="2.6" fill="#E9C46A"/><circle cx="142" cy="106" r="2.6" fill="#E9C46A"/>`);
  if (c.ears === 'hoops') add(`<circle cx="57" cy="111" r="6" stroke="#E9C46A" stroke-width="2" fill="none"/><circle cx="143" cy="111" r="6" stroke="#E9C46A" stroke-width="2" fill="none"/>`);
  add(`<path d="M60 90 C60 56 78 44 100 44 C122 44 140 56 140 90 C140 120 124 138 100 140 C76 138 60 120 60 90 Z" fill="url(#${id}s)"/>`);
  // ---- visage
  if (ex.has('blush')) add(`<ellipse cx="76" cy="113" rx="8" ry="5" fill="#F27C9A" opacity=".35"/><ellipse cx="124" cy="113" rx="8" ry="5" fill="#F27C9A" opacity=".35"/>`);
  if (ex.has('freckles')) add([[74, 108], [79, 111], [72, 113], [126, 108], [121, 111], [128, 113]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.3" fill="${skD}"/>`).join(''));
  if (ex.has('glitter')) add([[72, 104, 3], [80, 112, 2], [128, 104, 3], [120, 112, 2], [76, 96, 1.6]].map(p => `<path d="M${p[0]} ${p[1] - p[2]} L${p[0] + p[2] * .4} ${p[1]} L${p[0]} ${p[1] + p[2]} L${p[0] - p[2] * .4} ${p[1]} Z" fill="#B9A8FF"/>`).join(''));
  const ec = AV.eyeC[c.eyeC];
  const eye = (x, kind) => ({
    round: `<ellipse cx="${x}" cy="98" rx="6.5" ry="7.5" fill="#fff"/><circle cx="${x}" cy="99" r="4.6" fill="${ec}"/><circle cx="${x}" cy="99" r="2.2" fill="#111"/><circle cx="${x + 1.6}" cy="96.6" r="1.4" fill="#fff"/>`,
    almond: `<path d="M${x - 8} 99 Q${x} 90 ${x + 8} 99 Q${x} 104 ${x - 8} 99 Z" fill="#fff"/><circle cx="${x}" cy="98.5" r="4" fill="${ec}"/><circle cx="${x}" cy="98.5" r="2" fill="#111"/><circle cx="${x + 1.4}" cy="97" r="1.1" fill="#fff"/>`,
    lashes: `<ellipse cx="${x}" cy="98" rx="6.5" ry="7.5" fill="#fff"/><circle cx="${x}" cy="99" r="4.6" fill="${ec}"/><circle cx="${x}" cy="99" r="2.2" fill="#111"/><circle cx="${x + 1.6}" cy="96.6" r="1.4" fill="#fff"/><path d="M${x - 7} 93 L${x - 10} 89 M${x - 3} 91 L${x - 4} 87 M${x + 7} 93 L${x + 10} 89" stroke="#111" stroke-width="1.6" stroke-linecap="round"/>`,
    happy: `<path d="M${x - 7} 100 Q${x} 92 ${x + 7} 100" stroke="#2A1F1A" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    sleepy: `<path d="M${x - 7} 98 Q${x} 104 ${x + 7} 98 Z" fill="#fff"/><path d="M${x - 7} 98 L${x + 7} 98" stroke="#2A1F1A" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x}" cy="100" r="2.6" fill="${ec}"/>`
  }[kind]);
  if (c.eyes === 'wink') add(eye(84, 'round') + eye(116, 'happy')); else add(eye(84, c.eyes) + eye(116, c.eyes));
  const bw = c.brows === 'thick' ? 4.5 : 3;
  const brow = { soft: (x, s) => `M${x - 8} 88 Q${x} ${83} ${x + 8} 87`, straight: (x) => `M${x - 8} 86 L${x + 8} 86`, arched: (x, s) => `M${x - 8} 88 Q${x - 2} 80 ${x + 8} 85`, thick: (x) => `M${x - 8} 88 Q${x} 82 ${x + 8} 86` }[c.brows];
  add(`<path d="${brow(84)}" stroke="${hcD}" stroke-width="${bw}" fill="none" stroke-linecap="round"/><path d="${brow(116).replace(/M(\d+)/, m => m)}" stroke="${hcD}" stroke-width="${bw}" fill="none" stroke-linecap="round" transform="translate(232 0) scale(-1 1)"/>`.replace(`d="${brow(116)}"`, `d="${brow(116)}"`));
  add(`<path d="M98 104 Q100 112 104 110" stroke="${skD}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
  add({
    smile: `<path d="M88 120 Q100 130 112 120" stroke="#7A2E2E" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    grin: `<path d="M86 118 Q100 136 114 118 Z" fill="#7A2E2E"/><path d="M89 119 L111 119 L109 123 L91 123 Z" fill="#fff"/>`,
    laugh: `<path d="M86 117 Q100 140 114 117 Z" fill="#7A2E2E"/><path d="M92 129 Q100 134 108 129 Q100 126 92 129 Z" fill="#E86B7A"/>`,
    smirk: `<path d="M90 122 Q102 126 112 117" stroke="#7A2E2E" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    neutral: `<path d="M91 122 L109 122" stroke="#7A2E2E" stroke-width="3" stroke-linecap="round"/>`,
    o: `<ellipse cx="100" cy="123" rx="5" ry="6" fill="#7A2E2E"/>`,
    tongue: `<path d="M87 118 Q100 134 113 118 Z" fill="#7A2E2E"/><path d="M94 124 Q100 136 106 124 Z" fill="#E86B7A"/>`
  }[c.mouth]);
  add({
    none: '', stubble: `<path d="M66 108 C68 132 84 140 100 141 C116 140 132 132 134 108 C128 128 116 134 100 134 C84 134 72 128 66 108 Z" fill="${hcD}" opacity=".28"/>`,
    mustache: `<path d="M86 115 Q93 109 100 114 Q107 109 114 115 Q107 118 100 116 Q93 118 86 115 Z" fill="${hcD}"/>`,
    goatee: `<path d="M86 115 Q93 109 100 114 Q107 109 114 115 Q107 118 100 116 Q93 118 86 115 Z" fill="${hcD}"/><path d="M92 128 Q100 144 108 128 Q100 134 92 128 Z" fill="${hcD}"/>`,
    beard: `<path d="M62 100 C62 130 80 146 100 146 C120 146 138 130 138 100 C134 118 126 124 116 126 Q100 118 84 126 C74 124 66 118 62 100 Z" fill="${hcD}"/><path d="M86 115 Q93 109 100 114 Q107 109 114 115 Q107 118 100 116 Q93 118 86 115 Z" fill="${hcD}"/>`
  }[c.beard]);
  // ---- cheveux avant
  add({
    bald: '', buzz: `<path d="M61 84 C62 56 80 46 100 46 C120 46 138 56 139 84 C130 70 116 64 100 64 C84 64 70 70 61 84 Z" fill="${hc}" opacity=".85"/>`,
    short: `<path d="M58 92 C54 52 82 38 104 40 C128 42 146 58 142 92 C136 78 130 68 118 64 C108 72 86 74 72 70 C66 76 62 84 58 92 Z" fill="${hc}"/><path d="M80 52 Q98 44 120 52" stroke="${hcL}" stroke-width="3" fill="none" opacity=".6"/>`,
    spiky: `<path d="M58 90 L56 60 L70 66 L72 40 L86 54 L96 32 L106 52 L120 36 L124 58 L140 50 L138 70 L146 72 L142 92 C132 72 116 64 100 66 C84 64 68 72 58 90 Z" fill="${hc}"/>`,
    curly: `${[[64, 70], [74, 56], [88, 48], [104, 46], [120, 50], [134, 62], [140, 78], [60, 86], [82, 62], [112, 60]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="12" fill="${hc}"/>`).join('')}<circle cx="96" cy="56" r="9" fill="${hcL}" opacity=".35"/>`,
    afro: `<path d="M60 80 Q100 56 140 80 Q120 64 100 64 Q80 64 60 80 Z" fill="${hc}"/>`,
    bob: `<path d="M56 100 C52 52 80 40 100 40 C124 40 148 52 144 100 C140 80 132 70 124 64 C112 72 84 72 70 66 C62 76 58 88 56 100 Z" fill="${hc}"/>`,
    long: `<path d="M56 104 C52 52 80 40 100 40 C124 40 148 52 144 104 C140 82 134 70 126 64 C116 74 96 72 88 64 C76 70 62 82 56 104 Z" fill="${hc}"/><path d="M88 46 Q76 60 72 84" stroke="${hcL}" stroke-width="3" fill="none" opacity=".5"/>`,
    wavy: `<path d="M56 104 C50 52 80 40 100 40 C124 40 150 52 144 104 C140 86 136 74 128 66 C118 76 100 76 90 66 C80 74 62 84 56 104 Z" fill="${hc}"/>`,
    ponytail: `<path d="M58 92 C54 52 82 40 102 40 C124 40 146 54 142 92 C138 74 128 64 116 62 C104 66 84 66 74 64 C66 72 60 80 58 92 Z" fill="${hc}"/><rect x="128" y="68" width="10" height="8" rx="3" fill="#E85CA8"/>`,
    bun: `<circle cx="100" cy="38" r="17" fill="${hc}"/><path d="M58 92 C54 52 82 42 100 42 C120 42 146 54 142 92 C138 72 124 60 100 60 C78 60 62 72 58 92 Z" fill="${hc}"/>`,
    buns: `<circle cx="70" cy="50" r="15" fill="${hc}"/><circle cx="130" cy="50" r="15" fill="${hc}"/><path d="M58 92 C54 52 82 42 100 42 C120 42 146 54 142 92 C138 72 124 60 100 60 C78 60 62 72 58 92 Z" fill="${hc}"/><path d="M100 42 L100 60" stroke="${hcD}" stroke-width="2"/>`,
    braids: `<path d="M58 96 C54 52 82 42 100 42 C120 42 146 54 142 96 C138 72 124 60 100 60 C78 60 62 72 58 96 Z" fill="${hc}"/><path d="M100 42 L100 60" stroke="${hcD}" stroke-width="2"/>`,
    mohawk: `<path d="M88 66 Q86 30 100 22 Q114 30 112 66 Z" fill="${hc}"/><path d="M61 84 C64 62 80 54 100 54 C120 54 136 62 139 84 C128 72 114 68 100 68 C86 68 72 72 61 84 Z" fill="${hc}" opacity=".35"/>`
  }[c.hair]);
  // ---- lunettes, chapeaux
  const gc = AV.cloth[c.glassesC];
  add({
    none: '', round: `<circle cx="84" cy="98" r="11" stroke="${gc}" stroke-width="3" fill="#ffffff22"/><circle cx="116" cy="98" r="11" stroke="${gc}" stroke-width="3" fill="#ffffff22"/><path d="M95 97 L105 97" stroke="${gc}" stroke-width="3"/>`,
    square: `<rect x="72" y="89" width="24" height="18" rx="4" stroke="${gc}" stroke-width="3" fill="#ffffff22"/><rect x="104" y="89" width="24" height="18" rx="4" stroke="${gc}" stroke-width="3" fill="#ffffff22"/><path d="M96 96 L104 96" stroke="${gc}" stroke-width="3"/>`,
    sun: `<path d="M70 90 L98 90 L96 104 Q84 110 72 104 Z M102 90 L130 90 L128 104 Q116 110 104 104 Z" fill="#1C1F2A"/><path d="M98 93 L102 93" stroke="#1C1F2A" stroke-width="3"/><path d="M76 93 L84 93" stroke="#fff" stroke-width="2" opacity=".5"/>`,
    heart: [84, 116].map(x => `<path d="M${x} 108 L${x - 11} 96 Q${x - 11} 86 ${x} 92 Q${x + 11} 86 ${x + 11} 96 Z" fill="${gc}" opacity=".85"/>`).join('') + `<path d="M95 95 L105 95" stroke="${gc}" stroke-width="2.5"/>`,
    star: [84, 116].map(x => `<path d="M${x} 85 L${x + 3.5} 94 L${x + 12} 95 L${x + 5} 101 L${x + 7} 110 L${x} 105 L${x - 7} 110 L${x - 5} 101 L${x - 12} 95 L${x - 3.5} 94 Z" fill="${gc}" opacity=".9"/>`).join('')
  }[c.glasses]);
  const hcol = AV.cloth[c.hatC], hcolD = avShade(hcol, -.2);
  add({
    none: '', cap: `<path d="M58 78 C58 44 80 34 100 34 C120 34 142 44 142 78 Z" fill="${hcol}"/><path d="M58 76 Q100 68 170 82 Q152 90 100 84 Q76 82 58 82 Z" fill="${hcolD}"/><circle cx="100" cy="34" r="4" fill="${hcolD}"/>`,
    bucket: `<path d="M64 76 C64 44 82 36 100 36 C118 36 136 44 136 76 Z" fill="${hcol}"/><path d="M46 84 Q100 66 154 84 L148 90 Q100 76 52 90 Z" fill="${hcolD}"/>`,
    beanie: `<path d="M58 84 C56 44 80 30 100 30 C120 30 144 44 142 84 Z" fill="${hcol}"/><rect x="56" y="74" width="88" height="14" rx="6" fill="${hcolD}"/><circle cx="100" cy="28" r="8" fill="${hcolD}"/>`,
    cowboy: `<path d="M70 74 C70 40 84 32 100 40 C116 32 130 40 130 74 Z" fill="${hcol}"/><path d="M36 74 Q100 96 164 74 Q160 88 100 90 Q40 88 36 74 Z" fill="${hcolD}"/><rect x="70" y="66" width="60" height="7" fill="#1C1F2A" opacity=".5"/>`,
    flowers: [58, 72, 86, 100, 114, 128, 142].map((x, i) => `<circle cx="${x}" cy="${62 - Math.sin(i / 6 * Math.PI) * 18}" r="7" fill="${['#F4B6DD', '#E8C23A', '#E85CA8', '#BFD0F5', '#F4B6DD', '#E3762B', '#E85CA8'][i]}"/><circle cx="${x}" cy="${62 - Math.sin(i / 6 * Math.PI) * 18}" r="2.4" fill="#FFF3B0"/>`).join(''),
    headphones: `<path d="M56 96 C52 40 148 40 144 96" stroke="#1C1F2A" stroke-width="7" fill="none"/><rect x="48" y="86" width="16" height="26" rx="7" fill="${hcol}"/><rect x="136" y="86" width="16" height="26" rx="7" fill="${hcol}"/>`
  }[c.hat]);
  const ped = opt.pedestal ? `<ellipse cx="100" cy="404" rx="76" ry="16" fill="#E792C6"/><ellipse cx="100" cy="400" rx="76" ry="15" fill="url(#${id}ped)"/>` : '';
  const vb = opt.view === 'head' ? '30 20 140 140' : opt.view === 'torso' ? '20 100 160 170' : opt.view === 'legs' ? '20 220 160 200' : opt.view === 'feet' ? '40 340 120 72' : opt.vb || '0 10 200 412';
  const defs = `<defs><radialGradient id="${id}s" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="${avShade(sk, .1)}"/><stop offset="1" stop-color="${sk}"/></radialGradient><radialGradient id="${id}ped" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#FBD3EA"/><stop offset="1" stop-color="#F4B6DD"/></radialGradient>
    <clipPath id="${id}tk"><path d="M${f ? 78 : 74} 150 L${f ? 122 : 126} 150 L150 172 L150 250 L50 250 L50 172 Z"/></clipPath><clipPath id="${id}cr"><rect x="40" y="140" width="120" height="66"/></clipPath>
    <pattern id="${id}p" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="${tc}"/><circle cx="7" cy="7" r="4" fill="#F4B6DD"/><circle cx="7" cy="7" r="1.5" fill="#E8C23A"/><path d="M16 18 q6 -6 10 0 q-6 6 -10 0" fill="#2F8F5A"/><circle cx="20" cy="4" r="2.5" fill="#E3762B"/></pattern></defs>`;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(opt.label || 'Avatar')}" style="${opt.style || ''}">${defs}${ped}${S.join('')}</svg>`;
}
const avHead = (cfg, size = 46) => avatarSVG(cfg, { view: 'head', style: `width:${size}px;height:${size}px;display:block` });
const avData = (cfg, view = 'head') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSVG(cfg, { view }));
// Préréglages variés (choix rapide en 1 touche)
const AV_PRESETS = [
  { build: 'm', skin: 2, hair: 'curly', hairC: 2, top: 'tee', topC: 0, bottom: 'jeans', bottomC: 7, mouth: 'smile', extra: ['wristband'] },
  { build: 'f', skin: 1, hair: 'long', hairC: 7, top: 'crop', topC: 1, bottom: 'skirt', bottomC: 10, eyes: 'lashes', mouth: 'grin', ears: 'hoops', extra: ['wristband', 'glitter'] },
  { build: 'f', skin: 7, hair: 'braids', hairC: 0, top: 'tank', topC: 0, bottom: 'cargo', bottomC: 11, eyes: 'almond', mouth: 'smile', neck: 'chain', extra: ['wristband'] },
  { build: 'm', skin: 6, hair: 'afro', hairC: 0, top: 'hawaii', topC: 6, bottom: 'shorts', bottomC: 14, mouth: 'laugh', glasses: 'sun', extra: ['wristband'] },
  { build: 'm', skin: 0, hair: 'short', hairC: 6, top: 'shirt', topC: 11, bottom: 'jeans', bottomC: 1, glasses: 'round', glassesC: 1, beard: 'stubble', extra: ['wristband'] },
  { build: 'f', skin: 4, hair: 'buns', hairC: 11, top: 'tee', topC: 8, bottom: 'shorts', bottomC: 1, mouth: 'tongue', hat: 'none', extra: ['wristband', 'glitter', 'blush'], shoes: 'platforms', shoesC: 1 },
  { build: 'm', skin: 3, hair: 'spiky', hairC: 0, top: 'hoodie', topC: 2, bottom: 'joggers', bottomC: 1, mouth: 'smirk', extra: ['wristband', 'bag'] },
  { build: 'f', skin: 9, hair: 'wavy', hairC: 6, outfit: 'dress', topC: 9, eyes: 'lashes', mouth: 'smile', hat: 'flowers', extra: ['wristband', 'freckles'], shoes: 'sandals', shoesC: 13 },
  { build: 'm', skin: 8, hair: 'buzz', hairC: 0, outfit: 'suit', topC: 0, mouth: 'smile', beard: 'goatee', extra: ['wristband'], shoes: 'boots', shoesC: 1 },
  { build: 'f', skin: 5, hair: 'bob', hairC: 12, top: 'jacket', topC: 3, bottom: 'jeans', bottomC: 7, mouth: 'grin', glasses: 'heart', glassesC: 9, extra: ['wristband'] },
  { build: 'm', skin: 1, hair: 'mohawk', hairC: 8, top: 'tank', topC: 1, bottom: 'cargo', bottomC: 12, mouth: 'grin', ears: 'studs', extra: ['wristband', 'glitter'], hat: 'none' },
  { build: 'f', skin: 3, hair: 'ponytail', hairC: 3, top: 'blouse', topC: 10, bottom: 'longskirt', bottomC: 4, mouth: 'smile', neck: 'pearls', extra: ['wristband'] }
];
