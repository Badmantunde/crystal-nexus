export class QuitConfirmModal {
  private backdrop: HTMLElement;
  private onConfirm: (() => void) | null = null;

  constructor(containerId = 'ui-overlay') {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('QuitConfirmModal: missing container');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cn-modal-backdrop quit-backdrop hidden';
    this.backdrop.innerHTML = `
      <div class="cn-card quit-card" role="dialog" aria-modal="true">
        <h2 class="quit-title">Quit Level?</h2>
        <p class="quit-body">You will lose <strong>1 life</strong> and return to the map.</p>
        <div class="quit-actions">
          <button type="button" class="cn-btn cn-btn-ghost" id="quit-cancel">Keep Playing</button>
          <button type="button" class="cn-btn cn-btn-danger" id="quit-confirm">Quit</button>
        </div>
      </div>
    `;
    container.appendChild(this.backdrop);

    this.backdrop.querySelector('#quit-cancel')!.addEventListener('click', () => this.hide());
    this.backdrop.querySelector('#quit-confirm')!.addEventListener('click', () => {
      this.hide();
      this.onConfirm?.();
    });
  }

  show(onConfirm: () => void): void {
    this.onConfirm = onConfirm;
    this.backdrop.classList.remove('hidden');
    this.backdrop.classList.add('visible');
  }

  hide(): void {
    this.backdrop.classList.remove('visible');
    setTimeout(() => this.backdrop.classList.add('hidden'), 280);
  }

  isVisible(): boolean {
    return this.backdrop.classList.contains('visible');
  }
}
