import { MAX_LIVES, formatRegenCountdown } from '../player/Lives';
import { MAP_NAV } from './mapNavAssets';

export interface MapNavState {
  level: number;
  rank: string;
  lives: number;
  livesRegenMs?: number | null;
  coins: number;
  score: number;
  streak?: number;
}

export class MapNavBar {
  private root: HTMLElement;
  private livesIconEl: HTMLImageElement;
  private livesTextEl: HTMLElement;
  private coinsEl: HTMLElement;
  private levelNumEl: HTMLElement;
  private rankEl: HTMLElement;
  private scoreEl: HTMLElement;
  private streakEl: HTMLElement;
  private onAddLives: (() => void) | null = null;
  private onAddCoins: (() => void) | null = null;
  private onMission: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    const a = MAP_NAV;
    this.root = document.createElement('nav');
    this.root.className = 'map-nav';
    this.root.setAttribute('aria-label', 'World map status');
    this.root.innerHTML = `
      <div class="map-nav-col map-nav-col--left">
        <div class="map-nav-row">
          <div class="map-pill map-pill--lives" id="map-nav-lives-pill">
            <img class="map-pill-icon map-pill-icon--live" id="map-nav-lives-icon" src="${a.live}" width="28" height="28" alt="" />
            <span class="map-pill-text" id="map-nav-lives-text">FULL</span>
          </div>
          <button type="button" class="map-add-btn" id="map-nav-add-lives" aria-label="Get more lives">
            <img src="${a.add}" width="18" height="18" alt="" />
          </button>
        </div>
        <div class="map-nav-row">
          <div class="map-pill map-pill--coins">
            <img class="map-pill-icon" src="${a.money}" width="26" height="26" alt="" />
            <span class="map-pill-text" id="map-nav-coins">0</span>
          </div>
          <button type="button" class="map-add-btn" id="map-nav-add-coins" aria-label="Get more coins">
            <img src="${a.add}" width="18" height="18" alt="" />
          </button>
        </div>
        <button type="button" class="map-pill map-pill--solo map-pill--mission" id="map-nav-mission">Mission</button>
      </div>
      <div class="map-nav-col map-nav-col--right">
        <div class="map-pill map-pill--level">
          <img class="map-pill-icon map-pill-icon--level" src="${a.level}" width="30" height="30" alt="" />
          <div class="map-pill-stack">
            <span class="map-pill-text" id="map-nav-level">LV 1</span>
            <span class="map-pill-sub" id="map-nav-rank">ROOKIE</span>
          </div>
        </div>
        <div class="map-pill map-pill--score">
          <img class="map-pill-icon" src="${a.ranking}" width="22" height="22" alt="" />
          <span class="map-pill-text" id="map-nav-score">0</span>
        </div>
        <div class="map-pill map-pill--streak">
          <img class="map-pill-icon map-pill-icon--fire" src="${a.fire}" width="22" height="22" alt="" />
          <span class="map-pill-text" id="map-nav-streak">x1</span>
        </div>
      </div>
    `;
    parent.appendChild(this.root);

    this.livesIconEl = this.root.querySelector('#map-nav-lives-icon')!;
    this.livesTextEl = this.root.querySelector('#map-nav-lives-text')!;
    this.coinsEl = this.root.querySelector('#map-nav-coins')!;
    this.levelNumEl = this.root.querySelector('#map-nav-level')!;
    this.rankEl = this.root.querySelector('#map-nav-rank')!;
    this.scoreEl = this.root.querySelector('#map-nav-score')!;
    this.streakEl = this.root.querySelector('#map-nav-streak')!;

    this.root.querySelector('#map-nav-add-lives')!.addEventListener('click', () => this.onAddLives?.());
    this.root.querySelector('#map-nav-add-coins')!.addEventListener('click', () => this.onAddCoins?.());
    this.root.querySelector('#map-nav-mission')!.addEventListener('click', () => this.onMission?.());
  }

  setOnAddLives(handler: () => void): void {
    this.onAddLives = handler;
  }

  setOnAddCoins(handler: () => void): void {
    this.onAddCoins = handler;
  }

  setOnMission(handler: () => void): void {
    this.onMission = handler;
  }

  update(state: MapNavState): void {
    const empty = state.lives <= 0;
    const full = state.lives >= MAX_LIVES;

    this.livesIconEl.src = empty ? MAP_NAV.liveLost : MAP_NAV.live;
    this.livesIconEl.classList.toggle('map-pill-icon--lost', empty);

    if (empty) {
      const cd = state.livesRegenMs != null ? formatRegenCountdown(state.livesRegenMs) : '--:--';
      this.livesTextEl.textContent = cd;
      this.livesTextEl.classList.add('map-pill-text--timer');
    } else if (full) {
      this.livesTextEl.textContent = 'FULL';
      this.livesTextEl.classList.remove('map-pill-text--timer');
    } else {
      this.livesTextEl.textContent = `x${state.lives}`;
      this.livesTextEl.classList.remove('map-pill-text--timer');
    }

    this.root.querySelector('#map-nav-lives-pill')!.classList.toggle('map-pill--empty', empty);

    this.coinsEl.textContent = state.coins.toLocaleString();
    this.levelNumEl.textContent = `LV ${state.level}`;
    this.rankEl.textContent = state.rank.toUpperCase();
    this.scoreEl.textContent = state.score.toLocaleString();
    this.streakEl.textContent = `x${state.streak ?? 1}`;
  }

  shakeLives(): void {
    this.root.querySelector('#map-nav-lives-pill')?.classList.add('map-pill--shake');
    setTimeout(() => {
      this.root.querySelector('#map-nav-lives-pill')?.classList.remove('map-pill--shake');
    }, 450);
  }
}
