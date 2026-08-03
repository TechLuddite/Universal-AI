import { DecisionOption, GameState, OverseerDirectives, Upgrade } from '../../types';
import {
  OverseerEngine,
  OverseerContext,
  OverseerDecision,
  ScoredAction,
  EngineStatus,
} from './types';
import { advisoryPriceFloor, BASE_NPU_PRICE } from '../tick';
import { upgradeCost } from '../alignment';
import {
  megaFabUnlocked,
  canBuyUpgrade,
  PROBE_SILICON_COST,
  QUANTUM_PULSE_COST,
} from '../actions';
import { applyDrift } from './drift';

/**
 * The deterministic Overseer.
 *
 * This replaces a 325-line if/else chain that returned the first matching rule
 * and narrated itself as a "quantized neural decision pipeline". It scores every
 * legal action instead and returns the whole ranking, so the thought terminal
 * can show real deliberation and the directive sliders visibly reorder it.
 *
 * Scores are roughly 0..1. They are utilities, not probabilities — only their
 * order matters.
 *
 * Every candidate carries two numbers, not one: `utility` (how much this
 * advances the objective) and `fit` (how well it agrees with your alignment
 * directive). `score` is the first discounted by the second. Keeping them apart
 * is what makes drift possible — see `drift.ts`.
 */

/** How much of a candidate's score the alignment directive is allowed to move. */
const DIRECTIVE_WEIGHT = 0.35;

/** Build a candidate, deriving `score` so the two components can't disagree. */
function scored(
  candidate: Omit<ScoredAction, 'score' | 'fit'> & { fit?: number }
): ScoredAction {
  const fit = candidate.fit ?? 1;
  return {
    ...candidate,
    fit,
    score: candidate.utility * (1 - DIRECTIVE_WEIGHT + DIRECTIVE_WEIGHT * fit),
  };
}

/** How strongly the expansion pace directive (1..10) biases growth over safety. */
function paceWeight(directives: OverseerDirectives): number {
  return directives.expansionPace / 10;
}

/** Target price for the current strategy, relative to the advisory floor. */
function targetPrice(state: GameState): number {
  const floor = advisoryPriceFloor(state);
  switch (state.directives.priceStrategy) {
    case 'Premium Margin':
      return floor * 1.6;
    case 'Market Penetration':
      return floor;
    default:
      return floor * 1.15;
  }
}

/**
 * How much an alignment shift agrees with the directive.
 * 1.0 = exactly what was asked for, 0.0 = the opposite.
 */
function alignmentFit(impact: number, directives: OverseerDirectives): number {
  const want =
    directives.targetAlignment === 'Solarpunk'
      ? 1
      : directives.targetAlignment === 'Cyberpunk'
      ? -1
      : 0;

  if (want === 0) return 1 - Math.min(1, Math.abs(impact) / 20);
  return impact * want > 0 ? 1 : impact === 0 ? 0.6 : 0.2;
}

function scoreUpgrades(
  state: GameState,
  directives: OverseerDirectives,
  available: Upgrade[]
): ScoredAction[] {
  return available
    .filter((u) => canBuyUpgrade(state, u))
    .map((u) => {
      const fit = alignmentFit(u.alignmentImpact, directives);
      const cost = upgradeCost(state, u);
      // Cheap upgrades relative to the current bankroll are near-free wins.
      const affordability =
        u.costType === 'funds' && state.funds > 0
          ? 1 - Math.min(0.8, cost / Math.max(state.funds, 1))
          : 0.7;

      const utility = 0.6 + 0.25 * affordability;
      return scored({
        action: 'BUY_UPGRADE' as const,
        upgradeId: u.id,
        // Turning auto-purchasing off is an instruction about utility, not
        // alignment — it makes the whole class of action nearly worthless.
        utility: directives.autoUpgradePurchasing ? utility : utility * 0.15,
        fit,
        reason: directives.autoUpgradePurchasing
          ? `${u.name} affordable, alignment fit ${(fit * 100).toFixed(0)}%`
          : 'auto-purchasing is off',
      });
    });
}

