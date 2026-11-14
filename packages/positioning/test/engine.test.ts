import { describe, expect, it } from 'vitest';
import {
  DisplayTracker, findRoute, lineOfSight, geoToLocal, localToGeo, PositioningEngine, proximity, RadioMap, rect, segmentsIntersect,
  Venue, VenueDef, WallIndex,
} from '../src';

/** Deux pièces 10×10 séparées par un mur avec une porte (y 4..6). */
function twoRooms(): VenueDef {
  return {
    id: 't', name: 'Deux salles',
    georef: { origin: { lat: 43.55, lon: 7.01 }, rotationDeg: 15 },
    floors: [{
      id: 'L0', name: 'RDC', level: 0, heightM: 0,
      bounds: { minX: 0, minY: 0, maxX: 20, maxY: 10 },
      walkable: [rect(0, 0, 20, 10)],
      obstacles: [],
      walls: [[0, 0, 20, 0], [0, 10, 20, 10], [0, 0, 0, 10], [20, 0, 20, 10], [10, 0, 10, 4], [10, 6, 10, 10]],
      zones: [
        { id: 'A', name: 'Salle A', kind: 'bar', polygon: rect(0, 0, 10, 10) },
        { id: 'B', name: 'Salle B', kind: 'dancefloor', polygon: rect(10, 0, 20, 10) },
      ],
      indoor: [rect(0, 0, 20, 10)],
    }],
    beacons: [
      { id: 'a1', floorId: 'L0', pos: { x: 2, y: 2 }, txPowerAt1m: -59 },
      { id: 'a2', floorId: 'L0', pos: { x: 8, y: 8 }, txPowerAt1m: -59 },
      { id: 'b1', floorId: 'L0', pos: { x: 12, y: 2 }, txPowerAt1m: -59 },
      { id: 'b2', floorId: 'L0', pos: { x: 18, y: 8 }, txPowerAt1m: -59 },
    ],
    portals: [],
  };
}

describe('géométrie', () => {
  it('détecte les intersections de segments', () => {
    expect(segmentsIntersect(0, 0, 2, 2, 0, 2, 2, 0)).toBe(true);
    expect(segmentsIntersect(0, 0, 1, 0, 0, 1, 1, 1)).toBe(false);
  });
  it('compte les murs traversés', () => {
    const idx = new WallIndex([[5, -10, 5, 10], [7, -10, 7, 10]]);
    expect(idx.countCrossings(0, 0, 10, 0)).toBe(2);
    expect(idx.crosses(0, 0, 4, 0)).toBe(false);
  });
  it('convertit WGS84 ↔ repère local de façon réversible', () => {
    const ref = { origin: { lat: 43.55, lon: 7.01 }, rotationDeg: 23 };
    const g = localToGeo(ref, { x: 35, y: -12 });
    const p = geoToLocal(ref, g.lat, g.lon);
    expect(p.x).toBeCloseTo(35, 3);
    expect(p.y).toBeCloseTo(-12, 3);
  });
});

describe('lieu et itinéraires', () => {
  const venue = new Venue(twoRooms(), 0.5);
  it('rend non praticables les cellules traversées par un mur', () => {
    const g = venue.grid('L0');
    expect(g.isWalkable(10, 2)).toBe(false);
    expect(g.isWalkable(10.0, 5)).toBe(true); // porte
    expect(g.isWalkable(5, 5)).toBe(true);
  });
  it("la ligne de vue refuse de frôler un montant de porte (cellule bloquée)", () => {
    const g = venue.grid('L0');
    // Le montant du haut de la porte (10, 6) bloque les cellules qui le touchent.
    expect(g.isWalkable(9.75, 6.25)).toBe(false);
    expect(lineOfSight(g, { x: 9.2, y: 6.9 }, { x: 10.9, y: 5.4 })).toBe(false);
    expect(lineOfSight(g, { x: 8, y: 5 }, { x: 12, y: 5 })).toBe(true);
  });
  it("passe par la porte au lieu de traverser le mur", () => {
    const r = findRoute(venue, { floorId: 'L0', x: 5, y: 1 }, { floorId: 'L0', x: 15, y: 1 })!;
    expect(r).not.toBeNull();
    expect(r.lengthM).toBeGreaterThan(10.5); // détour par la porte
    const g = venue.grid('L0');
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1];
      const b = r.points[i];
      expect(g.walls.crosses(a.x, a.y, b.x, b.y)).toBe(false);
    }
    expect(r.steps.at(-1)!.text).toContain('Salle B');
  });
});

