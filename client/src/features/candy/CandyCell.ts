import type { CrystalCategory } from '@crystal-nexus/shared';

export type SpecialType = 'none' | 'row' | 'col' | 'color';

export interface CandyCell {
  category: CrystalCategory;
  special: SpecialType;
}

export function makeCandy(category: CrystalCategory, special: SpecialType = 'none'): CandyCell {
  return { category, special };
}

export function isSpecial(cell: CandyCell | null): boolean {
  return cell !== null && cell.special !== 'none';
}

export function cellCategory(cell: CandyCell | null): CrystalCategory | null {
  return cell?.category ?? null;
}
