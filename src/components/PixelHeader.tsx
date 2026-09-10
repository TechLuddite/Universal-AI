import { GameMode, AIEngine, GameState } from '../types';
import {
  AudioLines,
  VolumeX,
  ScanLine,
  ArrowUpRight,
  Cpu,
  Orbit,
} from 'lucide-react';

interface PixelHeaderProps {
  state: GameState;
  mode: GameMode;
  aiEngine: AIEngine;
  alignment: number;
  soundEnabled: boolean;
  crtFilterEnabled: boolean;
  onToggleMode: (mode: GameMode) => void;
  onChangeEngine: (engine: AIEngine) => void;
  onToggleSound: () => void;
  onToggleCRT: () => void;
  onOpenAndroidGuide: () => void;
  phase: number;
  frameWidth: string;
}

export function PixelHeader(p: PixelHeaderProps) {
  return (
    <header className="command-header">
      <div
        className="command-header-inner frame"
        style={{ maxWidth: p.frameWidth }}
      >
        <a className="wordmark" href="../" aria-label="Choose a Universal AI version">
          <span className="brand-symbol">
            <Orbit size={24} />
          </span>
          <span>
            UNIVERSAL<span className="wordmark-ai">AI</span>
            <small>AN EXPERIMENT IN ENOUGH.</small>
          </span>
        </a>
        <nav className="mode-switch" aria-label="Control mode">
          <button
            aria-pressed={p.mode === 'direct'}
            onClick={() => p.onToggleMode('direct')}
          >
            <Cpu size={14} /> Human control
          </button>
          <button
            aria-pressed={p.mode === 'overseer'}
            onClick={() => p.onToggleMode('overseer')}
          >
            <Orbit size={14} /> Overseer
          </button>
        </nav>
        <div className="header-tools">
          <a className="prototype-link" href={import.meta.env.DEV ? 'http://localhost:4180/' : '../seed/'}>
            The Seed <span>3D</span><ArrowUpRight size={13} />
          </a>
          <span className="local-indicator">
            <i /> LOCAL SYSTEM
          </span>
          <button
            className="icon-button"
            onClick={p.onToggleSound}
            aria-label={p.soundEnabled ? 'Mute sound' : 'Enable sound'}
            aria-pressed={p.soundEnabled}
          >
            {p.soundEnabled ? <AudioLines size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            className="icon-button"
            onClick={p.onToggleCRT}
            aria-label="Toggle scanlines"
            aria-pressed={p.crtFilterEnabled}
          >
            <ScanLine size={17} />
          </button>
          <button className="about-button" onClick={p.onOpenAndroidGuide}>
            About <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      {p.mode === 'overseer' && (
        <div className="engine-strip">
          <span>DECISION ENGINE</span>
          <select
            aria-label="Overseer engine"
            value={p.aiEngine}
            onChange={(e) => p.onChangeEngine(e.target.value as AIEngine)}
          >
            <option value="utility">Utility / deterministic · instant</option>
            <option value="webllm">
              WebLLM / Llama 3.2 1B · opt-in download
            </option>
          </select>
          <span>
            {p.state.autonomyRevoked
              ? 'AUTONOMY REVOKED'
              : 'YOUR OBJECTIVE. ITS DECISIONS.'}
          </span>
        </div>
      )}
    </header>
  );
}
