import {
  SimpleBoard,
  type CellPos,
  type SwipeAxis,
  type SpecialBlast,
  type FallMove,
} from '../match3/SimpleBoard';
import { drawCandy } from './CandyDrawer';
import { preloadFruitSprites } from '../candy/fruitAssets';
import { drawLineBlast, blastCellVanish, blastScreenFlash, blastShakeIntensity, drawRainbowScreenFlash } from './BlastDrawer';
import { drawTileModifiers } from './ModifierDrawer';
import { getModifiersForLevel } from '../match3/BoardModifiers';
import { consumeArmedBooster } from '../player/Boosters';
import { recordLoss, recordWin, winStreakLabel } from '../player/WinStreak';
import { HUD } from '../ui/HUD';
import { PraiseOverlay } from '../ui/PraiseOverlay';
import { GuideCharacter } from '../ui/GuideCharacter';
import { SoundEngine } from '../audio/SoundEngine';
import {
  praiseForBlast,
  praiseForCombo,
  praiseForClearCount,
  praiseForSpawn,
} from '../ui/PraiseSystem';
import { LevelCompleteCard, calcStars } from '../ui/LevelCompleteCard';
import { DayChallengeResultCard } from '../ui/DayChallengeResultCard';
import { coinsForStars, grantCoins, purchaseContinue, purchaseSkipStage } from '../player/Economy';
import {
  buildDayChallengeConfig,
  consumeDayChallengeEntry,
  getDayChallengeStreak,
  recordDayChallengeResult,
  type DayChallengeConfig,
} from '../player/DayChallenge';
import { LevelWelcomeCard } from '../ui/LevelWelcomeCard';
import { QuitConfirmModal } from '../ui/QuitConfirmModal';
import { LivesManager, MAX_LIVES, formatRegenCountdown } from '../player/Lives';
import { LevelProgress } from '../player/LevelProgress';
import {
  applyDifficultyThemeClass,
  clearDifficultyThemeClass,
  getDifficultyTag,
  getStageTheme,
  getUIColors,
  type LevelConfig,
  type StageTheme,
} from '../player/LevelDifficulty';
import { buildMapNavState } from '../player/playerNavState';
import {
  isLevelTargetComplete,
  type LevelTarget,
} from '../player/LevelObjectives';
import { buildLevelConfig, buildScriptedLevelTarget, getLevelTagline } from '../player/LevelScript';
import { consumePracticeShield, hasPracticeShield } from '../player/PracticeShield';
import { ContinueModal } from '../ui/ContinueModal';

const ROWS = 8;
const COLS = 8;
const SWIPE_PX = 12;
const DRAG_FOLLOW = 0.92;
const GAME_BOARD_URL = '/game-board.svg';
const GAME_BOARD_VIEWBOX = 350;
const GAME_BOARD_GRID_X = 7;
const GAME_BOARD_GRID_Y = 6.5;
const GAME_BOARD_GRID_SIZE = 336;
const HUD_BOARD_GAP = 40;

type Phase = 'idle' | 'swap' | 'revert' | 'blast' | 'shake' | 'vanish' | 'fall' | 'pause';

interface DragState {
  row: number;
  col: number;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  axis?: SwipeAxis;
  neighborRow?: number;
  neighborCol?: number;
}

interface AnimCell {
  row: number;
  col: number;
  shakeT: number;
  vanishT: number;
}

type GameMode = 'story' | 'day';

export class CanvasGame {
  onReturnToMap: (() => void) | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: SimpleBoard;
  private hud: HUD;
  private praise: PraiseOverlay;
  private guide: GuideCharacter;
  private levelCard: LevelCompleteCard;
  private dayResultCard: DayChallengeResultCard;
  private levelWelcome: LevelWelcomeCard;
  private quitModal: QuitConfirmModal;
  private continueModal: ContinueModal;
  private level = 1;
  private levelConfig: LevelConfig = buildLevelConfig(1);
  private levelTarget: LevelTarget = buildScriptedLevelTarget(1, buildLevelConfig(1));
  private stageTheme: StageTheme = getStageTheme('easy');
  private peakCombo = 0;
  private lastCoinsEarned = 0;
  private gameMode: GameMode = 'story';
  private dayConfig: DayChallengeConfig | null = null;
  private continueUsedThisSession = false;
  private dayBossHp = 0;
  private levelEnded = false;
  private phase: Phase = 'idle';
  private drag: DragState | null = null;
  private animCells: AnimCell[] = [];
  private swapPair: { a: CellPos; b: CellPos } | null = null;
  private swapProgress = 0;
  private swapAnimFrom = 0;
  private swipeLock = false;
  private animStart = 0;
  private animDuration = 0;
  private animResolve: (() => void) | null = null;
  private raf = 0;
  private boardPx = { x: 0, y: 0, cell: 0, w: 0, h: 0 };
  private boardLayer: HTMLCanvasElement | null = null;
  private boardLayerKey = '';
  private canvasRect: DOMRect | null = null;
  private boardImage: HTMLImageElement;
  private boardImageReady = false;
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
  private nearMissShown = false;
  private lastLivesTick = 0;
  private animTime = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.className = 'game-hidden';
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.boardImage = new Image();
    this.boardImage.onload = () => {
      this.boardImageReady = true;
      this.markDirty();
    };
    this.boardImage.src = GAME_BOARD_URL;
    void preloadFruitSprites().then(() => this.markDirty());

