export type Difficulty = 'easy' | 'hard' | 'very_hard' | 'monster';

export interface LevelConfig {
  level: number;
  difficulty: Difficulty;
  targetScore: number;
  moves: number;
}

export interface StageTheme {
  bg: [string, string, string];
  glow: string;
  frame: string;
  frameBorder: string;
  inner: string;
  cellEven: string;
  cellOdd: string;
  cellShine: string;
  hudClass: string;
  label: string;
}

const EASY_COUNT = 3;

const TARGET_MULT: Record<Difficulty, number> = {
  easy: 1,
  hard: 1.22,
  very_hard: 1.48,
  monster: 1.75,
};

const MOVE_LIMIT: Record<Difficulty, number> = {
  easy: 30,
  hard: 26,
  very_hard: 22,
  monster: 18,
};

export const STAGE_THEMES: Record<Difficulty, StageTheme> = {
  easy: {
    bg: ['#0f0824', '#1a0f35', '#12082a'],
    glow: 'rgba(167,139,250,0.07)',
    frame: 'rgba(20,12,45,0.92)',
    frameBorder: 'rgba(167,139,250,0.35)',
    inner: 'rgba(30,18,60,0.85)',
    cellEven: 'rgba(55,35,95,0.55)',
    cellOdd: 'rgba(42,26,78,0.55)',
    cellShine: 'rgba(167,139,250,0.04)',
    hudClass: 'diff-easy',
    label: 'Easy Stage',
  },
  hard: {
    bg: ['#1a0810', '#2d1018', '#18060e'],
    glow: 'rgba(251,113,133,0.09)',
    frame: 'rgba(45,12,22,0.92)',
    frameBorder: 'rgba(251,113,133,0.4)',
    inner: 'rgba(55,18,28,0.88)',
    cellEven: 'rgba(95,35,45,0.55)',
    cellOdd: 'rgba(72,22,32,0.55)',
    cellShine: 'rgba(251,113,133,0.05)',
    hudClass: 'diff-hard',
    label: 'Hard Stage',
  },
  very_hard: {
    bg: ['#041018', '#082030', '#061424'],
    glow: 'rgba(56,189,248,0.09)',
    frame: 'rgba(8,28,48,0.92)',
    frameBorder: 'rgba(56,189,248,0.42)',
    inner: 'rgba(12,36,58,0.88)',
    cellEven: 'rgba(22,58,88,0.55)',
    cellOdd: 'rgba(14,42,68,0.55)',
    cellShine: 'rgba(56,189,248,0.05)',
    hudClass: 'diff-very-hard',
    label: 'Very Hard',
  },
  monster: {
    bg: ['#081408', '#142810', '#0a1a0a'],
    glow: 'rgba(74,222,128,0.1)',
    frame: 'rgba(12,32,14,0.94)',
    frameBorder: 'rgba(74,222,128,0.45)',
    inner: 'rgba(18,42,20,0.9)',
    cellEven: 'rgba(28,68,32,0.58)',
    cellOdd: 'rgba(18,48,22,0.58)',
    cellShine: 'rgba(74,222,128,0.06)',
    hudClass: 'diff-monster',
    label: 'Monster Stage',
  },
};

/** Stable per-level roll so the map never reshuffles. */
export function getDifficultyForLevel(level: number): Difficulty {
  if (level <= EASY_COUNT) return 'easy';
  if (level % 15 === 0) return 'monster';
  if (level % 9 === 0) return 'very_hard';

  const roll = ((level * 1103515245 + 12345) >>> 0) % 100;
  if (roll < 10) return 'monster';
  if (roll < 28) return 'very_hard';
  if (roll < 58) return 'hard';
  return 'easy';
}

export function buildLevelConfig(level: number): LevelConfig {
  const difficulty = getDifficultyForLevel(level);
  const baseTarget = 1000 + (level - 1) * 200;
  return {
    level,
    difficulty,
    targetScore: Math.round(baseTarget * TARGET_MULT[difficulty]),
    moves: MOVE_LIMIT[difficulty],
  };
}

export function getStageTheme(difficulty: Difficulty): StageTheme {
  return STAGE_THEMES[difficulty];
}
