/**
 * « Club de test » synthétique, 2 niveaux, inspiré de la typologie des clubs étudiés
 * (salle principale + scène, bar, VIP, toilettes, hall d'entrée, local staff interdit, terrasse fumeurs,
 * mezzanine). Ce n'est PAS le plan d'un client : il sert à la mesure reproductible du moteur.
 */
import { rect, VenueDef, WallSegment } from '@oneera/positioning';

type Side = 'S' | 'N' | 'W' | 'E';
interface Gap {
  side: Side;
  from: number;
  to: number;
}

/** Murs d'une pièce rectangulaire avec ouvertures (portes). */
export function roomWalls(x0: number, y0: number, x1: number, y1: number, gaps: Gap[] = []): WallSegment[] {
  const out: WallSegment[] = [];
  const side = (s: Side, a: number, b: number, mk: (u: number, v: number) => WallSegment) => {
    const gs = gaps.filter((g) => g.side === s).sort((p, q) => p.from - q.from);
    let cur = a;
    for (const g of gs) {
      if (g.from > cur) out.push(mk(cur, g.from));
      cur = Math.max(cur, g.to);
    }
    if (cur < b) out.push(mk(cur, b));
  };
  side('S', x0, x1, (u, v) => [u, y0, v, y0]);
  side('N', x0, x1, (u, v) => [u, y1, v, y1]);
  side('W', y0, y1, (u, v) => [x0, u, x0, v]);
  side('E', y0, y1, (u, v) => [x1, u, x1, v]);
  return out;
}

export function buildTestClub(): VenueDef {
  const walls0: WallSegment[] = [
    // Enveloppe du bâtiment (y 6..34), porte principale au sud du hall.
    ...roomWalls(0, 6, 50, 34, [{ side: 'S', from: 23, to: 27 }]),
    // Hall (10..40 × 6..12) → salle principale par deux portes ; vers le vestiaire / escalier à l'est ouvert.
    [10, 12, 14, 12], [17, 12, 33, 12], [36, 12, 40, 12],
    [10, 6, 10, 8], [10, 10, 10, 12], // passage hall ↔ couloir ouest
    // Bar (40..50 × 12..24) : porte vers la salle (x=40, y 16..19), vers les toilettes (y=24, x 43..45).
    [40, 12, 40, 16], [40, 19, 40, 24],
    [40, 24, 43, 24], [45, 24, 50, 24],
    [40, 12, 50, 12],
    // Toilettes (40..50 × 24..34) : fermées sauf porte vers le bar.
    [40, 24, 40, 34],
    // VIP (0..10 × 20..34) : porte vers la salle (x=10, y 22..25).
    [10, 20, 10, 22], [10, 25, 10, 34], [0, 20, 10, 20],
    // Local staff (0..10 × 12..20) : interdit au public, porte (x=10, y 15..17) — on la garde fermée pour le public.
    [10, 12, 10, 20], [0, 12, 10, 12],
    // Escalier/vestiaire à l'est du hall (36..40 × 6..12) : ouvert sur le hall.
    [40, 6, 40, 12],
  ];
  const zones0 = [
    { id: 'terrace', name: 'Terrasse fumeurs', kind: 'smoking' as const, polygon: rect(0, 0, 50, 6), capacity: 120 },
    { id: 'hall', name: "Hall d'entrée", kind: 'entrance' as const, polygon: rect(10, 6, 36, 12), capacity: 80 },
    { id: 'stairs0', name: 'Escalier', kind: 'stairs' as const, polygon: rect(36, 6, 40, 12) },
    { id: 'main', name: 'Dancefloor', kind: 'dancefloor' as const, polygon: rect(10, 12, 40, 34), capacity: 450 },
    { id: 'bar', name: 'Bar', kind: 'bar' as const, polygon: rect(40, 12, 50, 24), capacity: 90 },
    { id: 'wc', name: 'Toilettes', kind: 'toilets' as const, polygon: rect(40, 24, 50, 34), capacity: 30 },
    { id: 'vip', name: 'Carré VIP', kind: 'vip' as const, polygon: rect(0, 20, 10, 34), capacity: 60 },
    { id: 'staff', name: 'Local staff', kind: 'staff' as const, polygon: rect(0, 12, 10, 20), restricted: true },
    { id: 'west', name: 'Couloir ouest', kind: 'corridor' as const, polygon: rect(0, 6, 10, 12) },
  ];
  const walls1: WallSegment[] = [
    // Mezzanine (10..40 × 6..16) au-dessus du hall, balcon ouvert au nord (garde-corps = mur).
    ...roomWalls(10, 6, 40, 16),
    [36, 6, 36, 10],
  ];
  return {
    id: 'test-club',
    name: 'Club de test (synthétique)',
    georef: { origin: { lat: 43.5513, lon: 7.0128 }, rotationDeg: 0 },
    floors: [
      {
        id: 'L0', name: 'Rez-de-chaussée', level: 0, heightM: 0,
        bounds: { minX: -2, minY: -2, maxX: 52, maxY: 36 },
        walkable: [rect(0, 0, 50, 34)],
        obstacles: [
          rect(20, 31, 30, 34), // scène
          rect(47, 14, 49.5, 22), // comptoir du bar
          rect(24, 20, 26, 22), // pilier
        ],
        walls: walls0,
        zones: zones0,
        indoor: [rect(0, 6, 50, 34)],
      },
      {
        id: 'L1', name: 'Mezzanine', level: 1, heightM: 4,
        bounds: { minX: 8, minY: 4, maxX: 42, maxY: 18 },
        walkable: [rect(10, 6, 40, 16)],
        obstacles: [rect(18, 13, 30, 15)], // banquettes
        walls: walls1,
        zones: [
          { id: 'lounge', name: 'Mezzanine lounge', kind: 'vip', polygon: rect(10, 6, 36, 16), capacity: 80 },
          { id: 'stairs1', name: 'Escalier (haut)', kind: 'stairs', polygon: rect(36, 6, 40, 16) },
        ],
        indoor: [rect(10, 6, 40, 16)],
      },
    ],
    portals: [
      { id: 'st', kind: 'stairs', a: { floorId: 'L0', area: rect(37, 7, 39.5, 11) }, b: { floorId: 'L1', area: rect(37, 7, 39.5, 11) } },
    ],
    beacons: [
      // Rez-de-chaussée : ~1 balise / 70 m², posées à ~2,5 m, en murs/plafond.
      ...[
        [3, 1], [25, 1], [47, 1], // terrasse
        [15, 9], [30, 9], [5, 9], // hall / couloir
        [15, 16], [25, 16], [35, 16], [15, 27], [25, 27], [35, 27], // salle principale
        [45, 15], [45, 21], // bar
        [45, 29], // toilettes
        [5, 23], [5, 31], // VIP
      ].map(([x, y], i) => ({ id: `B0-${String(i + 1).padStart(2, '0')}`, floorId: 'L0', pos: { x, y }, txPowerAt1m: -59 })),
      ...[
        [14, 11], [26, 11], [36, 13],
      ].map(([x, y], i) => ({ id: `B1-${String(i + 1).padStart(2, '0')}`, floorId: 'L1', pos: { x, y }, txPowerAt1m: -59 })),
    ],
  };
}
