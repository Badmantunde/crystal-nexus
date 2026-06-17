import { MAX_LIVES } from './Lives';
import { addPlayerCoins, getPlayerCoins, setPlayerCoins } from './PlayerProfile';
import type { LevelProgress } from './LevelProgress';

export const SHOP = {
  oneLife: 100,
  refillLives: 400,
  skipStage: 250,
  continue: 150,
} as const;

/** Coins awarded on level win: base + star bonuses. */
export function coinsForStars(stars: 1 | 2 | 3): number {
  let total = 5;
  if (stars >= 1) total += 5;
  if (stars >= 2) total += 10;
  if (stars >= 3) total += 20;
  return total;
}

export function trySpendCoins(cost: number): boolean {
  const balance = getPlayerCoins();
  if (balance < cost) return false;
  setPlayerCoins(balance - cost);
  return true;
}

export interface PurchaseResult {
  ok: boolean;
  message: string;
}

export function formatCoins(n: number): string {
  return n.toLocaleString();
}

export interface LivesWallet {
  getLives(): number;
  addLife(count?: number): boolean;
  refillAll(): void;
}

export function purchaseOneLife(wallet: LivesWallet): PurchaseResult {
  if (wallet.getLives() >= MAX_LIVES) {
    return { ok: false, message: 'Lives are already full!' };
  }
  if (!trySpendCoins(SHOP.oneLife)) {
    return { ok: false, message: `Need ${SHOP.oneLife} coins` };
  }
  wallet.addLife(1);
  return { ok: true, message: '+1 life!' };
}

export function purchaseRefillLives(wallet: LivesWallet): PurchaseResult {
  if (wallet.getLives() >= MAX_LIVES) {
    return { ok: false, message: 'Lives are already full!' };
  }
  if (!trySpendCoins(SHOP.refillLives)) {
    return { ok: false, message: `Need ${SHOP.refillLives} coins` };
  }
  wallet.refillAll();
  return { ok: true, message: 'Lives refilled!' };
}

export function grantCoins(amount: number): number {
  return addPlayerCoins(amount);
}

export function purchaseContinue(): PurchaseResult {
  if (!trySpendCoins(SHOP.continue)) {
    return { ok: false, message: `Need ${SHOP.continue} coins` };
  }
  return { ok: true, message: '+5 moves!' };
}

export function purchaseSkipStage(progress: LevelProgress, level: number): PurchaseResult {
  if (!progress.canSkipLevel(level)) {
    return { ok: false, message: 'Can only skip your current uncleared stage' };
  }
  if (!trySpendCoins(SHOP.skipStage)) {
    return { ok: false, message: `Need ${SHOP.skipStage} coins` };
  }
  if (!progress.recordSkip(level)) {
    return { ok: false, message: 'Could not skip this stage' };
  }
  return { ok: true, message: 'Stage skipped — next level unlocked!' };
}
