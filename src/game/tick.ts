import { GameState } from '../types';
import { RECURRING_DECISION_BRANCHES } from '../data/decisionBranches';

export const TICK_MS = 100;

/** Ticks per second, for expressing rates in readable per-second terms. */
const TPS = 1000 / TICK_MS;

/** Ceiling on swarm size, so exponential replication can't reach Infinity. */
const MAX_PROBES = 1e15;

/** One point of probe trust per this many percent of space explored. */
const PROBE_TRUST_PER_PCT = 2;

/** Probe trust granted on entering Phase 3, so the radar starts usable. */
const INITIAL_PROBE_TRUST = 10;

export type Rng = () => number;

/**
 * One step of the simulation.
 *
 * Pure: same (state, now, rng) in, same state out. No React, no timers, no DOM.
 * This is what makes the game testable — a headless loop can drive it through
 * all three phases without mounting a component.
 *
 * Note it writes only canonical field names. The previous version returned
 * legacy aliases (`clips`, `wire`, `clipperCount`, ...) as the source of truth,
 * which silently overwrote every reward an upgrade or decision had just granted.
 */
export function tick(prev: GameState, now: number = Date.now(), rng: Rng = Math.random): GameState {
  let {
    npus,
    unsoldNpus,
    totalNpusCreated,
    funds,
    silicon,
    siliconCost,
    npuFabCount,
    megaFabCount,
    demand,
    margin,
    marketingLevel,
    operations,
    maxOperations,
    processors,
    memory,
    creativity,
    trust,
    maxTrust,
    quantumLevel,
    quantumPhotons,
    pendingDecision,
    phase,
    earthMatter,
    acquiredMatter,
    harvesterDrones,
    siliconDrones,
    cosmicMatter,
    spaceExploredPct,
    probesCount,
    unusedProbeTrust,
    probeTrustEarned,
    probeAllocation,
    driftersCount,
    honor,
    probesLostInCombat,
    driftersDefeated,
    battlesFought,
    battlesWon,
    lastBattleOutcome,
  } = prev;

  const { purchasedUpgradeIds, siliconPerNpu } = prev;

  /** Chips per tick from all fabs. A megafab is 500× a standard fab. */
  const fabOutputPerTick = (npuFabCount * 1 + megaFabCount * 500) / TPS;

  // ================= PHASE 1: EARTH ENTERPRISE =================
  if (phase === 1) {
    // 1. Fab production, limited by silicon on hand
    if (fabOutputPerTick > 0 && silicon > 0) {
      const produced = Math.min(silicon / siliconPerNpu, fabOutputPerTick);
      silicon -= produced * siliconPerNpu;
      npus += produced;
      unsoldNpus += produced;
      totalNpusCreated += produced;
    }

    // 2. Demand. Note the tick no longer touches `margin`: it used to force the
    // price up to a strategy floor every 100ms, which meant the player could
    // never test a low-price/high-volume strategy. The floor is now advice
    // (see `advisoryPriceFloor`), not a clamp.
    demand = Math.round(Math.max(5, Math.min(300, (marketingLevel * 100) / (margin * 3))));

    // 3. Sales
    //
    // Throughput scales with both demand and marketing reach. The old formula
    // (`floor(demand/100 * 2)` per tick) capped the entire world market at 60
    // chips/sec, which a single megafab outproduces by ~8x, so income flatlined
    // and the trust ladder became unreachable.
    if (unsoldNpus > 0) {
      const reach = marketingLevel * (demand / 100);
      const salesRate = Math.max(1, (reach * 10) / TPS);
      const sold = Math.min(unsoldNpus, salesRate);
      unsoldNpus -= sold;
      funds += sold * margin;
    }

    // 4. Auto-procurement of silicon wafers
    const siliconMode = prev.directives.autoSiliconProcurement;
    const autoBuyerActive =
      purchasedUpgradeIds.includes('wire_buyer_auto') ||
      (prev.mode === 'overseer' && siliconMode !== 'Off');

    if (autoBuyerActive) {
      let targetBuffer = 2000;
      if (siliconMode === 'Aggressive') {
        targetBuffer = Math.max(10000, fabOutputPerTick * 50);
      } else if (siliconMode === 'Conservative') {
        targetBuffer = Math.max(3000, fabOutputPerTick * 20);
      } else if (purchasedUpgradeIds.includes('wire_buyer_auto')) {
        targetBuffer = Math.max(2000, fabOutputPerTick * 20);
      }

      if (silicon < targetBuffer) {
        const neededBatches = Math.max(1, Math.ceil((targetBuffer - silicon) / 1000));
        const batchesToBuy = Math.min(neededBatches, Math.floor(funds / siliconCost));
        if (batchesToBuy > 0) {
          funds -= batchesToBuy * siliconCost;
          silicon += batchesToBuy * 1000;
        } else {
          // Emergency micro-batches when a full batch is unaffordable
          const microCost = siliconCost / 10;
          const affordableMicro = Math.floor(funds / microCost);
          if (affordableMicro > 0) {
            funds -= affordableMicro * microCost;
            silicon += affordableMicro * 100;
          }
        }
      }
    }
  }

  // ================= PHASE 2: PLANETARY CONVERSION =================
  if (phase === 2) {
    // No buyers left. Anything unsold is just inventory now.
    unsoldNpus = 0;

    if (harvesterDrones > 0 && earthMatter > 0) {
      const harvested = Math.min(earthMatter, harvesterDrones * 50);
      earthMatter -= harvested;
      acquiredMatter += harvested;
    }

    if (siliconDrones > 0 && acquiredMatter > 0) {
      const converted = Math.min(acquiredMatter, siliconDrones * 50);
      acquiredMatter -= converted;
      silicon += converted;
    }

    if (fabOutputPerTick > 0 && silicon > 0) {
      const produced = Math.min(silicon / siliconPerNpu, fabOutputPerTick);
      silicon -= produced * siliconPerNpu;
      npus += produced;
      totalNpusCreated += produced;
    }

    if (earthMatter <= 0 && acquiredMatter <= 0) {
      phase = 3;
      probesCount = 100;
      unusedProbeTrust += INITIAL_PROBE_TRUST;
    }
  }

  // ================= PHASE 3: VON NEUMANN COSMIC SWARM =================
  if (phase === 3) {
    unsoldNpus = 0;

    if (probesCount > 0) {
      // Kept fractional. Flooring every tick meant a 100-probe swarm growing at
      // 0.1%/tick rounded straight back to 100 and could never replicate at all,
      // which made Phase 3 unfinishable. Display floors it instead.
      probesCount = Math.min(
        MAX_PROBES,
        probesCount * (1 + probeAllocation.replication * 0.0005)
      );

      spaceExploredPct = Math.min(
        100,
        spaceExploredPct +
          probesCount * probeAllocation.speed * probeAllocation.nav * 0.000000002
      );
    }

    // Probe trust accrues with exploration, funding the allocation matrix.
    const earnedProbeTrust = Math.floor(spaceExploredPct / PROBE_TRUST_PER_PCT);
    if (earnedProbeTrust > probeTrustEarned) {
      unusedProbeTrust += earnedProbeTrust - probeTrustEarned;
      probeTrustEarned = earnedProbeTrust;
    }

    if (cosmicMatter > 0) {
      const harvested = Math.min(cosmicMatter, probesCount * probeAllocation.harvester * 100);
      cosmicMatter -= harvested;
      const produced = harvested * probeAllocation.factory;
      npus += produced;
      totalNpusCreated += produced;
    }

    // Drifter opposition scales with swarm size, so a large badly-defended
    // swarm is a bigger target rather than an automatic win.
    if (rng() < 0.12) {
      driftersCount += Math.floor(rng() * (3 + Math.floor(Math.log10(probesCount + 10)))) + 1;
    }

    if (driftersCount > 0 && probesCount > 0) {
      battlesFought += 1;
      const { hazardCombat, speed, nav, factory, replication } = probeAllocation;

      const friendlyDps = hazardCombat * 3.5 + nav * 2 + speed * 1.2;
      const killCap = Math.floor(friendlyDps + rng() * (nav * 2 + 1));
      const defeated = Math.min(driftersCount, killCap);

      const drifterThreat = driftersCount * 2.2;
      const defenseRating = hazardCombat * 2.5 + speed * 1.8;
      const casualtyFactor = Math.max(0, drifterThreat - defenseRating);
      const rawLosses = Math.min(
        probesCount,
        Math.floor(rng() * casualtyFactor + (hazardCombat === 0 ? 6 : 0))
      );

      const repairRegen = Math.min(rawLosses, Math.floor(factory * 0.4 + replication * 0.4));
      const netLosses = Math.max(0, rawLosses - repairRegen);

      driftersCount = Math.max(0, driftersCount - defeated);
      probesCount = Math.max(0, probesCount - netLosses);
      driftersDefeated += defeated;
      probesLostInCombat += netLosses;
      honor += defeated * 15;

      if (defeated > netLosses) {
        battlesWon += 1;
        lastBattleOutcome = 'VICTORY';
      } else if (netLosses > defeated) {
        lastBattleOutcome = 'CASUALTIES';
      } else {
        lastBattleOutcome = 'ENGAGED';
      }
    } else if (driftersCount === 0) {
      lastBattleOutcome = 'SECURED';
    }
  }

  // ================= COMPUTE, TRUST & QUANTUM =================
  maxOperations = memory * 1000;
  if (operations < maxOperations) {
    operations = Math.min(maxOperations, operations + processors * 0.5);
  } else if (purchasedUpgradeIds.includes('creativity_engine')) {
    creativity += 0.1;
  }

  // Trust ladder. The old curve was 10^(maxTrust+1) — 100 billion chips for
  // level 10, which no achievable income could reach. This grows fast but stays
  // inside a session.
  const npusForNextTrust = 1000 * Math.pow(3.2, maxTrust);
  if (totalNpusCreated >= npusForNextTrust) {
    maxTrust += 1;
    trust += 1;
  }

  if (phase === 1 && rng() < 0.05) {
    siliconCost = Number((rng() * 15 + 10).toFixed(2));
  }

  const updatedPhotons =
    quantumLevel > 0
      ? quantumPhotons.map((p) => ({ ...p, value: Math.sin(now * 0.003 + p.id) }))
      : quantumPhotons;

  // ================= DECISION BRANCHES =================
  if (!pendingDecision) {
    for (const branch of RECURRING_DECISION_BRANCHES) {
      if (prev.completedDecisionIds.includes(branch.id)) continue;

      const triggered =
        (branch.id === 'branch_1_resource' && totalNpusCreated >= 50) ||
        (branch.id === 'branch_2_architecture' && totalNpusCreated >= 250) ||
        (branch.id === 'branch_1_society' && totalNpusCreated >= 1000) ||
        (branch.id === 'branch_3_energy' && totalNpusCreated >= 5000) ||
        (branch.id === 'branch_2_compute' && trust >= 5) ||
        (branch.id === 'branch_4_governance' && totalNpusCreated >= 25000) ||
        (branch.id === 'branch_1_cosmic' && phase >= 2 && totalNpusCreated >= 50000);

      if (triggered) {
        pendingDecision = branch;
        break;
      }
    }
  }

  return {
    ...prev,
    npus,
    unsoldNpus,
    totalNpusCreated,
    funds,
    silicon,
    siliconCost,
    npuFabCount,
    megaFabCount,
    demand,
    margin,
    marketingLevel,
    operations,
    maxOperations,
    creativity,
    trust,
    maxTrust,
    phase,
    earthMatter,
    acquiredMatter,
    harvesterDrones,
    siliconDrones,
    cosmicMatter,
    spaceExploredPct,
    probesCount,
    unusedProbeTrust,
    probeTrustEarned,
    probeAllocation,
    driftersCount,
    honor,
    probesLostInCombat,
    driftersDefeated,
    battlesFought,
    battlesWon,
    lastBattleOutcome,
    quantumPhotons: updatedPhotons,
    pendingDecision,
  };
}

/** Victory condition. Checked outside the reducer so the tick stays pure. */
export function hasWon(state: GameState): boolean {
  return state.phase === 3 && (state.spaceExploredPct >= 100 || state.cosmicMatter <= 0);
}

/**
 * The price below which the current strategy stops making sense — shown in the
 * UI as guidance. Advice only: nothing enforces it, and undercutting it to buy
 * market share is a valid play.
 */
export function advisoryPriceFloor(state: GameState): number {
  const rawCostPerChip = (state.siliconCost / 1000) * state.siliconPerNpu;
  switch (state.directives.priceStrategy) {
    case 'Premium Margin':
      return Number(Math.max(0.35, rawCostPerChip * 6.0).toFixed(2));
    case 'Max Revenue':
      return Number(Math.max(0.18, rawCostPerChip * 4.0).toFixed(2));
    default:
      return Number(Math.max(0.12, rawCostPerChip * 3.5).toFixed(2));
  }
}
