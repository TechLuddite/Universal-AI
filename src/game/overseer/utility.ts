import { GameState, OverseerDirectives, Upgrade } from '../../types';
import {
  OverseerEngine,
  OverseerContext,
  OverseerDecision,
  ScoredAction,
  EngineStatus,
} from './types';
import { advisoryPriceFloor } from '../tick';
import {
  megaFabUnlocked,
  canAffordUpgrade,
  PROBE_SILICON_COST,
  QUANTUM_PULSE_COST,
} from '../actions';

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
 */

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
 * How much this upgrade's alignment shift agrees with the directive.
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
    .filter((u) => canAffordUpgrade(state, u))
    .map((u) => {
      const fit = alignmentFit(u.alignmentImpact, directives);
      // Cheap upgrades relative to the current bankroll are near-free wins.
      const affordability =
        u.costType === 'funds' && state.funds > 0
          ? 1 - Math.min(0.8, u.costAmount / Math.max(state.funds, 1))
          : 0.7;

      const score = 0.55 + 0.25 * fit + 0.2 * affordability;
      return {
        action: 'BUY_UPGRADE' as const,
        upgradeId: u.id,
        score: directives.autoUpgradePurchasing ? score : score * 0.15,
        reason: directives.autoUpgradePurchasing
          ? `${u.name} affordable, alignment fit ${(fit * 100).toFixed(0)}%`
          : 'auto-purchasing is off',
      };
    });
}

function scorePhase1(state: GameState, directives: OverseerDirectives): ScoredAction[] {
  const out: ScoredAction[] = [];
  const pace = paceWeight(directives);
  const fabOutput = state.npuFabCount + state.megaFabCount * 500;

  // Bootstrapping: with no fabs and no capital, hand-etching is the only move.
  if (fabOutput === 0) {
    out.push({
      action: 'MAKE_NPU',
      score: state.silicon >= state.siliconPerNpu ? 0.9 : 0.05,
      reason:
        state.silicon >= state.siliconPerNpu
          ? 'no fabs yet — hand-etching is the only income'
          : 'no silicon to etch with',
    });
  }

  // Silicon: urgency rises as the buffer empties relative to consumption.
  const secondsOfSilicon = fabOutput > 0 ? state.silicon / fabOutput : Infinity;
  if (state.funds >= state.siliconCost / 10) {
    const starving = secondsOfSilicon < 5;
    out.push({
      action: 'BUY_SILICON',
      score: starving ? 0.95 : secondsOfSilicon < 20 ? 0.6 : 0.15,
      reason: Number.isFinite(secondsOfSilicon)
        ? `${secondsOfSilicon.toFixed(0)}s of wafers buffered`
        : 'stockpiling wafers',
    });
  }

  // Fabs: the core growth lever.
  if (state.funds >= state.npuFabCost) {
    const cheap = state.npuFabCost / Math.max(state.funds, 1);
    out.push({
      action: 'BUY_FAB',
      score: 0.45 + 0.35 * pace * (1 - Math.min(1, cheap)),
      reason: `fab costs ${(cheap * 100).toFixed(0)}% of capital`,
    });
  }

  if (megaFabUnlocked(state) && state.funds >= state.megaFabCost) {
    const cheap = state.megaFabCost / Math.max(state.funds, 1);
    out.push({
      action: 'BUY_MEGA_FAB',
      // 500x the output of a standard fab, so it dominates whenever affordable.
      score: 0.65 + 0.3 * pace * (1 - Math.min(1, cheap)),
      reason: `megafab = 500x a standard fab, ${(cheap * 100).toFixed(0)}% of capital`,
    });
  }

  // Marketing: only worth it when inventory is actually piling up unsold.
  if (state.funds >= state.marketingCost) {
    const glut = state.unsoldNpus > fabOutput * 2 && fabOutput > 0;
    out.push({
      action: 'BUY_MARKETING',
      score: glut ? 0.7 : state.demand < 150 ? 0.4 : 0.12,
      reason: glut
        ? `${Math.floor(state.unsoldNpus).toLocaleString()} chips unsold — demand is the bottleneck`
        : `demand at ${state.demand}%`,
    });
  }

  // Price: move toward the strategy's target.
  const want = targetPrice(state);
  const drift = want - state.margin;
  if (Math.abs(drift) > 0.02) {
    out.push({
      action: 'ADJUST_PRICE',
      newPrice: Number(want.toFixed(2)),
      score: 0.3 + Math.min(0.35, Math.abs(drift)),
      reason: `${state.directives.priceStrategy} wants $${want.toFixed(2)}, currently $${state.margin.toFixed(2)}`,
    });
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
    out.push({
      action: 'BUY_HARVESTER_DRONE',
      score: 0.5 + 0.3 * pace + (harvesterLead <= 0 ? 0.15 : -0.15),
      reason:
        harvesterLead <= 0
          ? 'harvesting is the bottleneck'
          : 'harvesters already ahead of conversion',
    });
  }

  if (state.funds >= state.siliconDroneCost) {
    out.push({
      action: 'BUY_SILICON_DRONE',
      score: 0.5 + 0.3 * pace + (harvesterLead > 0 ? 0.15 : -0.15),
      reason:
        harvesterLead > 0
          ? `${Math.floor(state.acquiredMatter).toLocaleString()}g raw matter awaiting conversion`
          : 'conversion already ahead of harvesting',
    });
  }

  return out;
}

