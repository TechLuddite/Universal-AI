import { GameState, OverseerDirectives, AIActionType, Upgrade } from '../../types';

/** A candidate action with the score the engine gave it. */
export interface ScoredAction {
  action: AIActionType;
  score: number;
  /** Why this action scored the way it did — one short clause. */
  reason: string;
  upgradeId?: string;
  newPrice?: number;
  decisionChoiceIndex?: 0 | 1;
  targetProcessor?: number;
}

export interface OverseerDecision {
  chosen: ScoredAction;
  /** Every action considered, best first. This is what the UI renders. */
  ranked: ScoredAction[];
  /** The engine's narration of its own choice. */
  thought: string;
  /** Which engine actually produced this — not which one was selected. */
  engine: OverseerEngineId;
  /**
   * Set when the selected engine could not answer and another one stood in.
   * The old code fell back silently and labelled the fallback as the engine it
   * replaced, so a broken cloud path looked like a working local one. Any
   * fallback must be visible.
   */
  fellBackFrom?: OverseerEngineId;
  fallbackReason?: string;
}

export type OverseerEngineId = 'utility' | 'webllm';

export type EngineStatus =
  | { kind: 'ready' }
  | { kind: 'idle' }
  | { kind: 'loading'; progress: number; detail: string }
  | { kind: 'unsupported'; reason: string }
  | { kind: 'error'; reason: string };

/** Everything an engine needs to decide, in one object. */
export interface OverseerContext {
  state: GameState;
  directives: OverseerDirectives;
  /** Unlocked, unpurchased, currently affordable. */
  availableUpgrades: Upgrade[];
}

export interface OverseerEngine {
  readonly id: OverseerEngineId;
  readonly label: string;
  /** One line of honest description for the engine picker. */
  readonly description: string;
  getStatus(): EngineStatus;
  decide(ctx: OverseerContext): Promise<OverseerDecision>;
}
