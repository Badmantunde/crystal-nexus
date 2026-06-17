import { getCandyStyle } from '../candy/CandyTypes';
import { RAINBOW_PALETTE } from '../candy/fruitAssets';
import type { SpecialBlast } from '../match3/SimpleBoard';

export function drawLineBlast(
  ctx: CanvasRenderingContext2D,
  blast: SpecialBlast,
  progress: number,
  board: { x: number; y: number; cell: number; w: number; h: number },
): void {
  const { x, y, cell, w, h } = board;
  const ox = x + blast.origin.col * cell + cell / 2;
  const oy = y + blast.origin.row * cell + cell / 2;

  ctx.save();

  if (blast.kind === 'row') {
    drawRowSweep(ctx, x, y, w, cell, blast, ox, oy, progress);
  } else if (blast.kind === 'col') {
    drawColSweep(ctx, x, y, h, cell, blast, ox, oy, progress);
  } else if (blast.kind === 'cross' && blast.secondaryOrigin) {
    const sx = x + blast.secondaryOrigin.col * cell + cell / 2;
    const sy = y + blast.secondaryOrigin.row * cell + cell / 2;
    drawRowSweep(ctx, x, y, w, cell, blast, ox, oy, progress);
    drawColSweep(ctx, x, y, h, cell, blast, sx, sy, progress);
    if (progress > 0.06) {
      drawCrossFlare(ctx, ox, oy, sx, sy, cell, clamp01((progress - 0.06) / 0.2));
    }
  } else if (blast.kind === 'col_double' && blast.columns) {
    const pass = progress < 0.5 ? progress * 2 : (progress - 0.5) * 2;
    for (const colIdx of blast.columns) {
      const cx = x + colIdx * cell + cell / 2;
      const cy = y + blast.origin.row * cell + cell / 2;
      const fakeBlast = { ...blast, kind: 'col' as const, origin: { row: blast.origin.row, col: colIdx } };
      drawColSweep(ctx, x, y, h, cell, fakeBlast, cx, cy, pass);
    }
    if (progress > 0.48 && progress < 0.54) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x, y, w, h);
    }
  } else if (blast.kind === 'color') {
    drawRainbowBlast(ctx, blast, board, ox, oy, progress);
  } else if (blast.kind === 'board_clear') {
    drawRainbowBlast(ctx, blast, board, ox, oy, progress);
    if (progress > 0.2) {
      ctx.fillStyle = `rgba(255,255,255,${(1 - progress) * 0.18})`;
      ctx.fillRect(x, y, w, h);
    }
  } else if (blast.kind === 'color_row' && blast.chainOrigins?.length) {
    drawRainbowVortex(ctx, ox, oy, cell, clamp01(progress / 0.2), progress);
    const rows = [...new Set(blast.chainOrigins.map((o) => o.row))].sort((a, b) => a - b);
    const count = rows.length;
    rows.forEach((rowIdx, i) => {
      const hitAt = i / (count + 0.35);
      const localT = clamp01((progress - hitAt * 0.42) / 0.38);
      if (localT <= 0) return;
      const anchor = blast.chainOrigins!.find((o) => o.row === rowIdx) ?? blast.origin;
      const cx = x + anchor.col * cell + cell / 2;
      const cy = y + rowIdx * cell + cell / 2;
      const fakeBlast = { ...blast, kind: 'row' as const, origin: { row: rowIdx, col: anchor.col } };
      drawRowSweep(ctx, x, y, w, cell, fakeBlast, cx, cy, localT);
    });
  } else if (blast.kind === 'color_col' && blast.chainOrigins?.length) {
    drawRainbowVortex(ctx, ox, oy, cell, clamp01(progress / 0.2), progress);
    const cols = [...new Set(blast.chainOrigins.map((o) => o.col))].sort((a, b) => a - b);
    const count = cols.length;
    cols.forEach((colIdx, i) => {
      const hitAt = i / (count + 0.35);
      const localT = clamp01((progress - hitAt * 0.42) / 0.38);
      if (localT <= 0) return;
      const anchor = blast.chainOrigins!.find((o) => o.col === colIdx) ?? blast.origin;
      const cx = x + colIdx * cell + cell / 2;
      const cy = y + anchor.row * cell + cell / 2;
      const fakeBlast = { ...blast, kind: 'col' as const, origin: { row: anchor.row, col: colIdx } };
      drawColSweep(ctx, x, y, h, cell, fakeBlast, cx, cy, localT);
    });
  }

  ctx.restore();
}

