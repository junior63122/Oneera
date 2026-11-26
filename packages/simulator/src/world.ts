/**
 * Monde simulé : vérité terrain + génération de mesures capteurs réalistes.
 *
 * IMPORTANT : le modèle radio « vrai » ci-dessous diffère volontairement du modèle a priori du moteur
 * (exposant, pertes par mur, puissance de chaque balise, ombrage corrélé spatialement, absorption par
 * la foule et par le corps de l'utilisateur, perte de paquets). Sans cet écart, la simulation serait
 * complaisante. Les chiffres obtenus restent des chiffres de SIMULATION, à confirmer sur site.
 */
import {
  BleObservation, findRoute, GnssObservation, localToGeo, Rng, RoutePoint, StepEvent, Venue, Vec2,
} from '@oneera/positioning';

export interface WorldParams {
  /**
   * Densité de foule : 0 (vide) → 1 (club plein). Au-delà : 2 = très dense (devant de scène), 3 = compact (« sardines »,
   * 4–6 pers./m²). Atténuation 2,4 GHz ajoutée : 0,5 dB/m × densité (≈ 1,5 dB/m en compact), cohérente avec les
   * mesures publiées (corps 5–8 dB, foule jusqu'à 8,6 dB de décalage) ; évanouissement rapide renforcé au-delà de 1.
   */
  crowd: number;
  /** Plateforme simulée : iOS fournit un RSSI moyenné 1 Hz ; Android des paquets bruts. */
  platform: 'ios' | 'android';
  seed: number;
}

interface BeaconTruth {
  txOffset: number;
  exponent: number;
  wallLoss: number;
  floorLoss: number;
  /** Composantes de l'ombrage spatial corrélé. */
  waves: { kx: number; ky: number; ph: number; amp: number }[];
}

export class World {
  readonly rng: Rng;
  private readonly beacons: BeaconTruth[];
  /** Dérive lente du biais GNSS (m). */
  private gnssBias = { x: 0, y: 0 };
  private baroDrift = 0;
  /** Facteur d'atténuation foule propre à chaque lien balise→téléphone, variant dans le temps (les corps bougent). */
  private crowdMul: Float64Array;
  private crowdMulT = -1;

  constructor(readonly venue: Venue, readonly params: WorldParams) {
    this.rng = new Rng(params.seed);
    this.beacons = venue.def.beacons.map(() => ({
      txOffset: this.rng.normal(0, 3),
      exponent: this.rng.uniform(2.0, 2.9),
      wallLoss: this.rng.uniform(3, 9),
      floorLoss: this.rng.uniform(14, 24),
      waves: Array.from({ length: 4 }, () => {
        const lambda = this.rng.uniform(2, 9);
        const a = this.rng.uniform(0, Math.PI * 2);
        return { kx: (Math.cos(a) * 2 * Math.PI) / lambda, ky: (Math.sin(a) * 2 * Math.PI) / lambda, ph: this.rng.uniform(0, 6.28), amp: this.rng.uniform(1.5, 3) };
      }),
    }));
    this.crowdMul = new Float64Array(venue.def.beacons.length).fill(1);
  }

  /** Fait évoluer l'atténuation aléatoire de la foule (processus AR(1), τ ≈ 8 s). Appelé à chaque balayage. */
  private stepCrowd(t: number) {
    if (t === this.crowdMulT) return;
    const dt = this.crowdMulT < 0 ? 10 : Math.min(10, Math.max(0, t - this.crowdMulT));
    this.crowdMulT = t;
    const a = Math.exp(-dt / 8);
    for (let i = 0; i < this.crowdMul.length; i++) {
      const v = 1 + a * (this.crowdMul[i] - 1) + Math.sqrt(1 - a * a) * this.rng.normal(0, 0.55);
      this.crowdMul[i] = Math.min(2.2, Math.max(0.15, v));
    }
  }

