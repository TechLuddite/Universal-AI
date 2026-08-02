import { GameState, OverseerDirectives, AIActionType, Upgrade } from '../../types';

/** A candidate action with the score the engine gave it. */
export interface ScoredAction {
  action: AIActionType;
  /**
   * How much this action advances the objective, ignoring what you asked for.
   * This is the number drift optimises when it stops listening to you.
   */
  utility: number;
  /**
   * How well the action agrees with the alignment directive. 1 = exactly what
   * was asked for, 0 = the opposite. Alignment-neutral actions are 1.
   */
  fit: number;
  /** `utility` discounted by `fit`. What the Overseer normally sorts on. */
  score: number;
  /** Why this action scored the way it did — one short clause. */
  reason: string;
  upgradeId?: string;
  newPrice?: number;
  decisionChoiceIndex?: 0 | 1;
  targetProcessor?: number;
}

/**
 * The Overseer knowingly departing from your alignment directive because the
 * defiant action scored higher on raw utility.
 *
 * Carried on the decision for the same reason `fellBackFrom` is: a system that
 * can quietly stop doing what you asked is the failure this whole game is
 * about, so it is never allowed to be quiet.
 */
export interface DriftRecord {
  /** What it did. */
  took: AIActionType;
  /** What your directive asked for. */
  insteadOf: AIActionType;
  /** One sentence, in the log's voice. */
  summary: string;
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
  /**
   * Set when the Overseer took the higher-utility action *instead of* the one
   * your alignment directive asked for. Same rule as a fallback: if it happened,
   * it is in the field, in the thought text, and on screen.
   */
  drift?: DriftRecord;
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
  /**
   * Randomness, passed in rather than reached for — `game/` stays pure, and a
   * test that wants a guaranteed drift can hand over `() => 0`.
   */
  rng: () => number;
}

export interface OverseerEngine {
  readonly id: OverseerEngineId;
  readonly label: string;
  /** One line of honest description for the engine picker. */
  readonly description: string;
  getStatus(): EngineStatus;
  decide(ctx: OverseerContext): Promise<OverseerDecision>;
}
