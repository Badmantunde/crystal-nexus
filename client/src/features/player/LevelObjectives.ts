import { CrystalCategory } from '@crystal-nexus/shared';
import type { LevelTier } from './LevelDifficulty';

export type FruitId = 'orange' | 'apple' | 'pear';
export type TargetTaskType = 'score' | 'collect';

export interface LevelObjective {
  fruit: FruitId;
  category: CrystalCategory;
  target: number;
}

export interface LevelTarget {
  taskType: TargetTaskType;
  scoreTarget: number;
  collectObjectives: LevelObjective[];
}

const FRUIT_OBJECTIVES: { fruit: FruitId; category: CrystalCategory }[] = [
  { fruit: 'orange', category: CrystalCategory.Storm },
  { fruit: 'apple', category: CrystalCategory.Fire },
  { fruit: 'pear', category: CrystalCategory.Nature },
];

export function taskTypeForTier(tier: LevelTier): TargetTaskType {
  if (tier === 'normal' || tier === 'hard') return 'collect';
  return 'score';
}

function collectTargetForTier(tier: LevelTier): number {
  if (tier === 'hard') return 40;
  if (tier === 'normal') return 30;
  return 50;
}

function buildCollectObjectives(tier: LevelTier): LevelObjective[] {
  const target = collectTargetForTier(tier);
  return FRUIT_OBJECTIVES.map((item) => ({ ...item, target }));
}

export function buildLevelTarget(
  _level: number,
  tier: LevelTier,
  scoreTarget: number,
): LevelTarget {
  return {
    taskType: taskTypeForTier(tier),
    scoreTarget,
    collectObjectives: buildCollectObjectives(tier),
  };
}

export function getObjectiveRemainingCount(
  objective: LevelObjective,
  collected: Readonly<Partial<Record<CrystalCategory, number>>>,
): number {
  return Math.max(0, objective.target - (collected[objective.category] ?? 0));
}

export function areObjectivesComplete(
  objectives: LevelObjective[],
  collected: Readonly<Partial<Record<CrystalCategory, number>>>,
): boolean {
  return objectives.every((o) => (collected[o.category] ?? 0) >= o.target);
}

export function isLevelTargetComplete(
  target: LevelTarget,
  score: number,
  collected: Readonly<Partial<Record<CrystalCategory, number>>>,
): boolean {
  if (target.taskType === 'score') return score >= target.scoreTarget;
  return areObjectivesComplete(target.collectObjectives, collected);
}
