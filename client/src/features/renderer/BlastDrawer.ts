import { getCandyStyle } from '../candy/CandyTypes';
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
    drawColorThunder(ctx, blast, board, ox, oy, progress);
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
  if (blast.kind === 'color') {
    if (t < 0.1) return (t / 0.1) * 0.3;
    if (t < 0.17) return 0.72 * (1 - (t - 0.1) / 0.07);
    if (t > 0.78 && t < 0.92) return ((t - 0.78) / 0.14) * 0.1;
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
  if (blast.kind === 'color') {
    let spike = 1;
    if (progress > 0.09 && progress < 0.2) spike = 2.4;
    else if (progress > 0.14 && progress < 0.72) spike = 1.35 + Math.abs(Math.sin(progress * Math.PI * 28)) * 0.55;
    return 13 * decay * spike;
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

function drawColorThunder(
  ctx: CanvasRenderingContext2D,
  blast: SpecialBlast,
  board: { x: number; y: number; cell: number; w: number; h: number },
  ox: number,
  oy: number,
  progress: number,
): void {
  const style = blast.targetCategory ? getCandyStyle(blast.targetCategory) : null;
  const color = style?.color ?? '#FFD54F';
  const cell = board.cell;
  const boardW = board.cell * blast.cols;
  const boardH = board.cell * blast.rows;

  const chargeT = clamp01(progress / 0.12);
  const detonateT = clamp01((progress - 0.1) / 0.12);
  const strikePhase = clamp01((progress - 0.13) / 0.62);

  // Phase 1 — board dims, energy coils inward
  if (progress < 0.2) {
    const dim = chargeT * 0.5 + detonateT * 0.2;
    ctx.fillStyle = `rgba(12,4,32,${dim})`;
    ctx.fillRect(board.x, board.y, boardW, boardH);
  }

  drawColorVortex(ctx, ox, oy, cell, chargeT, color);

  // Phase 2 — detonation nova + radial shockwave
  if (detonateT > 0) {
    drawColorDetonation(ctx, ox, oy, cell, board, color, detonateT);
    drawBoardShockwave(ctx, ox, oy, board, color, detonateT);
    drawThunderBurst(ctx, ox, oy, cell, color, detonateT);
  }

  const order = blast.strikeOrder ?? blast.cells;
  const total = Math.max(order.length, 1);
  const targets = order.map((c) => ({
    x: board.x + c.col * cell + cell / 2,
    y: board.y + c.row * cell + cell / 2,
    cell: c,
  }));

  // Phase 3 — rapid lightning barrage + chain arcs between targets
  for (let i = 0; i < total; i++) {
    const hitAt = (i + 0.3) / (total + 0.6);
    const boltLife = clamp01((strikePhase - hitAt) / 0.14);
    if (boltLife <= 0) continue;

    const tx = targets[i].x;
    const ty = targets[i].y;
    const fade = 1 - boltLife * 0.65;
    const seed = i * 5.17 + progress * 9;

    if (boltLife < 0.35) {
      drawTargetPulse(ctx, tx, ty, cell, color, boltLife / 0.35);
    }

    drawLightningBolt(ctx, ox, oy, tx, ty, color, fade, seed, true);
    drawLightningBolt(ctx, ox, oy, tx, ty, color, fade * 0.5, seed + 2.9, false);

    if (boltLife > 0.2) {
      drawImpactNova(ctx, tx, ty, cell, color, clamp01((boltLife - 0.2) / 0.8));
    }

    if (i > 0 && boltLife > 0.15) {
      const prev = targets[i - 1];
      const chainAlpha = fade * 0.55;
      drawLightningBolt(ctx, prev.x, prev.y, tx, ty, color, chainAlpha, seed + 11, false);
    }
  }

  // Lingering electric web over struck cells
  if (strikePhase > 0.2) {
    const webAlpha = (1 - clamp01((progress - 0.55) / 0.45)) * 0.35;
    if (webAlpha > 0.02) {
      ctx.strokeStyle = `${color}${Math.floor(webAlpha * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      for (let i = 1; i < total; i++) {
        const a = targets[i - 1];
        const b = targets[i];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
  }

  // Target color label — snaps in at detonation
  if (style && progress > 0.11) {
    const chipAlpha = clamp01((progress - 0.11) / 0.08) * (progress < 0.82 ? 1 : (1 - progress) / 0.18);
    ctx.globalAlpha = chipAlpha;
    const label = style.label.toUpperCase();
    ctx.font = `bold ${Math.max(12, cell * 0.26)}px system-ui`;
    const tw = ctx.measureText(label).width + 18;
    const chipY = oy - cell * 0.88;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    roundRect(ctx, ox - tw / 2, chipY, tw, cell * 0.32, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ox, chipY + cell * 0.16);
    ctx.globalAlpha = 1;
  }
}

function drawColorVortex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  t: number,
  color: string,
): void {
  if (t <= 0) return;

  const squeeze = t < 0.7 ? t / 0.7 : 1 - (t - 0.7) / 0.3;
  const r = cell * (0.55 - squeeze * 0.25 + (t > 0.7 ? (t - 0.7) * 1.2 : 0));

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.15, color);
  g.addColorStop(0.45, `${color}BB`);
  g.addColorStop(1, 'rgba(88,28,180,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(r, cell * 0.12), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${0.9 * t})`;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  for (let ring = 0; ring < 2; ring++) {
    const ringR = cell * (0.3 + ring * 0.15 + t * 0.2);
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, t * Math.PI * 8, t * Math.PI * 8 + Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawColorDetonation(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cell: number,
  board: { x: number; y: number; w: number; h: number },
  color: string,
  t: number,
): void {
  const alpha = 1 - t;
  const maxR = Math.hypot(board.w, board.h) * 0.55;
  const r = cell * (0.3 + t * maxR / cell * 0.45);

  const nova = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
  nova.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
  nova.addColorStop(0.12, `${color}${Math.floor(alpha * 220).toString(16).padStart(2, '0')}`);
  nova.addColorStop(0.45, `rgba(140,80,255,${0.35 * alpha})`);
  nova.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = nova;
  ctx.beginPath();
  ctx.arc(ox, oy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`;
  ctx.lineWidth = 4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(ox - r * 0.35, oy);
  ctx.lineTo(ox + r * 0.35, oy);
  ctx.moveTo(ox, oy - r * 0.35);
  ctx.lineTo(ox, oy + r * 0.35);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawBoardShockwave(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  board: { x: number; y: number; w: number; h: number },
  color: string,
  t: number,
): void {
  const maxR = Math.hypot(board.w, board.h) * 0.65;
  const r = maxR * easeOutExpo(t);
  const alpha = (1 - t) * 0.85;

  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 3 + (1 - t) * 4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(ox, oy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `${color}${Math.floor(alpha * 160).toString(16).padStart(2, '0')}`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ox, oy, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawThunderBurst(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cell: number,
  color: string,
  t: number,
): void {
  const alpha = (1 - t) * 0.95;
  const len = cell * (0.8 + t * 2.2);
  const rays = 10;

  for (let i = 0; i < rays; i++) {
    const ang = (i / rays) * Math.PI * 2 + t * 1.5;
    const ex = ox + Math.cos(ang) * len;
    const ey = oy + Math.sin(ang) * len;
    const jx = ox + Math.cos(ang) * len * 0.45 + Math.sin(ang * 3 + i) * 6;
    const jy = oy + Math.sin(ang) * len * 0.45 + Math.cos(ang * 3 + i) * 6;
    drawLightningBolt(ctx, ox, oy, jx, jy, color, alpha * 0.7, i * 2.3 + t * 5, false);
    drawLightningBolt(ctx, jx, jy, ex, ey, color, alpha * 0.5, i * 3.1 + t * 5, false);
  }
}

function drawTargetPulse(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  cell: number,
  color: string,
  t: number,
): void {
  const r = cell * (0.2 + t * 0.35);
  const alpha = (1 - t) * 0.9;
  ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawImpactNova(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  cell: number,
  color: string,
  impact: number,
): void {
  const alpha = 1 - impact;
  const r = cell * (0.2 + impact * 0.7);

  const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.25, `${color}${Math.floor(alpha * 230).toString(16).padStart(2, '0')}`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(tx, ty, r * 0.65, 0, Math.PI * 2 * impact);
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let s = 0; s < 8; s++) {
    const ang = (s / 8) * Math.PI * 2 + impact * 3;
    const dist = r * (0.4 + impact);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(tx + Math.cos(ang) * dist, ty + Math.sin(ang) * dist, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLightningBolt(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  alpha: number,
  seed: number,
  thick: boolean,
): void {
  const segments = thick ? 9 : 6;
  const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];

  for (let i = 1; i < segments; i++) {
    const f = i / segments;
    const px = x1 + (x2 - x1) * f;
    const py = y1 + (y2 - y1) * f;
    const jitter = (segments - Math.abs(i - segments / 2)) * (thick ? 6 : 3.5);
    pts.push({
      x: px + Math.sin(seed + i * 2.1) * jitter,
      y: py + Math.cos(seed + i * 1.7) * jitter,
    });
  }
  pts.push({ x: x2, y: y2 });

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (thick) {
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 7;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = thick ? 4 : 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = thick ? 20 : 12;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = thick ? 2 : 1.5;
  ctx.shadowBlur = 10;
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

  const order = blast.strikeOrder ?? blast.cells;
  const idx = order.findIndex((c) => c.row === row && c.col === col);
  if (idx < 0) return 0;

  const total = Math.max(order.length, 1);
  const hitAt = 0.13 + ((idx + 0.3) / (total + 0.6)) * 0.62;
  const strikeDur = 0.1;
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
