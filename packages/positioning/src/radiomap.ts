/**
 * Carte radio : RSSI attendu de chaque balise en chaque cellule de chaque étage.
 *
 * Deux sources, combinables :
 *  1. Modèle physique a priori : affaiblissement log-distance + pertes par mur traversé + pertes inter-étages
 *     + atténuation due à la foule (le corps humain absorbe fortement à 2,4 GHz).
 *  2. Calibration terrain (relevé « fingerprinting ») : on corrige le modèle par les résidus mesurés,
 *     interpolés par pondération inverse à la distance. C'est ce relevé qui fait passer d'une
 *     précision « salle » à une précision de quelques mètres — il est indispensable sur site réel.
 */
import { Venue } from './venue';

export interface PathLossParams {
  /** Exposant d'affaiblissement (2 en espace libre, 2–3.5 en intérieur). */
  exponent: number;
  /** Perte par mur/cloison traversé (dB). */
  wallLossDb: number;
  /** Nombre maximal de murs comptés. */
  maxWalls: number;
  /** Perte par étage traversé (dB). */
  floorLossDb: number;
  /** Atténuation linéique due à la foule (dB/m). */
  crowdLossDbPerM: number;
  /** Écart-type du modèle (dB) : à ajuster après calibration. */
  sigmaDb: number;
}

export const DEFAULT_PATH_LOSS: PathLossParams = {
  exponent: 2.2,
  wallLossDb: 5,
  maxWalls: 3,
  floorLossDb: 18,
  crowdLossDbPerM: 0.25,
  sigmaDb: 7,
};

export interface CalibrationSample {
  floorId: string;
  x: number;
  y: number;
  beaconId: string;
  /** RSSI moyen mesuré au point (dBm). */
  rssi: number;
}

export class RadioMap {
  /** expected[beacon][floor] = RSSI attendu par cellule (dBm). */
  readonly expected: Float32Array[][];
  /** Écart-type par balise (peut être réduit après calibration). */
  readonly sigma: Float32Array;
  calibrated = false;

  constructor(readonly venue: Venue, readonly params: PathLossParams = DEFAULT_PATH_LOSS) {
    const floors = venue.def.floors;
    this.sigma = new Float32Array(venue.def.beacons.length).fill(params.sigmaDb);
    this.expected = venue.def.beacons.map((b) => {
      const bf = venue.floorIndex.get(b.floorId)!;
      return floors.map((f, fi) => {
        const g = venue.grid(f.id);
        const bGrid = venue.grid(b.floorId);
        const out = new Float32Array(g.cols * g.rows);
        const floorsCrossed = Math.abs(floors[bf].level - f.level);
        for (let r = 0; r < g.rows; r++) {
          for (let c = 0; c < g.cols; c++) {
            const p = g.cellCenter(c, r);
            const dz = Math.abs(floors[bf].heightM - f.heightM) + 1.0; // balise ~2,5 m, téléphone ~1,5 m
            const d = Math.max(0.5, Math.hypot(p.x - b.pos.x, p.y - b.pos.y, dz));
            const walls = fi === bf
              ? Math.min(params.maxWalls, bGrid.walls.countCrossings(b.pos.x, b.pos.y, p.x, p.y, params.maxWalls))
              : params.maxWalls;
            out[r * g.cols + c] =
              b.txPowerAt1m - 10 * params.exponent * Math.log10(d) -
              walls * params.wallLossDb - floorsCrossed * params.floorLossDb -
              params.crowdLossDbPerM * Math.max(0, d - 1);
          }
        }
        return out;
      });
    });
  }

  expectedAt(beaconIdx: number, floorIdx: number, cell: number): number {
    return this.expected[beaconIdx][floorIdx][cell];
  }

  /**
   * Intègre un relevé de calibration terrain.
   * - recale la puissance à 1 m de chaque balise (biais moyen) ;
   * - corrige localement par interpolation des résidus (rayon `radiusM`) ;
   * - réestime l'écart-type résiduel par balise.
   */
  calibrate(samples: CalibrationSample[], radiusM = 6): void {
    const v = this.venue;
    const byBeacon = new Map<number, CalibrationSample[]>();
    for (const s of samples) {
      const bi = v.beaconIndex.get(s.beaconId);
      if (bi === undefined) continue;
      let arr = byBeacon.get(bi);
      if (!arr) byBeacon.set(bi, (arr = []));
      arr.push(s);
    }
    for (const [bi, arr] of byBeacon) {
      const res = arr.map((s) => {
        const fi = v.floorIndex.get(s.floorId)!;
        const cell = v.grid(s.floorId).cellOf(s.x, s.y);
        return { s, fi, r: cell < 0 ? 0 : s.rssi - this.expected[bi][fi][cell] };
      });
      const bias = res.reduce((a, b) => a + b.r, 0) / res.length;
      v.def.floors.forEach((f, fi) => {
        const g = v.grid(f.id);
        const exp = this.expected[bi][fi];
        const local = res.filter((x) => x.fi === fi);
        for (let i = 0; i < exp.length; i++) {
          const p = g.centerOfIndex(i);
          let wSum = 0;
          let rSum = 0;
          for (const x of local) {
            const d = Math.hypot(p.x - x.s.x, p.y - x.s.y);
            if (d > radiusM) continue;
            const w = 1 / (0.5 + d * d);
            wSum += w;
            rSum += w * (x.r - bias);
          }
          // Mélange progressif : loin des points relevés, on retombe sur le modèle recalé.
          const conf = wSum / (wSum + 0.5);
          exp[i] += bias + (wSum > 0 ? conf * (rSum / wSum) : 0);
        }
      });
      // Écart-type résiduel après correction (validation croisée grossière).
      let sq = 0;
      for (const x of res) {
        const cell = v.grid(x.s.floorId).cellOf(x.s.x, x.s.y);
        if (cell < 0) continue;
        const e = x.s.rssi - this.expected[bi][x.fi][cell];
        sq += e * e;
      }
      const resid = Math.sqrt(sq / Math.max(1, res.length));
      this.sigma[bi] = Math.max(4, Math.min(this.params.sigmaDb, resid + 3));
    }
    this.calibrated = true;
  }
}
