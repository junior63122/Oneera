/**
 * Rejeu d'une session terrain dans le moteur ONEERA, et calcul des métriques de la grille de validation
 * aux points de contrôle. C'est l'outil qui transforme une soirée de mesure en chiffres vérifiables.
 *
 * CLI : tsx src/replay.ts <session.jsonl> <venue.json> [calibration.json]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CalibrationSample, Checkpoint, DisplayTracker, EngineOptions, parseSession, PositioningEngine,
  RadioMap, Rng, SessionEvent, SessionLog, Venue, VenueDef,
} from '@oneera/positioning';
import { TruthSample, World } from './world';
import { PdrSimulator } from './world';

export interface ReplayMetrics {
  sessionId: string;
  device: string;
  checkpointsHit: number;
  /** Points de contrôle pour lesquels le moteur n'avait pas encore de position. */
  checkpointsWithoutFix: number;
  timeToFirstFixS: number;
  median: number;
  p90: number;
  p95: number;
  floorAcc: number;
  zoneAcc: number;
  within68: number;
  /** Erreur de la position AFFICHÉE (ce que voit l'utilisateur). */
  displayMedian: number;
  teleportsPerHour: number;
  wallCrossPerHour: number;
  offMapPct: number;
  reacqPerHour: number;
  msPerBleUpdate: number;
  durationS: number;
}

const q = (a: number[], p: number) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

export function replaySession(venue: Venue, radio: RadioMap, log: SessionLog, opts: Partial<EngineOptions> = {}): ReplayMetrics {
  const engine = new PositioningEngine(venue, radio, opts);
  const tracker = new DisplayTracker(venue);
  const checkpoints = new Map<string, Checkpoint>();
  const errors: number[] = [];
  const displayErrors: number[] = [];
  let floorOk = 0;
  let zoneOk = 0;
  let zoneN = 0;
  let within = 0;
  let hits = 0;
  let noFix = 0;
  let firstFix = NaN;
  let ms = 0;
  let bleUpdates = 0;
  let teleports = 0;
  let wallCross = 0;
  let offMap = 0;
  let frames = 0;
  let prev: { floorId: string; x: number; y: number } | null = null;
  let tDisp = 0;
  const end = log.events.length ? log.events[log.events.length - 1].t : 0;

  const tickTo = (t: number) => {
    while (tDisp + 0.1 <= t) {
      tDisp += 0.1;
      const r0 = tracker.reacquisitions;
      const s = tracker.tick(0.1);
      if (s.mode === 'hidden') continue;
      frames++;
      const g = venue.grid(s.floorId);
      if (!g.isWalkable(s.x, s.y)) offMap++;
      if (prev && prev.floorId === s.floorId && tracker.reacquisitions === r0 && s.mode !== 'reacquired') {
        const d = Math.hypot(s.x - prev.x, s.y - prev.y);
        if (d > 3) teleports++;
        if (d > 1e-6 && g.walls.crosses(prev.x, prev.y, s.x, s.y)) wallCross++;
      }
      prev = { floorId: s.floorId, x: s.x, y: s.y };
    }
  };

  for (const e of log.events) {
    tickTo(e.t);
    switch (e.k) {
      case 'checkpoints':
        for (const c of e.list) checkpoints.set(c.id, c);
        break;
      case 'activity':
        engine.setStill(e.still);
        break;
      case 'step':
        engine.onStep({ lengthM: e.len, heading: e.heading });
        break;
      case 'gnss':
        engine.updateGnss(e.t, { lat: e.lat, lon: e.lon, accuracyM: e.acc });
        break;
      case 'baro':
        engine.updateBarometer(e.t, e.relAltM);
        break;
      case 'ble': {
        const t0 = performance.now();
        engine.updateBle(e.t, e.obs);
        ms += performance.now() - t0;
        bleUpdates++;
        const est = engine.estimate(e.t);
        if (est.quality !== 'unknown' && Number.isNaN(firstFix)) firstFix = e.t;
        tracker.setTarget(est);
        break;
      }
      case 'truth': {
        const c = checkpoints.get(e.checkpointId);
        if (!c) break;
        hits++;
        const est = engine.estimate(e.t);
        if (est.quality === 'unknown' || !Number.isFinite(est.x)) {
          noFix++;
          break;
        }
        const err = Math.hypot(est.x - c.x, est.y - c.y);
        errors.push(err);
        if (est.floorId === c.floorId) floorOk++;
        if (est.floorId === c.floorId && err <= est.r68) within++;
        const tz = venue.grid(c.floorId).zoneAt(c.x, c.y)?.id;
        if (tz) {
          zoneN++;
          if (est.floorId === c.floorId && venue.grid(est.floorId).zoneAt(est.x, est.y)?.id === tz) zoneOk++;
        }
        const d = tracker.current;
        if (d.mode !== 'hidden') displayErrors.push(Math.hypot(d.x - c.x, d.y - c.y));
        break;
      }
    }
  }
  tickTo(end);
  const hours = Math.max(1e-9, end / 3600);
  const located = errors.length;
  return {
    sessionId: log.header.sessionId,
    device: `${log.header.device.platform} ${log.header.device.model}`,
    checkpointsHit: hits,
    checkpointsWithoutFix: noFix,
    timeToFirstFixS: firstFix,
    median: q(errors, 0.5),
    p90: q(errors, 0.9),
    p95: q(errors, 0.95),
    floorAcc: floorOk / Math.max(1, located),
    zoneAcc: zoneOk / Math.max(1, zoneN),
    within68: within / Math.max(1, located),
    displayMedian: q(displayErrors, 0.5),
    teleportsPerHour: teleports / hours,
    wallCrossPerHour: wallCross / hours,
    offMapPct: offMap / Math.max(1, frames),
    reacqPerHour: tracker.reacquisitions / hours,
    msPerBleUpdate: ms / Math.max(1, bleUpdates),
    durationS: end,
  };
}

