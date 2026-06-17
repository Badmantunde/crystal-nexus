import { SHOP, formatCoins } from '../player/Economy';
import { getPlayerCoins } from '../player/PlayerProfile';
import { MAP_NAV } from './mapNavAssets';

export interface ContinueModalActions {
  onContinue: () => void;
  onGiveUp: () => void;
}

export class ContinueModal {
  private backdrop: HTMLElement;
  private priceEl: HTMLElement;
  private continueBtn: HTMLButtonElement;
  private onContinue: (() => void) | null = null;
  private onGiveUp: (() => void) | null = null;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('ContinueModal: missing container');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cn-modal-backdrop continue-backdrop hidden';
    this.backdrop.innerHTML = `
      <div class="cn-card-shell">
        <div class="cn-card-shell-glow" aria-hidden="true"></div>
        <div class="cn-card continue-card" role="dialog" aria-modal="true">
          <div class="cn-card-shine"></div>
          <span class="cn-badge">SO CLOSE!</span>
          <h2 class="continue-title">Keep going?</h2>
          <p class="continue-body">Add <strong>5 moves</strong> and finish this level.</p>
          <p class="continue-price">
            <img src="${MAP_NAV.money}" width="22" height="22" alt="" />
            <span id="continue-price">${SHOP.continue}</span> coins
          </p>
          <p class="continue-balance">You have <span id="continue-balance">0</span> coins</p>
          <div class="continue-actions">
            <button type="button" class="cn-btn cn-btn-ghost" id="continue-give-up">Give up</button>
            <button type="button" class="cn-btn cn-btn-primary" id="continue-buy">Continue</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.priceEl = this.backdrop.querySelector('#continue-price')!;
    this.continueBtn = this.backdrop.querySelector('#continue-buy')!;

    this.backdrop.querySelector('#continue-buy')!.addEventListener('click', () => {
      this.hide();
      this.onContinue?.();
    });
    this.backdrop.querySelector('#continue-give-up')!.addEventListener('click', () => {
      this.hide();
      this.onGiveUp?.();
    });
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.hide();
        this.onGiveUp?.();
      }
    });
  }

  show(actions: ContinueModalActions): void {
    this.onContinue = actions.onContinue;
    this.onGiveUp = actions.onGiveUp;

    this.priceEl.textContent = formatCoins(SHOP.continue);
    const balance = getPlayerCoins();
    this.backdrop.querySelector('#continue-balance')!.textContent = formatCoins(balance);
    this.continueBtn.disabled = balance < SHOP.continue;

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
}
