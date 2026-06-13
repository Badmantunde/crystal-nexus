import { buildLevelConfig, type Difficulty } from './LevelDifficulty';

const STORAGE_KEY = 'crystal-nexus-progress';
const TOTAL_LEVELS = 30;

export interface LevelInfo {
  level: number;
  targetScore: number;
  moves: number;
  difficulty: Difficulty;
  unlocked: boolean;
  stars: 0 | 1 | 2 | 3;
}

interface ProgressData {
  unlockedLevel: number;
  stars: Record<string, number>;
}

export class LevelProgress {
  private data: ProgressData;

  constructor() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw) as ProgressData;
      } catch {
        this.data = { unlockedLevel: 1, stars: {} };
      }
    } else {
      this.data = { unlockedLevel: 1, stars: {} };
    }
    this.data.unlockedLevel = Math.max(1, Math.min(TOTAL_LEVELS, this.data.unlockedLevel));
  }

  getTotalLevels(): number {
    return TOTAL_LEVELS;
  }

  getUnlockedLevel(): number {
    return this.data.unlockedLevel;
  }

  getStars(level: number): 0 | 1 | 2 | 3 {
    const s = this.data.stars[String(level)] ?? 0;
    return Math.min(3, Math.max(0, s)) as 0 | 1 | 2 | 3;
  }

  recordWin(level: number, stars: 1 | 2 | 3): void {
    const key = String(level);
    this.data.stars[key] = Math.max(this.data.stars[key] ?? 0, stars);
    if (level >= this.data.unlockedLevel && level < TOTAL_LEVELS) {
      this.data.unlockedLevel = level + 1;
    }
    this.persist();
  }

  getLevelList(): LevelInfo[] {
    const list: LevelInfo[] = [];
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const cfg = buildLevelConfig(i);
      list.push({
        level: i,
        targetScore: cfg.targetScore,
        moves: cfg.moves,
        difficulty: cfg.difficulty,
        unlocked: i <= this.data.unlockedLevel,
        stars: this.getStars(i),
      });
    }
    return list;
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }
}
