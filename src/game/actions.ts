import { GameState, ProbeAllocation, Upgrade } from '../types';
import { meetsAlignmentRequirement, upgradeCost } from './alignment';

/**
 * Every mutation a player or the Overseer can make, as pure functions.
 *
 * Previously the direct-control handlers and the Overseer's action dispatcher
 * each carried their own copy of this logic. The copies had already drifted —
 * and a third copy lived on the server. One implementation, two callers.
 *
 * Each returns `state` unchanged when the action isn't affordable or legal, so
 * callers don't need to pre-check.
 */

const MEGA_FAB_BASE_COST = 200000;

/** Fabricate a single chip by hand. */
export function makeNpu(state: GameState): GameState {
  if (state.silicon < state.siliconPerNpu) return state;
  return {
    ...state,
    silicon: state.silicon - state.siliconPerNpu,
    npus: state.npus + 1,
    unsoldNpus: state.phase === 1 ? state.unsoldNpus + 1 : 0,
    totalNpusCreated: state.totalNpusCreated + 1,
  };
}

/**
 * Buy silicon wafers. A full batch is 1,000 wafers; when funds are short we
 * fall back to 100-wafer micro-batches at a tenth the price.
 */
export function buySilicon(state: GameState, batches = 1): GameState {
  const batchCost = state.siliconCost;
  const microCost = state.siliconCost / 10;

  if (state.funds >= batchCost) {
    const affordable = Math.min(batches, Math.floor(state.funds / batchCost));
    if (affordable <= 0) return state;
    return {
      ...state,
      funds: state.funds - affordable * batchCost,
      silicon: state.silicon + affordable * 1000,
    };
  }

  if (state.funds >= microCost) {
    const affordableMicro = Math.floor(state.funds / microCost);
    return {
      ...state,
      funds: state.funds - affordableMicro * microCost,
      silicon: state.silicon + affordableMicro * 100,
    };
  }

  return state;
}

/** Buy silicon up to a target buffer, used by the Overseer's procurement. */
export function buySiliconToBuffer(state: GameState, targetBuffer: number): GameState {
  if (state.silicon >= targetBuffer) return state;
  const needed = Math.max(1, Math.ceil((targetBuffer - state.silicon) / 1000));
  return buySilicon(state, needed);
}

export function buyFab(state: GameState): GameState {
  if (state.phase !== 1 || state.funds < state.npuFabCost) return state;
  return {
    ...state,
    funds: state.funds - state.npuFabCost,
    npuFabCount: state.npuFabCount + 1,
    npuFabCost: Number((state.npuFabCost * 1.15).toFixed(2)),
  };
}

/** Megafabs stay locked until an upgrade sets `megaFabCost` above zero. */
export function megaFabUnlocked(state: GameState): boolean {
  return state.megaFabCost > 0;
}

export function buyMegaFab(state: GameState): GameState {
  if (state.phase !== 1 || !megaFabUnlocked(state)) return state;
  const cost = state.megaFabCost > 0 ? state.megaFabCost : MEGA_FAB_BASE_COST;
  if (state.funds < cost) return state;
  return {
    ...state,
    funds: state.funds - cost,
    megaFabCount: state.megaFabCount + 1,
    megaFabCost: Number((cost * 1.25).toFixed(2)),
  };
}

export function buyMarketing(state: GameState): GameState {
  if (state.phase !== 1 || state.funds < state.marketingCost) return state;
  return {
    ...state,
    funds: state.funds - state.marketingCost,
    marketingLevel: state.marketingLevel + 1,
    marketingCost: state.marketingCost * 2,
  };
}

/**
 * Set the chip price.
 *
 * Only a hard floor of $0.01 applies. The strategy floor is advice shown in the
 * UI, not a clamp: pricing below cost to buy market share is a legitimate play,
 * and both this handler and the tick used to forcibly raise the price back up,
 * which disabled the game's central lever.
 */
export function setPrice(state: GameState, price: number): GameState {
  if (state.phase !== 1) return state;
  return { ...state, margin: Math.max(0.01, Number(price.toFixed(2))) };
}

