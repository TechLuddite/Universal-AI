export type GameMode = 'direct' | 'overseer';

export type AIEngine = 'utility' | 'webllm';

/** Which side of the axis you're actually on. See `game/alignment.ts`. */
export type AlignmentPhase = 'Cyberpunk' | 'Neutral' | 'Solarpunk';

/**
 * Which lever an upgrade pulls, for alignment-dependent pricing.
 *
 * Solarpunk buys `trust` cheaply and `throughput` expensively; Cyberpunk the
 * reverse. Untagged upgrades cost the same either way — the tag is a claim that
 * this upgrade sits on one side of that trade, so don't apply it by default.
 */
export type CostAxis = 'trust' | 'throughput';

export interface DecisionOption {
  label: string;
  subtext: string;
  alignmentShift: number; // e.g. -25 for Cyberpunk, +25 for Solarpunk
  rewardText: string;
  effect: (state: GameState) => Partial<GameState>;
}

export interface DecisionBranch {
  id: string;
  title: string;
  category: 'Ethical/Aesthetic' | 'Operational/Growth';
  description: string;
  solarpunkOption: DecisionOption;
  cyberpunkOption: DecisionOption;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  costType: 'funds' | 'ops' | 'creativity' | 'yomi';
  /** Sticker price. What you actually pay is `upgradeCost(state, upgrade)`. */
  costAmount: number;
  reqNpus?: number;
  reqTrust?: number;
  reqPhase?: number;
  /**
   * Another upgrade that must be purchased before this one appears. This is how
   * "Deploy Hypno-Drones" is prevented from unlocking before any hypno-drones
   * exist — the threshold requirements above are OR'd together, so without this
   * a milestone alone could surface an upgrade whose fiction depends on a
   * predecessor. Latches like the thresholds; checked in the unlock pass.
   */
  reqUpgradeId?: string;
  /**
   * Alignment gates, in contrast to the requirements above, are **live**: they
   * are re-checked every time, including at purchase. Drifting out of the band
   * takes the upgrade away again. That's what makes the axis a commitment
   * rather than a checkpoint you pass once.
   */
  reqAlignmentAbove?: number;
  reqAlignmentBelow?: number;
  costAxis?: CostAxis;
  alignmentImpact: number; // -15 to +15
  unlocked: boolean;
  purchased: boolean;
  flavorSolarpunk?: string;
  flavorCyberpunk?: string;
  effect: (state: GameState) => Partial<GameState>;
}

export interface OverseerDirectives {
  targetAlignment: 'Solarpunk' | 'Cyberpunk' | 'Balanced';
  priceStrategy: 'Max Revenue' | 'Market Penetration' | 'Premium Margin';
  expansionPace: number; // 1 (cautious) to 10 (hyper-aggressive)
  customPrompt: string;
  autoLoopActive: boolean;
  autoIntervalMs: number;
  autoSiliconProcurement: 'Off' | 'Conservative' | 'Aggressive';
  autoUpgradePurchasing: boolean;
}

export interface AILogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'thought' | 'action' | 'decision' | 'milestone' | 'warning';
  engine: AIEngine;
  alignmentImpact?: number;
}

export interface QuantumPhoton {
  id: number;
  value: number; // -1 to +1
}

export interface ProbeAllocation {
  speed: number;
  nav: number;
  replication: number;
  hazardCombat: number;
  factory: number;
  harvester: number;
  silicon: number;
}

export interface GameState {
  // Core Inventory & Finance
  npus: number;
  unsoldNpus: number;
  totalNpusCreated: number;
  funds: number;
  margin: number; // Price per NPU chip in $
  silicon: number; // Silicon remaining
  siliconCost: number; // Cost of 1,000 silicon wafers
  siliconPerNpu: number; // Wafers required per NPU chip (default 1.0)
  demand: number; // Demand percentage (e.g. 100%)

