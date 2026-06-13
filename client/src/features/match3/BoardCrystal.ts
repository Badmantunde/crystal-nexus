import {
  CrystalCategory,
  PowerType,
  type BoardCrystalState,
} from '@crystal-nexus/shared';

export interface BoardCrystal extends BoardCrystalState {
  category: CrystalCategory;
}

export function createCrystal(
  category: CrystalCategory,
  power: PowerType = PowerType.None,
  fusedAbilityId?: string,
): BoardCrystal {
  return { category, power, fusedAbilityId };
}

export function crystalCategory(cell: BoardCrystal | null): CrystalCategory | null {
  return cell?.category ?? null;
}

export function hasPower(cell: BoardCrystal | null): boolean {
  return cell !== null && cell.power !== PowerType.None;
}
