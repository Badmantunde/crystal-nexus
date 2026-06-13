import {
  SimpleBoard,
  type CellPos,
  type SwipeAxis,
  type SpecialBlast,
  type FallMove,
} from '../match3/SimpleBoard';
import { drawCandy } from './CandyDrawer';
import { drawLineBlast, blastCellVanish, blastScreenFlash, blastShakeIntensity } from './BlastDrawer';
import { HUD } from '../ui/HUD';
import { PraiseOverlay } from '../ui/PraiseOverlay';
import {
  praiseForBlast,
  praiseForCombo,
  praiseForClearCount,
  praiseForSpawn,
} from '../ui/PraiseSystem';
import { LevelCompleteCard, calcStars } from '../ui/LevelCompleteCard';
import { LevelWelcomeCard } from '../ui/LevelWelcomeCard';
import { QuitConfirmModal } from '../ui/QuitConfirmModal';
import { LivesManager, MAX_LIVES } from '../player/Lives';
import { LevelProgress } from '../player/LevelProgress';
import {
  buildLevelConfig,
  getStageTheme,
  type LevelConfig,
  type StageTheme,
} from '../player/LevelDifficulty';
import {
  countTotalStars,
  getAvatarInitials,
  getRankFromStars,
} from '../player/PlayerProfile';

const ROWS = 8;
const COLS = 8;
const SWIPE_PX = 18;

type Phase = 'idle' | 'swap' | 'revert' | 'blast' | 'shake' | 'vanish' | 'fall' | 'pause';

interface DragState {
  row: number;
  col: number;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

interface AnimCell {
  row: number;
  col: number;
  shakeT: number;
  vanishT: number;
}

export class CanvasGame {
  onReturnToMap: (() => void) | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: SimpleBoard;
  private hud: HUD;
  private praise: PraiseOverlay;
  private levelCard: LevelCompleteCard;
  private levelWelcome: LevelWelcomeCard;
  private quitModal: QuitConfirmModal;
  private level = 1;
  private levelConfig: LevelConfig = buildLevelConfig(1);
  private stageTheme: StageTheme = getStageTheme('easy');
  private peakCombo = 0;
  private levelEnded = false;
  private phase: Phase = 'idle';
  private drag: DragState | null = null;
  private animCells: AnimCell[] = [];
  private swapPair: { a: CellPos; b: CellPos } | null = null;
  private swapProgress = 0;
  private animStart = 0;
  private animDuration = 0;
  private animResolve: (() => void) | null = null;
  private raf = 0;
  private boardPx = { x: 0, y: 0, cell: 0, w: 0, h: 0 };
  private bgCanvas: HTMLCanvasElement | null = null;
  private pendingSwipe: { r1: number; c1: number; r2: number; c2: number; axis: SwipeAxis } | null =
    null;
  private activeBlast: SpecialBlast | null = null;
  private blastProgress = 0;
  private fallMoves: FallMove[] = [];
  private fallProgress = 0;
  private fallMovingFrom: Set<string> | null = null;
  private lives: LivesManager;
  private levelProgress: LevelProgress;
  private dirty = true;
  private visible = false;
  private tutorialShown = false;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.className = 'game-hidden';
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;

    container.innerHTML = '';
    container.appendChild(this.canvas);

    this.hud = new HUD();
    this.lives = new LivesManager();
    this.levelProgress = new LevelProgress();
    this.praise = new PraiseOverlay();
    this.levelCard = new LevelCompleteCard();
    this.levelWelcome = new LevelWelcomeCard();
    this.quitModal = new QuitConfirmModal();
    this.board = new SimpleBoard(ROWS, COLS, 30);

