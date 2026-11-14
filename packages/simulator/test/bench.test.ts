import { describe, expect, it } from 'vitest';
import { runBench } from '../src/bench';

describe('banc de localisation (non-régression)', () => {
  it("le moteur V2 ne téléporte jamais l'avatar ni ne traverse de mur, et bat l'approche V1", () => {
    const res = runBench({ runs: 1, visits: 4, crowdLevels: [0.5], platforms: ['android'], seed: 99, particles: 600 });
    const ms = Object.values(res)[0];
    const v1 = ms.find((m) => m.name.startsWith('V1-like'))!;
    const v2 = ms.find((m) => m.name.includes('calibré sur site'))!;
    expect(v2.teleportsPerHour).toBe(0);
    expect(v2.wallCrossPerHour).toBe(0);
    expect(v2.offMapPct).toBe(0);
    expect(v2.median).toBeLessThan(v1.median);
    expect(v1.teleportsPerHour).toBeGreaterThan(100);
  }, 120_000);
});
