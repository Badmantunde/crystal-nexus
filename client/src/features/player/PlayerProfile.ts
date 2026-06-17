import type { LevelProgress } from './LevelProgress';
import { buildLevelConfig } from './LevelScript';

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

const PROFILE_SCORE_BASE = 174;
/** Calibrates legacy display (~1,199) to target ranking score. */
const PROFILE_SCORE_CALIBRATION = 174 / 1199;

export function getProfileScore(progress: LevelProgress): number {
  let score = 0;
  for (let i = 1; i <= progress.getTotalLevels(); i++) {
    const stars = progress.getStars(i);
    if (stars > 0) {
      const cfg = buildLevelConfig(i);
      score += Math.round(cfg.targetScore * (0.5 + stars * 0.25));
    }
  }
  if (score === 0) return PROFILE_SCORE_BASE;
  const legacyDisplay = Math.round(score / 10);
  return Math.max(1, Math.round(legacyDisplay * PROFILE_SCORE_CALIBRATION));
}

const COINS_KEY = 'crystal-nexus-coins';
const PLAYER_KEY = 'crystal-nexus-player';
const ONBOARDED_KEY = 'crystal-nexus-onboarded';
const DEFAULT_COINS = 700;

export function getPlayerName(): string {
  const stored = localStorage.getItem(PLAYER_KEY);
  return stored?.trim() || 'Crusher';
}

export function setPlayerName(name: string): void {
  const trimmed = name.trim().slice(0, 16);
  if (!trimmed) return;
  localStorage.setItem(PLAYER_KEY, trimmed);
  localStorage.setItem(ONBOARDED_KEY, '1');
}

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === '1';
}

export function getAvatarInitials(): string {
  const name = getPlayerName();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (name.length >= 2) return name.slice(0, 2).toUpperCase();
  return name.slice(0, 1).toUpperCase() || 'FC';
}

export function getPlayerCoins(): number {
  const raw = localStorage.getItem(COINS_KEY);
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_COINS;
}

export function setPlayerCoins(amount: number): void {
  localStorage.setItem(COINS_KEY, String(Math.max(0, Math.floor(amount))));
}

export function addPlayerCoins(delta: number): number {
  const next = getPlayerCoins() + delta;
  setPlayerCoins(next);
  return next;
}

export function getMapStreak(totalStars: number): number {
  return Math.min(99, Math.max(1, Math.floor(totalStars / 8) + 1));
}

