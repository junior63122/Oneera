/**
 * Moteur de localisation ONEERA — filtre particulaire contraint par la carte.
 *
 * Principe : on maintient N hypothèses de position (particules). Chacune :
 *  - se déplace selon le podomètre/cap du téléphone (PDR) ou, à défaut, une marche aléatoire bornée ;
 *  - meurt si son déplacement traverse un mur ou sort des zones praticables (contrainte de carte) ;
 *  - change d'étage uniquement par un escalier/ascenseur ;
 *  - est pondérée par la vraisemblance des mesures BLE (carte radio), GNSS et baromètre.
 * La position publiée est le mode dominant (pas une moyenne qui pourrait tomber dans un mur),
 * accompagnée de rayons de confiance réels (68 % / 95 %) et d'une probabilité de zone.
 */
import { Rng } from './random';
import { RadioMap } from './radiomap';
import { Venue, geoToLocal } from './venue';
import { Vec2 } from './geometry';

export interface BleObservation {
  beaconId: string;
  /** RSSI agrégé sur la fenêtre (dBm). */
  rssi: number;
  /** Nombre de paquets reçus dans la fenêtre. */
  count?: number;
}

export interface GnssObservation {
  lat: number;
  lon: number;
  /** Précision horizontale déclarée par l'OS (m, ~68 %). */
  accuracyM: number;
}

export interface StepEvent {
  /** Longueur de pas estimée (m). */
  lengthM: number;
  /** Cap (radians, repère du plan : 0 = +x, sens trigonométrique). */
  heading: number;
}

export type FixQuality = 'unknown' | 'coarse' | 'zone' | 'precise';

export interface PositionEstimate {
  t: number;
  floorId: string;
  x: number;
  y: number;
  /** Rayon contenant 68 % / 95 % de la masse de probabilité (m). */
  r68: number;
  r95: number;
  zoneId?: string;
  /** Probabilité que l'utilisateur soit dans `zoneId`. */
  zoneProb: number;
  floorProb: number;
  quality: FixQuality;
  /** Secondes écoulées depuis la dernière mesure exploitable. */
  ageS: number;
  sources: { ble: number; gnss: boolean; pdr: boolean };
}

export interface EngineOptions {
  particles: number;
  /** Diffusion (m/√s) sans information de mouvement. */
  diffusionUnknown: number;
  /** Diffusion (m/√s) quand le téléphone est détecté immobile. */
  diffusionStill: number;
  /** Bruit de cap par pas (rad). */
  headingNoise: number;
  /** Tempérage de la vraisemblance BLE (mesures corrélées → ne pas surpondérer). */
  bleTemper: number;
  /** Probabilité d'aberration RSSI (mélange robuste). */
  outlierProb: number;
  /** Seuil de détection (dBm) pour l'information « balise attendue mais non vue ». */
  detectionFloorDbm: number;
  /** Utiliser l'absence de détection comme indice. */
  negativeEvidence: boolean;
  /** Fraction de particules réinjectées depuis les mesures BLE à chaque mise à jour (MCL augmenté). */
  injectionRate: number;
  /**
   * Facteur appliqué aux rayons de confiance issus des particules. Le nuage de particules sous-estime
   * l'incertitude réelle (erreurs de modèle corrélées) ; ce facteur est calibré par le banc puis
   * doit être revalidé par la métrologie terrain (part de la vérité dans r68 ≈ 68 %).
   */
  radiusInflation: number;
  /**
   * Apprendre en ligne l'atténuation supplémentaire due à la foule (dB/m) par rapport à la carte radio
   * (calibrée à vide). Chaque particule porte sa propre hypothèse, sélectionnée par les mesures.
   */
  learnCrowdLoss: boolean;
  seed: number;
}

export const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
  particles: 1500,
  diffusionUnknown: 0.9,
  diffusionStill: 0.15,
  headingNoise: 0.18,
  bleTemper: 0.3,
  outlierProb: 0.08,
  detectionFloorDbm: -92,
  negativeEvidence: false,
  injectionRate: 0.08,
  radiusInflation: 1.35,
  learnCrowdLoss: true,
  seed: 7,
};

const LOG_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);
const clampCrowd = (c: number) => Math.min(0.9, Math.max(-0.15, c));