export function adjustPrice(state: GameState, delta: number): GameState {
  return setPrice(state, state.margin + delta);
}

export function buyHarvesterDrone(state: GameState): GameState {
  if (state.phase !== 2 || state.funds < state.harvesterDroneCost) return state;
  return {
    ...state,
    funds: state.funds - state.harvesterDroneCost,
    harvesterDrones: state.harvesterDrones + 1,
    harvesterDroneCost: Number((state.harvesterDroneCost * 1.1).toFixed(2)),
  };
}

export function buySiliconDrone(state: GameState): GameState {
  if (state.phase !== 2 || state.funds < state.siliconDroneCost) return state;
  return {
    ...state,
    funds: state.funds - state.siliconDroneCost,
    siliconDrones: state.siliconDrones + 1,
    siliconDroneCost: Number((state.siliconDroneCost * 1.1).toFixed(2)),
  };
}

/** Probes are built from harvested matter, not conjured for free. */
export const PROBE_SILICON_COST = 5000;

export function launchProbe(state: GameState): GameState {
  if (state.phase !== 3 || state.silicon < PROBE_SILICON_COST) return state;
  return {
    ...state,
    silicon: state.silicon - PROBE_SILICON_COST,
    probesCount: state.probesCount + (state.probesCount === 0 ? 1 : 10),
  };
}

/**
 * Move a point of probe trust into or out of an allocation axis.
 *
 * `unusedProbeTrust` was declared, granted by an upgrade, and read by nothing —
 * so the six-axis radar was six free sliders you maxed out, with no tradeoff.
 * Allocation now spends from that pool and refuses to overspend, which is what
 * makes the radar the actual Phase 3 decision.
 */
export function changeProbeAllocation(
  state: GameState,
  category: keyof ProbeAllocation,
  delta: number
): GameState {
  const current = state.probeAllocation[category];

  if (delta > 0) {
    if (state.unusedProbeTrust < delta) return state;
  } else if (current + delta < 0) {
    return state;
  }

  return {
    ...state,
    unusedProbeTrust: state.unusedProbeTrust - delta,
    probeAllocation: { ...state.probeAllocation, [category]: current + delta },
  };
}

/**
 * Redistribute the whole allocation at once, respecting the trust budget.
 * Used by the Overseer's OPTIMIZE_PROBES action.
 */
export function setProbeAllocation(
  state: GameState,
  next: ProbeAllocation
): GameState {
  const total = (a: ProbeAllocation) =>
    a.speed + a.nav + a.replication + a.hazardCombat + a.factory + a.harvester + a.silicon;

  const budget = total(state.probeAllocation) + state.unusedProbeTrust;
  if (total(next) > budget) return state;

  return {
    ...state,
    probeAllocation: next,
    unusedProbeTrust: budget - total(next),
  };
}

function trustAvailable(state: GameState): boolean {
  return state.processors + state.memory < state.trust;
}

export function changeProcessor(state: GameState, delta: number): GameState {
  if (delta > 0 && !trustAvailable(state)) return state;
  if (delta < 0 && state.processors <= 1) return state;
  return { ...state, processors: state.processors + delta };
}

export function changeMemory(state: GameState, delta: number): GameState {
  if (delta > 0 && !trustAvailable(state)) return state;
  if (delta < 0 && state.memory <= 1) return state;
  const memory = state.memory + delta;
  return { ...state, memory, maxOperations: memory * 1000 };
}

/**
 * Fire a quantum pulse. Costs operations, so it is a tradeoff rather than an
 * infinite-operations button — it previously granted +500 ops per click with no
 * cost and no cooldown.
 */
export const QUANTUM_PULSE_COST = 100;

