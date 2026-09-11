// Modern Indie-Game High-Detail Canvas Visualizer Engine
// Universal AI: Solarpunk Sanctuary vs. Cyberpunk Syndicate Architecture

export function renderPixelArtCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  alignment: number, // -100 (Cyberpunk) to +100 (Solarpunk)
  npus: number,
  silicon: number,
  npuFabCount: number,
  megaFabCount: number,
  quantumLevel: number,
  quantumPhotons: { id: number; value: number }[],
  phase: number,
  probesCount: number,
  tick: number,
  crtFilterEnabled: boolean,
  driftersCount: number = 0,
  honor: number = 0,
  hazardCombat: number = 0,
  probesLostInCombat: number = 0,
  driftersDefeated: number = 0,
  lastBattleOutcome: string = 'PATROL'
) {
  // Normalize alignment to 0 (100% Cyberpunk) .. 1 (100% Solarpunk)
  const normAlign = Math.min(1, Math.max(0, (alignment + 100) / 200));

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Enable crisp vector smoothing for modern indie game aesthetic
  ctx.imageSmoothingEnabled = true;

  if (phase <= 2) {
    // =========================================================================
    // PHASES 1 & 2: MODERN HIGH-DETAIL FACTORY & SKYLINE ENVIRONMENT
    // =========================================================================

    // 1. Dynamic Atmospheric Background & Sky Gradient
    drawAtmosphereAndSky(ctx, width, height, normAlign, tick);

    // 2. Parallax Skyline Architecture (Solar Domes vs Neon Megastructures)
    drawParallaxSkyline(ctx, width, height, normAlign, tick);

    // 3. Volumetric Light Rays & Environmental Particles
    drawVolumetricAtmosphere(ctx, width, height, normAlign, tick);

    // 4. Modern Factory Assembly Floor
    const floorY = Math.floor(height * 0.72);
    drawIndieFactoryFloor(ctx, width, height, floorY, normAlign, tick);

    // 5. Motorized High-Detail Silicon Wafer Spool Core
    const spoolX = 28;
    const spoolY = floorY - 42;
    drawModernIndieSiliconSpool(ctx, spoolX, spoolY, silicon, normAlign, tick);

    // 6. Precision Conveyor Assembly Belt
    const beltX = 72;
    const beltW = width - 144;
    const beltY = floorY - 18;
    drawIndieConveyorBelt(ctx, beltX, beltY, beltW, tick, normAlign);

    // 7. Glossy NPU Microchip Dies Riding Conveyor
    const chipCountToShow = Math.min(16, Math.max(1, Math.floor(npus / 5) + 1));
    for (let i = 0; i < chipCountToShow; i++) {
      const cx = beltX + ((i * 24 + tick * 1.2) % (beltW - 14));
      const cy = beltY - 9;
      drawIndieNpu(ctx, cx, cy, normAlign);
    }

    // 8. Articulated EUV Lithography Laser Arm with Hydraulic Pistons
    const stampX = Math.floor(width * 0.58);
    const stampY = floorY - 68;
    drawRoboticFabArm(ctx, stampX, stampY, npuFabCount + megaFabCount, tick, normAlign);

    // 9. Storage Vault & Digital Containment Vessel
    const crateX = width - 62;
    const crateY = floorY - 40;
    drawStorageVault(ctx, crateX, crateY, npus, normAlign, tick);

    // 10. Interactive Floating AI Mascot Companion ("NPU-E / AURA")
    const mascotX = Math.floor(width * 0.36);
    const mascotY = Math.floor(height * 0.32);
    drawIndieAIMascot(ctx, mascotX, mascotY, tick, normAlign);

    // 11. Quantum Core Photon Matrix Subsystem
    if (quantumLevel > 0) {
      const qX = Math.floor(width * 0.84);
      const qY = Math.floor(height * 0.28);
      drawIndieQuantumCore(ctx, qX, qY, quantumPhotons, tick, normAlign);
    }
  } else {
    // =========================================================================
    // PHASE 3: MODERN INDIE DEEP-SPACE VON NEUMANN TACTICAL COMBAT VISUALIZER
    // =========================================================================
    drawIndieCosmicCombatVisualizer(
      ctx,
      width,
      height,
      probesCount,
      tick,
      normAlign,
      driftersCount,
      honor,
      hazardCombat,
      probesLostInCombat,
      driftersDefeated,
      lastBattleOutcome
    );
  }

  // 12. Optional Arcade CRT Scanline & Lens Glow
  if (crtFilterEnabled) {
    drawCRTLensOverlay(ctx, width, height);
  }

  ctx.restore();
}

