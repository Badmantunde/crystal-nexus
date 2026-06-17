import { trySpendCoins, type PurchaseResult } from './Economy';

export type BoosterId = 'row_bomb';

const STORAGE_KEY = 'crystal-nexus-booster-armed';

export const BOOSTER_SHOP = {
  row_bomb: 100,
} as const;

export function getArmedBooster(): BoosterId | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'row_bomb') return 'row_bomb';
  return null;
}

export function armBooster(id: BoosterId): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function consumeArmedBooster(): BoosterId | null {
  const armed = getArmedBooster();
  if (!armed) return null;
  localStorage.removeItem(STORAGE_KEY);
  return armed;
}

export function purchaseRowBombBooster(): PurchaseResult {
  if (getArmedBooster()) {
    return { ok: false, message: 'Booster already armed!' };
  }
  if (!trySpendCoins(BOOSTER_SHOP.row_bomb)) {
    return { ok: false, message: `Need ${BOOSTER_SHOP.row_bomb} coins` };
  }
  armBooster('row_bomb');
  return { ok: true, message: 'Row bomb armed for next level!' };
}
