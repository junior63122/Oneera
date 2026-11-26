import type { MotionState } from './motion';

/**
 * Cadence d'envoi des positions au serveur (côté téléphone).
 *
 * Exigence du dossier technique : 1–2 s en mouvement, 5–10 s immobile. En plus, un changement qui compte pour les amis
 * (zone, étage, déplacement supérieur à l'incertitude, passage en qualité dégradée) part sans attendre l'échéance,
 * dans la limite d'un envoi par seconde (la passerelle refuse au-delà de son débit autorisé).
 * Moins d'envois = moins de batterie et de données, sans retard perçu sur ce qui change vraiment.
 */
export interface PublishOptions {
  /** Intervalle minimal entre deux envois (ms). */
  minIntervalMs: number;
  /** Intervalle maximal en marche (ms). */
  movingIntervalMs: number;
  /** Intervalle maximal à l'arrêt (ms) : sert aussi de preuve de vie de la position. */
  stillIntervalMs: number;
  /** Déplacement qui déclenche un envoi anticipé (m) ; on retient le plus grand de cette valeur et de r68. */
  moveThresholdM: number;
}

export const DEFAULT_PUBLISH_OPTIONS: PublishOptions = { minIntervalMs: 1000, movingIntervalMs: 2000, stillIntervalMs: 10_000, moveThresholdM: 3 };

export interface PublishableFix {
  t: number; // ms
  floorId: string;
  x: number;
  y: number;
  r68: number;
  zoneId?: string;
  quality: 'unknown' | 'coarse' | 'zone' | 'precise';
}

export type PublishReason = 'first' | 'floor' | 'zone' | 'moved' | 'quality' | 'interval';

export class PublishPolicy {
  readonly opts: PublishOptions;
  private last: PublishableFix | null = null;

  constructor(opts: Partial<PublishOptions> = {}) {
    this.opts = { ...DEFAULT_PUBLISH_OPTIONS, ...opts };
  }

  /** Indique s'il faut envoyer cette position maintenant, et pourquoi (null = ne pas envoyer). */
  decide(fix: PublishableFix, motion: MotionState): PublishReason | null {
    if (fix.quality === 'unknown') return null; // on n'envoie jamais une position non qualifiée
    const prev = this.last;
    let reason: PublishReason | null = null;
    if (!prev) reason = 'first';
    else {
      const dt = fix.t - prev.t;
      if (dt < this.opts.minIntervalMs) return null;
      if (fix.floorId !== prev.floorId) reason = 'floor';
      else if ((fix.zoneId ?? '') !== (prev.zoneId ?? '')) reason = 'zone';
      else if (Math.hypot(fix.x - prev.x, fix.y - prev.y) > Math.max(this.opts.moveThresholdM, fix.r68)) reason = 'moved';
      else if (fix.quality !== prev.quality) reason = 'quality';
      else if (dt >= (motion === 'walking' ? this.opts.movingIntervalMs : this.opts.stillIntervalMs)) reason = 'interval';
    }
    if (reason) this.last = { ...fix };
    return reason;
  }

  reset(): void {
    this.last = null;
  }
}