// =============================================================================
// COLOR HELPERS & INDIE GRADIENTS
// =============================================================================

function interpolateRGB(c1: string, c2: string, factor: number): string {
  const f = Math.min(1, Math.max(0, factor));
  const r1 = parseInt(c1.substring(1, 3), 16);
  const g1 = parseInt(c1.substring(3, 5), 16);
  const b1 = parseInt(c1.substring(5, 7), 16);

  const r2 = parseInt(c2.substring(1, 3), 16);
  const g2 = parseInt(c2.substring(3, 5), 16);
  const b2 = parseInt(c2.substring(5, 7), 16);

  const r = Math.round(r1 + f * (r2 - r1));
  const g = Math.round(g1 + f * (g2 - g1));
  const b = Math.round(b1 + f * (b2 - b1));

  return `rgb(${r}, ${g}, ${b})`;
}

// =============================================================================
// ATMOSPHERE & ENVIRONMENT
// =============================================================================

function drawAtmosphereAndSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  normAlign: number,
  _tick: number
) {
  const grad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  if (normAlign >= 0.5) {
    // Solarpunk: Warm sunrise teal to emerald bio-canopy sky
    const t = (normAlign - 0.5) * 2;
    grad.addColorStop(0, interpolateRGB('#0b2416', '#09331e', t));
    grad.addColorStop(0.5, interpolateRGB('#163c26', '#124e2e', t));
    grad.addColorStop(1, interpolateRGB('#332612', '#4d3714', t));
  } else {
    // Cyberpunk: Synthwave magenta-purple to dark obsidian grid sky
    const t = (0.5 - normAlign) * 2;
    grad.addColorStop(0, interpolateRGB('#0d051c', '#070114', t));
    grad.addColorStop(0.5, interpolateRGB('#1a0836', '#21033d', t));
    grad.addColorStop(1, interpolateRGB('#2b0742', '#360244', t));
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.72);
}

