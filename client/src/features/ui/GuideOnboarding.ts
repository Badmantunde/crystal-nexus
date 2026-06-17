import { setPlayerName, hasCompletedOnboarding } from '../player/PlayerProfile';
import { SoundEngine } from '../audio/SoundEngine';

const AVATAR = '/banner-assets/avatar.png';

export function needsOnboarding(): boolean {
  return !hasCompletedOnboarding();
}

/** First-run name + comic guide intro. */
export class GuideOnboarding {
  private backdrop: HTMLElement;
  private speechEl: HTMLElement;
  private nameInput: HTMLInputElement;
  private actionBtn: HTMLButtonElement;
  private step = 0;
  private playerName = '';
  private onDone: (() => void) | null = null;

  constructor(containerId = 'menu-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('GuideOnboarding: missing container');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'guide-onboard hidden';
    this.backdrop.innerHTML = `
      <div class="guide-onboard-panel" role="dialog" aria-modal="true" aria-labelledby="guide-onboard-title">
        <div class="guide-onboard-mascot-wrap">
          <img class="guide-onboard-mascot" src="${AVATAR}" width="120" height="120" alt="" />
          <span class="guide-onboard-badge">ZAP</span>
        </div>
        <div class="guide-onboard-bubble">
          <p class="guide-onboard-kicker">Your fruity coach</p>
          <h2 class="guide-onboard-title" id="guide-onboard-title">Hey, crusher!</h2>
          <p class="guide-onboard-speech" id="guide-onboard-speech"></p>
          <div class="guide-onboard-field hidden" id="guide-onboard-field">
            <label class="guide-onboard-label" for="guide-onboard-name">Your name</label>
            <input
              id="guide-onboard-name"
              class="guide-onboard-input"
              type="text"
              maxlength="16"
              autocomplete="nickname"
              placeholder="e.g. Juicy Joe"
            />
          </div>
          <button type="button" class="cn-btn cn-btn-primary guide-onboard-btn" id="guide-onboard-btn">Let's go!</button>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.speechEl = this.backdrop.querySelector('#guide-onboard-speech')!;
    this.nameInput = this.backdrop.querySelector('#guide-onboard-name')!;
    this.actionBtn = this.backdrop.querySelector('#guide-onboard-btn')!;

    this.actionBtn.addEventListener('click', () => this.advance());
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.advance();
    });
  }

  show(onDone: () => void): void {
    this.onDone = onDone;
    this.step = 0;
    this.playerName = '';
    this.nameInput.value = '';
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('visible');
    this.renderStep();
    SoundEngine.unlock();
  }

  hide(): void {
    this.backdrop.classList.remove('visible');
    setTimeout(() => this.backdrop.classList.add('hidden'), 320);
  }

  private advance(): void {
    SoundEngine.playUi();

    if (this.step === 0) {
      const name = this.nameInput.value.trim();
      if (name.length < 2) {
        this.nameInput.focus();
        this.nameInput.classList.add('guide-onboard-input--error');
        setTimeout(() => this.nameInput.classList.remove('guide-onboard-input--error'), 600);
        return;
      }
      this.playerName = name;
      setPlayerName(name);
      this.step = 1;
      this.renderStep();
      return;
    }

    this.hide();
    this.onDone?.();
  }

  private renderStep(): void {
    const title = this.backdrop.querySelector('#guide-onboard-title')!;
    const field = this.backdrop.querySelector('#guide-onboard-field')!;

    if (this.step === 0) {
      title.textContent = "I'm Zap!";
      this.speechEl.textContent =
        'Welcome to Fruity Crush! I will coach you through juicy combos, daily challenges, and beast levels. First — what should I call you?';
      field.classList.remove('hidden');
      this.actionBtn.textContent = 'Continue';
      setTimeout(() => this.nameInput.focus(), 200);
      return;
    }

    field.classList.add('hidden');
    title.textContent = `Nice to meet you, ${this.playerName}!`;
    this.speechEl.textContent =
      'Swap adjacent fruits to match 3 or more. Match 4 for row bombs, 5 for a rainbow fruit that clears one color. Chain matches for combo praise and bonus coins. Ready to crush?';
    this.actionBtn.textContent = 'Open the map';
  }
}
