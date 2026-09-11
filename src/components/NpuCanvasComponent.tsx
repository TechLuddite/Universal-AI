import React, { useRef, useEffect } from 'react';
import { renderPixelArtCanvas } from '../utils/pixelArt';
import { QuantumPhoton } from '../types';

interface NpuCanvasProps {
  alignment: number;
  npus: number;
  silicon: number;
  npuFabCount: number;
  megaFabCount: number;
  quantumLevel: number;
  quantumPhotons: QuantumPhoton[];
  phase: number;
  probesCount: number;
  driftersCount: number;
  honor: number;
  hazardCombat: number;
  probesLostInCombat: number;
  driftersDefeated: number;
  lastBattleOutcome: string;
  crtFilterEnabled: boolean;
}

export const NpuCanvasComponent: React.FC<NpuCanvasProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef<number>(0);

  // The rAF loop reads the latest props through this ref instead of listing
  // them as effect dependencies. Most of these values change every 100ms game
  // tick, so depending on them tore the loop down and rebuilt it ~10×/second.
  const propsRef = useRef(props);
  propsRef.current = props;

  const { phase, driftersCount, alignment } = props;

  useEffect(() => {
    let animationFrameId: number;

    const handleRender = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Render at the device's real resolution, draw in CSS-pixel coordinates.
      // Without the devicePixelRatio scale the canvas is blurry on any hiDPI
      // display, which is most of them.
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 200;
      const deviceWidth = Math.round(width * dpr);
      const deviceHeight = Math.round(height * dpr);

      if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
        canvas.width = deviceWidth;
        canvas.height = deviceHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      tickRef.current += 1;

      const p = propsRef.current;
      renderPixelArtCanvas(
        ctx,
        width,
        height,
        p.alignment,
        p.npus,
        p.silicon,
        p.npuFabCount,
        p.megaFabCount,
        p.quantumLevel,
        p.quantumPhotons,
        p.phase,
        p.probesCount,
        tickRef.current,
        p.crtFilterEnabled,
        p.driftersCount,
        p.honor,
        p.hazardCombat,
        p.probesLostInCombat,
        p.driftersDefeated,
        p.lastBattleOutcome
      );

      animationFrameId = requestAnimationFrame(handleRender);
    };

    animationFrameId = requestAnimationFrame(handleRender);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
