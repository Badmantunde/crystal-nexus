import type { SimpleBoard } from '../match3/SimpleBoard';

export function drawTileModifiers(
  ctx: CanvasRenderingContext2D,
  board: SimpleBoard,
  cell: number,
  originX: number,
  originY: number,
): void {
  const rows = board.rows;
  const cols = board.cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + c * cell;
      const y = originY + r * cell;
      const pad = cell * 0.08;

      if (board.isCrate(r, c)) {
        ctx.fillStyle = 'rgba(62, 39, 18, 0.92)';
        ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.9)';
        ctx.lineWidth = Math.max(2, cell * 0.06);
        ctx.strokeRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
        ctx.strokeStyle = 'rgba(210, 160, 90, 0.5)';
        ctx.beginPath();
        ctx.moveTo(x + pad, y + pad);
        ctx.lineTo(x + cell - pad, y + cell - pad);
        ctx.moveTo(x + cell - pad, y + pad);
        ctx.lineTo(x + pad, y + cell - pad);
        ctx.stroke();
        continue;
      }

      const jelly = board.getJellyHits(r, c);
      if (jelly > 0) {
        const alpha = jelly >= 2 ? 0.45 : 0.28;
        ctx.fillStyle = `rgba(120, 255, 180, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2, cell * 0.18);
        ctx.fill();
        ctx.strokeStyle = `rgba(60, 200, 120, ${alpha + 0.2})`;
        ctx.lineWidth = Math.max(1.5, cell * 0.04);
        ctx.stroke();
      }
    }
  }
}