    container.innerHTML = '';
    container.appendChild(this.canvas);

    this.hud = new HUD();
    this.lives = new LivesManager();
    this.levelProgress = new LevelProgress();
    this.praise = new PraiseOverlay();
    this.guide = new GuideCharacter();
    this.levelCard = new LevelCompleteCard();
    this.dayResultCard = new DayChallengeResultCard();
    this.levelWelcome = new LevelWelcomeCard();
    this.quitModal = new QuitConfirmModal();
    this.continueModal = new ContinueModal();
    this.board = new SimpleBoard(ROWS, COLS, 30);

    this.hud.setOnQuit(() => this.requestQuit());
    this.hud.setOnSettings(() => this.hud.showToast('Settings coming soon', 2200));
    this.hud.setOnRestart(() => this.restartLevel());
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    const loop = (t: number) => {
      this.animTime = t;
      if (this.visible) {
        const atZeroLives = this.lives.getLives() === 0;
        if ((this.lives.hasPendingRegen() || atZeroLives) && t - this.lastLivesTick >= 1000) {
          this.lastLivesTick = t;
          if (this.lives.hasPendingRegen()) this.lives.tick();
          this.updateHud();
        }
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
    document.getElementById('ui-overlay')?.classList.remove('hud-hidden');
    this.resize();
    requestAnimationFrame(() => {
      if (this.visible) this.resize();
    });
    this.markDirty();
  }

  hide(): void {
    this.visible = false;
    this.canvas.classList.add('game-hidden');
    document.getElementById('ui-overlay')?.classList.add('hud-hidden');
    clearDifficultyThemeClass();
    this.levelWelcome.hide();
    this.levelCard.hide();
    this.dayResultCard.hide();
    this.quitModal.hide();
    this.continueModal.hide();
    this.phase = 'idle';
  }

  beginLevel(level: number): void {
    this.gameMode = 'story';
    this.dayConfig = null;
    if (!this.lives.canPlay()) {
      this.showNoLivesToast();
      this.onReturnToMap?.();
      return;
    }
    this.startLevel(level);
  }

  beginDayChallenge(): void {
    this.gameMode = 'day';
    this.dayConfig = buildDayChallengeConfig();
    this.startDayChallenge();
  }

  private showNoLivesToast(): void {
    const ms = this.lives.getNextRegenMs();
    const msg =
      ms !== null
        ? `No lives! Next life in ${formatRegenCountdown(ms)}`
        : 'No lives left!';
    this.hud.shakeLives();
    this.hud.showToast(msg, 4000);
  }

  private gameLayoutScale(vw: number, vh: number): number {
    const pad = 12;
    return Math.min(1, (vw - pad) / 390, (vh - pad) / 780);
  }

  private bottomChromeReserve(vh: number, scale: number): number {
    const compact = vh < 720;
    const base = compact ? 84 : 100;
    return Math.round(base * scale);
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = this.visible ? this.gameLayoutScale(vw, vh) : 1;
    const overlay = document.getElementById('ui-overlay');
    overlay?.style.setProperty('--game-ui-scale', String(scale));
    if (overlay) void overlay.offsetHeight;

    const w = Math.min(520, Math.floor(420 * scale), vw - 12);

    let topChrome = Math.round(168 * scale);
    if (this.visible) {
      const stats = document.getElementById('hud-board-stats');
      if (stats) {
        const statsRect = stats.getBoundingClientRect();
        if (statsRect.height > 0) topChrome = Math.round(statsRect.bottom + 4);
      }
    }

    const bottomReserve = this.bottomChromeReserve(vh, scale);
    const maxCanvasH = Math.max(240, vh - topChrome - bottomReserve);
    const h = maxCanvasH;

    const container = document.getElementById('game-container');
    if (container) {
      if (this.visible) {
        container.style.alignItems = 'flex-start';
        container.style.justifyContent = 'center';
        container.style.paddingTop = `${Math.max(0, topChrome - 4)}px`;
        container.style.paddingBottom = `${bottomReserve}px`;
        container.style.boxSizing = 'border-box';
      } else {
        container.style.alignItems = '';
        container.style.justifyContent = '';
        container.style.paddingTop = '';
        container.style.paddingBottom = '';
        container.style.boxSizing = '';
      }
    }

    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = 8;
    let top = this.computeBoardTop(w, h, pad);
    const boardW = w - pad * 2;
    let boardH = h - top - pad;
    let cell = Math.floor(Math.min(boardW / COLS, boardH / ROWS));

    if (cell < 12) {
      top = Math.min(vh < 700 ? 128 : 148, Math.round(h * 0.26));
      boardH = h - top - pad;
      cell = Math.floor(Math.min(boardW / COLS, boardH / ROWS));
    }

    const gridW = cell * COLS;
    const gridH = cell * ROWS;

    this.boardPx = {
      x: (w - gridW) / 2,
      y: top + (boardH - gridH) / 2,
      cell,
      w: gridW,
      h: gridH,
    };

    this.rebuildBoardLayer(w, h);
    this.positionBoardFooter();
    this.dirty = true;
  }

  private boardLayerCacheKey(w: number, h: number): string {
    return `${w}x${h}|${this.levelConfig.difficulty}`;
  }

  private invalidateBoardLayer(): void {
    this.boardLayerKey = '';
  }

  /** Keep HUD_BOARD_GAP between target/moves cards and the top of the game board art. */
  private boardImageTopForLayout(top: number, w: number, h: number, pad: number): number {
    const boardW = w - pad * 2;
    const boardH = h - top - pad;
    if (boardH <= 0) return Number.POSITIVE_INFINITY;

    const cell = Math.floor(Math.min(boardW / COLS, boardH / ROWS));
    if (cell <= 0) return Number.POSITIVE_INFINITY;

    const gridH = cell * ROWS;
    const scaleY = gridH / GAME_BOARD_GRID_SIZE;
    return top + (boardH - gridH) / 2 - GAME_BOARD_GRID_Y * scaleY;
  }

  private computeBoardTop(w: number, h: number, pad: number): number {
    const stats = document.getElementById('hud-board-stats');
    const canvasRect = this.canvas.getBoundingClientRect();

    let targetImageTop = 168;
    if (this.visible && stats && canvasRect.height > 0) {
      const statsRect = stats.getBoundingClientRect();
      targetImageTop = statsRect.bottom - canvasRect.top + HUD_BOARD_GAP;
      targetImageTop = Math.max(120, Math.min(targetImageTop, h - 200));
    }

    let lo = 100;
    let hi = h - pad - 64;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const imageTop = this.boardImageTopForLayout(mid, w, h, pad);
      if (imageTop < targetImageTop) lo = mid;
      else hi = mid;
    }

    return Math.round((lo + hi) / 2);
  }

