import { STAR_ACTIVE_URL, STAR_INACTIVE_URL } from './UiChrome';

export interface LevelStats {
  level: number;
  score: number;
  targetScore: number;
  movesLeft: number;
  maxCombo: number;
  stars: 1 | 2 | 3;
  won: boolean;
  coinsEarned?: number;
}

export interface LevelCompleteActions {
  onNext: () => void;
  onReplay: () => void;
  onMap?: () => void;
  canReplay?: boolean;
}

export function calcStars(score: number, target: number, movesLeft: number): 1 | 2 | 3 {
  if (score >= target * 1.3 && movesLeft >= 8) return 3;
  if (score >= target * 1.15 || movesLeft >= 5) return 2;
  return 1;
}

export class LevelCompleteCard {
  private backdrop: HTMLElement;
  private card: HTMLElement;
  private onNext: (() => void) | null = null;
  private onReplay: (() => void) | null = null;
  private onMap: (() => void) | null = null;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('LevelCompleteCard: missing container');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cn-modal-backdrop complete-backdrop hidden';
    this.backdrop.innerHTML = `
      <div class="cn-card-shell">
        <div class="cn-card-shell-glow" aria-hidden="true"></div>
        <div class="cn-card complete-card" role="dialog" aria-modal="true">
          <div class="cn-card-shine"></div>
          <span class="cn-badge" id="lc-badge">LEVEL COMPLETE</span>
        <h2 class="complete-title" id="lc-title">Level 1</h2>
        <p class="complete-stars-label">Performance</p>
        <div class="complete-stars" id="lc-stars" aria-label="Stars earned">
          <img class="star-icon" data-i="1" src="${STAR_INACTIVE_URL}" width="32" height="32" alt="" />
          <img class="star-icon" data-i="2" src="${STAR_INACTIVE_URL}" width="32" height="32" alt="" />
          <img class="star-icon" data-i="3" src="${STAR_INACTIVE_URL}" width="32" height="32" alt="" />
        </div>
        <div class="complete-stats">
          <div class="cn-stat-pill">
            <span class="cn-stat-pill-label">Score</span>
            <span class="cn-stat-pill-value" id="lc-score">0</span>
          </div>
          <div class="cn-stat-pill">
            <span class="cn-stat-pill-label">Target</span>
            <span class="cn-stat-pill-value" id="lc-target">0</span>
          </div>
          <div class="cn-stat-pill">
            <span class="cn-stat-pill-label">Moves Left</span>
            <span class="cn-stat-pill-value" id="lc-moves">0</span>
          </div>
          <div class="cn-stat-pill">
            <span class="cn-stat-pill-label">Best Combo</span>
            <span class="cn-stat-pill-value" id="lc-combo">×0</span>
          </div>
          <div class="cn-stat-pill cn-stat-pill--coins" id="lc-coins-wrap" hidden>
            <span class="cn-stat-pill-label">Coins</span>
            <span class="cn-stat-pill-value" id="lc-coins">+0</span>
          </div>
        </div>
        <div class="complete-actions">
          <button type="button" class="cn-btn cn-btn-ghost" id="lc-replay">Replay</button>
          <button type="button" class="cn-btn cn-btn-primary" id="lc-next">Next</button>
        </div>
        <button type="button" class="cn-btn cn-btn-map" id="lc-map">World Map</button>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.card = this.backdrop.querySelector('.complete-card')!;

    this.backdrop.querySelector('#lc-next')!.addEventListener('click', () => {
      this.hide();
      this.onNext?.();
    });
    this.backdrop.querySelector('#lc-replay')!.addEventListener('click', () => {
      this.hide();
      this.onReplay?.();
    });
    this.backdrop.querySelector('#lc-map')!.addEventListener('click', () => {
      this.hide();
      this.onMap?.();
    });
  }

  show(stats: LevelStats, actions: LevelCompleteActions): void {
    this.onNext = actions.onNext;
    this.onReplay = actions.onReplay;
    this.onMap = actions.onMap ?? null;

    const won = stats.won;
    const badge = this.backdrop.querySelector('#lc-badge')!;
    const title = this.backdrop.querySelector('#lc-title')!;
    const nextBtn = this.backdrop.querySelector('#lc-next') as HTMLButtonElement;

    badge.textContent = won ? 'LEVEL COMPLETE' : 'OUT OF MOVES';
    title.textContent = `Level ${stats.level}`;
    this.backdrop.querySelector('#lc-score')!.textContent = stats.score.toLocaleString();
    this.backdrop.querySelector('#lc-target')!.textContent = stats.targetScore.toLocaleString();
    this.backdrop.querySelector('#lc-moves')!.textContent = String(stats.movesLeft);
    this.backdrop.querySelector('#lc-combo')!.textContent = `×${stats.maxCombo}`;

    const coinsWrap = this.backdrop.querySelector('#lc-coins-wrap') as HTMLElement;
    const coinsEl = this.backdrop.querySelector('#lc-coins')!;
    if (won && stats.coinsEarned && stats.coinsEarned > 0) {
      coinsWrap.hidden = false;
      coinsEl.textContent = `+${stats.coinsEarned}`;
    } else {
      coinsWrap.hidden = true;
    }

    const stars = this.backdrop.querySelectorAll<HTMLImageElement>('.star-icon');
    stars.forEach((el) => {
      const n = Number(el.dataset.i);
      const earned = won && n <= stats.stars;
      el.src = earned ? STAR_ACTIVE_URL : STAR_INACTIVE_URL;
      el.classList.toggle('earned', earned);
    });

    const replayBtn = this.backdrop.querySelector('#lc-replay') as HTMLButtonElement;
    const canReplay = actions.canReplay !== false;

    nextBtn.style.display = won ? '' : 'none';
    replayBtn.disabled = !canReplay;
    replayBtn.textContent = canReplay ? 'Replay' : 'No Lives';
    this.card.classList.toggle('failed', !won);
    this.card.classList.toggle('no-lives', !canReplay && !won);

    this.backdrop.classList.remove('hidden');
    void this.card.offsetWidth;
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
