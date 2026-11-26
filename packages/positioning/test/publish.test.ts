import { describe, expect, it } from 'vitest';
import { PublishableFix, PublishPolicy } from '../src';

const fix = (t: number, x = 0, extra: Partial<PublishableFix> = {}): PublishableFix => ({ t, floorId: 'L0', x, y: 0, r68: 2, zoneId: 'bar', quality: 'precise', ...extra });

/** Nombre d'envois sur `durS` secondes, une estimation par seconde. */
function count(p: PublishPolicy, durS: number, motion: 'walking' | 'idle', speed = 0) {
  let n = 0;
  for (let s = 0; s < durS; s++) if (p.decide(fix(s * 1000, s * speed), motion)) n++;
  return n;
}

describe("cadence d'envoi des positions", () => {
  it('immobile : un envoi toutes les 10 s (exigence 5–10 s)', () => {
    expect(count(new PublishPolicy(), 60, 'idle')).toBe(6);
  });

  it('en marche : un envoi toutes les 1–2 s', () => {
    const n = count(new PublishPolicy(), 60, 'walking', 1.2);
    expect(n).toBeGreaterThanOrEqual(30);
    expect(n).toBeLessThanOrEqual(60);
  });

  it('changement de zone ou d’étage : envoi immédiat (au plus 1/s)', () => {
    const p = new PublishPolicy();
    expect(p.decide(fix(0), 'idle')).toBe('first');
    expect(p.decide(fix(500, 0, { zoneId: 'dancefloor' }), 'idle')).toBeNull(); // < 1 s
    expect(p.decide(fix(1100, 0, { zoneId: 'dancefloor' }), 'idle')).toBe('zone');
    expect(p.decide(fix(2200, 0, { zoneId: 'dancefloor', floorId: 'L1' }), 'idle')).toBe('floor');
  });

  it('un déplacement plus petit que l’incertitude n’est pas envoyé avant l’échéance', () => {
    const p = new PublishPolicy();
    p.decide(fix(0, 0, { r68: 5 }), 'idle');
    expect(p.decide(fix(3000, 4, { r68: 5 }), 'idle')).toBeNull();
    expect(p.decide(fix(4000, 6, { r68: 5 }), 'idle')).toBe('moved');
  });

  it('une position non qualifiée n’est jamais envoyée', () => {
    expect(new PublishPolicy().decide(fix(0, 0, { quality: 'unknown' }), 'walking')).toBeNull();
  });
});
