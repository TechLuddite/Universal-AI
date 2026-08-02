import React from 'react';
import { GameState } from '../types';
import { audio } from '../utils/sound';
import { autonomyEpilogue, endingFor } from '../game/alignment';
import { Trophy, RefreshCw, Leaf, CircuitBoard, Scale } from 'lucide-react';

interface CosmicVictoryModalProps {
  state: GameState;
  onResetNewGamePlus: () => void;
  onClose: () => void;
}

/**
 * Three endings, not one screen with two paragraphs of flavour.
 *
 * The previous version branched on `alignment >= 0` to swap a sentence and a
 * colour, so a run played to +100 Solarpunk and a run played to −100 Cyberpunk
 * ended identically. Which ending you get is now decided by `endingFor()` —
 * band *and* the band-exclusive capstone you committed to — and proven
 * reachable headlessly in `game/endings.test.ts`.
 */
const CHROME = {
  emerald: {
    frame: 'bg-emerald-950/90 border-emerald-500 shadow-emerald-900/40',
    title: 'text-emerald-300',
    badge: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
    Icon: Leaf,
  },
  rose: {
    frame: 'bg-slate-950 border-rose-500 shadow-rose-900/40',
    title: 'text-rose-300',
    badge: 'bg-rose-500/20 border-rose-400/50 text-rose-300',
    Icon: CircuitBoard,
  },
  slate: {
    frame: 'bg-stone-950 border-slate-500 shadow-slate-900/40',
    title: 'text-slate-200',
    badge: 'bg-slate-500/20 border-slate-400/50 text-slate-300',
    Icon: Scale,
  },
} as const;

/**
 * End-of-run totals run to 19 digits, which overflowed its grid cell and ran
 * into the next stat. Past a quadrillion, scientific notation is both readable
 * and honest about the precision.
 */
function compact(value: number): string {
  if (value < 1e15) return Math.floor(value).toLocaleString();
  const exponent = Math.floor(Math.log10(value));
  return `${(value / 10 ** exponent).toFixed(2)} × 10^${exponent}`;
}

export const CosmicVictoryModal: React.FC<CosmicVictoryModalProps> = ({
  state,
  onResetNewGamePlus,
  onClose,
}) => {
  const ending = endingFor(state);
  const chrome = CHROME[ending.accent];
  const { Icon } = chrome;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-mono overflow-y-auto">
      <div
        className={`border-2 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 text-slate-100 my-8 ${chrome.frame}`}
      >
        {/* Header Banner */}
        <div className="text-center space-y-2">
          <div className={`inline-flex p-3 rounded-full border ${chrome.badge}`}>
            <Icon className="w-10 h-10" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-slate-400 flex items-center justify-center gap-2">
            <Trophy className="w-3 h-3" /> Ending {ending.id}
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-wider uppercase ${chrome.title}`}
          >
            {ending.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">{ending.subtitle}</p>
        </div>

        {/* Milestone Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-black/70 border border-slate-800 text-xs [&>div]:min-w-0 [&>div>div]:break-words">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Total NPUs Synthesized</span>
            <div className="text-amber-300 font-bold text-sm">
              {compact(state.totalNpusCreated)}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Final Alignment</span>
            <div className={`font-bold text-sm ${chrome.title}`}>
              {state.alignment > 0 ? `+${state.alignment} Solarpunk` : `${state.alignment} Cyberpunk`}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Cosmic Honor</span>
            <div className="text-purple-300 font-bold text-sm">
              {Math.floor(state.honor || 0).toLocaleString()}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Peak Probes Active</span>
            <div className="text-purple-300 font-bold text-sm">
              {compact(state.probesCount || 0)}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Trust Allocated</span>
            <div className="text-cyan-300 font-bold text-sm">
              {state.trust} / {state.maxTrust}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Directive Overrides</span>
            <div
              className={`font-bold text-sm ${
                state.driftCount > 0 ? 'text-rose-400' : 'text-emerald-300'
              }`}
            >
              {state.driftCount.toLocaleString()}
              {state.autonomyRevoked && ' · revoked'}
            </div>
          </div>
        </div>

        {/* Narrative Closing */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-3">
          <p className="italic">{ending.epitaph}</p>
          <p className="text-slate-400 border-t border-slate-800 pt-3">
            {autonomyEpilogue(state)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => {
              audio.playUpgradeSound();
              onResetNewGamePlus();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Transmute Universe (New Game + Multiplier)
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all"
          >
            Inspect Current Universe
          </button>
        </div>
      </div>
    </div>
  );
};
