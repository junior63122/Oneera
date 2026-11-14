/**
 * Banc de mesure du moteur de localisation (simulation).
 * Usage : pnpm bench:positioning [--runs N] [--quick]
 * Produit reports/positioning-sim.{md,json} à la racine du dépôt.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BleObservation, CalibrationSample, DisplayTracker, EngineOptions, geoToLocal, GnssObservation, PositioningEngine, RadioMap,
  Rng, Venue,
} from '@oneera/positioning';
import { buildTestClub } from './venues/testClub';
import { generateTrajectory, PdrSimulator, TruthSample, Waypoint, World } from './world';

// ---------------------------------------------------------------- estimateurs

interface Est {
  floorId: string;
  x: number;
  y: number;
  r68?: number;
  /** Transition explicite signalée à l'utilisateur (fondu) — comptée à part. */
  reacquired?: boolean;
}

interface Estimator {
  name: string;
  /** Mesures disponibles à la seconde t. */
  update(t: number, ble: BleObservation[], gnss: GnssObservation | null, steps: { lengthM: number; heading: number }[], baro: number, still: boolean): void;
  /** Position estimée (1 Hz). */
  estimate(t: number): Est | null;
  /** Position affichée (10 Hz). */
  display(t: number, dt: number): Est | null;
  reacquisitions(): number;
}

/** Approche type V1 : on « colle » l'utilisateur sur la balise la plus forte. */
class NearestBeacon implements Estimator {
  name = 'V1-like : balise la plus forte';
  private cur: Est | null = null;
  constructor(private venue: Venue) {}
  update(_t: number, ble: BleObservation[]) {
    if (!ble.length) return;
    const best = ble.reduce((a, b) => (b.rssi > a.rssi ? b : a));
    const b = this.venue.def.beacons[this.venue.beaconIndex.get(best.beaconId)!];
    this.cur = { floorId: b.floorId, x: b.pos.x, y: b.pos.y };
  }
  estimate() { return this.cur; }
  display() { return this.cur; }
  reacquisitions() { return 0; }
}

/** Barycentre pondéré des 3 balises les plus fortes. */
class WeightedCentroid implements Estimator {
  name = 'Barycentre pondéré (3 balises)';
  private cur: Est | null = null;
  constructor(private venue: Venue) {}
  update(_t: number, ble: BleObservation[]) {
    if (!ble.length) return;
    const top = [...ble].sort((a, b) => b.rssi - a.rssi).slice(0, 3);
    let sx = 0, sy = 0, sw = 0;
    const floorW = new Map<string, number>();
    for (const o of top) {
      const b = this.venue.def.beacons[this.venue.beaconIndex.get(o.beaconId)!];
      const w = Math.pow(10, o.rssi / 20);
      sx += w * b.pos.x; sy += w * b.pos.y; sw += w;
      floorW.set(b.floorId, (floorW.get(b.floorId) ?? 0) + w);
    }
    const floorId = [...floorW.entries()].sort((a, b) => b[1] - a[1])[0][0];
    this.cur = { floorId, x: sx / sw, y: sy / sw };
  }
  estimate() { return this.cur; }
  display() { return this.cur; }
  reacquisitions() { return 0; }
}

/** GNSS seul (ce que proposait initialement le prestataire V1). */
class GnssOnly implements Estimator {
  name = 'GNSS seul';
  private cur: Est | null = null;
  constructor(private venue: Venue) {}
  update(_t: number, _b: BleObservation[], g: GnssObservation | null) {
    if (!g) return;
    const p = geoToLocal(this.venue.def.georef!, g.lat, g.lon);
    this.cur = { floorId: this.venue.def.floors[0].id, x: p.x, y: p.y, r68: g.accuracyM };
  }
  estimate() { return this.cur; }
  display() { return this.cur; }
  reacquisitions() { return 0; }
}