export class PositioningEngine {
  readonly opts: EngineOptions;
  private readonly rng: Rng;
  private readonly n: number;
  private x: Float64Array;
  private y: Float64Array;
  private f: Uint8Array; // index d'étage
  private w: Float64Array;
  private scale: Float64Array; // facteur de longueur de pas propre à chaque particule
  private hbias: Float64Array; // biais de cap propre à chaque particule (perturbations magnétiques)
  private crowd: Float64Array; // atténuation foule supposée (dB/m) propre à chaque particule
  private initialized = false;
  private lastT = 0;
  private lastObsT = -Infinity;
  private still = false;
  private stepsSinceUpdate = 0;
  private lastBle = 0;
  private lastGnss = false;
  private baroRef: number | null = null; // altitude relative au plancher du niveau 0
  private lowLikStreak = 0;

  constructor(readonly venue: Venue, readonly radio: RadioMap, opts: Partial<EngineOptions> = {}) {
    this.opts = { ...DEFAULT_ENGINE_OPTIONS, ...opts };
    this.rng = new Rng(this.opts.seed);
    this.n = this.opts.particles;
    this.x = new Float64Array(this.n);
    this.y = new Float64Array(this.n);
    this.f = new Uint8Array(this.n);
    this.w = new Float64Array(this.n).fill(1 / this.n);
    this.scale = new Float64Array(this.n).fill(1);
    this.hbias = new Float64Array(this.n);
    this.crowd = new Float64Array(this.n);
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  /** Réinitialise (ex. arrêt du partage, changement de lieu). Aucune donnée n'est conservée. */
  reset(): void {
    this.initialized = false;
    this.lastObsT = -Infinity;
    this.baroRef = null;
  }

  /** Indique l'état d'activité détecté par l'accéléromètre. */
  setStill(still: boolean): void {
    this.still = still;
  }

  // ---------------------------------------------------------------- prédiction

  /** Avance le temps (marche aléatoire bornée par la carte). */
  advanceTo(t: number): void {
    if (!this.initialized) {
      this.lastT = t;
      return;
    }
    const dt = Math.max(0, Math.min(5, t - this.lastT));
    this.lastT = t;
    if (dt === 0) return;
    // Si des pas ont été intégrés, le PDR porte déjà le mouvement : diffusion résiduelle faible.
    const q = this.stepsSinceUpdate > 0 ? 0.1 : this.still ? this.opts.diffusionStill : this.opts.diffusionUnknown;
    const sd = q * Math.sqrt(dt);
    const cd = 0.01 * Math.sqrt(dt);
    for (let i = 0; i < this.n; i++) {
      this.moveParticle(i, this.rng.normal(0, sd), this.rng.normal(0, sd));
      if (this.opts.learnCrowdLoss) this.crowd[i] = clampCrowd(this.crowd[i] + this.rng.normal(0, cd));
    }
    this.stepsSinceUpdate = 0;
    this.normalize();
  }

  /** Intègre un pas détecté (PDR). */
  onStep(step: StepEvent): void {
    if (!this.initialized) return;
    this.stepsSinceUpdate++;
    for (let i = 0; i < this.n; i++) {
      // Les biais de pas et de cap évoluent lentement : ils sont appris implicitement par le filtre.
      this.scale[i] = Math.min(1.4, Math.max(0.6, this.scale[i] + this.rng.normal(0, 0.01)));
      this.hbias[i] += this.rng.normal(0, 0.01);
      const h = step.heading + this.hbias[i] + this.rng.normal(0, this.opts.headingNoise);
      const l = step.lengthM * this.scale[i] + this.rng.normal(0, 0.05);
      this.moveParticle(i, l * Math.cos(h), l * Math.sin(h));
    }
    this.normalize();
  }

  private moveParticle(i: number, dx: number, dy: number): void {
    const floor = this.venue.floorByIndex(this.f[i]);
    const g = this.venue.grid(floor.id);
    const nx = this.x[i] + dx;
    const ny = this.y[i] + dy;
    if (g.isWalkable(nx, ny) && !g.walls.crosses(this.x[i], this.y[i], nx, ny)) {
      this.x[i] = nx;
      this.y[i] = ny;
      // Changement d'étage possible seulement dans l'emprise d'un escalier/ascenseur.
      const portal = this.venue.portalAt(floor.id, { x: nx, y: ny });
      if (portal && this.rng.chance(0.15)) {
        const tg = this.venue.grid(portal.to);
        // Projection sur la zone d'arrivée (même position relative si alignée, sinon point praticable le plus proche).
        const ci = tg.isWalkable(nx, ny) ? tg.cellOf(nx, ny) : tg.nearestWalkable(nx, ny, 6);
        if (ci >= 0) {
          const c = tg.centerOfIndex(ci);
          this.x[i] = c.x;
          this.y[i] = c.y;
          this.f[i] = this.venue.floorIndex.get(portal.to)!;
        }
      }
    } else {
      // Collision : la particule est fortement pénalisée (elle sera éliminée au rééchantillonnage).
      this.w[i] *= 1e-3;
    }
  }

  // ---------------------------------------------------------------- mise à jour

  /** Intègre une fenêtre de mesures BLE. */
  updateBle(t: number, obs: BleObservation[]): void {
    const valid = obs.filter((o) => this.venue.beaconIndex.has(o.beaconId) && o.rssi < 0 && o.rssi > -110);
    this.lastBle = valid.length;
    if (!valid.length) return;
    this.lastObsT = t;
    if (!this.initialized) {
      this.initializeFromBle(valid);
      this.lastT = t;
      return;
    }
    this.advanceTo(t);
    const logL = this.bleLogLik(valid);
    this.applyLogLik(logL, valid.length);
    this.maybeResample();
    // Récupération : injection continue, renforcée si les mesures sont durablement mal expliquées.
    const rate = this.lowLikStreak >= 3 ? 0.25 : this.opts.injectionRate;
    if (this.lowLikStreak >= 3) this.lowLikStreak = 0;
    this.inject(valid, rate);
  }

  /** Intègre une position GNSS (lat/lon + précision déclarée). */
  updateGnss(t: number, o: GnssObservation): void {
    const ref = this.venue.def.georef;
    if (!ref || !(o.accuracyM > 0) || o.accuracyM > 60) {
      this.lastGnss = false;
      return;
    }
    const p = geoToLocal(ref, o.lat, o.lon);
    this.lastGnss = true;
    this.lastObsT = t;
    if (!this.initialized) {
      this.initializeAround(p, Math.max(5, o.accuracyM * 1.5));
      this.lastT = t;
      return;
    }
    this.advanceTo(t);
    const logL = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++) {
      const fl = this.venue.floorByIndex(this.f[i]);
      const g = this.venue.grid(fl.id);
      // En intérieur le GNSS est biaisé (multitrajets) : on gonfle fortement l'incertitude.
      const indoorFactor = g.isIndoor(this.x[i], this.y[i]) ? 3 : 1;
      const s = Math.max(3, o.accuracyM) * indoorFactor;
      const d = Math.hypot(this.x[i] - p.x, this.y[i] - p.y) / s;
      // Loi de Student (ν = 3) : robuste aux sauts GNSS.
      logL[i] = -2 * Math.log(1 + (d * d) / 3) - Math.log(s);
    }
    this.applyLogLik(logL, 1);
    this.maybeResample();
  }

