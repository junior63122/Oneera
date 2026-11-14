/**
 * Cœur de l'enregistreur terrain (TypeScript pur, sans dépendance React Native — testé unitairement).
 *
 * Reçoit les mesures brutes des capteurs (via les modules natifs / Expo), les normalise et produit
 * une session au format `oneera-session` (JSON Lines), rejouable dans le banc.
 */
import { BleObservation, Checkpoint, GeoRef, SESSION_FORMAT, SESSION_VERSION, SessionEvent, SessionHeader, ibeaconId, serializeSession } from '@oneera/positioning';

/** Paquet iBeacon brut (Android : chaque publicité reçue ; iOS : une valeur par seconde et par balise). */
export interface RawBeacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  /** ms epoch */
  at: number;
}

/**
 * Agrège les paquets BLE en fenêtres d'une seconde (moyenne des RSSI en dBm, nombre de paquets).
 * iOS renvoie rssi = 0 quand la mesure n'est pas fiable : ces valeurs sont écartées.
 */
export class BleWindow {
  private buf = new Map<string, number[]>();
  private windowStart: number | null = null;

  constructor(private readonly windowMs = 1000) {}

  /** Ajoute un paquet ; renvoie la fenêtre close si `at` en ouvre une nouvelle. */
  push(p: RawBeacon): { at: number; obs: BleObservation[] } | null {
    if (!(p.rssi < 0 && p.rssi > -110)) return null;
    let closed: { at: number; obs: BleObservation[] } | null = null;
    if (this.windowStart === null) this.windowStart = p.at;
    else if (p.at - this.windowStart >= this.windowMs) closed = this.flush(p.at);
    const id = ibeaconId(p.uuid, p.major, p.minor);
    let arr = this.buf.get(id);
    if (!arr) this.buf.set(id, (arr = []));
    arr.push(p.rssi);
    return closed;
  }

  /** Ferme la fenêtre courante (horodatée à sa fin) et en ouvre une nouvelle à `nextStart`. */
  flush(nextStart: number | null = null): { at: number; obs: BleObservation[] } | null {
    if (this.windowStart === null) return null;
    const at = this.windowStart + this.windowMs;
    const obs: BleObservation[] = [...this.buf.entries()].map(([beaconId, v]) => ({
      beaconId,
      rssi: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
      count: v.length,
    }));
    this.buf.clear();
    this.windowStart = nextStart;
    return obs.length ? { at, obs } : null;
  }
}

/**
 * Cap boussole (degrés, 0 = nord, sens horaire) → cap dans le repère du plan
 * (radians, 0 = axe +x du plan, sens trigonométrique), compte tenu de la rotation du géoréférencement.
 */
