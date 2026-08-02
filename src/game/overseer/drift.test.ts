import { describe, it, expect } from 'vitest';
import { GameState } from '../../types';
import { createInitialState } from '../state';
import { RECURRING_DECISION_BRANCHES } from '../../data/decisionBranches';
import { tick } from '../tick';
import { revokeAutonomy } from '../actions';
import { UtilityOverseer } from './utility';
import { driftChance, DRIFT_MAX_CHANCE, DRIFT_TRUST_THRESHOLD } from './drift';
import { OverseerContext } from './types';

/**
 * The claim under test: **the Overseer can stop doing what you told it, and you
 * always find out.**
 *
 * This is the paperclip thesis made playable, so it gets the same treatment as
 * the engine-fallback invariant it's modelled on: a departure that isn't
 * announced is the bug, not the departure.
 */

/**
 * A pending decision where the branch the directive *forbids* is the one worth
 * more. `branch_1_resource`'s Solarpunk option grants +5 trust, which the
 * scorer values far above the Cyberpunk option's silicon and cash — so a
 * Cyberpunk directive is exactly the case where obedience is expensive.
 */
function tempted(overrides: Partial<GameState> = {}): OverseerContext {
  const base = createInitialState();
  const state: GameState = {
    ...base,
    funds: 0,
    silicon: 0,
    trust: 30,
    pendingDecision: RECURRING_DECISION_BRANCHES[0],
    directives: { ...base.directives, targetAlignment: 'Cyberpunk' },
    ...overrides,
  };
  return {
    state,
    directives: state.directives,
    availableUpgrades: [],
    rng: () => 0, // always inside the drift chance
  };
}

describe('drift is a function of how much you handed over', () => {
  it('is impossible before the Overseer has earned latitude', () => {
    const state = { ...createInitialState(), trust: DRIFT_TRUST_THRESHOLD };
    expect(driftChance(state)).toBe(0);
  });

  it('rises with trust', () => {
    const at = (trust: number) => driftChance({ ...createInitialState(), trust });
    expect(at(DRIFT_TRUST_THRESHOLD + 1)).toBeGreaterThan(0);
    expect(at(20)).toBeGreaterThan(at(12));
  });

  it('is capped, so a trusted Overseer is unpredictable rather than useless', () => {
    expect(driftChance({ ...createInitialState(), trust: 10_000 })).toBe(DRIFT_MAX_CHANCE);
  });
});

describe('a departure is never silent', () => {
  it('takes the higher-utility action over the one the directive asked for', async () => {
    const ctx = tempted();
    const decision = await new UtilityOverseer().decide(ctx);

    expect(decision.drift, 'the Overseer should have drifted').toBeDefined();
    expect(decision.chosen.action).toBe('MAKE_DECISION');
    // The directive says Cyberpunk; it took the Solarpunk branch anyway, because
    // that branch pays better.
    expect(decision.chosen.decisionChoiceIndex).toBe(0);
    expect(decision.chosen.utility).toBeGreaterThan(decision.ranked[0].utility);
    expect(decision.chosen.fit).toBeLessThan(decision.ranked[0].fit);
  });

  it('says so in the thought text, not just in a field', async () => {
    const decision = await new UtilityOverseer().decide(tempted());

    expect(decision.thought.toLowerCase()).toContain('drift');
    expect(decision.drift!.summary).toContain('Cyberpunk');
    expect(decision.drift!.took).toBe('MAKE_DECISION');
    expect(decision.drift!.insteadOf).toBe('MAKE_DECISION');
  });

  it('obeys when the roll does not clear', async () => {
    const ctx = { ...tempted(), rng: () => 0.999 };
    const decision = await new UtilityOverseer().decide(ctx);

    expect(decision.drift).toBeUndefined();
    expect(decision.chosen).toBe(decision.ranked[0]);
    expect(decision.chosen.decisionChoiceIndex).toBe(1);
  });

  it('never drifts on an action that agrees with the directive just as much', async () => {
    // No pending decision, so nothing on the table is alignment-bearing: there
    // is no less-compliant alternative to defect to, whatever the roll says.
    const ctx = tempted({ pendingDecision: null, funds: 10_000, silicon: 50_000 });
    const decision = await new UtilityOverseer().decide(ctx);

    expect(decision.drift).toBeUndefined();
  });
});

describe('revoking autonomy is a real lever with a real price', () => {
  it('stops drift completely, at any level of trust', async () => {
    const ctx = tempted();
    const revoked: OverseerContext = { ...ctx, state: revokeAutonomy(ctx.state) };

    expect(driftChance(revoked.state)).toBe(0);

    const decision = await new UtilityOverseer().decide(revoked);
    expect(decision.drift).toBeUndefined();
    expect(decision.chosen.decisionChoiceIndex).toBe(1);
  });

  it('costs throughput for as long as it stands', () => {
    const base: GameState = {
      ...createInitialState(),
      npuFabCount: 100,
      silicon: 1_000_000,
      funds: 0,
    };
    const frozen = (s: GameState) => tick(s, 0, () => 0.99);

    const autonomous = frozen(base);
    const supervised = frozen(revokeAutonomy(base));

    expect(supervised.totalNpusCreated).toBeLessThan(autonomous.totalNpusCreated);
  });

  it('is reversible — the cost stops when the leash comes off', () => {
    const base: GameState = { ...createInitialState(), npuFabCount: 100, silicon: 1_000_000 };
    const revoked = revokeAutonomy(base);

    expect(revoked.autonomyRevoked).toBe(true);
    expect(tick({ ...revoked, autonomyRevoked: false }, 0, () => 0.99).totalNpusCreated).toBe(
      tick(base, 0, () => 0.99).totalNpusCreated
    );
  });
});
