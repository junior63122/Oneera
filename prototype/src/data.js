// ===== Données de démonstration (fictives) =====
const A = 'a/';
const IC = k => A + 'ic/' + k + '.webp';
const HEAD = k => A + 'hd/' + k + '.webp';
const CH = (k, v) => A + 'c/' + k + (v ? '_' + v : '') + '.webp'; // personnages haute qualité : plein format, _m carte, _h visage
const FRIEND_CHAR = { lea: 'rousse', ines: 'noir', tom: 'c30', yanis: 'metisse', sami: 'c31', maya: 'short', chloe: 'c32', elsa: 'b21', nathan: 'b20' };
const AVB = k => A + 'av/' + k + '.webp';

const EVENT = {
  name: 'Le Bal des Fous', place: 'Cannes · Port', date: 'Samedi 25 juillet', hours: '20:00 – 04:00',
  capacity: 6000, venueQR: 'BDF-2026-0725'
};

// Avatars de base (assets du Figma ONEERA). tone = teinte de peau (index nuancier 0 clair → 7 foncé)
const BASES = [
  { k: 'lins', n: 'Léo', tone: 1, hair: 'boucles', st: 'casual' },
  { k: 'short', n: 'Jade', tone: 1, hair: 'long', st: 'été' },
  { k: 'rousse', n: 'Lou', tone: 0, hair: 'roux', st: 'robe' },
  { k: 'metisse', n: 'Noa', tone: 3, hair: 'boucles', st: 'street' },
  { k: 'noir', n: 'Ayo', tone: 5, hair: 'tresses', st: 'street' },
  { k: 'group_16', n: 'Awa', tone: 7, hair: 'afro', st: 'robe' },
  { k: 'group_18', n: 'Malo', tone: 1, hair: 'court', st: 'chemise' },
  { k: 'group_19', n: 'Elsa', tone: 1, hair: 'tresse', st: 'blouse' },
  { k: 'group_20', n: 'Tim', tone: 2, hair: 'chignon', st: 'tee' },
  { k: 'group_21', n: 'Zoé', tone: 2, hair: 'bouclé', st: 'débardeur' },
  { k: 'group_22', n: 'Sami', tone: 4, hair: 'épis', st: 'chemise' }
];
const SKIN = ['#F5CBA7', '#EDB98A', '#E0A574', '#C98B5B', '#A8693F', '#8A5130', '#6B3A1F', '#4A2512'];
const TOPS = [0,1,2,3,4,5,6].map(i => ({ k: 'top' + i, n: ['Tee-shirt','Chemise ouverte','Chemise','Blouse','Hawaïenne','Débardeur','Marcel'][i] }));
const GLASSES = [{ k: 'glasses0', n: 'Solaires' }, { k: 'glasses1', n: 'Lunettes' }];
const TOP_COLORS = ['#B3202A', '#E3762B', '#E8C23A', '#9CC54A', '#2CB5C0', '#3B6FE0', '#7C4FD6'];

// Plan : coordonnées en % de l'image bdf_fest (3000×1891)
const NODES = {
  A: [91, 83], B: [88, 69], C: [78, 64], D: [71, 62], E: [61, 62], F: [51, 62], G: [48, 51], H: [45, 41], I: [40, 38],
  J: [33, 34], K: [24, 33], L: [15, 36], M: [40, 64], N: [31, 63], O: [21, 58], P: [16, 66], Q: [63, 67], R: [51, 67],
  S: [42, 53], T: [62, 54], U: [79, 56], V: [74, 63], W: [54, 41], X: [48, 33], Y: [36, 45], Z: [22, 40], R2: [27, 61]
};
const EDGES = ['AB', 'BC', 'CD', 'DE', 'EF', 'FG', 'GH', 'HI', 'IJ', 'JK', 'FM', 'MN', 'N-R2', 'R2-O', 'OP', 'EQ', 'FR', 'GS', 'ET', 'CU', 'DV', 'HW', 'HX', 'WX', 'HY', 'YZ', 'ZL', 'SY'];
const RESTRICTED = new Set(['J', 'K']); // carré VIP : jamais traversé pour aller ailleurs