export function quantumPulse(state: GameState): GameState {
  if (state.quantumLevel <= 0 || state.operations < QUANTUM_PULSE_COST) return state;

  const coherence = state.quantumPhotons.reduce((acc, p) => acc + p.value, 0);
  const spent = { ...state, operations: state.operations - QUANTUM_PULSE_COST };

  // A coherent pulse returns far more than it cost; a decoherent one converts
  // the spent operations into yomi instead.
  return coherence > 0
    ? { ...spent, operations: Math.min(spent.maxOperations, spent.operations + 500) }
    : { ...spent, yomi: spent.yomi + 5 };
}

/**
 * Affordability against the *alignment-adjusted* price, not the sticker price.
 * Everything that displays or spends a cost must go through `upgradeCost`, or
 * the panel and the ledger disagree.
 */
export function canAffordUpgrade(state: GameState, up: Upgrade): boolean {
  const cost = upgradeCost(state, up);
  switch (up.costType) {
    case 'funds':
      return state.funds >= cost;
    case 'ops':
      return state.operations >= cost;
    case 'creativity':
      return state.creativity >= cost;
    case 'yomi':
      return state.yomi >= cost;
  }
}

/** Everything that has to be true before an upgrade can be bought. */
export function canBuyUpgrade(state: GameState, up: Upgrade): boolean {
  return (
    !state.purchasedUpgradeIds.includes(up.id) &&
    meetsAlignmentRequirement(state, up) &&
    canAffordUpgrade(state, up)
  );
}

/**
 * Deduct an upgrade's cost and apply its effect.
 *
 * The alignment gate is enforced *here* rather than in the UI, because the
 * player and the Overseer both come through this function and there is exactly
 * one place a mutation is allowed to be defined.
 */
export function buyUpgrade(state: GameState, up: Upgrade): GameState {
  if (!canBuyUpgrade(state, up)) return state;

  const cost = upgradeCost(state, up);
  const paid: GameState = {
    ...state,
    funds: up.costType === 'funds' ? state.funds - cost : state.funds,
    operations: up.costType === 'ops' ? state.operations - cost : state.operations,
    creativity: up.costType === 'creativity' ? state.creativity - cost : state.creativity,
    yomi: up.costType === 'yomi' ? state.yomi - cost : state.yomi,
  };

  return {
    ...paid,
    ...up.effect(paid),
    alignment: Math.max(-100, Math.min(100, paid.alignment + up.alignmentImpact)),
    purchasedUpgradeIds: [...paid.purchasedUpgradeIds, up.id],
  };
}

/**
 * Take the wheel back.
 *
 * A revoked Overseer executes only directive-compliant actions — it stops
 * drifting entirely — and the whole facility runs at
 * `AUTONOMY_REVOKED_THROUGHPUT` for as long as the revocation stands. That
 * ratio is the price of the guarantee, and it is meant to hurt enough that
 * leaving a drifting Overseer running is a real temptation.
 */
export function revokeAutonomy(state: GameState): GameState {
  if (state.autonomyRevoked) return state;
  return { ...state, autonomyRevoked: true };
}

/** Hand autonomy back: full throughput returns, and so does drift. */
export function grantAutonomy(state: GameState): GameState {
  if (!state.autonomyRevoked) return state;
  return { ...state, autonomyRevoked: false };
}

/**
 * Record that the Overseer knowingly departed from the alignment directive.
 *
 * Kept as an action rather than written inline by the caller so that the count
 * and the narration can never disagree with what the log says happened.
 */
export function recordDrift(state: GameState, summary: string): GameState {
  return { ...state, driftCount: state.driftCount + 1, lastDrift: summary };
}

/** Resolve a pending decision branch. `choice` is 0 for Solarpunk, 1 for Cyberpunk. */
export function resolveDecision(state: GameState, choice: 0 | 1): GameState {
  const branch = state.pendingDecision;
  if (!branch) return state;

  const option = choice === 0 ? branch.solarpunkOption : branch.cyberpunkOption;
  const applied = option.effect(state);

  return {
    ...state,
    ...applied,
    alignment: Math.max(-100, Math.min(100, state.alignment + option.alignmentShift)),
    pendingDecision: null,
    completedDecisionIds: [...state.completedDecisionIds, branch.id],
  };
}
