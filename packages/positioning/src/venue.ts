/**
 * Modèle de lieu ONEERA.
 *
 * Un lieu est décrit dans un repère local métrique (x vers l'est « du plan », y vers le nord « du plan »),
 * géoréférencé par une origine WGS84 et une rotation. Ce format est aussi le format d'intégration
 * d'un nouvel établissement (voir docs/venue-format.md).
 */
import { pointInPolygon, Polygon, Vec2, WallIndex, WallSegment } from './geometry';

export type ZoneKind =
  | 'dancefloor' | 'bar' | 'vip' | 'toilets' | 'corridor' | 'entrance' | 'exit'
  | 'outdoor' | 'stage' | 'smoking' | 'cloakroom' | 'staff' | 'stairs' | 'other';

export interface ZoneDef {
  id: string;
  name: string;
  kind: ZoneKind;
  polygon: Polygon;
  /** Capacité réglementaire ou opérationnelle (personnes), si connue. */
  capacity?: number;
  /** Zone interdite au public : aucune position visiteur ne doit y être affichée. */
  restricted?: boolean;
}

export interface FloorDef {
  id: string;
  name: string;
  level: number;
  /** Altitude du plancher relative au niveau 0 (m), utilisée par le baromètre. */
  heightM: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Surfaces praticables (union). */
  walkable: Polygon[];
  /** Obstacles non praticables à l'intérieur des surfaces (bar, scène, piliers…). */
  obstacles: Polygon[];
  /** Murs et cloisons (les portes sont des ouvertures). */
  walls: WallSegment[];
  zones: ZoneDef[];
  /** Emprise couverte (bâtiment) : le GNSS y est dégradé. */
  indoor: Polygon[];
}

export interface BeaconDef {
  /** Identifiant logique (ex. iBeacon UUID:major:minor ou Eddystone namespace:instance). */
  id: string;
  floorId: string;
  pos: Vec2;
  /** Puissance mesurée à 1 m (dBm) telle que calibrée sur site ; défaut iBeacon ≈ -59. */
  txPowerAt1m: number;
}

export interface PortalDef {
  id: string;
  kind: 'stairs' | 'elevator' | 'ramp';
  /** Zones d'accès sur chacun des deux étages reliés. */
  a: { floorId: string; area: Polygon };
  b: { floorId: string; area: Polygon };
}

export interface GeoRef {
  origin: { lat: number; lon: number };
  /** Angle (degrés, sens trigonométrique) entre l'axe x du plan et l'est géographique. */
  rotationDeg: number;
}

export interface VenueDef {
  id: string;
  name: string;
  georef?: GeoRef;
  floors: FloorDef[];
  beacons: BeaconDef[];
  portals: PortalDef[];
}

const EARTH_R = 6378137;

/** Conversion WGS84 ↔ repère local (plan tangent, valide à l'échelle d'un lieu). */
export function geoToLocal(ref: GeoRef, lat: number, lon: number): Vec2 {
  const lat0 = (ref.origin.lat * Math.PI) / 180;
  const e = ((lon - ref.origin.lon) * Math.PI) / 180 * EARTH_R * Math.cos(lat0);
  const n = ((lat - ref.origin.lat) * Math.PI) / 180 * EARTH_R;
  const r = (-ref.rotationDeg * Math.PI) / 180;
  return { x: e * Math.cos(r) - n * Math.sin(r), y: e * Math.sin(r) + n * Math.cos(r) };
}

export function localToGeo(ref: GeoRef, p: Vec2): { lat: number; lon: number } {
  const r = (ref.rotationDeg * Math.PI) / 180;
  const e = p.x * Math.cos(r) - p.y * Math.sin(r);
  const n = p.x * Math.sin(r) + p.y * Math.cos(r);
  const lat0 = (ref.origin.lat * Math.PI) / 180;
  return {
    lat: ref.origin.lat + (n / EARTH_R) * (180 / Math.PI),
    lon: ref.origin.lon + (e / (EARTH_R * Math.cos(lat0))) * (180 / Math.PI),
  };
}

/** Grille d'occupation d'un étage : praticabilité, zone, intérieur/extérieur. */
export class FloorGrid {
  readonly cols: number;
  readonly rows: number;
  /** 1 = praticable par le public. */
  readonly walkable: Uint8Array;
  /** Index de zone + 1 (0 = aucune zone). */
  readonly zone: Uint16Array;
  readonly indoor: Uint8Array;
  readonly walls: WallIndex;
  readonly walkableCells: Int32Array;

