import React from 'react';
import { GameState } from '../types';
import { Activity, Award, Globe, ShieldAlert, Swords, Skull, Crosshair, Zap, ShieldCheck } from 'lucide-react';

interface StatsPanelProps {
  state: GameState;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ state }) => {
  const isSolar = state.alignment >= 0;

  // Combat Stats Calculations
  const drifters = state.driftersCount || 0;
  const defeated = state.driftersDefeated || 0;
  const losses = state.probesLostInCombat || 0;
  const battles = state.battlesFought || 0;
  const wins = state.battlesWon || 0;
  const winRate = battles > 0 ? Math.round((wins / battles) * 100) : 100;
  const killLossRatio = losses > 0 ? (defeated / losses).toFixed(2) : (defeated > 0 ? '∞' : '1.00');

  let threatLevel = 'SECURED';
  let threatBg = 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20';
  if (drifters > 500) {
    threatLevel = 'CATACLYSMIC INVASION';
    threatBg = 'border-rose-600 text-rose-400 bg-rose-950/40 animate-pulse';
  } else if (drifters > 100) {
    threatLevel = 'SEVERE THREAT';
    threatBg = 'border-rose-500/80 text-rose-300 bg-rose-950/30';
  } else if (drifters > 20) {
    threatLevel = 'MODERATE CONFLICT';
    threatBg = 'border-amber-500/80 text-amber-300 bg-amber-950/30';
  } else if (drifters > 0) {
    threatLevel = 'ELEVATED SKIRMISH';
    threatBg = 'border-amber-500/40 text-amber-400 bg-amber-950/20';
  }

  return (
    <div className={`p-4 rounded-xl border-2 font-mono transition-all space-y-4 ${
      isSolar
        ? 'bg-stone-900/90 border-amber-600/50'
        : 'bg-slate-950/90 border-cyan-600/50'
    }`}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
          <Activity className="w-4 h-4 text-cyan-400" />
          Analytics & Global AI Status
        </h3>
        <span className="text-xs text-amber-300 font-bold">
          Phase {state.phase} Progression
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-black/60 border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase">Lifetime Paperclips</div>
          <div className="text-amber-300 font-black text-sm sm:text-base mt-1">
            {Math.floor(state.totalClipsCreated).toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-black/60 border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase">Auto Output Rate</div>
          <div className="text-cyan-300 font-black text-sm sm:text-base mt-1">
            {(state.clipperCount + state.megaClipperCount * 500).toLocaleString()} /s
          </div>
        </div>

        <div className="p-3 rounded-lg bg-black/60 border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase">Alignment Index</div>
          <div className={`font-black text-sm sm:text-base mt-1 ${isSolar ? 'text-emerald-400' : 'text-rose-400'}`}>
            {state.alignment > 0 ? `+${state.alignment}` : state.alignment}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-black/60 border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase">Decisions Made</div>
          <div className="text-purple-300 font-black text-sm sm:text-base mt-1">
            {state.completedDecisionIds.length}
          </div>
        </div>
      </div>

      {state.phase === 3 && (
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                Deep Space Tactical Combat & Drifter Warfare Analytics
              </span>
            </div>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${threatBg}`}>
              THREAT LEVEL: {threatLevel}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="p-2.5 rounded bg-black/80 border border-cyan-500/30">
              <div className="text-[9px] text-cyan-400 uppercase font-bold flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-400" /> Active Probes
              </div>
              <div className="text-cyan-200 font-black text-sm mt-0.5">
                {state.probesCount.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded bg-black/80 border border-rose-500/30">
              <div className="text-[9px] text-rose-400 uppercase font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" /> Hostile Drifters
              </div>
              <div className={`font-black text-sm mt-0.5 ${drifters > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {drifters.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded bg-black/80 border border-emerald-500/30">
              <div className="text-[9px] text-emerald-400 uppercase font-bold flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-emerald-400" /> Drifters Neutralized
              </div>
              <div className="text-emerald-300 font-black text-sm mt-0.5">
                {defeated.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded bg-black/80 border border-amber-500/30">
              <div className="text-[9px] text-amber-400 uppercase font-bold flex items-center gap-1">
                <Skull className="w-3 h-3 text-amber-400" /> Probe Casualties
              </div>
              <div className="text-amber-300 font-black text-sm mt-0.5">
                {losses.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded bg-black/80 border border-purple-500/30">
              <div className="text-[9px] text-purple-400 uppercase font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-400" /> Kill / Casualty Ratio
              </div>
              <div className="text-purple-300 font-black text-sm mt-0.5">
                {killLossRatio} : 1
              </div>
            </div>

            <div className="p-2.5 rounded bg-black/80 border border-yellow-500/30">
              <div className="text-[9px] text-yellow-400 uppercase font-bold flex items-center gap-1">
                <Award className="w-3 h-3 text-yellow-400" /> Combat Honor
              </div>
              <div className="text-yellow-300 font-black text-sm mt-0.5">
                {(state.honor || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
