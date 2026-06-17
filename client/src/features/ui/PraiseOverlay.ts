import type { PraiseMessage } from './PraiseSystem';

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export class PraiseOverlay {
  private el: HTMLElement;
  private subEl: HTMLElement;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('PraiseOverlay: missing container');

    const wrap = document.createElement('div');
    wrap.className = 'praise-overlay';
    wrap.innerHTML = `
      <div class="praise-burst" id="praise-burst"></div>
      <div class="praise-stack">
        <div class="praise-text" id="praise-text"></div>
        <div class="praise-combo" id="praise-combo" hidden>
          <span class="praise-combo-x" id="praise-combo-x">×2</span>
          <span class="praise-combo-label">COMBO</span>
        </div>
        <div class="praise-sub" id="praise-sub"></div>
      </div>
    `;
    container.appendChild(wrap);

    this.el = wrap.querySelector('#praise-text')!;
    this.subEl = wrap.querySelector('#praise-sub')!;
    this.comboWrap = wrap.querySelector('#praise-combo')!;
    this.comboEl = wrap.querySelector('#praise-combo-x')!;
    this.burstEl = wrap.querySelector('#praise-burst')!;
    this.wrap = wrap;
  }

  private wrap: HTMLElement;
  private burstEl: HTMLElement;
  private comboWrap: HTMLElement;
  private comboEl: HTMLElement;

  show(msg: PraiseMessage, durationMs = 1400): void {
    if (hideTimer) clearTimeout(hideTimer);

    this.el.textContent = msg.text;
    this.el.className = `praise-text tier-${msg.tier}`;
    if (msg.combo && msg.combo >= 2) {
      this.comboEl.textContent = `×${msg.combo}`;
      this.comboWrap.hidden = false;
      this.comboWrap.className = `praise-combo tier-${msg.tier}`;
    } else {
      this.comboWrap.hidden = true;
    }
    this.subEl.textContent = msg.sub ?? '';
    this.subEl.style.opacity = msg.sub ? '1' : '0';

    this.wrap.classList.remove('visible');
    void this.wrap.offsetWidth;
    this.wrap.classList.add('visible');
    this.burstEl.classList.remove('pop');
    void this.burstEl.offsetWidth;
    this.burstEl.classList.add('pop');

    hideTimer = setTimeout(() => {
      this.wrap.classList.remove('visible');
      hideTimer = null;
    }, msg.combo && msg.combo >= 2 ? Math.max(durationMs, 1600) : durationMs);
  }
}