  constructor(readonly floor: FloorDef, readonly res: number) {
    const { minX, minY, maxX, maxY } = floor.bounds;
    this.cols = Math.ceil((maxX - minX) / res);
    this.rows = Math.ceil((maxY - minY) / res);
    const n = this.cols * this.rows;
    this.walkable = new Uint8Array(n);
    this.zone = new Uint16Array(n);
    this.indoor = new Uint8Array(n);
    this.walls = new WallIndex(floor.walls);
    const list: number[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const p = this.cellCenter(c, r);
        const i = r * this.cols + c;
        let z = 0;
        floor.zones.forEach((zd, zi) => {
          if (!z && pointInPolygon(p, zd.polygon)) z = zi + 1;
        });
        this.zone[i] = z;
        this.indoor[i] = floor.indoor.some((poly) => pointInPolygon(p, poly)) ? 1 : 0;
        const inWalk = floor.walkable.some((poly) => pointInPolygon(p, poly));
        const inObs = floor.obstacles.some((poly) => pointInPolygon(p, poly));
        const restricted = z > 0 && floor.zones[z - 1].restricted === true;
        if (inWalk && !inObs && !restricted && !this.cellTouchesWall(c, r)) {
          this.walkable[i] = 1;
          list.push(i);
        }
      }
    }
    this.walkableCells = Int32Array.from(list);
  }

  private cellTouchesWall(c: number, r: number): boolean {
    const { minX, minY } = this.floor.bounds;
    const x0 = minX + c * this.res;
    const y0 = minY + r * this.res;
    const x1 = x0 + this.res;
    const y1 = y0 + this.res;
    // Un mur qui traverse la cellule (diagonales ou bords) la rend non praticable.
    return (
      this.walls.crosses(x0, y0, x1, y1) || this.walls.crosses(x1, y0, x0, y1) ||
      this.walls.crosses(x0, y0, x1, y0) || this.walls.crosses(x0, y0, x0, y1)
    );
  }

  cellCenter(c: number, r: number): Vec2 {
    return {
      x: this.floor.bounds.minX + (c + 0.5) * this.res,
      y: this.floor.bounds.minY + (r + 0.5) * this.res,
    };
  }

  cellOf(x: number, y: number): number {
    const c = Math.floor((x - this.floor.bounds.minX) / this.res);
    const r = Math.floor((y - this.floor.bounds.minY) / this.res);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  isWalkable(x: number, y: number): boolean {
    const i = this.cellOf(x, y);
    return i >= 0 && this.walkable[i] === 1;
  }

  zoneAt(x: number, y: number): ZoneDef | undefined {
    const i = this.cellOf(x, y);
    if (i < 0) return undefined;
    const z = this.zone[i];
    return z ? this.floor.zones[z - 1] : undefined;
  }

  isIndoor(x: number, y: number): boolean {
    const i = this.cellOf(x, y);
    return i >= 0 && this.indoor[i] === 1;
  }

  /** Cellule praticable la plus proche (recherche en anneaux), ou -1. */
  nearestWalkable(x: number, y: number, maxRadiusM = 15): number {
    const c0 = Math.floor((x - this.floor.bounds.minX) / this.res);
    const r0 = Math.floor((y - this.floor.bounds.minY) / this.res);
    const maxK = Math.ceil(maxRadiusM / this.res);
    let best = -1;
    let bestD = Infinity;
    for (let k = 0; k <= maxK; k++) {
      for (let dc = -k; dc <= k; dc++) {
        for (let dr = -k; dr <= k; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== k) continue;
          const c = c0 + dc;
          const r = r0 + dr;
          if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
          const i = r * this.cols + c;
          if (!this.walkable[i]) continue;
          const p = this.cellCenter(c, r);
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
      if (best >= 0 && bestD <= k * this.res) return best;
    }
    return best;
  }

  centerOfIndex(i: number): Vec2 {
    return this.cellCenter(i % this.cols, Math.floor(i / this.cols));
  }
}

/** Lieu compilé : grilles par étage, index des balises, portails. */
export class Venue {
  readonly grids = new Map<string, FloorGrid>();
  readonly floorIndex = new Map<string, number>();
  readonly beaconIndex = new Map<string, number>();

  constructor(readonly def: VenueDef, readonly res = 0.5) {
    def.floors.forEach((f, i) => {
      this.floorIndex.set(f.id, i);
      this.grids.set(f.id, new FloorGrid(f, res));
    });
    def.beacons.forEach((b, i) => this.beaconIndex.set(b.id, i));
  }

  grid(floorId: string): FloorGrid {
    const g = this.grids.get(floorId);
    if (!g) throw new Error(`Étage inconnu : ${floorId}`);
    return g;
  }

  floorByIndex(i: number): FloorDef {
    return this.def.floors[i];
  }

  /** Portail (escalier/ascenseur) dont l'aire contient le point, s'il existe. */
  portalAt(floorId: string, p: Vec2): { portal: PortalDef; to: string; toArea: Polygon } | undefined {
    for (const portal of this.def.portals) {
      if (portal.a.floorId === floorId && pointInPolygon(p, portal.a.area)) {
        return { portal, to: portal.b.floorId, toArea: portal.b.area };
      }
      if (portal.b.floorId === floorId && pointInPolygon(p, portal.b.area)) {
        return { portal, to: portal.a.floorId, toArea: portal.a.area };
      }
    }
    return undefined;
  }
}
