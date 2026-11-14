/**
 * Itinéraires dans le lieu (A* sur grille praticable + lissage par visibilité, multi-étages via portails).
 * Sert à : (1) guider vers un ami ou un point de rendez-vous ; (2) faire « marcher » l'avatar
 * affiché le long d'un chemin réel au lieu de le faire glisser à travers les murs.
 */
import { pointInPolygon, polygonCentroid, Vec2 } from './geometry';
import { FloorGrid, Venue } from './venue';

export interface RoutePoint extends Vec2 {
  floorId: string;
}

export interface Route {
  points: RoutePoint[];
  lengthM: number;
  /** Étapes compréhensibles en intérieur (zones traversées, changements d'étage). */
  steps: RouteStep[];
}

export interface RouteStep {
  kind: 'walk' | 'stairs' | 'elevator' | 'arrive';
  text: string;
  zoneId?: string;
  floorId: string;
  distanceM: number;
}

class MinHeap {
  private k: number[] = [];
  private v: number[] = [];
  get size() {
    return this.k.length;
  }
  push(key: number, val: number) {
    const k = this.k;
    const v = this.v;
    k.push(key);
    v.push(val);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): number {
    const k = this.k;
    const v = this.v;
    const top = v[0];
    const lk = k.pop()!;
    const lv = v.pop()!;
    if (k.length) {
      k[0] = lk;
      v[0] = lv;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Ligne de vue praticable entre deux points du même étage. */
export function lineOfSight(g: FloorGrid, a: Vec2, b: Vec2): boolean {
  if (g.walls.crosses(a.x, a.y, b.x, b.y)) return false;
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d / (g.res * 0.5)));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (!g.isWalkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/** A* sur un étage. Renvoie une polyligne lissée, ou null si inaccessible. */
export function findPathOnFloor(g: FloorGrid, from: Vec2, to: Vec2): Vec2[] | null {
  const s = g.walkable[g.cellOf(from.x, from.y)] ? g.cellOf(from.x, from.y) : g.nearestWalkable(from.x, from.y);
  const t = g.walkable[g.cellOf(to.x, to.y)] ? g.cellOf(to.x, to.y) : g.nearestWalkable(to.x, to.y);
  if (s < 0 || t < 0) return null;
  const cols = g.cols;
  const n = cols * g.rows;
  const gScore = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const tc = g.centerOfIndex(t);
  const h = (i: number) => {
    const p = g.centerOfIndex(i);
    const dx = Math.abs(p.x - tc.x);
    const dy = Math.abs(p.y - tc.y);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const heap = new MinHeap();
  gScore[s] = 0;
  heap.push(h(s), s);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (heap.size) {
    const cur = heap.pop();
    if (cur === t) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % cols;
    const cr = (cur - cc) / cols;
    for (const [dc, dr] of dirs) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= g.rows) continue;
      const ni = nr * cols + nc;
      if (!g.walkable[ni] || closed[ni]) continue;
      if (dc && dr && (!g.walkable[cr * cols + nc] || !g.walkable[nr * cols + cc])) continue; // pas de coupe d'angle
      const a = g.centerOfIndex(cur);
      const b = g.centerOfIndex(ni);
      if (g.walls.crosses(a.x, a.y, b.x, b.y)) continue;
      const ng = gScore[cur] + (dc && dr ? Math.SQRT2 : 1) * g.res;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        came[ni] = cur;
        heap.push(ng + h(ni), ni);
      }
    }
  }
  if (s !== t && came[t] < 0) return null;
  const cells: number[] = [];
  for (let c = t; c >= 0; c = c === s ? -1 : came[c]) cells.push(c);
  cells.reverse();
  const raw: Vec2[] = [from, ...cells.map((c) => g.centerOfIndex(c)), to].filter((p, i, arr) =>
    i === 0 || Math.hypot(p.x - arr[i - 1].x, p.y - arr[i - 1].y) > 1e-6);
  // Lissage « string pulling » : on ne garde que les sommets nécessaires à la ligne de vue.
  const out: Vec2[] = [raw[0]];
  let anchor = 0;
  for (let i = 2; i < raw.length; i++) {
    if (!lineOfSight(g, raw[anchor], raw[i])) {
      out.push(raw[i - 1]);
      anchor = i - 1;
    }
  }
  out.push(raw[raw.length - 1]);
  return out;
}

const polyLen = (pts: Vec2[]) => pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

/** Itinéraire complet, éventuellement multi-étages, avec étapes lisibles. */
export function findRoute(venue: Venue, from: RoutePoint, to: RoutePoint): Route | null {
  if (from.floorId === to.floorId) {
    const pts = findPathOnFloor(venue.grid(from.floorId), from, to);
    if (!pts) return null;
    return finalize(venue, pts.map((p) => ({ ...p, floorId: from.floorId })));
  }
  // Recherche en largeur sur le graphe des étages (portails), puis meilleure combinaison.
  let best: RoutePoint[] | null = null;
  let bestLen = Infinity;
  const explore = (cur: RoutePoint, path: RoutePoint[], visited: Set<string>) => {
    if (cur.floorId === to.floorId) {
      const pts = findPathOnFloor(venue.grid(cur.floorId), cur, to);
      if (!pts) return;
      const full = [...path, ...pts.map((p) => ({ ...p, floorId: cur.floorId }))];
      const len = routeLength(full);
      if (len < bestLen) {
        bestLen = len;
        best = full;
      }
      return;
    }
    for (const portal of venue.def.portals) {
      for (const [here, there] of [[portal.a, portal.b], [portal.b, portal.a]] as const) {
        if (here.floorId !== cur.floorId || visited.has(there.floorId)) continue;
        const entry = polygonCentroid(here.area);
        const pts = findPathOnFloor(venue.grid(cur.floorId), cur, entry);
        if (!pts) continue;
        const exit = { ...polygonCentroid(there.area), floorId: there.floorId };
        const seg = pts.map((p) => ({ ...p, floorId: cur.floorId }));
        explore(exit, [...path, ...seg, exit], new Set([...visited, there.floorId]));
      }
    }
  };
  explore(from, [], new Set([from.floorId]));
  return best ? finalize(venue, best) : null;
}

function routeLength(pts: RoutePoint[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].floorId === pts[i - 1].floorId) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    else l += 8; // coût forfaitaire d'un changement d'étage
  }
  return l;
}