/** Moteur ONEERA V2. */
class OneeraPF implements Estimator {
  readonly engine: PositioningEngine;
  readonly tracker: DisplayTracker;
  private lastEst: Est | null = null;
  private pendingReacq = false;
  constructor(public name: string, private venue: Venue, radio: RadioMap, private usePdr: boolean, seed: number, particles = 1500, extra: Partial<EngineOptions> = {}) {
    this.engine = new PositioningEngine(venue, radio, { seed, particles, ...extra });
    this.tracker = new DisplayTracker(venue);
  }
  update(t: number, ble: BleObservation[], gnss: GnssObservation | null, steps: { lengthM: number; heading: number }[], baro: number, still: boolean) {
    if (this.usePdr) {
      this.engine.setStill(still);
      for (const s of steps) this.engine.onStep(s);
    }
    if (gnss) this.engine.updateGnss(t, gnss);
    this.engine.updateBle(t, ble);
    if (this.usePdr) this.engine.updateBarometer(t, baro);
    const e = this.engine.estimate(t);
    const r0 = this.tracker.reacquisitions;
    this.tracker.setTarget(e);
    if (this.tracker.reacquisitions > r0) this.pendingReacq = true;
    this.lastEst = e.quality === 'unknown' ? null : { floorId: e.floorId, x: e.x, y: e.y, r68: e.r68 };
  }
  estimate() { return this.lastEst; }
  display(_t: number, dt: number) {
    const before = this.tracker.reacquisitions;
    const pending = this.pendingReacq;
    this.pendingReacq = false;
    const s = this.tracker.tick(dt);
    void before;
    return s.mode === 'hidden' ? null : { floorId: s.floorId, x: s.x, y: s.y, reacquired: pending };
  }
  reacquisitions() { return this.tracker.reacquisitions; }
}

// ---------------------------------------------------------------- scénarios

function zoneCenters(venue: Venue) {
  const list: { floorId: string; id: string; x: number; y: number; kind: string }[] = [];
  for (const f of venue.def.floors) {
    const g = venue.grid(f.id);
    for (const z of f.zones) {
      if (z.restricted) continue;
      const xs = z.polygon.map((p) => p.x);
      const ys = z.polygon.map((p) => p.y);
      const c = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
      const ci = g.isWalkable(c.x, c.y) ? g.cellOf(c.x, c.y) : g.nearestWalkable(c.x, c.y);
      if (ci < 0) continue;
      const p = g.centerOfIndex(ci);
      list.push({ floorId: f.id, id: z.id, x: p.x, y: p.y, kind: z.kind });
    }
  }
  return list;
}

function randomNight(venue: Venue, rng: Rng, visits: number): Waypoint[] {
  const zs = zoneCenters(venue).filter((z) => z.kind !== 'stairs' && z.kind !== 'corridor');
  const wps: Waypoint[] = [{ ...pick(zs.filter((z) => z.id === 'terrace')), dwellS: 20 }];
  for (let i = 0; i < visits; i++) {
    const z = pick(zs);
    const g = venue.grid(z.floorId);
    // Point aléatoire praticable dans un rayon de 4 m du centre de zone.
    let x = z.x, y = z.y;
    for (let k = 0; k < 20; k++) {
      const cx = z.x + rng.uniform(-4, 4), cy = z.y + rng.uniform(-4, 4);
      if (g.isWalkable(cx, cy) && g.zoneAt(cx, cy)?.id === z.id) { x = cx; y = cy; break; }
    }
    wps.push({ floorId: z.floorId, x, y, dwellS: rng.uniform(15, 90), dancing: z.kind === 'dancefloor' });
  }
  return wps;
  function pick<T>(a: T[]): T { return a[rng.int(a.length)]; }
}

// ---------------------------------------------------------------- métriques

interface Metrics {
  name: string;
  epochs: number;
  coverage: number;
  median: number;
  p90: number;
  p95: number;
  floorAcc: number;
  zoneAcc: number;
  within68: number;
  teleportsPerHour: number;
  wallCrossPerHour: number;
  offMapPct: number;
  reacqPerHour: number;
  msPerUpdate?: number;
}

const quantile = (arr: number[], q: number) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

interface RunAcc {
  errors: number[];
  floorOk: number;
  zoneOk: number;
  zoneN: number;
  within: number;
  withinN: number;
  epochs: number;
  covered: number;
  teleports: number;
  wallCross: number;
  offMap: number;
  frames: number;
  hours: number;
  reacq: number;
  ms: number;
  updates: number;
}