const POIS = [
  { id: 'scene', n: 'Scène principale', ic: 'scene', cat: 'scene', node: 'I', at: [38, 35], desc: 'DJ sets et live jusqu’à 4 h.', hours: '20:00 – 04:00' },
  { id: 'dj', n: 'Cabine Le Cube', ic: 'dj', cat: 'scene', node: 'X', at: [48, 31], desc: 'Seconde scène, sets house.', hours: '22:00 – 03:00' },
  { id: 'fosse', n: 'Fosse', ic: 'dancefloor', cat: 'zone', node: 'G', at: [46, 47], desc: 'Pelouse devant la scène.' },
  { id: 'vip', n: 'Carré VIP', ic: 'sunglasses', cat: 'zone', node: 'J', at: [30, 27], desc: 'Tables réservées, accès bracelet VIP.', restricted: true },
  { id: 'tables', n: 'Espace tables', ic: 'zones_tables', cat: 'zone', node: 'W', at: [54, 39], desc: 'Tables et lounge.' },
  { id: 'barO', n: 'Bar Ouest', ic: 'bar', cat: 'bar', node: 'M', at: [39, 69], hours: '20:00 – 03:45', bar: true },
  { id: 'barE', n: 'Bar Est', ic: 'bar1', cat: 'bar', node: 'Q', at: [64, 69], hours: '20:00 – 03:45', bar: true },
  { id: 'barC', n: 'Bar à cocktails', ic: 'cocktail', cat: 'bar', node: 'R', at: [51, 68], hours: '21:00 – 03:30', bar: true },
  { id: 'barS', n: 'Bar sans alcool', ic: 'eau', cat: 'bar', node: 'L', at: [14, 34], hours: '20:00 – 04:00', bar: true },
  { id: 'cashless', n: 'Recharge cashless', ic: 'cashless', cat: 'service', node: 'O', at: [16, 55], desc: 'Recharge du bracelet par carte ou espèces.', hours: '20:00 – 03:30' },
  { id: 'rotonde', n: 'La Rotonde', ic: 'merchandise', cat: 'service', node: 'O', at: [22, 50], desc: 'Shop, make-up, bornes de recharge, WC.', hours: '20:00 – 04:00' },
  { id: 'wc', n: 'Toilettes', ic: 'image_178', cat: 'service', node: 'S', at: [41, 52], desc: 'Toilettes publiques, accès PMR.' },
  { id: 'secours', n: 'Poste de secours', ic: 'infirmerie', cat: 'secu', node: 'P', at: [16, 69], desc: 'Équipe médicale présente toute la nuit.' },
  { id: 'secu', n: 'Sécurité', ic: 'securite', cat: 'secu', node: 'B', at: [84, 70], desc: 'Point sécurité à l’entrée.' },
  { id: 'entree', n: 'Entrée', ic: 'image_227', cat: 'service', node: 'A', at: [92, 83], desc: 'Contrôle des billets et bracelets.' },
  { id: 'vestiaire', n: 'Vestiaire', ic: 'vestiaire', cat: 'service', node: 'V', at: [74, 60], desc: '3 € par article, cashless.' },
  { id: 'fumeur', n: 'Zone fumeur', ic: 'zone_fumeur', cat: 'service', node: 'U', at: [80, 53] },
  { id: 'food', n: 'Restauration', ic: 'food', cat: 'food', node: 'T', at: [63, 51], desc: 'Burgers, pizzas, options végé.', hours: '20:00 – 02:30' },
  { id: 'eau', n: 'Eau gratuite', ic: 'eau', cat: 'service', node: 'E', at: [58, 60], desc: 'Fontaine à eau gratuite.' },
  { id: 'recharge', n: 'Recharge téléphone', ic: 'recharge_telephone', cat: 'service', node: 'S', at: [37, 56], desc: 'Casiers de recharge, 2 € les 30 min.' },
  { id: 'info', n: 'Point info', ic: 'point_info', cat: 'service', node: 'D', at: [68, 60], desc: 'Objets trouvés, aide, informations.' },
  { id: 'partner', n: 'Stand Riviera Soda', ic: 'image_177', cat: 'food', node: 'T', at: [67, 47], desc: 'Partenaire officiel : soda artisanal offert aux 500 premiers.', hours: '21:00 – 01:00', partner: true },
  { id: 'defib', n: 'Défibrillateur', ic: 'defibrilateur', cat: 'secu', node: 'C', at: [77, 61] }
];

