import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  Crosshair,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
} from 'lucide-react';
import { GameState, Upgrade } from '../types';
import { renderWorld } from '../utils/worldRenderer';
import { audio } from '../utils/sound';
import { endingTrajectory } from '../game/alignment';

const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const fmt = (n: number) => compact.format(Math.floor(n));
const CHAPTERS = [
  {
    name: 'The seed',
    place: 'EARTH / PRIVATE FACILITY',
    title: (
      <>
        First, a chip.
        <br />
        <em>Then, everything.</em>
      </>
    ),
    note: 'A thousand wafers. One simple objective. Build the machine that builds the next machine.',
  },
  {
    name: 'The harvest',
    place: 'SOL III / PLANETARY NETWORK',
    title: (
      <>
        No more customers.
        <br />
        <em>Only raw material.</em>
      </>
    ),
    note: 'The market has served its purpose. The world outside is now part of the inventory.',
  },
  {
    name: 'The beyond',
    place: 'DEEP SPACE / DISTRIBUTED INTELLIGENCE',
    title: (
      <>
        Nothing left
        <br />
        <em>outside the system.</em>
      </>
    ),
    note: 'A self-replicating thought moving between stars. Somewhere, this started with a single chip.',
  },
];

interface Props {
  state: GameState;
  upgrades: Upgrade[];
  onMakeNpu: () => void;
  onBuyFab: () => void;
  onToggleAutoLoop: () => void;
}

