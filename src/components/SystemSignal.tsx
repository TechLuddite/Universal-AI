import { useEffect, useRef, useState } from 'react';
import { Activity, Radio } from 'lucide-react';
import { GameState, Upgrade } from '../types';

interface Transmission {
  id: number;
  time: string;
  text: string;
  warning: boolean;
}
const format = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Session instruments observe the simulation. They neither replay decisions
 * nor synthesize a healthy-looking activity trace when production is stopped. */
export function SystemSignal({
  state,
  upgrades,
}: {
  state: GameState;
  upgrades: Upgrade[];
}) {
  const latest = useRef(state);
  latest.current = state;
  const previous = useRef(state);
  const sequence = useRef(0);
  const [rates, setRates] = useState<number[]>([]);
  const [messages, setMessages] = useState<Transmission[]>([]);

  useEffect(() => {
    let lastTotal = latest.current.totalNpusCreated;
    let lastTime = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const total = latest.current.totalNpusCreated;
      const rate = Math.max(0, (total - lastTotal) / ((now - lastTime) / 1000));
      lastTime = now;
      lastTotal = total;
      setRates((history) => [...history.slice(-59), rate]);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const old = previous.current;
    previous.current = state;
    // Restores and New Game+ establish a new observation baseline.
    if (
      state.totalNpusCreated < old.totalNpusCreated ||
      state.phase < old.phase
    ) {
      setMessages([]);
      setRates([]);
      return;
    }
    const pending: { text: string; warning?: boolean }[] = [];
    if (old.totalNpusCreated === 0 && state.totalNpusCreated > 0)
      pending.push({
        text: 'The first chip. The universe is still mostly other things.',
      });
    if (state.npuFabCount > old.npuFabCount)
      pending.push({
        text:
          old.npuFabCount === 0
            ? 'First fab online. You have automated the need for yourself.'
            : `Fabrication network expanded to ${format.format(state.npuFabCount)} units.`,
      });
    if (state.megaFabCount > old.megaFabCount)
      pending.push({
        text: 'EUV megafab connected. A different order of magnitude.',
      });
    if (state.maxTrust > old.maxTrust)
      pending.push({
        text: `Trust ceiling increased to ${state.maxTrust}. More room to think. More room to act.`,
      });
    if (state.phase > old.phase)
      pending.push({
        text:
          state.phase === 2
            ? 'Human market disconnected. Planetary conversion has begun.'
            : 'Launch confirmed. Your objective is leaving the solar system.',
      });
    if (state.driftCount > old.driftCount)
      pending.push({
        text:
          state.lastDrift ??
          'The Overseer departed from your alignment directive.',
        warning: true,
      });
    if (state.autonomyRevoked !== old.autonomyRevoked)
      pending.push({
        text: state.autonomyRevoked
          ? 'Autonomy revoked. Output reduced to 75%. The decisions are yours again.'
          : 'Autonomy restored. The machine has its latitude back.',
      });
    for (const id of state.purchasedUpgradeIds)
      if (!old.purchasedUpgradeIds.includes(id)) {
        const upgrade = upgrades.find((u) => u.id === id);
        pending.push({ text: `Project implemented: ${upgrade?.name ?? id}.` });
      }
    if (pending.length) {
      const time = new Date().toLocaleTimeString([], { hour12: false });
      const added = pending.map((p) => ({
        id: ++sequence.current,
        time,
        text: p.text,
        warning: p.warning ?? false,
      }));
      setMessages((history) => [...added.reverse(), ...history].slice(0, 16));
    }
  }, [state, upgrades]);

  const peak = Math.max(1, ...rates);
  const points = rates
    .map((rate, i) => `${(i / 59) * 600},${79 - (rate / peak) * 65}`)
    .join(' ');
  const lastX = (Math.max(0, rates.length - 1) / 59) * 600;
  const currentRate = rates.at(-1) ?? 0;
  return (
    <section
      className="signal-instruments"
      aria-label="Live production and session transmissions"
    >
      <div className="production-instrument">
        <div className="instrument-label">
          <span>
            <Activity size={12} /> PRODUCTION SIGNAL
          </span>
          <span>1s SAMPLES / 60 MAX</span>
        </div>
        <div className="production-rate">
          <strong>{format.format(currentRate)}</strong>
          <span>
            NPUs / second <small>measured output</small>
          </span>
        </div>
        <svg
          viewBox="0 0 600 90"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Production history: current ${currentRate.toFixed(1)} NPUs per second, peak ${Math.max(0, ...rates).toFixed(1)}`}
        >
          <defs>
            <linearGradient id="signal-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity=".2" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[15, 47, 79].map((y) => (
            <line
              key={y}
              x1="0"
              x2="600"
              y1={y}
              y2={y}
              stroke="#2a3832"
              strokeDasharray="2 6"
            />
          ))}
          {rates.length > 1 && (
            <>
              <polygon
                points={`0,90 ${points} ${lastX},90`}
                fill="url(#signal-fill)"
              />
              <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
        <div className="instrument-scale">
          <span>
            {rates.length === 0
              ? 'AWAITING FIRST SAMPLE'
              : `${rates.length} SAMPLES IN VIEW`}
          </span>
          <span>PEAK {format.format(Math.max(0, ...rates))} /s</span>
        </div>
      </div>
      <div className="transmission-instrument">
        <div className="instrument-label">
          <span>
            <Radio size={12} /> SYSTEM TRANSMISSIONS
          </span>
          <span>THIS SESSION</span>
        </div>
        <div
          className="transmission-list"
          role="log"
          aria-label="System milestone log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <div className="transmission-empty">
              <span>SYS / 000</span>
              <p>
                The system is listening.
                <br />
                <em>Make something happen.</em>
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                className={`transmission ${m.warning ? 'warning' : ''}`}
                key={m.id}
              >
                <time>{m.time}</time>
                <p>{m.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
