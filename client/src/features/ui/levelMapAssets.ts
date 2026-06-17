import type { Difficulty } from '../player/LevelDifficulty';
import { getDifficultyForLevel } from '../player/LevelDifficulty';

/** Tiles per folder: `tile 01.svg` … `tile 100.svg` */
export const TILE_COUNT = 100;

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

/** Level N maps to tile file `tile NN.svg` (1–100). */
export function getLevelMapTileIndex(level: number): number {
  return Math.min(TILE_COUNT, Math.max(1, level));
}

export function formatTileFileName(tileIndex: number): string {
  const digits = tileIndex >= 100 ? 3 : 2;
  return `tile ${String(tileIndex).padStart(digits, '0')}.svg`;
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
