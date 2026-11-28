/**
 * Tâches de fond du serveur :
 *  - chaque minute, calcul des statistiques agrégées par zone (tableau de bord, replay, comparaisons) ;
 *  - chaque heure, purge des positions brutes au-delà de la durée de conservation
 *    (POSITIONS_RETENTION_HOURS, 168 h = 7 jours par défaut ; durée à valider juridiquement).
 * Les agrégats sont toujours calculés avant la purge : rien n'est perdu pour le replay.
 */
import { Pool, withSystem } from './db';

export async function rollupNow(pool: Pool, at?: Date): Promise<number> {
  return withSystem(pool, async (c) => Number((await c.query('SELECT app.rollup_due($1) AS n', [at ?? new Date()])).rows[0].n));
}

export async function purgeNow(pool: Pool, retentionHours: number): Promise<number> {
  await rollupNow(pool);
  return withSystem(pool, async (c) => Number((await c.query("SELECT app.purge_positions(make_interval(hours => $1)) AS n", [retentionHours])).rows[0].n));
}

export function startMaintenance(pool: Pool, retentionHours = 168): () => void {
  let busy = false;
  const run = async (fn: () => Promise<unknown>, what: string) => {
    if (busy) return; busy = true;
    try { await fn(); } catch (e) { console.error(`[maintenance] ${what}`, (e as Error).message); } finally { busy = false; }
  };
  const a = setInterval(() => void run(() => rollupNow(pool), 'agrégats'), 60_000);
  const b = setInterval(() => void run(() => purgeNow(pool, retentionHours), 'purge'), 3_600_000);
  void run(() => rollupNow(pool), 'agrégats');
  return () => { clearInterval(a); clearInterval(b); };
}