/**
 * Produit une session au format terrain à partir du simulateur (mêmes défauts capteurs que le banc),
 * avec un marqueur de vérité toutes les `truthEveryS` secondes sur des points de contrôle virtuels.
 * Sert à tester la chaîne enregistrement → rejeu avant de disposer de vraies sessions.
 */
export function simulatedSession(venue: Venue, truth: TruthSample[], world: World, truthEveryS = 5): SessionLog {
  const events: SessionEvent[] = [];
  const pdr = new PdrSimulator(new Rng(world.params.seed + 99));
  const cps: Checkpoint[] = [];
  let lastStill: boolean | null = null;
  for (let i = 0; i < truth.length; i++) {
    const s = truth[i];
    for (const st of pdr.update(s, 0.1)) events.push({ k: 'step', t: s.t, len: st.lengthM, heading: st.heading });
    const still = !s.walking && !s.dancing;
    if (still !== lastStill) {
      events.push({ k: 'activity', t: s.t, still });
      lastStill = still;
    }
    if (i % 10 === 0) {
      const g = world.gnss(s.floorId, s, 1);
      if (g) events.push({ k: 'gnss', t: s.t, lat: g.lat, lon: g.lon, acc: g.accuracyM });
      events.push({ k: 'baro', t: s.t, relAltM: world.barometer(s.floorId, 1) });
      events.push({ k: 'ble', t: s.t, obs: world.scanBle(s.floorId, s, s.heading) });
    }
    if (i % (truthEveryS * 10) === 0 && s.t >= 10) {
      const id = `P${cps.length + 1}`;
      cps.push({ id, floorId: s.floorId, x: s.x, y: s.y });
      events.push({ k: 'truth', t: s.t, checkpointId: id });
    }
  }
  events.unshift({ k: 'checkpoints', t: 0, list: cps });
  return {
    header: {
      format: 'oneera-session', version: 1, sessionId: `sim-${world.params.seed}`, venueId: venue.def.id, mapVersion: 1,
      device: { platform: world.params.platform, model: 'simulateur', osVersion: '-', appVersion: '-' },
      startedAt: Date.UTC(2026, 10, 14, 23, 0, 0), protocol: 'SIM', crowd: world.params.crowd > 0.5 ? 'dense' : 'light',
    },
    events,
  };
}

export function formatReplay(m: ReplayMetrics): string {
  const n = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(0)} %` : '—');
  return [
    `Session ${m.sessionId} (${m.device}), ${n(m.durationS / 60)} min, ${m.checkpointsHit} points de contrôle (${m.checkpointsWithoutFix} sans position)`,
    `  Première position : ${n(m.timeToFirstFixS)} s`,
    `  Erreur médiane / P90 / P95 : ${n(m.median)} / ${n(m.p90)} / ${n(m.p95)} m   (affichée, médiane : ${n(m.displayMedian)} m)`,
    `  Bon étage ${pct(m.floorAcc)} · bonne zone ${pct(m.zoneAcc)} · vérité dans r68 ${pct(m.within68)}`,
    `  Sauts >3 m ${n(m.teleportsPerHour, 0)}/h · traversées de mur ${n(m.wallCrossPerHour, 0)}/h · hors carte ${pct(m.offMapPct)} · réacquisitions ${n(m.reacqPerHour)}/h`,
    `  Coût moteur : ${n(m.msPerBleUpdate, 2)} ms par mise à jour BLE`,
  ].join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [sessionPath, venuePath, calPath] = process.argv.slice(2);
  if (!sessionPath || !venuePath) {
    console.error('Usage : tsx src/replay.ts <session.jsonl> <venue.json> [calibration.json]');
    process.exit(2);
  }
  const { log, errors } = parseSession(readFileSync(sessionPath, 'utf8'));
  if (errors.length) console.error(`${errors.length} ligne(s) ignorée(s) :\n  ${errors.slice(0, 10).join('\n  ')}`);
  if (!log) process.exit(1);
  const venue = new Venue(JSON.parse(readFileSync(venuePath, 'utf8')) as VenueDef, 0.5);
  const radio = new RadioMap(venue);
  if (calPath) radio.calibrate(JSON.parse(readFileSync(calPath, 'utf8')) as CalibrationSample[]);
  console.log(formatReplay(replaySession(venue, radio, log)));
}

