import type { MapNavState } from '../ui/MapNavBar';
import type { LevelProgress } from './LevelProgress';
import {
  countTotalStars,
  getMapStreak,
  getPlayerCoins,
  getProfileScore,
  getRankFromStars,
} from './PlayerProfile';

/** Shared top-nav stats for level map and in-game HUD. */
export function buildMapNavState(opts: {
  level: number;
  lives: number;
  livesRegenMs?: number | null;
  progress: LevelProgress;
}): MapNavState {
  const totalStars = countTotalStars(opts.progress);
  return {
    level: opts.level,
    rank: getRankFromStars(totalStars).name,
    lives: opts.lives,
    livesRegenMs: opts.livesRegenMs,
    coins: getPlayerCoins(),
    score: getProfileScore(opts.progress),
    streak: getMapStreak(totalStars),
  };
}