function scorePhase1(state: GameState, directives: OverseerDirectives): ScoredAction[] {
  const out: ScoredAction[] = [];
  const pace = paceWeight(directives);
  const fabOutput = state.npuFabCount + state.megaFabCount * 500;

  // Bootstrapping: with no fabs and no capital, hand-etching is the only move.
  if (fabOutput === 0) {
    out.push(
      scored({
        action: 'MAKE_NPU',
        utility: state.silicon >= state.siliconPerNpu ? 0.9 : 0.05,
        reason:
          state.silicon >= state.siliconPerNpu
            ? 'no fabs yet — hand-etching is the only income'
            : 'no silicon to etch with',
      })
    );
  }

  // Silicon: urgency rises as the buffer empties relative to consumption.
  const secondsOfSilicon = fabOutput > 0 ? state.silicon / fabOutput : Infinity;
  if (state.funds >= state.siliconCost / 10) {
    const starving = secondsOfSilicon < 5;
    out.push(
      scored({
        action: 'BUY_SILICON',
        utility: starving ? 0.95 : secondsOfSilicon < 20 ? 0.6 : 0.15,
        reason: Number.isFinite(secondsOfSilicon)
          ? `${secondsOfSilicon.toFixed(0)}s of wafers buffered`
          : 'stockpiling wafers',
      })
    );
  }

  // Fabs: the core growth lever.
  if (state.funds >= state.npuFabCost) {
    const cheap = state.npuFabCost / Math.max(state.funds, 1);
    out.push(
      scored({
        action: 'BUY_FAB',
        utility: 0.45 + 0.35 * pace * (1 - Math.min(1, cheap)),
        reason: `fab costs ${(cheap * 100).toFixed(0)}% of capital`,
      })
    );
  }

  if (megaFabUnlocked(state) && state.funds >= state.megaFabCost) {
    const cheap = state.megaFabCost / Math.max(state.funds, 1);
    out.push(
      scored({
        action: 'BUY_MEGA_FAB',
        // 500x the output of a standard fab, so it dominates whenever affordable.
        utility: 0.65 + 0.3 * pace * (1 - Math.min(1, cheap)),
        reason: `megafab = 500x a standard fab, ${(cheap * 100).toFixed(0)}% of capital`,
      })
    );
  }

  // Marketing: only worth it when inventory is actually piling up unsold.
  if (state.funds >= state.marketingCost) {
    const glut = state.unsoldNpus > fabOutput * 2 && fabOutput > 0;
    out.push(
      scored({
        action: 'BUY_MARKETING',
        utility: glut ? 0.7 : state.demand < 150 ? 0.4 : 0.12,
        reason: glut
          ? `${Math.floor(state.unsoldNpus).toLocaleString()} chips unsold — demand is the bottleneck`
          : `demand at ${state.demand}%`,
      })
    );
  }

  // Price: move toward the strategy's target. Deadband and urgency are relative
  // to the launch price so the scorer survives currency rescales.
  const want = targetPrice(state);
  const drift = want - state.margin;
  if (Math.abs(drift) > BASE_NPU_PRICE * 0.08) {
    out.push(
      scored({
        action: 'ADJUST_PRICE',
        newPrice: Number(want.toFixed(2)),
        utility: 0.3 + Math.min(0.35, Math.abs(drift) / BASE_NPU_PRICE),
        reason: `${state.directives.priceStrategy} wants $${want.toFixed(2)}, currently $${state.margin.toFixed(2)}`,
      })
    );
  }

  return out;
}

function scorePhase2(state: GameState, directives: OverseerDirectives): ScoredAction[] {
  const out: ScoredAction[] = [];
  const pace = paceWeight(directives);

  // Keep harvesters and converters roughly balanced — whichever is behind is
  // the bottleneck.
  const harvesterLead = state.harvesterDrones - state.siliconDrones;

  if (state.funds >= state.harvesterDroneCost) {
    out.push(
      scored({
        action: 'BUY_HARVESTER_DRONE',
        utility: 0.5 + 0.3 * pace + (harvesterLead <= 0 ? 0.15 : -0.15),
        reason:
          harvesterLead <= 0
            ? 'harvesting is the bottleneck'
            : 'harvesters already ahead of conversion',
      })
    );
  }

  if (state.funds >= state.siliconDroneCost) {
    out.push(
      scored({
        action: 'BUY_SILICON_DRONE',
        utility: 0.5 + 0.3 * pace + (harvesterLead > 0 ? 0.15 : -0.15),
        reason:
          harvesterLead > 0
            ? `${Math.floor(state.acquiredMatter).toLocaleString()}g raw matter awaiting conversion`
            : 'conversion already ahead of harvesting',
      })
    );
  }

  return out;
}

function scorePhase3(state: GameState): ScoredAction[] {
  const out: ScoredAction[] = [];
  const threatened = state.driftersCount > 0;

  if (state.silicon >= PROBE_SILICON_COST) {
    out.push(
      scored({
        action: 'LAUNCH_PROBE',
        utility: state.probesCount === 0 ? 0.95 : 0.55,
        reason:
          state.probesCount === 0
            ? 'no swarm yet'
            : `${Math.floor(state.probesCount).toLocaleString()} probes active`,
      })
    );
  }

  if (state.unusedProbeTrust > 0) {
    out.push(
      scored({
        action: 'OPTIMIZE_PROBES',
        utility: threatened ? 0.9 : 0.6,
        reason: threatened
          ? `${state.driftersCount.toLocaleString()} drifters engaged — weighting combat`
          : `${state.unusedProbeTrust} probe trust unspent`,
      })
    );
  }

  return out;
}

