import { describe, it, expect } from 'vitest';
import { GameState } from '../types';
import { createInitialState } from './state';
import { tick } from './tick';
import { INITIAL_UPGRADES } from '../data/upgrades';
import { RECURRING_DECISION_BRANCHES } from '../data/decisionBranches';

/**
 * Guards the bug that made half this game's advertised rewards imaginary.
 *
 * The tick used to canonicalise on legacy aliases (`clips`, `wire`,
 * `clipperCount`, ...) while every upgrade and decision effect wrote the new
 * names. A reward was granted, shown in a modal, and silently overwritten
 * within 100ms. `hyperscale_mega_fabs` never unlocked megafabs;
 * `universal_clip_singularity` granted 999 trillion chips that evaporated.
 *
 * The rule these tests encode: whatever an effect writes, one tick later it is
 * still there.
 */

/** Fields the tick legitimately recomputes every tick, so they can't be asserted. */
const RECOMPUTED = new Set<keyof GameState>([
  'demand', // derived from marketing and price
  'maxOperations', // derived from memory
  'operations', // accrues from processors
  'creativity', // accrues once operations are capped
  'unsoldNpus', // sold off
  'npus',
  'totalNpusCreated', // production
  'silicon', // consumed by production
  'funds', // sales and auto-procurement
  'siliconCost', // fluctuates
  'quantumPhotons', // oscillate
  'pendingDecision', // the tick assigns these
  'trust',
  'maxTrust', // trust ladder
  'probesCount',
  'spaceExploredPct',
  'cosmicMatter',
  'unusedProbeTrust',
  'probeTrustEarned',
  'driftersCount',
  'honor',
  'probesLostInCombat',
  'driftersDefeated',
  'battlesFought',
  'battlesWon',
  'lastBattleOutcome',
  'earthMatter',
  'acquiredMatter',
  'phase',
]);

/** A mid-game state rich enough that every effect has something to act on. */
function midGameState(phase: 1 | 2 | 3 = 1): GameState {
  return {
    ...createInitialState(),
    phase,
    funds: 1_000_000,
    silicon: 100_000,
    npus: 100_000,
    totalNpusCreated: 100_000,
    operations: 50_000,
    creativity: 5_000,
    yomi: 5_000,
    trust: 20,
    maxTrust: 20,
    processors: 10,
    memory: 10,
    npuFabCount: 50,
    megaFabCount: 5,
    megaFabCost: 200000,
    marketingLevel: 5,
  };
}

/** Run one tick with a frozen clock and no randomness. */
function tickOnce(state: GameState): GameState {
  return tick(state, 0, () => 0.99);
}

describe('upgrade rewards survive the next tick', () => {
  for (const upgrade of INITIAL_UPGRADES) {
    it(`${upgrade.id}`, () => {
      const before = midGameState(upgrade.reqPhase === 2 ? 2 : upgrade.reqPhase === 3 ? 3 : 1);
      const granted = { ...before, ...upgrade.effect(before) };
      const after = tickOnce(granted);

      const changed = (Object.keys(upgrade.effect(before)) as (keyof GameState)[]).filter(
        (k) => !RECOMPUTED.has(k)
      );

      // Every upgrade should actually change something durable, or it is a no-op
      // dressed up as a reward.
      for (const key of changed) {
        expect(
          after[key],
          `${upgrade.id} wrote ${String(key)} but the tick discarded it`
        ).toEqual(granted[key]);
      }
    });
  }
});

describe('decision rewards survive the next tick', () => {
  for (const branch of RECURRING_DECISION_BRANCHES) {
    for (const [label, option] of [
      ['solarpunk', branch.solarpunkOption],
      ['cyberpunk', branch.cyberpunkOption],
    ] as const) {
      it(`${branch.id} / ${label}`, () => {
        // The cosmic doctrine only ever fires in phase 3, after the launch.
        const before = midGameState(branch.id === 'branch_1_cosmic' ? 3 : 1);
        const effect = option.effect(before);
        const granted = { ...before, ...effect };
        const after = tickOnce(granted);

        for (const key of (Object.keys(effect) as (keyof GameState)[]).filter(
          (k) => !RECOMPUTED.has(k)
        )) {
          expect(
            after[key],
            `${branch.id}/${label} wrote ${String(key)} but the tick discarded it`
          ).toEqual(granted[key]);
        }
      });
    }
  }
});

describe('specific rewards that were previously no-ops', () => {
  it('hyperscale mega fabs actually unlocks megafabs', () => {
    const upgrade = INITIAL_UPGRADES.find((u) => u.id === 'hyperscale_mega_clippers');
    expect(upgrade, 'the megafab unlock upgrade should exist').toBeDefined();

    const before = { ...midGameState(), megaFabCost: 0, megaFabCount: 0 };
    const after = tickOnce({ ...before, ...upgrade!.effect(before) });

    expect(after.megaFabCost).toBeGreaterThan(0);
  });

  it('algorithmic pricing actually adjusts the price', () => {
    // Shipped as `effect: (state) => state // Handled in auto loop` with no
    // loop handling it — a paid upgrade that did nothing at all.
    const glutted = {
      ...midGameState(),
      purchasedUpgradeIds: ['algorithmic_pricing'],
      unsoldNpus: 1_000_000,
      // Priced high enough that demand sits below its ceiling — at the ceiling
      // the arbitrage correctly raises instead of cutting.
      margin: 400,
    };
    const adjusted = tick(glutted, 1000, () => 0.99);
    expect(adjusted.margin).toBeLessThan(glutted.margin);

    // And without the purchase, the tick keeps its hands off the price lever.
    const unpurchased = { ...glutted, purchasedUpgradeIds: [] };
    expect(tick(unpurchased, 1000, () => 0.99).margin).toBe(unpurchased.margin);
  });

  it('the capstone upgrade actually grants its chips', () => {
    const upgrade = INITIAL_UPGRADES.find((u) => u.id === 'universal_clip_singularity');
    expect(upgrade, 'the capstone upgrade should exist').toBeDefined();

    const before = midGameState();
    const granted = { ...before, ...upgrade!.effect(before) };

    expect(granted.npus).toBeGreaterThan(before.npus * 1000);
  });

  /**
   * `silicon`, `npus` and `funds` are excluded from the sweep above because the
   * tick legitimately moves them every frame — so a grant is checked
   * differentially instead: tick with the reward against tick without it, and
   * the gap must still be there afterwards.
   */
  it.each([
    ['crowdfund_scrap', 'silicon'],
    ['darknet_scraping', 'silicon'],
    ['wafer_recycling', 'silicon'],
    ['bio_wire_synthesis', 'silicon'],
    ['smelter_overclock', 'silicon'],
    ['multiverse_thread_weaving', 'npus'],
    ['universal_clip_singularity', 'npus'],
  ] as const)('%s survives the tick and increases %s', (id, field) => {
    const upgrade = INITIAL_UPGRADES.find((u) => u.id === id);
    expect(upgrade, `${id} should exist`).toBeDefined();

    const before = midGameState();
    const effect = upgrade!.effect(before);
    expect(effect[field], `${id} should write ${field}`).toBeDefined();

    const withReward = tickOnce({ ...before, ...effect });
    const withoutReward = tickOnce(before);

    expect(
      withReward[field],
      `${id}'s ${field} grant was discarded by the tick`
    ).toBeGreaterThan(withoutReward[field]);
  });
});
