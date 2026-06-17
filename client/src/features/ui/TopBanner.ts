import { MAX_LIVES, formatRegenCountdown } from '../player/Lives';
import { BANNER_ASSETS } from './bannerAssets';
import { MAP_NAV } from './mapNavAssets';
import type { MapNavState } from './MapNavBar';

export interface TopBannerState {
  level: number;
  rank: string;
  playerName?: string;
  lives: number;
  livesRegenMs?: number | null;
  score: number;
  streak?: number;
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
  private streakEl: HTMLElement;
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
          <div class="cn-banner-lives">
            <div class="cn-banner-heart-wrap" id="cn-banner-lives">
              <img class="cn-banner-heart" src="${MAP_NAV.live}" width="32" height="32" alt="" />
            </div>
            <span class="cn-banner-lives-text" id="cn-banner-lives-val">FULL</span>
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
              <span class="cn-banner-score-val" id="cn-banner-score">174</span>
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
    this.streakEl = this.root.querySelector('#cn-banner-streak')!;
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
    this.applyNavState(state);
  }

  updateNav(state: MapNavState): void {
    this.applyNavState(state);
  }

  private applyNavState(state: TopBannerState | MapNavState): void {
    const empty = state.lives <= 0;
    const full = state.lives >= MAX_LIVES;

    this.livesIconEl.src = empty ? MAP_NAV.liveLost : MAP_NAV.live;
    this.livesWrapEl.classList.toggle('cn-banner-heart-wrap--lost', empty);

    if (empty) {
      const cd = state.livesRegenMs != null ? formatRegenCountdown(state.livesRegenMs) : '--:--';
      this.livesValEl.textContent = cd;
      this.livesValEl.classList.add('cn-banner-lives-text--timer');
    } else if (full) {
      this.livesValEl.textContent = 'FULL';
      this.livesValEl.classList.remove('cn-banner-lives-text--timer');
    } else {
      this.livesValEl.textContent = `x${state.lives}`;
      this.livesValEl.classList.remove('cn-banner-lives-text--timer');
    }

    this.levelEl.textContent = `LV ${state.level}`;
    const name = 'playerName' in state && state.playerName ? state.playerName : '';
    this.rankEl.textContent = name ? name.toUpperCase() : state.rank.toUpperCase();
    this.streakEl.textContent = `x${state.streak ?? 1}`;
    this.scoreEl.textContent = state.score.toLocaleString();

    if ('avatarUrl' in state && state.avatarUrl) {
      this.avatarImgEl.src = state.avatarUrl;
    }

    this.livesWrapEl.setAttribute(
      'aria-label',
      empty && state.livesRegenMs != null
        ? `No lives. Next in ${formatRegenCountdown(state.livesRegenMs)}`
        : full
          ? 'Lives full'
          : `${state.lives} lives`,
    );
  }

  shakeLives(): void {
    this.livesWrapEl.classList.add('shake');
    setTimeout(() => this.livesWrapEl.classList.remove('shake'), 400);
  }
}
