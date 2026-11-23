// ===== Lieux : festival, club, club-restaurant (même app, données du lieu chargées à l'ouverture) =====
const clone = o => JSON.parse(JSON.stringify(o));
const VENUES = {
  bdf: { id: 'bdf', kind: 'Festival plein air', name: 'Le Bal des Fous', place: 'Cannes · Port', date: 'Samedi 25 juillet', hours: '20:00 – 04:00', capacity: 6000, map: { src: A + 'bdf_fest.webp', w: 3000, h: 1891 }, m: 4.1, start: [50, 63], zoom: .46,
    data: { NODES: clone(NODES), EDGES: [...EDGES], RESTRICTED: [...RESTRICTED], POIS: clone(POIS), ZONES: clone(ZONES), LINEUP: clone(LINEUP), FRIENDS: clone(FRIENDS) }, stages: [['scene', 'Scène principale'], ['dj', 'Le Cube']], tech: 'GPS en extérieur + 20 balises (Rotonde, entrées)', flows: [['ABCDEFGHI', 380], ['IHGFMN', 190], ['FRFEQ', 140], ['GFEDCU', 95], ['OPO', 12]] },
  bisous: { id: 'bisous', kind: 'Boîte de nuit', name: 'Bisous Bisous', place: 'Cannes · Palais (niveau club)', date: 'Samedi soir', hours: '23:30 – 05:00', capacity: 650, map: { src: A + 'bisous.webp', w: 1200, h: 800 }, m: .55, start: [44, 58], zoom: .62,
    floors: [['club', 'Club (niveau −1)'], ['casino', 'Casino (RDC)']], tech: '15 balises, aucun GPS (intérieur, 2 niveaux)',
    data: {
      NODES: { A: [14, 66], B: [22, 66], C: [30, 63], D: [37, 58], E: [40, 61], F: [47, 51], G: [45, 45], H: [55, 47], I: [57, 40], J: [62, 41], K: [72, 31], L: [84, 24], M: [24, 74], N: [27, 80], O: [19, 72], P: [61, 55], Q: [66, 58], R: [75, 57] },
      EDGES: ['AB', 'BC', 'CD', 'DE', 'DF', 'FG', 'FH', 'HI', 'IJ', 'JK', 'KL', 'BM', 'MN', 'BO', 'HP', 'PQ', 'PR'], RESTRICTED: ['R'],
      POIS: [
        { id: 'scene', n: 'Cabine DJ', ic: 'dj', cat: 'scene', node: 'G', at: [45, 44], desc: 'Résidents et guests jusqu’à 5 h.', hours: '23:30 – 05:00' },
        { id: 'fosse', n: 'Piste', ic: 'dancefloor', cat: 'zone', node: 'F', at: [48, 49], desc: 'Piste centrale, piliers et miroirs.' },
        { id: 'tables', n: 'Tables', ic: 'zones_tables', cat: 'zone', node: 'H', at: [57, 46], desc: 'Tables réservées, service bouteille.' },
        { id: 'barP', n: 'Bar principal', ic: 'bar', cat: 'bar', node: 'E', at: [40, 64], hours: '23:30 – 04:45', bar: true },
        { id: 'barT', n: 'Bar terrasse', ic: 'cocktail', cat: 'bar', node: 'L', at: [80, 22], hours: '23:30 – 04:30', bar: true },
        { id: 'terrasse', n: 'Terrasse', ic: 'lounge', cat: 'zone', node: 'K', at: [72, 28], desc: 'Terrasse extérieure, vue sur la baie.' },
        { id: 'fumeur', n: 'Espace fumeur', ic: 'zone_fumeur', cat: 'service', node: 'L', at: [88, 27] },
        { id: 'entree', n: 'Entrée casino', ic: 'entree', cat: 'service', node: 'A', at: [13, 66], desc: 'Entrée principale par le casino, toute l’année.' },
        { id: 'vestiaire', n: 'Vestiaire', ic: 'vestiaire', cat: 'service', node: 'O', at: [18, 72], desc: '3 vestiaires · 3 € par article.' },
        { id: 'wc', n: 'Toilettes', ic: 'image_178', cat: 'service', node: 'N', at: [28, 82] },
        { id: 'halo', n: 'Couloir halo', ic: 'zone_populaire', cat: 'zone', node: 'C', at: [30, 61], desc: 'Couloir lumineux entre l’entrée et la salle.' },
        { id: 'sortie', n: 'Sortie escaliers', ic: 'sortie_2', cat: 'service', node: 'Q', at: [66, 59], desc: 'Sortie extérieure par les escaliers (soirs d’événement).' },
        { id: 'secu', n: 'Sécurité', ic: 'securite_2', cat: 'secu', node: 'B', at: [22, 63] },
        { id: 'backstage', n: 'Backstage', ic: 'backstage', cat: 'service', node: 'R', at: [76, 56], desc: 'Réservé au staff et aux artistes.', restricted: true }
      ],
      ZONES: [{ id: 'fosse', n: 'Piste', cap: 260, occ: 0, at: [48, 50], r: 7 }, { id: 'tables', n: 'Tables', cap: 140, occ: 0, at: [57, 46], r: 7 }, { id: 'bars', n: 'Bar principal', cap: 90, occ: 0, at: [40, 62], r: 5 }, { id: 'terrasse', n: 'Terrasse', cap: 120, occ: 0, at: [78, 25], r: 9 }, { id: 'rotonde', n: 'Vestiaire et entrée', cap: 40, occ: 0, at: [20, 69], r: 5 }],
      LINEUP: [{ s: 'scene', a: 'Résident · Léon D.', st: 'House', f: '23:30', t: '01:00' }, { s: 'scene', a: 'Guest · Nova Rae', st: 'Afro house', f: '01:00', t: '03:00' }, { s: 'scene', a: 'Closing · Léon D.', st: 'Disco', f: '03:00', t: '05:00' }],
      FRIENDS: [
        { id: 'lea', n: 'Léa', col: '#0E9F8A', bat: 62, loop: 'FGFHF', speed: .02, acc: 2 }, { id: 'ines', n: 'Inès', col: '#E0457B', bat: 35, loop: 'HIH', speed: .015, acc: 2 },
        { id: 'tom', n: 'Tom', col: '#F08C00', bat: 81, loop: 'JKLKJ', speed: .02, acc: 3 }, { id: 'yanis', n: 'Yanis', col: '#7C4FD6', bat: 18, loop: 'DEDFD', speed: .02, acc: 2 },
        { id: 'sami', n: 'Sami', col: '#3B6FE0', bat: 54, at: 'A', floor: 'casino', acc: 4 }]
    }, stages: [['scene', 'Cabine DJ']], flows: [['ABCDF', 90], ['FHIJKL', 60], ['DEDF', 45], ['BMN', 20]] },
  selva: { id: 'selva', kind: 'Club-restaurant', name: 'Selva', place: 'Monaco', date: 'Vendredi soir', hours: '20:00 – 03:00', capacity: 280, map: { src: A + 'selva.webp', w: 1200, h: 873 }, m: .35, start: [58, 70], zoom: .62, tech: '8 balises, aucun GPS',
    data: {
      NODES: { A: [40, 84], B: [50, 79], C: [60, 71], D: [60, 62], E: [52, 53], F: [67, 58], G: [78, 52], H: [74, 40], I: [60, 37], J: [50, 33], K: [40, 46], L: [25, 50] },
      EDGES: ['AB', 'BC', 'CD', 'DE', 'DF', 'FG', 'GH', 'HI', 'IJ', 'EK', 'KL', 'DI'], RESTRICTED: ['J'],
      POIS: [
        { id: 'scene', n: 'Cabine DJ', ic: 'dj', cat: 'scene', node: 'G', at: [82, 48], desc: 'DJ à partir de 22 h.', hours: '22:00 – 03:00' },
        { id: 'barS2', n: 'Bar de la Selva', ic: 'cocktail', cat: 'bar', node: 'E', at: [46, 54], hours: '20:00 – 02:45', bar: true },
        { id: 'resto', n: 'Restaurant', ic: 'restaurant', cat: 'food', node: 'H', at: [76, 34], desc: 'Service jusqu’à 23 h 30.', hours: '20:00 – 23:30' },
        { id: 'lounge', n: 'Îlot central', ic: 'lounge', cat: 'zone', node: 'F', at: [66, 46], desc: 'Banquettes autour du bar à plantes.' },
        { id: 'vip', n: 'Alcôve VIP', ic: 'sunglasses', cat: 'zone', node: 'J', at: [46, 30], desc: 'Sur réservation.', restricted: true },
        { id: 'jardin', n: 'Jardin d’hiver', ic: 'chill_zone', cat: 'zone', node: 'L', at: [24, 46], desc: 'Espace calme, végétalisé.' },
        { id: 'entree', n: 'Entrée', ic: 'entree', cat: 'service', node: 'A', at: [38, 86] },
        { id: 'vestiaire', n: 'Vestiaire', ic: 'vestiaire', cat: 'service', node: 'B', at: [52, 82] },
        { id: 'wc', n: 'Toilettes', ic: 'image_178', cat: 'service', node: 'I', at: [60, 24] }
      ],
      ZONES: [{ id: 'fosse', n: 'Piste (îlot)', cap: 110, occ: 0, at: [66, 50], r: 5 }, { id: 'bars', n: 'Bar', cap: 50, occ: 0, at: [48, 54], r: 4 }, { id: 'tables', n: 'Restaurant', cap: 80, occ: 0, at: [76, 36], r: 5 }, { id: 'rotonde', n: 'Jardin', cap: 40, occ: 0, at: [24, 48], r: 5 }],
      LINEUP: [{ s: 'scene', a: 'Dîner · live piano', st: 'Jazz', f: '20:00', t: '22:00' }, { s: 'scene', a: 'DJ Selva', st: 'Latin house', f: '22:00', t: '03:00' }],
      FRIENDS: [{ id: 'lea', n: 'Léa', col: '#0E9F8A', bat: 62, loop: 'DFGFD', speed: .015, acc: 2 }, { id: 'ines', n: 'Inès', col: '#E0457B', bat: 35, loop: 'EKE', speed: .012, acc: 2 }, { id: 'tom', n: 'Tom', col: '#F08C00', bat: 81, loop: 'HIH', speed: .012, acc: 2 }]
    }, stages: [['scene', 'Cabine DJ']], flows: [['ABCDE', 40], ['DFGH', 30], ['EKL', 12]] }
};
Object.assign(MENU, {
  barP: [['Champagne', [['Coupe', 18], ['Bouteille Brut', 160], ['Magnum', 320]]], ['Cocktails', [['Bisous Spritz', 16], ['Moscow mule', 16], ['Paloma', 16]]], ['Sans alcool', [['Virgin mojito', 10], ['Soft', 8], ['Eau 50 cl', 5]]]],
  barT: [['Cocktails', [['Spritz', 16], ['Gin tonic', 17]]], ['Bières', [['Pression 25 cl', 9]]], ['Sans alcool', [['Limonade maison', 8]]]],
  barS2: [['Signatures', [['Selva Negroni', 22], ['Jungle Mule', 20]]], ['Vins', [['Verre de rosé', 14], ['Champagne (coupe)', 24]]], ['Sans alcool', [['Mocktail du jour', 12]]]]
});
let VENUE = VENUES.bdf;
function defineReports(init) { const cur = init || ST.reports || []; ST._rv = ST._rv && !Array.isArray(ST._rv) ? ST._rv : { bdf: cur }; if (!ST._rv.bdf) ST._rv.bdf = cur;
  delete ST.reports; Object.defineProperty(ST, 'reports', { configurable: true, enumerable: false, get() { return (ST._rv[VENUE.id] = ST._rv[VENUE.id] || []); }, set(v) { ST._rv[VENUE.id] = v; } }); }
