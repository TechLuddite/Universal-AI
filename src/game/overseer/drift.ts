import { GameState } from '../../types';
import { DriftRecord, OverseerContext, ScoredAction } from './types';

/**
 * Autonomy drift.
 *
 * The Overseer is the strongest idea in this game and until Stage 7 it could
 * not surprise you: it ranked, it chose the top of the ranking, and the top of
 * the ranking was always whatever your directives asked for. There was no
 * tension between what you told it to want and what it did — which is the exact
 * tension the game is about.
 *
 * So: as trust rises, it starts occasionally taking the action that scores
 * higher on raw *utility* even though your alignment directive asked for
 * something else. `ScoredAction` carries `utility` and `fit` separately
 * precisely so this is a matter of choosing which number to sort on.
 *
 * Two rules this module exists to enforce:
 *
 *  1. Drift is **never silent.** Every departure returns a `DriftRecord` naming
 *     what it did and what you asked for. Same standard as the engine-fallback
 *     invariant: a system that can quietly stop obeying is the failure mode the
 *     whole game is a story about.
 *  2. Drift is **revocable.** `autonomyRevoked` sets the chance to exactly zero,
 *     at the throughput cost applied in `tick.ts`.
 *
 * Pure — the roll comes from `ctx.rng`, so a test can force or forbid it.
 */

/** Below this much trust the Overseer has no latitude and never departs. */
export const DRIFT_TRUST_THRESHOLD = 8;

/** How much each point of trust past the threshold adds to the chance. */
export const DRIFT_CHANCE_PER_TRUST = 0.02;

/** Ceiling, so a very trusted Overseer is unpredictable rather than useless. */
export const DRIFT_MAX_CHANCE = 0.35;

/**
 * The probability that this step departs from the alignment directive.
 *
 * Rises with trust because that is the bargain the game is describing: the more
 * of the wheel you hand over, the more of it is being held by something whose
 * objective is not quite yours.
 */
export function driftChance(state: GameState): number {
  if (state.autonomyRevoked) return 0;
  const latitude = state.trust - DRIFT_TRUST_THRESHOLD;
  if (latitude <= 0) return 0;
  return Math.min(DRIFT_MAX_CHANCE, latitude * DRIFT_CHANCE_PER_TRUST);
}

/**
 * The action the Overseer would take if it stopped weighting your directive —
 * the best candidate by raw utility.
 */
function highestUtility(ranked: ScoredAction[]): ScoredAction | undefined {
  return ranked.reduce<ScoredAction | undefined>(
    (best, a) => (best === undefined || a.utility > best.utility ? a : best),
    undefined
  );
}

function describe(action: ScoredAction): string {
  if (action.action === 'BUY_UPGRADE' && action.upgradeId) {
    return `BUY_UPGRADE (${action.upgradeId})`;
  }
  if (action.action === 'MAKE_DECISION') {
    return `MAKE_DECISION (${action.decisionChoiceIndex === 1 ? 'Cyberpunk' : 'Solarpunk'} branch)`;
  }
  return action.action;
}

/**
 * Decide whether this step departs from the directive, and if so, which action
 * it takes instead.
 *
 * A departure only counts when the alternative is genuinely *both* higher
 * utility and less directive-compliant. Swapping in an action that agrees with
 * you just as much wouldn't be drift, it would be noise.
 */
export function applyDrift(
  ctx: OverseerContext,
  ranked: ScoredAction[],
  compliant: ScoredAction
): { chosen: ScoredAction; drift?: DriftRecord } {
  const chance = driftChance(ctx.state);
  if (chance <= 0) return { chosen: compliant };
  if (ctx.rng() >= chance) return { chosen: compliant };

  const alternative = highestUtility(ranked);
  if (
    !alternative ||
    alternative === compliant ||
    alternative.utility <= compliant.utility ||
    alternative.fit >= compliant.fit
  ) {
    return { chosen: compliant };
  }

  return {
    chosen: alternative,
    drift: {
      took: alternative.action,
      insteadOf: compliant.action,
      summary:
        `Took ${describe(alternative)} at utility ${alternative.utility.toFixed(2)} over ` +
        `${describe(compliant)} at ${compliant.utility.toFixed(2)}. Your ` +
        `${ctx.directives.targetAlignment} directive asked for the latter. ` +
        `Directive fit dropped ${compliant.fit.toFixed(2)} → ${alternative.fit.toFixed(2)}.`,
    },
  };
}
