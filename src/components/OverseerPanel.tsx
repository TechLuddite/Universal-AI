import React from 'react';
import { GameState, OverseerDirectives, AIEngine, AILogEntry } from '../types';
import { Bot, Play, Pause, FastForward, Cpu, Terminal, Compass, Zap, ShieldAlert } from 'lucide-react';

interface OverseerPanelProps {
  state: GameState;
  onUpdateDirectives: (updated: Partial<OverseerDirectives>) => void;
  onToggleAutoLoop: () => void;
  onTriggerSingleStep: () => void;
  isThinking: boolean;
}

export const OverseerPanel: React.FC<OverseerPanelProps> = ({
  state,
  onUpdateDirectives,
  onToggleAutoLoop,
  onTriggerSingleStep,
  isThinking,
}) => {
  const { directives, aiEngine, aiLogs, alignment } = state;
  const isSolar = alignment >= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono">
      {/* Overseer Architect Directive Controls */}
      <div className={`p-4 rounded-xl border-2 space-y-4 lg:col-span-1 ${
        isSolar
          ? 'bg-stone-900/90 border-amber-600/50'
          : 'bg-slate-950/90 border-cyan-600/50'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Compass className="w-4 h-4 text-cyan-400" />
            Architect Directives
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300">
            {aiEngine === 'edge_local' ? 'Google AI Edge' : aiEngine === 'cloud_gemini' ? 'Gemini 3.6 Flash' : 'Fast Rules'}
          </span>
        </div>

        {/* Target Alignment Preference */}
        <div className="space-y-1.5 text-xs">
          <label className="text-slate-300 font-semibold block">Target Alignment Goal:</label>
          <div className="grid grid-cols-3 gap-1">
            {(['Solarpunk', 'Balanced', 'Cyberpunk'] as const).map((tgt) => (
              <button
                key={tgt}
                onClick={() => onUpdateDirectives({ targetAlignment: tgt })}
                className={`py-1.5 px-2 rounded border text-[11px] font-bold transition-all ${
                  directives.targetAlignment === tgt
                    ? tgt === 'Solarpunk'
                      ? 'bg-emerald-900 border-emerald-500 text-emerald-200'
                      : tgt === 'Cyberpunk'
                      ? 'bg-rose-900 border-rose-500 text-rose-200'
                      : 'bg-amber-900 border-amber-500 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tgt}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Strategy */}
        <div className="space-y-1.5 text-xs">
          <label className="text-slate-300 font-semibold block">Pricing Strategy Policy:</label>
          <select
            value={directives.priceStrategy}
            onChange={(e) => onUpdateDirectives({ priceStrategy: e.target.value as OverseerDirectives['priceStrategy'] })}
            className="w-full bg-black/70 border border-slate-700 text-slate-200 rounded p-2 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="Max Revenue">Max Revenue (Dynamic Price Optimization)</option>
            <option value="Market Penetration">Market Penetration (Low Margin / High Speed)</option>
            <option value="Premium Margin">Premium Margin (High Price / High Profit)</option>
          </select>
        </div>

        {/* Expansion Aggression Pace */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <label className="text-slate-300 font-semibold">Expansion Aggression Pace:</label>
            <span className="text-cyan-300 font-bold">{directives.expansionPace} / 10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={directives.expansionPace}
            onChange={(e) => onUpdateDirectives({ expansionPace: Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Custom Prompt Directive */}
        <div className="space-y-1.5 text-xs">
          <label className="text-slate-300 font-semibold block">Overseer Custom System Directive:</label>
          <textarea
            value={directives.customPrompt}
            onChange={(e) => onUpdateDirectives({ customPrompt: e.target.value })}
            placeholder="e.g. Prioritize Quantum Computing research while maintaining Solarpunk alignment."
            rows={2}
            className="w-full bg-black/70 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:outline-none focus:border-cyan-500 font-mono resize-none"
          />
        </div>

        {/* Phase 3 Interstellar Exploration Telemetry */}
        {state.phase === 3 && (
          <div className="p-2.5 rounded-lg bg-black/80 border border-purple-500/40 space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-purple-300 font-bold border-b border-purple-900/60 pb-1 text-[11px]">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-purple-400" /> Interstellar Exploration
              </span>
              <span className="text-purple-200 font-mono">
                {(state.spaceExploredPct || 0.0001).toFixed(4)}% Explored
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-purple-950/40 p-1.5 rounded border border-purple-800/40 flex justify-between">
                <span className="text-slate-400">Active Probes:</span>
                <span className="text-purple-200 font-bold">{Math.floor(state.probesCount || 0).toLocaleString()}</span>
              </div>
              <div className="bg-purple-950/40 p-1.5 rounded border border-purple-800/40 flex justify-between">
                <span className="text-slate-400">Space Drifters:</span>
                <span className="text-rose-300 font-bold">{Math.floor(state.driftersCount || 0).toLocaleString()}</span>
              </div>
              <div className="bg-purple-950/40 p-1.5 rounded border border-purple-800/40 flex justify-between col-span-2">
                <span className="text-slate-400">Universe Converted:</span>
                <span className="text-cyan-300 font-bold font-mono">
                  {Math.min(100, ((6000000000000000000 - (state.cosmicMatter || 0)) / 6000000000000000000) * 100).toFixed(6)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Compute & Trust Telemetry Box */}
        <div className="p-2.5 rounded-lg bg-black/80 border border-purple-500/40 space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-purple-300 font-bold border-b border-purple-900/60 pb-1 text-[11px]">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Compute & Trust Architecture
            </span>
            <span className="text-amber-300">
              {state.trust - (state.processors + state.memory) > 0 ? (
                <span className="text-emerald-400 font-black animate-pulse">
                  +{state.trust - (state.processors + state.memory)} Free Trust
                </span>
              ) : (
                <span className="text-purple-300 opacity-80">
                  Trust {state.trust}/{state.maxTrust}
                </span>
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-purple-950/40 p-1.5 rounded border border-purple-800/40 flex justify-between">
              <span className="text-slate-400">Processors:</span>
              <span className="text-purple-200 font-bold">{state.processors} P</span>
            </div>
            <div className="bg-purple-950/40 p-1.5 rounded border border-purple-800/40 flex justify-between">
              <span className="text-slate-400">Memory:</span>
              <span className="text-purple-200 font-bold">{state.memory} M</span>
            </div>
            <div className="bg-purple-950/40 p-1.5 rounded border border-purple-800/40 flex justify-between col-span-2">
              <span className="text-slate-400">Operations Buffer:</span>
              <span className="text-cyan-300 font-bold">
                {Math.floor(state.operations).toLocaleString()} / {state.maxOperations.toLocaleString()} Ops
              </span>
            </div>
          </div>
        </div>

        {/* Autonomous Execution Controls */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Autonomous Speed:</span>
            <select
              value={directives.autoIntervalMs}
              onChange={(e) => onUpdateDirectives({ autoIntervalMs: Number(e.target.value) })}
              className="bg-black border border-slate-700 text-cyan-300 text-xs rounded px-2 py-1"
            >
              <option value={1000}>1.0 sec / tick</option>
              <option value={2000}>2.0 sec / tick</option>
              <option value={3000}>3.0 sec / tick</option>
              <option value={5000}>5.0 sec / tick</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleAutoLoop}
              className={`py-2 px-3 rounded border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                directives.autoLoopActive
                  ? 'bg-rose-900/80 hover:bg-rose-800 border-rose-500 text-rose-100'
                  : 'bg-emerald-800/80 hover:bg-emerald-700 border-emerald-500 text-emerald-100'
              }`}
            >
              {directives.autoLoopActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause Loop
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Start Auto Loop
                </>
              )}
            </button>

            <button
              onClick={onTriggerSingleStep}
              disabled={isThinking}
              className={`py-2 px-3 rounded border border-cyan-500/80 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isThinking ? 'opacity-50 cursor-wait' : ''
              }`}
            >
              <FastForward className="w-3.5 h-3.5" />
              Step Single AI Tick
            </button>
          </div>
        </div>
      </div>

      {/* AI Autonomous Thought Terminal */}
      <div className={`p-4 rounded-xl border-2 flex flex-col justify-between lg:col-span-2 ${
        isSolar
          ? 'bg-stone-950/95 border-amber-600/50'
          : 'bg-slate-950/95 border-cyan-600/50'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              Autonomous AI Thought Terminal
            </h3>
            {isThinking && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-600/60 text-amber-300 animate-pulse">
                <Zap className="w-3 h-3 text-amber-400" />
                Inferencing...
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">
            {aiLogs.length} Events Logged
          </span>
        </div>

        {/* Friendly AI Mascot Companion Status Card */}
        <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
          isSolar ? 'bg-amber-950/40 border-amber-600/40 text-amber-200' : 'bg-cyan-950/40 border-cyan-600/40 text-cyan-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg bg-black border border-amber-500/50 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
              <span className="text-lg select-none">🤖</span>
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-amber-300">AURA / CLiP-E Assistant</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                  {isThinking ? 'Thinking...' : 'Observing Facility'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 italic">
                {isThinking
                  ? 'Analyzing paperclip yields & market signals...'
                  : directives.autoLoopActive
                  ? 'Watching conveyor belts & executing architect directives smoothly!'
                  : 'Awaiting your signal to start the autonomous loop.'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrolling Log Buffer */}
        <div className="flex-1 bg-black/90 rounded-lg p-3 border border-slate-800 overflow-y-auto max-h-80 space-y-2 text-xs font-mono">
          {aiLogs.length === 0 ? (
            <div className="text-slate-600 italic text-center py-8">
              Awaiting initial autonomous loop activation... Click "Start Auto Loop" or "Step Single AI Tick".
            </div>
          ) : (
            aiLogs.slice().reverse().map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded border transition-all ${
                  log.type === 'thought'
                    ? 'bg-slate-900/80 border-slate-800 text-cyan-200'
                    : log.type === 'decision'
                    ? 'bg-purple-950/60 border-purple-700/60 text-purple-200 font-semibold'
                    : log.type === 'action'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                }`}
              >
                <div className="flex justify-between text-[10px] opacity-75 mb-1">
                  <span>[{log.timestamp}]</span>
                  <span className="uppercase text-amber-400">{log.engine}</span>
                </div>
                <div className="leading-relaxed">{log.text}</div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 p-2 rounded bg-black/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            This mode implements your agentic concept: the AI runs continuous inferencing loops to optimize paperclip growth while you tune macro parameters and directives.
          </span>
        </div>
      </div>
    </div>
  );
};
