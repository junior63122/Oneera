import { describe, expect, it } from 'vitest';
import { MotionClassifier, Rng } from '../src';

const step = (heading: number) => ({ lengthM: 0.7, heading });

describe('classification marche / danse', () => {
  it('une marche régulière passe entièrement au moteur, y compris les premiers pas mis en attente', () => {
    const m = new MotionClassifier();
    let passed = 0;
    for (let t = 1; t <= 10; t++) passed += m.push(t, [step(0.3), step(0.32)]).length;
    expect(m.state).toBe('walking');
    expect(passed).toBe(20);
  });

  it('des faux pas de danse (caps aléatoires, épars) sont écartés', () => {
    const m = new MotionClassifier();
    const rng = new Rng(3);
    let passed = 0;
    for (let t = 1; t <= 120; t++) if (rng.chance(0.6)) passed += m.push(t, [step(rng.uniform(-Math.PI, Math.PI))]).length; else m.push(t, []);
    expect(passed).toBeLessThan(5);
    expect(m.state).not.toBe('walking');
  });

  it('danse puis départ en marche : la marche est reconnue en moins de 3 s', () => {
    const m = new MotionClassifier();
    const rng = new Rng(5);
    for (let t = 1; t <= 30; t++) m.push(t, rng.chance(0.6) ? [step(rng.uniform(-Math.PI, Math.PI))] : []);
    let firstWalk = -1;
    for (let t = 31; t <= 40; t++) {
      m.push(t, [step(1.2), step(1.25)]);
      if (m.state === 'walking' && firstWalk < 0) firstWalk = t;
    }
    expect(firstWalk).toBeGreaterThan(0);
    expect(firstWalk - 30).toBeLessThanOrEqual(3);
  });

  it('un virage pendant la marche ne la coupe pas', () => {
    const m = new MotionClassifier();
    const states: string[] = [];
    for (let t = 1; t <= 12; t++) {
      const h = t < 6 ? 0 : Math.PI / 2; // virage à 90°
      m.push(t, [step(h), step(h)]);
      if (t > 3) states.push(m.state);
    }
    expect(states.filter((s) => s !== 'walking').length).toBeLessThanOrEqual(1);
  });

  it('sans pas : immobile', () => {
    const m = new MotionClassifier();
    for (let t = 1; t <= 10; t++) m.push(t, []);
    expect(m.state).toBe('idle');
  });
});