function scorePhase3(state: GameState): ScoredAction[] {
  const out: ScoredAction[] = [];
  const threatened = state.driftersCount > 0;

  if (state.silicon >= PROBE_SILICON_COST) {
    out.push({
      action: 'LAUNCH_PROBE',
      score: state.probesCount === 0 ? 0.95 : 0.55,
      reason:
        state.probesCount === 0
          ? 'no swarm yet'
          : `${Math.floor(state.probesCount).toLocaleString()} probes active`,
    });
  }

  if (state.unusedProbeTrust > 0) {
    out.push({
      action: 'OPTIMIZE_PROBES',
      score: threatened ? 0.9 : 0.6,
      reason: threatened
        ? `${state.driftersCount.toLocaleString()} drifters engaged — weighting combat`
        : `${state.unusedProbeTrust} probe trust unspent`,
    });
  }

  return out;
}

function scoreUniversal(state: GameState, directives: OverseerDirectives): ScoredAction[] {
  const out: ScoredAction[] = [];

  // A pending decision blocks narrative progress, so it outranks almost anything.
  if (state.pendingDecision) {
    const solar = directives.targetAlignment !== 'Cyberpunk';
    out.push({
      action: 'MAKE_DECISION',
      decisionChoiceIndex: solar ? 0 : 1,
      score: 0.97,
      reason: `directive is ${directives.targetAlignment} — taking the ${solar ? 'Solarpunk' : 'Cyberpunk'} branch`,
    });
  }

  // Unspent trust is pure waste.
  const unallocated = state.trust - (state.processors + state.memory);
  if (unallocated > 0) {
    const wantProcessor = state.processors <= state.memory;
    out.push({
      action: wantProcessor ? 'BUY_PROCESSOR' : 'BUY_MEMORY',
      score: 0.85,
      reason: `${unallocated} trust unallocated — ${wantProcessor ? 'processors' : 'memory'} is behind`,
    });
  }

  if (state.quantumLevel > 0 && state.operations >= QUANTUM_PULSE_COST) {
    const coherence = state.quantumPhotons.reduce((acc, p) => acc + p.value, 0);
    out.push({
      action: 'IDLE',
      score: coherence > 0 ? 0.25 : 0.02,
      reason: coherence > 0 ? 'quantum field coherent' : 'quantum field decoherent',
    });
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
    candidates.push({ action: 'IDLE', score: 0.01, reason: 'nothing affordable or useful' });
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
    const chosen = ranked[0];

    const runnerUp = ranked[1];
    const thought = runnerUp
      ? `${chosen.action} (${chosen.score.toFixed(2)}) over ${runnerUp.action} (${runnerUp.score.toFixed(2)}) — ${chosen.reason}.`
      : `${chosen.action} (${chosen.score.toFixed(2)}) — ${chosen.reason}.`;

    return { chosen, ranked, thought, engine: this.id };
  }
}