/** Full-canvas white flash intensity 0–1 */
export function blastScreenFlash(blast: SpecialBlast, progress: number): number {
  const t = progress;
  if (blast.kind === 'cross') {
    if (t < 0.08) return (t / 0.08) * 0.5;
    if (t < 0.16) return 0.5 * (1 - (t - 0.08) / 0.08);
    return 0;
  }
  if (blast.kind === 'col_double') {
    if (t < 0.06) return (t / 0.06) * 0.35;
    if (t > 0.46 && t < 0.52) return 0.45;
    if (t > 0.52 && t < 0.58) return 0.45 * (1 - (t - 0.52) / 0.06);
    return 0;
  }
  if (blast.kind === 'board_clear') {
    if (t < 0.06) return (t / 0.06) * 0.55;
    if (t < 0.2) return 0.95 * (1 - (t - 0.06) / 0.14);
    if (t > 0.65 && t < 0.88) return ((t - 0.65) / 0.23) * 0.3;
    return 0;
  }
  if (blast.kind === 'color_row' || blast.kind === 'color_col') {
    if (t < 0.08) return (t / 0.08) * 0.4;
    if (t < 0.16) return 0.55 * (1 - (t - 0.08) / 0.08);
    if (t > 0.7 && t < 0.9) return ((t - 0.7) / 0.2) * 0.15;
    return 0;
  }
  if (blast.kind === 'color') {
    if (t < 0.08) return (t / 0.08) * 0.45;
    if (t < 0.18) return 0.85 * (1 - (t - 0.08) / 0.1);
    if (t > 0.72 && t < 0.9) return ((t - 0.72) / 0.18) * 0.22;
    return 0;
  }
  if (t < 0.1) return (t / 0.1) * 0.42;
  if (t < 0.2) return 0.42 * (1 - (t - 0.1) / 0.1);
  return 0;
}

/** Camera shake intensity multiplier */
export function blastShakeIntensity(blast: SpecialBlast, progress: number): number {
  const decay = 1 - easeOutQuad(progress);
  if (blast.kind === 'cross') {
    const spike = progress < 0.15 ? 2.2 : progress < 0.5 ? 1.4 : 0.9;
    return 14 * decay * spike;
  }
  if (blast.kind === 'col_double') {
    const spike = progress < 0.5 ? 1.5 : 1.8;
    return 12 * decay * spike;
  }
  if (blast.kind === 'board_clear') {
    let spike = 1;
    if (progress > 0.08 && progress < 0.22) spike = 3.2;
    else if (progress > 0.2 && progress < 0.8) spike = 1.8 + Math.abs(Math.sin(progress * Math.PI * 18)) * 0.9;
    return 18 * decay * spike;
  }
  if (blast.kind === 'color_row' || blast.kind === 'color_col') {
    const chain = blast.chainOrigins?.length ?? 1;
    const spike = progress < 0.2 ? 2.2 : 1.3 + Math.min(chain, 6) * 0.15;
    return 13 * decay * spike;
  }
  if (blast.kind === 'color') {
    let spike = 1;
    if (progress > 0.1 && progress < 0.22) spike = 2.8;
    else if (progress > 0.18 && progress < 0.75) spike = 1.5 + Math.abs(Math.sin(progress * Math.PI * 22)) * 0.75;
    else if (progress > 0.75) spike = 1.1;
    return 15 * decay * spike;
  }
  const base = 9;
  const spike = progress < 0.12 ? 1.6 : progress < 0.45 ? 1.2 : 0.85;
  return base * decay * spike;
}

