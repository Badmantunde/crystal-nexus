import type { CrystalCategory } from '@crystal-nexus/shared';
import { getCandyStyle, type CandyShape } from '../candy/CandyTypes';
import { getFruitForCategory, getFruitSprite, getRainbowSprite, RAINBOW_PALETTE } from '../candy/fruitAssets';
import type { SpecialType } from '../candy/CandyCell';

export function drawCandy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  category: CrystalCategory,
  opts: {
    alpha?: number;
    scale?: number;
    shakeX?: number;
    shakeY?: number;
    special?: SpecialType;
    lite?: boolean;
    animTime?: number;
  } = {},
): void {
  const alpha = opts.alpha ?? 1;
  const scale = opts.scale ?? 1;
  const cx = x + (opts.shakeX ?? 0);
  const cy = y + (opts.shakeY ?? 0);

  if (opts.special === 'color') {
    drawRainbowFruit(ctx, cx, cy, size, scale, alpha, opts.animTime ?? 0, opts.lite);
    return;
  }

  const fruitKind = getFruitForCategory(category);
  const sprite = fruitKind ? getFruitSprite(fruitKind) : undefined;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (sprite) {
    const drawSize = size * 0.92 * scale;
    ctx.drawImage(sprite, cx - drawSize / 2, cy - drawSize / 2, drawSize, drawSize);
  } else {
    const style = getCandyStyle(category);
    const r = size * 0.38 * scale;

    if (!opts.lite) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.14, r * 0.82, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawShape(ctx, cx, cy, r, style.shape, style.color, style.dark, style.highlight);
  }

  if (opts.special && opts.special !== 'none') {
    const style = getCandyStyle(category);
    const r = size * 0.38 * scale;
    drawSpecialOverlay(ctx, cx, cy, r, opts.special, style.color);
  }

  ctx.restore();
}

function drawSpecialOverlay(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  special: SpecialType,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.lineCap = 'round';

  if (special === 'row') {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy);
    ctx.lineTo(cx + r * 0.55, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3, cy - r * 0.18);
    ctx.lineTo(cx - r * 0.55, cy);
    ctx.lineTo(cx - r * 0.3, cy + r * 0.18);
    ctx.moveTo(cx + r * 0.3, cy - r * 0.18);
    ctx.lineTo(cx + r * 0.55, cy);
    ctx.lineTo(cx + r * 0.3, cy + r * 0.18);
    ctx.stroke();
  } else if (special === 'col') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.55);
    ctx.lineTo(cx, cy + r * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.18, cy - r * 0.3);
    ctx.lineTo(cx, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.18, cy - r * 0.3);
    ctx.moveTo(cx - r * 0.18, cy + r * 0.3);
    ctx.lineTo(cx, cy + r * 0.55);
    ctx.lineTo(cx + r * 0.18, cy + r * 0.3);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRainbowFruit(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  scale: number,
  alpha: number,
  animTime: number,
  lite?: boolean,
): void {
  const t = animTime * 0.003;
  const pulse = 1 + Math.sin(t * 2.4) * 0.05;
  const drawSize = size * 0.98 * scale * pulse;

  if (!lite) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.35;
    for (let i = 0; i < RAINBOW_PALETTE.length; i++) {
      const ang = t * 1.8 + (i / RAINBOW_PALETTE.length) * Math.PI * 2;
      const ringR = drawSize * (0.52 + i * 0.04);
      ctx.strokeStyle = RAINBOW_PALETTE[i];
      ctx.lineWidth = 2.5;
      ctx.shadowColor = RAINBOW_PALETTE[i];
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, ang, ang + Math.PI * 0.55);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  const sprite = getRainbowSprite();
  ctx.save();
  ctx.globalAlpha = alpha;

  if (sprite) {
    ctx.shadowColor = '#FF6B9D';
    ctx.shadowBlur = lite ? 8 : 18;
    ctx.drawImage(sprite, cx - drawSize / 2, cy - drawSize / 2, drawSize, drawSize);
  } else {
    const r = drawSize * 0.42;
    const grad = ctx.createConicGradient(t * 2, cx, cy);
    RAINBOW_PALETTE.forEach((c, i) => grad.addColorStop(i / RAINBOW_PALETTE.length, c));
    ctx.fillStyle = grad;
    ctx.beginPath();
    star(ctx, cx, cy, r, r * 0.48, 5);
    ctx.fill();
  }

  ctx.restore();
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  shape: CandyShape,
  color: string,
  dark: string,
  highlight: string,
): void {
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, highlight);
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, dark);

  ctx.fillStyle = grad;
  ctx.beginPath();

  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 'square': {
      const s = r * 1.15;
      roundRect(ctx, cx - s / 2, cy - s / 2, s, s, r * 0.22);
      break;
    }
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.95, cy + r * 0.8);
      ctx.lineTo(cx - r * 0.95, cy + r * 0.8);
      ctx.closePath();
      break;
    case 'hexagon':
      polygon(ctx, cx, cy, r, 6, -Math.PI / 2);
      break;
    case 'star':
      star(ctx, cx, cy, r, r * 0.45, 5);
      break;
  }

  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.2, cy - r * 0.25, r * 0.32, r * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
): void {
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function polygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rot: number,
): void {
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function star(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
): void {
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = cx + rad * Math.cos(a);
    const py = cy + rad * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
