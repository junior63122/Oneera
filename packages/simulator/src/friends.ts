/**
 * Banc « retrouver ses amis en foule dense » — SIMULATION.
 *
 * Question : en club / devant de scène très dense, à quelle distance près l'app montre-t-elle où est mon ami
 * PAR RAPPORT À MOI (ce qui compte pour le retrouver), selon la technologie ?
 *
 * Deux personnes passent la soirée surtout sur le dancefloor (danse, déplacements, bar). Pour chaque technologie
 * et chaque densité, on mesure :
 *  - l'erreur absolue de position (moi) ;
 *  - l'erreur du VECTEUR « moi → ami » affiché (carte, ou flèche de recherche de précision quand elle est active) ;
 *  - la part du temps où l'ami est « retrouvable » : erreur < 3 m (on le voit dans la foule) et < 5 m.
 *
 * Modèles calibrés sur les chiffres publiés (voir research_notes/) ; ce ne sont PAS des mesures terrain.
 * Usage : pnpm --filter @oneera/simulator friends [--quick]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MotionClassifier, PositioningEngine, RadioMap, Rng, Venue, VenueDef } from '@oneera/positioning';
import { surveyFor } from './bench';
import { buildTestClub } from './venues/testClub';
import { generateTrajectory, PdrSimulator, TruthSample, Waypoint, World } from './world';

type Direct = 'none' | 'uwb-peer' | 'cs-peer';
interface Tech { name: string; dense2x?: boolean; uwbAnchors?: boolean; uwbDanceOnly?: boolean; direct: Direct; note: string }

const TECHS: Tech[] = [
  { name: 'BLE balises (actuel)', direct: 'none', note: 'tous téléphones' },
  { name: 'BLE, 2× plus de balises', dense2x: true, direct: 'none', note: 'tous téléphones' },
  { name: 'BLE + UWB ancres (DL-TDoA)', uwbAnchors: true, direct: 'none', note: 'téléphones haut de gamme récents' },
  { name: 'BLE + recherche de précision UWB entre amis', direct: 'uwb-peer', note: 'deux téléphones UWB, app ouverte' },
  { name: 'BLE + Channel Sounding entre amis', direct: 'cs-peer', note: 'deux téléphones BT 6, app ouverte' },
  { name: 'BLE 2× + UWB ancres + UWB entre amis', dense2x: true, uwbAnchors: true, direct: 'uwb-peer', note: 'cible « premium »' },
  { name: 'Économique : BLE 2× (stock existant) + 6 ancres UWB sur le dancefloor', dense2x: true, uwbAnchors: true, uwbDanceOnly: true, direct: 'none', note: 'téléphones UWB sur le dancefloor ; BLE ailleurs' },
];

const DENSITIES = [
  { label: 'dense (club plein)', crowd: 0.8 },
  { label: 'très dense (devant de scène)', crowd: 2 },
  { label: 'compact (4–6 pers./m²)', crowd: 3 },
];

/** Double la densité de balises : une balise supplémentaire au milieu de chaque paire voisine d'un même niveau. */
function densify(def: VenueDef): VenueDef {
  const extra: VenueDef['beacons'] = [];
  const bs = def.beacons;
  for (let i = 0; i < bs.length; i++) {
    let best = -1, bd = 1e9;
    for (let j = 0; j < bs.length; j++) {
      if (i === j || bs[j].floorId !== bs[i].floorId) continue;
      const d = Math.hypot(bs[i].pos.x - bs[j].pos.x, bs[i].pos.y - bs[j].pos.y);
      if (d < bd) { bd = d; best = j; }
    }
    if (best < 0) continue;
    const pos = { x: (bs[i].pos.x + bs[best].pos.x) / 2 + 2, y: (bs[i].pos.y + bs[best].pos.y) / 2 + 2 };
    if (!extra.some((e) => Math.hypot(e.pos.x - pos.x, e.pos.y - pos.y) < 3)) extra.push({ id: `X-${i}`, floorId: bs[i].floorId, pos, txPowerAt1m: -59 });
  }
  return { ...def, beacons: [...bs, ...extra] };
}

/** Soirée centrée sur le dancefloor : danse longue, quelques passages au bar. */
function danceNight(rng: Rng, n: number): Waypoint[] {
  const wps: Waypoint[] = [{ floorId: 'L0', x: 25, y: 8, dwellS: 5 }];
  for (let i = 0; i < n; i++) {
    if (rng.chance(0.2)) wps.push({ floorId: 'L0', x: rng.uniform(42, 48), y: rng.uniform(14, 22), dwellS: rng.uniform(20, 60) });
    else wps.push({ floorId: 'L0', x: rng.uniform(13, 37), y: rng.uniform(15, 31), dwellS: rng.uniform(40, 150), dancing: true });
  }
  return wps;
}

