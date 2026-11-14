/** Générateur pseudo-aléatoire déterministe (mulberry32) — reproductibilité des tests et du banc. */
export class Rng {
  private s: number;
  private spare: number | null = null;

  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }

  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Loi normale (Box–Muller). */
  normal(mean = 0, sd = 1): number {
    if (this.spare !== null) {
      const v = this.spare;
      this.spare = null;
      return mean + sd * v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const m = Math.sqrt(-2 * Math.log(u));
    this.spare = m * Math.sin(2 * Math.PI * v);
    return mean + sd * m * Math.cos(2 * Math.PI * v);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