const newAcc = (): RunAcc => ({ errors: [], floorOk: 0, zoneOk: 0, zoneN: 0, within: 0, withinN: 0, epochs: 0, covered: 0, teleports: 0, wallCross: 0, offMap: 0, frames: 0, hours: 0, reacq: 0, ms: 0, updates: 0 });

function runOne(venue: Venue, truth: TruthSample[], world: World, estimators: Estimator[], accs: RunAcc[], warmupS = 10) {
  const pdr = new PdrSimulator(new Rng(world.params.seed + 99));
  const hz = 10;
  const prevDisp: (Est | null)[] = estimators.map(() => null);
  let pendingSteps: { lengthM: number; heading: number }[] = [];
  for (let i = 0; i < truth.length; i++) {
    const s = truth[i];
    pendingSteps.push(...pdr.update(s, 1 / hz));
    const isEpoch = i % hz === 0;
    let ble: BleObservation[] = [];
    let gnss: GnssObservation | null = null;
    let baro = 0;
    if (isEpoch) {
      ble = world.scanBle(s.floorId, s, s.heading);
      gnss = world.gnss(s.floorId, s, 1);
      baro = world.barometer(s.floorId, 1);
    }
    estimators.forEach((est, k) => {
      const acc = accs[k];
      if (isEpoch) {
        const t0 = performance.now();
        // Les pas sont livrés en temps réel au moteur ; on les regroupe ici par seconde.
        est.update(s.t, ble, gnss, pendingSteps, baro, !s.walking && !s.dancing);
        acc.ms += performance.now() - t0;
        acc.updates++;
        if (s.t >= warmupS) {
          acc.epochs++;
          const e = est.estimate(s.t);
          if (e) {
            acc.covered++;
            acc.errors.push(Math.hypot(e.x - s.x, e.y - s.y));
            if (e.floorId === s.floorId) acc.floorOk++;
            const tz = venue.grid(s.floorId).zoneAt(s.x, s.y)?.id;
            if (tz) {
              acc.zoneN++;
              const ez = e.floorId === s.floorId ? venue.grid(e.floorId).zoneAt(e.x, e.y)?.id : undefined;
              if (ez === tz) acc.zoneOk++;
            }
            if (e.r68 !== undefined) {
              acc.withinN++;
              if (e.floorId === s.floorId && Math.hypot(e.x - s.x, e.y - s.y) <= e.r68) acc.within++;
            }
          }
        }
      }
      const d = est.display(s.t, 1 / hz);
      if (s.t >= warmupS && d) {
        acc.frames++;
        const g = venue.grid(d.floorId);
        if (!g.isWalkable(d.x, d.y)) {
          acc.offMap++;
          if (process.env.DEBUG_OFFMAP) console.error('[hors-carte]', est.name, d.floorId, d.x.toFixed(2), d.y.toFixed(2), 'reacq', !!d.reacquired, 'prev', prevDisp[k] ? `${prevDisp[k]!.floorId} ${prevDisp[k]!.x.toFixed(2)},${prevDisp[k]!.y.toFixed(2)}` : '-');
        }
        const p = prevDisp[k];
        if (p && p.floorId === d.floorId && !d.reacquired) {
          const jump = Math.hypot(d.x - p.x, d.y - p.y);
          if (jump > 3) acc.teleports++; // > 30 m/s : saut visible
          if (jump > 1e-6 && g.walls.crosses(p.x, p.y, d.x, d.y)) acc.wallCross++;
        }
      }
      prevDisp[k] = d;
    });
    if (isEpoch) pendingSteps = [];
  }
  const hours = Math.max(0, truth[truth.length - 1].t - warmupS) / 3600;
  accs.forEach((a, k) => {
    a.hours += hours;
    a.reacq += estimators[k].reacquisitions();
  });
}