function finalize(venue: Venue, points: RoutePoint[]): Route {
  const steps: RouteStep[] = [];
  let acc = 0;
  let curZone: string | undefined;
  let curFloor = points[0].floorId;
  const zoneName = (floorId: string, p: Vec2) => venue.grid(floorId).zoneAt(p.x, p.y);
  // Échantillonnage le long du chemin pour détecter les zones traversées.
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.floorId !== b.floorId) {
      const portal = venue.def.portals.find((p) =>
        (p.a.floorId === a.floorId && pointInPolygon(a, p.a.area)) || (p.b.floorId === a.floorId && pointInPolygon(a, p.b.area)));
      const floor = venue.def.floors.find((f) => f.id === b.floorId)!;
      steps.push({
        kind: portal?.kind === 'elevator' ? 'elevator' : 'stairs',
        text: `${portal?.kind === 'elevator' ? "Prendre l'ascenseur" : "Prendre l'escalier"} jusqu'à « ${floor.name} »`,
        floorId: b.floorId,
        distanceM: 0,
      });
      curFloor = b.floorId;
      curZone = undefined;
      continue;
    }
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d));
    for (let k = 1; k <= n; k++) {
      const p = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n };
      acc += d / n;
      const z = zoneName(curFloor, p);
      if (z && z.id !== curZone) {
        if (curZone !== undefined) {
          steps.push({ kind: 'walk', text: `Rejoindre « ${z.name} »`, zoneId: z.id, floorId: curFloor, distanceM: Math.round(acc) });
          acc = 0;
        }
        curZone = z.id;
      }
    }
  }
  const last = points[points.length - 1];
  const lz = zoneName(last.floorId, last);
  steps.push({ kind: 'arrive', text: lz ? `Arrivée : « ${lz.name} »` : 'Arrivée', zoneId: lz?.id, floorId: last.floorId, distanceM: Math.round(acc) });
  return { points, lengthM: routeLength(points), steps };
}

export { polyLen as polylineLength };
