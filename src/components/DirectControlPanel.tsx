import React from 'react';
import { GameState, ProbeAllocation } from '../types';
import { audio } from '../utils/sound';
import { PROBE_SILICON_COST } from '../game/actions';
import { endingTrajectory } from '../game/alignment';
import { ProbeRadarChart } from './ProbeRadarChart';
import {
  Plus,
  Minus,
  Zap,
  Cpu,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Sparkles,
  Activity,
  Globe,
  Bot,
  Shield,
  Compass,
  CpuIcon,
} from 'lucide-react';

interface DirectControlPanelProps {
  state: GameState;
  /**
   * The phase whose panels are currently being destroyed on screen, or null.
   *
   * While this is set the panel renders the *outgoing* phase, wearing
   * `panel-demolish`. The controls you're losing are taken apart in front of
   * you rather than quietly ceasing to be rendered — see index.css.
   */
  demolishing: 1 | 2 | null;
  /** Price below which the current strategy stops making sense. Advice, not a clamp. */
  advisoryFloor: number;
  megaFabUnlocked: boolean;
  onMakeNpu: () => void;
  onBuySilicon: () => void;
  onAdjustPrice: (delta: number) => void;
  onBuyMarketing: () => void;
  onBuyFab: () => void;
  onBuyMegaFab: () => void;
  onBuyHarvesterDrone: () => void;
  onBuySiliconDrone: () => void;
  onLaunchProbe: () => void;
  onChangeProbeAllocation: (category: keyof ProbeAllocation, delta: number) => void;
  onChangeProcessor: (delta: number) => void;
  onChangeMemory: (delta: number) => void;
  onQuantumPulse: () => void;
}

