import { describe, it, expect } from 'vitest';
import { playHeadless } from './headless';

describe('the game can actually be finished', () => {
  // 400k ticks is ~11 hours of game time at 100ms/tick, run in a few seconds.
  const run = playHeadless(400_000);

  it('unlocks NPU-gated upgrades', () => {
    // The unlock check tested `reqClips`, which no upgrade defines, so every
    // NPU-gated upgrade stayed invisible forever.
    const npuGated = run.upgrades.filter((u) => u.reqNpus !== undefined);
    expect(npuGated.length).toBeGreaterThan(0);
    expect(npuGated.filter((u) => u.unlocked).length).toBe(npuGated.length);
  });

  it('reaches Phase 2', () => {
    expect(run.phasesSeen.has(2)).toBe(true);
  });

  it('reaches Phase 3', () => {
    expect(run.phasesSeen.has(3)).toBe(true);
  });

  it('reaches the victory condition', () => {
    expect(run.won).toBe(true);
  });

  it('triggers the cosmic decision branch, which requires phase >= 2', () => {
    expect(run.state.completedDecisionIds).toContain('branch_1_cosmic');
  });
});
