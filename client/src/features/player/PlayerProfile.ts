import type { LevelProgress } from './LevelProgress';

export interface PlayerRank {
  name: string;
  tier: number;
}

export function countTotalStars(progress: LevelProgress): number {
  let total = 0;
  for (let i = 1; i <= progress.getTotalLevels(); i++) {
    total += progress.getStars(i);
  }
  return total;
}

export function getRankFromStars(totalStars: number): PlayerRank {
  if (totalStars >= 60) return { name: 'Legend', tier: 5 };
  if (totalStars >= 40) return { name: 'Apex', tier: 4 };
  if (totalStars >= 20) return { name: 'Nova', tier: 3 };
  if (totalStars >= 8) return { name: 'Spark', tier: 2 };
  return { name: 'Rookie', tier: 1 };
}

export function getAvatarInitials(): string {
  const stored = localStorage.getItem('crystal-nexus-player');
  if (stored && stored.length >= 2) return stored.slice(0, 2).toUpperCase();
  return 'CN';
}
