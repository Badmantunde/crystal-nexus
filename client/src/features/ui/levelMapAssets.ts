import type { Difficulty } from '../player/LevelDifficulty';
import { getDifficultyForLevel } from '../player/LevelDifficulty';

/** Tiles per folder: `tile 01.svg` … `tile 20.svg` */
export const TILE_COUNT = 20;

export const TILE_FOLDERS = {
  inactive: 'level-inactive-svg',
  easy: 'level-blue-svg',
  hard: 'level-purple-svg',
  monster: 'level-red-svg',
} as const;

const ACTIVE_FOLDER: Record<Difficulty, string> = {
  easy: TILE_FOLDERS.easy,
  hard: TILE_FOLDERS.hard,
  monster: TILE_FOLDERS.monster,
};

/** Level 1 → tile 01, level 2 → tile 02, … wraps after tile 20. */
export function getLevelMapTileIndex(level: number): number {
  const lv = Math.max(1, level);
  return ((lv - 1) % TILE_COUNT) + 1;
}

export function formatTileFileName(tileIndex: number): string {
  return `tile ${String(tileIndex).padStart(2, '0')}.svg`;
}

function folderForLevel(level: number, unlocked: boolean): string {
  if (!unlocked) return TILE_FOLDERS.inactive;
  return ACTIVE_FOLDER[getDifficultyForLevel(level)];
}

export function getLevelMapSvgPath(level: number, unlocked = true): string {
  const folder = folderForLevel(level, unlocked);
  const tile = formatTileFileName(getLevelMapTileIndex(level));
  return encodeURI(`/${folder}/${tile}`);
}

export async function getThemedLevelTileUrl(level: number, unlocked: boolean): Promise<string> {
  return getLevelMapSvgPath(level, unlocked);
}