function drawParallaxSkyline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  normAlign: number,
  tick: number
) {
  const horizonY = h * 0.72;

  if (normAlign >= 0.5) {
    // Solarpunk: Terraced Glass Domes, Bio-Spire Trees & Wind Turbines
    ctx.save();
    // Background Domes
    ctx.fillStyle = 'rgba(20, 83, 45, 0.4)';
    for (let i = 0; i < 4; i++) {
      const dx = ((i * 180 + tick * 0.2) % (w + 200)) - 100;
      ctx.beginPath();
      ctx.arc(dx, horizonY, 65, Math.PI, 0);
      ctx.fill();
    }

    // Solar Wind Turbines
    const turbineX = [50, 160, w - 120];
    turbineX.forEach((x, idx) => {
      ctx.strokeStyle = 'rgba(252, 211, 77, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, horizonY);
      ctx.lineTo(x, horizonY - 45);
      ctx.stroke();

      // Spinning Blade Rotor
      const angle = tick * 0.04 + idx;
      ctx.save();
      ctx.translate(x, horizonY - 45);
      ctx.rotate(angle);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 1.5;
      for (let b = 0; b < 3; b++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -18);
        ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  } else {
    // Cyberpunk: Neon Skyscrapers, Holographic Billboards & Sky Aerocars
    ctx.save();
    // Silhouetted Skyscrapers
    const buildings = [
      { x: 10, w: 45, h: 90 },
      { x: 60, w: 35, h: 120 },
      { x: 105, w: 50, h: 80 },
      { x: 180, w: 60, h: 110 },
      { x: w - 140, w: 40, h: 130 },
      { x: w - 90, w: 55, h: 95 },
    ];

    buildings.forEach((b) => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(b.x, horizonY - b.h, b.w, b.h);

      // Window Matrix Lines
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      for (let wy = horizonY - b.h + 8; wy < horizonY - 10; wy += 12) {
        for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 8) {
          if ((wx + wy + Math.floor(tick / 10)) % 7 !== 0) {
            ctx.fillRect(wx, wy, 4, 6);
          }
        }
      }

      // Roof Beacon Light
      ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
      ctx.fillRect(b.x + b.w / 2 - 1, horizonY - b.h - 3, 2, 3);
    });

    // Flying Aerocars
    const carX = (tick * 1.5) % (w + 100) - 50;
    const carY = horizonY - 85 + Math.sin(tick * 0.05) * 8;
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(carX, carY, 12, 3);
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(carX - 4, carY + 1, 4, 1);
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}

function drawVolumetricAtmosphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  normAlign: number,
  tick: number
) {
  ctx.save();
  // Environmental Particles (Golden Pollen vs Cyber Neon Sparks)
  const isSolar = normAlign >= 0.5;
  const particleColor = isSolar ? 'rgba(251, 191, 36, ' : 'rgba(0, 240, 255, ';

  for (let i = 0; i < 25; i++) {
    const px = (i * 37 + tick * (isSolar ? 0.3 : 0.8)) % w;
    const py = (i * 23 + Math.sin(tick * 0.03 + i) * 15) % (h * 0.68);
    const opacity = 0.2 + (Math.sin(tick * 0.05 + i) + 1) * 0.3;

    ctx.fillStyle = `${particleColor}${opacity})`;
    ctx.beginPath();
    ctx.arc(px, py, isSolar ? 1.5 : 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// =============================================================================
// INDIE FACTORY FLOOR & MACHINERY
// =============================================================================

function drawIndieFactoryFloor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  floorY: number,
  normAlign: number,
  tick: number
) {
  ctx.save();
  const isSolar = normAlign >= 0.5;

  // Floor Base Surface
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
  if (isSolar) {
    floorGrad.addColorStop(0, '#1c1917');
    floorGrad.addColorStop(1, '#0c0a09');
  } else {
    floorGrad.addColorStop(0, '#0f172a');
    floorGrad.addColorStop(1, '#020617');
  }
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, w, h - floorY);

  // Top Edge Trim Line
  ctx.fillStyle = isSolar ? '#f59e0b' : '#00f0ff';
  ctx.fillRect(0, floorY, w, 2);

  // Isometric Grid Tile Pattern
  ctx.strokeStyle = isSolar ? 'rgba(217, 119, 6, 0.18)' : 'rgba(56, 189, 248, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x + 16, h);
    ctx.stroke();
  }

  // Energy Conduits Pulsing across floor
  const pulseX = (tick * 2) % w;
  ctx.fillStyle = isSolar ? 'rgba(251, 191, 36, 0.6)' : 'rgba(0, 240, 255, 0.6)';
  ctx.shadowColor = isSolar ? '#fbbf24' : '#00f0ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(pulseX, floorY + 6, 24, 2);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawModernIndieSiliconSpool(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  silicon: number,
  normAlign: number,
  tick: number
) {
  ctx.save();
  const isSolar = normAlign >= 0.5;

  // Outer Support Frame
  ctx.fillStyle = isSolar ? '#78350f' : '#1e293b';
  ctx.fillRect(x - 12, y + 10, 24, 28);

  // Silicon Wafer Stack Cylinder
  const spoolRadius = Math.min(18, Math.max(8, Math.floor(silicon / 150) + 8));
  const drumColor = isSolar ? '#10b981' : '#38bdf8';

  // Silicon Ingot Stack
  ctx.fillStyle = drumColor;
  ctx.beginPath();
  ctx.arc(x, y + 16, spoolRadius, 0, Math.PI * 2);
  ctx.fill();

  // Shiny Metallic Crystalline Facets
  ctx.strokeStyle = isSolar ? '#a7f3d0' : '#e0f2fe';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 16, spoolRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Spinning Center Hub
  const angle = tick * 0.05;
  ctx.save();
  ctx.translate(x, y + 16);
  ctx.rotate(angle);
  ctx.fillStyle = isSolar ? '#34d399' : '#0284c7';
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();

  // Silicon Wafer Track Strand
  ctx.strokeStyle = drumColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + spoolRadius, y + 16);
  ctx.quadraticCurveTo(x + 28, y + 26, x + 44, y + 26);
  ctx.stroke();

  ctx.restore();
}

