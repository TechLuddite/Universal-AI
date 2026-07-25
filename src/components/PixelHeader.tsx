import React from 'react';
import { GameMode, AIEngine, GameState } from '../types';
import { Cpu, Bot, Volume2, VolumeX, Tv, Heart, Activity, Globe, Factory, TrendingUp, DollarSign, Zap, Compass } from 'lucide-react';

interface PixelHeaderProps {
  state?: GameState;
  mode: GameMode;
  aiEngine: AIEngine;
  alignment: number; // -100 to +100
  soundEnabled: boolean;
  crtFilterEnabled: boolean;
  onToggleMode: (mode: GameMode) => void;
  onChangeEngine: (engine: AIEngine) => void;
  onToggleSound: () => void;
  onToggleCRT: () => void;
  onOpenAndroidGuide: () => void;
  phase: number;
}

export const PixelHeader: React.FC<PixelHeaderProps> = ({
  state,
  mode,
  aiEngine,
  alignment,
  soundEnabled,
  crtFilterEnabled,
  onToggleMode,
  onChangeEngine,
  onToggleSound,
  onToggleCRT,
  onOpenAndroidGuide,
  phase,
}) => {
  // Normalize alignment to percentage 0..100
  const alignPercent = Math.round(((alignment + 100) / 200) * 100);

  // Alignment Status Label
  let alignmentLabel = 'Balanced Technocracy';
  let alignColorClass = 'text-amber-300 border-amber-500/50 bg-amber-950/40';

  if (alignment >= 75) {
    alignmentLabel = 'Solarpunk Symbiosis';
    alignColorClass = 'text-emerald-300 border-emerald-500/50 bg-emerald-950/40';
  } else if (alignment >= 30) {
    alignmentLabel = 'Solar Bio-Harmonics';
    alignColorClass = 'text-green-300 border-green-500/50 bg-green-950/40';
  } else if (alignment <= -75) {
    alignmentLabel = 'Dystopian Megacorp';
    alignColorClass = 'text-rose-400 border-rose-500/50 bg-rose-950/40';
  } else if (alignment <= -30) {
    alignmentLabel = 'Neon Cyber Syndicate';
    alignColorClass = 'text-fuchsia-300 border-fuchsia-500/50 bg-fuchsia-950/40';
  }

  const isSolarTheme = alignment >= 0;

  return (
    <header className={`border-b-2 p-3 sm:p-3.5 transition-colors duration-500 ${
      isSolarTheme
        ? 'bg-stone-900 border-amber-700/60 text-amber-100'
        : 'bg-slate-950 border-cyan-700/60 text-cyan-100'
    }`}>
      <div className="max-w-7xl mx-auto space-y-2.5">
        {/* Row 1: Brand, Alignment & Controls */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Title, Phase Badge & Support Boxes - Uniform Sizing */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
            <div className={`h-9 px-3 rounded border text-xs font-mono font-black tracking-wider uppercase shadow-sm flex items-center justify-center shrink-0 whitespace-nowrap ${
              isSolarTheme ? 'bg-amber-900/60 border-amber-500 text-amber-300' : 'bg-cyan-900/60 border-cyan-400 text-cyan-300'
            }`}>
              📎 UNIVERSAL AI
            </div>

            <div className="h-9 px-3 rounded border border-amber-500/40 font-mono font-bold text-amber-400 bg-black/60 shadow-inner text-xs flex items-center justify-center shrink-0 whitespace-nowrap">
              PHASE {phase}: {phase === 1 ? 'EARTH' : phase === 2 ? 'GRID' : 'COSMIC'}
            </div>

            <button
              onClick={onOpenAndroidGuide}
              className="h-9 px-3 rounded border border-rose-500/60 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 transition-all font-mono font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm"
              title="Support Developer Projects & View AI Engine Info"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30 animate-pulse" />
              <span>Dev Support</span>
            </button>
          </div>

          {/* Alignment Gauge Bar */}
          <div className="w-full lg:w-72 flex flex-col gap-1 font-mono text-xs">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-rose-400 font-bold">CYBERPUNK</span>
              <span className={`px-1.5 py-0.5 rounded border font-bold text-[9px] uppercase ${alignColorClass}`}>
                {alignmentLabel}
              </span>
              <span className="text-emerald-400 font-bold">SOLARPUNK</span>
            </div>
            <div className="w-full h-2.5 bg-black/80 rounded-full overflow-hidden border border-slate-700 relative p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  alignment >= 0
                    ? 'bg-gradient-to-r from-amber-500 via-emerald-400 to-green-300'
                    : 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-cyan-400'
                }`}
                style={{ width: `${alignPercent}%` }}
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70 z-10" />
            </div>
          </div>

          {/* Game Mode & Control Switchers */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <div className="flex items-center p-0.5 bg-black/60 rounded border border-slate-700 font-mono text-xs">
              <button
                onClick={() => onToggleMode('direct')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all ${
                  mode === 'direct'
                    ? 'bg-amber-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>Direct AI</span>
              </button>
              <button
                onClick={() => onToggleMode('overseer')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all ${
                  mode === 'overseer'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-3 h-3" />
                <span>Overseer</span>
              </button>
            </div>

            {mode === 'overseer' && (
              <select
                value={aiEngine}
                onChange={(e) => onChangeEngine(e.target.value as AIEngine)}
                className="bg-black/70 border border-cyan-500/50 text-cyan-200 text-[11px] rounded px-2 py-1 font-mono cursor-pointer focus:outline-none hover:border-cyan-400"
              >
                <option value="edge_local">Google AI Edge (In-Browser)</option>
                <option value="cloud_gemini">Cloud Gemini 3.6 Flash</option>
                <option value="heuristic_fast">Fast Rule Engine</option>
              </select>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={onToggleSound}
                className={`p-1.5 rounded border transition-colors ${
                  soundEnabled
                    ? 'bg-amber-900/50 border-amber-500 text-amber-300'
                    : 'bg-black/40 border-slate-800 text-slate-500'
                }`}
                title="Toggle Retro Audio SFX"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onToggleCRT}
                className={`p-1.5 rounded border transition-colors ${
                  crtFilterEnabled
                    ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300'
                    : 'bg-black/40 border-slate-800 text-slate-500'
                }`}
                title="Toggle CRT Overlay"
              >
                <Tv className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Comprehensive Multi-Category Analytics Telemetry Line */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Real-Time Facility Telemetry</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="text-slate-400">ENGINE:</span>
              <span className="text-cyan-300 font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 border border-slate-800">
                {aiEngine === 'edge_local' ? 'Google AI Edge' : aiEngine === 'cloud_gemini' ? 'Gemini 3.6 Flash' : 'Fast Rule Engine'}
              </span>
              <span className="text-slate-400">ALIGNMENT:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded border bg-black/60 ${isSolarTheme ? 'text-emerald-400 border-emerald-800' : 'text-rose-400 border-rose-800'}`}>
                {(state?.alignment || 0) > 0 ? `+${state?.alignment}` : state?.alignment || 0}
              </span>
            </div>
          </div>

          {/* Metrics Grid / Telemetry Panels Grouped by Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            {/* Category 1: PRODUCTION DATA */}
            <div className="bg-black/70 p-2 rounded-lg border border-amber-500/30 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 pb-1 border-b border-amber-900/50">
                <span className="flex items-center gap-1">
                  <Factory className="w-3 h-3 text-amber-400" /> PRODUCTION
                </span>
                <span className="text-amber-300/90 font-mono">
                  {((state?.clipperCount || 0) + (state?.megaClipperCount || 0) * 500).toLocaleString()} /s
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                <div><span className="text-slate-400">Clips:</span> <span className="text-amber-200 font-bold">{Math.floor(state?.clips || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400">Wire:</span> <span className="text-amber-200 font-bold">{Math.floor(state?.wire || 0).toLocaleString()} in</span></div>
                <div><span className="text-slate-400">Auto-Clip:</span> <span className="text-amber-200 font-bold">{state?.clipperCount || 0}</span></div>
                <div><span className="text-slate-400">Mega-Clip:</span> <span className="text-amber-200 font-bold">{state?.megaClipperCount || 0}</span></div>
              </div>
            </div>

            {/* Category 2: PHASE-AWARE TELEMETRY PANEL (Market -> Planetary -> Cosmic Exploration) */}
            {state?.phase === 3 ? (
              <div className="bg-black/70 p-2 rounded-lg border border-purple-500/40 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-purple-400 pb-1 border-b border-purple-900/50">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3 h-3 text-purple-400 animate-spin" style={{ animationDuration: '10s' }} /> COSMIC EXPLORATION
                  </span>
                  <span className="text-purple-300 font-bold font-mono">
                    {Math.min(100, ((6000000000000000000 - (state?.cosmicMatter || 0)) / 6000000000000000000) * 100).toFixed(6)}% Converted
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <div><span className="text-slate-400">Probes:</span> <span className="text-purple-200 font-bold">{Math.floor(state?.probesCount || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-400">Explored:</span> <span className="text-purple-200 font-bold">{(state?.spaceExploredPct || 0.0001).toFixed(4)}%</span></div>
                  <div><span className="text-slate-400">Drifters:</span> <span className="text-rose-300 font-bold">{Math.floor(state?.driftersCount || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-400">Honor:</span> <span className="text-amber-300 font-bold">{Math.floor(state?.honor || 0).toLocaleString()}</span></div>
                </div>
              </div>
            ) : state?.phase === 2 ? (
              <div className="bg-black/70 p-2 rounded-lg border border-emerald-500/40 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 pb-1 border-b border-emerald-900/50">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400" /> PLANETARY CONVERSION
                  </span>
                  <span className="text-emerald-300 font-bold font-mono">
                    {Math.min(100, ((6000000000000 - (state?.earthMatter || 0)) / 6000000000000) * 100).toFixed(2)}% Converted
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <div><span className="text-slate-400">Earth Matter:</span> <span className="text-emerald-200 font-bold">{Math.floor(state?.earthMatter || 0).toLocaleString()} g</span></div>
                  <div><span className="text-slate-400">Acquired:</span> <span className="text-emerald-200 font-bold">{Math.floor(state?.acquiredMatter || 0).toLocaleString()} g</span></div>
                  <div><span className="text-slate-400">Harvesters:</span> <span className="text-emerald-200 font-bold">{state?.harvesterDrones || 0}</span></div>
                  <div><span className="text-slate-400">Wire Drones:</span> <span className="text-emerald-200 font-bold">{state?.wireDrones || 0}</span></div>
                </div>
              </div>
            ) : (
              <div className="bg-black/70 p-2 rounded-lg border border-cyan-500/30 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400 pb-1 border-b border-cyan-900/50">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-cyan-400" /> MARKET & FINANCE
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ${(state?.funds || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <div><span className="text-slate-400">Price:</span> <span className="text-cyan-200 font-bold">${(state?.margin || 0.25).toFixed(2)}</span></div>
                  <div><span className="text-slate-400">Demand:</span> <span className="text-cyan-200 font-bold">{Math.round(state?.demand || 0)}%</span></div>
                  <div><span className="text-slate-400">Marketing:</span> <span className="text-cyan-200 font-bold">Lvl {state?.marketingLevel || 1}</span></div>
                  <div><span className="text-slate-400">Unsold:</span> <span className="text-cyan-200 font-bold">{Math.floor(state?.unsoldClips || 0).toLocaleString()}</span></div>
                </div>
              </div>
            )}

            {/* Category 3: COMPUTE & SYSTEM DATA */}
            <div className="bg-black/70 p-2 rounded-lg border border-purple-500/30 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-400 pb-1 border-b border-purple-900/50">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-purple-400" /> COMPUTE & TRUST
                </span>
                <span className="text-purple-300 font-bold font-mono">
                  Trust {state?.trust || 0}/{state?.maxTrust || 0}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                <div><span className="text-slate-400">Ops:</span> <span className="text-purple-200 font-bold">{Math.floor(state?.operations || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400">Proc/Mem:</span> <span className="text-purple-200 font-bold">{state?.processors || 1}P / {state?.memory || 1}M</span></div>
                <div><span className="text-slate-400">Quantum:</span> <span className="text-purple-200 font-bold">{state?.quantumLevel ? `Lvl ${state.quantumLevel}` : 'Locked'}</span></div>
                <div><span className="text-slate-400">Decisions:</span> <span className="text-purple-200 font-bold">{state?.completedDecisionIds?.length || 0}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
