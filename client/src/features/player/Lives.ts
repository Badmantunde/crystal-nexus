const STORAGE_KEY = 'crystal-nexus-lives';
export const MAX_LIVES = 5;

export class LivesManager {
  private lives: number;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : MAX_LIVES;
    this.lives = Number.isFinite(parsed) ? Math.max(0, Math.min(MAX_LIVES, parsed)) : MAX_LIVES;
  }

  getLives(): number {
    return this.lives;
  }

  getMax(): number {
    return MAX_LIVES;
  }

  canPlay(): boolean {
    return this.lives > 0;
  }

  loseLife(): void {
    if (this.lives > 0) {
      this.lives--;
      this.persist();
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, String(this.lives));
  }
}
