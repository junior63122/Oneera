import { describe, expect, it } from 'vitest';
import { parseSession, RadioMap, Rng, serializeSession, Venue } from '@oneera/positioning';
import { replaySession, simulatedSession } from '../src/replay';
import { buildTestClub } from '../src/venues/testClub';
import { generateTrajectory, World } from '../src/world';

describe('chaîne enregistrement → rejeu', () => {
  it('rejoue une session (sérialisée puis relue) avec des métriques cohérentes', () => {
    const venue = new Venue(buildTestClub(), 0.5);
    const world = new World(venue, { crowd: 0.5, platform: 'ios', seed: 31 });
    const rng = new Rng(31);
    const wps = [
      { floorId: 'L0', x: 25, y: 3, dwellS: 15 },
      { floorId: 'L0', x: 25, y: 22, dwellS: 30, dancing: true },
      { floorId: 'L0', x: 45, y: 18, dwellS: 30 },
      { floorId: 'L1', x: 20, y: 9, dwellS: 30 },
    ];
    const truth = generateTrajectory(venue, wps, rng);
    const text = serializeSession(simulatedSession(venue, truth, world));
    const { log, errors } = parseSession(text);
    expect(errors).toEqual([]);
    const m = replaySession(venue, new RadioMap(venue), log!, { particles: 800 });
    expect(m.checkpointsHit).toBeGreaterThan(20);
    expect(m.checkpointsWithoutFix).toBe(0);
    expect(m.timeToFirstFixS).toBeLessThanOrEqual(1);
    expect(m.median).toBeLessThan(5);
    expect(m.teleportsPerHour).toBe(0);
    expect(m.wallCrossPerHour).toBe(0);
    expect(m.offMapPct).toBe(0);
  }, 60_000);
});