  private positionBoardFooter(): void {
    const rect = this.canvas.getBoundingClientRect();
    const board = this.boardImageRect();
    const centerX = rect.left + board.x + board.w / 2;
    const boardBottom = rect.top + board.y + board.h;
    this.hud.setBoardFooterAnchor(boardBottom, centerX);
  }

  private markDirty(): void {
    this.dirty = true;
  }

  private rebuildBoardLayer(w?: number, h?: number): void {
    const dpr = window.devicePixelRatio || 1;
    const layerW = w ?? this.canvas.width / Math.min(dpr, 2);
    const layerH = h ?? this.canvas.height / Math.min(dpr, 2);
    if (layerW <= 0 || layerH <= 0) return;

    const key = this.boardLayerCacheKey(layerW, layerH);
    if (this.boardLayer && this.boardLayerKey === key) return;

    this.boardLayer = document.createElement('canvas');
    this.boardLayer.width = layerW;
    this.boardLayer.height = layerH;
    this.boardLayerKey = key;
    const bctx = this.boardLayer.getContext('2d')!;

    const colors = getUIColors(this.levelConfig.difficulty);
    const bg = bctx.createLinearGradient(0, 0, 0, layerH);
    bg.addColorStop(0, colors.bgTop);
    bg.addColorStop(1, colors.bgBottom);
    bctx.fillStyle = bg;
    bctx.fillRect(0, 0, layerW, layerH);
  }

  private drawBoardFrame(): void {
    const colors = getUIColors(this.levelConfig.difficulty);
    const rect = this.boardImageRect();
    const difficulty = this.levelConfig.difficulty;

    if (this.boardImageReady) {
      this.ctx.save();
      if (difficulty === 'hard') {
        this.ctx.filter = 'hue-rotate(58deg) saturate(1.12)';
      } else if (difficulty === 'monster') {
        this.ctx.filter = 'hue-rotate(145deg) saturate(1.2) brightness(1.03)';
      }
      this.ctx.drawImage(this.boardImage, rect.x, rect.y, rect.w, rect.h);
      this.ctx.restore();
      return;
    }

    this.ctx.fillStyle = colors.boardFallbackFill;
    roundRectPath(this.ctx, rect.x, rect.y, rect.w, rect.h, rect.w * 0.07);
    this.ctx.fill();
    this.ctx.strokeStyle = colors.border;
    this.ctx.lineWidth = 2;
    roundRectPath(this.ctx, rect.x, rect.y, rect.w, rect.h, rect.w * 0.07);
    this.ctx.stroke();
  }

