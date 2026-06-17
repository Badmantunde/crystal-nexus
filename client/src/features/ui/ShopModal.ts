import type { LivesManager } from '../player/Lives';
import { MAX_LIVES } from '../player/Lives';
import {
  SHOP,
  formatCoins,
  purchaseOneLife,
  purchaseRefillLives,
} from '../player/Economy';
import { getPlayerCoins } from '../player/PlayerProfile';
import { MAP_NAV } from './mapNavAssets';

export type ShopTab = 'lives' | 'coins';

export class ShopModal {
  private backdrop: HTMLElement;
  private balanceEl: HTMLElement;
  private messageEl: HTMLElement;
  private lives: LivesManager;
  private onChange: (() => void) | null = null;

  constructor(containerId = 'menu-overlay', lives: LivesManager) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('ShopModal: missing container');

    this.lives = lives;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cn-modal-backdrop shop-backdrop hidden';
    this.backdrop.innerHTML = `
      <div class="cn-card-shell">
        <div class="cn-card-shell-glow" aria-hidden="true"></div>
        <div class="cn-card shop-card" role="dialog" aria-modal="true" aria-labelledby="shop-title">
          <div class="cn-card-shine"></div>
          <span class="cn-badge">FRUIT SHOP</span>
          <h2 class="shop-title" id="shop-title">Stock up</h2>
          <p class="shop-balance">
            <img src="${MAP_NAV.money}" width="22" height="22" alt="" />
            <span id="shop-balance">0</span> coins
          </p>
          <div class="shop-items">
            <button type="button" class="shop-item" id="shop-buy-life">
              <img class="shop-item-icon" src="${MAP_NAV.live}" width="32" height="32" alt="" />
              <span class="shop-item-name">+1 Life</span>
              <span class="shop-item-price">${SHOP.oneLife} coins</span>
            </button>
            <button type="button" class="shop-item" id="shop-refill-lives">
              <img class="shop-item-icon" src="${MAP_NAV.live}" width="32" height="32" alt="" />
              <span class="shop-item-name">Refill all lives</span>
              <span class="shop-item-price">${SHOP.refillLives} coins</span>
            </button>
          </div>
          <p class="shop-hint">Win levels and Day Challenges to earn more coins.</p>
          <p class="shop-message" id="shop-message" hidden></p>
          <button type="button" class="cn-btn cn-btn-primary" id="shop-close">Done</button>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.balanceEl = this.backdrop.querySelector('#shop-balance')!;
    this.messageEl = this.backdrop.querySelector('#shop-message')!;

    this.backdrop.querySelector('#shop-buy-life')!.addEventListener('click', () => {
      this.flashMessage(purchaseOneLife(this.lives).message);
      this.refresh();
      this.onChange?.();
    });
    this.backdrop.querySelector('#shop-refill-lives')!.addEventListener('click', () => {
      this.flashMessage(purchaseRefillLives(this.lives).message);
      this.refresh();
      this.onChange?.();
    });
    this.backdrop.querySelector('#shop-close')!.addEventListener('click', () => this.hide());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.hide();
    });
  }

  setOnChange(handler: () => void): void {
    this.onChange = handler;
  }

  show(tab: ShopTab = 'lives'): void {
    void tab;
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
    this.balanceEl.textContent = formatCoins(getPlayerCoins());
    const full = this.lives.getLives() >= MAX_LIVES;
    (this.backdrop.querySelector('#shop-buy-life') as HTMLButtonElement).disabled = full;
    (this.backdrop.querySelector('#shop-refill-lives') as HTMLButtonElement).disabled = full;
  }

  private flashMessage(text: string): void {
    this.messageEl.textContent = text;
    this.messageEl.hidden = false;
    this.refresh();
  }
}
