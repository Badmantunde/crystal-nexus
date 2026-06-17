import { MAX_LIVES } from './Lives';
import { addPlayerCoins, getPlayerCoins, setPlayerCoins } from './PlayerProfile';

export const SHOP = {
  oneLife: 100,
  refillLives: 400,
  skipStage: 250,
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