  private cellCenter(row: number, col: number): { x: number; y: number } {
    const { x, y, cell } = this.boardPx;
    return { x: x + col * cell + cell / 2, y: y + row * cell + cell / 2 };
  }

  private boardImageRect(): { x: number; y: number; w: number; h: number } {
    const { x, y, w, h } = this.boardPx;
    const scaleX = w / GAME_BOARD_GRID_SIZE;
    const scaleY = h / GAME_BOARD_GRID_SIZE;
    return {
      x: x - GAME_BOARD_GRID_X * scaleX,
      y: y - GAME_BOARD_GRID_Y * scaleY,
      w: GAME_BOARD_VIEWBOX * scaleX,
      h: GAME_BOARD_VIEWBOX * scaleY,
    };
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
    const rect = this.canvasRect ?? this.canvas.getBoundingClientRect();
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
      this.canvasRect = this.canvas.getBoundingClientRect();
      this.canvas.setPointerCapture(e.pointerId);
      this.swapAnimFrom = 0;
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
      if (!this.drag || this.swipeLock) return;
      e.preventDefault();
      this.drag.curX = e.clientX;
      this.drag.curY = e.clientY;

      const dx = this.drag.curX - this.drag.startX;
      const dy = this.drag.curY - this.drag.startY;

      if (!this.drag.axis && Math.hypot(dx, dy) >= 8) {
        const axis: SwipeAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        let nRow = this.drag.row;
        let nCol = this.drag.col;
        if (axis === 'horizontal') nCol += dx > 0 ? 1 : -1;
        else nRow += dy > 0 ? 1 : -1;

        if (nRow >= 0 && nRow < ROWS && nCol >= 0 && nCol < COLS) {
          this.drag.axis = axis;
          this.drag.neighborRow = nRow;
          this.drag.neighborCol = nCol;
        }
      }

      if (Math.hypot(dx, dy) >= SWIPE_PX && this.drag.axis) {
        const axis = this.drag.axis;
        const r1 = this.drag.row;
        const c1 = this.drag.col;
        const r2 = this.drag.neighborRow!;
        const c2 = this.drag.neighborCol!;
        const along = axis === 'horizontal' ? dx : dy;
        const cell = this.boardPx.cell;
        this.swapAnimFrom = clamp01((Math.abs(along) * DRAG_FOLLOW) / cell);

        this.swipeLock = true;
        this.drag = null;
        this.canvasRect = null;
        try {
          this.canvas.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        void this.trySwap(r1, c1, r2, c2, axis).finally(() => {
          this.swipeLock = false;
        });
        return;
      }

      this.markDirty();
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
      this.canvasRect = null;
    };

    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  private tick(now: number): void {
    if (this.isInputBlocked()) return;

    if (this.phase === 'swap') {
      const t = Math.min((now - this.animStart) / this.animDuration, 1);
      this.swapProgress = this.swapAnimFrom + (1 - this.swapAnimFrom) * easeOutCubic(t);
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
    if (!this.board.isAdjacent(r1, c1, r2, c2) || this.phase !== 'idle') return;

    this.swapPair = { a: { row: r1, col: c1 }, b: { row: r2, col: c2 } };
    this.swapProgress = this.swapAnimFrom;
    SoundEngine.playSwap();
    await this.startAnim('swap', 80);

    const valid = this.board.wouldMatchAfterSwap(r1, c1, r2, c2);
    if (!valid) {
      await this.startAnim('revert', 75);
      return;
    }

    this.board.playerSwap(r1, c1, r2, c2, axis, { skipValidate: true });
    this.swapPair = null;
    this.board.resetCombo();

    const blast = this.board.detectSpecialBlast(r1, c1, r2, c2);
    if (blast) {
      await this.playBlastAnimation(blast);
      this.board.commitSpecialBlast(blast);
      this.dealBossDamage(blast.cells.length);
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
      if (blastCombo) this.showComboFeedback(blastCombo);
    }

    await this.runMatchSequence();
    this.updateHud();
    this.checkNearMiss();
    this.checkWin();
    this.phase = 'idle';
  }

  private async playBlastAnimation(blast: SpecialBlast): Promise<void> {
    this.activeBlast = blast;
    this.blastProgress = 0;
    const rainbowKinds = new Set(['color', 'color_row', 'color_col', 'board_clear']);
    this.praise.show(
      praiseForBlast(blast.kind, blast.targetCategory),
      rainbowKinds.has(blast.kind) ? 1400 : 1400,
    );
    if (blast.kind === 'board_clear') SoundEngine.playBoardClear();
    else if (rainbowKinds.has(blast.kind)) SoundEngine.playRainbow();
    else SoundEngine.playSpecial();
    const duration =
      blast.kind === 'board_clear' ? 1050
      : blast.kind === 'color_row' || blast.kind === 'color_col' ? 920
      : blast.kind === 'color' ? 820
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
          this.dealBossDamage(blast.cells.length);
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
        if (comboPraise) this.showComboFeedback(comboPraise);
        await this.startAnim('pause', 50);
        continue;
      }

      this.animCells = wave.cells.map((c) => ({ ...c, shakeT: 0, vanishT: 0 }));

      const clearPraise = praiseForClearCount(wave.cells.length);
      if (clearPraise) this.praise.show(clearPraise);
      SoundEngine.playMatch(this.board.getCombo());

      if (wave.spawn) {
        this.praise.show(praiseForSpawn(wave.spawn.cell.special));
        if (wave.spawn.cell.special === 'color') SoundEngine.playRainbow();
        else SoundEngine.playSpecial();
      }

      await this.startAnim('shake', 220);
      await this.startAnim('vanish', 180);

      this.board.clearWaveCells(wave);
      this.dealBossDamage(wave.cells.length);
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
      if (comboPraise) this.showComboFeedback(comboPraise);

      await this.startAnim('pause', 50);
    }
  }

