import {
  DAY_CHALLENGE_EXTRA_COST,
  buildDayChallengeConfig,
  canEnterDayChallenge,
  consumeDayChallengeEntry,
  getDayChallengeRecord,
  getDayChallengeStreak,
  getTodayDateKey,
} from '../player/DayChallenge';
import { getPlayerCoins } from '../player/PlayerProfile';

export class DayChallengeModal {
  private backdrop: HTMLElement;
  private bodyEl: HTMLElement;
  private perksEl: HTMLElement;
  private playBtn: HTMLButtonElement;
  private playHintEl: HTMLElement;
  private messageEl: HTMLElement;
  private onPlay: (() => void) | null = null;
  private onChange: (() => void) | null = null;

  constructor(containerId = 'menu-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('DayChallengeModal: missing container');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cn-modal-backdrop day-challenge-backdrop hidden';
    this.backdrop.innerHTML = `
      <div class="cn-card-shell">
        <div class="cn-card-shell-glow" aria-hidden="true"></div>
        <div class="cn-card day-challenge-card" role="dialog" aria-modal="true" aria-labelledby="day-challenge-title">
          <div class="cn-card-shine"></div>
          <span class="cn-badge cn-badge--day">DAY CHALLENGE</span>
          <h2 class="day-challenge-title" id="day-challenge-title">Today's Special</h2>
          <p class="day-challenge-body" id="day-challenge-body"></p>
          <ul class="day-challenge-perks" id="day-challenge-perks"></ul>
          <p class="day-challenge-play-hint" id="day-challenge-play-hint"></p>
          <p class="day-challenge-message" id="day-challenge-message" hidden></p>
          <div class="day-challenge-actions">
            <button type="button" class="cn-btn cn-btn-ghost" id="day-challenge-close">Later</button>
            <button type="button" class="cn-btn cn-btn-primary" id="day-challenge-play">Play</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.bodyEl = this.backdrop.querySelector('#day-challenge-body')!;
    this.perksEl = this.backdrop.querySelector('#day-challenge-perks')!;
    this.playBtn = this.backdrop.querySelector('#day-challenge-play')!;
    this.playHintEl = this.backdrop.querySelector('#day-challenge-play-hint')!;
    this.messageEl = this.backdrop.querySelector('#day-challenge-message')!;

    this.backdrop.querySelector('#day-challenge-close')!.addEventListener('click', () => this.hide());
    this.playBtn.addEventListener('click', () => this.handlePlay());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.hide();
    });
  }

  setOnPlay(handler: () => void): void {
    this.onPlay = handler;
  }

  setOnChange(handler: () => void): void {
    this.onChange = handler;
  }

  show(): void {
    this.refresh();
    this.messageEl.hidden = true;
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('visible');
  }

  hide(): void {
    this.backdrop.classList.remove('visible');
    setTimeout(() => this.backdrop.classList.add('hidden'), 280);
  }

  isVisible(): boolean {
    return this.backdrop.classList.contains('visible');
  }

  private refresh(): void {
    const dateKey = getTodayDateKey();
    const config = buildDayChallengeConfig(dateKey);
    const record = getDayChallengeRecord(dateKey);
    const streak = getDayChallengeStreak();
    const entry = canEnterDayChallenge(dateKey);

    this.backdrop.querySelector('#day-challenge-title')!.textContent = config.modeLabel;

    const status = record.completed ? 'Cleared today' : 'Not cleared yet';
    this.bodyEl.textContent =
      `Collect ${config.rushTarget} rush coins in ${config.moves} moves on today's seeded board. ` +
      `${status}. Best: ${record.bestRushCoins} coins.`;

    this.perksEl.innerHTML = `
      <li>Same puzzle for every player today</li>
      <li>30 coin reward · +15 beat best · +10 combo bonus</li>
      <li>No lives spent · streak ${streak} day${streak === 1 ? '' : 's'}</li>
    `;

    this.playHintEl.textContent = entry.reason;
    this.playBtn.textContent = record.completed ? 'Play Again' : 'Play Free';

    const needsCoins = entry.needsCoins && getPlayerCoins() < DAY_CHALLENGE_EXTRA_COST;
    this.playBtn.disabled = needsCoins;
  }

  private handlePlay(): void {
    const entry = consumeDayChallengeEntry();
    if (!entry.ok) {
      this.messageEl.textContent = entry.message;
      this.messageEl.hidden = false;
      this.refresh();
      return;
    }

    this.hide();
    this.onChange?.();
    this.onPlay?.();
  }
}
