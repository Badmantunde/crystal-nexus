import { STAR_ACTIVE_URL, STAR_INACTIVE_URL } from './UiChrome';

export interface DayChallengeStats {
  modeLabel: string;
  rushCoins: number;
  rushTarget?: number;
  score: number;
  scoreTarget?: number;
  bossHpLeft?: number;
  movesLeft: number;
  maxCombo: number;
  won: boolean;
  coinsEarned: number;
  beatBest: boolean;
  streak: number;
}

export interface DayChallengeResultActions {
  onMap: () => void;
  onRetry?: () => void;
  canRetry?: boolean;
}

export class DayChallengeResultCard {
  private backdrop: HTMLElement;
  private onMap: (() => void) | null = null;
  private onRetry: (() => void) | null = null;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('DayChallengeResultCard: missing container');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cn-modal-backdrop day-result-backdrop hidden';
    this.backdrop.innerHTML = `
      <div class="cn-card-shell">
        <div class="cn-card-shell-glow" aria-hidden="true"></div>
        <div class="cn-card day-result-card" role="dialog" aria-modal="true">
          <div class="cn-card-shine"></div>
          <span class="cn-badge cn-badge--day" id="dc-result-badge">DAILY CHALLENGE</span>
          <h2 class="day-result-title" id="dc-result-title">Coin Rush</h2>
          <p class="day-result-stars-label">Performance</p>
          <div class="complete-stars" id="dc-result-stars" aria-label="Stars earned">
            <img class="star-icon" data-i="1" src="${STAR_INACTIVE_URL}" width="32" height="32" alt="" />
            <img class="star-icon" data-i="2" src="${STAR_INACTIVE_URL}" width="32" height="32" alt="" />
            <img class="star-icon" data-i="3" src="${STAR_INACTIVE_URL}" width="32" height="32" alt="" />
          </div>
          <div class="complete-stats">
            <div class="cn-stat-pill" id="dc-rush-wrap">
              <span class="cn-stat-pill-label">Rush Coins</span>
              <span class="cn-stat-pill-value" id="dc-rush">0/0</span>
            </div>
            <div class="cn-stat-pill">
              <span class="cn-stat-pill-label">Score</span>
              <span class="cn-stat-pill-value" id="dc-score">0</span>
            </div>
            <div class="cn-stat-pill">
              <span class="cn-stat-pill-label">Moves Left</span>
              <span class="cn-stat-pill-value" id="dc-moves">0</span>
            </div>
            <div class="cn-stat-pill">
              <span class="cn-stat-pill-label">Best Combo</span>
              <span class="cn-stat-pill-value" id="dc-combo">×0</span>
            </div>
            <div class="cn-stat-pill cn-stat-pill--coins" id="dc-coins-wrap" hidden>
              <span class="cn-stat-pill-label">Coins</span>
              <span class="cn-stat-pill-value" id="dc-coins">+0</span>
            </div>
            <div class="cn-stat-pill" id="dc-streak-wrap" hidden>
              <span class="cn-stat-pill-label">Streak</span>
              <span class="cn-stat-pill-value" id="dc-streak">×1</span>
            </div>
          </div>
          <div class="complete-actions">
            <button type="button" class="cn-btn cn-btn-ghost" id="dc-retry">Try Again</button>
            <button type="button" class="cn-btn cn-btn-primary" id="dc-map">World Map</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.backdrop.querySelector('#dc-map')!.addEventListener('click', () => {
      this.hide();
      this.onMap?.();
    });
    this.backdrop.querySelector('#dc-retry')!.addEventListener('click', () => {
      this.hide();
      this.onRetry?.();
    });
  }

  show(stats: DayChallengeStats, actions: DayChallengeResultActions): void {
    this.onMap = actions.onMap;
    this.onRetry = actions.onRetry ?? null;

    const card = this.backdrop.querySelector('.day-result-card')!;
    const badge = this.backdrop.querySelector('#dc-result-badge')!;
    const title = this.backdrop.querySelector('#dc-result-title')!;

    badge.textContent = stats.won ? 'CHALLENGE CLEAR' : 'OUT OF MOVES';
    title.textContent = stats.modeLabel;

    const rushWrap = this.backdrop.querySelector('#dc-rush-wrap') as HTMLElement;
    if (stats.rushTarget != null) {
      rushWrap.hidden = false;
      this.backdrop.querySelector('#dc-rush')!.textContent =
        `${stats.rushCoins}/${stats.rushTarget}`;
    } else {
      rushWrap.hidden = true;
    }

    const scoreEl = this.backdrop.querySelector('#dc-score')!;
    if (stats.scoreTarget != null && stats.rushTarget == null) {
      scoreEl.textContent = `${stats.score.toLocaleString()}/${stats.scoreTarget.toLocaleString()}`;
    } else if (stats.bossHpLeft != null) {
      scoreEl.textContent = stats.bossHpLeft <= 0 ? 'Defeated!' : `${stats.bossHpLeft} HP left`;
    } else {
      scoreEl.textContent = stats.score.toLocaleString();
    }
    this.backdrop.querySelector('#dc-moves')!.textContent = String(stats.movesLeft);
    this.backdrop.querySelector('#dc-combo')!.textContent = `×${stats.maxCombo}`;

    const coinsWrap = this.backdrop.querySelector('#dc-coins-wrap') as HTMLElement;
    const coinsEl = this.backdrop.querySelector('#dc-coins')!;
    if (stats.won && stats.coinsEarned > 0) {
      coinsWrap.hidden = false;
      coinsEl.textContent = `+${stats.coinsEarned}`;
    } else {
      coinsWrap.hidden = true;
    }

    const streakWrap = this.backdrop.querySelector('#dc-streak-wrap') as HTMLElement;
    if (stats.won && stats.streak > 0) {
      streakWrap.hidden = false;
      this.backdrop.querySelector('#dc-streak')!.textContent = `${stats.streak} days`;
    } else {
      streakWrap.hidden = true;
    }

    const stars = calcDayStars(stats);
    this.backdrop.querySelectorAll<HTMLImageElement>('.star-icon').forEach((el) => {
      const n = Number(el.dataset.i);
      const earned = stats.won && n <= stars;
      el.src = earned ? STAR_ACTIVE_URL : STAR_INACTIVE_URL;
      el.classList.toggle('earned', earned);
    });

    const retryBtn = this.backdrop.querySelector('#dc-retry') as HTMLButtonElement;
    const canRetry = actions.canRetry !== false && !!actions.onRetry;
    retryBtn.style.display = canRetry ? '' : 'none';

    card.classList.toggle('failed', !stats.won);

    this.backdrop.classList.remove('hidden');
    void card.offsetWidth;
    this.backdrop.classList.add('visible');
  }

  hide(): void {
    this.backdrop.classList.remove('visible');
    setTimeout(() => this.backdrop.classList.add('hidden'), 280);
  }

  isVisible(): boolean {
    return this.backdrop.classList.contains('visible');
  }
}

function calcDayStars(stats: DayChallengeStats): 1 | 2 | 3 {
  if (!stats.won) return 1;
  if (stats.rushTarget != null) {
    if (stats.rushCoins >= stats.rushTarget * 1.3 && stats.movesLeft >= 6) return 3;
    if (stats.rushCoins >= stats.rushTarget * 1.1 || stats.movesLeft >= 4) return 2;
    return 1;
  }
  if (stats.scoreTarget != null) {
    if (stats.score >= stats.scoreTarget * 1.25 && stats.movesLeft >= 5) return 3;
    if (stats.score >= stats.scoreTarget * 1.1 || stats.movesLeft >= 3) return 2;
    return 1;
  }
  if (stats.movesLeft >= 5) return 3;
  if (stats.movesLeft >= 2) return 2;
  return 1;
}