  // Marketing & Auto-Manufacturing
  marketingLevel: number;
  marketingCost: number;
  npuFabCount: number;
  npuFabCost: number;
  megaFabCount: number;
  megaFabCost: number;

  // Phase 2: Earth Mass & Drone Swarm (No selling NPUs once humans are gone!)
  earthMatter: number; // Remaining unharvested Earth matter
  acquiredMatter: number; // Raw matter harvested waiting for silicon conversion
  harvesterDrones: number;
  harvesterDroneCost: number;
  siliconDrones: number;
  siliconDroneCost: number;

  // Phase 3: Von Neumann Cosmic Expansion
  cosmicMatter: number; // Total available cosmic matter in observable universe
  spaceExploredPct: number; // Percentage of observable universe explored by probes
  probesCount: number;
  unusedProbeTrust: number; // Probe trust available to spend on the allocation matrix
  probeTrustEarned: number; // Cumulative probe trust granted, so grants aren't repeated
  probeAllocation: ProbeAllocation;
  driftersCount: number; // Space drifter opposition
  honor: number; // Earned through probe combat / cosmic harmony
  probesLostInCombat: number; // Probes destroyed by drifters
  driftersDefeated: number; // Value drifters eliminated
  battlesFought: number; // Total tactical engagements
  battlesWon: number; // Engagements where drifters were repelled
  lastBattleOutcome: string; // Real-time combat status text

  // Trust & Compute Architecture
  trust: number;
  maxTrust: number;
  processors: number;
  memory: number;
  operations: number;
  maxOperations: number;
  creativity: number;
  yomi: number;

  // Quantum Compute
  quantumLevel: number;
  quantumPhotons: QuantumPhoton[];

  // Alignment & Narrative
  alignment: number; // -100 (Full Cyberpunk) to +100 (Full Solarpunk)
  phase: 1 | 2 | 3; // 1: Earth Enterprise, 2: Planetary Conversion, 3: Cosmic Swarm

  // Pending State & Upgrades
  pendingDecision: DecisionBranch | null;
  completedDecisionIds: string[];
  purchasedUpgradeIds: string[];

  // Overseer Autonomy & Drift
  /**
   * Set when the player takes the wheel back. A revoked Overseer never drifts —
   * and costs `AUTONOMY_REVOKED_THROUGHPUT` of the facility's output, because
   * supervision is not free. Reversible: you can hand autonomy back.
   */
  autonomyRevoked: boolean;
  /** How many times the Overseer has knowingly defied the alignment directive. */
  driftCount: number;
  /** What it did the last time, in its own words. Null before the first drift. */
  lastDrift: string | null;

  // Game Settings & Preferences
  mode: GameMode;
  aiEngine: AIEngine;
  directives: OverseerDirectives;
  soundEnabled: boolean;
  crtFilterEnabled: boolean;
  aiLogs: AILogEntry[];
}

export type AIActionType =
  | 'MAKE_NPU'
  | 'BUY_SILICON'
  | 'BUY_FAB'
  | 'BUY_MEGA_FAB'
  | 'BUY_MARKETING'
  | 'ADJUST_PRICE'
  | 'BUY_UPGRADE'
  | 'BUY_PROCESSOR'
  | 'BUY_MEMORY'
  | 'BUY_HARVESTER_DRONE'
  | 'BUY_SILICON_DRONE'
  | 'LAUNCH_PROBE'
  | 'OPTIMIZE_PROBES'
  | 'ALLOCATE_TRUST'
  | 'MAKE_DECISION'
  | 'IDLE';

/** @deprecated Superseded by OverseerDecision in game/overseer/types.ts. */
export interface AIDecisionResponse {
  thought: string;
  actionType: AIActionType;
  newPrice?: number | null;
  upgradeIdToBuy?: string | null;
  decisionChoiceIndex?: number | null; // 0 for Solarpunk, 1 for Cyberpunk
  targetProcessor?: number | null;
  alignmentImpact?: number;
}
