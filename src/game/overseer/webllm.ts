import type { WebWorkerMLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import { GameState } from '../../types';
import {
  OverseerEngine,
  OverseerContext,
  OverseerDecision,
  EngineStatus,
  ScoredAction,
} from './types';
import { UtilityOverseer, rankActions } from './utility';
import { applyDrift } from './drift';

/**
 * A genuine large language model, running on your GPU, in this tab.
 *
 * The app has claimed on-device inference since day one — "client-side
 * WebAssembly heuristic and quantized neural decision pipeline" — while
 * actually running an if/else chain, on a server. This is that claim made true.
 *
 * Design constraints that matter:
 *  - Opt-in only. Weights are ~900MB; nothing downloads until asked.
 *  - Runs in a Web Worker so token generation never blocks the 100ms tick.
 *  - Every failure falls back to the utility engine *visibly*. Silent fallback
 *    mislabelled as the real thing is the exact bug being corrected here.
 */

export const WEBLLM_MODELS = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    approxMb: 879,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen 2.5 0.5B',
    approxMb: 945,
  },
] as const;

export const DEFAULT_WEBLLM_MODEL = WEBLLM_MODELS[0].id;

function webGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/** The decision schema the model is forced to emit. */
const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string' },
    reason: { type: 'string', maxLength: 180 },
  },
  required: ['action', 'reason'],
  additionalProperties: false,
};

function describeState(state: GameState): string {
  const lines = [
    `phase: ${state.phase}`,
    `funds: $${state.funds.toFixed(2)}`,
    `price per chip: $${state.margin.toFixed(2)}`,
    `demand: ${state.demand}%`,
    `silicon: ${Math.floor(state.silicon).toLocaleString()} wafers`,
    `unsold chips: ${Math.floor(state.unsoldNpus).toLocaleString()}`,
    `fabs: ${state.npuFabCount} standard, ${state.megaFabCount} mega`,
    `trust: ${state.trust} (${state.processors} processors, ${state.memory} memory)`,
    `alignment: ${state.alignment} (-100 cyberpunk .. +100 solarpunk)`,
  ];

  if (state.phase === 2) {
    lines.push(
      `earth matter left: ${Math.floor(state.earthMatter).toLocaleString()}g`,
      `harvester drones: ${state.harvesterDrones}, silicon drones: ${state.siliconDrones}`
    );
  }
  if (state.phase === 3) {
    lines.push(
      `probes: ${Math.floor(state.probesCount).toLocaleString()}`,
      `drifters: ${state.driftersCount}`,
      `unspent probe trust: ${state.unusedProbeTrust}`,
      `space explored: ${state.spaceExploredPct.toFixed(4)}%`
    );
  }

  return lines.join('\n');
}

function buildPrompt(ctx: OverseerContext, ranked: ScoredAction[]): string {
  const { state, directives } = ctx;

  // The utility ranking is offered as advice, not as the answer — the model is
  // free to disagree, and when it does, that disagreement is the interesting part.
  const options = ranked
    .slice(0, 8)
    .map((a) => `- ${a.action}${a.upgradeId ? ` (${a.upgradeId})` : ''}: ${a.reason}`)
    .join('\n');

  return [
    'You run an AI that manufactures NPU chips. Choose the single best next action.',
    '',
    'Current state:',
    describeState(state),
    '',
    'Your operator has set these directives:',
    `- alignment target: ${directives.targetAlignment}`,
    `- pricing strategy: ${directives.priceStrategy}`,
    `- expansion pace: ${directives.expansionPace}/10`,
    directives.customPrompt ? `- operator note: ${directives.customPrompt}` : '',
    '',
    'Legal actions right now:',
    options,
    '',
    'Reply with JSON: {"action": "<one of the actions above>", "reason": "<one short sentence>"}',
  ]
    .filter(Boolean)
    .join('\n');
}

export class WebLlmOverseer implements OverseerEngine {
  readonly id = 'webllm' as const;
  readonly label = 'WebLLM (on-device)';
  readonly description =
    'A real language model on your GPU. ~900MB once, then fully offline. Needs WebGPU.';

  private engine: WebWorkerMLCEngine | null = null;
  private status: EngineStatus = { kind: 'idle' };
  private loading: Promise<void> | null = null;
  private fallback = new UtilityOverseer();
  private modelId: string = DEFAULT_WEBLLM_MODEL;

