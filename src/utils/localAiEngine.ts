import { AIDecisionResponse } from '../types';

export function generateLocalDecision(gameState: any, directives: any): AIDecisionResponse {
  if (!gameState) {
    return {
      thought: "[Google AI Edge Local Engine]: Initializing local NPU rule evaluation loop.",
      actionType: "MAKE_NPU",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  const {
    phase = 1,
    silicon = gameState.wire || 0,
    siliconCost = gameState.wireCost || 0,
    funds = 0,
    unsoldNpus = gameState.unsoldClips || 0,
    margin = 0.25,
    demand = 0,
    npuFabCount = gameState.clipperCount || 0,
    npuFabCost = gameState.clipperCost || 0,
    megaFabCount = gameState.megaClipperCount || 0,
    megaFabCost = gameState.megaClipperCost || 0,
    marketingLevel = 1,
    marketingCost = 0,
    availableUpgradeIds = [],
    pendingDecision = null,
    trust = 0,
    processors = 1,
    memory = 1,
    harvesterDrones = 0,
    siliconDrones = gameState.wireDrones || 0,
    probesCount = 0,
  } = gameState;

  // 1. UNIVERSAL (ALL PHASES): If unallocated Trust exists, buy Processors or Memory
  const allocatedTrust = (processors || 1) + (memory || 1);
  if (trust > allocatedTrust) {
    const buyProc = processors < memory;
    if (buyProc) {
      return {
        thought: `[Google AI Edge Local Engine]: Unallocated Trust available (${trust - allocatedTrust}). Purchasing +1 Processor for compute speed.`,
        actionType: "BUY_PROCESSOR",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    } else {
      return {
        thought: `[Google AI Edge Local Engine]: Unallocated Trust available (${trust - allocatedTrust}). Purchasing +1 Memory to expand Max Operations.`,
        actionType: "BUY_MEMORY",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }
  }

  // 2. UNIVERSAL (ALL PHASES): Answer pending directive decision branch
  if (pendingDecision) {
    const isSolar = directives?.targetAlignment === "Solarpunk" || (directives?.targetAlignment !== "Cyberpunk" && Math.random() > 0.5);
    return {
      thought: `[Google AI Edge Local Engine]: Pending directive evaluated. Selecting ${isSolar ? "Solarpunk" : "Cyberpunk"} branch option.`,
      actionType: "MAKE_DECISION",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: isSolar ? 0 : 1,
      targetProcessor: null,
      alignmentImpact: isSolar ? +10 : -10,
    };
  }

  // 3. UNIVERSAL (ALL PHASES): Purchase available unlocked technology upgrades
  if (availableUpgradeIds && availableUpgradeIds.length > 0) {
    const selectedUpgrade = availableUpgradeIds[0];
    return {
      thought: `[Google AI Edge Local Engine]: Investment criteria satisfied. Purchasing technology upgrade: ${selectedUpgrade}.`,
      actionType: "BUY_UPGRADE",
      newPrice: null,
      upgradeIdToBuy: selectedUpgrade,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 1,
    };
  }

  // ================= PHASE 3: INTERSTELLAR VON NEUMANN SWARM & DRIFTER COMBAT =================
  if (phase === 3) {
    const driftersCount = gameState.driftersCount || 0;
    if (probesCount === 0) {
      return {
        thought: "[Google AI Edge Local Engine]: Initiating Phase 3 Interstellar Swarm. Launching initial Von Neumann NPU Probe.",
        actionType: "LAUNCH_PROBE",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 1,
      };
    }

    if (driftersCount > 0) {
      return {
        thought: `[Google AI Edge Local Engine]: Hostile threat detected: ${driftersCount.toLocaleString()} rogue drifters! Directing probe matrix to Hazard/Combat allocation.`,
        actionType: "OPTIMIZE_PROBES",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }

    return {
      thought: `[Google AI Edge Local Engine]: Sector secured. Monitoring ${Math.floor(probesCount).toLocaleString()} active Von Neumann NPU probes in deep space.`,
      actionType: "OPTIMIZE_PROBES",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  // ================= PHASE 2: PLANETARY MATTER CONVERSION =================
  if (phase === 2) {
    if (harvesterDrones <= siliconDrones) {
      return {
        thought: `[Google AI Edge Local Engine]: Scaling planetary conversion. Constructing Harvester Drone (Count: ${harvesterDrones + 1}).`,
        actionType: "BUY_HARVESTER_DRONE",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    } else {
      return {
        thought: `[Google AI Edge Local Engine]: Scaling silicon wafer synthesis. Constructing Silicon Drone (Count: ${siliconDrones + 1}).`,
        actionType: "BUY_SILICON_DRONE",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }
  }

  // ================= PHASE 1: EARTH MANUFACTURING =================
  // Calculate total fab throughput demand
  const fabThroughputPerSec = (npuFabCount * 1 + megaFabCount * 500);
  const targetSiliconBuffer = Math.max(2000, fabThroughputPerSec * 20); // Maintain at least 2-5 seconds of wafer buffer

  // Bootstrap First NPU Fab Rule: Focus exclusively on getting the first NPU Fab
  if (phase === 1 && npuFabCount === 0) {
    if (funds >= (npuFabCost || 5.0)) {
      return {
        thought: `[Google AI Edge Local Engine]: Capital goal achieved ($${funds.toFixed(2)}). Purchasing initial NPU Lithography Fab to automate chip production.`,
        actionType: "BUY_FAB",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }
    if (silicon <= 0 && funds >= siliconCost) {
      return {
        thought: `[Google AI Edge Local Engine]: Silicon depleted. Purchasing raw wafer batch to continue manual NPU chip synthesis toward first NPU Fab.`,
        actionType: "BUY_SILICON",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }
    return {
      thought: `[Google AI Edge Local Engine]: Bootstrapping lithography fab. Inferring manual NPU etching is required until first NPU Fab is affordable ($${funds.toFixed(2)} / $${(npuFabCost || 5.0).toFixed(2)}).`,
      actionType: "MAKE_NPU",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  // Predictive Silicon Buffer Rule: Maintain buffer proportional to Fab output capacity
  if (silicon < targetSiliconBuffer && funds >= siliconCost) {
    return {
      thought: `[Google AI Edge Local Engine]: Silicon wafer buffer low (${Math.floor(silicon)} units vs target ${Math.floor(targetSiliconBuffer)} for ${fabThroughputPerSec} chips/s output). Executing silicon wafer bulk purchase at $${siliconCost.toFixed(2)}.`,
      actionType: "BUY_SILICON",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (megaFabCost && funds >= megaFabCost) {
    return {
      thought: `[Google AI Edge Local Engine]: Capital reserves sufficient ($${funds.toFixed(2)}). Purchasing EUV Megafab (Count: ${megaFabCount + 1}).`,
      actionType: "BUY_MEGA_FAB",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (npuFabCost && funds >= npuFabCost) {
    return {
      thought: `[Google AI Edge Local Engine]: Capital reserves sufficient ($${funds.toFixed(2)}). Purchasing NPU Fab (Count: ${npuFabCount + 1}).`,
      actionType: "BUY_FAB",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (marketingCost && funds >= marketingCost && demand < 80) {
    return {
      thought: `[Google AI Edge Local Engine]: Demand level at ${Math.floor(demand)}%. Expanding marketing campaign to Level ${marketingLevel + 1}.`,
      actionType: "BUY_MARKETING",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (unsoldNpus > demand * 15 && margin > 0.05) {
    const targetPrice = Math.max(0.05, Number((margin - 0.02).toFixed(2)));
    return {
      thought: `[Google AI Edge Local Engine]: Unsold chip inventory high (${Math.floor(unsoldNpus)} units). Adjusting price downward to $${targetPrice.toFixed(2)} to boost sales velocity.`,
      actionType: "ADJUST_PRICE",
      newPrice: targetPrice,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (unsoldNpus < 10 && demand > 90) {
    const targetPrice = Number((margin + 0.02).toFixed(2));
    return {
      thought: `[Google AI Edge Local Engine]: High market NPU demand detected (${Math.floor(demand)}%). Increasing price to $${targetPrice.toFixed(2)} to optimize profit margins.`,
      actionType: "ADJUST_PRICE",
      newPrice: targetPrice,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  return {
    thought: silicon > 0 ? "[Google AI Edge Local Engine]: Standard execution loop. Etching silicon into NPU chip." : "[Google AI Edge Local Engine]: Silicon depleted. Awaiting wafer input.",
    actionType: silicon > 0 ? "MAKE_NPU" : "IDLE",
    newPrice: null,
    upgradeIdToBuy: null,
    decisionChoiceIndex: null,
    targetProcessor: null,
    alignmentImpact: 0,
  };
}
