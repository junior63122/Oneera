/** Primitives géométriques 2D (repère local métrique du lieu, en mètres). */

export interface Vec2 {
  x: number;
  y: number;
}

export type Polygon = Vec2[];

/** Segment de mur [x1, y1, x2, y2]. */
export type WallSegment = [number, number, number, number];

export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
  (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/** Vrai si les segments [p1,p2] et [q1,q2] se coupent (contact inclus). */
export function segmentsIntersect(
  p1x: number, p1y: number, p2x: number, p2y: number,
  q1x: number, q1y: number, q2x: number, q2y: number,
): boolean {
  const d1 = orient(q1x, q1y, q2x, q2y, p1x, p1y);
  const d2 = orient(q1x, q1y, q2x, q2y, p2x, p2y);
  const d3 = orient(p1x, p1y, p2x, p2y, q1x, q1y);
  const d4 = orient(p1x, p1y, p2x, p2y, q2x, q2y);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  const onSeg = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    Math.min(ax, bx) - 1e-9 <= cx && cx <= Math.max(ax, bx) + 1e-9 &&
    Math.min(ay, by) - 1e-9 <= cy && cy <= Math.max(ay, by) + 1e-9;
  if (d1 === 0 && onSeg(q1x, q1y, q2x, q2y, p1x, p1y)) return true;
  if (d2 === 0 && onSeg(q1x, q1y, q2x, q2y, p2x, p2y)) return true;
  if (d3 === 0 && onSeg(p1x, p1y, p2x, p2y, q1x, q1y)) return true;
  if (d4 === 0 && onSeg(p1x, p1y, p2x, p2y, q2x, q2y)) return true;
  return false;
}

export function polygonArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  }
  return Math.abs(a / 2);
}

export function polygonCentroid(poly: Polygon): Vec2 {
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  return { x: x / poly.length, y: y / poly.length };
}

export const rect = (x0: number, y0: number, x1: number, y1: number): Polygon => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

/** Index spatial uniforme pour les murs : test de franchissement en O(cellules traversées). */
export class WallIndex {
  private readonly cells = new Map<number, number[]>();
  constructor(readonly walls: WallSegment[], private readonly cellSize = 2) {
    walls.forEach((w, i) => {
      const [x0, y0, x1, y1] = w;
      const cx0 = Math.floor(Math.min(x0, x1) / cellSize);
      const cx1 = Math.floor(Math.max(x0, x1) / cellSize);
      const cy0 = Math.floor(Math.min(y0, y1) / cellSize);
      const cy1 = Math.floor(Math.max(y0, y1) / cellSize);
      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cy = cy0; cy <= cy1; cy++) {
          const k = this.key(cx, cy);
          let arr = this.cells.get(k);
          if (!arr) this.cells.set(k, (arr = []));
          arr.push(i);
        }
      }
    });
  }

  private key(cx: number, cy: number): number {
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  /** Vrai si le déplacement a→b traverse au moins un mur. */
  crosses(ax: number, ay: number, bx: number, by: number): boolean {
    return this.countCrossings(ax, ay, bx, by, 1) > 0;
  }

  /** Nombre de murs traversés par le segment (plafonné à `cap`). */
  countCrossings(ax: number, ay: number, bx: number, by: number, cap = Infinity): number {
    const cs = this.cellSize;
    const cx0 = Math.floor(Math.min(ax, bx) / cs);
    const cx1 = Math.floor(Math.max(ax, bx) / cs);
    const cy0 = Math.floor(Math.min(ay, by) / cs);
    const cy1 = Math.floor(Math.max(ay, by) / cs);
    const seen = new Set<number>();
    let n = 0;
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (const i of arr) {
          if (seen.has(i)) continue;
          seen.add(i);
          const w = this.walls[i];
          if (segmentsIntersect(ax, ay, bx, by, w[0], w[1], w[2], w[3])) {
            if (++n >= cap) return n;
          }
        }
      }
    }
    return n;
  }
}