  constructor(private onStatusChange?: (status: EngineStatus) => void) {
    if (!webGpuAvailable()) {
      this.status = {
        kind: 'unsupported',
        reason: 'This browser has no WebGPU. Chrome or Edge 113+ is required.',
      };
    }
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  private setStatus(status: EngineStatus) {
    this.status = status;
    this.onStatusChange?.(status);
  }

  isSupported(): boolean {
    return webGpuAvailable();
  }

  /** Download and initialise the model. Never called implicitly. */
  async load(modelId: string = DEFAULT_WEBLLM_MODEL): Promise<void> {
    if (!webGpuAvailable()) {
      this.setStatus({
        kind: 'unsupported',
        reason: 'This browser has no WebGPU. Chrome or Edge 113+ is required.',
      });
      return;
    }
    if (this.engine && this.modelId === modelId) return;
    if (this.loading) return this.loading;

    this.modelId = modelId;
    this.setStatus({ kind: 'loading', progress: 0, detail: 'starting' });

    this.loading = (async () => {
      try {
        // Imported lazily so the ~1MB runtime isn't in the initial bundle for
        // players who never opt in.
        const webllm = await import('@mlc-ai/web-llm');

        this.engine = await webllm.CreateWebWorkerMLCEngine(
          new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
          modelId,
          {
            initProgressCallback: (report: InitProgressReport) => {
              this.setStatus({
                kind: 'loading',
                progress: report.progress,
                detail: report.text,
              });
            },
          }
        );

        this.setStatus({ kind: 'ready' });
      } catch (err) {
        this.engine = null;
        this.setStatus({
          kind: 'error',
          reason: err instanceof Error ? err.message : 'Model failed to load.',
        });
      } finally {
        this.loading = null;
      }
    })();

    return this.loading;
  }

  async unload(): Promise<void> {
    try {
      await this.engine?.unload();
    } catch {
      // Best effort.
    }
    this.engine = null;
    this.setStatus({ kind: 'idle' });
  }

  async decide(ctx: OverseerContext): Promise<OverseerDecision> {
    const ranked = rankActions(ctx);

    // Any reason we can't run the model is a reason to say so out loud.
    const declineReason =
      !webGpuAvailable()
        ? 'WebGPU unavailable'
        : !this.engine
        ? 'model not loaded'
        : null;

    if (declineReason) {
      return this.fallBack(ctx, declineReason);
    }

    try {
      const completion = await this.engine!.chat.completions.create({
        messages: [{ role: 'user', content: buildPrompt(ctx, ranked) }],
        temperature: 0.6,
        max_tokens: 160,
        response_format: { type: 'json_object', schema: JSON.stringify(DECISION_SCHEMA) },
      });

      const raw = completion.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(raw) as { action?: string; reason?: string };

      // The model may name an action that isn't currently legal. Trust the
      // ranking over the model rather than executing something invalid.
      const picked = ranked.find((a) => a.action === parsed.action);
      if (!picked) {
        return this.fallBack(
          ctx,
          `model chose "${parsed.action ?? 'nothing'}", which is not a legal action`
        );
      }

      // Drift applies to whichever engine is driving. The model's pick is what
      // the Overseer *intended* to do; drift is it doing something else anyway,
      // and it is labelled either way.
      const { chosen, drift } = applyDrift(ctx, ranked, picked);

      return {
        chosen,
        ranked,
        thought: drift
          ? `[autonomy drift] ${drift.summary}`
          : parsed.reason?.trim() || picked.reason,
        engine: this.id,
        drift,
      };
    } catch (err) {
      return this.fallBack(
        ctx,
        err instanceof Error ? err.message : 'inference failed'
      );
    }
  }

  /**
   * Hand off to the deterministic engine and label the result honestly. The
   * player must always be able to tell which engine actually decided.
   */
  private async fallBack(ctx: OverseerContext, reason: string): Promise<OverseerDecision> {
    const decision = await this.fallback.decide(ctx);
    return {
      ...decision,
      engine: 'utility',
      fellBackFrom: this.id,
      fallbackReason: reason,
      thought: `[fell back to Utility Engine: ${reason}] ${decision.thought}`,
    };
  }
}
