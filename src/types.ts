export type GameMode = 'direct' | 'overseer';

export type AIEngine = 'utility' | 'webllm';

export type AlignmentPhase = 'Cyberpunk' | 'Neutral' | 'Solarpunk';

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
  costAmount: number;
  reqNpus?: number;
  reqTrust?: number;
  reqPhase?: number;
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