function drawRowSweep(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  cell: number,
  blast: SpecialBlast,
  cx: number,
  cy: number,
  progress: number,
): void {
  const rowY = y + blast.origin.row * cell;
  const chargeT = clamp01(progress / 0.18);
  const sweepT = easeOutExpo(clamp01((progress - 0.1) / 0.72));
  const fadeT = clamp01((progress - 0.75) / 0.25);

  drawBombCharge(ctx, cx, cy, cell, chargeT, '#FFE082', '#FF6F00');

  if (progress > 0.08) {
    drawOriginBurst(ctx, cx, cy, cell, clamp01((progress - 0.08) / 0.25), 'horizontal');
  }

  const reach = w * 0.55 * sweepT;
  const left = cx - reach;
  const right = cx + reach;

  // Scorched row glow
  const rowGlow = ctx.createLinearGradient(x, cy, x + w, cy);
  rowGlow.addColorStop(0, `rgba(255,120,40,${0.15 * (1 - fadeT)})`);
  rowGlow.addColorStop(0.5, `rgba(255,240,160,${0.55 * (1 - fadeT)})`);
  rowGlow.addColorStop(1, `rgba(255,120,40,${0.15 * (1 - fadeT)})`);
  ctx.fillStyle = rowGlow;
  ctx.fillRect(x, rowY + 1, w, cell - 2);

  // Dual energy beams
  drawEnergyBeam(ctx, cx, cy, left, cy, cell, sweepT, fadeT);
  drawEnergyBeam(ctx, cx, cy, right, cy, cell, sweepT, fadeT);

  // Shockwave rings at wavefronts
  if (sweepT > 0.05) {
    drawShockwave(ctx, left, cy, cell, sweepT, fadeT);
    drawShockwave(ctx, right, cy, cell, sweepT, fadeT);
  }

  drawSparkStrip(ctx, x, cy, w, cell, progress, blast.origin.col, 'row');
}

function drawColSweep(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  cell: number,
  blast: SpecialBlast,
  cx: number,
  cy: number,
  progress: number,
): void {
  const colX = x + blast.origin.col * cell;
  const chargeT = clamp01(progress / 0.18);
  const sweepT = easeOutExpo(clamp01((progress - 0.1) / 0.72));
  const fadeT = clamp01((progress - 0.75) / 0.25);

  drawBombCharge(ctx, cx, cy, cell, chargeT, '#FFE082', '#FF6F00');

  if (progress > 0.08) {
    drawOriginBurst(ctx, cx, cy, cell, clamp01((progress - 0.08) / 0.25), 'vertical');
  }

  const reach = h * 0.55 * sweepT;
  const top = cy - reach;
  const bottom = cy + reach;

  const colGlow = ctx.createLinearGradient(cx, y, cx, y + h);
  colGlow.addColorStop(0, `rgba(255,120,40,${0.15 * (1 - fadeT)})`);
  colGlow.addColorStop(0.5, `rgba(255,240,160,${0.55 * (1 - fadeT)})`);
  colGlow.addColorStop(1, `rgba(255,120,40,${0.15 * (1 - fadeT)})`);
  ctx.fillStyle = colGlow;
  ctx.fillRect(colX + 1, y, cell - 2, h);

  drawEnergyBeam(ctx, cx, cy, cx, top, cell, sweepT, fadeT);
  drawEnergyBeam(ctx, cx, cy, cx, bottom, cell, sweepT, fadeT);

  if (sweepT > 0.05) {
    drawShockwave(ctx, cx, top, cell, sweepT, fadeT);
    drawShockwave(ctx, cx, bottom, cell, sweepT, fadeT);
  }

  drawSparkStrip(ctx, cx, y, h, cell, progress, blast.origin.row, 'col');
}

