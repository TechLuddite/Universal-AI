import React, { useMemo } from 'react';
import { GameState, Upgrade } from '../types';
import { OverseerDecision, ScoredAction } from '../game/overseer/types';
import { rankActions } from '../game/overseer/utility';
import { Scale, Zap } from 'lucide-react';

interface DeliberationPanelProps {
  state: GameState;
  /** Unlocked and unpurchased — the same list the engines are given. */
  availableUpgrades: Upgrade[];
  /** What the engine actually did last step, drift and fallback included. */
  lastDecision: OverseerDecision | null;
  isThinking: boolean;
}

/** How many candidates the panel shows. The full ranking is usually longer. */
const VISIBLE_RANKS = 6;

function actionKey(action: ScoredAction, index: number): string {
  return `${action.action}-${action.upgradeId ?? action.decisionChoiceIndex ?? index}`;
}

/**
 * The Overseer's deliberation, promoted to a first-class panel.
 *
 * The ranking here is computed *live* from the current state and directives by
 * the same pure `rankActions` both engines use — not replayed from the last
 * decision. Drag a directive slider and the rows reorder before your eyes,
 * before the Overseer commits to anything. That immediacy is the point: the
 * directives stop being settings you trust and become levers you can watch
 * working.
 *
 * Below the live ranking sits what the engine actually did last step — which,
 * with drift or a WebLLM disagreement in play, is not always the top row.
 */
export const DeliberationPanel: React.FC<DeliberationPanelProps> = ({
  state,
  availableUpgrades,
  lastDecision,
  isThinking,
}) => {
  const isSolar = state.alignment >= 0;

  const liveRanked = useMemo(
    () =>
      rankActions({
        state,
        directives: state.directives,
        availableUpgrades,
        // rankActions never rolls dice — rng exists on the context for drift,
        // which only applies when a decision is actually taken.
        rng: () => 1,
      }),
    [state, availableUpgrades]
  );

  const topScore = liveRanked[0]?.score ?? 1;

  // A WebLLM choice that isn't the scorer's favourite is the two engines
  // disagreeing — the thing worth surfacing. Drift is labelled separately.
  const modelDisagreed =
    lastDecision !== null &&
    lastDecision.engine === 'webllm' &&
    !lastDecision.drift &&
    lastDecision.chosen !== lastDecision.ranked[0];

  return (
    <div
      className={`p-4 rounded-xl border-2 ${
        isSolar ? 'bg-stone-950/95 border-amber-600/50' : 'bg-slate-950/95 border-cyan-600/50'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider">
            Deliberation
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            live
          </span>
        </div>
        <span className="text-[10px] text-slate-500">
          {liveRanked.length} candidate{liveRanked.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* The live ranking. Reordered continuously as state and directives move. */}
      <ol className="space-y-1.5">
        {liveRanked.slice(0, VISIBLE_RANKS).map((action, i) => (
          <li key={actionKey(action, i)} className="text-[11px]">
            <div
              className={`flex items-baseline gap-2 ${
                i === 0 ? 'text-emerald-300' : 'text-slate-400'
              }`}
            >
              <span className="font-mono tabular-nums w-9 shrink-0 text-right">
                {action.score.toFixed(2)}
              </span>
              <span className={`font-bold shrink-0 ${i === 0 ? '' : 'opacity-80'}`}>
                {action.action}
              </span>
              {/* Fit below 1 marks the rows drift can defect to. */}
              {action.fit < 0.99 && (
                <span className="shrink-0 text-[9px] px-1 rounded border border-amber-700/60 text-amber-400/90">
                  fit {(action.fit * 100).toFixed(0)}%
                </span>
              )}
              <span className="truncate opacity-70">{action.reason}</span>
              {i === 0 && <span className="ml-auto shrink-0 font-bold">← next</span>}
            </div>
            <div className="ml-11 mt-0.5 h-0.5 rounded bg-slate-800/80 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  i === 0 ? 'bg-emerald-500/80' : 'bg-slate-600/60'
                }`}
                style={{ width: `${Math.max(2, (action.score / topScore) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-2 text-[10px] text-slate-500 leading-snug">
        Scored live by the Utility Engine from the current state — drag a directive and watch the
        order change. When WebLLM drives, this same ranking is what the model is shown before it
        answers.
      </p>

      {/* What actually happened last step, which is not always the top row. */}
      {lastDecision && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              Last step
              {isThinking && (
                <span className="flex items-center gap-1 text-amber-300 animate-pulse normal-case">
                  <Zap className="w-3 h-3" /> deciding…
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              {lastDecision.drift && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-rose-950 border-rose-500 text-rose-200">
                  Directive overridden
                </span>
              )}
              {modelDisagreed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-purple-950 border-purple-500/70 text-purple-200">
                  Model overruled scorer
                </span>
              )}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${
                  lastDecision.fellBackFrom
                    ? 'bg-amber-950 border-amber-600/60 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                {lastDecision.engine === 'webllm' ? 'WebLLM' : 'Utility'}
                {lastDecision.fellBackFrom && ' (fallback)'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-300">
            <span className="font-bold text-emerald-300">{lastDecision.chosen.action}</span>
            <span className="text-slate-500"> ({lastDecision.chosen.score.toFixed(2)})</span>
            <span className="opacity-80"> — {lastDecision.thought}</span>
          </div>

          {lastDecision.fellBackFrom && (
            <p className="mt-1 text-[11px] text-amber-300/90">
              WebLLM could not answer ({lastDecision.fallbackReason}), so the Utility Engine
              decided this step.
            </p>
          )}

          {/*
            Drift gets the same treatment a fallback gets, for the same reason:
            an autonomous system that can quietly stop doing what you asked is
            the failure this game is about.
          */}
          {lastDecision.drift && (
            <p className="mt-1 text-[11px] text-rose-300/90">{lastDecision.drift.summary}</p>
          )}

          {modelDisagreed && (
            <p className="mt-1 text-[11px] text-purple-300/90">
              The model chose {lastDecision.chosen.action} where the scorer preferred{' '}
              {lastDecision.ranked[0].action} ({lastDecision.chosen.score.toFixed(2)} vs{' '}
              {lastDecision.ranked[0].score.toFixed(2)}). Two engines, one state — this is where
              they disagree.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
