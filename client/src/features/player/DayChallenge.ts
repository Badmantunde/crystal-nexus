import { grantCoins, trySpendCoins } from './Economy';

export type DayChallengeMode = 'coin_rush';

export interface DayChallengeConfig {
  dateKey: string;
  mode: DayChallengeMode;
  modeLabel: string;
  seed: number;
  moves: number;
  rushTarget: number;
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

export function buildDayChallengeConfig(dateKey = getTodayDateKey()): DayChallengeConfig {
  const seed = hashDateKey(`coin-rush:${dateKey}`);
  const dayNum = parseInt(dateKey.slice(-2), 10) || 1;
  return {
    dateKey,
    mode: 'coin_rush',
    modeLabel: 'Coin Rush',
    seed,
    moves: 22,
    rushTarget: 100 + (dayNum % 12) * 8,
  };
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
  rushCoins: number;
  peakCombo: number;
  previousBestRush: number;
}): DayChallengeRewards {
  if (!opts.won) {
    return { total: 0, base: 0, bestBonus: 0, comboBonus: 0, beatBest: false };
  }

  const base = 30;
  const beatBest = opts.rushCoins > opts.previousBestRush;
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
  won: boolean;
  rushCoins: number;
  score: number;
  peakCombo: number;
}): DayChallengeRewards {
  const store = loadStore();
  const record = dayRecord(store, opts.dateKey);
  const previousBest = record.bestRushCoins;

  const rewards = calcDayChallengeRewards({
    won: opts.won,
    rushCoins: opts.rushCoins,
    peakCombo: opts.peakCombo,
    previousBestRush: previousBest,
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
