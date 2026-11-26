// Copie le prototype construit (prototype/dist) dans l'app et génère la liste des fichiers embarqués.
// Usage : node scripts/sync-web.mjs   (après `python3 prototype/build.py`)
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(app, '../../prototype/dist');
const web = join(app, 'web');
rmSync(web, { recursive: true, force: true });
mkdirSync(web, { recursive: true });
cpSync(join(dist, 'local.html'), join(web, 'index.html'));
cpSync(join(dist, 'a'), join(web, 'a'), { recursive: true });
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(relative(web, p).split('\\').join('/')); } };
walk(web);
files.sort();
const lines = files.map((f) => `  [${JSON.stringify(f)}, require(${JSON.stringify('./web/' + f)})],`);
writeFileSync(join(app, 'webManifest.ts'), `// Généré par scripts/sync-web.mjs — ne pas modifier à la main.\nexport const WEB_VERSION = ${JSON.stringify(String(Date.now()))};\nexport const WEB_FILES: [string, number][] = [\n${lines.join('\n')}\n];\n`);
console.log(`${files.length} fichiers embarqués`);
