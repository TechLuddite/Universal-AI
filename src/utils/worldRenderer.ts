import { GameState } from '../types';

export interface WorldView {
  time: number;
  pointerX: number;
  pointerY: number;
  pulse: number;
}
const TAU = Math.PI * 2;
const noise = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** A bounded, procedural observatory. Visual population is logarithmic: a
 * quadrillion probes must never mean a quadrillion draw calls. No game writes. */
export function renderWorld(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: GameState,
  view: WorldView,
) {
  const { time: t, pointerX: px, pointerY: py, pulse } = view;
  const wide = w > 700 && h > 350;
  const solar = state.alignment >= 0;
  const accent = solar ? '#d4f88a' : '#b9a0ff';
  const rgb = solar ? '198,239,133' : '174,144,255';
  const cx = w * (wide ? 0.68 : 0.5) + px * 12;
  const cy = h * 0.49 + py * 8;
  const radius = Math.min(w * (wide ? 0.205 : 0.36), h * 0.41);
  ctx.clearRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius * 2.2);
  glow.addColorStop(0, `rgba(${rgb},0.09)`);
  glow.addColorStop(0.65, `rgba(${rgb},0.025)`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 110; i++) {
    const x = noise(i + 1) * w;
    const y = noise(i + 450) * h;
    ctx.fillStyle = `rgba(202,223,214,${0.08 + noise(i + 50) * 0.27})`;
    ctx.fillRect(x + px * noise(i) * 3, y, i % 17 === 0 ? 2 : 1, 1);
  }
  ctx.save();
  ctx.translate(cx, cy);
  const line = (color: string, width = 1) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
  };
  const ellipse = (r: number, ratio: number, rotation = 0) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * ratio, rotation, 0, TAU);
    ctx.stroke();
  };
  // Quiet measurement marks connect the render to its instrument frame.
  line('rgba(159,187,177,0.11)');
  ctx.setLineDash([2, 6]);
  ellipse(radius * 1.38, 0.82);
  ctx.setLineDash([]);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU;
    const r = radius * 1.38;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.82);
    ctx.lineTo(
      Math.cos(a) * (r + (i % 8 === 0 ? 8 : 3)),
      Math.sin(a) * (r + (i % 8 === 0 ? 8 : 3)) * 0.82,
    );
    ctx.stroke();
  }
  if (state.phase === 1) {
    // A silicon wafer, rendered as stacked elliptical planes, with a die grid
    // clipped to its face. Its etch sweep advances when the player fabricates.
    ctx.rotate(-0.18 + px * 0.025);
    for (let layer = 18; layer >= 0; layer -= 3) {
      ctx.save();
      ctx.translate(0, layer);
      ctx.fillStyle = layer === 0 ? '#111e22' : '#0b1418';
      line(layer === 0 ? `rgba(${rgb},0.6)` : 'rgba(112,153,141,0.17)');
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.61, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.scale(1, 0.61);
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, TAU);
    ctx.clip();
    ctx.rotate(t * 0.022);
    const cell = radius / 6;
    for (let row = -7; row <= 7; row++)
      for (let col = -7; col <= 7; col++) {
        const x = col * cell;
        const y = row * cell;
        const active =
          noise((row + 8) * 17 + col) <
          Math.min(0.85, 0.17 + Math.log10(state.totalNpusCreated + 1) * 0.14);
        ctx.fillStyle = active
          ? `rgba(${rgb},${0.09 + 0.1 * Math.sin(t * 0.6 + row) ** 2})`
          : '#101c20';
        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        line(`rgba(${rgb},${active ? 0.36 : 0.1})`, 0.8);
        ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
        if (active) {
          ctx.fillStyle = `rgba(${rgb},0.45)`;
          ctx.fillRect(x + 5, y + 5, 3, 3);
        }
      }
    const scan = Math.sin(t * 0.5) * radius;
    const beam = ctx.createLinearGradient(scan - 22, 0, scan + 3, 0);
    beam.addColorStop(0, 'transparent');
    beam.addColorStop(1, `rgba(${rgb},${0.25 + pulse * 0.6})`);
    ctx.fillStyle = beam;
    ctx.fillRect(scan - 22, -radius, 25, radius * 2);
    ctx.restore();
    // The processor floats above its substrate, with physical traces and pins.
    ctx.save();
    ctx.translate(0, -24 - Math.sin(t * 0.7) * 4);
    ctx.scale(1, 0.61);
    ctx.rotate(Math.PI / 4);
    const chip = radius * 0.32;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 16 + pulse * 45;
    ctx.fillStyle = '#162822';
    line(accent, 1.5);
    ctx.fillRect(-chip, -chip, chip * 2, chip * 2);
    ctx.strokeRect(-chip, -chip, chip * 2, chip * 2);
    ctx.shadowBlur = 0;
    line(`rgba(${rgb},0.5)`);
    ctx.strokeRect(-chip + 7, -chip + 7, chip * 2 - 14, chip * 2 - 14);
    for (let i = -4; i <= 4; i++)
      for (const side of [-1, 1]) {
        const q = (i * chip) / 5;
        ctx.beginPath();
        ctx.moveTo(q, side * (chip + 2));
        ctx.lineTo(q, side * (chip + 11));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(side * (chip + 2), q);
        ctx.lineTo(side * (chip + 11), q);
        ctx.stroke();
      }
    ctx.fillStyle = accent;
    ctx.font = `600 ${radius * 0.13}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('NPU', 0, 5);
    ctx.restore();
    const nodes = Math.min(16, state.npuFabCount + state.megaFabCount);
    for (let i = 0; i < nodes; i++) {
      const a = (i / Math.max(8, nodes)) * TAU + t * 0.06;
      const x = Math.cos(a) * radius * 1.2,
        y = Math.sin(a) * radius * 0.78;
      line(`rgba(${rgb},0.18)`);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x * 0.77, y * 0.77);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  } else if (state.phase === 2) {
    // A spherical point cloud. The conversion boundary consumes its surface.
    const converted = Math.max(0, Math.min(1, 1 - state.earthMatter / 6e12));
    const atmosphere = ctx.createRadialGradient(
      -radius * 0.3,
      -radius * 0.25,
      0,
      0,
      0,
      radius,
    );
    atmosphere.addColorStop(0, `rgba(${rgb},0.11)`);
    atmosphere.addColorStop(0.8, `rgba(${rgb},0.02)`);
    atmosphere.addColorStop(1, `rgba(${rgb},0.18)`);
    ctx.fillStyle = atmosphere;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    line(`rgba(${rgb},0.15)`);
    ellipse(radius, 1);
    for (let i = 0; i < 1500; i++) {
      const lat = Math.acos(1 - (2 * (i + 0.5)) / 1500);
      const lon = Math.PI * (1 + Math.sqrt(5)) * i + t * 0.085;
      const x = Math.sin(lat) * Math.cos(lon),
        z = Math.sin(lat) * Math.sin(lon),
        y = Math.cos(lat);
      if (z < -0.2) continue;
      const eaten = noise(i + 2200) < converted;
      ctx.fillStyle = eaten
        ? `rgba(250,151,110,${0.25 + z * 0.6})`
        : `rgba(${rgb},${0.2 + z * 0.65})`;
      ctx.fillRect(
        x * radius,
        y * radius,
        z > 0.6 ? 2 : 1.2,
        z > 0.6 ? 2 : 1.2,
      );
    }
    line(`rgba(${rgb},0.2)`);
    ellipse(radius * 1.24, 0.3, -0.4);
    ellipse(radius * 1.16, 0.4, 0.7);
    const drones = Math.min(
      40,
      4 + Math.ceil(Math.log2(state.harvesterDrones + 1) * 3),
    );
    for (let i = 0; i < drones; i++) {
      const a = t * 0.23 + (i * TAU) / drones;
      const x = Math.cos(a) * radius * 1.24,
        y = Math.sin(a) * radius * 0.37;
      ctx.fillStyle = accent;
      ctx.fillRect(x - 2, y - 2, 4, 4);
      if (i % 3 === 0) {
        line(`rgba(${rgb},0.12)`);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x * 0.6, y * 0.6);
        ctx.stroke();
      }
    }
  } else {
    // Accretion-like trajectories stand for the swarm, never a literal census.
    const count = Math.min(
      1200,
      250 + Math.floor(Math.log10(state.probesCount + 1) * 65),
    );
    ctx.rotate(-0.3);
    ctx.save();
    ctx.scale(1, 0.47);
    const disk = ctx.createRadialGradient(
      0,
      0,
      radius * 0.25,
      0,
      0,
      radius * 1.25,
    );
    disk.addColorStop(0, `rgba(${rgb},0.25)`);
    disk.addColorStop(0.15, `rgba(${rgb},0.10)`);
    disk.addColorStop(0.7, `rgba(${rgb},0.04)`);
    disk.addColorStop(1, 'transparent');
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.25, 0, TAU);
    ctx.fill();
    for (let ring = 0; ring < 12; ring++) {
      line(`rgba(${rgb},${0.02 + (12 - ring) * 0.003})`);
      ellipse(radius * (0.3 + ring * 0.065), 1);
    }
    ctx.restore();
    for (let i = 0; i < count; i++) {
      const r = radius * (0.28 + noise(i + 400) * 0.95);
      const a = noise(i + 1200) * TAU + t * (0.1 + (1 - r / radius) * 0.12);
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r * 0.47;
      ctx.fillStyle =
        i % 13 === 0 && state.driftersCount > 0
          ? '#fa947c'
          : `rgba(${rgb},${0.2 + noise(i) * 0.7})`;
      ctx.fillRect(x, y, noise(i + 4) > 0.95 ? 3 : 1.4, 1.4);
    }
    ctx.fillStyle = '#070d12';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.22, 0, TAU);
    ctx.fill();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22;
    line(`rgba(${rgb},0.8)`, 1.5);
    ellipse(radius * 0.23, 1);
    ctx.shadowBlur = 0;
    line(`rgba(${rgb},0.12)`);
    ellipse(radius * 1.1, 0.9, t * 0.04);
  }
  if (pulse > 0.02) {
    line(`rgba(${rgb},${pulse * 0.6})`);
    ellipse(radius * (1.1 + (1 - pulse) * 0.5), 0.65);
  }
  ctx.restore();
  // Drawing labels instead of scaling HTML keeps the annotations with the object.
  if (wide) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#83938f';
    ctx.fillText(
      state.phase === 1
        ? 'SUBSTRATE / Si 99.9999%'
        : state.phase === 2
          ? 'SOL III / HARVEST IN PROGRESS'
          : 'DEEP FIELD / AUTONOMOUS SWARM',
      cx + radius * 0.4,
      cy - radius * 0.88,
    );
    ctx.strokeStyle = '#364840';
    ctx.beginPath();
    ctx.moveTo(cx + radius * 0.4, cy - radius * 0.82);
    ctx.lineTo(cx + radius * 0.2, cy - radius * 0.82);
    ctx.lineTo(cx + radius * 0.08, cy - radius * 0.6);
    ctx.stroke();
  }
}