  /** Intègre l'altitude barométrique relative (m, référence arbitraire). */
  updateBarometer(t: number, relAltitudeM: number): void {
    if (!this.initialized) return;
    const est = this.estimate(t);
    const floors = this.venue.def.floors;
    const curFloor = floors.find((fl) => fl.id === est.floorId)!;
    if (this.baroRef === null) {
      if (est.floorProb > 0.9) this.baroRef = relAltitudeM - curFloor.heightM;
      return;
    }
    const alt = relAltitudeM - this.baroRef;
    const logL = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++) {
      const d = (alt - floors[this.f[i]].heightM) / 1.2;
      logL[i] = -0.5 * d * d;
    }
    this.applyLogLik(logL, 1);
    // Recalage lent de la référence (dérive météo) quand l'étage est sûr.
    if (est.floorProb > 0.95) this.baroRef += 0.02 * (relAltitudeM - curFloor.heightM - this.baroRef);
    this.maybeResample();
  }

  private bleLogLik(obs: BleObservation[]): Float64Array {
    const radio = this.radio;
    const logL = new Float64Array(this.n);
    const seen = new Set(obs.map((o) => this.venue.beaconIndex.get(o.beaconId)!));
    const eps = this.opts.outlierProb;
    for (let i = 0; i < this.n; i++) {
      const fi = this.f[i];
      const floor = this.venue.floorByIndex(fi);
      const cell = this.venue.grid(floor.id).cellOf(this.x[i], this.y[i]);
      if (cell < 0) {
        logL[i] = -1e3;
        continue;
      }
      let ll = 0;
      for (const o of obs) {
        const bi = this.venue.beaconIndex.get(o.beaconId)!;
        // La moyenne de k paquets réduit le bruit rapide, pas l'erreur de modèle.
        const k = Math.max(1, o.count ?? 1);
        const s = Math.sqrt(radio.sigma[bi] ** 2 * 0.7 + (radio.sigma[bi] ** 2 * 0.3) / k);
        const b = this.venue.def.beacons[bi];
        const extra = this.crowd[i] * Math.max(0, Math.hypot(this.x[i] - b.pos.x, this.y[i] - b.pos.y) - 1);
        const z = (o.rssi - radio.expectedAt(bi, fi, cell) + extra) / s;
        const gauss = Math.exp(-0.5 * z * z - LOG_SQRT_2PI) / s;
        ll += Math.log((1 - eps) * gauss + eps / 60);
      }
      if (this.opts.negativeEvidence) {
        for (let bi = 0; bi < radio.expected.length; bi++) {
          if (seen.has(bi)) continue;
          const e = radio.expectedAt(bi, fi, cell);
          // Probabilité de détection d'une balise attendue à `e` dBm (sigmoïde autour du seuil).
          const pDet = 0.85 / (1 + Math.exp(-(e - this.opts.detectionFloorDbm) / 4));
          ll += Math.log(1 - pDet);
        }
      }
      logL[i] = ll;
    }
    return logL;
  }

  private applyLogLik(logL: Float64Array, nObs: number): void {
    const temper = nObs > 1 ? this.opts.bleTemper : 1;
    let max = -Infinity;
    for (let i = 0; i < this.n; i++) if (logL[i] > max) max = logL[i];
    // Détection d'enlèvement (« kidnapping ») : si la meilleure hypothèse explique mal les mesures
    // de manière répétée, on réinjecte des particules issues des mesures.
    const perObs = max / Math.max(1, nObs);
    this.lowLikStreak = perObs < -6 ? this.lowLikStreak + 1 : 0;
    let sum = 0;
    for (let i = 0; i < this.n; i++) {
      this.w[i] *= Math.exp(temper * (logL[i] - max));
      sum += this.w[i];
    }
    if (!(sum > 0) || !Number.isFinite(sum)) {
      this.w.fill(1 / this.n);
    } else {
      for (let i = 0; i < this.n; i++) this.w[i] /= sum;
    }
  }

  private normalize(): void {
    let sum = 0;
    for (let i = 0; i < this.n; i++) sum += this.w[i];
    if (!(sum > 0)) {
      this.w.fill(1 / this.n);
      return;
    }
    for (let i = 0; i < this.n; i++) this.w[i] /= sum;
  }

  private maybeResample(): void {
    let s2 = 0;
    for (let i = 0; i < this.n; i++) s2 += this.w[i] * this.w[i];
    const ess = 1 / s2;
    if (ess < this.n * 0.5) this.resample();
  }

  /** Rééchantillonnage systématique + rajeunissement léger. */
  private resample(): void {
    const n = this.n;
    const nx = new Float64Array(n);
    const ny = new Float64Array(n);
    const nf = new Uint8Array(n);
    const ns = new Float64Array(n);
    const nh = new Float64Array(n);
    const nc = new Float64Array(n);
    const step = 1 / n;
    let u = this.rng.next() * step;
    let c = this.w[0];
    let j = 0;
    for (let i = 0; i < n; i++) {
      while (u > c && j < n - 1) c += this.w[++j];
      nx[i] = this.x[j];
      ny[i] = this.y[j];
      nf[i] = this.f[j];
      ns[i] = this.scale[j];
      nh[i] = this.hbias[j];
      nc[i] = this.crowd[j];
      u += step;
    }
    this.x = nx;
    this.y = ny;
    this.f = nf;
    this.scale = ns;
    this.hbias = nh;
    this.crowd = nc;
    this.w.fill(1 / n);
    // Rajeunissement : petite perturbation praticable pour éviter l'appauvrissement.
    for (let i = 0; i < n; i++) {
      const g = this.venue.grid(this.venue.floorByIndex(this.f[i]).id);
      const tx = this.x[i] + this.rng.normal(0, 0.15);
      const ty = this.y[i] + this.rng.normal(0, 0.15);
      if (g.isWalkable(tx, ty) && !g.walls.crosses(this.x[i], this.y[i], tx, ty)) {
        this.x[i] = tx;
        this.y[i] = ty;
      }
    }
    if (this.lowLikStreak >= 3) this.lowLikStreak = 0; // la réinjection est gérée à la prochaine mesure BLE
  }

  // ---------------------------------------------------------------- initialisation

  /**
   * Tire `count` positions selon la vraisemblance BLE seule, sur toutes les cellules praticables
   * de tous les étages (échantillonnage d'importance).
   */
  private sampleFromBle(obs: BleObservation[], count: number): { x: number; y: number; f: number }[] {
    if (!this.candidates) {
      this.candidates = [];
      this.venue.def.floors.forEach((floor, fi) => {
        for (const cell of this.venue.grid(floor.id).walkableCells) this.candidates!.push({ fi, cell });
      });
    }
    const cand = this.candidates;
    const eps = this.opts.outlierProb;
    const ll = new Float64Array(cand.length);
    let max = -Infinity;
    const idx = obs.map((o) => this.venue.beaconIndex.get(o.beaconId)!);
    const c0 = this.opts.learnCrowdLoss ? this.crowdPrior() : 0;
    const gridOf = this.venue.def.floors.map((f) => this.venue.grid(f.id));
    for (let k = 0; k < cand.length; k++) {
      const c = cand[k];
      let l = 0;
      for (let j = 0; j < obs.length; j++) {
        const bi = idx[j];
        const sd = this.radio.sigma[bi];
        const b = this.venue.def.beacons[bi];
        const pc = gridOf[c.fi].centerOfIndex(c.cell);
        const extra = c0 * Math.max(0, Math.hypot(pc.x - b.pos.x, pc.y - b.pos.y) - 1);
        const z = (obs[j].rssi - this.radio.expectedAt(bi, c.fi, c.cell) + extra) / sd;
        l += Math.log((1 - eps) * Math.exp(-0.5 * z * z) / sd + eps / 60);
      }
      ll[k] = l * this.opts.bleTemper;
      if (ll[k] > max) max = ll[k];
    }
    const cum = new Float64Array(cand.length);
    let acc = 0;
    for (let k = 0; k < cand.length; k++) {
      acc += Math.exp(ll[k] - max);
      cum[k] = acc;
    }
    const out: { x: number; y: number; f: number }[] = [];
    for (let i = 0; i < count; i++) {
      const u = this.rng.next() * acc;
      let lo = 0;
      let hi = cand.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < u) lo = mid + 1;
        else hi = mid;
      }
      const c = cand[lo];
      const g = this.venue.grid(this.venue.floorByIndex(c.fi).id);
      const p = g.centerOfIndex(c.cell);
      out.push({ x: p.x + this.rng.uniform(-g.res / 2, g.res / 2), y: p.y + this.rng.uniform(-g.res / 2, g.res / 2), f: c.fi });
    }
    return out;
  }

  private candidates: { fi: number; cell: number }[] | null = null;

  /** Atténuation foule courante (moyenne pondérée), ou a priori si non initialisé. */
  private crowdPrior(): number {
    if (!this.initialized || !this.opts.learnCrowdLoss) return 0.1;
    let s = 0;
    for (let i = 0; i < this.n; i++) s += this.w[i] * this.crowd[i];
    return s;
  }

  /** Atténuation due à la foule actuellement estimée (dB/m) — utile à l'exploitation et au débogage. */
  get crowdLossEstimate(): number {
    return this.crowdPrior();
  }

  private initializeFromBle(obs: BleObservation[]): void {
    const pts = this.sampleFromBle(obs, this.n);
    pts.forEach((p, i) => {
      this.x[i] = p.x;
      this.y[i] = p.y;
      this.f[i] = p.f;
      this.scale[i] = 1 + this.rng.normal(0, 0.12);
      this.hbias[i] = this.rng.normal(0, 0.25);
      this.crowd[i] = this.opts.learnCrowdLoss ? clampCrowd(this.crowdPrior() + this.rng.normal(0, 0.12)) : 0;
    });
    this.w.fill(1 / this.n);
    this.initialized = true;
  }

  /** Remplace une fraction de particules par des tirages issus des mesures (récupération continue). */
  private inject(obs: BleObservation[], fraction: number): void {
    const k = Math.floor(this.n * fraction);
    if (k <= 0) return;
    const pts = this.sampleFromBle(obs, k);
    const meanW = 1 / this.n;
    for (const p of pts) {
      const i = this.rng.int(this.n);
      this.x[i] = p.x;
      this.y[i] = p.y;
      this.f[i] = p.f;
      this.scale[i] = 1 + this.rng.normal(0, 0.12);
      this.hbias[i] = this.rng.normal(0, 0.25);
      this.crowd[i] = this.opts.learnCrowdLoss ? clampCrowd(this.crowdPrior() + this.rng.normal(0, 0.12)) : 0;
      this.w[i] = meanW;
    }
    this.normalize();
  }

  private initializeAround(p: Vec2, sd: number): void {
    const floor0 = this.venue.def.floors.reduce((a, b) => (Math.abs(b.level) < Math.abs(a.level) ? b : a));
    const fi = this.venue.floorIndex.get(floor0.id)!;
    const g = this.venue.grid(floor0.id);
    for (let i = 0; i < this.n; i++) {
      let ok = false;
      for (let k = 0; k < 20 && !ok; k++) {
        const x = p.x + this.rng.normal(0, sd);
        const y = p.y + this.rng.normal(0, sd);
        if (g.isWalkable(x, y)) {
          this.x[i] = x;
          this.y[i] = y;
          ok = true;
        }
      }
      if (!ok) {
        const c = g.nearestWalkable(p.x, p.y, 200);
        const q = c >= 0 ? g.centerOfIndex(c) : p;
        this.x[i] = q.x;
        this.y[i] = q.y;
      }
      this.f[i] = fi;
      this.scale[i] = 1 + this.rng.normal(0, 0.12);
      this.hbias[i] = this.rng.normal(0, 0.25);
      this.crowd[i] = this.opts.learnCrowdLoss ? clampCrowd(this.crowdPrior() + this.rng.normal(0, 0.12)) : 0;
    }
    this.w.fill(1 / this.n);
    this.initialized = true;
  }

  /** Réinjecte une fraction de particules tirées des mesures (récupération après erreur). */
  injectFromBle(obs: BleObservation[], fraction = 0.1): void {
    if (this.initialized) this.inject(obs, fraction);
  }

  get needsRecovery(): boolean {
    return this.lowLikStreak >= 3;
  }

  // ---------------------------------------------------------------- estimation

  estimate(t: number): PositionEstimate {
    const ageS = Number.isFinite(this.lastObsT) ? Math.max(0, t - this.lastObsT) : Infinity;
    if (!this.initialized) {
      return {
        t, floorId: this.venue.def.floors[0].id, x: NaN, y: NaN, r68: Infinity, r95: Infinity,
        zoneProb: 0, floorProb: 0, quality: 'unknown', ageS,
        sources: { ble: this.lastBle, gnss: this.lastGnss, pdr: false },
      };
    }
    // 1) étage dominant
    const floors = this.venue.def.floors;
    const fw = new Float64Array(floors.length);
    for (let i = 0; i < this.n; i++) fw[this.f[i]] += this.w[i];
    let fi = 0;
    for (let k = 1; k < fw.length; k++) if (fw[k] > fw[fi]) fi = k;
    const floor = floors[fi];
    const g = this.venue.grid(floor.id);

    // 2) mode : histogramme 1 m lissé 3×3 sur l'étage dominant
    const res = 1;
    const { minX, minY, maxX, maxY } = floor.bounds;
    const hc = Math.ceil((maxX - minX) / res);
    const hr = Math.ceil((maxY - minY) / res);
    const hist = new Float64Array(hc * hr);
    for (let i = 0; i < this.n; i++) {
      if (this.f[i] !== fi) continue;
      const c = Math.min(hc - 1, Math.max(0, Math.floor((this.x[i] - minX) / res)));
      const r = Math.min(hr - 1, Math.max(0, Math.floor((this.y[i] - minY) / res)));
      hist[r * hc + c] += this.w[i];
    }
    let best = 0;
    let bestV = -1;
    for (let r = 0; r < hr; r++) {
      for (let c = 0; c < hc; c++) {
        let v = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr >= 0 && cc >= 0 && rr < hr && cc < hc) v += hist[rr * hc + cc];
          }
        }
        if (v > bestV) {
          bestV = v;
          best = r * hc + c;
        }
      }
    }
    const mx = minX + ((best % hc) + 0.5) * res;
    const my = minY + (Math.floor(best / hc) + 0.5) * res;
    // 3) moyenne locale autour du mode, restreinte aux particules visibles depuis le mode
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.f[i] !== fi) continue;
      if (Math.hypot(this.x[i] - mx, this.y[i] - my) > 3) continue;
      if (g.walls.crosses(mx, my, this.x[i], this.y[i])) continue;
      sx += this.w[i] * this.x[i];
      sy += this.w[i] * this.y[i];
      sw += this.w[i];
    }
    let ex = sw > 0 ? sx / sw : mx;
    let ey = sw > 0 ? sy / sw : my;
    if (!g.isWalkable(ex, ey)) {
      const c = g.nearestWalkable(ex, ey, 10);
      if (c >= 0) ({ x: ex, y: ey } = g.centerOfIndex(c));
    }
    // 4) rayons de confiance : quantiles pondérés des distances (autres étages = loin)
    const ds: { d: number; w: number }[] = [];
    for (let i = 0; i < this.n; i++) {
      const d = this.f[i] === fi ? Math.hypot(this.x[i] - ex, this.y[i] - ey) : 50;
      ds.push({ d, w: this.w[i] });
    }
    ds.sort((a, b) => a.d - b.d);
    const q = (p: number) => {
      let acc = 0;
      for (const e of ds) {
        acc += e.w;
        if (acc >= p) return e.d;
      }
      return ds[ds.length - 1].d;
    };
    let r68 = Math.max(1, q(0.68) * this.opts.radiusInflation);
    let r95 = Math.max(r68, q(0.95) * this.opts.radiusInflation);
    // Vieillissement : sans mesure, l'incertitude croît avec la vitesse de marche possible.
    if (Number.isFinite(ageS) && ageS > 3) {
      r68 += 1.0 * (ageS - 3);
      r95 += 1.4 * (ageS - 3);
    }
    // 5) probabilité de zone
    const zw = new Map<string, number>();
    for (let i = 0; i < this.n; i++) {
      if (this.f[i] !== fi) continue;
      const z = g.zoneAt(this.x[i], this.y[i]);
      if (z) zw.set(z.id, (zw.get(z.id) ?? 0) + this.w[i]);
    }
    const zone = g.zoneAt(ex, ey);
    const zoneProb = zone ? (zw.get(zone.id) ?? 0) / Math.max(1e-9, fw[fi]) : 0;
    const quality: FixQuality =
      !Number.isFinite(ageS) || ageS > 60 ? 'unknown'
        : r68 <= 4 && ageS < 10 ? 'precise'
        : zoneProb >= 0.75 ? 'zone'
        : 'coarse';
    return {
      t, floorId: floor.id, x: ex, y: ey, r68, r95, zoneId: zone?.id, zoneProb, floorProb: fw[fi], quality, ageS,
      sources: { ble: this.lastBle, gnss: this.lastGnss, pdr: this.stepsSinceUpdate > 0 },
    };
  }

  /** Accès aux particules (débogage/visualisation de l'incertitude). */
  particles(): { x: Float64Array; y: Float64Array; f: Uint8Array; w: Float64Array } {
    return { x: this.x, y: this.y, f: this.f, w: this.w };
  }
}
