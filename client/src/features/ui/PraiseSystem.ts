import type { CrystalCategory } from '@crystal-nexus/shared';
import { getCandyStyle } from '../candy/CandyTypes';
import type { SpecialType } from '../candy/CandyCell';

export type PraiseTier = 'nice' | 'great' | 'amazing' | 'legendary';

export interface PraiseMessage {
  text: string;
  tier: PraiseTier;
  sub?: string;
  combo?: number;
}

export function praiseForCombo(combo: number): PraiseMessage | null {
  if (combo < 2) return null;
  if (combo === 2) return { text: 'Nice!', tier: 'nice', combo };
  if (combo === 3) return { text: 'Sweet!', tier: 'great', combo };
  if (combo === 4) return { text: 'Delicious!', tier: 'great', combo };
  if (combo === 5) return { text: 'Divine!', tier: 'amazing', combo };
  return { text: 'Unbelievable!', tier: 'legendary', combo, sub: 'Keep it going!' };
}

export function praiseForSpawn(special: SpecialType): PraiseMessage {
  switch (special) {
    case 'row':
      return { text: 'Row Bomb!', tier: 'great', sub: 'Swipe to blast a row' };
    case 'col':
      return { text: 'Column Bomb!', tier: 'great', sub: 'Swipe to blast a column' };
    case 'color':
      return { text: 'Rainbow Fruit!', tier: 'amazing', sub: 'Clears one fruit color' };
    default:
      return { text: 'Special!', tier: 'nice' };
  }
}

export function praiseForBlast(
  kind: 'row' | 'col' | 'color' | 'cross' | 'col_double' | 'color_row' | 'color_col' | 'board_clear',
  category?: CrystalCategory,
): PraiseMessage {
  if (kind === 'board_clear') {
    return { text: 'BOARD WIPEOUT!', tier: 'legendary', sub: 'Double rainbow clears everything' };
  }
  if (kind === 'color_row') {
    const label = category ? getCandyStyle(category).label : 'fruit';
    return { text: 'Rainbow Rows!', tier: 'legendary', sub: `All ${label} → row blasts` };
  }
  if (kind === 'color_col') {
    const label = category ? getCandyStyle(category).label : 'fruit';
    return { text: 'Rainbow Columns!', tier: 'legendary', sub: `All ${label} → column blasts` };
  }
  if (kind === 'cross') return { text: 'Cross Blast!', tier: 'legendary', sub: 'Row + Column combo' };
  if (kind === 'col_double') return { text: 'Double Strike!', tier: 'amazing', sub: 'Column hit twice' };
  if (kind === 'row') return { text: 'Kaboom!', tier: 'great', sub: 'Row cleared' };
  if (kind === 'col') return { text: 'Zip Zap!', tier: 'great', sub: 'Column cleared' };
  const label = category ? getCandyStyle(category).label : 'fruit';
  return { text: 'Rainbow Blast!', tier: 'legendary', sub: `All ${label} candies cleared` };
}

export function praiseForClearCount(count: number): PraiseMessage | null {
  if (count >= 12) return { text: 'Spectacular!', tier: 'legendary' };
  if (count >= 8) return { text: 'Tasty!', tier: 'amazing' };
  return null;
}
