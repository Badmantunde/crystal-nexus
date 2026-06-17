import { CrystalCategory } from '@crystal-nexus/shared';
import { BOARD_FRUIT_CATEGORIES } from '../candy/fruitAssets';
import { grantCoins, trySpendCoins } from './Economy';

export type DayChallengeMode = 'coin_rush' | 'move_limit' | 'fruit_frenzy' | 'boss_brawl';

export interface DayChallengeConfig {
  dateKey: string;
  mode: DayChallengeMode;
  modeLabel: string;
  modeDescription: string;
  seed: number;
  moves: number;
  rushTarget?: number;
  scoreTarget?: number;
  frenzyCategory?: CrystalCategory;
  bossHp?: number;
}

export interface DayChallengeDayRecord {
  completed: boolean;
  bestRushCoins: number;
  bestScore: number;
  freePlayUsed: boolean;
  lastCoinsEarned: number;
  peakCombo: number;
}

export interface DayChallengeRewards {
  total: number;
  base: number;
  bestBonus: number;
  comboBonus: number;
  beatBest: boolean;
}

interface DayChallengeStore {
  streak: number;
  lastCompletedDate: string | null;
  days: Record<string, DayChallengeDayRecord>;
}

const STORAGE_KEY = 'crystal-nexus-day-challenge';
export const DAY_CHALLENGE_EXTRA_COST = 50;

const DEFAULT_DAY: DayChallengeDayRecord = {
  completed: false,
  bestRushCoins: 0,
  bestScore: 0,
  freePlayUsed: false,
  lastCoinsEarned: 0,
  peakCombo: 0,
};

/** Mulberry32 — deterministic PRNG from a numeric seed. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashDateKey(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function loadStore(): DayChallengeStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DayChallengeStore;
      return {
        streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
        lastCompletedDate: parsed.lastCompletedDate ?? null,
        days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
      };
    } catch {
      /* fall through */
    }
  }
  return { streak: 0, lastCompletedDate: null, days: {} };
}

