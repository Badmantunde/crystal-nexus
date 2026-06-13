export class SplashScreen {
  private el: HTMLElement;
  private barFill: HTMLElement;
  private onDone: (() => void) | null = null;
  private raf = 0;
  private startTime = 0;
  private readonly duration = 2200;

  constructor(containerId = 'menu-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('SplashScreen: missing container');

    this.el = document.createElement('div');
    this.el.className = 'splash-screen';
    this.el.innerHTML = `
      <div class="splash-glow"></div>
      <div class="splash-content">
        <div class="splash-logo-wrap">
          <span class="icon-crystal splash-crystal" aria-hidden="true"></span>
          <div class="splash-orbit" aria-hidden="true"></div>
        </div>
        <h1 class="splash-title">Crystal Nexus</h1>
        <p class="splash-tagline">Match · Blast · Conquer</p>
        <div class="splash-loader">
          <div class="splash-loader-track">
            <div class="splash-loader-fill" id="splash-bar"></div>
          </div>
          <span class="splash-loader-text" id="splash-status">Loading crystals…</span>
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

    const tick = (now: number) => {
      const t = Math.min((now - this.startTime) / this.duration, 1);
      this.barFill.style.width = `${easeOutCubic(t) * 100}%`;

      const status = this.el.querySelector('#splash-status')!;
      if (t < 0.35) status.textContent = 'Loading crystals…';
      else if (t < 0.7) status.textContent = 'Charging specials…';
      else status.textContent = 'Ready!';

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
