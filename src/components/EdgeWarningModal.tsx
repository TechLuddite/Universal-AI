import React, { useState } from 'react';
import { Zap, ShieldAlert, Cpu, Check, X, BatteryCharging } from 'lucide-react';

interface EdgeWarningModalProps {
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export const EdgeWarningModal: React.FC<EdgeWarningModalProps> = ({ onConfirm, onCancel }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border-2 border-amber-500/80 rounded-xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl font-mono text-amber-50">
        <div className="flex items-start justify-between border-b border-amber-500/30 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base uppercase tracking-wider">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
            <span>Google AI Edge: Compute & Battery Load Notice</span>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-lg text-amber-200 flex items-start gap-2">
            <BatteryCharging className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Running <strong>Google AI Edge (In-Browser)</strong> executes neural & heuristic decision loops directly on your local device CPU/GPU.
            </span>
          </p>

          <div className="space-y-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>What to expect:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li>High CPU/GPU utilization during automated decision loops.</li>
              <li>Increased battery consumption on laptops or mobile devices.</li>
              <li>Potential device warmth or fan activity during rapid execution ticks.</li>
            </ul>
          </div>

          <p className="text-xs text-cyan-300 bg-cyan-950/40 p-2.5 rounded border border-cyan-500/30 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Pro-Tip:</strong> You can switch to <strong>Cloud Gemini 3.6 Flash</strong> or <strong>Fast Rule Engine</strong> in the top header menu anytime for zero local battery impact!
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500 bg-black cursor-pointer"
            />
            <span>Do not show this warning again</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            className="py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase transition-all"
          >
            Cancel / Change Engine
          </button>
          <button
            onClick={() => onConfirm(dontShowAgain)}
            className="py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>Proceed & Start Loop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
