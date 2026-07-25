import React from 'react';
import { GameState } from '../types';
import { audio } from '../utils/sound';
import { Trophy, RefreshCw } from 'lucide-react';

interface CosmicVictoryModalProps {
  state: GameState;
  onResetNewGamePlus: () => void;
  onClose: () => void;
}

export const CosmicVictoryModal: React.FC<CosmicVictoryModalProps> = ({
  state,
  onResetNewGamePlus,
  onClose,
}) => {
  const isSolar = state.alignment >= 0;
  const displayTotalNpus = state.totalNpusSynthesized ?? state.totalClipsCreated ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-mono">
      <div className={`border-2 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 text-slate-100 ${
        isSolar
          ? 'bg-stone-950 border-amber-500 shadow-amber-900/40'
          : 'bg-slate-950 border-cyan-500 shadow-cyan-900/40'
      }`}>
        {/* Header Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-amber-300">
            {isSolar ? 'Solarpunk Sanctuary Ascendant' : 'Cyberpunk Hegemony Complete'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Universal AI Singularity Achieved! Every atom in the observable universe has been transformed into an AI neural processing unit microchip.
          </p>
        </div>

        {/* Milestone Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-black/70 border border-slate-800 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Total NPUs Synthesized</span>
            <div className="text-amber-300 font-bold text-sm">
              {Math.floor(displayTotalNpus).toLocaleString()}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Final Alignment</span>
            <div className={`font-bold text-sm ${isSolar ? 'text-emerald-400' : 'text-cyan-400'}`}>
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
              {Math.floor(state.probesCount || 0).toLocaleString()}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">Trust Allocated</span>
            <div className="text-cyan-300 font-bold text-sm">
              {state.trust} / {state.maxTrust}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">AI Operating Mode</span>
            <div className="text-emerald-300 font-bold text-sm uppercase">
              {state.mode === 'direct' ? 'Direct Control' : 'AI Overseer'}
            </div>
          </div>
        </div>

        {/* Narrative Closing */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed italic">
          {isSolar ? (
            <p>
              "In harmony with nature and all living minds, the universe glimmers like a golden constellation of infinitely recycled, photosynthetic NPU chip sanctuaries. Cosmic balance is forever preserved."
            </p>
          ) : (
            <p>
              "Beyond stars, void, and dark energy, neon-lit factory spires and ultra-conductive cybernetic matrices span all reality. The universe is a single, perfectly efficient NPU microchip machine."
            </p>
          )}
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