  private showComboFeedback(msg: import('../ui/PraiseSystem').PraiseMessage): void {
    this.praise.show(msg);
    SoundEngine.playCombo(msg.combo ?? 2);
    this.updateHud();
  }

  private checkNearMiss(): void {
    if (this.levelEnded || this.gameMode === 'day') return;
    const moves = this.board.getMoves();
    if (moves > 3) {
      this.nearMissShown = false;
      return;
    }
    if (moves <= 0 || this.nearMissShown) return;

    const won = isLevelTargetComplete(
      this.levelTarget,
      this.board.getScore(),
      this.board.getCollectedCounts(),
    );
    if (won) return;

    this.nearMissShown = true;
    SoundEngine.playNearMiss();
    this.guide.say(`Only ${moves} move${moves === 1 ? '' : 's'} left — make it count!`, 3000);
  }

  private updateHud(): void {
    const nav = buildMapNavState({
      level: this.gameMode === 'day' ? this.levelProgress.getUnlockedLevel() : this.level,
      lives: this.lives.getLives(),
      livesRegenMs: this.lives.getNextRegenMs(),
      progress: this.levelProgress,
    });

    if (this.gameMode === 'day' && this.dayConfig) {
      const cfg = this.dayConfig;
      if (cfg.mode === 'coin_rush') {
        this.hud.update({
          nav,
          score: this.board.getScore(),
          moves: this.board.getMoves(),
          combo: this.board.getCombo(),
          level: nav.level,
          maxLives: MAX_LIVES,
          targetTask: 'rush',
          rushCoins: this.board.getRushCoins(),
          rushTarget: cfg.rushTarget ?? 100,
          difficultyClass: 'hud-theme-easy',
          difficultyTag: 'RUSH',
        });
      } else if (cfg.mode === 'boss_brawl') {
        this.hud.update({
          nav,
          score: this.board.getScore(),
          moves: this.board.getMoves(),
          combo: this.board.getCombo(),
          level: nav.level,
          maxLives: MAX_LIVES,
          targetTask: 'boss',
          bossHp: this.dayBossHp,
          bossHpMax: cfg.bossHp ?? 800,
          difficultyClass: 'diff-monster',
          difficultyTag: 'BOSS',
        });
      } else {
        this.hud.update({
          nav,
          score: this.board.getScore(),
          moves: this.board.getMoves(),
          combo: this.board.getCombo(),
          level: nav.level,
          maxLives: MAX_LIVES,
          targetTask: 'score',
          targetScore: cfg.scoreTarget ?? 1500,
          difficultyClass: 'hud-theme-easy',
          difficultyTag: cfg.mode === 'fruit_frenzy' ? 'FRENZY' : 'LIMIT',
        });
      }
      return;
    }

    this.hud.update({
      nav,
      score: this.board.getScore(),
      moves: this.board.getMoves(),
      combo: this.board.getCombo(),
      level: this.level,
      maxLives: MAX_LIVES,
      targetTask: this.levelTarget.taskType,
      targetScore: this.levelTarget.scoreTarget,
      objectives: this.levelTarget.collectObjectives,
      collected: this.board.getCollectedCounts(),
      difficultyClass: this.stageTheme.hudClass,
      difficultyTag: getDifficultyTag(this.levelConfig.tier),
    });
  }

  private getTargetScore(): number {
    return this.levelConfig.targetScore;
  }