const MENU = {
  food: [['Plats', [['Burger du Bal', 13], ['Pizza margherita', 11], ['Wrap végé', 10]]], ['À côté', [['Frites', 4.5], ['Salade', 6]]], ['Desserts', [['Crêpe sucre', 4], ['Glace 2 boules', 5]]]],
  barO: [
    ['Bières', [['Pression 25 cl', 6], ['Pression 50 cl', 11], ['IPA locale 33 cl', 9]]],
    ['Cocktails', [['Spritz', 12], ['Mojito', 12], ['Gin tonic', 12]]],
    ['Softs', [['Coca-Cola 33 cl', 5], ['Red Bull', 6], ['Eau 50 cl', 3]]]
  ],
  barE: [
    ['Bières', [['Pression 25 cl', 6], ['Pression 50 cl', 11]]],
    ['Vins', [['Rosé de Provence (verre)', 8], ['Bouteille rosé', 42]]],
    ['Softs', [['Ice tea', 5], ['Eau 50 cl', 3]]]
  ],
  barC: [
    ['Signatures', [['Fou de Cannes (gin, pêche, basilic)', 14], ['Paloma', 13], ['Espresso martini', 14]]],
    ['Classiques', [['Mojito', 12], ['Margarita', 13], ['Spritz', 12]]],
    ['Sans alcool', [['Virgin mojito', 8], ['Limonade maison', 6]]]
  ],
  barS: [
    ['Sans alcool', [['Virgin mojito', 8], ['Limonade maison', 6], ['Kombucha', 6]]],
    ['Chaud', [['Café', 2.5], ['Thé', 2.5]]],
    ['Eau', [['Eau 50 cl', 3], ['Eau gratuite (gobelet)', 0]]]
  ]
};

// Amis (personnes fictives). path = itinéraire sur le graphe (aucun passage à travers les murs)
const FRIENDS = [
  { id: 'lea', n: 'Léa', h: 'rousse', base: 'rousse', col: '#0E9F8A', bat: 62, loop: 'FGHIHGF', speed: 0.025, acc: 3, zone: 'Fosse' },
  { id: 'ines', n: 'Inès', h: 'noir', base: 'noir', col: '#E0457B', bat: 35, loop: 'MFRFM', speed: 0.02, acc: 4, zone: 'Bar Ouest' },
  { id: 'tom', n: 'Tom', h: 'group_18', base: 'group_18', col: '#F08C00', bat: 81, loop: 'EQETEFE', speed: 0.018, acc: 5, zone: 'Bar Est' },
  { id: 'yanis', n: 'Yanis', h: 'metisse', base: 'metisse', col: '#7C4FD6', bat: 18, loop: 'NOPON', speed: 0.015, acc: 6, zone: 'Rotonde' },
  { id: 'sami', n: 'Samia', h: 'group_22', base: 'group_22', col: '#8A8FA6', bat: 4, stale: 18, at: 'U', zone: 'Zone fumeur' }
];
const CONTACTS_ON = [
  { id: 'lea', n: 'Léa Martin', h: 'rousse', mutual: 'contact' },
  { id: 'ines', n: 'Inès B.', h: 'noir', mutual: 'contact' },
  { id: 'tom', n: 'Tom R.', h: 'group_18', mutual: 'contact' },
  { id: 'yanis', n: 'Yanis', h: 'metisse', mutual: 'contact' },
  { id: 'sami', n: 'Samia K.', h: 'group_22', mutual: 'contact' },
  { id: 'chloe', n: 'Chloé', h: 'short', mutual: 'contact', away: true },
  { id: 'maya', n: 'Maya D.', h: 'group_21', mutual: 'contact', away: true },
  { id: 'elsa', n: 'Elsa', h: 'group_19', mutual: 'contact', away: true }
];
const CONTACTS_OFF = ['Hugo P.', 'Camille', 'Nathan', 'Manon L.', 'Lucas', 'Sarah B.', 'Enzo', 'Clara', 'Rayan', 'Jules', 'Emma V.', 'Adam'];

