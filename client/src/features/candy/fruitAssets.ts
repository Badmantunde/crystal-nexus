import { CrystalCategory } from '@crystal-nexus/shared';

export type FruitKind = 'apple' | 'berry' | 'orange' | 'pear' | 'grape' | 'carrot';

const BASE = '/fruits';

export const FRUIT_URLS: Record<FruitKind, string> = {
  apple: `${BASE}/apple.svg`,
  berry: `${BASE}/berry.svg`,
  orange: `${BASE}/orange.svg`,
  pear: `${BASE}/pear.svg`,
  grape: `${BASE}/garpe.svg`,
  carrot: `${BASE}/carrot.svg`,
};

/** Six board piece types — one fruit art per category. */
export const BOARD_FRUIT_CATEGORIES: CrystalCategory[] = [
  CrystalCategory.Fire,
  CrystalCategory.Ice,
  CrystalCategory.Nature,
  CrystalCategory.Storm,
  CrystalCategory.Void,
  CrystalCategory.Plasma,
];

const CATEGORY_TO_FRUIT: Partial<Record<CrystalCategory, FruitKind>> = {
  [CrystalCategory.Fire]: 'apple',
  [CrystalCategory.Ice]: 'berry',
  [CrystalCategory.Nature]: 'pear',
  [CrystalCategory.Storm]: 'orange',
  [CrystalCategory.Void]: 'grape',
  [CrystalCategory.Plasma]: 'carrot',
};

export function getFruitForCategory(category: CrystalCategory): FruitKind | null {
  return CATEGORY_TO_FRUIT[category] ?? null;
}

export function getFruitUrl(kind: FruitKind): string {
  return FRUIT_URLS[kind];
}

export function getFruitUrlForCategory(category: CrystalCategory): string | null {
  const kind = getFruitForCategory(category);
  return kind ? FRUIT_URLS[kind] : null;
}

const spriteCache = new Map<FruitKind, HTMLImageElement>();
let preloadPromise: Promise<void> | null = null;

export function preloadFruitSprites(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = Promise.all(
    (Object.entries(FRUIT_URLS) as [FruitKind, string][]).map(
      ([kind, src]) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            spriteCache.set(kind, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => undefined);

  return preloadPromise;
}

export function getFruitSprite(kind: FruitKind): HTMLImageElement | undefined {
  const img = spriteCache.get(kind);
  if (img?.complete && img.naturalWidth > 0) return img;
  return undefined;
}

export function areFruitSpritesReady(): boolean {
  return (Object.keys(FRUIT_URLS) as FruitKind[]).every((kind) => getFruitSprite(kind) != null);
}
