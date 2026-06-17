import { TopBanner } from './TopBanner';
import type { MapNavState } from './MapNavBar';
import type { LevelObjective, TargetTaskType } from '../player/LevelObjectives';
import { getObjectiveRemainingCount } from '../player/LevelObjectives';
import type { FruitKind } from '../candy/fruitAssets';
import { FRUIT_URLS } from '../candy/fruitAssets';
import type { CrystalCategory } from '@crystal-nexus/shared';
import { SoundEngine } from '../audio/SoundEngine';

const HUD_FRUIT_ORDER: FruitKind[] = ['orange', 'apple', 'pear'];
const VOLUME_MUTED_KEY = 'cn-muted';

function hudFruitImg(kind: FruitKind): string {
  return `<img class="hud-fruit" src="${FRUIT_URLS[kind]}" width="22" height="22" alt="" aria-hidden="true" />`;
}

export interface HUDState {
  nav: MapNavState;
  score: number;
  moves: number;
  level: number;
  maxLives: number;
  difficultyClass?: string;
  difficultyTag?: string;
  targetTask?: TargetTaskType;
  targetScore?: number;
  objectives?: LevelObjective[];
  collected?: Readonly<Partial<Record<CrystalCategory, number>>>;
  rushCoins?: number;
  rushTarget?: number;
  bossHp?: number;
  bossHpMax?: number;
  combo?: number;
  message?: string;
}