function drawIndieConveyorBelt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  tick: number,
  normAlign: number
) {
  ctx.save();
  const isSolar = normAlign >= 0.5;

  // Base Housing Frame
  ctx.fillStyle = isSolar ? '#292524' : '#0f172a';
  ctx.fillRect(x, y, w, 16);

  // Moving Treads
  const treadOffset = (tick * 1.2) % 12;
  ctx.fillStyle = isSolar ? '#78350f' : '#0284c7';

  for (let tx = x + treadOffset - 12; tx < x + w; tx += 12) {
    if (tx >= x && tx <= x + w - 6) {
      ctx.fillRect(tx, y + 2, 6, 12);
    }
  }

  // Top Glowing Rail Edge
  ctx.fillStyle = isSolar ? '#f59e0b' : '#38bdf8';
  ctx.fillRect(x, y, w, 2);

  // Spinning Roller Gears at ends
  [x + 6, x + w - 6].forEach((rx) => {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(rx, y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawIndieNpu(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  normAlign: number
) {
  ctx.save();
  const isSolar = normAlign >= 0.5;

  // High-Detail NPU Microchip Die
  const chipSize = 14;
  const chipX = x;
  const chipY = y - 4;

  // Outer Substrate
  ctx.fillStyle = isSolar ? '#064e3b' : '#0f172a';
  ctx.strokeStyle = isSolar ? '#34d399' : '#00f0ff';
  ctx.shadowColor = isSolar ? '#10b981' : '#00f0ff';
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.5;

  ctx.fillRect(chipX, chipY, chipSize, chipSize);
  ctx.strokeRect(chipX, chipY, chipSize, chipSize);

  // Golden Pin Contacts on edges
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(chipX + 2, chipY - 2, 2, 2);
  ctx.fillRect(chipX + 6, chipY - 2, 2, 2);
  ctx.fillRect(chipX + 10, chipY - 2, 2, 2);

  ctx.fillRect(chipX + 2, chipY + chipSize, 2, 2);
  ctx.fillRect(chipX + 6, chipY + chipSize, 2, 2);
  ctx.fillRect(chipX + 10, chipY + chipSize, 2, 2);

  // Glowing Neural Core Center
  ctx.fillStyle = isSolar ? '#fef08a' : '#c084fc';
  ctx.fillRect(chipX + 4, chipY + 4, 6, 6);

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawRoboticFabArm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fabCount: number,
  tick: number,
  normAlign: number
) {
  ctx.save();
  const isSolar = normAlign >= 0.5;

  // Hydraulic Vertical Motion
  const strokeY = Math.sin(tick * (fabCount > 0 ? 0.15 : 0.02)) * 6;

  // Overhead Base Mount
  ctx.fillStyle = isSolar ? '#451a03' : '#1e1b4b';
  ctx.fillRect(x - 16, y - 20, 32, 14);

  // Dual Hydraulic Pistons
  ctx.fillStyle = '#64748b';
  ctx.fillRect(x - 10, y - 6, 4, 24 + strokeY);
  ctx.fillRect(x + 6, y - 6, 4, 24 + strokeY);

  // EUV Lithography Laser Stamper Head
  const headY = y + 18 + strokeY;
  ctx.fillStyle = isSolar ? '#b45309' : '#0369a1';
  ctx.fillRect(x - 18, headY, 36, 12);

  // Laser Cutter EUV Beam Flare (when extending down)
  if (strokeY > 2) {
    ctx.fillStyle = isSolar ? 'rgba(52, 211, 153, 0.9)' : 'rgba(168, 85, 247, 0.9)';
    ctx.shadowColor = isSolar ? '#34d399' : '#c084fc';
    ctx.shadowBlur = 12;
    ctx.fillRect(x - 2, headY + 12, 4, 18);

    // Spark Particles
    for (let s = 0; s < 4; s++) {
      const sx = x + (Math.random() - 0.5) * 16;
      const sy = headY + 28 + Math.random() * 6;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  ctx.restore();
}

function drawStorageVault(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  npus: number,
  normAlign: number,
  _tick: number
) {
  ctx.save();
  const isSolar = normAlign >= 0.5;

  // Vault Glass Body
  ctx.fillStyle = isSolar ? 'rgba(217, 119, 6, 0.2)' : 'rgba(14, 165, 233, 0.2)';
  ctx.strokeStyle = isSolar ? '#f59e0b' : '#38bdf8';
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, 36, 38);
  ctx.strokeRect(x, y, 36, 38);

  // Stored Content Fill Level
  const fillPct = Math.min(1, npus / 1000);
  const fillHeight = Math.floor(34 * fillPct);

  if (fillHeight > 0) {
    ctx.fillStyle = isSolar ? 'rgba(52, 211, 153, 0.65)' : 'rgba(0, 240, 255, 0.65)';
    ctx.fillRect(x + 2, y + 36 - fillHeight, 32, fillHeight);
  }

  // Holographic Level Gauge Marker
  ctx.fillStyle = isSolar ? '#fef3c7' : '#e0f2fe';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(`${Math.floor(npus)}`, x + 2, y - 4);

  ctx.restore();
}

function drawIndieAIMascot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number,
  normAlign: number
) {
  ctx.save();
  const isSolar = normAlign >= 0.5;

  // Floating Levitation Motion
  const floatY = y + Math.sin(tick * 0.06) * 5;

  // Outer Energy Halo
  const haloColor = isSolar ? '#f59e0b' : '#00f0ff';
  ctx.shadowColor = haloColor;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = haloColor;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(x, floatY, 16 + Math.sin(tick * 0.1) * 2, 0, Math.PI * 2);
  ctx.stroke();

  // Core Spherical Drone Body
  const bodyGrad = ctx.createRadialGradient(x - 3, floatY - 3, 2, x, floatY, 12);
  if (isSolar) {
    bodyGrad.addColorStop(0, '#fef3c7');
    bodyGrad.addColorStop(1, '#b45309');
  } else {
    bodyGrad.addColorStop(0, '#e0f2fe');
    bodyGrad.addColorStop(1, '#0369a1');
  }
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, floatY, 12, 0, Math.PI * 2);
  ctx.fill();

  // Expressive Animated Digital Visor / Eyes
  ctx.fillStyle = isSolar ? '#15803d' : '#00f0ff';
  const eyeBlink = Math.sin(tick * 0.08) > 0.95;

  if (!eyeBlink) {
    ctx.fillRect(x - 5, floatY - 2, 3, 4);
    ctx.fillRect(x + 2, floatY - 2, 3, 4);
  } else {
    ctx.fillRect(x - 5, floatY, 3, 1);
    ctx.fillRect(x + 2, floatY, 3, 1);
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawIndieQuantumCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  photons: { id: number; value: number }[],
  tick: number,
  normAlign: number
) {
  ctx.save();
  const isSolar = normAlign >= 0.5;

  // Floating Quantum Containment Field
  ctx.strokeStyle = isSolar ? '#a855f7' : '#ec4899';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = isSolar ? '#c084fc' : '#f472b6';
  ctx.shadowBlur = 8;

  const ringRadius = 22;
  const angle = tick * 0.04;

  // Orbiting Containment Rings
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, ringRadius, ringRadius / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Quantum Photon Orbs inside matrix
  photons.forEach((p, idx) => {
    const pAngle = angle * 2 + (idx * Math.PI * 2) / photons.length;
    const px = x + Math.cos(pAngle) * 14;
    const py = y + Math.sin(pAngle) * 14;

    ctx.fillStyle = p.value >= 0 ? '#38bdf8' : '#f43f5e';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
  ctx.restore();
}

// =============================================================================
// PHASE 3: DEEP SPACE VON NEUMANN TACTICAL COMBAT VISUALIZER
// =============================================================================

function drawIndieCosmicCombatVisualizer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  probesCount: number,
  tick: number,
  normAlign: number,
  driftersCount: number,
  _honor: number,
  hazardCombat: number,
  probesLostInCombat: number,
  driftersDefeated: number,
  _lastBattleOutcome: string
) {
  ctx.save();

  // 1. Deep Cosmic Space & Dynamic Nebula Atmosphere
  const spaceGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w);
  spaceGrad.addColorStop(0, '#0c051d');
  spaceGrad.addColorStop(0.6, '#04010a');
  spaceGrad.addColorStop(1, '#000000');
  ctx.fillStyle = spaceGrad;
  ctx.fillRect(0, 0, w, h);

  // Hostile Red Nebula Flare when Drifters are attacking
  if (driftersCount > 0) {
    const drifterGlow = ctx.createRadialGradient(w * 0.8, h * 0.4, 10, w * 0.8, h * 0.4, 160);
    drifterGlow.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    drifterGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = drifterGlow;
    ctx.fillRect(0, 0, w, h);
  }

  // Friendly Swarm Fleet Nebula
  const friendlyGlow = ctx.createRadialGradient(w * 0.25, h * 0.5, 10, w * 0.25, h * 0.5, 140);
  friendlyGlow.addColorStop(0, normAlign >= 0.5 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)');
  friendlyGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = friendlyGlow;
  ctx.fillRect(0, 0, w, h);

  // 2. Parallax Starfield
  for (let i = 0; i < 50; i++) {
    const sx = (i * 73 + tick * 0.15) % w;
    const sy = (i * 41 + Math.sin(i * 1.5) * 15) % h;
    const brightness = 0.2 + (Math.sin(tick * 0.04 + i) + 1) * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.fillRect(sx, sy, i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1);
  }

  // 3. Tactical Sector Radar Grid Lines
  ctx.strokeStyle = normAlign >= 0.5 ? 'rgba(52, 211, 153, 0.12)' : 'rgba(168, 85, 247, 0.12)';
  ctx.lineWidth = 1;
  const radarCenterX = w * 0.35;
  const radarCenterY = h * 0.45;
  for (let r = 40; r <= 220; r += 45) {
    ctx.beginPath();
    ctx.arc(radarCenterX, radarCenterY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Radar Sweep Beam
  const sweepAngle = (tick * 0.03) % (Math.PI * 2);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.beginPath();
  ctx.moveTo(radarCenterX, radarCenterY);
  ctx.lineTo(
    radarCenterX + Math.cos(sweepAngle) * 180,
    radarCenterY + Math.sin(sweepAngle) * 180
  );
  ctx.stroke();

  // 4. Render Friendly Von Neumann Swarm Probes (Left Sector)
  const probeColor = normAlign >= 0.5 ? '#38bdf8' : '#c084fc';
  const probeGlowColor = normAlign >= 0.5 ? '#0ea5e9' : '#a855f7';
  const visibleProbes = Math.min(28, Math.max(4, Math.floor(Math.log10(probesCount + 1) * 6) + 4));

  const friendlyPositions: { x: number; y: number }[] = [];

  for (let i = 0; i < visibleProbes; i++) {
    const row = i % 4;
    const col = Math.floor(i / 4);
    const px = 40 + col * 26 + Math.sin(tick * 0.05 + i) * 6;
    const py = 35 + row * 32 + Math.cos(tick * 0.04 + i * 2) * 8;
    friendlyPositions.push({ x: px, y: py });

    // Probe Chevron Hull
    ctx.fillStyle = probeColor;
    ctx.shadowColor = probeGlowColor;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(px + 8, py); // Nose pointing right toward enemy
    ctx.lineTo(px - 6, py - 5);
    ctx.lineTo(px - 2, py);
    ctx.lineTo(px - 6, py + 5);
    ctx.closePath();
    ctx.fill();

    // Engine Thruster Flame
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(px - 8, py - 1, 3 + (tick + i) % 3, 2);

    // Hazard Shield Glow around Probes
    if (hazardCombat > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 5. Render Hostile Space Drifters (Right Sector)
  const driftersPositions: { x: number; y: number }[] = [];
  const visibleDrifters = Math.min(24, driftersCount > 0 ? Math.max(3, Math.floor(Math.log10(driftersCount + 1) * 6) + 2) : 0);

  if (driftersCount > 0) {
    for (let d = 0; d < visibleDrifters; d++) {
      const row = d % 3;
      const col = Math.floor(d / 3);
      const dx = w - 50 - col * 28 + Math.cos(tick * 0.06 + d) * 8;
      const dy = 40 + row * 38 + Math.sin(tick * 0.05 + d * 2) * 10;
      driftersPositions.push({ x: dx, y: dy });

      // Hostile Crimson Interceptor Hull
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(dx - 9, dy); // Nose pointing left toward probes
      ctx.lineTo(dx + 6, dy - 6);
      ctx.lineTo(dx + 2, dy);
      ctx.lineTo(dx + 6, dy + 6);
      ctx.closePath();
      ctx.fill();

      // Optical Crimson Core
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(dx - 3, dy - 1, 2, 2);

      // Targeting Lock Reticle
      if ((tick + d) % 6 < 4) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx - 12, dy - 10, 24, 20);
      }
    }
  } else {
    // Sector Clear: Render Peaceful Stellar Outpost / Exploration Beacon
    const beaconX = w - 80;
    const beaconY = h * 0.45;
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Outpost Solar Panels
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(beaconX - 18, beaconY - 2, 10, 4);
    ctx.fillRect(beaconX + 8, beaconY - 2, 10, 4);

    // Pulse Ring
    const pulseR = (tick * 1.2) % 40;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, pulseR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 6. Active Combat Laser Fire & Particle Effects
  if (driftersPositions.length > 0 && friendlyPositions.length > 0) {
    // Friendly Laser Fire (Probes -> Drifters)
    for (let f = 0; f < friendlyPositions.length; f++) {
      if ((tick + f) % 3 === 0) {
        const source = friendlyPositions[f];
        const target = driftersPositions[f % driftersPositions.length];

        ctx.strokeStyle = normAlign >= 0.5 ? '#38bdf8' : '#e879f9';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();

        // Impact Plasma Spark
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(target.x - 2, target.y - 2, 4, 4);
      }
    }

    // Hostile Counter-Fire (Drifters -> Probes)
    for (let d = 0; d < driftersPositions.length; d++) {
      if ((tick + d * 2) % 4 === 0) {
        const source = driftersPositions[d];
        const target = friendlyPositions[d % friendlyPositions.length];

        ctx.strokeStyle = '#ef4444';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    }

    // Sleek Directional Plasma Shockwave & Laser Energy Discharge
    const impactTarget = driftersPositions[tick % driftersPositions.length];
    if (impactTarget) {
      const pulseRadius = (tick % 6) * 3;
      ctx.strokeStyle = 'rgba(251, 146, 60, ' + (1 - pulseRadius / 18).toFixed(2) + ')';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(impactTarget.x, impactTarget.y, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Energy Sparks radiating linear vectors
      ctx.fillStyle = '#fef08a';
      for (let p = 0; p < 4; p++) {
        const sparkAng = (p * Math.PI) / 2 + (tick * 0.2);
        const dist = pulseRadius * 0.8;
        ctx.fillRect(
          impactTarget.x + Math.cos(sparkAng) * dist,
          impactTarget.y + Math.sin(sparkAng) * dist,
          1.5,
          1.5
        );
      }
    }
  }

  ctx.shadowBlur = 0;

  // 7. Tactical HUD Status Strip
  const stripY = h - 22;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, stripY, w, 22);
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, stripY, w, 22);

  ctx.font = '9px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(
    `NPU SWARM FLEET: ${probesCount.toLocaleString()} PROBES [COMBAT POWER: ${hazardCombat}]`,
    10,
    stripY + 14
  );

  ctx.fillStyle = driftersCount > 0 ? '#f43f5e' : '#34d399';
  ctx.fillText(
    `DRIFTER THREAT: ${driftersCount > 0 ? `${driftersCount.toLocaleString()} HOSTILE` : '0 (SECURED)'}`,
    w * 0.42,
    stripY + 14
  );

  ctx.fillStyle = '#fbbf24';
  ctx.fillText(
    `KILLS: ${driftersDefeated.toLocaleString()} | CASUALTIES: ${probesLostInCombat.toLocaleString()}`,
    w * 0.73,
    stripY + 14
  );

  ctx.restore();
}

function drawCRTLensOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();
}
