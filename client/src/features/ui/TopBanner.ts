import { formatRegenCountdown } from '../player/Lives';
import { LIVE_LOST_URL, LIVE_URL } from './UiChrome';
import { BANNER_ASSETS } from './bannerAssets';

export interface TopBannerState {
  level: number;
  rank: string;
  lives: number;
  livesRegenMs?: number | null;
  combo?: number;
  score: number;
  avatarUrl?: string;
}

export interface TopBannerOptions {
  showQuit?: boolean;
  showLevel?: boolean;
}

export class TopBanner {
  private root: HTMLElement;
  private livesWrapEl: HTMLElement;
  private livesIconEl: HTMLImageElement;
  private livesValEl: HTMLElement;
  private levelEl: HTMLElement;
  private rankEl: HTMLElement;
  private comboEl: HTMLElement;
  private scoreEl: HTMLElement;
  private avatarImgEl: HTMLImageElement;
  private onQuit: (() => void) | null = null;

  constructor(parent: HTMLElement, options: TopBannerOptions = {}) {
    const showLevel = options.showLevel !== false;
    const a = BANNER_ASSETS;
    this.root = document.createElement('header');
    this.root.className = 'cn-top-banner';
    this.root.innerHTML = `
      <div class="cn-banner-track">
        <div class="cn-banner-pill" aria-hidden="true">
          <div class="cn-banner-pill-outer"></div>
          <div class="cn-banner-pill-inner"></div>
        </div>

        <div class="cn-banner-avatar">
          <div class="cn-banner-avatar-ring">
            <div class="cn-banner-avatar-blue">
              <div class="cn-banner-avatar-photo">
                <img class="cn-banner-avatar-img" src="${a.avatar}" width="84" height="84" alt="" />
              </div>
            </div>
          </div>
        </div>

        <div class="cn-banner-row">
          <div class="cn-banner-side cn-banner-side--left">
            <div class="cn-banner-heart-wrap" id="cn-banner-lives">
              <img class="cn-banner-heart" src="${LIVE_URL}" width="32" height="32" alt="" />
              <span class="cn-banner-lives-val" id="cn-banner-lives-val">5</span>
            </div>
            <div class="cn-banner-level-block${showLevel ? '' : ' cn-banner-level-block--rank-only'}">
              <p class="cn-banner-lv" id="cn-banner-lv"${showLevel ? '' : ' hidden'}>LV 1</p>
              <p class="cn-banner-rank" id="cn-banner-rank">ROOKIE</p>
            </div>
          </div>

          <div class="cn-banner-side cn-banner-side--right">
            <div class="cn-banner-streak">
              <img class="cn-banner-fire" src="${a.fire}" width="18" height="18" alt="" />
              <span class="cn-banner-streak-val" id="cn-banner-streak">x1</span>
            </div>
            <div class="cn-banner-score">
              <img class="cn-banner-ranking" src="${a.ranking}" width="18" height="18" alt="" />
              <span class="cn-banner-score-val" id="cn-banner-score">123</span>
            </div>
          </div>
        </div>
      </div>

      ${
        options.showQuit
          ? '<button type="button" class="cn-banner-quit" id="cn-banner-quit">Quit</button>'
          : ''
      }
    `;

    parent.appendChild(this.root);

    this.livesWrapEl = this.root.querySelector('#cn-banner-lives')!;
    this.livesIconEl = this.root.querySelector('.cn-banner-heart')!;
    this.livesValEl = this.root.querySelector('#cn-banner-lives-val')!;
    this.levelEl = this.root.querySelector('#cn-banner-lv')!;
    this.rankEl = this.root.querySelector('#cn-banner-rank')!;
    this.comboEl = this.root.querySelector('#cn-banner-streak')!;
    this.scoreEl = this.root.querySelector('#cn-banner-score')!;
    this.avatarImgEl = this.root.querySelector('.cn-banner-avatar-img')!;

    if (options.showQuit) {
      this.root.querySelector('#cn-banner-quit')!.addEventListener('click', () => this.onQuit?.());
    }
  }

  getElement(): HTMLElement {
    return this.root;
  }

  getLivesWrap(): HTMLElement {
    return this.livesWrapEl;
  }

  setOnQuit(handler: () => void): void {
    this.onQuit = handler;
  }

  update(state: TopBannerState): void {
    const empty = state.lives === 0;
    this.livesIconEl.src = empty ? LIVE_LOST_URL : LIVE_URL;
    this.livesWrapEl.classList.toggle('cn-banner-heart-wrap--lost', empty);

    if (empty && state.livesRegenMs != null) {
      this.livesValEl.textContent = formatRegenCountdown(state.livesRegenMs);
      this.livesValEl.classList.add('cn-banner-lives-val--timer');
    } else {
      this.livesValEl.textContent = String(state.lives);
      this.livesValEl.classList.remove('cn-banner-lives-val--timer');
    }

    this.levelEl.textContent = `LV ${state.level}`;
    this.rankEl.textContent = state.rank.toUpperCase();
    this.comboEl.textContent = `x${Math.max(1, state.combo ?? 1)}`;
    this.scoreEl.textContent = state.score.toLocaleString();

    if (state.avatarUrl) {
      this.avatarImgEl.src = state.avatarUrl;
    }

    this.livesWrapEl.setAttribute(
      'aria-label',
      empty && state.livesRegenMs
        ? `No lives. Next in ${formatRegenCountdown(state.livesRegenMs)}`
        : `${state.lives} lives`,
    );
  }

  shakeLives(): void {
    this.livesWrapEl.classList.add('shake');
    setTimeout(() => this.livesWrapEl.classList.remove('shake'), 400);
  }
}