function drawBombCharge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  t: number,
  inner: string,
  outer: string,
): void {
  if (t <= 0) return;

  const r = cell * (0.2 + t * 0.55);
  const pulse = 1 + Math.sin(t * Math.PI * 6) * 0.08;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * pulse);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.25, inner + 'EE');
  g.addColorStop(0.6, outer + 'AA');
  g.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Spinning charge arcs
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * t})`;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#FFD54F';
  ctx.shadowBlur = 12;
  for (let i = 0; i < 3; i++) {
    const a0 = t * Math.PI * 4 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.28, a0, a0 + Math.PI * 0.55);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawOriginBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  t: number,
  axis: 'horizontal' | 'vertical',
): void {
  const r = cell * (0.15 + t * 1.1);
  const alpha = 1 - t;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
  g.addColorStop(0.3, `rgba(255,200,60,${0.7 * alpha})`);
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Cross flare
  ctx.strokeStyle = `rgba(255,255,255,${0.85 * alpha})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#FFAB00';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  if (axis === 'horizontal') {
    ctx.moveTo(cx - r * 1.4, cy);
    ctx.lineTo(cx + r * 1.4, cy);
    ctx.moveTo(cx, cy - r * 0.5);
    ctx.lineTo(cx, cy + r * 0.5);
  } else {
    ctx.moveTo(cx, cy - r * 1.4);
    ctx.lineTo(cx, cy + r * 1.4);
    ctx.moveTo(cx - r * 0.5, cy);
    ctx.lineTo(cx + r * 0.5, cy);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Debris particles
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + t * 2;
    const dist = r * (0.6 + (i % 3) * 0.2);
    const px = cx + Math.cos(ang) * dist;
    const py = cy + Math.sin(ang) * dist;
    ctx.fillStyle = `rgba(255,${200 + (i % 3) * 15},80,${alpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(px, py, 2 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnergyBeam(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cell: number,
  sweepT: number,
  fadeT: number,
): void {
  const alpha = (1 - fadeT) * 0.95;

  // Outer glow
  ctx.strokeStyle = `rgba(255,140,0,${0.35 * alpha})`;
  ctx.lineWidth = cell * 0.55;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,180,0,0.9)';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Core beam
  ctx.strokeStyle = `rgba(255,255,220,${0.9 * alpha})`;
  ctx.lineWidth = cell * 0.22;
  ctx.shadowBlur = 14;
  ctx.stroke();

  // White hot center
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = cell * 0.08;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Leading orb
  const orbR = cell * (0.14 + sweepT * 0.06);
  const og = ctx.createRadialGradient(x2, y2, 0, x2, y2, orbR * 2);
  og.addColorStop(0, `rgba(255,255,255,${alpha})`);
  og.addColorStop(0.4, `rgba(255,220,80,${0.8 * alpha})`);
  og.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = og;
  ctx.beginPath();
  ctx.arc(x2, y2, orbR * 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawShockwave(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  sweepT: number,
  fadeT: number,
): void {
  const r = cell * (0.25 + sweepT * 0.35);
  const alpha = (1 - fadeT) * 0.75 * (1 - sweepT * 0.3);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(255,200,80,0.8)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawCrossFlare(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  sx: number,
  sy: number,
  cell: number,
  t: number,
): void {
  const alpha = 1 - t;
  const r = cell * (0.3 + t * 1.4);
  const ix = (ox + sx) / 2;
  const iy = (oy + sy) / 2;

  const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, r);
  g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
  g.addColorStop(0.25, `rgba(255,200,80,${0.7 * alpha})`);
  g.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ix, iy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`;
  ctx.lineWidth = 4;
  ctx.shadowColor = '#FFD54F';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(ox - r * 0.4, oy);
  ctx.lineTo(ox + r * 0.4, oy);
  ctx.moveTo(sx, sy - r * 0.4);
  ctx.lineTo(sx, sy + r * 0.4);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawSparkStrip(
  ctx: CanvasRenderingContext2D,
  start: number,
  cross: number,
  length: number,
  cell: number,
  progress: number,
  originIdx: number,
  axis: 'row' | 'col',
): void {
  const sweepT = easeOutExpo(clamp01((progress - 0.1) / 0.72));
  if (sweepT < 0.05) return;

  const count = axis === 'row' ? 14 : 14;
  for (let i = 0; i < count; i++) {
    const frac = i / (count - 1);
    const pos = start + frac * length;
    const cellIdx = Math.floor((pos - start) / cell);
    const dist = Math.abs(cellIdx - originIdx);
    const maxCells = length / cell;
    if (dist > sweepT * maxCells + 0.5) continue;

    const flicker = 0.5 + Math.sin(progress * 40 + i * 1.7) * 0.5;
    const alpha = (1 - clamp01((progress - 0.7) / 0.3)) * flicker * 0.9;
    const px = axis === 'row' ? pos : cross;
    const py = axis === 'row' ? cross : pos;

    ctx.fillStyle = `rgba(255,${220 + (i % 3) * 10},100,${alpha})`;
    ctx.beginPath();
    ctx.arc(px + Math.sin(i * 3.1) * 3, py + Math.cos(i * 2.7) * 3, 1.5 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Prismatic full-screen flash for rainbow fruit detonation. */
export function drawRainbowScreenFlash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  progress: number,
): void {
  if (intensity <= 0.01) return;
  const hueShift = progress * 360;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  RAINBOW_PALETTE.forEach((c, i) => {
    grad.addColorStop(i / (RAINBOW_PALETTE.length - 1), c);
  });
  ctx.save();
  ctx.globalAlpha = intensity * 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = intensity * 0.35;
  ctx.fillStyle = `hsla(${(hueShift + 40) % 360}, 100%, 92%, 1)`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawRainbowBlast(
  ctx: CanvasRenderingContext2D,
  blast: SpecialBlast,
  board: { x: number; y: number; cell: number; w: number; h: number },
  ox: number,
  oy: number,
  progress: number,
): void {
  const cell = board.cell;
  const boardW = board.cell * blast.cols;
  const boardH = board.cell * blast.rows;
  const targetColor = blast.targetCategory ? getCandyStyle(blast.targetCategory).color : '#FFD54F';
  const targetLabel = blast.targetCategory ? getCandyStyle(blast.targetCategory).label : 'fruit';

  const chargeT = clamp01(progress / 0.14);
  const detonateT = clamp01((progress - 0.12) / 0.14);
  const cascadeT = clamp01((progress - 0.2) / 0.68);
  const fadeT = clamp01((progress - 0.82) / 0.18);

  // Phase 1 — prismatic charge + board vignette
  if (progress < 0.22) {
    const dim = chargeT * 0.45 + detonateT * 0.25;
    ctx.fillStyle = `rgba(8,4,28,${dim})`;
    ctx.fillRect(board.x, board.y, boardW, boardH);
  }

  drawRainbowVortex(ctx, ox, oy, cell, chargeT, progress);
  drawRainbowOrbitRings(ctx, ox, oy, cell, chargeT + detonateT * 0.5, progress);

  // Phase 2 — supernova detonation
  if (detonateT > 0) {
    drawRainbowSupernova(ctx, ox, oy, cell, board, detonateT, progress);
    drawPrismaticShockwaves(ctx, ox, oy, board, detonateT);
    drawRainbowBurstRays(ctx, ox, oy, cell, detonateT, progress);
  }

  const order = blast.strikeOrder ?? blast.cells;
  const total = Math.max(order.length, 1);
  const targets = order.map((c, i) => ({
    x: board.x + c.col * cell + cell / 2,
    y: board.y + c.row * cell + cell / 2,
    cell: c,
    hue: RAINBOW_PALETTE[i % RAINBOW_PALETTE.length],
  }));

  // Phase 3 — cascading rainbow beams to each target
  for (let i = 0; i < total; i++) {
    const hitAt = (i + 0.25) / (total + 0.5);
    const boltLife = clamp01((cascadeT - hitAt) / 0.12);
    if (boltLife <= 0) continue;

    const tx = targets[i].x;
    const ty = targets[i].y;
    const fade = (1 - boltLife * 0.7) * (1 - fadeT);
    const beamColor = targets[i].hue;
    const seed = i * 4.71 + progress * 11;

    drawRainbowBeam(ctx, ox, oy, tx, ty, beamColor, fade, seed, progress);
    drawRainbowBeam(ctx, ox, oy, tx, ty, targetColor, fade * 0.45, seed + 3.3, progress);

    if (boltLife < 0.4) {
      drawRainbowTargetPop(ctx, tx, ty, cell, beamColor, boltLife / 0.4);
    }

    if (boltLife > 0.15) {
      drawRainbowImpact(ctx, tx, ty, cell, beamColor, targetColor, clamp01((boltLife - 0.15) / 0.85));
    }

    if (i > 0 && boltLife > 0.12) {
      const prev = targets[i - 1];
      drawRainbowArc(ctx, prev.x, prev.y, tx, ty, prev.hue, fade * 0.5);
    }
  }

  // Phase 4 — confetti + lingering shimmer
  if (cascadeT > 0.15) {
    drawRainbowConfetti(ctx, board, ox, oy, cascadeT, fadeT, progress);
  }

  if (progress > 0.14 && progress < 0.88) {
    const chipAlpha = clamp01((progress - 0.14) / 0.1) * (progress < 0.78 ? 1 : (0.88 - progress) / 0.1);
    drawRainbowLabel(ctx, ox, oy, cell, targetLabel, targetColor, chipAlpha, progress);
  }
}

function drawRainbowVortex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  t: number,
  progress: number,
): void {
  if (t <= 0) return;

  const squeeze = t < 0.65 ? t / 0.65 : 1 - (t - 0.65) / 0.35;
  const r = cell * (0.5 - squeeze * 0.22 + (t > 0.65 ? (t - 0.65) * 1.4 : 0));
  const spin = progress * Math.PI * 14;

  const grad = ctx.createConicGradient(spin, cx, cy);
  RAINBOW_PALETTE.forEach((c, i) => grad.addColorStop(i / RAINBOW_PALETTE.length, c));
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.55, 'rgba(255,200,255,0.35)');
  g.addColorStop(1, 'rgba(80,20,180,0)');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(r, cell * 0.1), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.55 * t;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRainbowOrbitRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  t: number,
  progress: number,
): void {
  if (t <= 0) return;
  const spin = progress * Math.PI * 10;
  for (let i = 0; i < 3; i++) {
    const color = RAINBOW_PALETTE[(i + Math.floor(progress * 8)) % RAINBOW_PALETTE.length];
    const ringR = cell * (0.35 + i * 0.14 + t * 0.25);
    ctx.strokeStyle = color + Math.floor(220 * t).toString(16).padStart(2, '0');
    ctx.lineWidth = 2.5 - i * 0.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, spin + i * 1.2, spin + i * 1.2 + Math.PI * 1.1);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawRainbowSupernova(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cell: number,
  board: { x: number; y: number; w: number; h: number },
  t: number,
  progress: number,
): void {
  const alpha = 1 - t;
  const maxR = Math.hypot(board.w, board.h) * 0.6;
  const r = cell * (0.25 + t * maxR / cell * 0.5);
  const spin = progress * Math.PI * 6;

  const nova = ctx.createConicGradient(spin, ox, oy);
  RAINBOW_PALETTE.forEach((c, i) => nova.addColorStop(i / RAINBOW_PALETTE.length, c + Math.floor(alpha * 220).toString(16).padStart(2, '0')));
  const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
  core.addColorStop(0, `rgba(255,255,255,${0.98 * alpha})`);
  core.addColorStop(0.15, `rgba(255,240,200,${0.85 * alpha})`);
  core.addColorStop(0.5, `rgba(255,120,200,${0.4 * alpha})`);
  core.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(ox, oy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = nova;
  ctx.globalAlpha = alpha * 0.45;
  ctx.beginPath();
  ctx.arc(ox, oy, r * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Star flare
  ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`;
  ctx.lineWidth = 4;
  ctx.shadowColor = '#FF6B9D';
  ctx.shadowBlur = 28;
  for (let i = 0; i < 4; i++) {
    const ang = spin + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(ox - Math.cos(ang) * r * 0.3, oy - Math.sin(ang) * r * 0.3);
    ctx.lineTo(ox + Math.cos(ang) * r * 0.55, oy + Math.sin(ang) * r * 0.55);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawPrismaticShockwaves(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  board: { x: number; y: number; w: number; h: number },
  t: number,
): void {
  const maxR = Math.hypot(board.w, board.h) * 0.7;
  for (let wave = 0; wave < 3; wave++) {
    const wt = clamp01((t - wave * 0.12) / 0.88);
    if (wt <= 0) continue;
    const r = maxR * easeOutExpo(wt);
    const alpha = (1 - wt) * 0.75;
    const color = RAINBOW_PALETTE[wave % RAINBOW_PALETTE.length];
    ctx.strokeStyle = `${color}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 3 + (1 - wt) * 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawRainbowBurstRays(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cell: number,
  t: number,
  progress: number,
): void {
  const alpha = (1 - t) * 0.9;
  const len = cell * (0.9 + t * 2.8);
  const rays = 12;

  for (let i = 0; i < rays; i++) {
    const ang = (i / rays) * Math.PI * 2 + progress * 2.2;
    const color = RAINBOW_PALETTE[i % RAINBOW_PALETTE.length];
    const ex = ox + Math.cos(ang) * len;
    const ey = oy + Math.sin(ang) * len;
    const mid = 0.45 + Math.sin(i * 2.1 + progress * 8) * 0.15;
    const jx = ox + Math.cos(ang) * len * mid + Math.sin(ang * 3 + i) * 8;
    const jy = oy + Math.sin(ang) * len * mid + Math.cos(ang * 3 + i) * 8;

    ctx.strokeStyle = `${color}${Math.floor(alpha * 180).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.quadraticCurveTo(jx, jy, ex, ey);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawRainbowBeam(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  alpha: number,
  seed: number,
  progress: number,
): void {
  const segments = 10;
  const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
  const perpX = -(y2 - y1);
  const perpY = x2 - x1;
  const perpLen = Math.hypot(perpX, perpY) || 1;
  const wave = Math.sin(progress * Math.PI * 16 + seed) * 18;

  for (let i = 1; i < segments; i++) {
    const f = i / segments;
    const px = x1 + (x2 - x1) * f;
    const py = y1 + (y2 - y1) * f;
    const bulge = Math.sin(f * Math.PI) * wave;
    pts.push({
      x: px + (perpX / perpLen) * bulge + Math.sin(seed + i * 2.3) * 4,
      y: py + (perpY / perpLen) * bulge + Math.cos(seed + i * 1.9) * 4,
    });
  }
  pts.push({ x: x2, y: y2 });

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.strokeStyle = color + '55';
  ctx.lineWidth = 9;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 14;
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.stroke();

  // Traveling sparkle along beam
  const sparkF = (progress * 3 + seed * 0.1) % 1;
  const si = Math.min(segments - 1, Math.floor(sparkF * segments));
  const sp = pts[si];
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRainbowTargetPop(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  cell: number,
  color: string,
  t: number,
): void {
  const r = cell * (0.15 + t * 0.45);
  const alpha = (1 - t) * 0.95;
  ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawRainbowImpact(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  cell: number,
  beamColor: string,
  fruitColor: string,
  impact: number,
): void {
  const alpha = 1 - impact;
  const r = cell * (0.18 + impact * 0.85);

  const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.2, `${fruitColor}${Math.floor(alpha * 240).toString(16).padStart(2, '0')}`);
  g.addColorStop(0.55, `${beamColor}${Math.floor(alpha * 160).toString(16).padStart(2, '0')}`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.fill();

  for (let s = 0; s < 10; s++) {
    const ang = (s / 10) * Math.PI * 2 + impact * 4;
    const dist = r * (0.35 + impact * 0.65);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
    ctx.beginPath();
    ctx.arc(tx + Math.cos(ang) * dist, ty + Math.sin(ang) * dist, 2 + (s % 2), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRainbowArc(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  alpha: number,
): void {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 12;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawRainbowConfetti(
  ctx: CanvasRenderingContext2D,
  board: { x: number; y: number; w: number; h: number },
  ox: number,
  oy: number,
  cascadeT: number,
  fadeT: number,
  progress: number,
): void {
  const alpha = (1 - fadeT) * 0.85;
  if (alpha < 0.02) return;

  for (let i = 0; i < 36; i++) {
    const seed = i * 17.3;
    const color = RAINBOW_PALETTE[i % RAINBOW_PALETTE.length];
    const ang = seed + progress * 4;
    const dist = cascadeT * (80 + (i % 7) * 22);
    const px = ox + Math.cos(ang) * dist * (0.4 + (i % 5) * 0.15);
    const py = oy + Math.sin(ang) * dist * (0.35 + (i % 4) * 0.18) + cascadeT * 30;
    if (px < board.x || px > board.x + board.w || py < board.y || py > board.y + board.h) continue;

    ctx.save();
    ctx.globalAlpha = alpha * (0.5 + (i % 3) * 0.2);
    ctx.translate(px, py);
    ctx.rotate(ang + progress * 6);
    ctx.fillStyle = color;
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.restore();
  }
}

function drawRainbowLabel(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cell: number,
  targetLabel: string,
  targetColor: string,
  chipAlpha: number,
  progress: number,
): void {
  ctx.save();
  ctx.globalAlpha = chipAlpha;
  const label = `ALL ${targetLabel.toUpperCase()}!`;
  ctx.font = `bold ${Math.max(12, cell * 0.24)}px system-ui`;

  const tw = ctx.measureText(label).width + 22;
  const chipY = oy - cell * 0.92;
  const hue = (progress * 280) % 360;

  const chipGrad = ctx.createLinearGradient(ox - tw / 2, chipY, ox + tw / 2, chipY + cell * 0.34);
  chipGrad.addColorStop(0, RAINBOW_PALETTE[0]);
  chipGrad.addColorStop(0.5, RAINBOW_PALETTE[3]);
  chipGrad.addColorStop(1, RAINBOW_PALETTE[5]);

  ctx.fillStyle = chipGrad;
  ctx.shadowColor = targetColor;
  ctx.shadowBlur = 22;
  roundRect(ctx, ox - tw / 2, chipY, tw, cell * 0.34, 10);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, ox, chipY + cell * 0.17);

  ctx.strokeStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
  ctx.lineWidth = 1.5;
  roundRect(ctx, ox - tw / 2, chipY, tw, cell * 0.34, 10);
  ctx.stroke();
  ctx.restore();
}

/** 0 = not yet, 1 = fully vanished */
export function blastCellVanish(
  blast: SpecialBlast,
  row: number,
  col: number,
  progress: number,
): number {
  const t = easeOutQuad(progress);

  if (blast.kind === 'row') {
    const deltaCol = col - blast.origin.col;
    const forward = deltaCol >= 0 ? deltaCol : -deltaCol;
    const sideT = deltaCol >= 0
      ? (t * (blast.cols + 1.2) - forward) / 1.4
      : (Math.max(0, t - 0.08) * (blast.cols + 1.2) - forward) / 1.6;
    return clamp01(sideT);
  }

  if (blast.kind === 'col') {
    const deltaRow = row - blast.origin.row;
    const forward = deltaRow >= 0 ? deltaRow : -deltaRow;
    const sideT = deltaRow >= 0
      ? (t * (blast.rows + 1.2) - forward) / 1.4
      : (Math.max(0, t - 0.08) * (blast.rows + 1.2) - forward) / 1.6;
    return clamp01(sideT);
  }

  if (blast.kind === 'cross') {
    const rowHit = row === blast.origin.row
      ? (t * (blast.cols + 1.2) - Math.abs(col - blast.origin.col)) / 1.4
      : -1;
    const colOrigin = blast.secondaryOrigin!;
    const colHit = col === colOrigin.col
      ? (t * (blast.rows + 1.2) - Math.abs(row - colOrigin.row)) / 1.4
      : -1;
    return clamp01(Math.max(rowHit, colHit));
  }

  if (blast.kind === 'col_double' && blast.columns?.includes(col)) {
    const pass = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const deltaRow = row - blast.origin.row;
    const forward = deltaRow >= 0 ? deltaRow : -deltaRow;
    const sideT = deltaRow >= 0
      ? (pass * (blast.rows + 1.2) - forward) / 1.4
      : (Math.max(0, pass - 0.06) * (blast.rows + 1.2) - forward) / 1.6;
    return clamp01(sideT);
  }

  if (blast.kind === 'board_clear') {
    const order = blast.strikeOrder ?? blast.cells;
    const idx = order.findIndex((c) => c.row === row && c.col === col);
    if (idx < 0) return 0;
    const total = Math.max(order.length, 1);
    const hitAt = (idx + 0.08) / (total + 0.25);
    const v = clamp01((t - hitAt * 0.75) / 0.09);
    return v * v * (2 - v);
  }

  if (blast.kind === 'color_row' && blast.chainOrigins?.length) {
    const rows = [...new Set(blast.chainOrigins.map((o) => o.row))].sort((a, b) => a - b);
    if (!rows.includes(row)) return 0;
    const rowIndex = rows.indexOf(row);
    const count = rows.length;
    const hitAt = (rowIndex + 0.15) / (count + 0.35);
    const rowT = clamp01((t - hitAt * 0.5) / 0.22);
    const anchorCol = blast.chainOrigins.find((o) => o.row === row)?.col ?? blast.origin.col;
    const deltaCol = Math.abs(col - anchorCol);
    return clamp01((rowT * (blast.cols + 1.2) - deltaCol) / 1.4);
  }

  if (blast.kind === 'color_col' && blast.chainOrigins?.length) {
    const cols = [...new Set(blast.chainOrigins.map((o) => o.col))].sort((a, b) => a - b);
    if (!cols.includes(col)) return 0;
    const colIndex = cols.indexOf(col);
    const count = cols.length;
    const hitAt = (colIndex + 0.15) / (count + 0.35);
    const colT = clamp01((t - hitAt * 0.5) / 0.22);
    const anchorRow = blast.chainOrigins.find((o) => o.col === col)?.row ?? blast.origin.row;
    const deltaRow = Math.abs(row - anchorRow);
    return clamp01((colT * (blast.rows + 1.2) - deltaRow) / 1.4);
  }

  const order = blast.strikeOrder ?? blast.cells;
  const idx = order.findIndex((c) => c.row === row && c.col === col);
  if (idx < 0) return 0;

  const total = Math.max(order.length, 1);
  const hitAt = 0.2 + ((idx + 0.25) / (total + 0.5)) * 0.68;
  const strikeDur = 0.12;
  const v = clamp01((t - hitAt) / strikeDur);
  return v * v * (2 - v);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
