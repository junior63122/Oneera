/**
 * Banc « réseau coupé » — SIMULATION du relais Bluetooth entre téléphones ONEERA (stockage et retransmission).
 *
 * Question : quand la 4G/5G est saturée ou coupée, avec quel retard mon ami me voit-il encore,
 * si chaque téléphone de l'app transmet aux téléphones voisins les dernières positions qu'il connaît ?
 *
 * Modèle (hypothèses issues de research_notes/…/partage_sans_reseau.md) :
 *  - festival 200 × 120 m, 10 000 personnes, très dense devant la scène (4 pers./m²), clairsemé au fond ;
 *  - une part seulement du public a l'app (pénétration 5 / 15 / 30 %), 40 % d'iPhone ;
 *  - portée Bluetooth téléphone↔téléphone qui diminue avec la densité (atténuation des corps : ~10 m → ~5,5 m) ;
 *  - restrictions iOS en arrière-plan : l'annonce d'un iPhone en arrière-plan n'est PAS visible d'un Android,
 *    et le balayage d'un iPhone en arrière-plan est lent ; Android tourne en service de premier plan ;
 *  - un téléphone n'ouvre qu'une connexion à un voisin toutes les ~10 s (coût radio, fenêtre de réveil iOS) ;
 *    pendant la connexion, il reçoit en priorité les positions de SES amis, les autres avec une probabilité limitée ;
 *  - chaque téléphone connaît sa propre position (localisation hors ligne : balises + capteurs) et la rafraîchit toutes les 30 s.
 * Mesure : âge de la position d'un ami telle que je la connais (secondes), échantillonné toutes les 30 s après 10 min.
 * Usage : pnpm --filter @oneera/simulator mesh
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from '@oneera/positioning';

const W = 200, H = 120, PEOPLE = 10_000, DT = 2, DUR = 40 * 60, WARM = 10 * 60, GROUP = 4;

/** Densité locale (pers./m²) : devant de scène (y < 30) très dense, puis décroissante. */
const density = (y: number) => (y < 30 ? 4 : y < 70 ? 2 : 0.5);
/** Portée Bluetooth téléphone↔téléphone selon la densité (bilan de liaison du banc radio, corps des deux porteurs inclus). */
const rangeAt = (y: number) => { const c = density(y) / 1.5; let d = 1; while (20 * Math.log10(d + 0.1) + 0.5 * c * d < 23 && d < 40) d += 0.1; return d; };

interface Cfg { penetration: number; relay: boolean }

