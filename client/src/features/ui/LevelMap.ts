import { buildLevelConfig } from '../player/LevelScript';
import { purchaseSkipStage, SHOP } from '../player/Economy';
import { getChapterForLevel, isChapterStart } from '../player/Chapters';
import { LevelProgress, type LevelInfo } from '../player/LevelProgress';
import { LivesManager } from '../player/Lives';
import { buildMapNavState } from '../player/playerNavState';
import { getThemedLevelTileUrl, getLevelMapSvgPath } from './levelMapAssets';
import { MapNavBar } from './MapNavBar';
import { NoLivesModal } from './NoLivesModal';
import { ShopModal } from './ShopModal';
import { DayChallengeModal } from './DayChallengeModal';
import { starRowHtml } from './UiChrome';

const MAP_W = 340;
const NODE_W = 97;
const NODE_H = 84;
const ROW_H = 112;
const CHAPTER_ROW_H = 52;
const PATH_GAP = 14;
const NODE_HALF = NODE_W / 2;
const TOP_PAD = 40;
const BOTTOM_PAD = 64;

export class LevelMap {
  private backdrop: HTMLElement;
  private scrollEl: HTMLElement;
  private listEl: HTMLElement;
  private trailEl: HTMLElement;
  private nav: MapNavBar;
  private noLivesModal: NoLivesModal;
  private shopModal: ShopModal;
  private dayChallengeModal: DayChallengeModal;
  private progress: LevelProgress;
  private lives: LivesManager;
  private onSelect: ((level: number) => void) | null = null;
  private onDayChallengePlay: (() => void) | null = null;
  private regenTimer: ReturnType<typeof setInterval> | null = null;
  private jumpPointerEl: HTMLButtonElement;
  private onScrollPointer: (() => void) | null = null;

  constructor(containerId = 'menu-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('LevelMap: missing container');

    this.progress = new LevelProgress();
    this.lives = new LivesManager();
    this.noLivesModal = new NoLivesModal(containerId, this.lives);
    this.shopModal = new ShopModal(containerId, this.lives, this.progress);
    this.dayChallengeModal = new DayChallengeModal(containerId);

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'level-map hidden';
    this.backdrop.innerHTML = `
      <div class="level-map-top" id="map-nav-slot"></div>
      <div class="level-map-scroll">
        <div class="map-summit-label">Summit</div>
        <div class="map-stage">
          <svg class="map-trail-svg" id="map-trail" aria-hidden="true"></svg>
          <div class="level-map-path" id="map-levels"></div>
        </div>
        <div class="map-start-label">Start — Sunny Grove</div>
      </div>
      <button
        type="button"
        class="map-jump-pointer"
        id="map-jump-pointer"
        aria-label="Jump to your current level"
        hidden
      >
        <img src="/pointer.svg" width="48" height="68" alt="" draggable="false" />
      </button>
    `;
    container.appendChild(this.backdrop);

    this.scrollEl = this.backdrop.querySelector('.level-map-scroll')!;
    this.listEl = this.backdrop.querySelector('#map-levels')!;
    this.trailEl = this.backdrop.querySelector('#map-trail')!;
    this.jumpPointerEl = this.backdrop.querySelector('#map-jump-pointer')!;
    this.nav = new MapNavBar(this.backdrop.querySelector('#map-nav-slot')!);

    this.jumpPointerEl.addEventListener('click', () => this.scrollToCurrent());

    this.nav.setOnAddLives(() => this.shopModal.show('lives'));
    this.nav.setOnAddCoins(() => this.shopModal.show('coins'));
    this.nav.setOnDayChallenge(() => this.dayChallengeModal.show());
    this.dayChallengeModal.setOnPlay(() => this.onDayChallengePlay?.());
    this.dayChallengeModal.setOnChange(() => this.updateNav(this.progress.getUnlockedLevel()));
    this.shopModal.setOnChange(() => this.render());
    this.noLivesModal.setOnShop(() => this.shopModal.show('lives'));
  }

  setOnDayChallengePlay(handler: () => void): void {
    this.onDayChallengePlay = handler;
  }

  show(onSelect: (level: number) => void): void {
    this.onSelect = onSelect;
    this.render();
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('visible');
    this.scrollToCurrent();
    this.bindJumpPointer();
    this.startRegenTick();
  }

  hide(): void {
    this.stopRegenTick();
    this.unbindJumpPointer();
    this.noLivesModal.hide();
    this.shopModal.hide();
    this.dayChallengeModal.hide();
    this.backdrop.classList.remove('visible');
    setTimeout(() => this.backdrop.classList.add('hidden'), 280);
  }

  refresh(): void {
    this.progress.reload();
    this.lives.reload();
    if (!this.backdrop.classList.contains('hidden')) this.render();
  }

