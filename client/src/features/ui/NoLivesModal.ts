import { LivesManager, formatRegenCountdown } from '../player/Lives';
import { LIVE_LOST_URL } from './UiChrome';

export class NoLivesModal {
  private backdrop: HTMLElement;
  private countdownEl: HTMLElement;
  private lives: LivesManager;
  private onShop: (() => void) | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(containerId = 'menu-overlay', lives = new LivesManager()) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('NoLivesModal: missing container');

    this.lives = lives;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cn-modal-backdrop no-lives-backdrop hidden';
    this.backdrop.innerHTML = `
      <div class="cn-card-shell">
        <div class="cn-card-shell-glow" aria-hidden="true"></div>
        <div class="cn-card no-lives-card" role="dialog" aria-modal="true" aria-labelledby="no-lives-title">
          <div class="cn-card-shine"></div>
          <div class="no-lives-icon-wrap">
            <img class="no-lives-icon" src="${LIVE_LOST_URL}" width="56" height="56" alt="" />
          </div>
          <span class="cn-badge cn-badge--alert">NO LIVES</span>
          <h2 class="no-lives-title" id="no-lives-title">Recharge to Play</h2>
          <p class="no-lives-body">Your lives are spent. Wait for a refill or grab more from the shop.</p>
          <div class="no-lives-timer-block">
            <span class="no-lives-timer-label">Next life in</span>
            <span class="no-lives-timer" id="no-lives-countdown">5:00</span>
          </div>
          <button type="button" class="cn-btn cn-btn-ghost" id="no-lives-shop">Open Shop</button>
          <button type="button" class="cn-btn cn-btn-primary" id="no-lives-close">Got it</button>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.countdownEl = this.backdrop.querySelector('#no-lives-countdown')!;

    this.backdrop.querySelector('#no-lives-close')!.addEventListener('click', () => this.hide());
    this.backdrop.querySelector('#no-lives-shop')!.addEventListener('click', () => {
      this.hide();
      this.onShop?.();
    });
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.hide();
    });
  }

  setOnShop(handler: () => void): void {
    this.onShop = handler;
  }

  show(): void {
    this.refreshCountdown();
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('visible');
    this.startTick();
  }

  hide(): void {
    this.stopTick();
    this.backdrop.classList.remove('visible');
    setTimeout(() => this.backdrop.classList.add('hidden'), 280);
  }

  isVisible(): boolean {
    return this.backdrop.classList.contains('visible');
  }

  private startTick(): void {
    this.stopTick();
    this.tickTimer = setInterval(() => {
      if (!this.lives.canPlay()) {
        this.refreshCountdown();
      } else {
        this.hide();
      }
    }, 1000);
  }

  private stopTick(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private refreshCountdown(): void {
    const ms = this.lives.getNextRegenMs();
    this.countdownEl.textContent = ms !== null ? formatRegenCountdown(ms) : '--:--';
  }
}
