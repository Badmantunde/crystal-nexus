import { livesPillHtml } from './UiChrome';

export interface HUDState {
  score: number;
  moves: number;
  combo: number;
  level: number;
  lives: number;
  maxLives: number;
  rank: string;
  avatar: string;
  difficultyLabel?: string;
  difficultyClass?: string;
  targetScore?: number;
  message?: string;
  bossName?: string;
  bossHp?: number;
  bossMaxHp?: number;
  isBossFight?: boolean;
}

export class HUD {
  private overlay: HTMLElement;
  private scoreEl: HTMLElement;
  private movesEl: HTMLElement;
  private comboEl: HTMLElement;
  private levelEl: HTMLElement;
  private rankEl: HTMLElement;
  private avatarEl: HTMLElement;
  private messageEl: HTMLElement;
  private bossBar: HTMLElement;
  private bossNameEl: HTMLElement;
  private bossHpFill: HTMLElement;
  private bossHpText: HTMLElement;
  private targetEl: HTMLElement;
  private scoreFillEl: HTMLElement;
  private livesEl: HTMLElement;
  private difficultyEl: HTMLElement;
  private onQuit: (() => void) | null = null;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`HUD container #${containerId} not found`);

    container.innerHTML = `
      <div class="hud">
        <div class="hud-bar">
          <div class="player-chip">
            <div class="player-avatar" id="hud-avatar">CN</div>
            <div class="player-chip-info">
              <span class="player-chip-level">LV <span id="hud-level">1</span></span>
              <span class="player-chip-rank" id="hud-rank">Rookie</span>
            </div>
          </div>
          <div class="hud-bar-actions">
            <button type="button" class="hud-quit-btn" id="hud-quit">Quit</button>
            <div id="hud-lives"></div>
          </div>
        </div>
        <div class="hud-difficulty diff-easy" id="hud-difficulty">Easy Stage</div>
        <div class="hud-boss boss-hidden" id="hud-boss">
          <div class="boss-header">
            <span class="boss-icon"></span>
            <span class="boss-name" id="hud-boss-name">Boss</span>
          </div>
          <div class="boss-hp-track">
            <div class="boss-hp-fill" id="hud-boss-hp-fill"></div>
          </div>
          <div class="boss-hp-text" id="hud-boss-hp-text">0 / 0</div>
        </div>
        <div class="hud-board-stats">
          <div class="hud-score-card">
            <div class="hud-card-head">
              <span class="hud-card-icon hud-icon-score"></span>
              <span class="hud-card-label">Score</span>
            </div>
            <span class="hud-score-value" id="hud-score">0</span>
            <div class="hud-progress-track">
              <div class="hud-progress-fill" id="hud-score-fill"></div>
            </div>
            <span class="hud-score-target" id="hud-target">0 / 1,000</span>
          </div>
          <div class="hud-moves-card">
            <div class="hud-card-head">
              <span class="hud-card-icon hud-icon-moves"></span>
              <span class="hud-card-label">Moves</span>
            </div>
            <span class="hud-moves-value" id="hud-moves">30</span>
            <span class="hud-moves-sub">swaps left</span>
          </div>
          <div class="hud-combo-card combo-hidden" id="hud-combo-wrap">
            <div class="hud-card-head">
              <span class="hud-card-icon hud-icon-combo"></span>
              <span class="hud-card-label">Combo</span>
            </div>
            <span class="hud-combo-value" id="hud-combo">x2</span>
          </div>
        </div>
        <div class="hud-message" id="hud-message"></div>
      </div>
    `;

    this.overlay = container;
    this.scoreEl = container.querySelector('#hud-score')!;
    this.movesEl = container.querySelector('#hud-moves')!;
    this.comboEl = container.querySelector('#hud-combo')!;
    this.levelEl = container.querySelector('#hud-level')!;
    this.rankEl = container.querySelector('#hud-rank')!;
    this.avatarEl = container.querySelector('#hud-avatar')!;
    this.messageEl = container.querySelector('#hud-message')!;
    this.bossBar = container.querySelector('#hud-boss')!;
    this.bossNameEl = container.querySelector('#hud-boss-name')!;
    this.bossHpFill = container.querySelector('#hud-boss-hp-fill')!;
    this.bossHpText = container.querySelector('#hud-boss-hp-text')!;
    this.targetEl = container.querySelector('#hud-target')!;
    this.scoreFillEl = container.querySelector('#hud-score-fill')!;
    this.livesEl = container.querySelector('#hud-lives')!;
    this.difficultyEl = container.querySelector('#hud-difficulty')!;

    container.querySelector('#hud-quit')!.addEventListener('click', () => this.onQuit?.());
  }

  setOnQuit(handler: () => void): void {
    this.onQuit = handler;
  }

  update(state: HUDState): void {
    this.scoreEl.textContent = state.score.toLocaleString();
    this.movesEl.textContent = String(state.moves);
    this.levelEl.textContent = String(state.level);
    this.rankEl.textContent = state.rank;
    this.avatarEl.textContent = state.avatar;
    this.livesEl.innerHTML = livesPillHtml(state.lives);
    this.livesEl.setAttribute('aria-label', `${state.lives} lives`);

    if (state.difficultyLabel && state.difficultyClass) {
      this.difficultyEl.textContent = state.difficultyLabel;
      this.difficultyEl.className = `hud-difficulty ${state.difficultyClass}`;
      this.difficultyEl.style.display = '';
    }

    if (state.isBossFight) {
      this.targetEl.textContent = 'Boss objective';
      this.scoreFillEl.style.width = '0%';
      this.bossBar.classList.remove('boss-hidden');
      this.bossNameEl.textContent = state.bossName ?? 'Boss';
      const pct =
        state.bossMaxHp && state.bossHp !== undefined
          ? (state.bossHp / state.bossMaxHp) * 100
          : 0;
      this.bossHpFill.style.width = `${pct}%`;
      this.bossHpText.textContent = `${state.bossHp ?? 0} / ${state.bossMaxHp ?? 0}`;
    } else {
      this.bossBar.classList.add('boss-hidden');
      const target = state.targetScore ?? 1;
      const pct = Math.min(100, (state.score / target) * 100);
      this.scoreFillEl.style.width = `${pct}%`;
      this.targetEl.textContent = `${state.score.toLocaleString()} / ${target.toLocaleString()}`;
    }

    const comboWrap = this.overlay.querySelector('#hud-combo-wrap')!;
    if (state.combo > 1) {
      comboWrap.classList.remove('combo-hidden');
      this.comboEl.textContent = `x${state.combo}`;
    } else {
      comboWrap.classList.add('combo-hidden');
    }

    if (state.message) {
      this.messageEl.textContent = state.message;
      this.messageEl.classList.add('visible');
    } else {
      this.messageEl.classList.remove('visible');
    }
  }

  showToast(text: string, durationMs = 2000): void {
    this.messageEl.textContent = text;
    this.messageEl.classList.add('visible');
    setTimeout(() => this.messageEl.classList.remove('visible'), durationMs);
  }
}
