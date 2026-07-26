import React, { useRef, useEffect } from 'react';
import { renderPixelArtCanvas } from '../utils/pixelArt';
import { QuantumPhoton } from '../types';

interface NpuCanvasProps {
  alignment: number;
  npus?: number;
  clips?: number;
  silicon?: number;
  wire?: number;
  npuFabCount?: number;
  clipperCount?: number;
  megaFabCount?: number;
  megaClipperCount?: number;
  quantumLevel: number;
  quantumPhotons: QuantumPhoton[];
  phase: number;
  probesCount: number;
  driftersCount?: number;
  honor?: number;
  hazardCombat?: number;
  probesLostInCombat?: number;
  driftersDefeated?: number;
  lastBattleOutcome?: string;
  crtFilterEnabled: boolean;
}

export const NpuCanvasComponent: React.FC<NpuCanvasProps> = ({
  alignment,
  npus,
  clips,
  silicon,
  wire,
  npuFabCount,
  clipperCount,
  megaFabCount,
  megaClipperCount,
  quantumLevel,
  quantumPhotons,
  phase,
  probesCount,
  driftersCount = 0,
  honor = 0,
  hazardCombat = 0,
  probesLostInCombat = 0,
  driftersDefeated = 0,
  lastBattleOutcome = 'PATROL',
  crtFilterEnabled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef<number>(0);

  const displayNpus = npus ?? clips ?? 0;
  const displaySilicon = silicon ?? wire ?? 0;
  const displayFabCount = npuFabCount ?? clipperCount ?? 0;
  const displayMegaFabCount = megaFabCount ?? megaClipperCount ?? 0;

  useEffect(() => {
    let animationFrameId: number;

    const handleRender = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match canvas internal resolution to container width
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 200;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      tickRef.current += 1;

      renderPixelArtCanvas(
        ctx,
        width,
        height,
        alignment,
        displayNpus,
        displaySilicon,
        displayFabCount,
        displayMegaFabCount,
        quantumLevel,
        quantumPhotons,
        phase,
        probesCount,
        tickRef.current,
        crtFilterEnabled,
        driftersCount,
        honor,
        hazardCombat,
        probesLostInCombat,
        driftersDefeated,
        lastBattleOutcome
      );

      animationFrameId = requestAnimationFrame(handleRender);
    };

    animationFrameId = requestAnimationFrame(handleRender);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    alignment,
    displayNpus,
    displaySilicon,
    displayFabCount,
    displayMegaFabCount,
    quantumLevel,
    quantumPhotons,
    phase,
    probesCount,
    driftersCount,
    honor,
    hazardCombat,
    probesLostInCombat,
    driftersDefeated,
    lastBattleOutcome,
    crtFilterEnabled,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden border-2 border-slate-800 bg-black relative shadow-inner"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded bg-black/80 text-[10px] font-mono border border-cyan-500/40 shadow-sm flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
          phase === 3 && driftersCount > 0 ? 'bg-rose-500' : 'bg-emerald-400'
        }`} />
        <span className={phase === 3 ? 'text-rose-300 font-bold' : 'text-cyan-300'}>
          {phase === 3
            ? `TACTICAL COMBAT VISUALIZER :: DRIFTER WARFARE (${driftersCount > 0 ? 'HOSTILE ENGAGEMENT' : 'SECTOR SECURED'})`
            : `SILICON FABRICATION FACILITY :: ${alignment >= 0 ? 'SOLARPUNK SANCTUARY' : 'CYBERPUNK COMPLEX'}`}
        </span>
      </div>
    </div>
  );
};
