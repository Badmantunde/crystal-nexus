export class DayChallengeModal {
  private backdrop: HTMLElement;

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
          <p class="day-challenge-body">
            A fresh puzzle every day — earn bonus coins without spending lives on the world map.
            Coin Rush mode arrives in the next update.
          </p>
          <ul class="day-challenge-perks">
            <li>Daily seeded board</li>
            <li>30–80 coin rewards</li>
            <li>Build your streak</li>
          </ul>
          <button type="button" class="cn-btn cn-btn-primary" id="day-challenge-close">Got it</button>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.backdrop.querySelector('#day-challenge-close')!.addEventListener('click', () => this.hide());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.hide();
    });
  }

  show(): void {
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
