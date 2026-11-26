/**
 * Banc « toute l'application » par solution technique — SIMULATION.
 *
 * Pour chaque solution (BLE actuel, BLE 2× balises, BLE + UWB ancres) et chaque densité de foule, 40 visiteurs
 * équipés de l'app passent 25 min dans le club. On mesure tout ce que l'organisateur achète :
 *  - position (médiane / P95) et bonne zone ;
 *  - fluidité de l'avatar affiché (sauts > 3 m, traversées de mur, avatar hors carte) ;
 *  - carte de chaleur (grille 2 m lissée 3 m, par minute) comparée à la vérité ;
 *  - occupation par zone (par minute) ;
 *  - flux entre zones (transitions détectées : précision / rappel) ;
 *  - temps passé par zone ;
 *  - complétude des données avec une coupure réseau de 8 min, avec et sans mémoire tampon sur le téléphone.
 * La vérité porte sur les visiteurs équipés : l'extrapolation au public total dépend du taux d'adoption et d'un
 * comptage de référence (entrées), non simulés ici. Usage : pnpm --filter @oneera/simulator crowdflow [--quick]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DisplayTracker, MotionClassifier, PositioningEngine, RadioMap, Rng, Venue, VenueDef } from '@oneera/positioning';
import { surveyFor } from './bench';
import { buildTestClub } from './venues/testClub';
import { generateTrajectory, PdrSimulator, TruthSample, Waypoint, World } from './world';

interface Sol { name: string; x2?: boolean; uwb?: boolean }
const SOLS: Sol[] = [
  { name: 'BLE balises (actuel)' },
  { name: 'BLE, 2× plus de balises', x2: true },
  { name: 'BLE 2× + UWB ancres', x2: true, uwb: true },
];
const DENS = [{ label: 'club plein', crowd: 0.8 }, { label: 'compact', crowd: 3 }];
const OUTAGE = [8 * 60, 16 * 60]; // coupure réseau (s)

function densify(def: VenueDef): VenueDef {
  const bs = def.beacons, extra: VenueDef['beacons'] = [];
  for (let i = 0; i < bs.length; i++) {
    let best = -1, bd = 1e9;
    for (let j = 0; j < bs.length; j++) { if (i === j || bs[j].floorId !== bs[i].floorId) continue; const d = Math.hypot(bs[i].pos.x - bs[j].pos.x, bs[i].pos.y - bs[j].pos.y); if (d < bd) { bd = d; best = j; } }
    if (best < 0) continue;
    const pos = { x: (bs[i].pos.x + bs[best].pos.x) / 2 + 2, y: (bs[i].pos.y + bs[best].pos.y) / 2 + 2 };
    if (!extra.some((e) => Math.hypot(e.pos.x - pos.x, e.pos.y - pos.y) < 3)) extra.push({ id: `X-${i}`, floorId: bs[i].floorId, pos, txPowerAt1m: -59 });
  }
  return { ...def, beacons: [...bs, ...extra] };
}

/** Soirée type : dancefloor, bar, toilettes, VIP, terrasse, mezzanine. */
function night(rng: Rng, durS: number): Waypoint[] {
  const spots: [string, number, number, number, number, boolean][] = [
    ['L0', 13, 37, 15, 31, true], ['L0', 42, 48, 14, 22, false], ['L0', 42, 48, 26, 32, false], ['L0', 2, 8, 22, 32, false], ['L0', 5, 45, 1, 5, false], ['L1', 12, 34, 8, 14, false],
  ];
  const wps: Waypoint[] = [{ floorId: 'L0', x: 25, y: 8, dwellS: 5 }];
  let t = 0;
  while (t < durS) {
    const k = rng.chance(0.5) ? 0 : 1 + rng.int(spots.length - 1);
    const [f, x0, x1, y0, y1, dance] = spots[k];
    const dw = dance ? rng.uniform(90, 300) : rng.uniform(40, 160);
    wps.push({ floorId: f, x: rng.uniform(x0, x1), y: rng.uniform(y0, y1), dwellS: dw, dancing: dance });
    t += dw + 30;
  }
  return wps;
}

const q = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

