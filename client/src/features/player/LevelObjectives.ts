import { CrystalCategory } from '@crystal-nexus/shared';
import type { Difficulty } from './LevelDifficulty';

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

/** Easy & boss levels use score target; harder stages use fruit collection. */
export function taskTypeForDifficulty(difficulty: Difficulty): TargetTaskType {
  if (difficulty === 'hard') return 'collect';
  return 'score';
}

function collectTargetForDifficulty(difficulty: Difficulty): number {
  if (difficulty === 'hard') return 80;
  return 120;
}

function buildCollectObjectives(difficulty: Difficulty): LevelObjective[] {
  const target = collectTargetForDifficulty(difficulty);
  return FRUIT_OBJECTIVES.map((item) => ({ ...item, target }));
}

export function buildLevelTarget(
  _level: number,
  difficulty: Difficulty,
  scoreTarget: number,
): LevelTarget {
  return {
    taskType: taskTypeForDifficulty(difficulty),
    scoreTarget,
    collectObjectives: buildCollectObjectives(difficulty),
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