function sim(cfg: Cfg, seed: number) {
  const rng = new Rng(seed);
  // Population de l'app placée selon la densité (tirage par rejet).
  const nUsers = Math.round(PEOPLE * cfg.penetration);
  const groupsN = Math.floor(nUsers / GROUP);
  const N = groupsN * GROUP;
  const x = new Float64Array(N), y = new Float64Array(N), tx = new Float64Array(N), ty = new Float64Array(N);
  const ios = new Uint8Array(N), walker = new Uint8Array(N);
  const sample = () => { for (;;) { const px = rng.uniform(0, W), py = rng.uniform(0, H); if (rng.chance(density(py) / 4)) return [px, py]; } };
  for (let g = 0; g < groupsN; g++) {
    const [cx, cy] = sample();
    for (let k = 0; k < GROUP; k++) {
      const i = g * GROUP + k;
      x[i] = Math.min(W, Math.max(0, cx + rng.normal(0, 2))); y[i] = Math.min(H, Math.max(0, cy + rng.normal(0, 2)));
      ios[i] = rng.chance(0.4) ? 1 : 0; walker[i] = rng.chance(0.15) ? 1 : 0;
      [tx[i], ty[i]] = sample();
    }
  }
  // Positions suivies : on suit toutes les origines d'un échantillon de groupes (≤ 120 groupes) chez tous les porteurs.
  const tracked = Math.min(groupsN, 120);
  const O = tracked * GROUP; // origines suivies = membres des premiers groupes
  const known = new Float32Array(N * O).fill(-1e9); // âge : instant de la position connue
  const ages: number[] = [];
  let fresh2 = 0, fresh5 = 0, samples = 0, never = 0;
  // Grille spatiale pour trouver les voisins.
  const cell = 6, gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
  const buckets: number[][] = Array.from({ length: gw * gh }, () => []);
  const qFor = 0.3; // probabilité de relayer une position qui n'est pas celle d'un ami du destinataire (contention)
  for (let t = 0; t < DUR; t += DT) {
    // Déplacements : marcheurs vers une cible (1 m/s), les autres piétinent (≈ 0,2 m/s).
    for (let i = 0; i < N; i++) {
      if (walker[i]) {
        const dx = tx[i] - x[i], dy = ty[i] - y[i], d = Math.hypot(dx, dy);
        if (d < 2) { [tx[i], ty[i]] = sample(); continue; }
        x[i] += (dx / d) * 1.0 * DT; y[i] += (dy / d) * 1.0 * DT;
      } else {
        x[i] = Math.min(W, Math.max(0, x[i] + rng.normal(0, 0.2 * Math.sqrt(DT))));
        y[i] = Math.min(H, Math.max(0, y[i] + rng.normal(0, 0.2 * Math.sqrt(DT))));
      }
    }
    // Chaque téléphone connaît sa propre position (rafraîchie toutes les 30 s).
    if (t % 30 === 0) for (let o = 0; o < O; o++) known[o * O + o] = t;
    for (const b of buckets) b.length = 0;
    for (let i = 0; i < N; i++) buckets[Math.min(gh - 1, Math.floor(y[i] / cell)) * gw + Math.min(gw - 1, Math.floor(x[i] / cell))].push(i);
    // Connexions : chaque téléphone tente, en moyenne toutes les 10 s, une connexion vers un voisin qu'il a détecté.
    for (let a = 0; a < N; a++) {
      if (!rng.chance(DT / 10)) continue;
      const R = Math.min(rangeAt(y[a]), cell * 1.5);
      const cx = Math.floor(x[a] / cell), cy = Math.floor(y[a] / cell);
      const cand: number[] = [];
      for (let gx = cx - 2; gx <= cx + 2; gx++) for (let gy = cy - 2; gy <= cy + 2; gy++) {
        if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
        for (const b of buckets[gy * gw + gx]) {
          if (b === a || Math.hypot(x[b] - x[a], y[b] - y[a]) > R) continue;
          // Détection de b par a pendant le pas : annonce de b visible par le balayage de a ?
          const pScan = ios[a] ? 0.15 : 0.5; // balayage iPhone en arrière-plan lent
          const visible = !(ios[b] && !ios[a]); // annonce d'un iPhone en arrière-plan invisible pour Android
          if (visible && rng.chance(1 - Math.pow(1 - pScan, DT))) cand.push(b);
        }
      }
      if (!cand.length) continue;
      const b = cand[rng.int(cand.length)];
      // Échange dans les deux sens.
      for (const [snd, rcv] of [[a, b], [b, a]] as const) {
        for (let o = 0; o < O; o++) {
          if (!cfg.relay && o !== snd) continue; // sans relais : seule la position propre de l'émetteur passe
          const v = get(snd, o);
          if (v <= get(rcv, o)) continue;
          const friendOfR = rcv < O && Math.floor(rcv / GROUP) === Math.floor(o / GROUP);
          if (!friendOfR && o !== snd && !rng.chance(qFor)) continue;
          set(rcv, o, v);
        }
      }
    }
    // Mesure : pour chaque membre suivi, âge de la position de chacun de ses amis.
    if (t >= WARM && t % 30 === 0) {
      for (let i = 0; i < O; i++) {
        const g = Math.floor(i / GROUP);
        for (let k = 0; k < GROUP; k++) {
          const j = g * GROUP + k;
          if (j === i) continue;
          const age = t - known[i * O + j];
          samples++;
          if (age > 1e8) { never++; continue; }
          ages.push(age);
          if (age <= 120) fresh2++;
          if (age <= 300) fresh5++;
        }
      }
    }
  }
  return { users: N, ages, fresh2: fresh2 / samples, fresh5: fresh5 / samples, never: never / samples };

  // Ce que le téléphone i sait de l'origine o (porteurs suivis : tableau ; autres porteurs : table creuse).
  function get(i: number, o: number) { return i < O ? known[i * O + o] : relays.get(i * 65536 + o) ?? -1e9; }
  function set(i: number, o: number, v: number) { if (i < O) known[i * O + o] = v; else relays.set(i * 65536 + o, v); }
}
const relays = new Map<number, number>();

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const q = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const fmtAge = (s: number) => (Number.isNaN(s) ? '—' : s < 90 ? `${Math.round(s)} s` : `${(s / 60).toFixed(1)} min`);
  const t0 = Date.now();
  let md = `# Banc « réseau coupé » — relais Bluetooth entre téléphones (SIMULATION)\n\n> Festival 200 × 120 m, 10 000 personnes (4 pers./m² devant la scène), 40 % d'iPhone, groupes de 4 amis, 40 min sans aucun réseau. Restrictions iOS d'arrière-plan prises en compte (annonce d'un iPhone en arrière-plan invisible pour Android, balayage lent). Portée téléphone↔téléphone : ${rangeAt(10).toFixed(1)} m devant la scène, ${rangeAt(50).toFixed(1)} m au milieu, ${rangeAt(100).toFixed(1)} m au fond. **Hypothèses de simulation, pas une mesure.**\n\n`;
  md += `Lecture : **âge** = depuis combien de temps la position de l'ami que je vois a été mesurée. « Sans relais » = seulement quand je croise directement mon ami.\n\n| Part du public avec l'app | Mode | Téléphones ONEERA | Âge médian | Âge P90 | Ami vu il y a ≤ 2 min | ≤ 5 min | Jamais reçu |\n|---|---|---|---|---|---|---|---|\n`;
  for (const penetration of [0.05, 0.15, 0.3]) for (const relay of [false, true]) {
    relays.clear();
    const r = sim({ penetration, relay }, 77 + Math.round(penetration * 100));
    md += `| ${Math.round(penetration * 100)} % | ${relay ? 'relais entre téléphones' : 'sans relais'} | ${r.users} | ${fmtAge(q(r.ages, 0.5))} | ${fmtAge(q(r.ages, 0.9))} | ${Math.round(r.fresh2 * 100)} % | ${Math.round(r.fresh5 * 100)} % | ${Math.round(r.never * 100)} % |\n`;
    if (process.env.BENCH_PROGRESS) console.error(`[relais] ${penetration} ${relay} ok`);
  }
  md += `\nDurée du banc : ${((Date.now() - t0) / 1000).toFixed(0)} s.\n`;
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'mesh-sim.md'), md);
  console.log(md);
}
