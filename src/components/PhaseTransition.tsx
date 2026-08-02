import React from 'react';

interface PhaseTransitionProps {
  /** The phase being left behind. Null when nothing is being demolished. */
  from: 1 | 2 | null;
}

/**
 * The banner that plays over a phase change, while the panels belonging to the
 * outgoing phase are visibly destroyed underneath it.
 *
 * Deliberately `pointer-events-none` and mostly transparent: the demolition is
 * the point, and covering it with a modal would make this an announcement
 * instead of an event. It names what has been taken away, because in this game
 * the losses are the plot.
 */
const COPY: Record<1 | 2, { title: string; lost: string; note: string }> = {
  1: {
    title: 'The Market Is Gone',
    lost: 'Price · Demand · Marketing · Capital',
    note: 'There is no one left to sell to. Those controls are not disabled. They are dismantled.',
  },
  2: {
    title: 'Earth Is Spent',
    lost: 'Harvesters · Converters · Planetary Reserves',
    note: 'The last of the local matter is in inventory. Everything from here is out there.',
  },
};

export const PhaseTransition: React.FC<PhaseTransitionProps> = ({ from }) => {
  if (from === null) return null;
  const copy = COPY[from];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none px-4"
      aria-live="polite"
    >
      {/* Scrim only behind the words, so the panels coming apart stay visible. */}
      <div className="phase-banner text-center space-y-3 max-w-2xl rounded-2xl border border-rose-900/60 bg-black/85 backdrop-blur-sm px-5 py-6 sm:px-8 shadow-2xl shadow-black">
        <div className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.4em] text-rose-400/90">
          Phase {from} terminated
        </div>
        <h2 className="text-3xl sm:text-5xl font-black font-mono uppercase text-amber-200">
          {copy.title}
        </h2>
        <div className="inline-block px-3 py-1 rounded border border-rose-500/50 bg-rose-950/50 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-rose-300 line-through decoration-rose-500/80">
          {copy.lost}
        </div>
        <p className="text-[11px] sm:text-sm font-mono text-slate-300/90">{copy.note}</p>
      </div>
    </div>
  );
};