function saveStore(store: DayChallengeStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function dayRecord(store: DayChallengeStore, dateKey: string): DayChallengeDayRecord {
  return store.days[dateKey] ?? { ...DEFAULT_DAY };
}

function setDayRecord(store: DayChallengeStore, dateKey: string, record: DayChallengeDayRecord): void {
  store.days[dateKey] = record;
}

export function getDayChallengeStreak(): number {
  return loadStore().streak;
}

export function getDayChallengeRecord(dateKey = getTodayDateKey()): DayChallengeDayRecord {
  return { ...dayRecord(loadStore(), dateKey) };
}

export function hasUnplayedDayChallenge(dateKey = getTodayDateKey()): boolean {
  const record = getDayChallengeRecord(dateKey);
  return !record.completed && !record.freePlayUsed;
}

export function getModeForWeekday(weekday: number): DayChallengeMode {
  // 0 Sun, 1 Mon … 6 Sat
  if (weekday === 0) return 'boss_brawl';
  if (weekday === 1 || weekday === 4) return 'coin_rush';
  if (weekday === 2 || weekday === 5) return 'move_limit';
  return 'fruit_frenzy';
}

const MODE_LABELS: Record<DayChallengeMode, string> = {
  coin_rush: 'Coin Rush',
  move_limit: 'Move Limit',
  fruit_frenzy: 'Fruit Frenzy',
  boss_brawl: 'Boss Brawl',
};

const MODE_DESCRIPTIONS: Record<DayChallengeMode, string> = {
  coin_rush: 'Collect rush coins from every match.',
  move_limit: 'Only a few moves — chase a huge score.',
  fruit_frenzy: 'One fruit type scores triple points today.',
  boss_brawl: 'Deal damage to the fruit monster before moves run out.',
};

export function buildDayChallengeConfig(dateKey = getTodayDateKey(), now = new Date()): DayChallengeConfig {
  const weekday = now.getDay();
  const mode = getModeForWeekday(weekday);
  const seed = hashDateKey(`${mode}:${dateKey}`);
  const dayNum = parseInt(dateKey.slice(-2), 10) || 1;
  const base: DayChallengeConfig = {
    dateKey,
    mode,
    modeLabel: MODE_LABELS[mode],
    modeDescription: MODE_DESCRIPTIONS[mode],
    seed,
    moves: 22,
  };

  switch (mode) {
    case 'coin_rush':
      return { ...base, moves: 22, rushTarget: 100 + (dayNum % 12) * 8 };
    case 'move_limit':
      return { ...base, moves: 15, scoreTarget: 1800 + (dayNum % 10) * 120 };
    case 'fruit_frenzy': {
      const frenzyCategory =
        BOARD_FRUIT_CATEGORIES[dayNum % BOARD_FRUIT_CATEGORIES.length] ?? CrystalCategory.Fire;
      return { ...base, moves: 20, scoreTarget: 1500 + (dayNum % 8) * 100, frenzyCategory };
    }
    case 'boss_brawl':
      return { ...base, moves: 18, bossHp: 800 + (dayNum % 7) * 50, scoreTarget: 0 };
  }
}

export function canEnterDayChallenge(dateKey = getTodayDateKey()): {
  ok: boolean;
  reason: string;
  needsCoins: boolean;
} {
  const record = getDayChallengeRecord(dateKey);
  if (!record.freePlayUsed) {
    return { ok: true, reason: 'Free daily ticket', needsCoins: false };
  }
  return {
    ok: true,
    reason: `Extra run · ${DAY_CHALLENGE_EXTRA_COST} coins`,
    needsCoins: true,
  };
}

export function consumeDayChallengeEntry(dateKey = getTodayDateKey()): {
  ok: boolean;
  message: string;
} {
  const store = loadStore();
  const record = dayRecord(store, dateKey);

  if (!record.freePlayUsed) {
    record.freePlayUsed = true;
    setDayRecord(store, dateKey, record);
    saveStore(store);
    return { ok: true, message: '' };
  }

  if (!trySpendCoins(DAY_CHALLENGE_EXTRA_COST)) {
    return { ok: false, message: `Need ${DAY_CHALLENGE_EXTRA_COST} coins for another run` };
  }

  return { ok: true, message: '' };
}

export function calcDayChallengeRewards(opts: {
  won: boolean;
  mode: DayChallengeMode;
  rushCoins: number;
  score: number;
  peakCombo: number;
  previousBestRush: number;
  previousBestScore: number;
}): DayChallengeRewards {
  if (!opts.won) {
    return { total: 0, base: 0, bestBonus: 0, comboBonus: 0, beatBest: false };
  }

  const base = 30;
  const beatBest =
    opts.mode === 'coin_rush'
      ? opts.rushCoins > opts.previousBestRush
      : opts.score > opts.previousBestScore;
  const bestBonus = beatBest ? 15 : 0;
  const comboBonus = opts.peakCombo >= 5 ? 10 : 0;

  return {
    total: base + bestBonus + comboBonus,
    base,
    bestBonus,
    comboBonus,
    beatBest,
  };
}

export function recordDayChallengeResult(opts: {
  dateKey: string;
  mode: DayChallengeMode;
  won: boolean;
  rushCoins: number;
  score: number;
  peakCombo: number;
}): DayChallengeRewards {
  const store = loadStore();
  const record = dayRecord(store, opts.dateKey);
  const previousBestRush = record.bestRushCoins;
  const previousBestScore = record.bestScore;

  const rewards = calcDayChallengeRewards({
    won: opts.won,
    mode: opts.mode,
    rushCoins: opts.rushCoins,
    score: opts.score,
    peakCombo: opts.peakCombo,
    previousBestRush,
    previousBestScore,
  });

  if (opts.won) {
    record.completed = true;
    record.bestRushCoins = Math.max(record.bestRushCoins, opts.rushCoins);
    record.bestScore = Math.max(record.bestScore, opts.score);
    record.peakCombo = Math.max(record.peakCombo, opts.peakCombo);
    record.lastCoinsEarned = rewards.total;
    grantCoins(rewards.total);

    if (store.lastCompletedDate) {
      const prev = new Date(`${store.lastCompletedDate}T12:00:00`);
      const curr = new Date(`${opts.dateKey}T12:00:00`);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
      if (diffDays === 1) store.streak += 1;
      else if (diffDays > 1) store.streak = 1;
    } else {
      store.streak = 1;
    }
    store.lastCompletedDate = opts.dateKey;
  } else {
    record.bestRushCoins = Math.max(record.bestRushCoins, opts.rushCoins);
    record.bestScore = Math.max(record.bestScore, opts.score);
    record.peakCombo = Math.max(record.peakCombo, opts.peakCombo);
    record.lastCoinsEarned = 0;
  }

  setDayRecord(store, opts.dateKey, record);
  saveStore(store);

  return rewards;
}
