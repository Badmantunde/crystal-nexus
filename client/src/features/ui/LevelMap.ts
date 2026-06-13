import { LevelProgress, type LevelInfo } from '../player/LevelProgress';
import { getStageTheme } from '../player/LevelDifficulty';
import { LivesManager } from '../player/Lives';
import {
  countTotalStars,
  getAvatarInitials,
  getRankFromStars,
} from '../player/PlayerProfile';
import {
  difficultyTagHtml,
  livesPillHtml,
  lockIconHtml,
  playerChipHtml,
  starRowHtml,
} from './UiChrome';

const MAP_W = 340;
const ROW_H = 126;
const NODE_HALF = 54;
const TOP_PAD = 54;

export class LevelMap {
  private backdrop: HTMLElement;
  private scrollEl: HTMLElement;
  private listEl: HTMLElement;
  private trailEl: HTMLElement;
  private livesEl!: HTMLElement;
  private playerEl: HTMLElement;
  private progress: LevelProgress;
  private lives: LivesManager;
  private onSelect: ((level: number) => void) | null = null;

  constructor(containerId = 'menu-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('LevelMap: missing container');

    this.progress = new LevelProgress();
    this.lives = new LivesManager();

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'level-map hidden';
    this.backdrop.innerHTML = `
      <div class="level-map-top" id="map-player"></div>
      <div class="level-map-scroll">
        <div class="map-start-label">Start</div>
        <div class="map-stage">
          <svg class="map-trail-svg" id="map-trail" aria-hidden="true"></svg>
          <div class="level-map-path" id="map-levels"></div>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.scrollEl = this.backdrop.querySelector('.level-map-scroll')!;
    this.listEl = this.backdrop.querySelector('#map-levels')!;
    this.trailEl = this.backdrop.querySelector('#map-trail')!;
    this.playerEl = this.backdrop.querySelector('#map-player')!;
  }

  show(onSelect: (level: number) => void): void {
    this.onSelect = onSelect;
    this.render();
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('visible');
    this.scrollToCurrent();
  }

  hide(): void {
    this.backdrop.classList.remove('visible');
    setTimeout(() => this.backdrop.classList.add('hidden'), 280);
  }

  refresh(): void {
    if (!this.backdrop.classList.contains('hidden')) this.render();
  }

  private scrollToCurrent(): void {
    setTimeout(() => {
      const current = this.scrollEl.querySelector('.map-node.current');
      if (current) {
        current.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else {
        this.scrollEl.scrollTop = 0;
      }
    }, 80);
  }

  private render(): void {
    const levels = this.progress.getLevelList();
    const unlocked = this.progress.getUnlockedLevel();
    const totalStars = countTotalStars(this.progress);
    const rank = getRankFromStars(totalStars).name;

    this.playerEl.innerHTML = `
      ${playerChipHtml(getAvatarInitials(), unlocked, rank)}
      <div id="map-lives-wrap">${livesPillHtml(this.lives.getLives())}</div>
    `;
    this.livesEl = this.backdrop.querySelector('#map-lives-wrap')!;

    const stage = this.backdrop.querySelector('.map-stage') as HTMLElement;
    const stageH = TOP_PAD + (levels.length - 1) * ROW_H + TOP_PAD;
    stage.style.minHeight = `${stageH}px`;

    this.listEl.innerHTML = levels.map((info, i) => this.renderNode(info, i)).join('');
    this.drawTrail(levels.length, unlocked);

    this.listEl.querySelectorAll('.map-node.playable').forEach((node) => {
      node.addEventListener('click', () => {
        const level = Number((node as HTMLElement).dataset.level);
        if (level && this.lives.canPlay()) {
          this.onSelect?.(level);
        } else if (!this.lives.canPlay()) {
          this.flashNoLives();
        }
      });
    });
  }

  private nodeCenter(index: number): { x: number; y: number } {
    return {
      x: index % 2 === 0 ? NODE_HALF : MAP_W - NODE_HALF,
      y: TOP_PAD + index * ROW_H,
    };
  }

  private buildPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = (prev.y + curr.y) / 2;
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  private drawTrail(levelCount: number, unlockedLevel: number): void {
    const allPts = Array.from({ length: levelCount }, (_, i) => this.nodeCenter(i));
    const activePts = allPts.slice(0, Math.max(1, unlockedLevel));
    const height = TOP_PAD + (levelCount - 1) * ROW_H + TOP_PAD;

    this.trailEl.setAttribute('viewBox', `0 0 ${MAP_W} ${height}`);
    this.trailEl.innerHTML = `
      <defs>
        <linearGradient id="trailGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#c4b5fd" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0.55"/>
        </linearGradient>
      </defs>
      <path class="map-trail-bg" d="${this.buildPath(allPts)}" />
      <path class="map-trail-active" d="${this.buildPath(activePts)}" />
      ${allPts
        .map(
          (p, i) =>
            `<circle class="map-trail-node${i < unlockedLevel ? ' active' : ''}" cx="${p.x}" cy="${p.y}" r="5" />`,
        )
        .join('')}
    `;
  }

  private renderNode(info: LevelInfo, index: number): string {
    const side = index % 2 === 0 ? 'left' : 'right';
    const locked = !info.unlocked;
    const isCurrent = info.level === this.progress.getUnlockedLevel() && !locked;
    const theme = getStageTheme(info.difficulty);
    const diffSlug = info.difficulty.replace('_', '-');

    return `
      <div class="map-row map-row-${side}" style="--row-i:${index}">
        <button
          type="button"
          class="map-node map-node-${diffSlug}${locked ? ' locked' : ' playable'}${isCurrent ? ' current' : ''}"
          data-level="${info.level}"
          ${locked ? 'disabled' : ''}
        >
          ${info.level === 1 ? '<span class="map-node-start">LV 1</span>' : ''}
          ${locked ? lockIconHtml() : ''}
          <span class="map-node-num">${info.level}</span>
          ${difficultyTagHtml(info.difficulty, theme.label)}
          <span class="map-node-stars" title="${info.stars} of 3 stars">${starRowHtml(info.stars)}</span>
          <span class="map-node-target">${info.targetScore.toLocaleString()} pts</span>
          <span class="map-node-moves">${info.moves} moves</span>
        </button>
      </div>
    `;
  }

  private flashNoLives(): void {
    this.livesEl.classList.add('shake');
    setTimeout(() => this.livesEl.classList.remove('shake'), 400);
  }
}
