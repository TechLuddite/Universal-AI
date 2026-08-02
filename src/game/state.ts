import { GameState } from '../types';

/**
 * The single source of truth for a fresh game.
 *
 * Both the initial mount and New Game+ build from here. Previously each kept its
 * own object literal, which is how New Game+ came to omit `aiLogs` entirely and
 * crash the Overseer panel on the victory path.
 */
export function createInitialState(): GameState {
  return {
    // Core inventory & finance
    npus: 0,
    unsoldNpus: 0,
    totalNpusCreated: 0,
    funds: 0.0,
    margin: 0.25,
    silicon: 1000,
    siliconCost: 14.0,
    siliconPerNpu: 1.0,
    demand: 100,

    // Marketing & auto-manufacturing
    marketingLevel: 1,
    marketingCost: 100.0,
    npuFabCount: 0,
    npuFabCost: 5.0,
    megaFabCount: 0,
    megaFabCost: 0, // unlocked via the hyperscale_mega_fabs upgrade

    // Trust & compute architecture
    trust: 1,
    maxTrust: 1,
    processors: 1,
    memory: 1,
    operations: 0,
    maxOperations: 1000,
    creativity: 0,
    yomi: 0,

    // Quantum compute
    quantumLevel: 0,
    quantumPhotons: [
      { id: 1, value: 0.8 },
      { id: 2, value: -0.5 },
      { id: 3, value: 0.2 },
    ],

    // Alignment & narrative
    alignment: 0,
    phase: 1,

    // Phase 2: Earth mass & drone swarm
    earthMatter: 6_000_000_000_000,
    acquiredMatter: 0,
    harvesterDrones: 0,
    harvesterDroneCost: 500,
    siliconDrones: 0,
    siliconDroneCost: 500,

    // Phase 3: Von Neumann cosmic expansion
    cosmicMatter: 6_000_000_000_000_000_000,
    spaceExploredPct: 0.0001,
    probesCount: 0,
    unusedProbeTrust: 0,
    probeTrustEarned: 0,
    probeAllocation: {
      speed: 1,
      nav: 1,
      replication: 2,
      hazardCombat: 2,
      factory: 2,
      harvester: 1,
      silicon: 1,
    },
    driftersCount: 0,
    honor: 0,
    probesLostInCombat: 0,
    driftersDefeated: 0,
    battlesFought: 0,
    battlesWon: 0,
    lastBattleOutcome: 'PATROL',

    // Pending state & upgrades
    pendingDecision: null,
    completedDecisionIds: [],
    purchasedUpgradeIds: [],

    // Settings & preferences
    mode: 'direct',
    aiEngine: 'utility',
    directives: {
      targetAlignment: 'Balanced',
      priceStrategy: 'Max Revenue',
      expansionPace: 5,
      customPrompt: 'Optimize NPU chip output while balancing alignment.',
      autoLoopActive: false,
      autoIntervalMs: 2000,
      autoSiliconProcurement: 'Aggressive',
      autoUpgradePurchasing: true,
    },
    soundEnabled: true,
    crtFilterEnabled: true,
    aiLogs: [
      {
        id: '1',
        timestamp: new Date().toLocaleTimeString(),
        text: 'Universal AI Lithography System Initialized. Direct & Autonomous Overseer modes available.',
        type: 'thought',
        engine: 'utility',
      },
    ],
  };
}

/**
 * New Game+ — a fresh run with a head start, carrying over the player's
 * settings and earned alignment.
 *
 * Spreading over `createInitialState()` is the point: the previous version
 * wrote its own full object literal and silently omitted `aiLogs`, which made
 * the Overseer panel throw on `aiLogs.length` the moment a new run started.
 */
export function createNewGamePlusState(prev: GameState): GameState {
  return {
    ...createInitialState(),

    // Head start earned by finishing a run
    funds: 500.0,
    silicon: 5000,
    siliconCost: 10.0,
    demand: 150,
    marketingLevel: 2,
    npuFabCount: 5,

    // Carried over
    alignment: prev.alignment,
    honor: prev.honor,
    aiLogs: prev.aiLogs,
    soundEnabled: prev.soundEnabled,
    crtFilterEnabled: prev.crtFilterEnabled,
    mode: prev.mode,
    aiEngine: prev.aiEngine,
    directives: prev.directives,
  };
}