export function compassToPlanHeading(compassDeg: number, georef: GeoRef): number {
  // Cap boussole → angle trigonométrique par rapport à l'est.
  const fromEast = ((90 - compassDeg) * Math.PI) / 180;
  // L'axe x du plan fait un angle `rotationDeg` avec l'est.
  const a = fromEast - (georef.rotationDeg * Math.PI) / 180;
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Pression (hPa) → altitude relative (m) par la formule barométrique standard, par rapport à une pression de référence. */
export function pressureToRelAltitude(hPa: number, refHPa: number): number {
  return 44330 * (1 - Math.pow(hPa / refHPa, 1 / 5.255));
}

export interface RecorderOptions {
  sessionId: string;
  venueId: string;
  mapVersion: number;
  device: SessionHeader['device'];
  georef: GeoRef;
  checkpoints: Checkpoint[];
  protocol?: string;
  crowd?: SessionHeader['crowd'];
  carry?: SessionHeader['carry'];
  /** Longueur de pas par défaut si l'OS ne la fournit pas (m). */
  defaultStepLength?: number;
}

/** Statistiques affichées en direct à l'opérateur (contrôle qualité pendant la mesure). */
export interface LiveStats {
  elapsedS: number;
  beaconsLastWindow: number;
  strongestRssi: number | null;
  gnssAccuracyM: number | null;
  steps: number;
  truthMarks: number;
  lastCheckpoint: string | null;
}

export class SessionRecorder {
  private readonly events: SessionEvent[] = [];
  private readonly startedAt: number;
  private readonly ble: BleWindow;
  private lastHeading: number | null = null;
  private pressureRef: number | null = null;
  private lastStill: boolean | null = null;
  readonly stats: LiveStats = {
    elapsedS: 0, beaconsLastWindow: 0, strongestRssi: null, gnssAccuracyM: null, steps: 0, truthMarks: 0, lastCheckpoint: null,
  };

  constructor(private readonly opts: RecorderOptions, now: number) {
    this.startedAt = now;
    this.ble = new BleWindow();
    this.events.push({ k: 'checkpoints', t: 0, list: opts.checkpoints });
  }

  private t(at: number): number {
    const t = Math.max(0, (at - this.startedAt) / 1000);
    this.stats.elapsedS = t;
    return Math.round(t * 1000) / 1000;
  }

  onBeacon(p: RawBeacon): void {
    const w = this.ble.push(p);
    if (w) this.emitBle(w);
  }

  /** iOS : CoreLocation fournit déjà une valeur moyennée par seconde pour toutes les balises vues. */
  onBeaconBatch(at: number, beacons: Omit<RawBeacon, 'at'>[]): void {
    const obs = beacons
      .filter((b) => b.rssi < 0 && b.rssi > -110)
      .map((b) => ({ beaconId: ibeaconId(b.uuid, b.major, b.minor), rssi: b.rssi, count: 1 }));
    this.emitBle({ at, obs });
  }

  private emitBle(w: { at: number; obs: BleObservation[] }): void {
    this.stats.beaconsLastWindow = w.obs.length;
    this.stats.strongestRssi = w.obs.length ? Math.max(...w.obs.map((o) => o.rssi)) : null;
    this.events.push({ k: 'ble', t: this.t(w.at), obs: w.obs });
  }

  onLocation(at: number, lat: number, lon: number, accuracyM: number | null): void {
    if (accuracyM === null || !(accuracyM > 0)) return;
    this.stats.gnssAccuracyM = accuracyM;
    this.events.push({ k: 'gnss', t: this.t(at), lat, lon, acc: accuracyM });
  }

  onHeading(compassDeg: number): void {
    if (Number.isFinite(compassDeg)) this.lastHeading = compassToPlanHeading(compassDeg, this.opts.georef);
  }

  /** Nouveaux pas détectés depuis le dernier appel (podomètre cumulatif ou événement par pas). */
  onSteps(at: number, count: number, lengthM?: number): void {
    if (this.lastHeading === null || count <= 0) return;
    for (let i = 0; i < count; i++) {
      this.events.push({ k: 'step', t: this.t(at), len: lengthM ?? this.opts.defaultStepLength ?? 0.7, heading: this.lastHeading });
    }
    this.stats.steps += count;
  }

  /** Altitude relative fournie par l'OS (iOS CMAltimeter) en mètres. */
  onRelativeAltitude(at: number, relAltM: number): void {
    this.events.push({ k: 'baro', t: this.t(at), relAltM });
  }

  /** Pression brute (Android) en hPa. */
  onPressure(at: number, hPa: number): void {
    if (this.pressureRef === null) this.pressureRef = hPa;
    this.onRelativeAltitude(at, pressureToRelAltitude(hPa, this.pressureRef));
  }

  onActivity(at: number, still: boolean): void {
    if (still === this.lastStill) return;
    this.lastStill = still;
    this.events.push({ k: 'activity', t: this.t(at), still });
  }

  /** L'opérateur confirme être sur un point de contrôle. */
  markTruth(at: number, checkpointId: string): void {
    if (!this.opts.checkpoints.some((c) => c.id === checkpointId)) throw new Error(`Point de contrôle inconnu : ${checkpointId}`);
    this.events.push({ k: 'truth', t: this.t(at), checkpointId });
    this.stats.truthMarks++;
    this.stats.lastCheckpoint = checkpointId;
  }

  /** Termine la session et renvoie le fichier JSON Lines. */
  finish(): string {
    const w = this.ble.flush();
    if (w) this.emitBle(w);
    const header: SessionHeader = {
      format: SESSION_FORMAT, version: SESSION_VERSION, sessionId: this.opts.sessionId, venueId: this.opts.venueId,
      mapVersion: this.opts.mapVersion, device: this.opts.device, startedAt: this.startedAt,
      protocol: this.opts.protocol, crowd: this.opts.crowd, carry: this.opts.carry,
    };
    return serializeSession({ header, events: [...this.events].sort((a, b) => a.t - b.t) });
  }
}

/**
 * Détection d'immobilité à partir de l'accéléromètre (norme en g) : écart-type sur une fenêtre glissante.
 * Seuil volontairement bas : la danse sur place est « non immobile » (le moteur la gère comme telle).
 */
export class StillnessDetector {
  private buf: number[] = [];
  constructor(private readonly size = 40, private readonly threshold = 0.02) {}
  /** Ajoute un échantillon ; renvoie l'état courant ou null tant que la fenêtre n'est pas pleine. */
  push(x: number, y: number, z: number): boolean | null {
    this.buf.push(Math.hypot(x, y, z));
    if (this.buf.length > this.size) this.buf.shift();
    if (this.buf.length < this.size) return null;
    const m = this.buf.reduce((a, b) => a + b, 0) / this.buf.length;
    const sd = Math.sqrt(this.buf.reduce((a, b) => a + (b - m) ** 2, 0) / this.buf.length);
    return sd < this.threshold;
  }
}

/** Pack de mesure fourni par l'équipe ONEERA pour un lieu (plan, balises, points de contrôle). */
export interface FieldPack {
  venueId: string;
  mapVersion: number;
  venueName: string;
  georef: GeoRef;
  ibeaconUuid: string;
  checkpoints: Checkpoint[];
}

export function validateFieldPack(p: unknown): FieldPack {
  const f = p as FieldPack;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!f || typeof f.venueId !== 'string' || typeof f.venueName !== 'string') throw new Error('Pack invalide : lieu');
  if (!f.georef || typeof f.georef.rotationDeg !== 'number') throw new Error('Pack invalide : géoréférence');
  if (!uuidRe.test(f.ibeaconUuid ?? '')) throw new Error('Pack invalide : UUID iBeacon');
  if (!Array.isArray(f.checkpoints) || !f.checkpoints.length) throw new Error('Pack invalide : points de contrôle');
  return f;
}