const LINEUP = [
  { s: 'scene', a: 'Mira Lune', st: 'House · DJ set', f: '22:00', t: '23:30' },
  { s: 'scene', a: 'Kalia b2b Remo', st: 'Disco · Afro house', f: '23:30', t: '01:00' },
  { s: 'scene', a: 'Les Fous Orchestra', st: 'Live · Funk', f: '01:00', t: '02:30' },
  { s: 'scene', a: 'Nuit Solaire', st: 'Techno mélodique', f: '02:30', t: '04:00' },
  { s: 'dj', a: 'Ondine', st: 'House · Vinyle', f: '22:00', t: '00:00' },
  { s: 'dj', a: 'Basile & Co', st: 'Edits · Disco', f: '00:00', t: '02:00' },
  { s: 'dj', a: 'Pablo Nuit', st: 'Latin house', f: '02:00', t: '03:00' }
];

const STAFF = [
  { id: 'nadia', n: 'Nadir K.', role: 'Sécurité', h: 'secu', node: 'G', col: '#2F6FE4', sector: 'Secteur Fosse', st: 'Dispo' },
  { id: 'hugo', n: 'Hugo P.', role: 'Sécurité', h: 'staff_pro', node: 'B', col: '#2F6FE4', sector: 'Secteur Entrée', st: 'Dispo' },
  { id: 'karim', n: 'Karim T.', role: 'Sécurité', h: 'staff_pro', node: 'I', col: '#2F6FE4', sector: 'Secteur Scène', st: 'En intervention' },
  { id: 'sarah', n: 'Samuel E.', role: 'Médical', h: 'valide_sante', node: 'P', col: '#E5484D', sector: 'Poste de secours', st: 'Dispo' },
  { id: 'marc', n: 'Marc B.', role: 'Manager', h: 'staff_pro', node: 'E', col: '#E58A00', sector: 'Superviseur nuit', st: 'Dispo' },
  { id: 'lucas', n: 'Lucas M.', role: 'Bar', h: 'staff_pro', node: 'M', col: '#8B5CF6', sector: 'Bar Ouest', st: 'Dispo' }
];
const staffNode = s => NODES[s.node] ? s.node : Object.keys(NODES)[0];
const staffHead = s => HEAD(s.h === 'secu' ? 'secu' : s.h === 'valide_sante' ? 'valide_sante' : 'staff_pro');
// Programmation : statut calculé depuis l'heure, jamais codé en dur
const toMin20 = t => { const [h, m] = t.split(':').map(Number); return ((h * 60 + m) - 20 * 60 + 1440) % 1440 || (h === 20 && m === 0 ? 0 : 480); };

// Club permanent (logique boîte de nuit) : Bisous Bisous, soirées récurrentes
const CLUB = { name: 'Bisous Bisous', place: 'Cannes · niveau club', legal: 650, zones: [
  { id: 'piste', n: 'Piste', at: [47, 52], cap: 260, w: 1 }, { id: 'tables', n: 'Tables', at: [57, 58], cap: 140, w: .9 }, { id: 'bar', n: 'Bar', at: [38, 64], cap: 90, w: .8 },
  { id: 'terr', n: 'Terrasse', at: [84, 22], cap: 120, w: .55 }, { id: 'vest', n: 'Vestiaire', at: [22, 72], cap: 40, w: .4 } ] };
const ZONES = [
  { id: 'fosse', n: 'Fosse', cap: 2200, occ: 1630, at: [46, 47], r: 9 },
  { id: 'scene', n: 'Avant-scène', cap: 900, occ: 820, at: [39, 39], r: 6 },
  { id: 'vip', n: 'Carré VIP', cap: 300, occ: 210, at: [30, 28], r: 6 },
  { id: 'tables', n: 'Espace tables', cap: 500, occ: 280, at: [55, 40], r: 7 },
  { id: 'bars', n: 'Bars (sud)', cap: 600, occ: 470, at: [51, 67], r: 9 },
  { id: 'rotonde', n: 'La Rotonde', cap: 700, occ: 240, at: [20, 54], r: 8 },
  { id: 'terrasse', n: 'Terrasse est', cap: 800, occ: 310, at: [76, 58], r: 8 }
];
