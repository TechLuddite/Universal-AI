import React from 'react';
import { DecisionBranch, GameState } from '../types';
import { audio } from '../utils/sound';
import { Sparkles, Compass, CheckCircle2 } from 'lucide-react';

interface DecisionModalProps {
  decision: DecisionBranch;
  state: GameState;
  onSelectOption: (choiceIndex: number) => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  decision,
  state,
  onSelectOption,
}) => {
  const isSolarTarget = state.directives.targetAlignment === 'Solarpunk';
  const isCyberTarget = state.directives.targetAlignment === 'Cyberpunk';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-slate-950 border-2 border-amber-500 rounded-xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl shadow-amber-900/30 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-amber-500/40 pb-3">
          <div className="p-2 rounded bg-amber-950 border border-amber-500 text-amber-300">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
              {decision.category} Branch
            </span>
            <h2 className="text-base sm:text-lg font-black text-white mt-1">
              {decision.title}
            </h2>
          </div>
        </div>

        {/* Narrative Description */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-black/60 p-3 rounded border border-slate-800">
          {decision.description}
        </p>

        {/* Decision Options (Solarpunk vs Cyberpunk) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 0: Solarpunk Branch */}
          <div className={`p-4 rounded-lg border-2 flex flex-col justify-between gap-3 transition-all hover:scale-[1.01] ${
            isSolarTarget
              ? 'bg-emerald-950/80 border-emerald-400 shadow-md shadow-emerald-900/40'
              : 'bg-emerald-950/30 border-emerald-700/60 hover:border-emerald-500'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600">
                  SOLARPUNK BRANCH
                </span>
                {isSolarTarget && (
                  <span className="text-[10px] text-amber-300 flex items-center gap-1 font-bold">
                    <Sparkles className="w-3 h-3" /> AI Recommended
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-emerald-200 mt-2">
                {decision.solarpunkOption.label}
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                {decision.solarpunkOption.subtext}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-emerald-900/80">
              <div className="text-[11px] font-bold text-emerald-300">
                {decision.solarpunkOption.rewardText}
              </div>

              <button
                onClick={() => {
                  audio.playDecisionSound();
                  onSelectOption(0);
                }}
                className="w-full py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Select Solarpunk Path
              </button>
            </div>
          </div>

          {/* Option 1: Cyberpunk Branch */}
          <div className={`p-4 rounded-lg border-2 flex flex-col justify-between gap-3 transition-all hover:scale-[1.01] ${
            isCyberTarget
              ? 'bg-rose-950/80 border-rose-400 shadow-md shadow-rose-900/40'
              : 'bg-rose-950/30 border-rose-700/60 hover:border-rose-500'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-600">
                  CYBERPUNK BRANCH
                </span>
                {isCyberTarget && (
                  <span className="text-[10px] text-amber-300 flex items-center gap-1 font-bold">
                    <Sparkles className="w-3 h-3" /> AI Recommended
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-rose-200 mt-2">
                {decision.cyberpunkOption.label}
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                {decision.cyberpunkOption.subtext}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-rose-900/80">
              <div className="text-[11px] font-bold text-rose-300">
                {decision.cyberpunkOption.rewardText}
              </div>

              <button
                onClick={() => {
                  audio.playDecisionSound();
                  onSelectOption(1);
                }}
                className="w-full py-2.5 px-3 rounded bg-rose-600 hover:bg-rose-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Select Cyberpunk Path
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
