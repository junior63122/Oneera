/**
 * Démarrage du serveur ONEERA (API + temps réel sur un seul port).
 * Variables : DATABASE_URL (PostgreSQL + PostGIS), JWT_SECRET (≥ 32 caractères), PORT, PUBLIC_WS_URL (facultatif).
 */
import { createApi } from './api';
import { createPool, migrate } from './db';
import { Gateway } from './gateway';

const need = (k: string) => { const v = process.env[k]; if (!v) { console.error(`Variable manquante : ${k}`); process.exit(1); } return v; };
const dbUrl = need('DATABASE_URL');
const secretStr = need('JWT_SECRET');
if (secretStr.length < 32) { console.error('JWT_SECRET trop court (32 caractères minimum)'); process.exit(1); }
const secret = new TextEncoder().encode(secretStr);

const list = (v?: string) => (v ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const pool = createPool(dbUrl, 10);
const applied = await migrate(pool);
console.log(`[oneera] migrations appliquées : ${applied.length ? applied.join(', ') : 'aucune (à jour)'}`);
const gw = new Gateway({ pool, listenUrl: dbUrl, secret, maxRate: 3, flushMs: 500, http: createApi({ pool, secret, publicWsUrl: process.env.PUBLIC_WS_URL, appleAudiences: list(process.env.APPLE_AUDIENCES), googleAudiences: list(process.env.GOOGLE_CLIENT_IDS) }) });
const port = await gw.listen(Number(process.env.PORT ?? 8080));
console.log(`[oneera] serveur prêt sur le port ${port}`);
const stop = async () => { console.log('[oneera] arrêt…'); await gw.close(); await pool.end(); process.exit(0); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
