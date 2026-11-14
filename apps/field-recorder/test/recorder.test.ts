import { describe, expect, it } from 'vitest';
import { parseSession } from '@oneera/positioning';
import { BleWindow, compassToPlanHeading, pressureToRelAltitude, SessionRecorder } from '../src/core/recorder';

const georef = { origin: { lat: 43.55, lon: 7.01 }, rotationDeg: 0 };
const T0 = 1_800_000_000_000;

describe('fenêtrage BLE', () => {
  it('agrège par seconde, moyenne en dBm, écarte les RSSI non fiables (0)', () => {
    const w = new BleWindow();
    const b = (rssi: number, at: number, minor = 1) => ({ uuid: 'AA', major: 1, minor, rssi, at });
    expect(w.push(b(-70, T0))).toBeNull();
    expect(w.push(b(-80, T0 + 300))).toBeNull();
    expect(w.push(b(0, T0 + 400))).toBeNull();
    expect(w.push(b(-60, T0 + 500, 2))).toBeNull();
    const closed = w.push(b(-65, T0 + 1100))!;
    expect(closed.at).toBe(T0 + 1000);
    expect(closed.obs).toEqual([{ beaconId: 'aa:1:1', rssi: -75, count: 2 }, { beaconId: 'aa:1:2', rssi: -60, count: 1 }]);
    expect(w.flush()!.obs[0]).toMatchObject({ rssi: -65, count: 1 });
  });
});

describe('conversions', () => {
  it('cap boussole → repère du plan', () => {
    expect(compassToPlanHeading(90, georef)).toBeCloseTo(0);          // est = +x
    expect(compassToPlanHeading(0, georef)).toBeCloseTo(Math.PI / 2); // nord = +y
    expect(compassToPlanHeading(0, { ...georef, rotationDeg: 90 })).toBeCloseTo(0); // plan tourné de 90°
  });
  it('pression → altitude relative (~8,4 m par hPa au niveau de la mer)', () => {
    expect(pressureToRelAltitude(1013.25, 1013.25)).toBe(0);
    expect(pressureToRelAltitude(1012.75, 1013.25)).toBeCloseTo(4.2, 0);
  });
});

describe('enregistreur de session', () => {
  it('produit une session valide et rejouable', () => {
    const r = new SessionRecorder({
      sessionId: 's', venueId: 'test-club', mapVersion: 1, georef,
      device: { platform: 'android', model: 'Pixel', osVersion: '15', appVersion: '0.1.0' },
      checkpoints: [{ id: 'P1', floorId: 'L0', x: 25, y: 20 }], protocol: 'S1', crowd: 'empty', carry: 'hand',
    }, T0);
    r.onBeacon({ uuid: 'AA', major: 1, minor: 1, rssi: -70, at: T0 + 100 });
    r.onSteps(T0 + 200, 1); // ignoré : pas encore de cap
    r.onHeading(90);
    r.onSteps(T0 + 300, 2);
    r.onLocation(T0 + 400, 43.5513, 7.0128, 12);
    r.onPressure(T0 + 500, 1013);
    r.onActivity(T0 + 600, false);
    r.markTruth(T0 + 700, 'P1');
    expect(() => r.markTruth(T0 + 800, 'P9')).toThrow();
    r.onBeacon({ uuid: 'AA', major: 1, minor: 2, rssi: -60, at: T0 + 1200 });
    const { log, errors } = parseSession(r.finish());
    expect(errors).toEqual([]);
    const kinds = log!.events.map((e) => e.k);
    expect(kinds.filter((k) => k === 'step')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'ble')).toHaveLength(2);
    expect(kinds).toContain('truth');
    expect(r.stats.truthMarks).toBe(1);
    expect(log!.header.device.model).toBe('Pixel');
  });
});

import { StillnessDetector, validateFieldPack } from '../src/core/recorder';

describe('immobilité et pack de mesure', () => {
  it("détecte l'immobilité et le mouvement", () => {
    const d = new StillnessDetector(10, 0.02);
    let s: boolean | null = null;
    for (let i = 0; i < 10; i++) s = d.push(0, 0, 1 + (i % 2) * 0.001);
    expect(s).toBe(true);
    for (let i = 0; i < 10; i++) s = d.push(0, 0, 1 + (i % 2) * 0.3);
    expect(s).toBe(false);
  });
  it('refuse un pack sans UUID iBeacon valide', () => {
    expect(() => validateFieldPack({ venueId: 'v', venueName: 'V', georef: { rotationDeg: 0 }, ibeaconUuid: 'x', checkpoints: [{}] })).toThrow(/UUID/);
  });
});
