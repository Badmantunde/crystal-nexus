import { FRUIT_URLS, preloadFruitSprites, type FruitKind } from '../candy/fruitAssets';

const SPLASH_ORBIT_FRUITS: FruitKind[] = ['apple', 'orange', 'pear', 'berry', 'grape', 'carrot'];

export class SplashScreen {
  private el: HTMLElement;
  private barFill: HTMLElement;
  private onDone: (() => void) | null = null;
  private raf = 0;
  private startTime = 0;
  private readonly duration = 2400;

  constructor(containerId = 'menu-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('SplashScreen: missing container');

    const orbitHtml = SPLASH_ORBIT_FRUITS.map(
      (kind, i) =>
        `<img class="splash-fruit-orbit-item" style="--fi:${i}" src="${FRUIT_URLS[kind]}" width="34" height="34" alt="" />`,
    ).join('');

    this.el = document.createElement('div');
    this.el.className = 'splash-screen';
    this.el.innerHTML = `
      <div class="splash-glow" aria-hidden="true"></div>
      <div class="splash-bubbles" aria-hidden="true"></div>
      <div class="splash-content">
        <div class="splash-logo-wrap">
          <div class="splash-fruit-ring">${orbitHtml}</div>
          <div class="splash-fruit-core">
            <img class="splash-fruit-hero" src="${FRUIT_URLS.orange}" width="48" height="48" alt="" />
          </div>
        </div>
        <h1 class="splash-title">
          <span class="splash-title-fruity">Fruity</span>
          <span class="splash-title-crush">Crush</span>
        </h1>
        <p class="splash-tagline">Match · Pop · Juicy Wins</p>
        <div class="splash-loader">
          <div class="splash-loader-track">
            <div class="splash-loader-fill" id="splash-bar"></div>
          </div>
          <span class="splash-loader-text" id="splash-status">Picking fruits…</span>
        </div>
      </div>
    `;
    container.appendChild(this.el);
    this.barFill = this.el.querySelector('#splash-bar')!;
  }

  show(onDone: () => void): void {
    this.onDone = onDone;
    this.startTime = performance.now();
    this.el.classList.add('visible');
    void preloadFruitSprites();

    const tick = (now: number) => {
      const t = Math.min((now - this.startTime) / this.duration, 1);
      this.barFill.style.width = `${easeOutCubic(t) * 100}%`;

      const status = this.el.querySelector('#splash-status')!;
      if (t < 0.35) status.textContent = 'Picking fruits…';
      else if (t < 0.7) status.textContent = 'Juicing combos…';
      else status.textContent = 'Ready to crush!';

      if (t >= 1) {
        this.hide();
        this.onDone?.();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  hide(): void {
    cancelAnimationFrame(this.raf);
    this.el.classList.remove('visible');
    setTimeout(() => this.el.remove(), 400);
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