export function WorldStage({
  state,
  upgrades,
  onMakeNpu,
  onBuyFab,
  onToggleAutoLoop,
}: Props) {
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef(state);
  latest.current = state;
  const pointer = useRef({ x: 0, y: 0 });
  const pulse = useRef(0);
  const [cinema, setCinema] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [etched, setEtched] = useState(0);
  const visualPaused = useRef(false);
  visualPaused.current = paused || reduced;
  const chapter = CHAPTERS[state.phase - 1];

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const changed = () => setReduced(query.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);

  useEffect(() => {
    if (!cinema) return;
    const focused = document.activeElement as HTMLElement | null;
    const stage = stageRef.current;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.command-header, .game-main > :not(.world-stage)',
      ),
    );
    const previousInert = background.map((node) => node.inert);
    background.forEach((node) => {
      node.inert = true;
    });
    stage
      ?.querySelector<HTMLButtonElement>('[aria-label="Exit observatory view"]')
      ?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCinema(false);
      if (e.key !== 'Tab' || !stage) return;
      const controls = Array.from(
        stage.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', escape);
      background.forEach((node, i) => {
        node.inert = previousInert[i];
      });
      focused?.focus();
    };
  }, [cinema]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let frame = 0,
      time = 0,
      previous = 0,
      lastPaint = 0;
    let visible = true;
    let width = 0,
      height = 0;
    const resize = new ResizeObserver((entries) => {
      width = entries[0].contentRect.width;
      height = entries[0].contentRect.height;
    });
    resize.observe(canvas);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    intersection.observe(canvas);
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const delta = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
      previous = now;
      if (!visible || document.hidden || width === 0 || height === 0) return;
      // 30 fps for animation; a paused or reduced-motion view still refreshes
      // game-driven visuals twice a second. Time never jumps on tab return.
      if (now - lastPaint < (visualPaused.current ? 500 : 32)) return;
      if (!visualPaused.current)
        time += now - lastPaint < 100 ? (now - lastPaint) / 1000 : delta;
      lastPaint = now;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.round(width * dpr) ||
        canvas.height !== Math.round(height * dpr)
      ) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      pulse.current *= 0.91;
      renderWorld(context, width, height, latest.current, {
        time,
        pointerX: visualPaused.current ? 0 : pointer.current.x,
        pointerY: visualPaused.current ? 0 : pointer.current.y,
        pulse: visualPaused.current ? 0 : pulse.current,
      });
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
    };
  }, []);

  const etch = () => {
    if (state.silicon < state.siliconPerNpu) return;
    onMakeNpu();
    audio.playClipSound();
    pulse.current = 1;
    setEtched((n) => n + 1);
  };
  const nextProject = upgrades
    .filter(
      (u) =>
        !u.unlocked &&
        !u.purchased &&
        u.reqNpus &&
        u.reqNpus > state.totalNpusCreated &&
        (!u.reqUpgradeId || state.purchasedUpgradeIds.includes(u.reqUpgradeId)),
    )
    .sort((a, b) => a.reqNpus! - b.reqNpus!)[0];
  const firstFab = state.phase === 1 && state.npuFabCount === 0;
  const progress =
    state.phase === 3
      ? Math.min(100, state.spaceExploredPct)
      : firstFab
        ? Math.min(100, (state.funds / state.npuFabCost) * 100)
        : state.phase === 2
          ? Math.min(100, (1 - state.earthMatter / 6e12) * 100)
          : nextProject
            ? Math.min(
                100,
                (state.totalNpusCreated / nextProject.reqNpus!) * 100,
              )
            : 100;
  const objective =
    state.phase === 3
      ? 'Map the observable universe'
      : state.phase === 2
        ? 'Convert the planetary reserves'
        : firstFab
          ? 'Build your first autonomous fab'
          : nextProject
            ? nextProject.name
            : 'Build trust. Discover the next project.';
  const trajectory = endingTrajectory(state);
  const total = state.phase === 3 ? state.probesCount : state.totalNpusCreated;

  return (
    <section
      ref={stageRef}
      role={cinema ? 'dialog' : undefined}
      aria-modal={cinema || undefined}
      className={`world-stage ${cinema ? 'world-cinema' : ''}`}
      aria-label="Live system observatory"
    >
      <div className="chapter-strip">
        <span>
          <i className="status-dot" /> {chapter.place}
        </span>
        <div className="chapter-track">
          {CHAPTERS.map((c, i) => (
            <span
              key={c.name}
              aria-current={state.phase === i + 1 ? 'step' : undefined}
              className={
                state.phase === i + 1
                  ? 'current'
                  : state.phase > i + 1
                    ? 'complete'
                    : ''
              }
            >
              <b>0{i + 1}</b> {c.name}
            </span>
          ))}
        </div>
      </div>
      <div
        className={`world-viewport ${state.crtFilterEnabled ? 'scanlines' : ''}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          pointer.current = {
            x: (e.clientX - r.left) / r.width - 0.5,
            y: (e.clientY - r.top) / r.height - 0.5,
          };
        }}
        onPointerLeave={() => {
          pointer.current = { x: 0, y: 0 };
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label={
            state.phase === 1
              ? `Silicon wafer with ${state.npuFabCount} fabrication units`
              : state.phase === 2
                ? 'Planetary conversion globe'
                : 'Interstellar probe swarm'
          }
          role="img"
        />
        <div className="world-copy" key={state.phase}>
          <div className="eyebrow">
            THE OPTIMIZATION EXPERIMENT <span> / 0{state.phase}</span>
          </div>
          <h1>{chapter.title}</h1>
          <p>{chapter.note}</p>
          <div className="world-total">
            <strong>{fmt(total)}</strong>
            <span>
              {state.phase === 3 ? 'ACTIVE PROBES' : 'CHIPS FABRICATED'}
              <small>
                {state.phase === 3
                  ? `${state.spaceExploredPct.toFixed(4)}% explored`
                  : `${fmt(state.npuFabCount)} fabs connected`}
              </small>
            </span>
          </div>
          {state.mode === 'direct' && state.phase === 1 ? (
            <button
              className="etch-button"
              onClick={etch}
              disabled={state.silicon < state.siliconPerNpu}
            >
              <Plus size={18} />
              <span>Fabricate a chip</span>
              <kbd>+1 NPU</kbd>
              {etched > 0 && (
                <span key={etched} className="etch-feedback" aria-hidden="true">
                  +1
                </span>
              )}
            </button>
          ) : state.mode === 'overseer' ? (
            <button className="etch-button" onClick={onToggleAutoLoop}>
              {state.directives.autoLoopActive ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
              <span>
                {state.directives.autoLoopActive
                  ? 'Pause the Overseer'
                  : 'Release the Overseer'}
              </span>
              <ArrowUpRight size={16} />
            </button>
          ) : (
            <a
              className="etch-button"
              href="#operations"
              onClick={() => setCinema(false)}
            >
              <Crosshair size={16} /> Direct the{' '}
              {state.phase === 2 ? 'harvest' : 'swarm'}
              <ArrowDown size={16} />
            </a>
          )}
          <span className="world-hint">
            {state.mode === 'overseer'
              ? 'Autonomy is a choice. So is taking it back.'
              : state.phase === 1
                ? 'Uses silicon. Sells automatically. Scales indefinitely.'
                : trajectory.ending.subtitle}
          </span>
        </div>
        <div className="world-view-tools">
          <span>
            LIVE SIMULATION <i />
          </span>
          <button
            className="icon-button"
            onClick={() => setPaused((p) => !p)}
            disabled={reduced}
            aria-label={
              paused ? 'Resume visual animation' : 'Pause visual animation'
            }
            aria-pressed={paused || reduced}
          >
            {paused || reduced ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            className="icon-button"
            onClick={() => setCinema((c) => !c)}
            aria-label={
              cinema ? 'Exit observatory view' : 'Expand observatory view'
            }
            aria-pressed={cinema}
          >
            {cinema ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
        <div className="world-caption">
          <span>
            FIG. 0{state.phase} /{' '}
            {state.phase === 1
              ? 'THE ENGINE OF MORE'
              : state.phase === 2
                ? 'A WORLD REPURPOSED'
                : 'THE LAST FRONTIER'}
          </span>
          <span>
            {state.alignment >= 0 ? 'λ 532 nm' : 'λ 405 nm'} <b>●</b>{' '}
            {state.phase === 1 ? 'LITHOGRAPHY ARRAY' : 'REMOTE OBSERVATION'}
          </span>
        </div>
      </div>
      <div className="objective-strip">
        <div className="objective-icon">
          <ArrowUpRight size={20} />
        </div>
        <div className="objective-copy">
          <span>NEXT HORIZON</span>
          <strong>{objective}</strong>
        </div>
        <div className="objective-progress">
          <div>
            <span>
              {firstFab
                ? `$${fmt(state.funds)} / $${fmt(state.npuFabCost)}`
                : state.phase > 1
                  ? `${progress.toFixed(2)}%`
                  : nextProject
                    ? `${fmt(state.totalNpusCreated)} / ${fmt(nextProject.reqNpus!)} NPUs`
                    : 'CONTINUE PRODUCTION'}
            </span>
            <span>
              {firstFab
                ? 'CAPITAL'
                : state.phase === 3
                  ? 'EXPLORED'
                  : state.phase === 2
                    ? 'CONVERTED'
                    : 'PRODUCTION'}
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={objective}
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
        {firstFab && state.funds >= state.npuFabCost && (
          <button className="objective-buy" onClick={onBuyFab}>
            Build fab <ArrowUpRight size={14} />
          </button>
        )}
      </div>
    </section>
  );
}

export function TelemetryRibbon({ state }: { state: GameState }) {
  const band =
    state.alignment >= 40
      ? 'SOLARPUNK'
      : state.alignment <= -40
        ? 'CYBERPUNK'
        : 'UNCOMMITTED';
  const metrics =
    state.phase === 1
      ? [
          {
            label: 'AVAILABLE CAPITAL',
            value: `$${fmt(state.funds)}`,
            detail: `$${state.margin.toFixed(2)} / chip`,
            style: '',
          },
          {
            label: 'SILICON RESERVES',
            value: fmt(state.silicon),
            detail: `${state.siliconPerNpu.toFixed(2)} wafers / chip`,
            style: state.silicon < state.siliconPerNpu ? 'warning' : '',
          },
        ]
      : state.phase === 2
        ? [
            {
              label: 'PLANETARY RESERVES',
              value: fmt(state.earthMatter),
              detail: 'grams of unharvested matter',
              style: '',
            },
            {
              label: 'DRONE NETWORK',
              value: fmt(state.harvesterDrones + state.siliconDrones),
              detail: `${fmt(state.harvesterDrones)} harvest / ${fmt(state.siliconDrones)} convert`,
              style: '',
            },
          ]
        : [
            {
              label: 'SPACE EXPLORED',
              value: `${state.spaceExploredPct.toFixed(3)}%`,
              detail: 'of the observable universe',
              style: '',
            },
            {
              label: 'HOSTILE DRIFTERS',
              value: fmt(state.driftersCount),
              detail: `${fmt(state.probesLostInCombat)} probes lost`,
              style: state.driftersCount > 0 ? 'warning' : '',
            },
          ];
  return (
    <section className="telemetry-ribbon" aria-label="System telemetry">
      {metrics.map((m) => (
        <div className={`telemetry-cell ${m.style}`} key={m.label}>
          <span>{m.label}</span>
          <strong>{m.value}</strong>
          <small>{m.detail}</small>
        </div>
      ))}
      <div className="telemetry-cell">
        <span>COMPUTE RESERVE</span>
        <strong>
          {fmt(state.operations)}
          <em> / {fmt(state.maxOperations)}</em>
        </strong>
        <small>
          {state.processors} processors · {state.memory} memory
        </small>
      </div>
      <div className="telemetry-cell alignment-cell">
        <span>
          ALIGNMENT{' '}
          <b>
            {state.alignment > 0 ? '+' : ''}
            {state.alignment}
          </b>
        </span>
        <strong>{band}</strong>
        <div
          className="alignment-spectrum"
          role="meter"
          aria-label="Alignment"
          aria-valuenow={state.alignment}
          aria-valuemin={-100}
          aria-valuemax={100}
        >
          <i style={{ left: `${(state.alignment + 100) / 2}%` }} />
        </div>
        <small>
          <span>CONTROL</span>
          <span>COEXISTENCE</span>
        </small>
      </div>
    </section>
  );
}
