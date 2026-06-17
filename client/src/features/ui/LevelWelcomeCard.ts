export interface LevelWelcomeInfo {
  level: number;
  targetScore: number;
  moves: number;
}

export class LevelWelcomeCard {
  private backdrop: HTMLElement;
  private card: HTMLElement;
  private onPlay: (() => void) | null = null;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('LevelWelcomeCard: missing container');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cn-modal-backdrop welcome-backdrop hidden';
    this.backdrop.innerHTML = `
      <div class="cn-card-shell">
        <div class="cn-card-shell-glow" aria-hidden="true"></div>
        <div class="cn-card welcome-card" role="dialog" aria-modal="true">
          <div class="cn-card-shine"></div>
        <div class="welcome-brand">
          <span class="icon-crystal welcome-crystal" aria-hidden="true"></span>
          <span class="welcome-brand-text">Crystal Nexus</span>
        </div>
        <p class="welcome-kicker">Welcome to</p>
        <div class="welcome-level-wrap">
          <span class="welcome-level-label">Level</span>
          <span class="welcome-level-num" id="lw-level">1</span>
        </div>
        <p class="welcome-tagline" id="lw-tagline">Match crystals. Chase the target.</p>
        <div class="welcome-goals">
          <div class="cn-stat-pill">
            <span class="cn-stat-pill-label">Target</span>
            <span class="cn-stat-pill-value" id="lw-target">1,000</span>
          </div>
          <div class="cn-stat-pill">
            <span class="cn-stat-pill-label">Moves</span>
            <span class="cn-stat-pill-value" id="lw-moves">30</span>
          </div>
        </div>
        <div class="welcome-crystals" aria-hidden="true">
          <span class="icon-crystal wc wc-1"></span>
          <span class="icon-crystal wc wc-2"></span>
          <span class="icon-crystal wc wc-3"></span>
        </div>
        <button type="button" class="cn-btn cn-btn-primary welcome-play" id="lw-play">Play</button>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.card = this.backdrop.querySelector('.welcome-card')!;

    this.backdrop.querySelector('#lw-play')!.addEventListener('click', () => {
      this.hide();
      this.onPlay?.();
    });
  }

  show(info: LevelWelcomeInfo, onPlay: () => void): void {
    this.onPlay = onPlay;

    this.backdrop.querySelector('#lw-level')!.textContent = String(info.level);
    this.backdrop.querySelector('#lw-target')!.textContent = info.targetScore.toLocaleString();
    this.backdrop.querySelector('#lw-moves')!.textContent = String(info.moves);
    this.backdrop.querySelector('#lw-tagline')!.textContent = taglineForLevel(info.level);

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

function taglineForLevel(level: number): string {
  if (level === 1) return 'Your crystal journey begins here.';
  if (level % 5 === 0) return 'A milestone level — bring the thunder!';
  if (level % 3 === 0) return 'Combo chains unlock legendary praise.';
  return 'Swap smart. Blast specials. Own the board.';
}