export class HUD {
  private hudRoot: HTMLElement;
  private banner: TopBanner;
  private targetCardEl: HTMLElement;
  private targetScoreValEl: HTMLElement;
  private targetProgressFillEl: HTMLElement;
  private movesEl: HTMLElement;
  private messageEl: HTMLElement;
  private targetItemEls: HTMLElement[];
  private boardFooterEl: HTMLElement;
  private sideToolbarEl: HTMLElement;
  private diffTextEl: HTMLElement;
  private restartBtn: HTMLButtonElement;
  private volumeBtn: HTMLButtonElement;
  private onRestart: (() => void) | null = null;
  private onQuit: (() => void) | null = null;
  private onSettings: (() => void) | null = null;
  private muted = false;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`HUD container #${containerId} not found`);

    container.innerHTML = `
      <div class="hud">
        <div class="hud-top">
        <div id="hud-banner-slot"></div>
        <div class="hud-board-stats">
          <div class="hud-score-card hud-target-card hud-target-card--score" id="hud-target-card">
            <div class="hud-card-head">
              <span class="hud-card-icon"></span>
              <span class="hud-card-label">Target</span>
            </div>
            <div class="hud-target-score-panel" id="hud-target-score-panel">
              <span class="hud-target-score-val" id="hud-target-score-val">0/120</span>
              <div class="hud-target-progress-track">
                <div class="hud-target-progress-fill" id="hud-target-progress-fill"></div>
              </div>
            </div>
            <div class="hud-target-row" id="hud-target-collect-panel">
              <div class="hud-target-item" data-fruit="orange">
                ${hudFruitImg('orange')}
                <span class="hud-target-count" id="hud-target-orange">120</span>
              </div>
              <div class="hud-target-item" data-fruit="apple">
                ${hudFruitImg('apple')}
                <span class="hud-target-count" id="hud-target-apple">120</span>
              </div>
              <div class="hud-target-item" data-fruit="pear">
                ${hudFruitImg('pear')}
                <span class="hud-target-count" id="hud-target-pear">120</span>
              </div>
            </div>
          </div>
          <div class="hud-moves-card">
            <div class="hud-card-head">
              <span class="hud-card-icon"></span>
              <span class="hud-card-label">Moves</span>
            </div>
            <div class="hud-moves-body">
              <span class="hud-moves-value" id="hud-moves">30</span>
              <span class="hud-moves-sub">Moves Left</span>
            </div>
          </div>
        </div>
        </div>
        <div class="hud-board-footer" id="hud-board-footer">
          <div class="hud-board-footer-row">
            <div class="hud-diff-pill" id="hud-diff-pill">
              <div class="hud-diff-pill-outer" aria-hidden="true"></div>
              <div class="hud-diff-pill-inner">
                <span class="hud-diff-pill-text" id="hud-diff-text">EASY</span>
              </div>
            </div>
            <button type="button" class="hud-icon-btn" id="hud-restart" aria-label="Restart level">
              <img src="/refresh.svg" width="24" height="24" alt="" />
            </button>
          </div>
        </div>
        <div class="hud-side-toolbar" id="hud-side-toolbar">
          <button type="button" class="hud-icon-btn" id="hud-exit" aria-label="Exit level">
            <img src="/exit.svg" width="24" height="24" alt="" />
          </button>
          <button type="button" class="hud-icon-btn" id="hud-settings" aria-label="Settings">
            <img src="/setting.svg" width="24" height="24" alt="" />
          </button>
          <button type="button" class="hud-icon-btn" id="hud-volume" aria-label="Toggle sound">
            <img src="/volume.svg" width="24" height="24" alt="" />
          </button>
        </div>
        <div class="hud-message" id="hud-message"></div>
      </div>
    `;

    this.hudRoot = container.querySelector('.hud')!;
    this.banner = new TopBanner(container.querySelector('#hud-banner-slot')!, {
      showQuit: false,
    });
    this.targetCardEl = container.querySelector('#hud-target-card')!;
    this.targetScoreValEl = container.querySelector('#hud-target-score-val')!;
    this.targetProgressFillEl = container.querySelector('#hud-target-progress-fill')!;
    this.movesEl = container.querySelector('#hud-moves')!;
    this.messageEl = container.querySelector('#hud-message')!;
    this.targetItemEls = [
      container.querySelector('#hud-target-orange')!,
      container.querySelector('#hud-target-apple')!,
      container.querySelector('#hud-target-pear')!,
    ];
    this.boardFooterEl = container.querySelector('#hud-board-footer')!;
    this.sideToolbarEl = container.querySelector('#hud-side-toolbar')!;
    this.diffTextEl = container.querySelector('#hud-diff-text')!;
    this.restartBtn = container.querySelector('#hud-restart')!;
    this.volumeBtn = container.querySelector('#hud-volume')!;

    this.restartBtn.addEventListener('click', () => this.onRestart?.());
    container.querySelector('#hud-exit')!.addEventListener('click', () => this.onQuit?.());
    container.querySelector('#hud-settings')!.addEventListener('click', () => this.onSettings?.());

    this.muted = localStorage.getItem(VOLUME_MUTED_KEY) === '1';
    SoundEngine.setMuted(this.muted);
    this.syncVolumeButton();
    this.volumeBtn.addEventListener('click', () => {
      this.muted = !this.muted;
      SoundEngine.setMuted(this.muted);
      localStorage.setItem(VOLUME_MUTED_KEY, this.muted ? '1' : '0');
      this.syncVolumeButton();
      if (!this.muted) SoundEngine.playUi();
    });
  }

  isMuted(): boolean {
    return SoundEngine.isMuted();
  }

  private syncVolumeButton(): void {
    this.volumeBtn.classList.toggle('hud-icon-btn--muted', this.muted);
    this.volumeBtn.setAttribute('aria-label', this.muted ? 'Unmute sound' : 'Mute sound');
  }

  setBoardFooterAnchor(boardBottom: number, centerX: number): void {
    const vh = window.innerHeight;
    const compact = vh < 720;
    const footerGap = compact ? 8 : 12;
    const footerRowHeight = compact ? 36 : 40;
    const toolbarH = compact ? 36 : 40;
    const safeBottom = Math.max(8, parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0', 10) || 8);

    if (compact) {
      this.boardFooterEl.classList.add('hud-board-footer--compact');
      this.sideToolbarEl.classList.add('hud-side-toolbar--compact');
    } else {
      this.boardFooterEl.classList.remove('hud-board-footer--compact');
      this.sideToolbarEl.classList.remove('hud-side-toolbar--compact');
    }

    const footerTop = boardBottom + footerGap;
    const maxFooterTop = vh - safeBottom - footerRowHeight - (compact ? toolbarH + 6 : 0) - 8;

    if (footerTop > maxFooterTop) {
      this.boardFooterEl.style.top = 'auto';
      this.boardFooterEl.style.bottom = `${safeBottom + (compact ? toolbarH + 6 : 0)}px`;
    } else {
      this.boardFooterEl.style.top = `${footerTop}px`;
      this.boardFooterEl.style.bottom = 'auto';
    }
    this.boardFooterEl.style.left = `${centerX}px`;

    if (compact) {
      this.sideToolbarEl.style.top = 'auto';
      this.sideToolbarEl.style.bottom = `${safeBottom}px`;
      this.sideToolbarEl.style.right = 'max(10px, env(safe-area-inset-right))';
      this.sideToolbarEl.style.left = 'auto';
      return;
    }

    const toolbarGap = vh < 700 ? 48 : 72;
    const rawToolbarTop = footerTop + footerRowHeight + toolbarGap;
    const maxTop = vh - safeBottom - toolbarH - 8;
    const toolbarTop = Math.min(rawToolbarTop, maxTop);

    this.sideToolbarEl.style.top = `${toolbarTop}px`;
    this.sideToolbarEl.style.bottom = 'auto';
    this.sideToolbarEl.style.right = 'max(10px, env(safe-area-inset-right))';
    this.sideToolbarEl.style.left = 'auto';
  }

  setOnRestart(handler: () => void): void {
    this.onRestart = handler;
  }

  setOnQuit(handler: () => void): void {
    this.onQuit = handler;
  }

  setOnSettings(handler: () => void): void {
    this.onSettings = handler;
  }

  update(state: HUDState): void {
    this.banner.updateNav(state.nav);

    this.movesEl.textContent = String(state.moves);

    const task = state.targetTask ?? 'score';
    this.targetCardEl.classList.toggle('hud-target-card--score', task === 'score' || task === 'rush' || task === 'boss');
    this.targetCardEl.classList.toggle('hud-target-card--collect', task === 'collect');
    this.targetCardEl.classList.toggle('hud-target-card--rush', task === 'rush');
    this.targetCardEl.classList.toggle('hud-target-card--boss', task === 'boss');

    const scoreLabel = this.targetCardEl.querySelector('.hud-card-label');
    if (scoreLabel) {
      scoreLabel.textContent =
        task === 'rush' ? 'Coin Rush' : task === 'boss' ? 'Boss HP' : 'Target';
    }

    if (task === 'score') {
      const target = state.targetScore ?? 1;
      const score = state.score;
      this.targetScoreValEl.textContent = `${score}/${target.toLocaleString()}`;
      const pct = Math.min(100, (score / target) * 100);
      this.targetProgressFillEl.style.width = `${pct}%`;
    } else if (task === 'rush') {
      const target = state.rushTarget ?? 1;
      const rush = state.rushCoins ?? 0;
      this.targetScoreValEl.textContent = `${rush}/${target}`;
      const pct = Math.min(100, (rush / target) * 100);
      this.targetProgressFillEl.style.width = `${pct}%`;
    } else if (task === 'boss') {
      const max = state.bossHpMax ?? 1;
      const hp = state.bossHp ?? 0;
      this.targetScoreValEl.textContent = `${hp}/${max}`;
      const pct = Math.min(100, ((max - hp) / max) * 100);
      this.targetProgressFillEl.style.width = `${pct}%`;
    } else {
      const objectives = state.objectives ?? [];
      const collected = state.collected ?? {};
      const fruitOrder = HUD_FRUIT_ORDER;
      fruitOrder.forEach((fruit, i) => {
        const objective = objectives.find((o) => o.fruit === fruit);
        const remaining = objective
          ? getObjectiveRemainingCount(objective, collected)
          : 0;
        this.targetItemEls[i].textContent = String(remaining);
        this.targetItemEls[i].classList.toggle('hud-target-count--done', remaining === 0);
      });
    }

    if (state.difficultyTag) {
      this.diffTextEl.textContent = state.difficultyTag;
    }
    if (state.difficultyClass) {
      this.hudRoot.className = `hud ${state.difficultyClass}`;
      this.boardFooterEl.querySelector('#hud-diff-pill')!.className =
        `hud-diff-pill ${state.difficultyClass}`;
    }

    if (state.message) {
      this.messageEl.textContent = state.message;
      this.messageEl.classList.add('visible');
    } else {
      this.messageEl.classList.remove('visible');
    }
  }

  shakeLives(): void {
    this.banner.shakeLives();
  }

  showToast(text: string, durationMs = 2000): void {
    this.messageEl.textContent = text;
    this.messageEl.classList.add('visible');
    setTimeout(() => this.messageEl.classList.remove('visible'), durationMs);
  }
}