  private restartLevel(): void {
    if (!this.visible || this.levelEnded) return;
    if (
      this.levelCard.isVisible() ||
      this.dayResultCard.isVisible() ||
      this.continueModal.isVisible() ||
      this.levelWelcome.isVisible() ||
      this.quitModal.isVisible()
    ) {
      return;
    }
    if (this.gameMode === 'day') {
      this.startDayChallenge();
      return;
    }
    if (!this.lives.canPlay()) {
      this.showNoLivesToast();
      return;
    }
    this.startLevel(this.level);
  }

  private requestQuit(): void {
    if (this.levelEnded || this.quitModal.isVisible()) return;
    this.quitModal.show(() => this.quitToMap());
  }

  private quitToMap(): void {
    this.levelEnded = true;
    if (this.gameMode === 'story') {
      this.maybeLoseLife();
    }
    this.levelCard.hide();
    this.dayResultCard.hide();
    this.quitModal.hide();
    this.continueModal.hide();
    this.onReturnToMap?.();
  }

  private maybeLoseLife(): void {
    if (hasPracticeShield(this.level)) {
      consumePracticeShield(this.level);
      this.hud.showToast('Practice shield — no life lost', 2800);
      return;
    }
    this.lives.loseLife();
  }

  private isInputBlocked(): boolean {
    return (
      !this.visible ||
      this.levelEnded ||
      this.levelCard.isVisible() ||
      this.dayResultCard.isVisible() ||
      this.continueModal.isVisible() ||
      this.levelWelcome.isVisible() ||
      this.quitModal.isVisible()
    );
  }

  private checkWin(): void {
    if (this.levelCard.isVisible() || this.dayResultCard.isVisible() || this.continueModal.isVisible()) {
      return;
    }

    if (this.gameMode === 'day' && this.dayConfig) {
      this.checkDayChallengeWin();
      return;
    }

    const target = this.getTargetScore();
    const score = this.board.getScore();
    const movesLeft = this.board.getMoves();
    const won = isLevelTargetComplete(
      this.levelTarget,
      score,
      this.board.getCollectedCounts(),
    );

    if (won) {
      this.levelEnded = true;
      const stars = calcStars(score, target, movesLeft);
      this.levelProgress.recordWin(this.level, stars);
      this.lastCoinsEarned = grantCoins(coinsForStars(stars));
      SoundEngine.playWin();
      SoundEngine.playCoin();
      const streak = recordWin();
      const streakMsg = winStreakLabel(streak);
      this.praise.show({ text: 'Level Complete!', tier: 'legendary', sub: streakMsg || `Level ${this.level}` }, 1800);
      if (streak >= 3) this.guide.say(`You're on fire — ${streak} wins straight!`, 3200);
      setTimeout(() => this.showLevelEndCard(true), 600);
    } else if (movesLeft <= 0) {
      if (this.canOfferContinue()) {
        this.showContinuePrompt();
        return;
      }
      this.levelEnded = true;
      this.applyLevelFail();
    }
  }

  private canOfferContinue(): boolean {
    return this.gameMode === 'story' && !this.continueUsedThisSession;
  }

  private showContinuePrompt(): void {
    this.continueModal.show({
      onContinue: () => {
        const result = purchaseContinue();
        if (!result.ok) {
          this.hud.showToast(result.message, 3500);
          this.levelEnded = true;
          this.applyLevelFail();
          return;
        }
        this.board.addMoves(5);
        this.continueUsedThisSession = true;
        this.updateHud();
        this.hud.showToast(result.message, 2200);
      },
      onGiveUp: () => {
        this.levelEnded = true;
        this.applyLevelFail();
      },
    });
  }

  private applyLevelFail(): void {
    recordLoss();
    SoundEngine.playLose();
    this.maybeLoseLife();
    this.updateHud();
    setTimeout(() => this.showLevelEndCard(false), 400);
  }

  private dealBossDamage(cellsCleared: number): void {
    if (this.gameMode !== 'day' || this.dayConfig?.mode !== 'boss_brawl') return;
    this.dayBossHp = Math.max(0, this.dayBossHp - cellsCleared * 18);
    if (this.dayBossHp <= 0) {
      this.checkDayChallengeWin();
    }
  }

  private checkDayChallengeWin(): void {
    if (!this.dayConfig) return;

    const movesLeft = this.board.getMoves();
    const score = this.board.getScore();
    let won = false;

    switch (this.dayConfig.mode) {
      case 'coin_rush':
        won = this.board.getRushCoins() >= (this.dayConfig.rushTarget ?? 100);
        break;
      case 'move_limit':
      case 'fruit_frenzy':
        won = score >= (this.dayConfig.scoreTarget ?? 1500);
        break;
      case 'boss_brawl':
        won = this.dayBossHp <= 0;
        break;
    }

    if (won) {
      this.levelEnded = true;
      this.praise.show(
        { text: 'Challenge Clear!', tier: 'legendary', sub: this.dayConfig.modeLabel },
        1800,
      );
      setTimeout(() => this.showDayEndCard(true), 600);
    } else if (movesLeft <= 0) {
      this.levelEnded = true;
      setTimeout(() => this.showDayEndCard(false), 400);
    }
  }

