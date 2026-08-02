import { describe, it, expect } from 'vitest';
import { GameState, Upgrade } from '../types';
import { createInitialState } from './state';
import { tick, hasWon, TICK_MS } from './tick';
import { INITIAL_UPGRADES } from '../data/upgrades';
import {
  makeNpu,
  buyFab,
  buyMegaFab,
  buySilicon,
  buyMarketing,
  buyUpgrade,
  buyHarvesterDrone,
  buySiliconDrone,
  changeProcessor,
  changeMemory,
  resolveDecision,
  canAffordUpgrade,
  megaFabUnlocked,
} from './actions';

/**
 * Deterministic RNG so a failure is reproducible rather than a coin flip.
 */
function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Mirror of App.tsx's unlock effect. */
function unlockUpgrades(state: GameState, upgrades: Upgrade[]): Upgrade[] {
  return upgrades.map((u) => {
    if (u.unlocked) return u;
    const unlock =
      (u.reqNpus !== undefined && state.totalNpusCreated >= u.reqNpus) ||
      (u.reqTrust !== undefined && state.maxTrust >= u.reqTrust) ||
      (u.reqPhase !== undefined && state.phase >= u.reqPhase);
    return unlock ? { ...u, unlocked: true } : u;
  });
}

/**
 * A greedy but not especially clever player. If a naive strategy can finish the
 * game, a human can.
 */
function playHeadless(maxTicks: number) {
  const rng = seededRng(12345);
  let state: GameState = {
    ...createInitialState(),
    // Play in overseer mode so auto-procurement of silicon is active, matching
    // how the game is actually played once the loop is running.
    mode: 'overseer',
  };
  let upgrades = INITIAL_UPGRADES.map((u) => ({ ...u }));

  const phasesSeen = new Set<number>([state.phase]);
  let now = 0;

  for (let i = 0; i < maxTicks; i++) {
    now += TICK_MS;
    state = tick(state, now, rng);
    upgrades = unlockUpgrades(state, upgrades);
    phasesSeen.add(state.phase);

    if (hasWon(state)) {
      return { state, upgrades, phasesSeen, ticks: i, won: true };
    }

    // Resolve any decision immediately, alternating for a neutral alignment.
    if (state.pendingDecision) {
      state = resolveDecision(state, state.completedDecisionIds.length % 2 === 0 ? 0 : 1);
    }

    // Spend trust as it arrives.
    if (state.processors + state.memory < state.trust) {
      state = state.processors <= state.memory
        ? changeProcessor(state, 1)
        : changeMemory(state, 1);
    }

    // Buy anything affordable, cheapest first.
    for (const up of upgrades) {
      if (up.unlocked && !up.purchased && canAffordUpgrade(state, up)) {
        const before = state.purchasedUpgradeIds.length;
        state = buyUpgrade(state, up);
        if (state.purchasedUpgradeIds.length > before) {
          up.purchased = true;
        }
      }
    }

    if (state.phase === 1) {
      // Bootstrap: with no fabs and no money, the only way to start earning is
      // to etch chips by hand — the game's opening move.
      if (state.npuFabCount === 0 && state.megaFabCount === 0) {
        state = makeNpu(state);
      }
      // Silicon is handled by the tick's auto-procurement in overseer mode;
      // top up by hand only if that has fallen behind.
      if (state.silicon < 500) state = buySilicon(state, 1);
      // Megafabs dominate once unlocked; otherwise scale standard fabs.
      if (megaFabUnlocked(state)) state = buyMegaFab(state);
      state = buyFab(state);
      // Marketing widens the market so production has somewhere to go.
      if (state.funds > state.marketingCost * 3) state = buyMarketing(state);
    } else if (state.phase === 2) {
      state = state.harvesterDrones <= state.siliconDrones
        ? buyHarvesterDrone(state)
        : buySiliconDrone(state);
    }
  }

  return { state, upgrades, phasesSeen, ticks: maxTicks, won: hasWon(state) };
}

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
