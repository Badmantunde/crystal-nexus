const STORAGE_KEY = 'crystal-nexus-lives-v2';
const LEGACY_KEY = 'crystal-nexus-lives';
export const MAX_LIVES = 5;
export const REGEN_MS = 5 * 60 * 1000;

interface LivesData {
  lives: number;
  regenQueue: number[];
}

export function formatRegenCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class LivesManager {
  private lives: number;
  private regenQueue: number[];

  constructor() {
    const data = this.load();
    this.lives = data.lives;
    this.regenQueue = data.regenQueue;
    this.applyRegeneration();
  }

  /** Reconcile timers; returns true if lives or queue changed. */
  tick(): boolean {
    const beforeLives = this.lives;
    const beforeQueue = this.regenQueue.length;
    this.applyRegeneration();
    return this.lives !== beforeLives || this.regenQueue.length !== beforeQueue;
  }

  getLives(): number {
    this.applyRegeneration();
    return this.lives;
  }

  getMax(): number {
    return MAX_LIVES;
  }

  canPlay(): boolean {
    return this.getLives() > 0;
  }

  hasPendingRegen(): boolean {
    this.applyRegeneration();
    return this.regenQueue.length > 0;
  }

  /** Milliseconds until the next life restores, or null if none pending. */
  getNextRegenMs(): number | null {
    this.applyRegeneration();
    if (this.regenQueue.length === 0) return null;
    return Math.max(0, this.regenQueue[0] - Date.now());
  }

  loseLife(): void {
    this.applyRegeneration();
    if (this.lives <= 0) return;

    this.lives--;
    if (this.lives < MAX_LIVES) {
      this.regenQueue.push(Date.now() + REGEN_MS);
    }
    this.persist();
  }

  addLife(count = 1): boolean {
    this.applyRegeneration();
    if (this.lives >= MAX_LIVES) return false;
    this.lives = Math.min(MAX_LIVES, this.lives + count);
    if (this.lives >= MAX_LIVES) this.regenQueue = [];
    this.persist();
    return true;
  }

  refillAll(): void {
    this.applyRegeneration();
    this.lives = MAX_LIVES;
    this.regenQueue = [];
    this.persist();
  }

  private applyRegeneration(): void {
    const now = Date.now();
    let changed = false;

    while (this.regenQueue.length > 0 && this.regenQueue[0] <= now && this.lives < MAX_LIVES) {
      this.regenQueue.shift();
      this.lives++;
      changed = true;
    }

    if (this.lives >= MAX_LIVES && this.regenQueue.length > 0) {
      this.regenQueue = [];
      changed = true;
    }

    if (changed) this.persist();
  }

  private load(): LivesData {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LivesData;
        return {
          lives: clampLives(parsed.lives),
          regenQueue: Array.isArray(parsed.regenQueue)
            ? parsed.regenQueue.filter((t) => typeof t === 'number').sort((a, b) => a - b)
            : [],
        };
      } catch {
        /* fall through */
      }
    }

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = parseInt(legacy, 10);
      if (Number.isFinite(parsed)) {
        return { lives: clampLives(parsed), regenQueue: [] };
      }
    }

    return { lives: MAX_LIVES, regenQueue: [] };
  }

  private persist(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lives: this.lives, regenQueue: this.regenQueue }),
    );
  }
}

function clampLives(n: number): number {
  return Math.max(0, Math.min(MAX_LIVES, Number.isFinite(n) ? n : MAX_LIVES));
}
