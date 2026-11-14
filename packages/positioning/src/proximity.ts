/**
 * Proximité entre deux personnes : distance de marche + incertitude combinée + fraîcheur.
 * Le libellé produit ne doit jamais être plus précis que les données.
 */
import { PositionEstimate } from './engine';
import { findRoute, Route } from './pathfinding';
import { Venue } from './venue';

export interface Proximity {
  /** Distance de marche estimée (m), ou distance à vol d'oiseau si aucun itinéraire. */
  distanceM: number;
  /** Incertitude combinée (m, ~68 %). */
  uncertaintyM: number;
  sameZone: boolean;
  sameFloor: boolean;
  route: Route | null;
  /** Libellé honnête destiné à l'interface. */
  label: string;
  level: 'here' | 'near' | 'far' | 'unknown' | 'stale';
}

export function proximity(venue: Venue, me: PositionEstimate, friend: PositionEstimate, staleAfterS = 120): Proximity {
  const unknown = (label: string, level: Proximity['level']): Proximity => ({
    distanceM: NaN, uncertaintyM: Infinity, sameZone: false, sameFloor: false, route: null, label, level,
  });
  if (friend.quality === 'unknown' || !Number.isFinite(friend.x)) return unknown('Position indisponible', 'unknown');
  if (friend.ageS > staleAfterS) {
    const min = Math.round(friend.ageS / 60);
    return { ...unknown(`Dernière position il y a ${min} min`, 'stale') };
  }
  if (me.quality === 'unknown' || !Number.isFinite(me.x)) {
    const zone = friend.zoneId ? venue.grid(friend.floorId).floor.zones.find((z) => z.id === friend.zoneId) : undefined;
    return unknown(zone ? `Vers « ${zone.name} »` : 'Votre position est inconnue', 'unknown');
  }
  const route = findRoute(venue, me, friend);
  const crow = me.floorId === friend.floorId ? Math.hypot(me.x - friend.x, me.y - friend.y) : NaN;
  const distanceM = route ? route.lengthM : crow;
  const uncertaintyM = Math.hypot(me.r68, friend.r68);
  const sameZone = !!me.zoneId && me.zoneId === friend.zoneId && me.zoneProb > 0.7 && friend.zoneProb > 0.7;
  const sameFloor = me.floorId === friend.floorId;
  const zoneName = friend.zoneId ? venue.grid(friend.floorId).floor.zones.find((z) => z.id === friend.zoneId)?.name : undefined;
  let label: string;
  let level: Proximity['level'];
  if (distanceM <= Math.max(5, uncertaintyM)) {
    label = sameZone && zoneName ? `Tout près, dans « ${zoneName} »` : 'Tout près de vous';
    level = 'here';
  } else {
    // Arrondi à la granularité permise par l'incertitude.
    const step = uncertaintyM < 5 ? 5 : uncertaintyM < 15 ? 10 : 25;
    const rounded = Math.max(step, Math.round(distanceM / step) * step);
    label = `≈ ${rounded} m${zoneName ? ` · « ${zoneName} »` : ''}${!sameFloor ? ' · autre étage' : ''}`;
    level = distanceM < 30 ? 'near' : 'far';
  }
  return { distanceM, uncertaintyM, sameZone, sameFloor, route, label, level };
}