interface Person { truth: TruthSample[]; engine: PositioningEngine; motion: MotionClassifier; pdr: PdrSimulator; world: World; est: { x: number; y: number; floorId: string; r68: number } | null }

interface Acc { abs: number[]; rel: number[]; found3: number; found5: number; n: number; directN: number; sameZone: number }

const q = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

function run(tech: Tech, crowd: number, seed: number, venues: { std: Venue; x2: Venue }, acc: Acc, visits: number) {
  const venue = tech.dense2x ? venues.x2 : venues.std;
  const rng = new Rng(seed);
  const people: Person[] = [0, 1].map((k) => {
    const world = new World(venue, { crowd, platform: 'android', seed });
    (world as unknown as { rng: Rng }).rng = new Rng(seed * 31 + k * 7919); // même radio, bruits indépendants
    const radio = new RadioMap(venue);
    radio.calibrate(surveyFor(venue, world));
    const truth = generateTrajectory(venue, danceNight(rng, visits), rng);
    return { truth, world, engine: new PositioningEngine(venue, radio, { seed: seed + k, particles: 1000 }), motion: new MotionClassifier(), pdr: new PdrSimulator(new Rng(seed + 99 + k)), est: null };
  });
  const T = Math.min(people[0].truth.length, people[1].truth.length);
  const steps: { lengthM: number; heading: number }[][] = [[], []];
  const peerRng = new Rng(seed + 5);
  for (let i = 0; i < T; i++) {
    people.forEach((p, k) => {
      const s = p.truth[i];
      steps[k].push(...p.pdr.update(s, 0.1));
      if (i % 10) return;
      const ok = p.motion.push(s.t, steps[k]);
      steps[k] = [];
      p.engine.setStill(p.motion.state !== 'walking');
      for (const st of ok) p.engine.onStep(st);
      p.engine.updateBle(s.t, p.world.scanBle(s.floorId, s, s.heading, s.t));
      if (tech.uwbAnchors) p.engine.updateRanges(s.t, p.world.rangeUwb(s.floorId, s, s.heading, 25, tech.uwbDanceOnly ? danceAnchors(venue) : undefined));
      const e = p.engine.estimate(s.t);
      p.est = e.quality === 'unknown' ? null : { x: e.x, y: e.y, floorId: e.floorId, r68: e.r68 };
    });
    if (i % 10 || people[0].truth[i].t < 20) continue;
    const [a, b] = people;
    const ta = a.truth[i], tb = b.truth[i];
    if (!a.est || !b.est) continue;
    acc.n++;
    acc.abs.push(Math.hypot(a.est.x - ta.x, a.est.y - ta.y));
    // Vecteur vrai et vecteur affiché « moi → ami ».
    const vx = tb.x - ta.x, vy = tb.y - ta.y, dTrue = Math.hypot(vx, vy);
    let ex = b.est.x - a.est.x, ey = b.est.y - a.est.y;
    // Recherche de précision entre amis : seulement si proches (≤ 12 m), même niveau, et mesure disponible.
    const c = crowd;
    if (tech.direct !== 'none' && dTrue <= 12 && ta.floorId === tb.floorId) {
      const blocked = peerRng.chance(Math.min(0.9, 1 - Math.exp(-0.06 * c * dTrue) + 0.25)); // corps des deux personnes + foule
      const lost = blocked && peerRng.chance(tech.direct === 'uwb-peer' ? 0.3 : 0.4);
      if (!lost) {
        acc.directN++;
        // Fusion par variance : l'app ne sait pas si la mesure directe est masquée ; elle pondère selon les
        // incertitudes annoncées (r68 des deux positions carte vs incertitude nominale de la mesure directe).
        const sMap2 = a.est.r68 ** 2 + b.est.r68 ** 2;
        if (tech.direct === 'uwb-peer') {
          const dm = dTrue + (blocked ? -Math.log(1 - peerRng.next()) * (0.6 + 0.5 * c) : 0) + peerRng.normal(0, 0.15);
          // En vue directe : distance + direction (antennes UWB). Masqué : direction indisponible (distance seule).
          if (!blocked) {
            const th = Math.atan2(vy, vx) + peerRng.normal(0, 0.2);
            const sD2 = 0.3 ** 2 + (0.2 * dm) ** 2, w = sMap2 / (sMap2 + sD2);
            ex = (1 - w) * ex + w * dm * Math.cos(th); ey = (1 - w) * ey + w * dm * Math.sin(th);
          } else {
            const n = Math.hypot(ex, ey) || 1, w = sMap2 / (sMap2 + 1.0);
            const m = (1 - w) * n + w * dm; ex = (ex / n) * m; ey = (ey / n) * m;
          }
        } else {
          // Channel Sounding : distance seule ; direction prise sur la carte.
          const dm = dTrue + (blocked ? -Math.log(1 - peerRng.next()) * (0.8 + 0.5 * c) : 0) + peerRng.normal(0, 0.5);
          const n = Math.hypot(ex, ey) || 1, w = sMap2 / (sMap2 + 1.0);
          const m = (1 - w) * n + w * dm; ex = (ex / n) * m; ey = (ey / n) * m;
        }
      }
    }
    const rel = Math.hypot(ex - vx, ey - vy);
    acc.rel.push(rel);
    if (rel < 3) acc.found3++;
    if (rel < 5) acc.found5++;
  }
}