  private scrollToCurrent(): void {
    setTimeout(() => {
      const current = this.scrollEl.querySelector('.map-node.current');
      if (current) {
        current.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else {
        this.scrollEl.scrollTop = this.scrollEl.scrollHeight;
      }
      setTimeout(() => this.updateJumpPointer(), 400);
    }, 80);
  }

  private bindJumpPointer(): void {
    this.unbindJumpPointer();
    this.onScrollPointer = () => this.updateJumpPointer();
    this.scrollEl.addEventListener('scroll', this.onScrollPointer, { passive: true });
    window.addEventListener('resize', this.onScrollPointer);
    requestAnimationFrame(() => this.updateJumpPointer());
  }

  private unbindJumpPointer(): void {
    if (this.onScrollPointer) {
      this.scrollEl.removeEventListener('scroll', this.onScrollPointer);
      window.removeEventListener('resize', this.onScrollPointer);
      this.onScrollPointer = null;
    }
    this.jumpPointerEl.hidden = true;
    this.jumpPointerEl.classList.remove('is-visible');
  }

  private updateJumpPointer(): void {
    const current = this.scrollEl.querySelector('.map-node.current') as HTMLElement | null;
    if (!current || this.backdrop.classList.contains('hidden')) {
      this.jumpPointerEl.hidden = true;
      this.jumpPointerEl.classList.remove('is-visible');
      return;
    }

    const scrollRect = this.scrollEl.getBoundingClientRect();
    const nodeRect = current.getBoundingClientRect();
    const inset = 32;
    const inView =
      nodeRect.top >= scrollRect.top + inset &&
      nodeRect.bottom <= scrollRect.bottom - inset;

    this.jumpPointerEl.hidden = inView;
    this.jumpPointerEl.classList.toggle('is-visible', !inView);
  }

  private render(): void {
    this.progress.reload();
    this.lives.reload();

    const levels = this.progress.getLevelList();
    const unlocked = this.progress.getUnlockedLevel();

    this.updateNav(unlocked);

    const chapterRows = levels.filter((l) => isChapterStart(l.level)).length;
    const stageH = this.mapStageHeight(levels.length, chapterRows);

    const stage = this.backdrop.querySelector('.map-stage') as HTMLElement;
    stage.style.minHeight = `${stageH}px`;

    this.listEl.innerHTML = levels
      .map((info, i) => {
        const chapterHeader = isChapterStart(info.level)
          ? this.renderChapterHeader(info.level)
          : '';
        return chapterHeader + this.renderNode(info, i);
      })
      .join('');

    this.drawTrail(levels.length, unlocked);

    this.listEl.querySelectorAll('.map-node.playable').forEach((node) => {
      node.addEventListener('click', () => {
        const level = Number((node as HTMLElement).dataset.level);
        if (!level) return;
        if (this.lives.canPlay()) {
          this.onSelect?.(level);
        } else {
          this.nav.shakeLives();
          this.noLivesModal.show();
        }
      });
    });

    this.listEl.querySelectorAll('.map-node-skip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const level = Number((btn as HTMLElement).dataset.skipLevel);
        if (!level) return;
        const result = purchaseSkipStage(this.progress, level);
        if (result.ok) {
          this.render();
          this.scrollToCurrent();
        } else {
          this.shopModal.show('coins');
        }
      });
    });

    void this.applyTileArt();
    requestAnimationFrame(() => this.updateJumpPointer());
  }

  private renderChapterHeader(level: number): string {
    const ch = getChapterForLevel(level);
    return `
      <div class="map-chapter-header" data-chapter="${ch.id}">
        <span class="map-chapter-kicker">Chapter ${ch.id}</span>
        <span class="map-chapter-name">${ch.name}</span>
        <span class="map-chapter-sub">${ch.subtitle}</span>
      </div>
    `;
  }

  private updateNav(level: number): void {
    this.nav.update(
      buildMapNavState({
        level,
        lives: this.lives.getLives(),
        livesRegenMs: this.lives.getNextRegenMs(),
        progress: this.progress,
      }),
    );
  }

  private async applyTileArt(): Promise<void> {
    const imgs = this.listEl.querySelectorAll<HTMLImageElement>('img.map-node-art');
    await Promise.all(
      Array.from(imgs).map(async (img) => {
        const level = Number(img.dataset.level);
        const unlocked = img.dataset.unlocked === 'true';
        if (!level) return;
        try {
          img.src = await getThemedLevelTileUrl(level, unlocked);
        } catch {
          img.src = getLevelMapSvgPath(level, unlocked);
        }
      }),
    );
  }

  private chapterHeaderCountThrough(level: number): number {
    let n = 0;
    for (let lv = 1; lv <= level; lv++) {
      if (isChapterStart(lv)) n++;
    }
    return n;
  }

  private mapStageHeight(levelCount: number, chapterRows: number): number {
    const itemCount = levelCount + chapterRows;
    const flexH =
      levelCount * ROW_H + chapterRows * CHAPTER_ROW_H + Math.max(0, itemCount - 1) * PATH_GAP;
    return TOP_PAD + flexH + BOTTOM_PAD;
  }

  private verticalOffsetFromBottom(level: number): number {
    const index = level - 1;
    const chapters = this.chapterHeaderCountThrough(level);
    return (
      ROW_H / 2 + index * (ROW_H + PATH_GAP) + chapters * (CHAPTER_ROW_H + PATH_GAP)
    );
  }

  private mapSide(level: number): 'left' | 'right' {
    return level % 2 === 0 ? 'right' : 'left';
  }

  private nodeCenter(index: number, level: number, levelCount: number): { x: number; y: number } {
    const chapterRows = Array.from({ length: levelCount }, (_, i) => i + 1).filter((lv) =>
      isChapterStart(lv),
    ).length;
    const totalH = this.mapStageHeight(levelCount, chapterRows);
    const y = totalH - BOTTOM_PAD - this.verticalOffsetFromBottom(level);

    const side = this.mapSide(level);
    const baseX = side === 'left' ? NODE_HALF + 12 : MAP_W - NODE_HALF - 12;
    const wobble = this.seededOffset(index, 18) - 9;
    const x = baseX + (side === 'left' ? wobble : -wobble);

    return { x, y };
  }

  private seededOffset(seed: number, range: number): number {
    return ((seed * 1103515245 + 12345) >>> 0) % range;
  }

  private buildImperfectPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;

      const w1 = this.seededOffset(i * 3 + 1, 23) - 11;
      const w2 = this.seededOffset(i * 7 + 5, 19) - 9;
      const w3 = this.seededOffset(i * 11 + 2, 15) - 7;
      const sag = this.seededOffset(i * 13, 13) - 6;

      const cp1x = prev.x + dx * 0.18 + w1 + sag;
      const cp1y = prev.y + dy * 0.42 + w2 * 0.6;
      const cp2x = prev.x + dx * 0.72 + w3 - sag * 0.5;
      const cp2y = prev.y + dy * 0.58 - w1 * 0.4;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  private drawTrail(levelCount: number, unlockedLevel: number): void {
    const allPts = Array.from({ length: levelCount }, (_, i) => this.nodeCenter(i, i + 1, levelCount));
    const activePts = allPts.slice(0, Math.max(1, unlockedLevel));
    const chapterRows = Array.from({ length: levelCount }, (_, i) => i + 1).filter((lv) =>
      isChapterStart(lv),
    ).length;
    const height = this.mapStageHeight(levelCount, chapterRows);

    this.trailEl.setAttribute('viewBox', `0 0 ${MAP_W} ${height}`);
    this.trailEl.innerHTML = `
      <defs>
        <linearGradient id="trailGlow" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#c4b5fd" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <path class="map-trail-bg" d="${this.buildImperfectPath(allPts)}" />
      <path class="map-trail-active" d="${this.buildImperfectPath(activePts)}" />
      ${allPts
        .map(
          (p, i) =>
            `<circle class="map-trail-node${i < unlockedLevel ? ' active' : ''}" cx="${p.x}" cy="${p.y}" r="4.5" />`,
        )
        .join('')}
    `;
  }

  private renderNode(info: LevelInfo, index: number): string {
    const side = this.mapSide(info.level);
    const locked = !info.unlocked;
    const isCurrent = info.level === this.progress.getUnlockedLevel() && !locked;
    const cfg = buildLevelConfig(info.level);
    const diffClass = `map-node--${cfg.difficulty}`;
    const canSkip = isCurrent && this.progress.canSkipLevel(info.level);

    return `
      <div class="map-row map-row-${side}" style="--row-i:${index}">
        <div class="map-node-stack">
          <button
            type="button"
            class="map-node${locked ? ' locked' : ' playable'}${isCurrent ? ' current' : ''} ${diffClass}"
            data-level="${info.level}"
            aria-label="Level ${info.level}${locked ? ' locked' : ''}${info.stars ? `, ${info.stars} stars` : ''}"
            ${locked ? 'disabled' : ''}
          >
            <img
              class="map-node-art"
              data-level="${info.level}"
              data-unlocked="${locked ? 'false' : 'true'}"
              width="${NODE_W}"
              height="${NODE_H}"
              alt=""
              draggable="false"
            />
            <span class="map-node-stars" title="${info.stars} of 3 stars">${starRowHtml(info.stars)}</span>
          </button>
          ${
            canSkip
              ? `<button type="button" class="map-node-skip" data-skip-level="${info.level}" aria-label="Skip stage for ${SHOP.skipStage} coins">Skip · ${SHOP.skipStage}</button>`
              : ''
          }
        </div>
      </div>
    `;
  }

  private startRegenTick(): void {
    this.stopRegenTick();
    this.regenTimer = setInterval(() => {
      const hadRegen = this.lives.hasPendingRegen();
      if (hadRegen) this.lives.tick();
      if (hadRegen || this.lives.getLives() === 0) {
        this.updateNav(this.progress.getUnlockedLevel());
      }
    }, 1000);
  }

  private stopRegenTick(): void {
    if (this.regenTimer !== null) {
      clearInterval(this.regenTimer);
      this.regenTimer = null;
    }
  }
}