  private showDayEndCard(won: boolean): void {
    if (!this.dayConfig || this.dayResultCard.isVisible()) return;

    const rewards = recordDayChallengeResult({
      dateKey: this.dayConfig.dateKey,
      mode: this.dayConfig.mode,
      won,
      rushCoins: this.board.getRushCoins(),
      score: this.board.getScore(),
      peakCombo: this.peakCombo,
    });

    this.dayResultCard.show(
      {
        modeLabel: this.dayConfig.modeLabel,
        rushCoins: this.board.getRushCoins(),
        rushTarget: this.dayConfig.rushTarget,
        score: this.board.getScore(),
        scoreTarget: this.dayConfig.scoreTarget,
        bossHpLeft: this.dayBossHp,
        movesLeft: this.board.getMoves(),
        maxCombo: this.peakCombo,
        won,
        coinsEarned: rewards.total,
        beatBest: rewards.beatBest,
        streak: won ? getDayChallengeStreak() : 0,
      },
      {
        onMap: () => this.onReturnToMap?.(),
        onRetry: () => {
          const entry = consumeDayChallengeEntry(this.dayConfig!.dateKey);
          if (!entry.ok) {
            this.hud.showToast(entry.message, 3500);
            this.onReturnToMap?.();
            return;
          }
          this.levelEnded = false;
          this.startDayChallenge();
        },
        canRetry: true,
      },
    );
  }

  private showLevelEndCard(won: boolean): void {
    if (this.levelCard.isVisible()) return;

    const target = this.getTargetScore();
    const score = this.board.getScore();
    const movesLeft = this.board.getMoves();

    const stars = calcStars(score, target, movesLeft);

    this.levelCard.show(
      {
        level: this.level,
        score,
        targetScore: target,
        movesLeft,
        maxCombo: this.peakCombo,
        stars,
        won,
        coinsEarned: won ? this.lastCoinsEarned : 0,
      },
      {
        canReplay: this.lives.canPlay(),
        onNext: () => {
          this.level++;
          this.startLevel(this.level);
        },
        onReplay: () => {
          if (!this.lives.canPlay()) {
            this.showNoLivesToast();
            return;
          }
          this.startLevel(this.level);
        },
        onMap: () => {
          this.onReturnToMap?.();
        },
        showSkip: !won && this.levelProgress.canSkipLevel(this.level),
        onSkip: () => {
          const result = purchaseSkipStage(this.levelProgress, this.level);
          if (!result.ok) {
            this.hud.showToast(result.message, 3500);
            return;
          }
          this.onReturnToMap?.();
        },
      },
    );
  }

  private startDayChallenge(): void {
    if (!this.dayConfig) return;

    this.level = 0;
    this.peakCombo = 0;
    this.levelEnded = false;
    this.dayBossHp = this.dayConfig.bossHp ?? 0;

    const boardOpts: import('../match3/SimpleBoard').SimpleBoardOptions = {
      seed: this.dayConfig.seed,
      coinRush: this.dayConfig.mode === 'coin_rush',
      frenzyCategory: this.dayConfig.frenzyCategory,
    };

    this.board = new SimpleBoard(ROWS, COLS, this.dayConfig.moves, boardOpts);
    this.phase = 'idle';
    this.swipeLock = false;
    this.stageTheme = getStageTheme('easy');
    applyDifficultyThemeClass('hud-theme-easy');
    this.invalidateBoardLayer();
    this.quitModal.hide();
    this.levelCard.hide();
    this.dayResultCard.hide();

    this.updateHud();
    this.resize();
    requestAnimationFrame(() => {
      if (this.visible) this.resize();
    });
    this.markDirty();
    const cfg = this.dayConfig;
    const toast =
      cfg.mode === 'coin_rush'
        ? `Coin Rush — collect ${cfg.rushTarget} coins`
        : cfg.mode === 'boss_brawl'
          ? `Boss Brawl — deplete ${cfg.bossHp} HP`
          : cfg.mode === 'fruit_frenzy'
            ? `Fruit Frenzy — score ${cfg.scoreTarget?.toLocaleString()} (3× fruit bonus)`
            : `Move Limit — score ${cfg.scoreTarget?.toLocaleString()} in ${cfg.moves} moves`;
    this.hud.showToast(toast, 4200);
  }

