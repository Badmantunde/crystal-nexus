export type Difficulty = 'easy' | 'hard' | 'monster';

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
  monster: 1.75,
};

const MOVE_LIMIT: Record<Difficulty, number> = {
  easy: 30,
  hard: 26,
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
    bg: ['#2a0048', '#4a0080', '#1a0030'],
    glow: 'rgba(179,54,255,0.12)',
    frame: 'rgba(42,0,72,0.92)',
    frameBorder: 'rgba(179,54,255,0.45)',
    inner: 'rgba(55,0,95,0.88)',
    cellEven: 'rgba(85,20,130,0.55)',
    cellOdd: 'rgba(65,0,110,0.55)',
    cellShine: 'rgba(179,54,255,0.06)',
    hudClass: 'diff-hard',
    label: 'Hard Stage',
  },
  monster: {
    bg: ['#4a0000', '#7a1010', '#2a0000'],
    glow: 'rgba(255,84,84,0.12)',
    frame: 'rgba(72,0,0,0.92)',
    frameBorder: 'rgba(255,84,84,0.45)',
    inner: 'rgba(95,0,0,0.88)',
    cellEven: 'rgba(130,20,20,0.55)',
    cellOdd: 'rgba(110,0,0,0.55)',
    cellShine: 'rgba(255,84,84,0.06)',
    hudClass: 'diff-monster',
    label: 'Beast Stage',
  },
};

/** Stable per-level roll so the map never reshuffles. */
export function getDifficultyForLevel(level: number): Difficulty {
  if (level <= EASY_COUNT) return 'easy';
  if (level === 8) return 'monster';
  if (level % 15 === 0) return 'monster';
  if (level % 9 === 0) return 'hard';

  const roll = ((level * 1103515245 + 12345) >>> 0) % 100;
  if (roll < 12) return 'monster';
  if (roll < 42) return 'hard';
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

/** Shared UI chrome — easy blue, hard purple, monster red. */
export interface UIColors {
  bgTop: string;
  bgBottom: string;
  fillCenter: string;
  fillEdge: string;
  border: string;
  stroke: string;
  accentText: string;
  rankText: string;
  pillInnerCenter: string;
  pillInnerEdge: string;
  progressFrom: string;
  progressTo: string;
  cardLabel: string;
  boardFallbackFill: string;
}

const BLUE_UI: UIColors = {
  bgTop: '#052265',
  bgBottom: '#0B45CB',
  fillCenter: '#0044e2',
  fillEdge: '#00257c',
  border: '#2b6afc',
  stroke: '#98b7ff',
  accentText: '#2b6afc',
  rankText: '#5d8eff',
  pillInnerCenter: '#0038c4',
  pillInnerEdge: '#001a5c',
  progressFrom: '#2b6afc',
  progressTo: '#5d8eff',
  cardLabel: 'rgba(147, 178, 255, 0.95)',
  boardFallbackFill: 'rgba(0, 37, 124, 0.86)',
};

const PURPLE_UI: UIColors = {
  bgTop: '#6500A3',
  bgBottom: '#B336FF',
  fillCenter: '#B336FF',
  fillEdge: '#6500A3',
  border: '#D07BFF',
  stroke: '#E8B8FF',
  accentText: '#E8C4FF',
  rankText: '#D4A0FF',
  pillInnerCenter: '#9B2FE0',
  pillInnerEdge: '#4A0078',
  progressFrom: '#B336FF',
  progressTo: '#E8B8FF',
  cardLabel: 'rgba(232, 196, 255, 0.95)',
  boardFallbackFill: 'rgba(74, 0, 120, 0.88)',
};

const RED_UI: UIColors = {
  bgTop: '#A30000',
  bgBottom: '#FF5454',
  fillCenter: '#FF5454',
  fillEdge: '#A30000',
  border: '#FF7B7B',
  stroke: '#FFB8B8',
  accentText: '#FFE8E8',
  rankText: '#FFAAAA',
  pillInnerCenter: '#E82828',
  pillInnerEdge: '#7A0000',
  progressFrom: '#FF5454',
  progressTo: '#FFB8B8',
  cardLabel: 'rgba(255, 210, 210, 0.95)',
  boardFallbackFill: 'rgba(120, 0, 0, 0.88)',
};

export function getUIColors(difficulty: Difficulty): UIColors {
  switch (difficulty) {
    case 'hard':
      return PURPLE_UI;
    case 'monster':
      return RED_UI;
    default:
      return BLUE_UI;
  }
}

export const DIFFICULTY_THEME_CLASSES = ['diff-easy', 'diff-hard', 'diff-monster'] as const;

export function applyDifficultyThemeClass(hudClass: string): void {
  for (const id of ['game-container', 'ui-overlay'] as const) {
    const el = document.getElementById(id);
    el?.classList.remove(...DIFFICULTY_THEME_CLASSES);
    el?.classList.add(hudClass);
  }
  const hud = document.querySelector('.hud');
  hud?.classList.remove(...DIFFICULTY_THEME_CLASSES);
  hud?.classList.add(hudClass);
}

export function clearDifficultyThemeClass(): void {
  for (const id of ['game-container', 'ui-overlay'] as const) {
    document.getElementById(id)?.classList.remove(...DIFFICULTY_THEME_CLASSES);
  }
}

export function getDifficultyTag(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'EASY';
    case 'hard':
      return 'HARD';
    case 'monster':
      return 'BEAST';
  }
}
