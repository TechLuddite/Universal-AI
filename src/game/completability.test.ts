import { describe, it, expect } from 'vitest';
import { playHeadless, unlockUpgrades } from './headless';
import { createInitialState } from './state';
import { tick } from './tick';
import { INITIAL_UPGRADES } from '../data/upgrades';
import { RECURRING_DECISION_BRANCHES } from '../data/decisionBranches';

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

  it('triggers the cosmic decision branch, which fires once the swarm is aloft', () => {
    expect(run.state.completedDecisionIds).toContain('branch_1_cosmic');
  });

  it('reaches Phase 3 by buying the probe launch project, not by drifting into it', () => {
    expect(run.state.purchasedUpgradeIds).toContain('space_exploration_initiative');
  });
});

describe('phase transitions are projects, not accidents', () => {
  it('exhausting Earth matter does not launch probes on its own', () => {
    // The tick used to flip phase 2 → 3 itself when the planet ran out,
    // conjuring 100 probes nobody built. The launch project is the only door.
    const stranded = {
      ...createInitialState(),
      phase: 2 as const,
      earthMatter: 0,
      acquiredMatter: 0,
    };
    const after = tick(stranded, 1000, () => 0.99);
    expect(after.phase).toBe(2);
    expect(after.probesCount).toBe(0);
  });

  it('the cosmic doctrine branch no longer sets the phase itself', () => {
    const inPhase2 = { ...createInitialState(), phase: 2 as const };
    const cosmic = RECURRING_DECISION_BRANCHES.find((b) => b.id === 'branch_1_cosmic')!;
    expect(cosmic.solarpunkOption.effect(inPhase2).phase).toBeUndefined();
    expect(cosmic.cyberpunkOption.effect(inPhase2).phase).toBeUndefined();
  });

  it('hypno-drones cannot be deployed before they are built', () => {
    // reqNpus alone used to surface the deployment; the fleet is a prerequisite.
    const rich = { ...createInitialState(), totalNpusCreated: 10_000_000 };
    const fresh = INITIAL_UPGRADES.map((u) => ({ ...u }));

    const withoutFleet = unlockUpgrades(rich, fresh);
    expect(withoutFleet.find((u) => u.id === 'release_hypno_drones')!.unlocked).toBe(false);

    const withFleet = unlockUpgrades(
      { ...rich, purchasedUpgradeIds: ['hypno_drones'] },
      fresh
    );
    expect(withFleet.find((u) => u.id === 'release_hypno_drones')!.unlocked).toBe(true);
  });
});