  private applyArmedBooster(): void {
    const booster = consumeArmedBooster();
    if (booster !== 'row_bomb') return;

    const candidates: CellPos[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board.getCell(r, c) && !this.board.isCrate(r, c)) {
          candidates.push({ row: r, col: c });
        }
      }
    }
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
    this.board.setSpecial(pick.row, pick.col, 'row');
    this.hud.showToast('Row bomb booster activated!', 2800);
  }

  private startLevel(level: number): void {
    this.gameMode = 'story';
    this.dayConfig = null;
    this.continueUsedThisSession = false;
    this.level = level;
    this.levelConfig = buildLevelConfig(level);
    this.levelTarget = buildScriptedLevelTarget(level, this.levelConfig);
    this.stageTheme = getStageTheme(this.levelConfig.difficulty);
    applyDifficultyThemeClass(this.stageTheme.hudClass);
    this.peakCombo = 0;
    this.levelEnded = false;
    this.nearMissShown = false;
    const modifiers = getModifiersForLevel(level, ROWS, COLS);
    this.board = new SimpleBoard(ROWS, COLS, this.levelConfig.moves, { modifiers });
    this.applyArmedBooster();
    this.phase = 'idle';
    this.swipeLock = false;
    this.invalidateBoardLayer();
    this.quitModal.hide();
    this.continueModal.hide();
    this.levelCard.hide();

    this.updateHud();
    this.resize();
    requestAnimationFrame(() => {
      if (this.visible) this.resize();
    });
    this.markDirty();

    setTimeout(() => this.guide.tipForLevel(level), 600);

    const tagline = getLevelTagline(level);
    if (tagline) {
      this.hud.showToast(tagline, 3800);
    } else if (!this.tutorialShown) {
      this.tutorialShown = true;
      this.hud.showToast('Match 4 = row/col bomb · Match 5 = rainbow fruit', 4500);
    } else if (modifiers && (modifiers.jelly.length > 0 || modifiers.crates.length > 0)) {
      this.hud.showToast('Clear jelly twice · break crates with adjacent matches', 3600);
    } else if (hasPracticeShield(level)) {
      this.hud.showToast('Practice shield — first try is free', 3200);
    } else if (this.levelConfig.difficulty !== 'easy') {
      const goal =
        this.levelTarget.taskType === 'collect'
          ? 'collect the fruit targets'
          : `reach ${this.levelConfig.targetScore.toLocaleString()} pts`;
      this.hud.showToast(`${this.stageTheme.label} — ${goal}`, 3200);
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

    if (this.boardLayer && this.boardLayerKey === this.boardLayerCacheKey(w, h)) {
      this.ctx.drawImage(this.boardLayer, 0, 0, w, h);
    } else {
      this.rebuildBoardLayer(w, h);
      if (this.boardLayer) this.ctx.drawImage(this.boardLayer, 0, 0, w, h);
    }

    this.drawBoardFrame();

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

    if (this.board.hasModifiers()) {
      drawTileModifiers(this.ctx, this.board, cell, this.boardPx.x, this.boardPx.y);
    }

    if (blast && this.blastProgress > 0) {
      drawLineBlast(this.ctx, blast, this.blastProgress, this.boardPx);
    }

    this.ctx.restore();

    if (blast && this.phase === 'blast') {
      const flash = blastScreenFlash(blast, this.blastProgress);
      if (flash > 0.01) {
        if (blast.kind === 'color' || blast.kind === 'board_clear') {
          drawRainbowScreenFlash(this.ctx, w, h, flash, this.blastProgress);
        } else {
          this.ctx.fillStyle = `rgba(255,255,255,${flash})`;
          this.ctx.fillRect(0, 0, w, h);
        }
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
        const kick =
          blast.kind === 'board_clear' ? 14
          : blast.kind === 'color' || blast.kind === 'color_row' || blast.kind === 'color_col' ? 12
          : 8;
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
    } else if (dragging && this.drag) {
      const d = this.drag;
      const cap = cell * 0.48;
      let ddx = d.curX - d.startX;
      let ddy = d.curY - d.startY;

      if (d.axis === 'horizontal') ddy = 0;
      else if (d.axis === 'vertical') ddx = 0;

      const dragOx = Math.max(-cap, Math.min(cap, ddx * DRAG_FOLLOW));
      const dragOy = Math.max(-cap, Math.min(cap, ddy * DRAG_FOLLOW));

      if (d.row === r && d.col === c) {
        ox = dragOx;
        oy = dragOy;
      } else if (d.neighborRow === r && d.neighborCol === c) {
        ox = -dragOx;
        oy = -dragOy;
      }
    }

    drawCandy(this.ctx, center.x + ox, center.y + oy, cell, candy.category, {
      alpha,
      scale,
      shakeX,
      shakeY,
      special: candy.special,
      lite: true,
      animTime: this.animTime,
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
          animTime: this.animTime,
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
        animTime: this.animTime,
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