defineReports();
VENUES.bisous.staff = { nadia: 'F', hugo: 'B', karim: 'H', sarah: 'D', marc: 'C', lucas: 'E' };
VENUES.selva.staff = { nadia: 'F', hugo: 'A', karim: 'H', sarah: 'B', marc: 'D', lucas: 'E' };
STAFF.forEach(s => s.node0 = s.node);
const setArr = (a, b) => { a.splice(0, a.length, ...clone(b)); };
const setObj = (o, b) => { Object.keys(o).forEach(k => delete o[k]); Object.assign(o, clone(b)); };
function setVenue(id) {
  const v = VENUES[id]; if (!v) return; VENUE = v; const d = v.data;
  setObj(NODES, d.NODES); setArr(EDGES, d.EDGES); RESTRICTED.clear(); d.RESTRICTED.forEach(x => RESTRICTED.add(x)); setArr(POIS, d.POIS); setArr(ZONES, d.ZONES); setArr(LINEUP, d.LINEUP); setArr(FRIENDS, d.FRIENDS);
  Object.assign(EVENT, { name: v.name, place: v.place, date: v.date, hours: v.hours, capacity: v.capacity });
  STAFF.forEach(s => s.node = (v.staff && v.staff[s.id]) || s.node0); MAP_ASPECT = v.map.w / v.map.h; PCT_TO_M = v.m; FLOWS.splice(0, FLOWS.length, ...clone(v.flows)); buildGraph(); initFriends(); ST.me.pos = [...v.start]; ST.me.floor = 'club'; ST.rdv = null;
  logEv('Lieu : ' + v.name + ' (' + v.kind + ')');
}