/** Ancres UWB limitées au dancefloor (salle principale 10–40 × 12–34, RDC) : 6 points, aux emplacements des balises d'origine. */
const danceAnchors = (v: Venue) => new Set(v.def.beacons.filter((b) => b.floorId === 'L0' && !b.id.startsWith('X') && b.pos.x >= 10 && b.pos.x <= 40 && b.pos.y >= 12 && b.pos.y <= 34).map((b) => b.id));

export function runFriends(runs: number, visits: number) {
  const std = new Venue(buildTestClub(), 0.5);
  const x2 = new Venue(densify(buildTestClub()), 0.5);
  const out: { density: string; tech: Tech; m: Record<string, number> }[] = [];
  const only = process.env.ONLY;
  for (const d of DENSITIES) for (const tech of TECHS.filter((t) => !only || t.name.includes(only))) {
    const acc: Acc = { abs: [], rel: [], found3: 0, found5: 0, n: 0, directN: 0, sameZone: 0 };
    for (let r = 0; r < runs; r++) run(tech, d.crowd, 4242 + r * 101 + Math.round(d.crowd * 10), { std, x2 }, acc, visits);
    out.push({ density: d.label, tech, m: { absMed: q(acc.abs, 0.5), absP95: q(acc.abs, 0.95), relMed: q(acc.rel, 0.5), relP90: q(acc.rel, 0.9), found3: acc.found3 / Math.max(1, acc.n), found5: acc.found5 / Math.max(1, acc.n), direct: acc.directN / Math.max(1, acc.n), n: acc.n } });
    if (process.env.BENCH_PROGRESS) console.error(`[amis] ${d.label} · ${tech.name} ok`);
  }
  return { out, beacons: { std: std.def.beacons.length, x2: x2.def.beacons.length } };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const quick = process.argv.includes('--quick');
  const t0 = Date.now();
  const { out, beacons } = runFriends(quick ? 1 : 4, quick ? 5 : 9);
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  let md = `# Banc « retrouver ses amis en foule dense » — SIMULATION\n\n> Club de test (${beacons.std} balises ; ${beacons.x2} en version 2×), deux amis surtout sur le dancefloor, téléphones Android. Modèles calibrés sur des chiffres publiés (atténuation du corps 5–8 dB, foule jusqu'à 8,6 dB ; UWB σ ≈ 0,15 m en vue directe, excès de distance quand des corps bloquent). **Ce ne sont pas des mesures terrain.** Durée : ${((Date.now() - t0) / 1000).toFixed(0)} s.\n\n`;
  md += `Lecture : **« moi → ami »** = erreur de la position de l'ami telle qu'affichée par rapport à moi (ce qui sert à le retrouver). **Retrouvable** = cette erreur est sous 3 m (on se voit dans la foule) / sous 5 m. **Mode précision** = part du temps où la mesure directe entre téléphones est active (amis à ≤ 12 m, app ouverte).\n\n`;
  for (const d of DENSITIES) {
    md += `## Foule ${d.label}\n\n| Technologie | Téléphones concernés | Moi : médiane / P95 | Moi → ami : médiane / P90 | Retrouvable < 3 m | < 5 m | Mode précision actif |\n|---|---|---|---|---|---|---|\n`;
    for (const r of out.filter((o) => o.density === d.label)) md += `| ${r.tech.name} | ${r.tech.note} | ${r.m.absMed.toFixed(1)} / ${r.m.absP95.toFixed(1)} m | ${r.m.relMed.toFixed(1)} / ${r.m.relP90.toFixed(1)} m | ${pct(r.m.found3)} | ${pct(r.m.found5)} | ${r.tech.direct === 'none' ? '—' : pct(r.m.direct)} |\n`;
    md += '\n';
  }
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, process.env.ONLY ? 'friends-sim-eco.md' : quick ? 'friends-sim-quick.md' : 'friends-sim.md'), md);
  writeFileSync(resolve(dir, process.env.ONLY ? 'friends-sim-eco.json' : quick ? 'friends-sim-quick.json' : 'friends-sim.json'), JSON.stringify(out, null, 1));
  console.log(md);
}