    this.hud.setOnQuit(() => this.requestQuit());
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    const loop = (t: number) => {
      if (this.visible) {
        this.tick(t);
        const animating =
          this.phase !== 'idle' || this.drag !== null || this.activeBlast !== null;
        if (this.dirty || animating) {
          this.draw();
          this.dirty = animating;
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
  }

  show(): void {
    this.visible = true;
    this.canvas.classList.remove('game-hidden');
    this.markDirty();
  }

  hide(): void {
    this.visible = false;
    this.canvas.classList.add('game-hidden');
    this.levelWelcome.hide();
    this.levelCard.hide();
    this.quitModal.hide();
    this.phase = 'idle';
  }

  beginLevel(level: number): void {
    if (!this.lives.canPlay()) {
      this.hud.showToast('No lives left!', 3000);
      this.onReturnToMap?.();
      return;
    }
    this.startLevel(level);
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.min(window.innerWidth, 420);
    const h = Math.min(window.innerHeight, w * (16 / 9));

    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = 14;
    const top = 168;
    const boardW = w - pad * 2;
    const boardH = h - top - pad;
    const cell = Math.floor(Math.min(boardW / COLS, boardH / ROWS));
    const gridW = cell * COLS;
    const gridH = cell * ROWS;

    this.boardPx = {
      x: (w - gridW) / 2,
      y: top + (boardH - gridH) / 2,
      cell,
      w: gridW,
      h: gridH,
    };

    this.cacheBackground(w, h);
    this.dirty = true;
  }

  private markDirty(): void {
    this.dirty = true;
  }

  private cacheBackground(w: number, h: number): void {
    const theme = this.stageTheme;
    const { x, y, cell, w: bw, h: bh } = this.boardPx;
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = w;
    this.bgCanvas.height = h;
    const bctx = this.bgCanvas.getContext('2d')!;

    const bg = bctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, theme.bg[0]);
    bg.addColorStop(0.45, theme.bg[1]);
    bg.addColorStop(1, theme.bg[2]);
    bctx.fillStyle = bg;
    bctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 6; i++) {
      const sx = ((i * 97 + 13) % 100) / 100 * w;
      const sy = ((i * 53 + 29) % 100) / 100 * h;
      const g = bctx.createRadialGradient(sx, sy, 0, sx, sy, 50);
      g.addColorStop(0, theme.glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      bctx.fillStyle = g;
      bctx.beginPath();
      bctx.arc(sx, sy, 50, 0, Math.PI * 2);
      bctx.fill();
    }

    bctx.fillStyle = theme.frame;
    roundRectPath(bctx, x - 12, y - 12, bw + 24, bh + 24, 18);
    bctx.fill();

    bctx.strokeStyle = theme.frameBorder;
    bctx.lineWidth = 2;
    roundRectPath(bctx, x - 12, y - 12, bw + 24, bh + 24, 18);
    bctx.stroke();

    roundRectPath(bctx, x - 4, y - 4, bw + 8, bh + 8, 12);
    bctx.fillStyle = theme.inner;
    bctx.fill();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const even = (r + c) % 2 === 0;
        bctx.fillStyle = even ? theme.cellEven : theme.cellOdd;
        bctx.fillRect(x + c * cell + 1, y + r * cell + 1, cell - 2, cell - 2);
        if (even) {
          bctx.fillStyle = theme.cellShine;
          bctx.fillRect(x + c * cell + 3, y + r * cell + 3, cell - 6, cell - 6);
        }
      }
    }
  }

  private cellCenter(row: number, col: number): { x: number; y: number } {
    const { x, y, cell } = this.boardPx;
    return { x: x + col * cell + cell / 2, y: y + row * cell + cell / 2 };
  }

  private cacheFallMovingFrom(): void {
    this.fallMovingFrom = new Set(
      this.fallMoves
        .filter((m) => m.fromRow !== m.toRow || m.isNew)
        .map((m) => `${m.fromRow},${m.col}`),
    );
  }

  private fallDelay(move: FallMove): number {
    const dist = Math.abs(move.toRow - move.fromRow);
    return move.isNew ? 0.04 * (-move.fromRow) : dist * 0.025;
  }

  private fallT(move: FallMove): number {
    const delay = this.fallDelay(move);
    return clamp01((this.fallProgress - delay) / Math.max(0.01, 1 - delay));
  }

