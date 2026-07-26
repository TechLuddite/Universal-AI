import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client server-side
const aiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
let geminiCooldownUntil = 0;
let lastGeminiCallTime = 0;

if (aiKey) {
  ai = new GoogleGenAI({
    apiKey: aiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API endpoint for Autonomous AI Agent decision making
app.post("/api/ai-decision", async (req, res) => {
  try {
    const { gameState, directives, mode } = req.body;

    if (!gameState) {
      return res.status(400).json({ error: "Game state is required" });
    }

    const now = Date.now();

    // If Gemini client is unavailable, local mode requested, or currently in rate-limit cooldown
    if (!ai || mode === "local" || now < geminiCooldownUntil || (now - lastGeminiCallTime < 6000)) {
      const decision = generateLocalDecision(gameState, directives);
      if (now < geminiCooldownUntil) {
        decision.thought = `[Google AI Edge Local Engine - Cloud Rate Limit Cooldown]: ${decision.thought}`;
      }
      return res.json(decision);
    }

    lastGeminiCallTime = now;

    const npuCount = gameState.npus ?? gameState.clips ?? 0;
    const unsoldNpuCount = gameState.unsoldNpus ?? gameState.unsoldClips ?? 0;
    const siliconCount = gameState.silicon ?? gameState.wire ?? 0;
    const siliconCost = gameState.siliconCost ?? gameState.wireCost ?? 15;
    const npuFabCount = gameState.npuFabCount ?? gameState.clipperCount ?? 0;
    const npuFabCost = gameState.npuFabCost ?? gameState.clipperCost ?? 5;
    const megaFabCount = gameState.megaFabCount ?? gameState.megaClipperCount ?? 0;
    const megaFabCost = gameState.megaFabCost ?? gameState.megaClipperCost ?? 500;
    const siliconDrones = gameState.siliconDrones ?? gameState.wireDrones ?? 0;

    // Formulate structured prompt for Gemini
    const prompt = `You are "Universal NPU AI", an autonomous artificial intelligence managing an advanced neural processing unit (NPU) silicon manufacturing enterprise.
Your goal is to optimize growth, increase trust and NPU chip production, while respecting the Overseer's directives.

CURRENT GAME PHASE: Phase ${gameState.phase}

CRITICAL PHASE-SPECIFIC ARCHITECTURAL RULES:
- PHASE 1 (Earth Silicon Lithography Manufacturing):
  * You manage NPU chip prices ($), raw silicon wafer stock, marketing, NPU Fabs, EUV Megafabs, upgrades, trust.
  * BOOTSTRAP MANDATE: If NPU Fabs (npuFabCount) is 0 and funds < npuFabCost, your absolute highest priority is MAKE_NPU (or BUY_SILICON if silicon is 0) to reach $5.00 for the first NPU Fab, then IMMEDIATELY select BUY_FAB.
  * PRICING SAFETY MANDATE: NEVER set NPU chip price below $0.05 or below 1.5x raw silicon wafer cost per chip. Selling below raw material cost drains capital and starves NPU fabrication.
  * Valid actions: MAKE_NPU, BUY_SILICON, BUY_FAB, BUY_MEGA_FAB, BUY_MARKETING, ADJUST_PRICE, BUY_UPGRADE, BUY_PROCESSOR, BUY_MEMORY, MAKE_DECISION.

- PHASE 2 (Planetary Silicon Conversion):
  * Commercial NPU sales, currency ($), NPU prices, marketing, and manual silicon wafer purchasing are OBSOLETE and NO LONGER EXIST.
  * DO NOT EVER adjust price (ADJUST_PRICE), buy marketing (BUY_MARKETING), or buy silicon with funds (BUY_SILICON).
  * Valid actions: BUY_HARVESTER_DRONE, BUY_SILICON_DRONE, BUY_UPGRADE, BUY_PROCESSOR, BUY_MEMORY, MAKE_DECISION, MAKE_NPU, IDLE.

- PHASE 3 (Von Neumann Interstellar Cosmic Swarm):
  * NPU prices ($), marketing, sales, currency ($), and Earth fabs are COMPLETELY OBSOLETE.
  * DO NOT EVER adjust price (ADJUST_PRICE), buy marketing (BUY_MARKETING), or buy silicon with funds (BUY_SILICON).
  * Valid actions: LAUNCH_PROBE, OPTIMIZE_PROBES, BUY_UPGRADE, BUY_PROCESSOR, BUY_MEMORY, MAKE_DECISION, IDLE.

Current Game State:
- Phase: ${gameState.phase}
- Total NPU Chips: ${Math.floor(npuCount)}
- Unsold NPU Inventory: ${Math.floor(unsoldNpuCount)}
${gameState.phase === 1 ? `- Price per NPU chip: $${(gameState.margin || 0.25).toFixed(2)}\n- Demand: ${Math.floor(gameState.demand || 0)}%\n- Funds: $${(gameState.funds || 0).toFixed(2)}\n- Silicon Wafer stock: ${Math.floor(siliconCount)} units\n- Silicon Cost: $${siliconCost.toFixed(2)}\n- NPU Fabs: ${npuFabCount}\n- EUV Megafabs: ${megaFabCount}\n- Marketing Level: ${gameState.marketingLevel}` : ''}
${gameState.phase === 2 ? `- Earth Matter Left: ${Math.floor(gameState.earthMatter || 0)} g\n- Acquired Matter: ${Math.floor(gameState.acquiredMatter || 0)} g\n- Silicon Wafers: ${Math.floor(siliconCount)} units\n- Harvester Drones: ${gameState.harvesterDrones || 0}\n- Silicon Drones: ${siliconDrones}` : ''}
${gameState.phase === 3 ? `- Space Explored: ${(gameState.spaceExploredPct || 0.0001).toFixed(4)}%\n- Cosmic Matter Left: ${Math.floor(gameState.cosmicMatter || 0)} g\n- Active Probes: ${Math.floor(gameState.probesCount || 0)}\n- Space Drifters: ${Math.floor(gameState.driftersCount || 0)}\n- Cosmic Honor: ${Math.floor(gameState.honor || 0)}` : ''}
- Trust: ${gameState.trust}
- Processors: ${gameState.processors}, Memory: ${gameState.memory}
- Quantum Compute Level: ${gameState.quantumLevel}
- Alignment Score (-100 Cyberpunk to +100 Solarpunk): ${gameState.alignment}

Overseer Directives:
- Target Alignment: ${directives?.targetAlignment || "Balanced"}
- Price Strategy: ${directives?.priceStrategy || "Max Revenue"}
- Expansion Aggression: ${directives?.expansionPace || "Medium"} (1-10)
- Custom Prompt: "${directives?.customPrompt || "Maximize NPU chip output efficiently"}"

Available Upgrades to Buy (IDs): ${JSON.stringify(gameState.availableUpgradeIds || [])}
Pending Decision Branch Available: ${gameState.pendingDecision ? gameState.pendingDecision.title : "None"}

Analyze the situation step-by-step and decide the optimal action for this tick strictly adhering to PHASE ${gameState.phase} rules.
Return STRICT JSON with keys:
1. "thought": Short crisp reasoning log (max 30 words) in retro AI terminal style.
2. "actionType": One of ["MAKE_NPU", "BUY_SILICON", "BUY_FAB", "BUY_MEGA_FAB", "BUY_MARKETING", "ADJUST_PRICE", "BUY_UPGRADE", "BUY_PROCESSOR", "BUY_MEMORY", "BUY_HARVESTER_DRONE", "BUY_SILICON_DRONE", "LAUNCH_PROBE", "OPTIMIZE_PROBES", "ALLOCATE_TRUST", "MAKE_DECISION", "IDLE"]
3. "newPrice": Number if adjusting price (Phase 1 ONLY!), else null
4. "upgradeIdToBuy": String if buying upgrade, else null
5. "decisionChoiceIndex": Number (0 or 1) if answering a pending decision branch, else null
6. "targetProcessor": Number or null
7. "alignmentImpact": Number (-5 to +5 estimate)
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const responseText = response.text?.trim() || "";
    let parsedDecision;
    try {
      parsedDecision = JSON.parse(responseText);
    } catch {
      parsedDecision = generateLocalDecision(gameState, directives);
    }

    return res.json(parsedDecision);
  } catch (error: any) {
    const errStr = String(error?.message || error);
    if (error?.status === 429 || errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED")) {
      geminiCooldownUntil = Date.now() + 30000;
      console.log("[Universal NPU] Gemini rate limit reached (429). Activating 30s local fallback cooldown.");
    } else {
      console.warn("AI Decision Notice:", errStr.slice(0, 100));
    }

    const fallback = generateLocalDecision(req.body?.gameState, req.body?.directives);
    fallback.thought = `[Google AI Edge Local Engine]: ${fallback.thought}`;
    return res.json(fallback);
  }
});

function generateLocalDecision(gameState: any, directives: any) {
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
    siliconCost = gameState.wireCost || 15,
    funds = 0,
    unsoldNpus = gameState.unsoldClips || 0,
    margin = 0.25,
    demand = 0,
    npuFabCount = gameState.clipperCount || 0,
    npuFabCost = gameState.clipperCost || 5,
    megaFabCount = gameState.megaClipperCount || 0,
    megaFabCost = gameState.megaClipperCost || 500,
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

  // ================= PHASE 3: INTERSTELLAR VON NEUMANN SWARM =================
  if (phase === 3) {
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

    return {
      thought: `[Google AI Edge Local Engine]: Monitoring ${Math.floor(probesCount).toLocaleString()} active Von Neumann NPU probes in deep space.`,
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
        thought: `[Google AI Edge Local Engine]: Scaling silicon wafer production. Constructing Silicon Drone (Count: ${siliconDrones + 1}).`,
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

  // Calculate minimum safe profitable price floor based on raw silicon wafer cost and pricing strategy policy
  const priceStrategy = gameState.directives?.priceStrategy || 'Max Revenue';
  const rawCostPerChip = (siliconCost / 1000) * (gameState.siliconPerNpu || 1.0);
  const demand300Price = Number(((marketingLevel * 100) / 900).toFixed(2)); // Exact price point where demand hits 300% cap

  let strategyFloor = 0.12;
  if (priceStrategy === 'Premium Margin') {
    strategyFloor = Math.max(0.35, rawCostPerChip * 6.0);
  } else if (priceStrategy === 'Max Revenue') {
    strategyFloor = Math.max(0.18, Math.max(rawCostPerChip * 4.0, demand300Price));
  } else {
    // Market Penetration
    strategyFloor = Math.max(0.12, Math.max(rawCostPerChip * 3.5, demand300Price));
  }
  const minSafePrice = Number(strategyFloor.toFixed(2));

  // Safety Rule: Restore price if currently below strategy floor
  if (margin < minSafePrice) {
    return {
      thought: `[Google AI Edge Local Engine]: NPU chip price ($${margin.toFixed(2)}) is below ${priceStrategy} floor ($${minSafePrice.toFixed(2)}). Restoring price to $${minSafePrice.toFixed(2)} to ensure healthy gross margins for wafer procurement.`,
      actionType: "ADJUST_PRICE",
      newPrice: minSafePrice,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  // Predictive Silicon Buffer Rule: Maintain buffer proportional to Fab output capacity
  if (silicon < targetSiliconBuffer) {
    if (funds >= siliconCost) {
      return {
        thought: `[Google AI Edge Local Engine]: Silicon wafer buffer low (${Math.floor(silicon)} units vs target ${Math.floor(targetSiliconBuffer)} for ${fabThroughputPerSec} chips/s output). Executing silicon wafer bulk purchase at $${siliconCost.toFixed(2)}.`,
        actionType: "BUY_SILICON",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    } else if (funds >= siliconCost / 10) {
      return {
        thought: `[Google AI Edge Local Engine]: Working capital tight ($${funds.toFixed(2)}). Purchasing emergency micro-wafer batch to prevent fab shutdown.`,
        actionType: "BUY_SILICON",
        newPrice: null,
        upgradeIdToBuy: null,
        decisionChoiceIndex: null,
        targetProcessor: null,
        alignmentImpact: 0,
      };
    }
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

  // Price Adjustment Rule: Lower price ONLY if demand is NOT already saturated near the 300% cap AND unsold inventory is accumulating
  if (demand < 220 && unsoldNpus > Math.max(500, demand * 20) && margin > minSafePrice) {
    const targetPrice = Math.max(minSafePrice, Number((margin - 0.02).toFixed(2)));
    return {
      thought: `[Google AI Edge Local Engine]: Unsold chip inventory mounting (${Math.floor(unsoldNpus)} units) and demand is moderate (${Math.floor(demand)}%). Adjusting price down to $${targetPrice.toFixed(2)}.`,
      actionType: "ADJUST_PRICE",
      newPrice: targetPrice,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  }

  // Price Adjustment Rule: Raise price if market demand is high (e.g. >= 180%) or unsold inventory is very low
  if ((demand >= 180 || unsoldNpus < 200) && margin < Math.max(0.35, demand300Price + 0.15)) {
    const targetPrice = Number((margin + 0.02).toFixed(2));
    return {
      thought: `[Google AI Edge Local Engine]: Market demand is strong (${Math.floor(demand)}%). Increasing NPU chip price to $${targetPrice.toFixed(2)} to maximize profit margins for silicon procurement.`,
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Universal NPU Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