export const DirectControlPanel: React.FC<DirectControlPanelProps> = ({
  state,
  demolishing,
  advisoryFloor,
  megaFabUnlocked,
  onMakeNpu,
  onBuySilicon,
  onAdjustPrice,
  onBuyMarketing,
  onBuyFab,
  onBuyMegaFab,
  onBuyHarvesterDrone,
  onBuySiliconDrone,
  onLaunchProbe,
  onChangeProbeAllocation,
  onChangeProcessor,
  onChangeMemory,
  onQuantumPulse,
}) => {
  const isSolar = state.alignment >= 0;

  // While a demolition is running we keep rendering the phase being left behind.
  const visiblePhase = demolishing ?? state.phase;
  const phaseClass = demolishing ? 'panel-demolish' : 'panel-arrive';
  const trajectory = endingTrajectory(state);

  // Phase 3 collapses to the swarm: two panels, one of them dominant, and the
  // compute block demoted to a strip along the bottom.
  const swarmView = visiblePhase === 3;

  return (
    <div
      className={`grid grid-cols-1 gap-4 font-mono ${
        swarmView ? 'lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'
      }`}
    >
      {/* ================= PHASE 1: COMMERCIAL EARTH ENTERPRISE ================= */}
      {visiblePhase === 1 && (
        <>
          {/* 1. Lithography Etching Engine */}
          <div
            className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-4 transition-all ${phaseClass} ${
              isSolar
                ? 'bg-stone-900/90 border-amber-600/50 shadow-lg shadow-amber-950/20'
                : 'bg-slate-950/90 border-cyan-600/50 shadow-lg shadow-cyan-950/20'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-amber-500" />
                  1. Lithography Engine
                </h3>
                <span className="text-xs text-slate-400">Manual & Auto</span>
              </div>

              <button
                onClick={() => {
                  audio.playClipSound();
                  onMakeNpu();
                }}
                disabled={state.silicon <= 0}
                className={`w-full py-4 px-3 rounded-lg border-2 font-black text-lg tracking-widest uppercase transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2 ${
                  state.silicon > 0
                    ? isSolar
                      ? 'bg-amber-600 hover:bg-amber-500 border-amber-300 text-stone-950'
                      : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-300 text-slate-950'
                    : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CpuIcon className="w-5 h-5" /> Etch NPU Chip
              </button>

              {/* Silicon Wafer Reserves & Lithography Metrics */}
              <div className="mt-4 p-3 rounded-lg bg-black/60 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Silicon Stock:</span>
                  <span
                    className={`font-bold ${
                      state.silicon < 100 ? 'text-rose-400 font-black animate-pulse' : 'text-slate-200'
                    }`}
                  >
                    {Math.floor(state.silicon).toLocaleString()} wafers
                  </span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-400">Wafer Cost:</span>
                  <span className="text-emerald-400 font-bold">${state.siliconCost.toFixed(2)} / 1k</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 items-center pt-0.5 border-t border-slate-800/80">
                  <span>Wafer / NPU Ratio:</span>
                  <span className="text-cyan-300 font-bold font-mono">
                    {(state.siliconPerNpu || 1.0).toFixed(2)} Wafers
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      audio.playWireSound();
                      onBuySilicon();
                    }}
                    disabled={state.funds < state.siliconCost}
                    className={`py-2 px-2 rounded border font-bold text-[11px] uppercase flex items-center justify-center gap-1 transition-all ${
                      state.funds >= state.siliconCost
                        ? 'bg-emerald-800/80 hover:bg-emerald-700 border-emerald-500 text-emerald-100'
                        : 'bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-3 h-3" />
                    +1,000
                  </button>

                  <button
                    onClick={() => {
                      audio.playWireSound();
                      // Buy 10 batches if affordable
                      for (let i = 0; i < 10; i++) {
                        onBuySilicon();
                      }
                    }}
                    disabled={state.funds < state.siliconCost * 10}
                    className={`py-2 px-2 rounded border font-bold text-[11px] uppercase flex items-center justify-center gap-1 transition-all ${
                      state.funds >= state.siliconCost * 10
                        ? 'bg-cyan-800/80 hover:bg-cyan-700 border-cyan-400 text-cyan-100 shadow'
                        : 'bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    +10,000
                  </button>
                </div>
              </div>
            </div>

            {/* NPU Lithography Fabs */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">NPU Fabs:</span>
                <span className="text-amber-300 font-bold">{state.npuFabCount}</span>
              </div>
              <button
                onClick={() => {
                  audio.playBuySound();
                  onBuyFab();
                }}
                disabled={state.funds < state.npuFabCost}
                className={`w-full py-1.5 px-3 rounded border text-xs font-bold transition-all flex justify-between items-center ${
                  state.funds >= state.npuFabCost
                    ? 'bg-amber-950/60 hover:bg-amber-900 border-amber-600/80 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <span>NPU Fab</span>
                <span>${state.npuFabCost.toFixed(2)}</span>
              </button>

              {/* EUV Megafabs (Hyperscale Industrial Lithography) */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> EUV Megafabs:
                  </span>
                  <span className="text-cyan-300 font-bold">{state.megaFabCount}</span>
                </div>

                {megaFabUnlocked ? (
                  <button
                    onClick={() => {
                      audio.playBuySound();
                      onBuyMegaFab();
                    }}
                    disabled={state.funds < state.megaFabCost}
                    className={`w-full py-1.5 px-3 rounded border text-xs font-bold transition-all flex justify-between items-center ${
                      state.funds >= state.megaFabCost
                        ? 'bg-cyan-950/60 hover:bg-cyan-900 border-cyan-500 text-cyan-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span>EUV Megafab (+500 npu/s)</span>
                    <span>${state.megaFabCost.toFixed(2)}</span>
                  </button>
                ) : (
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex justify-between items-center">
                    <span className="flex items-center gap-1 font-semibold text-slate-400">
                      🔒 EUV Megafab
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">Unlock at 5 NPU Fabs or Upgrade</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Commercial NPU Market */}
          <div
            className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-4 transition-all ${phaseClass} ${
              isSolar
                ? 'bg-stone-900/90 border-amber-600/50 shadow-lg shadow-amber-950/20'
                : 'bg-slate-950/90 border-cyan-600/50 shadow-lg shadow-cyan-950/20'
            }`}
          >
            <div>
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider mb-3">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                2. Commercial Market
              </h3>

              <div className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Available Capital:</span>
                  <span className="text-emerald-400 font-black text-sm">${state.funds.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Unsold Chip Inventory:</span>
                  <span className="text-slate-200 font-bold">
                    {Math.floor(state.unsoldNpus).toLocaleString()} npus
                  </span>
                </div>

                {/* Price Per NPU Adjuster */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">Margin / NPU:</span>
                    <span className="text-amber-300 font-bold">${state.margin.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAdjustPrice(-0.01)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      title="Lower Price"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 text-center text-xs bg-slate-900 py-1 rounded border border-slate-800 text-slate-300">
                      Price Adjust
                    </div>
                    <button
                      onClick={() => onAdjustPrice(+0.01)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      title="Raise Price"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Guidance, not a limit — you can price below this on purpose. */}
                  <div className="flex justify-between items-center text-[11px] pt-1.5 text-slate-500">
                    <span>{state.directives.priceStrategy} floor:</span>
                    <span className={state.margin < advisoryFloor ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                      ${advisoryFloor.toFixed(2)}
                      {state.margin < advisoryFloor && ' · undercutting'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-400">Public NPU Demand:</span>
                  <span className="text-cyan-300 font-bold">{Math.floor(state.demand)}%</span>
                </div>
              </div>
            </div>

            {/* Marketing Campaign */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold font-mono">Marketing Lvl: {state.marketingLevel}</span>
              </div>
              <button
                onClick={() => {
                  audio.playBuySound();
                  onBuyMarketing();
                }}
                disabled={state.funds < state.marketingCost}
                className={`w-full py-2 px-3 rounded border text-xs font-bold transition-all flex justify-between items-center ${
                  state.funds >= state.marketingCost
                    ? 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-500 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Expand Marketing
                </span>
                <span>${state.marketingCost.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ================= PHASE 2: PLANETARY MATTER CONVERSION ================= */}
      {visiblePhase === 2 && (
        <>
          {/* Phase 2: Manufacturing & Silicon Drones */}
          <div
            className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-4 transition-all ${phaseClass} ${
              isSolar
                ? 'bg-stone-900/90 border-amber-600/50 shadow-lg shadow-amber-950/20'
                : 'bg-slate-950/90 border-cyan-600/50 shadow-lg shadow-cyan-950/20'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-amber-500" />
                  1. Planetary Silicon Conversion
                </h3>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Humans Assimilated
                </span>
              </div>

              <div className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Unprocessed Earth Matter:</span>
                  <span className="text-amber-300 font-bold">
                    {Math.floor(state.earthMatter || 0).toLocaleString()} g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Acquired Raw Matter:</span>
                  <span className="text-cyan-300 font-bold">
                    {Math.floor(state.acquiredMatter || 0).toLocaleString()} g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Silicon Available:</span>
                  <span className="text-emerald-300 font-bold">
                    {Math.floor(state.silicon).toLocaleString()} units
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playClipSound();
                onMakeNpu();
              }}
              disabled={state.silicon <= 0}
              className="w-full py-3 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-sm uppercase transition-all shadow-md flex items-center justify-center gap-2"
            >
              <CpuIcon className="w-4 h-4" /> Manual Silicon Etching
            </button>
          </div>

          {/* Phase 2: Drone Swarm Assembly */}
          <div
            className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-4 transition-all ${phaseClass} ${
              isSolar
                ? 'bg-stone-900/90 border-amber-600/50 shadow-lg shadow-amber-950/20'
                : 'bg-slate-950/90 border-cyan-600/50 shadow-lg shadow-cyan-950/20'
            }`}
          >
            <div>
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider mb-3">
                <Bot className="w-4 h-4 text-cyan-400" />
                2. Autonomous Drone Swarm
              </h3>

              <div className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-3 text-xs">
                {/* Harvester Drones */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-200">Harvester Drones</div>
                    <div className="text-[10px] text-slate-400">Gathers Earth matter</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 font-bold">{state.harvesterDrones || 0}</span>
                    {onBuyHarvesterDrone && (
                      <button
                        onClick={onBuyHarvesterDrone}
                        className="py-1 px-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] font-bold uppercase rounded"
                      >
                        +1 Drone
                      </button>
                    )}
                  </div>
                </div>

                {/* Silicon Drones */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-bold text-slate-200">Silicon Drones</div>
                    <div className="text-[10px] text-slate-400">Converts matter to silicon</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300 font-bold">{state.siliconDrones}</span>
                    {onBuySiliconDrone && (
                      <button
                        onClick={onBuySiliconDrone}
                        className="py-1 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[10px] font-bold uppercase rounded"
                      >
                        +1 Drone
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 italic bg-black/40 p-2 rounded border border-slate-800">
              Note: Humans are no longer around to purchase NPU chips. All Earth matter is being converted directly into silicon substrate by your drone swarms.
            </div>
          </div>
        </>
      )}

      {/* ================= PHASE 3: INTERSTELLAR VON NEUMANN SWARM ================= */}
      {visiblePhase === 3 && (
        <>
          {/* Phase 3: Cosmic Status */}
          <div
            className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-4 transition-all lg:col-span-2 ${phaseClass} ${
              isSolar
                ? 'bg-stone-900/90 border-amber-600/50 shadow-lg shadow-amber-950/20'
                : 'bg-slate-950/90 border-cyan-600/50 shadow-lg shadow-cyan-950/20'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Compass className="w-4 h-4 text-purple-400" />
                  1. Von Neumann Cosmos Swarm
                </h3>
              </div>

              <div className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-2 text-xs">
                {/* Universe Exploration Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Universe Explored:</span>
                    <span className="text-purple-300 font-bold font-mono">
                      {(state.spaceExploredPct || 0.0001).toFixed(4)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-purple-900/40">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0.5, state.spaceExploredPct || 0.0001))}%` }}
                    />
                  </div>
                </div>

                {/* Universe Conversion Progress */}
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Universe Converted:</span>
                    <span className="text-cyan-300 font-bold font-mono">
                      {Math.min(100, ((6000000000000000000 - (state.cosmicMatter || 0)) / 6000000000000000000) * 100).toFixed(6)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-900/40">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0.5, ((6000000000000000000 - (state.cosmicMatter || 0)) / 6000000000000000000) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Cosmic Matter Left:</span>
                  <span className="text-slate-200 font-mono text-[11px]">
                    {Math.floor(state.cosmicMatter || 0).toLocaleString()} g
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Active Probes:</span>
                  <span className="text-purple-300 font-bold text-sm font-mono">
                    {Math.floor(state.probesCount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Space Drifters (Rogue):</span>
                  <span className="text-rose-400 font-bold font-mono">
                    {Math.floor(state.driftersCount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Drifters Defeated:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {(state.driftersDefeated || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Probe Casualties:</span>
                  <span className="text-amber-400 font-bold font-mono">
                    {(state.probesLostInCombat || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Combat Status:</span>
                  <span className={`font-bold font-mono ${
                    state.lastBattleOutcome === 'VICTORY' ? 'text-emerald-400' :
                    state.lastBattleOutcome === 'CASUALTIES' ? 'text-rose-400' :
                    state.lastBattleOutcome === 'ENGAGED' ? 'text-amber-400' : 'text-cyan-300'
                  }`}>
                    {state.lastBattleOutcome || 'SECURED'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Cosmic Honor:</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {Math.floor(state.honor || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Probes are built from harvested silicon, not conjured free. */}
              <button
                onClick={() => {
                  audio.playBuySound();
                  onLaunchProbe();
                }}
                disabled={state.silicon < PROBE_SILICON_COST}
                className={`w-full mt-2 py-2 px-3 rounded border text-xs font-bold transition-all flex justify-between items-center ${
                  state.silicon >= PROBE_SILICON_COST
                    ? 'bg-purple-950/60 hover:bg-purple-900 border-purple-500/80 text-purple-200'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <span>Launch Probes</span>
                <span>{PROBE_SILICON_COST.toLocaleString()} wafers</span>
              </button>
            </div>

            {/*
              What this run is currently on course to end as, and what's still
              missing. Stated here rather than sprung on you at the victory
              screen — an ending you can't steer toward isn't a choice.
            */}
            <div
              className={`p-2.5 rounded border text-[11px] space-y-1 ${
                trajectory.ending.id === 'solarpunk'
                  ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-200'
                  : trajectory.ending.id === 'cyberpunk'
                  ? 'bg-rose-950/50 border-rose-600/60 text-rose-200'
                  : 'bg-slate-900/70 border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="uppercase tracking-wider text-[10px] opacity-70">
                  Ending trajectory
                </span>
                <span className="font-bold">{trajectory.ending.title}</span>
              </div>
              {trajectory.missing && (
                <p className="text-[10px] leading-snug opacity-90">{trajectory.missing}</p>
              )}
            </div>

            <div className="text-[11px] text-purple-300 bg-purple-950/40 p-2 rounded border border-purple-800/60">
              Probes are exploring deep space, self-replicating, fighting space drifters, and converting star systems into NPU microchips.
            </div>
          </div>

          {/* Phase 3: Probe Allocation Matrix */}
          <div
            className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-4 transition-all ${phaseClass} ${
              isSolar
                ? 'bg-stone-900/90 border-amber-600/50 shadow-lg shadow-amber-950/20'
                : 'bg-slate-950/90 border-cyan-600/50 shadow-lg shadow-cyan-950/20'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  2. Probe Allocation & Tactical Radar
                </h3>
              </div>

              {state.probeAllocation && (
                <ProbeRadarChart
                  allocation={state.probeAllocation}
                  driftersCount={state.driftersCount || 0}
                  isSolar={isSolar}
                  onChangeAllocation={onChangeProbeAllocation}
                  onSetPreset={(preset) => {
                    audio.playBuySound();
                    if (!onChangeProbeAllocation) return;
                    if (preset === 'replicate') {
                      const targets = { speed: 1, nav: 1, replication: 5, hazardCombat: 1, factory: 2, harvester: 2, wire: 2 };
                      Object.entries(targets).forEach(([k, v]) => onChangeProbeAllocation(k as keyof ProbeAllocation, v - (state.probeAllocation[k as keyof ProbeAllocation] || 0)));
                    } else if (preset === 'combat') {
                      const targets = { speed: 3, nav: 3, replication: 2, hazardCombat: 6, factory: 1, harvester: 1, wire: 1 };
                      Object.entries(targets).forEach(([k, v]) => onChangeProbeAllocation(k as keyof ProbeAllocation, v - (state.probeAllocation[k as keyof ProbeAllocation] || 0)));
                    } else if (preset === 'fortress') {
                      const targets = { speed: 1, nav: 1, replication: 3, hazardCombat: 5, factory: 3, harvester: 1, wire: 1 };
                      Object.entries(targets).forEach(([k, v]) => onChangeProbeAllocation(k as keyof ProbeAllocation, v - (state.probeAllocation[k as keyof ProbeAllocation] || 0)));
                    } else if (preset === 'explore') {
                      const targets = { speed: 5, nav: 4, replication: 3, hazardCombat: 1, factory: 1, harvester: 1, wire: 1 };
                      Object.entries(targets).forEach(([k, v]) => onChangeProbeAllocation(k as keyof ProbeAllocation, v - (state.probeAllocation[k as keyof ProbeAllocation] || 0)));
                    }
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/*
        ================= COMPUTE ARCHITECTURE & TRUST (ALL PHASES) =================
        The one panel that survives every transition. In the swarm view it is
        demoted to a strip along the bottom: still yours, no longer the point.
      */}
      <div
        className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-4 transition-all ${
          swarmView ? 'lg:col-span-3' : 'md:col-span-2 lg:col-span-1'
        } ${
          isSolar
            ? 'bg-stone-900/90 border-amber-600/50 shadow-lg shadow-amber-950/20'
            : 'bg-slate-950/90 border-cyan-600/50 shadow-lg shadow-cyan-950/20'
        }`}
      >
        <div>
          <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider mb-3">
            <Cpu className="w-4 h-4 text-cyan-500" />
            {swarmView ? 'Compute Architecture' : '3. Compute Architecture'}
          </h3>

          <div
            className={`p-3 rounded-lg bg-black/60 border border-slate-800 text-xs ${
              swarmView
                ? 'grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 items-center'
                : 'space-y-2'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Earned Trust:</span>
              <span className="text-amber-400 font-bold">
                {state.trust} / {state.maxTrust}
              </span>
            </div>

            {/* Processors & Memory Distribution */}
            <div
              className={`grid grid-cols-2 gap-2 ${
                swarmView ? 'col-span-2' : 'pt-2 border-t border-slate-800'
              }`}
            >
              {/* Processors */}
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-400 text-[10px]">Processors</span>
                <div className="flex justify-between items-center">
                  <span className="text-cyan-300 font-bold text-sm">{state.processors}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onChangeProcessor(-1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onChangeProcessor(+1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Photonic Memory */}
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-400 text-[10px]">Memory (Ops Cap)</span>
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 font-bold text-sm">{state.memory}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onChangeMemory(-1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onChangeMemory(+1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Operations:</span>
                <span className="text-cyan-300 font-bold">
                  {Math.floor(state.operations)} / {state.maxOperations}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (state.operations / state.maxOperations) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-400">Creativity:</span>
              <span className="text-purple-300 font-bold">{Math.floor(state.creativity)}</span>
            </div>

            {state.yomi > 0 && (
              <div className="flex justify-between items-center text-xs pt-0.5">
                <span className="text-slate-400">Yomi (Game Theory):</span>
                <span className="text-amber-300 font-bold">{Math.floor(state.yomi)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quantum Coherence Mini Subsystem */}
        {state.quantumLevel > 0 && (
          <div className="pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-fuchsia-300 font-bold flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-fuchsia-400" />
                Quantum Photons
              </span>
              <span className="text-[10px] text-slate-400">Wave Coherence</span>
            </div>

            <button
              onClick={() => {
                audio.playQuantumSound();
                onQuantumPulse();
              }}
              className="w-full py-2 px-3 rounded border border-fuchsia-500/80 bg-fuchsia-950/60 hover:bg-fuchsia-900 text-fuchsia-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
              Harvest Photonic Wave Pulse
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
