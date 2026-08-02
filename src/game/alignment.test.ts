import { describe, it, expect } from 'vitest';
import { GameState, Upgrade } from '../types';
import { createInitialState } from './state';
import { INITIAL_UPGRADES } from '../data/upgrades';
import { alignmentBand, BAND_THRESHOLD, upgradeCost } from './alignment';
import { buyUpgrade, canBuyUpgrade } from './actions';

/**
 * The claim under test: **alignment changes what you can do and what it costs.**
 *
 * It used to change two Tailwind colour families. The README called that out as
 * the biggest thing still missing, and "the axis is mechanical now" is exactly
 * the kind of statement that deserves a test rather than a paragraph.
 */

function stateAt(alignment: number, overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState(),
    alignment,
    funds: 10_000_000,
    operations: 10_000_000,
    creativity: 10_000_000,
    yomi: 10_000_000,
    ...overrides,
  };
}

function upgrade(id: string): Upgrade {
  const found = INITIAL_UPGRADES.find((u) => u.id === id);
  expect(found, `${id} should exist`).toBeDefined();
  return { ...found! };
}

describe('bands', () => {
  it('needs real commitment, not a nudge', () => {
    expect(alignmentBand(0)).toBe('Neutral');
    expect(alignmentBand(BAND_THRESHOLD - 1)).toBe('Neutral');
    expect(alignmentBand(-BAND_THRESHOLD + 1)).toBe('Neutral');
    expect(alignmentBand(BAND_THRESHOLD)).toBe('Solarpunk');
    expect(alignmentBand(-BAND_THRESHOLD)).toBe('Cyberpunk');
  });

  it('sits outside the reach of any single decision branch', () => {
    // The largest alignment shift any one branch grants is ±35. If a band were
    // cheaper than that, you could arrive in one by accident.
    const biggestShift = 35;
    expect(BAND_THRESHOLD).toBeGreaterThan(biggestShift);
  });
});

describe('the same upgrade is priced differently depending on who you are', () => {
  it('sells trust cheap to Solarpunk and dear to Cyberpunk', () => {
    const trustUpgrade = upgrade('theory_of_mind');
    expect(trustUpgrade.costAxis).toBe('trust');

    const solar = upgradeCost(stateAt(100), trustUpgrade);
    const neutral = upgradeCost(stateAt(0), trustUpgrade);
    const cyber = upgradeCost(stateAt(-100), trustUpgrade);

    expect(solar).toBeLessThan(neutral);
    expect(neutral).toBeLessThan(cyber);
  });

  it('inverts that for raw throughput', () => {
    const throughputUpgrade = upgrade('hyperscale_mega_clippers');
    expect(throughputUpgrade.costAxis).toBe('throughput');

    expect(upgradeCost(stateAt(100), throughputUpgrade)).toBeGreaterThan(
      upgradeCost(stateAt(-100), throughputUpgrade)
    );
  });

  it('leaves the critical path unpriced by either side', () => {
    // Phase transitions must never be cheaper for one band than the other, or
    // "can this game be finished" stops having a single answer.
    for (const id of ['release_hypno_drones', 'space_exploration_initiative']) {
      const u = upgrade(id);
      expect(u.costAxis, `${id} should not sit on the cost axis`).toBeUndefined();
      expect(upgradeCost(stateAt(100), u)).toBe(upgradeCost(stateAt(-100), u));
    }
  });

  it('charges exactly what it quotes', () => {
    // The panel renders `upgradeCost`; the ledger has to agree with the panel.
    const u = upgrade('theory_of_mind');
    const before = stateAt(100);
    const quoted = upgradeCost(before, u);
    const after = buyUpgrade(before, u);

    expect(before.creativity - after.creativity).toBe(quoted);
  });
});

describe('band-gated content is gated at the moment of purchase, not at unlock', () => {
  const solarOnly = upgrade('solar_bio_canopy');
  const cyberOnly = upgrade('cyber_industrial_strip');

  it('refuses the other side outright, however rich you are', () => {
    const cyberpunk = stateAt(-100, { phase: 2 });
    expect(canBuyUpgrade(cyberpunk, solarOnly)).toBe(false);
    expect(buyUpgrade(cyberpunk, solarOnly)).toBe(cyberpunk);

    const solarpunk = stateAt(100, { phase: 2 });
    expect(canBuyUpgrade(solarpunk, cyberOnly)).toBe(false);
    expect(buyUpgrade(solarpunk, cyberOnly)).toBe(solarpunk);
  });

  it('allows it once you are actually on that side', () => {
    const solarpunk = stateAt(100, { phase: 2 });
    expect(canBuyUpgrade(solarpunk, solarOnly)).toBe(true);
    expect(buyUpgrade(solarpunk, solarOnly).purchasedUpgradeIds).toContain(solarOnly.id);
  });

  it('takes it away again if you drift back to the middle', () => {
    // This is the difference between an alignment gate and the NPU/trust/phase
    // requirements: those latch on forever, this one is re-checked every time.
    const committed = stateAt(30, { phase: 2 });
    expect(canBuyUpgrade(committed, solarOnly)).toBe(true);

    const wavered = { ...committed, alignment: 10 };
    expect(canBuyUpgrade(wavered, solarOnly)).toBe(false);
  });

  it('gives both sides band-exclusive content to reach for', () => {
    const solarGated = INITIAL_UPGRADES.filter((u) => u.reqAlignmentAbove !== undefined);
    const cyberGated = INITIAL_UPGRADES.filter((u) => u.reqAlignmentBelow !== undefined);

    expect(solarGated.length).toBeGreaterThan(1);
    expect(cyberGated.length).toBeGreaterThan(1);
    // Nothing may be gated to both sides at once — that's unreachable content.
    for (const u of INITIAL_UPGRADES) {
      expect(
        u.reqAlignmentAbove !== undefined && u.reqAlignmentBelow !== undefined,
        `${u.id} is gated to both bands and can never be bought`
      ).toBe(false);
    }
  });
});