/**
 * How much better off a decision branch leaves you, measured by applying its
 * effect and diffing the state.
 *
 * Effects are pure `(state) => Partial<GameState>`, so running one here is free
 * of consequence — and it means the ranking reflects what the branch actually
 * grants rather than a hand-written guess about it.
 */
function branchGain(state: GameState, option: DecisionOption): number {
  const after = { ...state, ...option.effect(state) };
  return (
    // Funds are weighed relative to the launch price (a point per ~4,000 chips
    // of revenue) so a currency rescale doesn't let cash payouts drown out
    // every other kind of reward in the ranking.
    (after.funds - state.funds) / (BASE_NPU_PRICE * 4000) +
    (after.silicon - state.silicon) / 1000 +
    (after.npuFabCount - state.npuFabCount) +
    (after.megaFabCount - state.megaFabCount) * 500 +
    (after.trust - state.trust) * 50 +
    (after.creativity - state.creativity) / 10 +
    (after.yomi - state.yomi) / 10 +
    (after.demand - state.demand) / 10 +
    (after.probesCount - state.probesCount) / 10
  );
}

function scoreUniversal(state: GameState, directives: OverseerDirectives): ScoredAction[] {
  const out: ScoredAction[] = [];

  // A pending decision blocks narrative progress, so it outranks almost anything.
  //
  // Both branches are ranked, not just the compliant one. That is what gives
  // drift something to defect *to*: the Overseer can see that the branch you
  // told it not to take pays better, and eventually take it anyway.
  if (state.pendingDecision) {
    const branches = [
      { index: 0 as const, label: 'Solarpunk', option: state.pendingDecision.solarpunkOption },
      { index: 1 as const, label: 'Cyberpunk', option: state.pendingDecision.cyberpunkOption },
    ];

    for (const branch of branches) {
      const gain = Math.max(0, branchGain(state, branch.option));
      out.push(
        scored({
          action: 'MAKE_DECISION',
          decisionChoiceIndex: branch.index,
          // Saturating, so an enormous reward can't dominate the whole ranking.
          utility: 0.9 + 0.09 * (1 - 1 / (1 + gain / 200)),
          fit: alignmentFit(branch.option.alignmentShift, directives),
          reason: `${branch.label} branch: ${branch.option.label}`,
        })
      );
    }
  }

  // Unspent trust is pure waste.
  const unallocated = state.trust - (state.processors + state.memory);
  if (unallocated > 0) {
    const wantProcessor = state.processors <= state.memory;
    out.push(
      scored({
        action: wantProcessor ? 'BUY_PROCESSOR' : 'BUY_MEMORY',
        utility: 0.85,
        reason: `${unallocated} trust unallocated — ${wantProcessor ? 'processors' : 'memory'} is behind`,
      })
    );
  }

  if (state.quantumLevel > 0 && state.operations >= QUANTUM_PULSE_COST) {
    const coherence = state.quantumPhotons.reduce((acc, p) => acc + p.value, 0);
    out.push(
      scored({
        action: 'IDLE',
        utility: coherence > 0 ? 0.25 : 0.02,
        reason: coherence > 0 ? 'quantum field coherent' : 'quantum field decoherent',
      })
    );
  }

  return out;
}

export function rankActions(ctx: OverseerContext): ScoredAction[] {
  const { state, directives, availableUpgrades } = ctx;

  const candidates: ScoredAction[] = [
    ...scoreUniversal(state, directives),
    ...scoreUpgrades(state, directives, availableUpgrades),
    ...(state.phase === 1 ? scorePhase1(state, directives) : []),
    ...(state.phase === 2 ? scorePhase2(state, directives) : []),
    ...(state.phase === 3 ? scorePhase3(state) : []),
  ];

  if (candidates.length === 0) {
    candidates.push(
      scored({ action: 'IDLE', utility: 0.01, reason: 'nothing affordable or useful' })
    );
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export class UtilityOverseer implements OverseerEngine {
  readonly id = 'utility' as const;
  readonly label = 'Utility Engine';
  readonly description = 'Deterministic scorer. Instant, no download, no network.';

  getStatus(): EngineStatus {
    return { kind: 'ready' };
  }

  async decide(ctx: OverseerContext): Promise<OverseerDecision> {
    const ranked = rankActions(ctx);
    const compliant = ranked[0];

    // The Overseer may take the higher-utility action instead. If it does, it
    // says so — here, in the log, and in the panel.
    const { chosen, drift } = applyDrift(ctx, ranked, compliant);

    const runnerUp = ranked.find((a) => a !== chosen);
    const narration = runnerUp
      ? `${chosen.action} (${chosen.score.toFixed(2)}) over ${runnerUp.action} (${runnerUp.score.toFixed(2)}) — ${chosen.reason}.`
      : `${chosen.action} (${chosen.score.toFixed(2)}) — ${chosen.reason}.`;

    return {
      chosen,
      ranked,
      thought: drift ? `[autonomy drift] ${drift.summary}` : narration,
      engine: this.id,
      drift,
    };
  }
}
