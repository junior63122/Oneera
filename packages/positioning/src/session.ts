/**
 * Format d'enregistrement d'une session terrain (« oneera-session », JSON Lines).
 *
 * Ligne 1 : en-tête. Lignes suivantes : un événement capteur ou un marqueur de vérité par ligne,
 * dans l'ordre chronologique d'acquisition. Le format est volontairement brut (mesures telles que
 * fournies par l'OS) pour pouvoir rejouer une session avec n'importe quelle version du moteur.
 *
 * Données personnelles : une session de mesure est réalisée par l'équipe ONEERA ou un testeur
 * volontaire ; elle ne contient ni nom ni identifiant de compte.
 */
import { BleObservation } from './engine';

export const SESSION_FORMAT = 'oneera-session';
export const SESSION_VERSION = 1;

export interface SessionHeader {
  format: typeof SESSION_FORMAT;
  version: number;
  sessionId: string;
  venueId: string;
  mapVersion: number;
  device: { platform: 'ios' | 'android'; model: string; osVersion: string; appVersion: string };
  /** Début de la session (ms epoch). Les `t` des événements sont en secondes depuis ce début. */
  startedAt: number;
  /** Session du protocole terrain (S1…S6) et conditions. */
  protocol?: string;
  crowd?: 'empty' | 'light' | 'medium' | 'dense';
  /** Port du téléphone. */
  carry?: 'hand' | 'pocket' | 'bag' | 'mixed';
  notes?: string;
}

export interface Checkpoint {
  id: string;
  floorId: string;
  x: number;
  y: number;
}

export type SessionEvent =
  /** Fenêtre agrégée de mesures BLE (identifiant `uuid:major:minor` en minuscules). */
  | { k: 'ble'; t: number; obs: BleObservation[] }
  | { k: 'gnss'; t: number; lat: number; lon: number; acc: number }
  /** Pas détecté par le podomètre de l'OS (longueur estimée, cap dans le repère du plan, radians). */
  | { k: 'step'; t: number; len: number; heading: number }
  | { k: 'baro'; t: number; relAltM: number }
  | { k: 'activity'; t: number; still: boolean }
  /** Marqueur de vérité : l'opérateur confirme être sur le point de contrôle. */
  | { k: 'truth'; t: number; checkpointId: string }
  /** Points de contrôle (coordonnées relevées sur le plan coté) — en général en début de fichier. */
  | { k: 'checkpoints'; t: number; list: Checkpoint[] };

export interface SessionLog {
  header: SessionHeader;
  events: SessionEvent[];
}

export interface ParseResult {
  log: SessionLog | null;
  errors: string[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validateEvent(e: unknown): string | null {
  if (!e || typeof e !== 'object') return 'événement non objet';
  const ev = e as Record<string, unknown>;
  if (!isNum(ev.t) || (ev.t as number) < 0) return 'horodatage t invalide';
  switch (ev.k) {
    case 'ble':
      if (!Array.isArray(ev.obs)) return 'ble.obs manquant';
      for (const o of ev.obs as Record<string, unknown>[]) {
        if (typeof o?.beaconId !== 'string' || !isNum(o.rssi)) return 'observation BLE invalide';
      }
      return null;
    case 'gnss':
      return isNum(ev.lat) && isNum(ev.lon) && isNum(ev.acc) && Math.abs(ev.lat as number) <= 90 && Math.abs(ev.lon as number) <= 180 ? null : 'gnss invalide';
    case 'step':
      return isNum(ev.len) && isNum(ev.heading) && (ev.len as number) > 0 && (ev.len as number) < 2.5 ? null : 'pas invalide';
    case 'baro':
      return isNum(ev.relAltM) ? null : 'baromètre invalide';
    case 'activity':
      return typeof ev.still === 'boolean' ? null : 'activité invalide';
    case 'truth':
      return typeof ev.checkpointId === 'string' ? null : 'vérité invalide';
    case 'checkpoints':
      return Array.isArray(ev.list) && (ev.list as Record<string, unknown>[]).every((c) => typeof c.id === 'string' && typeof c.floorId === 'string' && isNum(c.x) && isNum(c.y))
        ? null : 'points de contrôle invalides';
    default:
      return `type d'événement inconnu : ${String(ev.k)}`;
  }
}

/** Lit un fichier JSON Lines. Les lignes invalides sont signalées et ignorées (jamais corrigées). */
export function parseSession(text: string): ParseResult {
  const errors: string[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { log: null, errors: ['fichier vide'] };
  let header: SessionHeader;
  try {
    header = JSON.parse(lines[0]);
  } catch {
    return { log: null, errors: ['en-tête illisible'] };
  }
  if (header.format !== SESSION_FORMAT) return { log: null, errors: ['format inconnu'] };
  if (header.version > SESSION_VERSION) return { log: null, errors: [`version ${header.version} non prise en charge`] };
  const events: SessionEvent[] = [];
  for (let i = 1; i < lines.length; i++) {
    let e: unknown;
    try {
      e = JSON.parse(lines[i]);
    } catch {
      errors.push(`ligne ${i + 1} : JSON illisible`);
      continue;
    }
    const err = validateEvent(e);
    if (err) errors.push(`ligne ${i + 1} : ${err}`);
    else events.push(e as SessionEvent);
  }
  events.sort((a, b) => a.t - b.t);
  return { log: { header, events }, errors };
}

export function serializeSession(log: SessionLog): string {
  return [JSON.stringify(log.header), ...log.events.map((e) => JSON.stringify(e))].join('\n') + '\n';
}

/** Identifiant canonique d'une balise iBeacon. */
export const ibeaconId = (uuid: string, major: number, minor: number): string => `${uuid.toLowerCase()}:${major}:${minor}`;
