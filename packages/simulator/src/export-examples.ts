/** Exporte le plan du club de test et son pack de mesure (exemples pour l'app de mesure et le rejeu). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Venue } from '@oneera/positioning';
import { buildTestClub } from './venues/testClub';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const def = buildTestClub();
const venue = new Venue(def, 0.5);
// Un point de contrôle praticable au centre de chaque zone publique.
const checkpoints = def.floors.flatMap((f) => f.zones.filter((z) => !z.restricted).map((z) => {
  const xs = z.polygon.map((p) => p.x);
  const ys = z.polygon.map((p) => p.y);
  const g = venue.grid(f.id);
  const c = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const i = g.isWalkable(c.x, c.y) ? g.cellOf(c.x, c.y) : g.nearestWalkable(c.x, c.y);
  return { floorId: f.id, ...g.centerOfIndex(i) };
})).map((c, i) => ({ id: `P${i + 1}`, ...c }));
const pack = {
  venueId: def.id, mapVersion: 1, venueName: def.name, georef: def.georef,
  // UUID d'exemple : à remplacer par l'UUID ONEERA réel configuré dans les balises.
  ibeaconUuid: '00000000-0000-4000-8000-000000000001',
  checkpoints,
};
mkdirSync(resolve(root, 'examples'), { recursive: true });
writeFileSync(resolve(root, 'examples/test-club.venue.json'), JSON.stringify(def, null, 1));
writeFileSync(resolve(root, 'apps/field-recorder/assets/test-club.pack.json'), JSON.stringify(pack, null, 1));
console.log(`${checkpoints.length} points de contrôle exportés`);
