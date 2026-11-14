/**
 * Suivi d'affichage de l'avatar : fluide, crédible, sans téléportation ni traversée de mur.
 *
 * L'estimation du filtre arrive ~1 Hz ; l'écran rafraîchit à 60 Hz. Le DisplayTracker fait marcher
 * l'avatar le long d'un itinéraire réel (A*) vers la dernière estimation, à vitesse de marche bornée.
 * Si l'écart devient trop grand (réacquisition après perte de signal, changement d'étage), il effectue
 * une transition explicite (fondu) et le signale : c'est une correction assumée, pas un saut caché.
 */
import { findRoute, RoutePoint } from './pathfinding';
import { PositionEstimate } from './engine';
import { Venue } from './venue';

export interface DisplayState {
  floorId: string;
  x: number;
  y: number;
  /** Rayon d'incertitude à dessiner (m) — l'interface ne doit jamais afficher un point « précis » sans lui. */
  radiusM: number;
  /** 'moving' le long d'un chemin, 'reacquired' juste après une transition explicite. */
  mode: 'hidden' | 'idle' | 'moving' | 'reacquired';
  stale: boolean;
}

export interface DisplayOptions {
  /** Vitesse maximale de l'avatar (m/s). Une personne marche à ~1,4 m/s ; on garde de la marge pour rattraper. */
  maxSpeed: number;
  /** Constante de temps de rattrapage (s). */
  tau: number;
  /** Au-delà de cette longueur d'itinéraire (m), on fait une transition explicite. */
  reacquireDistanceM: number;
  /** Seuil de déplacement ignoré (anti-tremblement, m). */
  deadbandM: number;
  /** Âge (s) au-delà duquel la position est marquée obsolète. */
  staleAfterS: number;
}

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  maxSpeed: 2.2,
  tau: 1.2,
  reacquireDistanceM: 20,
  deadbandM: 0.6,
  staleAfterS: 20,
};

export class DisplayTracker {
  private state: DisplayState = { floorId: '', x: NaN, y: NaN, radiusM: Infinity, mode: 'hidden', stale: false };
  private path: RoutePoint[] = [];
  private readonly opts: DisplayOptions;
  /** Nombre de transitions explicites (réacquisitions) — à surveiller en métrologie. */
  reacquisitions = 0;

  constructor(private readonly venue: Venue, opts: Partial<DisplayOptions> = {}) {
    this.opts = { ...DEFAULT_DISPLAY_OPTIONS, ...opts };
  }

  get current(): DisplayState {
    return this.state;
  }

  /** Nouvelle estimation du moteur. */
  setTarget(est: PositionEstimate): void {
    if (est.quality === 'unknown' || !Number.isFinite(est.x)) {
      this.state = { ...this.state, mode: this.state.mode === 'hidden' ? 'hidden' : this.state.mode, stale: true, radiusM: est.r95 };
      return;
    }
    const s = this.state;
    const radius = est.r68;
    const stale = est.ageS > this.opts.staleAfterS;
    if (s.mode === 'hidden') {
      this.state = { floorId: est.floorId, x: est.x, y: est.y, radiusM: radius, mode: 'reacquired', stale };
      this.path = [];
      return;
    }
    const d = Math.hypot(est.x - s.x, est.y - s.y);
    if (est.floorId === s.floorId && d < this.opts.deadbandM) {
      this.state = { ...s, radiusM: radius, stale };
      return;
    }
    const route = findRoute(this.venue, { floorId: s.floorId, x: s.x, y: s.y }, { floorId: est.floorId, x: est.x, y: est.y });
    if (!route || route.lengthM > this.opts.reacquireDistanceM || est.floorId !== s.floorId) {
      this.reacquisitions++;
      this.state = { floorId: est.floorId, x: est.x, y: est.y, radiusM: radius, mode: 'reacquired', stale };
      this.path = [];
      return;
    }
    this.path = route.points.slice(1);
    this.state = { ...s, radiusM: radius, stale, mode: 'moving' };
  }

  /** Avance l'animation de `dt` secondes. */
  tick(dt: number): DisplayState {
    const s = this.state;
    if (s.mode === 'hidden' || !this.path.length) {
      if (s.mode === 'moving' || s.mode === 'reacquired') this.state = { ...s, mode: 'idle' };
      return this.state;
    }
    const remaining = this.path.reduce((acc, p, i) => {
      const prev = i === 0 ? s : this.path[i - 1];
      return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
    }, 0);
    const speed = Math.min(this.opts.maxSpeed, remaining / this.opts.tau + 0.3);
    let budget = speed * dt;
    let { x, y } = s;
    while (budget > 0 && this.path.length) {
      const p = this.path[0];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= budget) {
        x = p.x;
        y = p.y;
        budget -= d;
        this.path.shift();
      } else {
        x += ((p.x - x) / d) * budget;
        y += ((p.y - y) / d) * budget;
        budget = 0;
      }
    }
    this.state = { ...s, x, y, mode: this.path.length ? 'moving' : 'idle' };
    return this.state;
  }

  hide(): void {
    this.state = { floorId: '', x: NaN, y: NaN, radiusM: Infinity, mode: 'hidden', stale: false };
    this.path = [];
  }
}
