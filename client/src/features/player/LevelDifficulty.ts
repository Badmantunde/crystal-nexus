export type Difficulty = 'easy' | 'hard' | 'monster';

/** Pacing tier — mapped to board themes via `tierToDifficulty`. */
export type LevelTier = 'tutorial' | 'relaxed' | 'normal' | 'hard' | 'beast';

export interface LevelConfig {
  level: number;
  tier: LevelTier;
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

const MOVE_LIMIT: Record<LevelTier, number> = {
  tutorial: 35,
  relaxed: 32,
  normal: 28,
  hard: 24,
  beast: 22,
};

const TARGET_MULT: Record<LevelTier, number> = {
  tutorial: 0.6,
  relaxed: 0.85,
  normal: 1,
  hard: 1.15,
  beast: 1.35,
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

/**
 * Curriculum pacing — no random beast rolls.
 * Positions 1–6 within each chapter: teach → boss (5) → breather (6).
 */
export function getTierForLevel(level: number): LevelTier {
  const pos = ((level - 1) % 6) + 1;

  if (level <= 4) return 'tutorial';
  if (pos === 5) return 'beast';
  if (pos === 6) return 'relaxed';

  if (level <= 12) return 'relaxed';
  if (level <= 24) return 'normal';
  return 'hard';
}

export function tierToDifficulty(tier: LevelTier): Difficulty {
  if (tier === 'beast') return 'monster';
  if (tier === 'normal' || tier === 'hard') return 'hard';
  return 'easy';
}

/** @deprecated Use getTierForLevel — kept for map node CSS classes. */
export function getDifficultyForLevel(level: number): Difficulty {
  return tierToDifficulty(getTierForLevel(level));
}

export function buildFormulaLevelConfig(level: number): LevelConfig {
  const tier = getTierForLevel(level);
  const difficulty = tierToDifficulty(tier);
  const chapter = Math.ceil(level / 6);
  const baseTarget = 400 + (level - 1) * 80 + chapter * 100;

  return {
    level,
    tier,
    difficulty,
    targetScore: Math.round(baseTarget * TARGET_MULT[tier]),
    moves: MOVE_LIMIT[tier],
  };
}

/** @deprecated Import from LevelScript for scripted overrides. */
export function buildLevelConfig(level: number): LevelConfig {
  return buildFormulaLevelConfig(level);
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

export function getDifficultyTag(tier: LevelTier): string {
  switch (tier) {
    case 'tutorial':
      return 'JUICY';
    case 'relaxed':
      return 'EASY';
    case 'normal':
      return 'NORMAL';
    case 'hard':
      return 'HARD';
    case 'beast':
      return 'BEAST';
  }
}
