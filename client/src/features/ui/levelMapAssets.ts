import type { Difficulty } from '../player/LevelDifficulty';
import { getDifficultyForLevel } from '../player/LevelDifficulty';

/** Public map art: level-inactive SVG tiles (Groups 3–23, no Group 9). */
const LEVEL_GROUP_IDS = [
  3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
] as const;

export function getLevelMapGroupId(level: number): number {
  return LEVEL_GROUP_IDS[(level - 1) % LEVEL_GROUP_IDS.length];
}

export function getLevelMapSvgPath(level: number): string {
  const groupId = getLevelMapGroupId(level);
  return encodeURI(`/level-inactive/Group ${groupId}.svg`);
}

interface TilePalette {
  face: string;
  detail: string;
  baseLight: string;
  baseDark: string;
}

const TILE_PALETTES: Record<Difficulty, TilePalette> = {
  easy: {
    face: '#5B9AFF',
    detail: '#2B6AFC',
    baseLight: '#0B45CB',
    baseDark: '#052265',
  },
  hard: {
    face: '#C77DFF',
    detail: '#B336FF',
    baseLight: '#8B1FC7',
    baseDark: '#4A0078',
  },
  monster: {
    face: '#FF7B7B',
    detail: '#FF5454',
    baseLight: '#C42020',
    baseDark: '#7A0000',
  },
};

const GRAY_TILE: TilePalette = {
  face: '#BFBFBF',
  detail: '#9A9A9A',
  baseLight: '#848484',
  baseDark: '#686868',
};

const svgTextCache = new Map<string, string>();
const themedUrlCache = new Map<string, string>();

function blend(hex: string, toward: string, amount: number): string {
  const parse = (h: string) => {
    const n = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  };
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(toward);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

function paletteForLevel(level: number, unlocked: boolean): TilePalette {
  const themed = TILE_PALETTES[getDifficultyForLevel(level)];
  if (unlocked) {
    return { ...themed, detail: '#FFFFFF' };
  }
  return {
    face: blend(themed.face, GRAY_TILE.face, 0.42),
    detail: blend(themed.detail, GRAY_TILE.detail, 0.42),
    baseLight: blend(themed.baseLight, GRAY_TILE.baseLight, 0.42),
    baseDark: blend(themed.baseDark, GRAY_TILE.baseDark, 0.42),
  };
}

function themeSvg(svg: string, palette: TilePalette): string {
  return svg
    .replace(/#BFBFBF/gi, palette.face)
    .replace(/#9A9A9A/gi, palette.detail)
    .replace(/#848484/gi, palette.baseLight)
    .replace(/#686868/gi, palette.baseDark);
}

async function fetchSvgText(path: string): Promise<string> {
  const cached = svgTextCache.get(path);
  if (cached) return cached;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load level tile: ${path}`);
  const text = await res.text();
  svgTextCache.set(path, text);
  return text;
}

/** Themed blob URL for the original level tile SVG. Caller should revoke when discarding. */
export async function getThemedLevelTileUrl(level: number, unlocked: boolean): Promise<string> {
  const difficulty = getDifficultyForLevel(level);
  const groupId = getLevelMapGroupId(level);
  const cacheKey = `${groupId}-${difficulty}-${unlocked ? 'u' : 'l'}`;
  const cached = themedUrlCache.get(cacheKey);
  if (cached) return cached;

  const path = getLevelMapSvgPath(level);
  const svg = themeSvg(await fetchSvgText(path), paletteForLevel(level, unlocked));
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  themedUrlCache.set(cacheKey, url);
  return url;
}