/** Transitions de zone avec hystérésis (zone tenue ≥ 20 s), à partir d'une suite (t, zone) à 1 Hz. */
function transitions(seq: { t: number; z: string }[]) {
  const out: { t: number; from: string; to: string }[] = [];
  let cur = '', cand = '', since = 0;
  for (const { t, z } of seq) {
    if (!z) continue;
    if (!cur) { cur = z; continue; }
    if (z === cur) { cand = ''; continue; }
    if (z !== cand) { cand = z; since = t; }
    if (t - since >= 20) { out.push({ t: since, from: cur, to: cand }); cur = cand; cand = ''; }
  }
  return out;
}

export function runCrowdflow(people: number, durS: number, particles: number) {
  const std = new Venue(buildTestClub(), 0.5), x2 = new Venue(densify(buildTestClub()), 0.5);
  const rows: { sol: string; dens: string; m: Record<string, number> }[] = [];
  for (const d of DENS) for (const sol of SOLS) {
    const venue = sol.x2 ? x2 : std;
    const seed = 900 + Math.round(d.crowd * 10);
    const base = new World(venue, { crowd: d.crowd, platform: 'android', seed });
    const radio = new RadioMap(venue);
    radio.calibrate(surveyFor(venue, base));
    const rng = new Rng(seed);
    const errs: number[] = [];
    let zoneOk = 0, zoneN = 0, jumps = 0, walls = 0, offMap = 0, frames = 0;
    const H = Math.ceil(durS / 60);
    // Cartes par minute : cellules 2 m (niveau 0 et 1 séparés).
    const key = (f: string, x: number, y: number) => `${f}:${Math.floor(x / 2)}:${Math.floor(y / 2)}`;
    const heatT: Map<string, number>[] = Array.from({ length: H }, () => new Map());
    const heatE: Map<string, number>[] = Array.from({ length: H }, () => new Map());
    const key4 = (f: string, x: number, y: number) => `${f}:${Math.floor(x / 4)}:${Math.floor(y / 4)}`;
    const h4T: Map<string, number>[] = Array.from({ length: H }, () => new Map());
    const h4E: Map<string, number>[] = Array.from({ length: H }, () => new Map());
    const occT: Map<string, number>[] = Array.from({ length: H }, () => new Map());
    const occE: Map<string, number>[] = Array.from({ length: H }, () => new Map());
    let trTrue = 0, trEst = 0, trMatch = 0;
    const dwellErr: number[] = [];
    for (let p = 0; p < people; p++) {
      const world = new World(venue, { crowd: d.crowd, platform: 'android', seed });
      (world as unknown as { rng: Rng }).rng = new Rng(seed * 13 + p * 101);
      const truth: TruthSample[] = generateTrajectory(venue, night(rng, durS), rng).filter((s) => s.t <= durS);
      const eng = new PositioningEngine(venue, radio, { seed: seed + p, particles });
      const mot = new MotionClassifier(), pdr = new PdrSimulator(new Rng(seed + 7 * p)), disp = new DisplayTracker(venue);
      let pend: { lengthM: number; heading: number }[] = [];
      const seqT: { t: number; z: string }[] = [], seqE: { t: number; z: string }[] = [];
      let prev: { f: string; x: number; y: number } | null = null;
      for (let i = 0; i < truth.length; i++) {
        const s = truth[i];
        pend.push(...pdr.update(s, 0.1));
        if (i % 10 === 0) {
          for (const st of mot.push(s.t, pend)) eng.onStep(st);
          pend = [];
          eng.setStill(mot.state !== 'walking');
          eng.updateBle(s.t, world.scanBle(s.floorId, s, s.heading, s.t));
          if (sol.uwb) eng.updateRanges(s.t, world.rangeUwb(s.floorId, s, s.heading));
          const e = eng.estimate(s.t);
          disp.setTarget(e);
          if (s.t >= 30 && e.quality !== 'unknown') {
            const tz = venue.grid(s.floorId).zoneAt(s.x, s.y)?.id ?? '';
            const ez = venue.grid(e.floorId).zoneAt(e.x, e.y)?.id ?? '';
            errs.push(e.floorId === s.floorId ? Math.hypot(e.x - s.x, e.y - s.y) : 10);
            if (tz) { zoneN++; if (ez === tz && e.floorId === s.floorId) zoneOk++; }
            seqT.push({ t: s.t, z: tz }); seqE.push({ t: s.t, z: ez });
            const m = Math.floor(s.t / 60);
            if (m < H) {
              const kt = key(s.floorId, s.x, s.y), ke = key(e.floorId, e.x, e.y);
              heatT[m].set(kt, (heatT[m].get(kt) ?? 0) + 1); heatE[m].set(ke, (heatE[m].get(ke) ?? 0) + 1);
              const k4t = key4(s.floorId, s.x, s.y), k4e = key4(e.floorId, e.x, e.y);
              h4T[m].set(k4t, (h4T[m].get(k4t) ?? 0) + 1); h4E[m].set(k4e, (h4E[m].get(k4e) ?? 0) + 1);
              if (tz) occT[m].set(tz, (occT[m].get(tz) ?? 0) + 1 / 60);
              if (ez) occE[m].set(ez, (occE[m].get(ez) ?? 0) + 1 / 60);
            }
          }
        }
        const ds = disp.tick(0.1);
        if (s.t >= 30 && ds.mode !== 'hidden') {
          frames++;
          const g = venue.grid(ds.floorId);
          if (!g.isWalkable(ds.x, ds.y)) offMap++;
          if (prev && prev.f === ds.floorId && ds.mode !== 'reacquired') {
            const j = Math.hypot(ds.x - prev.x, ds.y - prev.y);
            if (j > 3) jumps++;
            if (j > 1e-6 && g.walls.crosses(prev.x, prev.y, ds.x, ds.y)) walls++;
          }
          prev = { f: ds.floorId, x: ds.x, y: ds.y };
        }
      }
      // Flux : transitions vraies vs estimées (appariées si mêmes zones à ± 30 s).
      const tt = transitions(seqT), te = transitions(seqE);
      trTrue += tt.length; trEst += te.length;
      const used = new Set<number>();
      for (const a of tt) { const k = te.findIndex((b, j) => !used.has(j) && b.from === a.from && b.to === a.to && Math.abs(b.t - a.t) <= 30); if (k >= 0) { used.add(k); trMatch++; } }
      // Temps passé : pour chaque séjour vrai ≥ 60 s, temps estimé dans la même zone pendant ce séjour.
      let i0 = 0;
      for (let i = 1; i <= seqT.length; i++) {
        if (i < seqT.length && seqT[i].z === seqT[i0].z) continue;
        const len = i - i0;
        if (len >= 60 && seqT[i0].z) { let inZ = 0; for (let k = i0; k < i; k++) if (seqE[k].z === seqT[i0].z) inZ++; dwellErr.push(Math.abs(inZ - len) / len); }
        i0 = i;
      }
    }
    // Carte de chaleur : erreur normalisée après lissage 3 m (≈ ce que montre la carte), par minute.
    const blur = (m: Map<string, number>) => { const o = new Map<string, number>(); for (const [k, v] of m) { const [f, cx, cy] = k.split(':'); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const w = dx === 0 && dy === 0 ? 0.4 : 0.075; const kk = `${f}:${+cx + dx}:${+cy + dy}`; o.set(kk, (o.get(kk) ?? 0) + v * w); } } return o; };
    const heatErr: number[] = [], heatErrLive: number[] = [], occErr: number[] = [], heat4: number[] = [];
    for (let m = 1; m < H; m++) {
      const T = blur(heatT[m]), E = blur(heatE[m]);
      let num = 0, den = 0;
      for (const k of new Set([...T.keys(), ...E.keys()])) { num += Math.abs((T.get(k) ?? 0) - (E.get(k) ?? 0)); den += T.get(k) ?? 0; }
      const err = den ? num / (2 * den) : 0; // 0 = identique, 1 = totalement différent
      heatErr.push(err);
      { const T4 = h4T[m], E4 = h4E[m]; let n4 = 0, d4 = 0; for (const k of new Set([...T4.keys(), ...E4.keys()])) { n4 += Math.abs((T4.get(k) ?? 0) - (E4.get(k) ?? 0)); d4 += T4.get(k) ?? 0; } heat4.push(d4 ? n4 / (2 * d4) : 0); }
      const down = m * 60 >= OUTAGE[0] && m * 60 < OUTAGE[1];
      heatErrLive.push(down ? 1 : err); // sans mémoire tampon : minutes de coupure perdues
      for (const [z, n] of occT[m]) if (n >= 3) occErr.push(Math.abs((occE[m].get(z) ?? 0) - n) / n);
    }
    const lost = (OUTAGE[1] - OUTAGE[0]) / durS;
    rows.push({ sol: sol.name, dens: d.label, m: {
      med: q(errs, 0.5), p95: q(errs, 0.95), zone: zoneOk / Math.max(1, zoneN),
      jumpsH: jumps / (frames / 36000), wallsH: walls / (frames / 36000), offMap: offMap / Math.max(1, frames),
      heat: heatErr.reduce((a, b) => a + b, 0) / heatErr.length, heatLive: heatErrLive.reduce((a, b) => a + b, 0) / heatErrLive.length, heat4: heat4.reduce((a, b) => a + b, 0) / heat4.length,
      occ: q(occErr, 0.5), occ90: q(occErr, 0.9), flowP: trMatch / Math.max(1, trEst), flowR: trMatch / Math.max(1, trTrue), dwell: q(dwellErr, 0.5),
      complLive: 1 - lost, complBuf: 1,
    } });
    if (process.env.BENCH_PROGRESS) console.error(`[app] ${d.label} · ${sol.name} ok`);
  }
  return rows;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const quick = process.argv.includes('--quick');
  const t0 = Date.now();
  const rows = runCrowdflow(quick ? 12 : 24, quick ? 900 : 1500, quick ? 400 : 500);
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  let md = `# Banc « toute l'application » par solution — SIMULATION\n\n> Club de test, ${quick ? 12 : 24} visiteurs équipés × ${quick ? 15 : 25} min (coupure de 8 min incluse), Android, coupure réseau de 8 min en cours de soirée. **Simulation : à confirmer sur site.** Durée : ${((Date.now() - t0) / 1000).toFixed(0)} s.\n\n`;
  md += `Lecture : **carte de chaleur** = part de la densité affichée au mauvais endroit (0 % = parfait), par minute, après lissage 3 m. **Occupation** = erreur relative du nombre de personnes par zone et par minute. **Flux** = transitions entre zones retrouvées (précision : transitions affichées qui sont vraies ; rappel : vraies transitions retrouvées). **Temps passé** = erreur relative sur la durée d'un séjour. **Complétude** = part des minutes de la soirée présentes dans les données.\n\n`;
  for (const d of DENS) {
    md += `## Foule : ${d.label}\n\n| Solution | Position médiane / P95 | Bonne zone | Sauts > 3 m /h | Murs traversés /h | Hors carte | Carte de chaleur 2 m / 4 m (erreur) | Occupation zone (méd. / P90) | Flux précision / rappel | Temps passé (erreur méd.) | Complétude sans / avec tampon |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
    for (const r of rows.filter((x) => x.dens === d.label)) {
      const m = r.m;
      md += `| ${r.sol} | ${m.med.toFixed(1)} / ${m.p95.toFixed(1)} m | ${pct(m.zone)} | ${m.jumpsH.toFixed(0)} | ${m.wallsH.toFixed(0)} | ${(m.offMap * 100).toFixed(2)} % | ${pct(m.heat)} / ${pct(m.heat4)} (2 m sans tampon : ${pct(m.heatLive)}) | ${pct(m.occ)} / ${pct(m.occ90)} | ${pct(m.flowP)} / ${pct(m.flowR)} | ${pct(m.dwell)} | ${pct(m.complLive)} / ${pct(m.complBuf)} |\n`;
    }
    md += '\n';
  }
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, quick ? 'app-sim-quick.md' : 'app-sim.md'), md);
  writeFileSync(resolve(dir, quick ? 'app-sim-quick.json' : 'app-sim.json'), JSON.stringify(rows, null, 1));
  console.log(md);
}
