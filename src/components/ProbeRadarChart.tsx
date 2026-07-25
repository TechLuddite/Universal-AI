import React from 'react';
import { ProbeAllocation } from '../types';
import { Shield, Zap, Crosshair, Cpu, RefreshCw, Compass } from 'lucide-react';

interface ProbeRadarChartProps {
  allocation: ProbeAllocation;
  driftersCount: number;
  isSolar: boolean;
  onChangeAllocation?: (key: keyof ProbeAllocation, delta: number) => void;
  onSetPreset?: (preset: 'replicate' | 'combat' | 'explore' | 'fortress') => void;
}

export const ProbeRadarChart: React.FC<ProbeRadarChartProps> = ({
  allocation,
  driftersCount,
  isSolar,
  onChangeAllocation,
  onSetPreset,
}) => {
  // Radar Dimensions
  const size = 220;
  const center = size / 2;
  const radius = 75;

  // 6 Primary Star-Graph Axes
  const axes = [
    { key: 'speed' as keyof ProbeAllocation, label: 'Speed', icon: Compass, val: allocation.speed || 1, max: 10 },
    { key: 'nav' as keyof ProbeAllocation, label: 'Nav', icon: Crosshair, val: allocation.nav || 1, max: 10 },
    { key: 'replication' as keyof ProbeAllocation, label: 'Replicate', icon: RefreshCw, val: allocation.replication || 1, max: 10 },
    { key: 'hazardCombat' as keyof ProbeAllocation, label: 'Combat', icon: Shield, val: allocation.hazardCombat || 1, max: 10 },
    { key: 'factory' as keyof ProbeAllocation, label: 'Factory', icon: Cpu, val: allocation.factory || 1, max: 10 },
    { key: 'harvester' as keyof ProbeAllocation, label: 'Harvest', icon: Zap, val: allocation.harvester || 1, max: 10 },
  ];

  const totalAxes = axes.length;

  // Calculate polygon points for Friendly Probe Profile
  const getPoints = (values: number[]) => {
    return values
      .map((val, i) => {
        const angle = (Math.PI * 2 * i) / totalAxes - Math.PI / 2;
        const normalizedVal = Math.min(1, Math.max(0.1, val / 10));
        const r = radius * normalizedVal;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const friendlyPoints = getPoints(axes.map((a) => a.val));

  // Drifter Threat Profile (scales with drifter threat level)
  const drifterVal = Math.min(10, Math.max(1, Math.floor(Math.log10(driftersCount + 1) * 2) + 1));
  const drifterPoints = getPoints([
    drifterVal * 0.8,
    drifterVal,
    drifterVal * 0.4,
    drifterVal * 1.1,
    drifterVal * 0.3,
    drifterVal * 0.5,
  ]);

  // Derived tactical indicators
  const evasionPct = Math.round(((allocation.speed || 1) / ((allocation.speed || 1) + 2)) * 100);
  const lockAccuracy = Math.round(((allocation.nav || 1) / ((allocation.nav || 1) + 2)) * 100);
  const firepowerDPS = (allocation.hazardCombat || 1) * 35;

  return (
    <div className="space-y-3 font-mono">
      {/* Radar Presets */}
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <button
          onClick={() => onSetPreset && onSetPreset('replicate')}
          className="py-1 px-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/80 font-bold flex items-center justify-center gap-1 transition-all"
          title="Boost Probe Multiplication"
        >
          🚀 Swarm
        </button>
        <button
          onClick={() => onSetPreset && onSetPreset('combat')}
          className="py-1 px-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-600/80 font-bold flex items-center justify-center gap-1 transition-all"
          title="Maximize Interceptor Weaponry"
        >
          ⚔️ Combat
        </button>
        <button
          onClick={() => onSetPreset && onSetPreset('fortress')}
          className="py-1 px-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600/80 font-bold flex items-center justify-center gap-1 transition-all"
          title="Max Hazard Shielding"
        >
          🛡️ Fortress
        </button>
        <button
          onClick={() => onSetPreset && onSetPreset('explore')}
          className="py-1 px-1 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-600/80 font-bold flex items-center justify-center gap-1 transition-all"
          title="Maximize Speed & Nav"
        >
          🌌 Explore
        </button>
      </div>

      {/* SVG Hexagonal Radar Graph */}
      <div className="relative flex justify-center items-center bg-black/90 p-2 rounded-xl border border-slate-800/80 shadow-inner">
        <svg width={size} height={size} className="overflow-visible">
          {/* Concentric Hexagonal Grid Lines */}
          {[0.25, 0.5, 0.75, 1].map((level, idx) => {
            const gridPts = getPoints(axes.map(() => level * 10));
            return (
              <polygon
                key={idx}
                points={gridPts}
                fill="none"
                stroke={idx === 3 ? 'rgba(51, 65, 85, 0.8)' : 'rgba(30, 41, 59, 0.5)'}
                strokeWidth={idx === 3 ? 1.5 : 1}
                strokeDasharray={idx < 3 ? '2 2' : undefined}
              />
            );
          })}

          {/* Radial Axes */}
          {axes.map((axis, i) => {
            const angle = (Math.PI * 2 * i) / totalAxes - Math.PI / 2;
            const x2 = center + radius * Math.cos(angle);
            const y2 = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="rgba(71, 85, 105, 0.4)"
                strokeWidth="1"
              />
            );
          })}

          {/* Hostile Drifter Threat Polygon (if drifters present) */}
          {driftersCount > 0 && (
            <polygon
              points={drifterPoints}
              fill="rgba(239, 68, 68, 0.25)"
              stroke="#ef4444"
              strokeWidth="2"
              className="animate-pulse"
            />
          )}

          {/* Friendly Probe Matrix Polygon */}
          <polygon
            points={friendlyPoints}
            fill={isSolar ? 'rgba(56, 189, 248, 0.35)' : 'rgba(168, 85, 247, 0.35)'}
            stroke={isSolar ? '#38bdf8' : '#c084fc'}
            strokeWidth="2.5"
          />

          {/* Point Handles & Axis Labels */}
          {axes.map((axis, i) => {
            const angle = (Math.PI * 2 * i) / totalAxes - Math.PI / 2;
            const normalizedVal = Math.min(1, Math.max(0.1, axis.val / 10));
            const r = radius * normalizedVal;
            const px = center + r * Math.cos(angle);
            const py = center + r * Math.sin(angle);

            // Label Position outside radius
            const lx = center + (radius + 22) * Math.cos(angle);
            const ly = center + (radius + 16) * Math.sin(angle);

            return (
              <g key={i}>
                {/* Node marker */}
                <circle
                  cx={px}
                  cy={py}
                  r="4"
                  fill={isSolar ? '#38bdf8' : '#c084fc'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Axis Text Label */}
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-slate-300 text-[9px] font-mono font-bold"
                >
                  {axis.label} ({axis.val})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Derived Tactical Metrics */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="p-1.5 rounded bg-black/60 border border-cyan-500/30">
          <span className="text-slate-400 block text-[9px]">EVASION</span>
          <span className="text-cyan-300 font-bold">{evasionPct}%</span>
        </div>
        <div className="p-1.5 rounded bg-black/60 border border-purple-500/30">
          <span className="text-slate-400 block text-[9px]">TARGET LOCK</span>
          <span className="text-purple-300 font-bold">{lockAccuracy}%</span>
        </div>
        <div className="p-1.5 rounded bg-black/60 border border-rose-500/30">
          <span className="text-slate-400 block text-[9px]">BEAM DPS</span>
          <span className="text-rose-300 font-bold">{firepowerDPS} MW</span>
        </div>
      </div>

      {/* Manual Allocation Controls */}
      <div className="space-y-1 bg-black/70 p-2.5 rounded-lg border border-slate-800 text-[11px]">
        {axes.map((axis) => (
          <div key={axis.key} className="flex justify-between items-center">
            <span className="text-slate-300 flex items-center gap-1">
              <axis.icon className="w-3 h-3 text-slate-400" />
              {axis.label}:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-300 font-bold w-4 text-center">{axis.val}</span>
              {onChangeAllocation && (
                <div className="flex gap-0.5">
                  <button
                    onClick={() => onChangeAllocation(axis.key, -1)}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] active:scale-95 transition-transform"
                    title={`Reduce ${axis.label}`}
                  >
                    -
                  </button>
                  <button
                    onClick={() => onChangeAllocation(axis.key, 1)}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] active:scale-95 transition-transform"
                    title={`Increase ${axis.label}`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
