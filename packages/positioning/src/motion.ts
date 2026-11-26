import type { StepEvent } from './engine';

/**
 * Classification de l'activité à partir du seul flux de pas du podomètre (aucune donnée vérité).
 *
 * Problème traité : en danse ou en agitation sur place, le podomètre du téléphone détecte de faux pas
 * dont le cap est quelconque. Intégrés tels quels, ils font dériver la position estimée.
 *
 * Principe : sur une fenêtre glissante, une marche réelle produit des pas réguliers (≥ ~1 pas/s) dont les caps
 * sont cohérents (longueur résultante moyenne R élevée). Des pas épars ou de caps dispersés = agitation.
 * Les pas reçus pendant l'indécision sont mis en attente puis rendus dès que la marche est confirmée :
 * le début d'un vrai déplacement n'est pas perdu, il est seulement différé de 1 à 2 s.
 */
export type MotionState = 'idle' | 'walking' | 'agitated';

export interface MotionOptions {
  /** Fenêtre d'analyse (s). */
  windowS: number;
  /** Nombre minimal de pas dans la fenêtre pour décider « marche ». */
  minSteps: number;
  /** Cadence minimale (pas/s) d'une marche. */
  minRate: number;
  /** Cohérence minimale des caps (longueur résultante moyenne, 0–1). */
  minCoherence: number;
  /** Durée maximale de mise en attente d'un pas non confirmé (s). */
  holdS: number;
}

export const DEFAULT_MOTION_OPTIONS: MotionOptions = { windowS: 3, minSteps: 4, minRate: 1.2, minCoherence: 0.7, holdS: 3 };

interface TimedStep extends StepEvent {
  t: number;
}

export class MotionClassifier {
  readonly opts: MotionOptions;
  private win: TimedStep[] = [];
  private held: TimedStep[] = [];
  private _state: MotionState = 'idle';

  constructor(opts: Partial<MotionOptions> = {}) {
    this.opts = { ...DEFAULT_MOTION_OPTIONS, ...opts };
  }

  get state(): MotionState {
    return this._state;
  }

  /**
   * Cohérence entre pas successifs (1 = cap stable, ~0 = caps aléatoires). Calculée sur les écarts de cap
   * d'un pas au suivant : un virage franc ne pèse qu'un écart, alors que la danse les rend tous aléatoires.
   */
  coherence(): number {
    if (this.win.length < 2) return 0;
    let c = 0, s = 0;
    for (let i = 1; i < this.win.length; i++) { const d = this.win[i].heading - this.win[i - 1].heading; c += Math.cos(d); s += Math.sin(d); }
    return Math.hypot(c, s) / (this.win.length - 1);
  }

  /**
   * Reçoit les pas détectés à l'instant `t` et renvoie ceux à transmettre au moteur
   * (éventuellement des pas mis en attente plus tôt et désormais confirmés).
   */
  push(t: number, steps: StepEvent[]): StepEvent[] {
    for (const s of steps) this.win.push({ ...s, t });
    this.win = this.win.filter((p) => t - p.t < this.opts.windowS);
    const n = this.win.length;
    const walking = n >= this.opts.minSteps && n / this.opts.windowS >= this.opts.minRate && this.coherence() >= this.opts.minCoherence;
    this._state = walking ? 'walking' : n ? 'agitated' : 'idle';
    if (walking) {
      // Seuls les pas en attente compatibles avec le cap de marche actuel sont rendus (les faux pas de danse restent écartés).
      const ref = this.win[this.win.length - 1].heading;
      const ok = this.held.filter((p) => Math.cos(p.heading - ref) > 0.5);
      const out = [...ok, ...steps.map((s) => ({ ...s, t }))];
      this.held = [];
      return out.map(({ lengthM, heading }) => ({ lengthM, heading }));
    }
    for (const s of steps) this.held.push({ ...s, t });
    // Un pas resté non confirmé trop longtemps était un faux pas : il est abandonné.
    this.held = this.held.filter((p) => t - p.t <= this.opts.holdS);
    return [];
  }

  reset(): void {
    this.win = [];
    this.held = [];
    this._state = 'idle';
  }
}
