export type GameMode = 'direct' | 'overseer';

export type AIEngine = 'edge_local' | 'cloud_gemini' | 'heuristic_fast';

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
  reqClips?: number;
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
  wire: number;
}

export interface GameState {
  // Core Inventory & Finance
  clips: number;
  unsoldClips: number;
  totalClipsCreated: number;
  funds: number;
  margin: number; // Price per clip in $
  wire: number; // Wire remaining
  wireCost: number; // Cost of 1,000 wire
  demand: number; // Demand percentage (e.g. 100%)

  // Marketing & Auto-Manufacturing
  marketingLevel: number;
  marketingCost: number;
  clipperCount: number;
  clipperCost: number;
  megaClipperCount: number;
  megaClipperCost: number;

  // Phase 2: Earth Mass & Drone Swarm (No selling paperclips once humans are gone!)
  earthMatter: number; // Remaining unharvested Earth matter
  acquiredMatter: number; // Raw matter harvested waiting for wire conversion
  harvesterDrones: number;
  harvesterDroneCost: number;
  wireDrones: number;
  wireDroneCost: number;

  // Phase 3: Von Neumann Cosmic Expansion
  cosmicMatter: number; // Total available cosmic matter in observable universe
  spaceExploredPct: number; // Percentage of observable universe explored by probes
  probesCount: number;
  unusedProbeTrust: number;
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

export interface AIDecisionResponse {
  thought: string;
  actionType:
    | 'MAKE_CLIP'
    | 'BUY_WIRE'
    | 'BUY_CLIPPER'
    | 'BUY_MEGA_CLIPPER'
    | 'BUY_MARKETING'
    | 'ADJUST_PRICE'
    | 'BUY_UPGRADE'
    | 'BUY_PROCESSOR'
    | 'BUY_MEMORY'
    | 'BUY_HARVESTER_DRONE'
    | 'BUY_WIRE_DRONE'
    | 'LAUNCH_PROBE'
    | 'OPTIMIZE_PROBES'
    | 'ALLOCATE_TRUST'
    | 'MAKE_DECISION'
    | 'IDLE';
  newPrice?: number | null;
  upgradeIdToBuy?: string | null;
  decisionChoiceIndex?: number | null; // 0 for Solarpunk, 1 for Cyberpunk
  targetProcessor?: number | null;
  alignmentImpact?: number;
}
