import { getPlayerName } from '../player/PlayerProfile';

const AVATAR = '/banner-assets/avatar.png';

const LEVEL_TIPS: Record<number, string> = {
  1: 'Swipe two neighbors to swap. Match 3 of the same fruit!',
  2: 'Look for L-shapes — they can spawn row or column bombs.',
  3: 'Combos chain when fruits fall into new matches. Keep it rolling!',
  4: 'Watch your move count. Plan two swaps ahead.',
  5: 'Beast levels are tough — use specials early!',
  6: 'Three stars = max coins. Replay levels to perfect them.',
};

export class GuideCharacter {
  private root: HTMLElement;
  private speechEl: HTMLElement;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('GuideCharacter: missing container');

    this.root = document.createElement('div');
    this.root.className = 'guide-character hidden';
    this.root.innerHTML = `
      <div class="guide-character-inner">
        <img class="guide-character-avatar" src="${AVATAR}" width="56" height="56" alt="" />
        <div class="guide-character-bubble">
          <span class="guide-character-name">Zap</span>
          <p class="guide-character-text" id="guide-character-text"></p>
        </div>
      </div>
    `;
    container.appendChild(this.root);
    this.speechEl = this.root.querySelector('#guide-character-text')!;
  }

  tipForLevel(level: number): void {
    const name = getPlayerName();
    const tip = LEVEL_TIPS[level] ?? tipForGeneric(level, name);
    this.show(tip, 5200);
  }

  say(message: string, ms = 3200): void {
    this.show(message, ms);
  }

  private show(message: string, ms: number): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.speechEl.textContent = message;
    this.root.classList.remove('hidden');
    void this.root.offsetWidth;
    this.root.classList.add('visible');
    this.hideTimer = setTimeout(() => this.hide(), ms);
  }

  hide(): void {
    this.root.classList.remove('visible');
    setTimeout(() => this.root.classList.add('hidden'), 280);
  }
}

function tipForGeneric(level: number, name: string): string {
  if (level % 5 === 0) return `${name}, milestone level! Save a rainbow fruit for the final push.`;
  if (level % 3 === 0) return 'Daily Challenge on the map = bonus coins. Try it today!';
  return `${name}, hunt for match-4 setups — row bombs and rainbow fruits win hard stages.`;
}