  private posToCell(clientX: number, clientY: number): CellPos | null {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x, y, cell } = this.boardPx;
    const col = Math.floor((px - x) / cell);
    const row = Math.floor((py - y) / cell);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    return { row, col };
  }

  private bindInput(): void {
    this.canvas.style.touchAction = 'none';

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.phase !== 'idle' || this.isInputBlocked()) return;
      const cell = this.posToCell(e.clientX, e.clientY);
      if (!cell || !this.board.getCell(cell.row, cell.col)) return;
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      this.drag = {
        row: cell.row,
        col: cell.col,
        startX: e.clientX,
        startY: e.clientY,
        curX: e.clientX,
        curY: e.clientY,
      };
      this.markDirty();
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      e.preventDefault();
      this.drag.curX = e.clientX;
      this.drag.curY = e.clientY;
      this.markDirty();

      const dx = this.drag.curX - this.drag.startX;
      const dy = this.drag.curY - this.drag.startY;
      if (Math.hypot(dx, dy) >= SWIPE_PX) {
        const axis: SwipeAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        let tRow = this.drag.row;
        let tCol = this.drag.col;
        if (axis === 'horizontal') tCol += dx > 0 ? 1 : -1;
        else tRow += dy > 0 ? 1 : -1;

        if (tRow >= 0 && tRow < ROWS && tCol >= 0 && tCol < COLS) {
          this.pendingSwipe = {
            r1: this.drag.row,
            c1: this.drag.col,
            r2: tRow,
            c2: tCol,
            axis,
          };
          this.drag = null;
          try {
            this.canvas.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
      }
    });

    const end = (e: PointerEvent) => {
      if (this.drag) {
        try {
          this.canvas.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        this.drag = null;
      }
    };

    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  private tick(now: number): void {
    if (this.isInputBlocked()) return;

    if (this.pendingSwipe && this.phase === 'idle') {
      const s = this.pendingSwipe;
      this.pendingSwipe = null;
      void this.trySwap(s.r1, s.c1, s.r2, s.c2, s.axis);
      return;
    }

    if (this.phase === 'swap') {
      const t = Math.min((now - this.animStart) / this.animDuration, 1);
      this.swapProgress = easeOutCubic(t);
      if (t >= 1) this.finishAnim();
    } else if (this.phase === 'revert') {
      const t = Math.min((now - this.animStart) / this.animDuration, 1);
      this.swapProgress = 1 - easeOutCubic(t);
      if (t >= 1) {
        this.swapPair = null;
        this.phase = 'idle';
        this.finishAnim();
      }
    } else if (this.phase === 'blast') {
      const t = Math.min((now - this.animStart) / this.animDuration, 1);
      this.blastProgress = t;
      if (t >= 1) this.finishAnim();
    } else if (this.phase === 'shake') {
      const t = Math.min((now - this.animStart) / this.animDuration, 1);
      for (const c of this.animCells) c.shakeT = t;
      if (t >= 1) this.finishAnim();
    } else if (this.phase === 'vanish') {
      const t = Math.min((now - this.animStart) / this.animDuration, 1);
      for (const c of this.animCells) c.vanishT = t;
      if (t >= 1) this.finishAnim();
    } else if (this.phase === 'fall') {
      const t = Math.min((now - this.animStart) / this.animDuration, 1);
      this.fallProgress = t;
      if (t >= 1) this.finishAnim();
    } else if (this.phase === 'pause') {
      if (now - this.animStart >= this.animDuration) this.finishAnim();
    }
  }

  private startAnim(phase: Phase, duration: number): Promise<void> {
    this.phase = phase;
    this.animStart = performance.now();
    this.animDuration = duration;
    this.markDirty();
    return new Promise((resolve) => {
      this.animResolve = resolve;
    });
  }

  private finishAnim(): void {
    const resolve = this.animResolve;
    this.animResolve = null;
    resolve?.();
  }

  private async trySwap(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    axis: SwipeAxis,
  ): Promise<void> {
    if (!this.board.isAdjacent(r1, c1, r2, c2)) return;

    const valid = this.board.wouldMatchAfterSwap(r1, c1, r2, c2);

    this.swapPair = { a: { row: r1, col: c1 }, b: { row: r2, col: c2 } };
    this.swapProgress = 0;
    await this.startAnim('swap', 95);

    if (!valid) {
      await this.startAnim('revert', 90);
      return;
    }

    this.board.playerSwap(r1, c1, r2, c2, axis);
    this.swapPair = null;
    this.board.resetCombo();

    const blast = this.board.detectSpecialBlast(r1, c1, r2, c2);
    if (blast) {
      await this.playBlastAnimation(blast);
      this.board.commitSpecialBlast(blast);
      this.activeBlast = null;
      this.fallMoves = this.board.computeFallMoves();
      this.cacheFallMovingFrom();
      this.fallProgress = 0;
      await this.startAnim('fall', 260);
      this.board.applyFallMoves(this.fallMoves);
      this.fallMoves = [];
      this.fallMovingFrom = null;
      this.markDirty();
      const blastCombo = praiseForCombo(this.board.getCombo());
      if (blastCombo) this.praise.show(blastCombo);
    }

    await this.runMatchSequence();
    this.updateHud();
    this.checkWin();
    this.phase = 'idle';
  }

  private async playBlastAnimation(blast: SpecialBlast): Promise<void> {
    this.activeBlast = blast;
    this.blastProgress = 0;
    this.praise.show(praiseForBlast(blast.kind, blast.targetCategory), blast.kind === 'color' ? 1100 : 1400);
    const duration =
      blast.kind === 'color' ? 500
      : blast.kind === 'cross' ? 620
      : blast.kind === 'col_double' ? 680
      : 520;
    await this.startAnim('blast', duration);
  }

  private async runMatchSequence(): Promise<void> {
    while (true) {
      const wave = this.board.peekWave();
      if (!wave) break;

      const matchBlasts = this.board.detectMatchedSpecialBlasts(wave.cells);
      if (matchBlasts.length > 0) {
        for (const blast of matchBlasts) {
          await this.playBlastAnimation(blast);
          this.board.commitSpecialBlast(blast);
          this.activeBlast = null;
          this.fallMoves = this.board.computeFallMoves();
          this.cacheFallMovingFrom();
          this.fallProgress = 0;
          await this.startAnim('fall', 260);
          this.board.applyFallMoves(this.fallMoves);
          this.fallMoves = [];
          this.fallMovingFrom = null;
          this.markDirty();
        }
        const combo = this.board.getCombo();
        this.peakCombo = Math.max(this.peakCombo, combo);
        const comboPraise = praiseForCombo(combo);
        if (comboPraise) this.praise.show(comboPraise);
        await this.startAnim('pause', 50);
        continue;
      }

      this.animCells = wave.cells.map((c) => ({ ...c, shakeT: 0, vanishT: 0 }));

      const clearPraise = praiseForClearCount(wave.cells.length);
      if (clearPraise) this.praise.show(clearPraise);

      if (wave.spawn) {
        this.praise.show(praiseForSpawn(wave.spawn.cell.special));
      }

      await this.startAnim('shake', 220);
      await this.startAnim('vanish', 180);

      this.board.clearWaveCells(wave);
      this.fallMoves = this.board.computeFallMoves();
      this.cacheFallMovingFrom();
      this.fallProgress = 0;
      this.animCells = [];

      const newCount = this.fallMoves.filter((m) => m.isNew).length;
      const fallDur = 220 + Math.min(newCount, 6) * 12;
      await this.startAnim('fall', fallDur);
      this.board.applyFallMoves(this.fallMoves);
      this.fallMoves = [];
      this.fallMovingFrom = null;
      this.markDirty();

      const combo = this.board.getCombo();
      this.peakCombo = Math.max(this.peakCombo, combo);
      const comboPraise = praiseForCombo(combo);
      if (comboPraise) this.praise.show(comboPraise);

      await this.startAnim('pause', 50);
    }
  }

  private updateHud(): void {
    const totalStars = countTotalStars(this.levelProgress);
    const rank = getRankFromStars(totalStars).name;
    const score = this.board.getScore();
    const target = this.getTargetScore();
    const isMonster = this.levelConfig.difficulty === 'monster';

    this.hud.update({
      score,
      moves: this.board.getMoves(),
      combo: this.board.getCombo(),
      level: this.level,
      lives: this.lives.getLives(),
      maxLives: MAX_LIVES,
      rank,
      avatar: getAvatarInitials(),
      targetScore: target,
      difficultyLabel: this.stageTheme.label,
      difficultyClass: this.stageTheme.hudClass,
      isBossFight: isMonster,
      bossName: 'Nexus Beast',
      bossHp: isMonster ? Math.max(0, target - score) : undefined,
      bossMaxHp: isMonster ? target : undefined,
    });
  }

  private getTargetScore(): number {
    return this.levelConfig.targetScore;
  }

  private requestQuit(): void {
    if (this.levelEnded || this.quitModal.isVisible()) return;
    this.quitModal.show(() => this.quitToMap());
  }

  private quitToMap(): void {
    this.levelEnded = true;
    this.lives.loseLife();
    this.levelCard.hide();
    this.quitModal.hide();
    this.onReturnToMap?.();
  }

  private isInputBlocked(): boolean {
    return (
      !this.visible ||
      this.levelEnded ||
      this.levelCard.isVisible() ||
      this.levelWelcome.isVisible() ||
      this.quitModal.isVisible()
    );
  }

  private checkWin(): void {
    if (this.levelCard.isVisible()) return;

    const target = this.getTargetScore();
    const score = this.board.getScore();
    const movesLeft = this.board.getMoves();

    if (score >= target) {
      this.levelEnded = true;
      const stars = calcStars(score, target, movesLeft);
      this.levelProgress.recordWin(this.level, stars);
      this.praise.show({ text: 'Level Complete!', tier: 'legendary', sub: `Level ${this.level}` }, 1800);
      setTimeout(() => this.showLevelEndCard(true), 600);
    } else if (movesLeft <= 0) {
      this.levelEnded = true;
      this.lives.loseLife();
      this.updateHud();
      setTimeout(() => this.showLevelEndCard(false), 400);
    }
  }

  private showLevelEndCard(won: boolean): void {
    if (this.levelCard.isVisible()) return;

    const target = this.getTargetScore();
    const score = this.board.getScore();
    const movesLeft = this.board.getMoves();

    this.levelCard.show(
      {
        level: this.level,
        score,
        targetScore: target,
        movesLeft,
        maxCombo: this.peakCombo,
        stars: calcStars(score, target, movesLeft),
        won,
      },
      {
        canReplay: this.lives.canPlay(),
        onNext: () => {
          this.level++;
          this.startLevel(this.level);
        },
        onReplay: () => {
          if (!this.lives.canPlay()) {
            this.hud.showToast('No lives left!', 3000);
            return;
          }
          this.startLevel(this.level);
        },
        onMap: () => {
          this.onReturnToMap?.();
        },
      },
    );
  }

  private startLevel(level: number): void {
    this.level = level;
    this.levelConfig = buildLevelConfig(level);
    this.stageTheme = getStageTheme(this.levelConfig.difficulty);
    this.peakCombo = 0;
    this.levelEnded = false;
    this.board = new SimpleBoard(ROWS, COLS, this.levelConfig.moves);
    this.phase = 'idle';
    this.quitModal.hide();
    this.levelCard.hide();

    const w = Math.min(window.innerWidth, 420);
    const h = Math.min(window.innerHeight, w * (16 / 9));
    this.cacheBackground(w, h);

    this.updateHud();
    this.markDirty();

    if (!this.tutorialShown) {
      this.tutorialShown = true;
      this.hud.showToast('Match 4 = row/col bomb · Match 5 = color bomb', 4500);
    } else if (this.levelConfig.difficulty !== 'easy') {
      this.hud.showToast(`${this.stageTheme.label} — reach ${this.levelConfig.targetScore.toLocaleString()} pts`, 3200);
    }
  }

  private draw(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    const { cell } = this.boardPx;

    let camX = 0;
    let camY = 0;
    if (this.phase === 'blast' && this.activeBlast) {
      const intensity = blastShakeIntensity(this.activeBlast, this.blastProgress);
      camX = Math.sin(this.blastProgress * Math.PI * 24) * intensity;
      camY = Math.cos(this.blastProgress * Math.PI * 20) * intensity * 0.75;
    }

    this.ctx.save();
    this.ctx.translate(camX, camY);

    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0, w, h);
    }

    const shakeMap = new Map(this.animCells.map((a) => [`${a.row},${a.col}`, a]));
    const dragging = this.drag && this.phase === 'idle';
    const blast = this.activeBlast;
    const blastCellSet = blast ? new Set(blast.cells.map((c) => `${c.row},${c.col}`)) : null;

    if (this.phase === 'fall' && this.fallMoves.length > 0) {
      this.drawFallingCandies(cell);
    } else {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          this.drawBoardCandy(r, c, cell, shakeMap, blast, blastCellSet, dragging);
        }
      }
    }

    if (blast && this.blastProgress > 0) {
      drawLineBlast(this.ctx, blast, this.blastProgress, this.boardPx);
    }

    this.ctx.restore();

    if (blast && this.phase === 'blast') {
      const flash = blastScreenFlash(blast, this.blastProgress);
      if (flash > 0.01) {
        this.ctx.fillStyle = `rgba(255,255,255,${flash})`;
        this.ctx.fillRect(0, 0, w, h);
      }
    }
  }

  private drawBoardCandy(
    r: number,
    c: number,
    cell: number,
    shakeMap: Map<string, AnimCell>,
    blast: SpecialBlast | null,
    blastCellSet: Set<string> | null,
    dragging: boolean | null,
  ): void {
    const candy = this.board.getCell(r, c);
    if (!candy) return;

    const key = `${r},${c}`;
    const center = this.cellCenter(r, c);
    let shakeX = 0;
    let shakeY = 0;
    let alpha = 1;
    let scale = 1;

    if (blast && blastCellSet?.has(key)) {
      const vanish = blastCellVanish(blast, r, c, this.blastProgress);
      if (vanish > 0) {
        const kick = blast.kind === 'color' ? 10 : 8;
        shakeX = Math.sin(vanish * Math.PI * 8) * (1 - vanish) * kick;
        shakeY = Math.cos(vanish * Math.PI * 6) * (1 - vanish) * kick * 0.85;
      }
      alpha = 1 - vanish;
      scale = 1 - vanish * 0.65;
      if (alpha < 0.02) return;
    }

    const anim = shakeMap.get(key);
    if (anim) {
      shakeX = Math.sin(anim.shakeT * Math.PI * 14) * (1 - anim.vanishT) * 6;
      shakeY = Math.cos(anim.shakeT * Math.PI * 10) * (1 - anim.vanishT) * 4;
      alpha = 1 - anim.vanishT;
      scale = 1 - anim.vanishT * 0.6;
      if (alpha < 0.02) return;
    }

    let ox = 0;
    let oy = 0;

    if (this.swapPair && (this.phase === 'swap' || this.phase === 'revert')) {
      const { a, b } = this.swapPair;
      const t = this.swapProgress;
      if (a.row === r && a.col === c) {
        const from = this.cellCenter(a.row, a.col);
        const to = this.cellCenter(b.row, b.col);
        ox = (to.x - from.x) * t;
        oy = (to.y - from.y) * t;
      } else if (b.row === r && b.col === c) {
        const from = this.cellCenter(b.row, b.col);
        const to = this.cellCenter(a.row, a.col);
        ox = (to.x - from.x) * t;
        oy = (to.y - from.y) * t;
      }
    } else if (dragging && this.drag!.row === r && this.drag!.col === c) {
      const ddx = this.drag!.curX - this.drag!.startX;
      const ddy = this.drag!.curY - this.drag!.startY;
      const cap = cell * 0.48;
      ox = Math.max(-cap, Math.min(cap, ddx * 0.55));
      oy = Math.max(-cap, Math.min(cap, ddy * 0.55));
    }

    drawCandy(this.ctx, center.x + ox, center.y + oy, cell, candy.category, {
      alpha,
      scale,
      shakeX,
      shakeY,
      special: candy.special,
      lite: true,
    });
  }

  private drawFallingCandies(cell: number): void {
    const movingFrom = this.fallMovingFrom ?? new Set<string>();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (movingFrom.has(`${r},${c}`)) continue;
        const candy = this.board.getCell(r, c);
        if (!candy) continue;
        const center = this.cellCenter(r, c);
        drawCandy(this.ctx, center.x, center.y, cell, candy.category, {
          special: candy.special,
          lite: true,
        });
      }
    }

    for (const move of this.fallMoves) {
      const t = easeOutBounce(this.fallT(move));
      const visualRow = move.fromRow + (move.toRow - move.fromRow) * t;
      const center = this.cellCenter(visualRow, move.col);
      const dropScale = move.isNew ? 0.9 + t * 0.1 : 1;

      drawCandy(this.ctx, center.x, center.y, cell, move.candy.category, {
        scale: dropScale,
        alpha: move.isNew ? 0.75 + t * 0.25 : 1,
        special: move.candy.special,
        lite: true,
      });
    }
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  rad: number,
): void {
  ctx.beginPath();
  ctx.moveTo(rx + rad, ry);
  ctx.lineTo(rx + rw - rad, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
  ctx.lineTo(rx + rw, ry + rh - rad);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
  ctx.lineTo(rx + rad, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
  ctx.lineTo(rx, ry + rad);
  ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
  ctx.closePath();
}
