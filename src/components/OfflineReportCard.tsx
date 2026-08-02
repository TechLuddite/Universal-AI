import React from 'react';
import { MoonStar, Clock, Cpu, Gauge } from 'lucide-react';

/** What offline catch-up produced, straight from `load()` in game/save.ts. */
export interface OfflineReport {
  npus: number;
  ms: number;
  /** True when the absence hit the 8-hour catch-up cap. */
  capped: boolean;
}

interface OfflineReportCardProps {
  report: OfflineReport;
  onDismiss: () => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/**
 * The "while you were away" summary. The catch-up itself happens in
 * game/save.ts by replaying the real tick — this card only reports what that
 * replay produced, it computes nothing.
 */
export const OfflineReportCard: React.FC<OfflineReportCardProps> = ({ report, onDismiss }) => {
  const seconds = Math.max(1, report.ms / 1000);
  const perSecond = report.npus / seconds;

  return (
    <div className="p-4 rounded-xl border-2 border-emerald-600/60 bg-emerald-950/40 font-mono text-emerald-200 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <MoonStar className="w-4 h-4 text-emerald-400" />
          While you were away
        </h3>
        <button
          onClick={onDismiss}
          className="px-2 py-1 rounded border border-emerald-600/60 hover:bg-emerald-900/60 uppercase tracking-wider text-[11px] shrink-0"
        >
          Dismiss
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-black/50 border border-emerald-800/60">
          <div className="text-[10px] uppercase text-emerald-400/80 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Time away
          </div>
          <div className="text-emerald-100 font-bold text-sm mt-0.5">
            {formatDuration(report.ms)}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-black/50 border border-emerald-800/60">
          <div className="text-[10px] uppercase text-emerald-400/80 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> NPUs synthesized
          </div>
          <div className="text-emerald-100 font-bold text-sm mt-0.5">
            {Math.floor(report.npus).toLocaleString()}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-black/50 border border-emerald-800/60">
          <div className="text-[10px] uppercase text-emerald-400/80 flex items-center gap-1">
            <Gauge className="w-3 h-3" /> Average rate
          </div>
          <div className="text-emerald-100 font-bold text-sm mt-0.5">
            {perSecond >= 10 ? Math.round(perSecond).toLocaleString() : perSecond.toFixed(1)} /s
          </div>
        </div>
      </div>

      {report.capped && (
        <p className="text-[11px] text-emerald-300/80 leading-snug">
          Offline progress caps at 8 hours — the facility idles after that, however long you were
          gone.
        </p>
      )}
    </div>
  );
};
