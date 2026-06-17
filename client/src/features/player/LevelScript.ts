import type { LevelTier, LevelConfig } from './LevelDifficulty';
import { buildFormulaLevelConfig, tierToDifficulty } from './LevelDifficulty';
import type { FruitId, LevelObjective, LevelTarget, TargetTaskType } from './LevelObjectives';
import { buildLevelTarget } from './LevelObjectives';
import { CrystalCategory } from '@crystal-nexus/shared';

export interface LevelScriptOverride {
  tier?: LevelTier;
  targetScore?: number;
  moves?: number;
  taskType?: TargetTaskType;
  /** Per-fruit collect counts; omitted fruits are not required. */
  collect?: Partial<Record<FruitId, number>>;
  tagline?: string;
}

const FRUIT_CATEGORIES: Record<FruitId, CrystalCategory> = {
  orange: CrystalCategory.Storm,
  apple: CrystalCategory.Fire,
  pear: CrystalCategory.Nature,
};

/** Hand-tuned retention zone — overrides formula pacing for levels 1–15. */
export const LEVEL_SCRIPTS: Record<number, LevelScriptOverride> = {
  1: { tier: 'tutorial', targetScore: 200, moves: 35, taskType: 'score', tagline: 'Welcome to Sunny Grove!' },
  2: { tier: 'tutorial', targetScore: 350, moves: 35, taskType: 'score', tagline: 'Match 4 for a line blast' },
  3: { tier: 'tutorial', targetScore: 200, moves: 35, taskType: 'collect', collect: { orange: 15 }, tagline: 'Collect juicy oranges' },
  4: { tier: 'tutorial', targetScore: 500, moves: 34, taskType: 'score' },
  5: { tier: 'beast', targetScore: 600, moves: 30, taskType: 'score', tagline: 'Chapter boss — you got this!' },
  6: { tier: 'relaxed', targetScore: 650, moves: 32, taskType: 'score' },
  7: { tier: 'relaxed', targetScore: 400, moves: 32, taskType: 'collect', collect: { orange: 20, apple: 10 } },
  8: { tier: 'relaxed', targetScore: 750, moves: 32, taskType: 'score' },
  9: { tier: 'relaxed', targetScore: 800, moves: 31, taskType: 'score' },
  10: { tier: 'beast', targetScore: 900, moves: 28, taskType: 'score', tagline: 'Berry Bay boss gate' },
  11: { tier: 'normal', targetScore: 950, moves: 28, taskType: 'score' },
  12: { tier: 'normal', targetScore: 500, moves: 28, taskType: 'collect', collect: { orange: 25, apple: 15, pear: 10 } },
  13: { tier: 'normal', targetScore: 1050, moves: 28, taskType: 'score' },
  14: { tier: 'hard', targetScore: 550, moves: 27, taskType: 'collect', collect: { orange: 30, apple: 20 } },
  15: { tier: 'normal', targetScore: 1150, moves: 28, taskType: 'score' },
};

export function getLevelScript(level: number): LevelScriptOverride | null {
  return LEVEL_SCRIPTS[level] ?? null;
}

export function applyLevelScript(config: LevelConfig): LevelConfig {
  const script = getLevelScript(config.level);
  if (!script) return config;

  const tier = script.tier ?? config.tier;
  return {
    ...config,
    tier,
    difficulty: tierToDifficulty(tier),
    targetScore: script.targetScore ?? config.targetScore,
    moves: script.moves ?? config.moves,
  };
}

function buildCollectObjectives(collect: Partial<Record<FruitId, number>>): LevelObjective[] {
  const objectives: LevelObjective[] = [];
  for (const [fruit, target] of Object.entries(collect) as [FruitId, number][]) {
    if (!target || target <= 0) continue;
    objectives.push({
      fruit,
      category: FRUIT_CATEGORIES[fruit],
      target,
    });
  }
  return objectives;
}

export function buildScriptedLevelTarget(level: number, config: LevelConfig): LevelTarget {
  const script = getLevelScript(level);
  if (!script) {
    return buildLevelTarget(level, config.tier, config.targetScore);
  }

  if (script.taskType === 'collect' && script.collect) {
    return {
      taskType: 'collect',
      scoreTarget: config.targetScore,
      collectObjectives: buildCollectObjectives(script.collect),
    };
  }

  return {
    taskType: 'score',
    scoreTarget: script.targetScore ?? config.targetScore,
    collectObjectives: [],
  };
}

export function getLevelTagline(level: number): string | null {
  return getLevelScript(level)?.tagline ?? null;
}

export function buildLevelConfig(level: number): LevelConfig {
  return applyLevelScript(buildFormulaLevelConfig(level));
}