describe('moteur de localisation', () => {
  const venue = new Venue(twoRooms(), 0.5);
  const radio = new RadioMap(venue);
  const obsAt = (x: number, y: number) =>
    venue.def.beacons.map((b) => ({ beaconId: b.id, rssi: Math.round(radio.expectedAt(venue.beaconIndex.get(b.id)!, 0, venue.grid('L0').cellOf(x, y))), count: 5 }));

  it("n'émet aucune position avant toute mesure", () => {
    const e = new PositioningEngine(venue, radio, { particles: 300 });
    const est = e.estimate(0);
    expect(est.quality).toBe('unknown');
    expect(Number.isFinite(est.x)).toBe(false);
  });

  it('localise dans la bonne salle avec des mesures cohérentes', () => {
    const e = new PositioningEngine(venue, radio, { particles: 800, seed: 3 });
    for (let t = 0; t < 8; t++) e.updateBle(t, obsAt(15, 7));
    const est = e.estimate(8);
    expect(est.zoneId).toBe('B');
    expect(Math.hypot(est.x - 15, est.y - 7)).toBeLessThan(3);
    expect(venue.grid('L0').isWalkable(est.x, est.y)).toBe(true);
  });

  it("dégrade honnêtement la confiance quand les mesures cessent", () => {
    const e = new PositioningEngine(venue, radio, { particles: 500, seed: 4 });
    for (let t = 0; t < 5; t++) e.updateBle(t, obsAt(5, 5));
    const fresh = e.estimate(5);
    const old = e.estimate(65);
    expect(old.r68).toBeGreaterThan(fresh.r68 + 30);
    expect(old.quality).toBe('unknown');
  });

  it("ignore les balises inconnues et les RSSI aberrants", () => {
    const e = new PositioningEngine(venue, radio, { particles: 300 });
    e.updateBle(0, [{ beaconId: 'inconnue', rssi: -60 }, { beaconId: 'a1', rssi: 12 }]);
    expect(e.isInitialized).toBe(false);
  });
});

describe("affichage de l'avatar", () => {
  const venue = new Venue(twoRooms(), 0.5);
  const est = (x: number, y: number, t = 0) => ({
    t, floorId: 'L0', x, y, r68: 2, r95: 4, zoneProb: 1, floorProb: 1, quality: 'precise' as const, ageS: 0,
    sources: { ble: 4, gnss: false, pdr: true },
  });
  it("contourne le mur et ne saute jamais de plus que la vitesse max", () => {
    const tr = new DisplayTracker(venue);
    tr.setTarget(est(5, 1));
    tr.tick(0.1);
    tr.setTarget(est(15, 1));
    const g = venue.grid('L0');
    let prev = { ...tr.current };
    for (let i = 0; i < 200; i++) {
      const s = tr.tick(1 / 30);
      const step = Math.hypot(s.x - prev.x, s.y - prev.y);
      expect(step).toBeLessThanOrEqual(2.2 / 30 + 1e-6);
      expect(g.walls.crosses(prev.x, prev.y, s.x, s.y)).toBe(false);
      prev = { ...s };
    }
    expect(Math.hypot(prev.x - 15, prev.y - 1)).toBeLessThan(0.5);
  });
});

describe('proximité entre amis', () => {
  const venue = new Venue(twoRooms(), 0.5);
  const e = (x: number, y: number, r68: number, ageS = 0) => ({
    t: 0, floorId: 'L0', x, y, r68, r95: r68 * 2, zoneId: venue.grid('L0').zoneAt(x, y)?.id, zoneProb: 0.9, floorProb: 1,
    quality: 'precise' as const, ageS, sources: { ble: 4, gnss: false, pdr: true },
  });
  it("arrondit la distance à la précision disponible", () => {
    const p = proximity(venue, e(2, 2, 2), e(17, 8, 9));
    expect(p.label).toMatch(/≈ \d+ m/);
    expect(p.distanceM).toBeGreaterThan(15);
  });
  it('signale une position obsolète au lieu de l’afficher', () => {
    const p = proximity(venue, e(2, 2, 2), e(17, 8, 2, 600));
    expect(p.level).toBe('stale');
    expect(p.label).toContain('10 min');
  });
});