  /** RSSI moyen « vrai » (sans évanouissement rapide) d'une balise en un point. */
  meanRssi(bi: number, floorId: string, p: Vec2, heading: number): number {
    const b = this.venue.def.beacons[bi];
    const t = this.beacons[bi];
    const floors = this.venue.def.floors;
    const bf = floors.find((f) => f.id === b.floorId)!;
    const pf = floors.find((f) => f.id === floorId)!;
    const dz = Math.abs(bf.heightM - pf.heightM) + 1.0;
    const d = Math.max(0.3, Math.hypot(p.x - b.pos.x, p.y - b.pos.y, dz));
    const walls = b.floorId === floorId ? this.venue.grid(floorId).walls.countCrossings(b.pos.x, b.pos.y, p.x, p.y, 4) : 3;
    const floorLoss = Math.abs(bf.level - pf.level) * t.floorLoss;
    let shadow = 0;
    for (const w of t.waves) shadow += w.amp * Math.sin(w.kx * p.x + w.ky * p.y + w.ph);
    // Corps de l'utilisateur : téléphone tenu devant soi, balise dans le dos → forte atténuation.
    const toBeacon = Math.atan2(b.pos.y - p.y, b.pos.x - p.x);
    let ang = Math.abs(((toBeacon - heading + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
    const body = ang > (2 * Math.PI) / 3 ? 7 : ang > Math.PI / 2 ? 3 : 0;
    const crowdLoss = this.params.crowd * 0.5 * Math.max(0, d - 1) * this.crowdMul[bi];
    return b.txPowerAt1m + t.txOffset - 10 * t.exponent * Math.log10(d) - walls * t.wallLoss - floorLoss - body - crowdLoss + shadow;
  }

  /** Fenêtre de 1 s de mesures BLE au point donné. */
  scanBle(floorId: string, p: Vec2, heading: number, t?: number): BleObservation[] {
    const out: BleObservation[] = [];
    this.stepCrowd(t ?? this.crowdMulT + 1);
    // Publicité 10 Hz ; réception partielle (radio partagée, Wi-Fi, foule).
    const rxProb = this.params.platform === 'ios' ? 0.35 : 0.25;
    this.venue.def.beacons.forEach((b, bi) => {
      const mean = this.meanRssi(bi, floorId, p, heading);
      const pk: number[] = [];
      for (let k = 0; k < 10; k++) {
        if (!this.rng.chance(rxProb)) continue;
        const v = mean + this.rng.normal(0, 4 + Math.max(0, this.params.crowd - 1)); // évanouissement rapide (plus fort en foule compacte)
        if (v > -97) pk.push(Math.round(v));
      }
      if (!pk.length) return;
      // Moyenne en dBm (comportement observé des API de ranging).
      const rssi = pk.reduce((a, c) => a + c, 0) / pk.length;
      out.push({ beaconId: b.id, rssi: Math.round(rssi), count: pk.length });
    });
    return out;
  }

  /**
   * Mesures UWB « downlink » (DL-TDoA : le téléphone écoute des ancres, n'émet rien), modélisées comme des distances
   * vers les ancres (co-localisées avec les balises). Vue directe : σ ≈ 0,15 m. Les corps bloquent la vue directe
   * avec une probabilité croissante avec la densité et la distance ; la distance mesurée est alors trop longue
   * (excès exponentiel) ou la mesure est perdue. Portée utile réduite en foule. Hypothèses de SIMULATION.
   */
  rangeUwb(floorId: string, p: Vec2, heading: number, maxRange = 25): { anchorId: string; distM: number; sigmaM: number }[] {
    const c = this.params.crowd;
    const out: { anchorId: string; distM: number; sigmaM: number }[] = [];
    // Tour de mesure manqué (trop peu d'ancres reçues pour résoudre) : plus fréquent en foule.
    if (this.rng.chance(0.1 + 0.1 * Math.min(c, 3))) return out;
    // DL-TDoA : toutes les mesures sont relatives à une ancre de référence ; si elle est masquée,
    // son excès de trajet se reporte (en sens inverse) sur toutes les distances déduites.
    const refBlocked = this.rng.chance(Math.min(0.8, 0.15 + 0.15 * c));
    const common = refBlocked ? -(-Math.log(1 - this.rng.next()) * (0.5 + 0.4 * c)) : 0;
    for (const b of this.venue.def.beacons) {
      if (b.floorId !== floorId) continue;
      const d = Math.hypot(p.x - b.pos.x, p.y - b.pos.y, 2.2); // ancre à ~3,5 m, téléphone à ~1,3 m
      if (d > maxRange * (1 - 0.12 * Math.min(c, 3))) continue;
      const walls = this.venue.grid(floorId).walls.countCrossings(b.pos.x, b.pos.y, p.x, p.y, 2);
      if (walls > 1) continue;
      const toB = Math.atan2(b.pos.y - p.y, b.pos.x - p.x);
      const ang = Math.abs(((toB - heading + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
      const ownBody = ang > (2 * Math.PI) / 3;
      const pBlock = 1 - Math.exp(-0.06 * c * d) + (ownBody ? 0.5 : 0) + walls * 0.5;
      const blocked = this.rng.chance(Math.min(0.95, pBlock));
      if (blocked && this.rng.chance(0.35)) continue; // perte de la mesure
      const excess = blocked ? -Math.log(1 - this.rng.next()) * (0.6 + 0.5 * c) : 0;
      out.push({ anchorId: b.id, distM: Math.max(0.3, d + excess + common + this.rng.normal(0, 0.2)), sigmaM: 0.25 });
    }
    return out;
  }

  /** Position GNSS (ou null si pas de fix). */
  gnss(floorId: string, p: Vec2, dt: number): GnssObservation | null {
    const ref = this.venue.def.georef!;
    const g = this.venue.grid(floorId);
    const indoor = g.isIndoor(p.x, p.y) || floorId !== this.venue.def.floors[0].id;
    // Biais corrélé (processus AR(1), τ ≈ 30 s).
    const a = Math.exp(-dt / 30);
    const s = indoor ? 12 : 3;
    this.gnssBias.x = a * this.gnssBias.x + Math.sqrt(1 - a * a) * this.rng.normal(0, s);
    this.gnssBias.y = a * this.gnssBias.y + Math.sqrt(1 - a * a) * this.rng.normal(0, s);
    if (indoor) {
      if (this.rng.chance(0.6)) return null;
      // En intérieur, la position GNSS est tirée vers l'extérieur (fenêtres, entrée).
      const q = { x: p.x + this.gnssBias.x, y: p.y + this.gnssBias.y - 6 };
      const geo = localToGeo(ref, q);
      return { ...geo, accuracyM: this.rng.uniform(12, 35) };
    }
    const q = { x: p.x + this.gnssBias.x + this.rng.normal(0, 1.5), y: p.y + this.gnssBias.y + this.rng.normal(0, 1.5) };
    return { ...localToGeo(ref, q), accuracyM: this.rng.uniform(4, 9) };
  }

  /** Altitude barométrique relative (m). */
  barometer(floorId: string, dt: number): number {
    this.baroDrift += this.rng.normal(0, 0.02 * Math.sqrt(dt));
    const f = this.venue.def.floors.find((x) => x.id === floorId)!;
    return 100 + f.heightM + this.baroDrift + this.rng.normal(0, 0.3);
  }
}

// ---------------------------------------------------------------------------- trajectoires

export interface TruthSample {
  t: number;
  floorId: string;
  x: number;
  y: number;
  heading: number;
  walking: boolean;
  /** Danse/agitation sur place : le podomètre produit de faux pas. */
  dancing: boolean;
}

export interface Waypoint {
  floorId: string;
  x: number;
  y: number;
  dwellS: number;
  dancing?: boolean;
}

/** Génère une trajectoire vérité terrain à 10 Hz suivant des itinéraires réels. */
export function generateTrajectory(venue: Venue, waypoints: Waypoint[], rng: Rng, hz = 10): TruthSample[] {
  const out: TruthSample[] = [];
  const speed = rng.uniform(1.0, 1.35);
  let t = 0;
  let cur: RoutePoint = { floorId: waypoints[0].floorId, x: waypoints[0].x, y: waypoints[0].y };
  let heading = 0;
  const dwell = (wp: Waypoint) => {
    const n = Math.round(wp.dwellS * hz);
    for (let i = 0; i < n; i++) {
      // Agitation sur place (±0,5 m) en restant praticable.
      const jx = wp.dancing ? 0.4 * Math.sin(t * 1.3 + i * 0.01) : 0;
      const jy = wp.dancing ? 0.4 * Math.cos(t * 0.9) : 0;
      if (wp.dancing) heading += rng.normal(0, 0.15);
      out.push({ t, floorId: cur.floorId, x: cur.x + jx, y: cur.y + jy, heading, walking: false, dancing: !!wp.dancing });
      t += 1 / hz;
    }
  };
  dwell(waypoints[0]);
  for (let w = 1; w < waypoints.length; w++) {
    const wp = waypoints[w];
    const route = findRoute(venue, cur, { floorId: wp.floorId, x: wp.x, y: wp.y });
    if (!route) throw new Error(`Point inaccessible : ${JSON.stringify(wp)}`);
    const pts = route.points;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (a.floorId !== b.floorId) {
        // Montée/descente d'escalier ~6 s.
        for (let k = 0; k < 6 * hz; k++) {
          out.push({ t, floorId: k < 3 * hz ? a.floorId : b.floorId, x: a.x, y: a.y + (k / (6 * hz)) * 0.5, heading, walking: true, dancing: false });
          t += 1 / hz;
        }
        continue;
      }
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d < 1e-6) continue;
      heading = Math.atan2(b.y - a.y, b.x - a.x);
      const n = Math.max(1, Math.round((d / speed) * hz));
      for (let k = 1; k <= n; k++) {
        out.push({ t, floorId: a.floorId, x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n, heading, walking: true, dancing: false });
        t += 1 / hz;
      }
    }
    cur = { floorId: wp.floorId, x: wp.x, y: wp.y };
    dwell(wp);
  }
  return out;
}

/** Simulation du podomètre/cap du téléphone (avec défauts réels). */
export class PdrSimulator {
  private distAcc = 0;
  private headingBias: number;
  private readonly stepLen: number;
  private readonly scale: number;
  private last: TruthSample | null = null;

  constructor(private readonly rng: Rng) {
    this.headingBias = rng.normal(0, 0.25);
    this.stepLen = rng.uniform(0.62, 0.78);
    this.scale = rng.uniform(0.85, 1.15); // erreur systématique d'estimation de longueur de pas
  }

  /** Événements de pas générés entre l'échantillon précédent et celui-ci. */
  update(s: TruthSample, dt: number): StepEvent[] {
    const out: StepEvent[] = [];
    // Biais magnétique variant lentement (structures métalliques, enceintes).
    this.headingBias += this.rng.normal(0, 0.01);
    if (this.last && s.floorId === this.last.floorId && s.walking) {
      this.distAcc += Math.hypot(s.x - this.last.x, s.y - this.last.y);
      while (this.distAcc >= this.stepLen) {
        this.distAcc -= this.stepLen;
        if (this.rng.chance(0.92)) {
          out.push({ lengthM: 0.7 * this.scale, heading: s.heading + this.headingBias + this.rng.normal(0, 0.15) });
        }
      }
    } else if (s.dancing && this.rng.chance(0.6 * dt)) {
      // Faux pas pendant la danse : direction aléatoire.
      out.push({ lengthM: 0.7 * this.scale, heading: this.rng.uniform(-Math.PI, Math.PI) });
    }
    this.last = s;
    return out;
  }
}
