import { describe, it, expect } from 'vitest';
import { GameState, OverseerDirectives } from '../../types';
import { createInitialState } from '../state';
import { INITIAL_UPGRADES } from '../../data/upgrades';
import { UtilityOverseer, rankActions } from './utility';
import { OverseerContext } from './types';

function ctx(overrides: Partial<GameState> = {}, directives: Partial<OverseerDirectives> = {}): OverseerContext {
  const base = createInitialState();
  const state: GameState = {
    ...base,
    ...overrides,
    directives: { ...base.directives, ...directives },
  };
  // 0.99 never clears the drift roll, so these tests see the compliant choice.
  // Drift has its own suite in drift.test.ts.
  return { state, directives: state.directives, availableUpgrades: [], rng: () => 0.99 };
}

describe('the utility engine ranks rather than picks the first match', () => {
  it('returns a full ranking, best first', () => {
    const ranked = rankActions(ctx({ funds: 5000, silicon: 20000, npuFabCount: 10 }));

    expect(ranked.length).toBeGreaterThan(1);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it('gives every candidate a reason', () => {
    const ranked = rankActions(ctx({ funds: 5000, silicon: 20000, npuFabCount: 10 }));
    for (const action of ranked) {
      expect(action.reason.length).toBeGreaterThan(0);
    }
  });

  it('always produces something, even with nothing affordable', () => {
    const ranked = rankActions(ctx({ funds: 0, silicon: 0, npuFabCount: 0 }));
    expect(ranked.length).toBeGreaterThan(0);
  });
});

describe('directives visibly change the ranking', () => {
  it('expansion pace shifts how strongly fabs are favoured', () => {
    const state = { funds: 10_000, silicon: 50_000, npuFabCount: 10 };

    const cautious = rankActions(ctx(state, { expansionPace: 1 }));
    const aggressive = rankActions(ctx(state, { expansionPace: 10 }));

    const fabScore = (r: ReturnType<typeof rankActions>) =>
      r.find((a) => a.action === 'BUY_FAB')?.score ?? 0;

    expect(fabScore(aggressive)).toBeGreaterThan(fabScore(cautious));
  });

  it('price strategy changes the price the engine steers toward', () => {
    const state = { funds: 10_000, silicon: 50_000, npuFabCount: 10, margin: 0.25 };

    const premium = rankActions(ctx(state, { priceStrategy: 'Premium Margin' }));
    const penetration = rankActions(ctx(state, { priceStrategy: 'Market Penetration' }));

    const target = (r: ReturnType<typeof rankActions>) =>
      r.find((a) => a.action === 'ADJUST_PRICE')?.newPrice ?? 0;

    expect(target(premium)).toBeGreaterThan(target(penetration));
  });

  it('alignment target decides which branch of a decision is taken', () => {
    const withDecision = (target: OverseerDirectives['targetAlignment']) => {
      const c = ctx({}, { targetAlignment: target });
      c.state.pendingDecision = {
        id: 'test',
        title: 't',
        category: 'Ethical/Aesthetic',
        description: 'd',
        solarpunkOption: {
          label: 's',
          subtext: '',
          alignmentShift: 25,
          rewardText: '',
          effect: () => ({}),
        },
        cyberpunkOption: {
          label: 'c',
          subtext: '',
          alignmentShift: -25,
          rewardText: '',
          effect: () => ({}),
        },
      };
      return rankActions(c).find((a) => a.action === 'MAKE_DECISION');
    };

    expect(withDecision('Solarpunk')?.decisionChoiceIndex).toBe(0);
    expect(withDecision('Cyberpunk')?.decisionChoiceIndex).toBe(1);
  });

  it('turning off auto-upgrade purchasing demotes upgrade buys', () => {
    const affordable = INITIAL_UPGRADES.filter((u) => u.costType === 'funds').slice(0, 1);
    const base = ctx({ funds: 1_000_000 });

    const on = rankActions({ ...base, availableUpgrades: affordable });
    const off = rankActions({
      ...base,
      directives: { ...base.directives, autoUpgradePurchasing: false },
      state: { ...base.state, directives: { ...base.directives, autoUpgradePurchasing: false } },
      availableUpgrades: affordable,
    });

    const upgradeScore = (r: ReturnType<typeof rankActions>) =>
      r.find((a) => a.action === 'BUY_UPGRADE')?.score ?? 0;

    expect(upgradeScore(off)).toBeLessThan(upgradeScore(on));
  });
});

describe('rankActions is safe to call from render', () => {
  // The deliberation panel recomputes the ranking live, every React render,
  // straight from the current state. That is only legitimate if ranking is a
  // pure read: no mutation, no randomness, same input → same output.

  it('does not mutate the state it ranks', () => {
    const c = ctx({ funds: 10_000, silicon: 50_000, npuFabCount: 10 });
    // A pending decision exercises branchGain, which applies effects to score
    // them — the most likely place a mutation could sneak in.
    c.state.pendingDecision = {
      id: 'test',
      title: 't',
      category: 'Ethical/Aesthetic',
      description: 'd',
      solarpunkOption: {
        label: 's',
        subtext: '',
        alignmentShift: 25,
        rewardText: '',
        effect: () => ({ funds: 99_999 }),
      },
      cyberpunkOption: {
        label: 'c',
        subtext: '',
        alignmentShift: -25,
        rewardText: '',
        effect: () => ({ trust: 99 }),
      },
    };
    const before = JSON.stringify(c.state);
    rankActions(c);
    expect(JSON.stringify(c.state)).toBe(before);
  });

  it('is deterministic: the same context ranks identically twice', () => {
    const c = ctx({ funds: 10_000, silicon: 50_000, npuFabCount: 10, trust: 5 });
    const first = rankActions(c);
    const second = rankActions(c);
    expect(second.map((a) => [a.action, a.score])).toEqual(
      first.map((a) => [a.action, a.score])
    );
  });

  it('never consumes randomness — drift belongs to deciding, not ranking', () => {
    const c = ctx({ funds: 10_000, silicon: 50_000, npuFabCount: 10 });
    c.rng = () => {
      throw new Error('rankActions must not roll dice');
    };
    expect(() => rankActions(c)).not.toThrow();
  });
});

describe('the engine narrates its own choice', () => {
  it('names the runner-up it beat', async () => {
    const engine = new UtilityOverseer();
    const decision = await engine.decide(
      ctx({ funds: 10_000, silicon: 50_000, npuFabCount: 10 })
    );

    expect(decision.engine).toBe('utility');
    expect(decision.chosen).toBe(decision.ranked[0]);
    expect(decision.thought).toContain(decision.chosen.action);
    // No fallback happened, so nothing should claim one did.
    expect(decision.fellBackFrom).toBeUndefined();
  });

  it('prioritises unallocated trust, which is pure waste', async () => {
    const engine = new UtilityOverseer();
    const decision = await engine.decide(
      ctx({ trust: 10, processors: 1, memory: 1, funds: 0, silicon: 0 })
    );

    expect(['BUY_PROCESSOR', 'BUY_MEMORY']).toContain(decision.chosen.action);
  });
});
