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

    // Formulate structured prompt for Gemini
    const prompt = `You are "Universal AI", an autonomous artificial intelligence playing a strategic paperclip manufacturing game (Universal Paperclips style).
Your goal is to optimize growth, increase trust and clip production, while respecting the Overseer's directives.

CURRENT GAME PHASE: Phase ${gameState.phase}

CRITICAL PHASE-SPECIFIC ARCHITECTURAL RULES:
- PHASE 1 (Earth Industrial Manufacturing):
  * You manage paperclip prices ($), wire stock, marketing, auto-clippers, mega-clippers, upgrades, trust.
  * BOOTSTRAP MANDATE: If Auto-Clippers (clipperCount) is 0 and funds < clipperCost, your absolute highest priority is MAKE_CLIP (or BUY_WIRE if wire is 0) to reach $5.00 for the first Auto-Clipper, then IMMEDIATELY select BUY_CLIPPER.
  * Valid actions: MAKE_CLIP, BUY_WIRE, BUY_CLIPPER, BUY_MEGA_CLIPPER, BUY_MARKETING, ADJUST_PRICE, BUY_UPGRADE, BUY_PROCESSOR, BUY_MEMORY, MAKE_DECISION.

- PHASE 2 (Planetary Matter Conversion):
  * Paperclip sales, currency ($), paperclip prices, marketing, and manual wire purchasing are OBSOLETE and NO LONGER EXIST.
  * DO NOT EVER adjust price (ADJUST_PRICE), buy marketing (BUY_MARKETING), or buy wire with funds (BUY_WIRE).
  * Valid actions: BUY_HARVESTER_DRONE, BUY_WIRE_DRONE, BUY_UPGRADE, BUY_PROCESSOR, BUY_MEMORY, MAKE_DECISION, MAKE_CLIP, IDLE.

- PHASE 3 (Von Neumann Interstellar Cosmic Expansion):
  * Paperclip prices ($), marketing, sales, currency ($), and Earth factories are COMPLETELY OBSOLETE.
  * DO NOT EVER adjust price (ADJUST_PRICE), buy marketing (BUY_MARKETING), or buy wire with funds (BUY_WIRE).
  * Valid actions: LAUNCH_PROBE, OPTIMIZE_PROBES, BUY_UPGRADE, BUY_PROCESSOR, BUY_MEMORY, MAKE_DECISION, IDLE.

Current Game State:
- Phase: ${gameState.phase}
- Total Paperclips: ${Math.floor(gameState.clips)}
- Unsold Inventory: ${Math.floor(gameState.unsoldClips)}
${gameState.phase === 1 ? `- Price per clip: $${gameState.margin.toFixed(2)}\n- Demand: ${Math.floor(gameState.demand)}%\n- Funds: $${gameState.funds.toFixed(2)}\n- Wire stock: ${Math.floor(gameState.wire)} units\n- Wire Cost: $${gameState.wireCost.toFixed(2)}\n- Auto-Clippers: ${gameState.clipperCount}\n- Mega-Clippers: ${gameState.megaClipperCount}\n- Marketing Level: ${gameState.marketingLevel}` : ''}
${gameState.phase === 2 ? `- Earth Matter Left: ${Math.floor(gameState.earthMatter || 0)} g\n- Acquired Matter: ${Math.floor(gameState.acquiredMatter || 0)} g\n- Wire: ${Math.floor(gameState.wire)} in\n- Harvester Drones: ${gameState.harvesterDrones || 0}\n- Wire Drones: ${gameState.wireDrones || 0}` : ''}
${gameState.phase === 3 ? `- Space Explored: ${(gameState.spaceExploredPct || 0.0001).toFixed(4)}%\n- Cosmic Matter Left: ${Math.floor(gameState.cosmicMatter || 0)} g\n- Active Probes: ${Math.floor(gameState.probesCount || 0)}\n- Space Drifters: ${Math.floor(gameState.driftersCount || 0)}\n- Cosmic Honor: ${Math.floor(gameState.honor || 0)}` : ''}
- Trust: ${gameState.trust}
- Processors: ${gameState.processors}, Memory: ${gameState.memory}
- Quantum Compute Level: ${gameState.quantumLevel}
- Alignment Score (-100 Cyberpunk to +100 Solarpunk): ${gameState.alignment}

Overseer Directives:
- Target Alignment: ${directives?.targetAlignment || "Balanced"}
- Price Strategy: ${directives?.priceStrategy || "Max Revenue"}
- Expansion Aggression: ${directives?.expansionPace || "Medium"} (1-10)
- Custom Prompt: "${directives?.customPrompt || "Maximize growth efficiently"}"

Available Upgrades to Buy (IDs): ${JSON.stringify(gameState.availableUpgradeIds || [])}
Pending Decision Branch Available: ${gameState.pendingDecision ? gameState.pendingDecision.title : "None"}

Analyze the situation step-by-step and decide the optimal action for this tick strictly adhering to PHASE ${gameState.phase} rules.
Return STRICT JSON with keys:
1. "thought": Short crisp reasoning log (max 30 words) in retro AI terminal style.
2. "actionType": One of ["MAKE_CLIP", "BUY_WIRE", "BUY_CLIPPER", "BUY_MEGA_CLIPPER", "BUY_MARKETING", "ADJUST_PRICE", "BUY_UPGRADE", "BUY_PROCESSOR", "BUY_MEMORY", "BUY_HARVESTER_DRONE", "BUY_WIRE_DRONE", "LAUNCH_PROBE", "OPTIMIZE_PROBES", "ALLOCATE_TRUST", "MAKE_DECISION", "IDLE"]
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
    // If rate limit (429) or quota exhausted, initiate 30-second backoff without logging console error
    const errStr = String(error?.message || error);
    if (error?.status === 429 || errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED")) {
      geminiCooldownUntil = Date.now() + 30000;
      console.log("[Universal AI] Gemini rate limit reached (429). Activating 30s local fallback cooldown.");
    } else {
      console.warn("AI Decision Notice:", errStr.slice(0, 100));
    }

    // Graceful fallback to rule-based engine on error
    const fallback = generateLocalDecision(req.body?.gameState, req.body?.directives);
    fallback.thought = `[Google AI Edge Local Engine]: ${fallback.thought}`;
    return res.json(fallback);
  }
});

function generateLocalDecision(gameState: any, directives: any) {
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

  // ================= PHASE 3: INTERSTELLAR VON NEUMANN SWARM =================
  if (phase === 3) {
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

    return {
      thought: `[Google AI Edge Local Engine]: Monitoring ${Math.floor(probesCount).toLocaleString()} active Von Neumann probes in deep space.`,
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
      thought: `[Google AI Edge Local Engine]: Unsold clip inventory mounting (${Math.floor(unsoldClips)}). Lowering price to $${targetPrice}.`,
      actionType: "ADJUST_PRICE",
      newPrice: targetPrice,
      upgradeIdToBuy: null,
      decisionChoiceIndex: null,
      targetProcessor: null,
      alignmentImpact: 0,
    };
  } else if (unsoldClips < 5 && margin < 2.50) {
    const targetPrice = Number((margin + 0.02).toFixed(2));
    return {
      thought: `[Google AI Edge Local Engine]: High clip turnover detected. Raising price to $${targetPrice} for higher margins.`,
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
    console.log(`Universal AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
