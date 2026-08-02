import React from 'react';
import { Zap, ShieldAlert, Cpu, Check, X, Download } from 'lucide-react';

interface EdgeWarningModalProps {
  /** Approximate download size in megabytes. */
  approxMb: number;
  modelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shown before downloading the WebLLM model.
 *
 * This modal used to warn about "neural & heuristic decision loops" for what
 * was ~50 numeric comparisons every two seconds — pure theater. Now there is
 * genuinely a billion-parameter model about to be downloaded and run on the
 * player's GPU, so a confirmation before spending their bandwidth is warranted.
 */
export const EdgeWarningModal: React.FC<EdgeWarningModalProps> = ({
  approxMb,
  modelLabel,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-slate-950 border-2 border-purple-500/80 rounded-xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl font-mono text-purple-50">
      <div className="flex items-start justify-between border-b border-purple-500/30 pb-3">
        <div className="flex items-center gap-2 text-purple-300 font-bold text-sm sm:text-base uppercase tracking-wider">
          <Zap className="w-5 h-5 text-purple-400 shrink-0" />
          <span>Download {modelLabel}?</span>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          aria-label="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <p className="bg-purple-950/40 border border-purple-500/40 p-3 rounded-lg text-purple-200 flex items-start gap-2">
          <Download className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <span>
            This downloads roughly <strong>{approxMb} MB</strong> of model weights, once. They are
            cached afterwards, so the Overseer works offline from then on.
          </span>
        </p>

        <div className="space-y-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>What to expect:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
            <li>A large one-time download — avoid this on a metered connection.</li>
            <li>Roughly 1 GB of GPU memory held while the model is resident.</li>
            <li>Real GPU load during inference; laptops will get warm and drain faster.</li>
            <li>Requires WebGPU — Chrome or Edge 113+.</li>
          </ul>
        </div>

        <p className="text-xs text-cyan-300 bg-cyan-950/40 p-2.5 rounded border border-cyan-500/30 flex items-start gap-2">
          <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            The weights come from HuggingFace and nothing else is sent anywhere — your game state
            is fed to a model on your own machine. The default <strong>Utility Engine</strong>{' '}
            needs no download and no network at all, and plays perfectly well.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onCancel}
          className="py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase transition-all"
        >
          Not now
        </button>
        <button
          onClick={onConfirm}
          className="py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all shadow-md"
        >
          <Check className="w-4 h-4" />
          <span>Download</span>
        </button>
      </div>
    </div>
  </div>
);
