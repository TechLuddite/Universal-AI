import { AIDecisionResponse } from '../types';

export function generateLocalDecision(gameState: any, directives: any): AIDecisionResponse {
  if (!gameState) {
    return {
      thought: "[Google AI Edge Local Engine]: Initializing local rule evaluation loop.",
      actionType: "MAKE_CLIP",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  const {
    phase = 1,
    wire = 0,
    wireCost = 0,
    funds = 0,
    unsoldClips = 0,
    margin = 0.25,
    demand = 0,
    clipperCount = 0,
    clipperCost = 0,
    megaClipperCount = 0,
    megaClipperCost = 0,
    marketingLevel = 1,
    marketingCost = 0,
    availableUpgradeIds = [],
    pendingDecision = null,
    trust = 0,
    processors = 1,
    memory = 1,
    harvesterDrones = 0,
    wireDrones = 0,
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
        thought: "[Google AI Edge Local Engine]: Initiating Phase 3 Interstellar Swarm. Launching initial Von Neumann Probe.",
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
      thought: `[Google AI Edge Local Engine]: Sector secured. Monitoring ${Math.floor(probesCount).toLocaleString()} active Von Neumann probes in deep space.`,
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
    if (harvesterDrones <= wireDrones) {
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
        thought: `[Google AI Edge Local Engine]: Scaling wire production. Constructing Wire Drone (Count: ${wireDrones + 1}).`,
        actionType: "BUY_WIRE_DRONE",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }
  }

  // ================= PHASE 1: EARTH MANUFACTURING =================
  // Bootstrap First Auto-Clipper Rule: Focus exclusively on getting the first Auto-Clipper
  if (phase === 1 && clipperCount === 0) {
    if (funds >= (clipperCost || 5.0)) {
      return {
        thought: `[Google AI Edge Local Engine]: Capital goal achieved ($${funds.toFixed(2)}). Purchasing initial Auto-Clipper to automate factory production.`,
        actionType: "BUY_CLIPPER",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }
    if (wire <= 0 && funds >= wireCost) {
      return {
        thought: `[Google AI Edge Local Engine]: Wire depleted. Purchasing raw wire batch to continue manual clip production toward first Auto-Clipper.`,
        actionType: "BUY_WIRE",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }
    return {
      thought: `[Google AI Edge Local Engine]: Bootstrapping factory. Manually bending wire into clips until first Auto-Clipper is affordable ($${funds.toFixed(2)} / $${(clipperCost || 5.0).toFixed(2)}).`,
      actionType: "MAKE_CLIP",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (wire < 50 && funds >= wireCost) {
    return {
      thought: `[Google AI Edge Local Engine]: Wire reserves low (${Math.floor(wire)} units). Executing wire purchase at $${wireCost.toFixed(2)}.`,
      actionType: "BUY_WIRE",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (megaClipperCost && funds >= megaClipperCost) {
    return {
      thought: `[Google AI Edge Local Engine]: Capital reserves sufficient ($${funds.toFixed(2)}). Purchasing Mega-Clipper (Count: ${megaClipperCount + 1}).`,
      actionType: "BUY_MEGA_CLIPPER",
      newPrice: null,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (clipperCost && funds >= clipperCost) {
    return {
      thought: `[Google AI Edge Local Engine]: Capital reserves sufficient ($${funds.toFixed(2)}). Purchasing Auto-Clipper (Count: ${clipperCount + 1}).`,
      actionType: "BUY_CLIPPER",
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

  if (unsoldClips > demand * 15 && margin > 0.05) {
    const targetPrice = Math.max(0.05, Number((margin - 0.02).toFixed(2)));
    return {
      thought: `[Google AI Edge Local Engine]: Unsold inventory high (${Math.floor(unsoldClips)} units). Adjusting price downward to $${targetPrice.toFixed(2)} to boost sales velocity.`,
      actionType: "ADJUST_PRICE",
      newPrice: targetPrice,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  if (unsoldClips < 10 && demand > 90) {
    const targetPrice = Number((margin + 0.02).toFixed(2));
    return {
      thought: `[Google AI Edge Local Engine]: High market demand detected (${Math.floor(demand)}%). Increasing price to $${targetPrice.toFixed(2)} to optimize profit margins.`,
      actionType: "ADJUST_PRICE",
      newPrice: targetPrice,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  return {
    thought: wire > 0 ? "[Google AI Edge Local Engine]: Standard execution loop. Bending wire into clip." : "[Google AI Edge Local Engine]: Wire depleted. Awaiting production input.",
    actionType: wire > 0 ? "MAKE_CLIP" : "IDLE",
    newPrice: null,
    upgradeIdToBuy: null,
    decisionChoiceIndex: null,
    targetProcessor: null,
    alignmentImpact: 0,
  };
}
