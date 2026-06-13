import { CrystalCategory, MATCHABLE_CATEGORIES } from '@crystal-nexus/shared';

export type CandyShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon' | 'star';

export interface CandyStyle {
  category: CrystalCategory;
  color: string;
  dark: string;
  highlight: string;
  shape: CandyShape;
  label: string;
}

export const CANDY_STYLES: Record<string, CandyStyle> = {
  [CrystalCategory.Fire]: {
    category: CrystalCategory.Fire,
    color: '#EF5350',
    dark: '#C62828',
    highlight: '#FFCDD2',
    shape: 'circle',
    label: 'Red',
  },
  [CrystalCategory.Ice]: {
    category: CrystalCategory.Ice,
    color: '#42A5F5',
    dark: '#1565C0',
    highlight: '#BBDEFB',
    shape: 'diamond',
    label: 'Blue',
  },
  [CrystalCategory.Nature]: {
    category: CrystalCategory.Nature,
    color: '#66BB6A',
    dark: '#2E7D32',
    highlight: '#C8E6C9',
    shape: 'square',
    label: 'Green',
  },
  [CrystalCategory.Storm]: {
    category: CrystalCategory.Storm,
    color: '#AB47BC',
    dark: '#6A1B9A',
    highlight: '#E1BEE7',
    shape: 'hexagon',
    label: 'Purple',
  },
  [CrystalCategory.Void]: {
    category: CrystalCategory.Void,
    color: '#7E57C2',
    dark: '#4527A0',
    highlight: '#D1C4E9',
    shape: 'triangle',
    label: 'Violet',
  },
  [CrystalCategory.Plasma]: {
    category: CrystalCategory.Plasma,
    color: '#EC407A',
    dark: '#AD1457',
    highlight: '#F8BBD0',
    shape: 'star',
    label: 'Pink',
  },
};

export function randomCandyType(): CrystalCategory {
  return MATCHABLE_CATEGORIES[Math.floor(Math.random() * MATCHABLE_CATEGORIES.length)];
}

export function getCandyStyle(category: CrystalCategory): CandyStyle {
  return CANDY_STYLES[category] ?? CANDY_STYLES[CrystalCategory.Fire];
}