function finalize(name: string, a: RunAcc): Metrics {
  return {
    name,
    epochs: a.epochs,
    coverage: a.covered / Math.max(1, a.epochs),
    median: quantile(a.errors, 0.5),
    p90: quantile(a.errors, 0.9),
    p95: quantile(a.errors, 0.95),
    floorAcc: a.floorOk / Math.max(1, a.covered),
    zoneAcc: a.zoneOk / Math.max(1, a.zoneN),
    within68: a.withinN ? a.within / a.withinN : NaN,
    teleportsPerHour: a.teleports / Math.max(1e-9, a.hours),
    wallCrossPerHour: a.wallCross / Math.max(1e-9, a.hours),
    offMapPct: a.offMap / Math.max(1, a.frames),
    reacqPerHour: a.reacq / Math.max(1e-9, a.hours),
    msPerUpdate: a.ms / Math.max(1, a.updates),
  };
}

/** Relevé de calibration simulé : salle VIDE, grille de 3 m, 4 orientations. */
export function simulatedSurvey(venue: Venue, seed: number): CalibrationSample[] {
  const world = new World(venue, { crowd: 0, platform: 'android', seed });
  const out: CalibrationSample[] = [];
  for (const f of venue.def.floors) {
    const g = venue.grid(f.id);
    for (let x = f.bounds.minX + 1.5; x < f.bounds.maxX; x += 3) {
      for (let y = f.bounds.minY + 1.5; y < f.bounds.maxY; y += 3) {
        if (!g.isWalkable(x, y)) continue;
        venue.def.beacons.forEach((b, bi) => {
          let s = 0;
          for (let h = 0; h < 4; h++) s += world.meanRssi(bi, f.id, { x, y }, (h * Math.PI) / 2);
          const rssi = s / 4 + world.rng.normal(0, 1.5);
          if (rssi > -95) out.push({ floorId: f.id, x, y, beaconId: b.id, rssi });
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- programme principal

export interface BenchConfig {
  runs: number;
  visits: number;
  crowdLevels: number[];
  platforms: ('ios' | 'android')[];
  seed: number;
  particles: number;
  engineOpts?: Partial<EngineOptions>;
  only?: string[];
}

export function runBench(cfg: BenchConfig) {
  // NB : le « monde » utilise sa propre graine ; le lieu est le même (géométrie supposée connue).
  const venue = new Venue(buildTestClub(), 0.5);
  const radioPrior = new RadioMap(venue);
  const results: Record<string, Metrics[]> = {};
  for (const crowd of cfg.crowdLevels) {
    for (const platform of cfg.platforms) {
      const label = `foule=${crowd} · ${platform}`;
      let names: string[] = [];
      let accs: RunAcc[] = [];
      for (let r = 0; r < cfg.runs; r++) {
        const seed = cfg.seed + r * 1000 + Math.round(crowd * 100) + (platform === 'ios' ? 7 : 0);
        const rng = new Rng(seed);
        const world = new World(venue, { crowd, platform, seed });
        // La calibration est faite par balise sur le site réel : on la simule avec le MÊME monde (mêmes balises),
        // mais à vide et à un autre moment (bruit propre).
        const radioCal = new RadioMap(venue);
        radioCal.calibrate(surveyFor(venue, world));
        const truth = generateTrajectory(venue, randomNight(venue, rng, cfg.visits), rng);
        const ests: Estimator[] = [
          new NearestBeacon(venue),
          new WeightedCentroid(venue),
          new GnssOnly(venue),
          new OneeraPF('V2 · BLE sans PDR, non calibré', venue, radioPrior, false, seed, cfg.particles, cfg.engineOpts),
          new OneeraPF('V2 · BLE+PDR+baro, non calibré', venue, radioPrior, true, seed, cfg.particles, cfg.engineOpts),
          new OneeraPF('V2 · BLE+PDR+baro, calibré sur site', venue, radioCal, true, seed, cfg.particles, cfg.engineOpts),
        ].filter((e) => !cfg.only || cfg.only.some((o) => e.name.includes(o)));
        if (!accs.length) {
          accs = ests.map(newAcc);
          names = ests.map((e) => e.name);
        }
        const tRun = Date.now();
        runOne(venue, truth, world, ests, accs);
        if (process.env.BENCH_PROGRESS) console.error(`[banc] ${label} soirée ${r + 1}/${cfg.runs} : ${truth.length / 10 | 0} s simulées en ${((Date.now() - tRun) / 1000).toFixed(1)} s`);
      }
      results[label] = accs.map((a, i) => finalize(names[i], a));
    }
  }
  return results;
}

/** Relevé à vide avec le même jeu de balises que `world`. */
function surveyFor(venue: Venue, world: World): CalibrationSample[] {
  const out: CalibrationSample[] = [];
  const crowd = world.params.crowd;
  (world.params as { crowd: number }).crowd = 0;
  for (const f of venue.def.floors) {
    const g = venue.grid(f.id);
    for (let x = f.bounds.minX + 1.5; x < f.bounds.maxX; x += 3) {
      for (let y = f.bounds.minY + 1.5; y < f.bounds.maxY; y += 3) {
        if (!g.isWalkable(x, y)) continue;
        venue.def.beacons.forEach((b, bi) => {
          let s = 0;
          for (let h = 0; h < 4; h++) s += world.meanRssi(bi, f.id, { x, y }, (h * Math.PI) / 2);
          const rssi = s / 4 + world.rng.normal(0, 1.5);
          if (rssi > -95) out.push({ floorId: f.id, x, y, beaconId: b.id, rssi });
        });
      }
    }
  }
  (world.params as { crowd: number }).crowd = crowd;
  return out;
}

function fmt(m: Metrics): string {
  const n = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(0)} %` : '—');
  return `| ${m.name} | ${pct(m.coverage)} | ${n(m.median)} | ${n(m.p90)} | ${n(m.p95)} | ${pct(m.floorAcc)} | ${pct(m.zoneAcc)} | ${pct(m.within68)} | ${n(m.teleportsPerHour, 0)} | ${n(m.wallCrossPerHour, 0)} | ${pct(m.offMapPct)} | ${n(m.reacqPerHour, 1)} | ${n(m.msPerUpdate ?? NaN, 2)} |`;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick');
  const runsArg = args.indexOf('--runs');
  const cfg: BenchConfig = {
    runs: runsArg >= 0 ? Number(args[runsArg + 1]) : quick ? 2 : 6,
    visits: quick ? 5 : 10,
    crowdLevels: quick ? [0.6] : [0.2, 0.8],
    platforms: quick ? ['android'] : ['android', 'ios'],
    seed: 2026,
    particles: 1500,
  };
  const t0 = Date.now();
  const res = runBench(cfg);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  mkdirSync(resolve(root, 'reports'), { recursive: true });
  const header = '| Méthode | Couverture | Médiane (m) | P90 (m) | P95 (m) | Étage OK | Zone OK | Vérité dans r68 | Sauts >3 m /h | Traversées de mur /h | Hors carte | Réacq. /h | ms/maj |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  let md = `# Banc de localisation — SIMULATION\n\n> Résultats de simulation sur le « Club de test » synthétique (2 niveaux, ${buildTestClub().beacons.length} balises). ` +
    `Le modèle radio du monde simulé diffère volontairement de celui du moteur. **Ces chiffres ne remplacent pas une mesure terrain** (cf. docs/positioning/field-protocol.md).\n\n` +
    `Configuration : ${cfg.runs} soirées simulées par condition, ${cfg.visits} déplacements par soirée, ${cfg.particles} particules. Durée du banc : ${((Date.now() - t0) / 1000).toFixed(0)} s.\n\n`;
  for (const [label, ms] of Object.entries(res)) {
    md += `## ${label}\n\n${header}\n${ms.map(fmt).join('\n')}\n\n`;
  }
  md += `### Lecture\n- **Vérité dans r68** : part du temps où la position réelle est dans le rayon de confiance affiché (cible ≈ 68 % ; plus bas = l'app ment sur sa précision).\n` +
    `- **Sauts >3 m** : déplacements de l'avatar affiché de plus de 3 m en 0,1 s (téléportations visibles). Les réacquisitions explicites du V2 (fondu signalé) sont comptées à part.\n` +
    `- **Traversées de mur** : segments d'animation de l'avatar qui coupent un mur.\n`;
  writeFileSync(resolve(root, 'reports/positioning-sim.md'), md);
  writeFileSync(resolve(root, 'reports/positioning-sim.json'), JSON.stringify({ cfg, results: res }, null, 2));
  console.log(md);
}
