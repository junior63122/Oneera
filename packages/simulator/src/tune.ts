/** Exploration de paramètres du moteur (simulation). Usage : tsx src/tune.ts '<json opts>' ... */
import { runBench } from './bench';
const variants: Record<string, unknown>[] = process.argv.slice(2).map((a) => JSON.parse(a));
for (const v of variants.length ? variants : [{}]) {
  const res = runBench({ runs: 3, visits: 6, crowdLevels: [Number(process.env.CROWD ?? 0.6)], platforms: [(process.env.PLAT ?? 'android') as 'android' | 'ios'], seed: 4242, particles: 1000, engineOpts: v as never, only: ['calibré sur site'] });
  for (const m of Object.values(res)[0]) {
    console.log(JSON.stringify(v).padEnd(60), m.name.padEnd(38), `med ${m.median.toFixed(1)} p90 ${m.p90.toFixed(1)} zone ${(m.zoneAcc*100).toFixed(0)}% in68 ${(m.within68*100).toFixed(0)}% reacq ${m.reacqPerHour.toFixed(0)}`);
  }
}
