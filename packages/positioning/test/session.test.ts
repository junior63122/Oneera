import { describe, expect, it } from 'vitest';
import { ibeaconId, parseSession, serializeSession, SessionLog } from '../src';

const log: SessionLog = {
  header: {
    format: 'oneera-session', version: 1, sessionId: 's1', venueId: 'v', mapVersion: 1,
    device: { platform: 'ios', model: 'iPhone', osVersion: '18', appVersion: '0.1' }, startedAt: 1_800_000_000_000,
  },
  events: [
    { k: 'checkpoints', t: 0, list: [{ id: 'P1', floorId: 'L0', x: 1, y: 2 }] },
    { k: 'ble', t: 1, obs: [{ beaconId: ibeaconId('ABCD', 1, 7), rssi: -70, count: 4 }] },
    { k: 'step', t: 1.4, len: 0.7, heading: 1.2 },
    { k: 'truth', t: 2, checkpointId: 'P1' },
  ],
};

describe('format de session terrain', () => {
  it('aller-retour sans perte', () => {
    const back = parseSession(serializeSession(log));
    expect(back.errors).toEqual([]);
    expect(back.log).toEqual(log);
  });
  it('normalise les identifiants iBeacon', () => {
    expect(ibeaconId('ABCD-EF', 1, 2)).toBe('abcd-ef:1:2');
  });
  it('signale les lignes invalides sans les corriger', () => {
    const text = serializeSession(log) + '{"k":"step","t":3,"len":9,"heading":0}\nnimporte quoi\n';
    const r = parseSession(text);
    expect(r.log!.events).toHaveLength(4);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toMatch(/pas invalide/);
  });
  it('refuse un fichier d’un autre format', () => {
    expect(parseSession('{"format":"autre"}').log).toBeNull();
  });
});
