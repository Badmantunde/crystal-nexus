/** Ten chapters × 10 levels (100 total). */
export const LEVELS_PER_CHAPTER = 10;
export const TOTAL_LEVELS = 100;

export interface ChapterInfo {
  id: number;
  name: string;
  subtitle: string;
  startLevel: number;
  endLevel: number;
}

export const CHAPTERS: ChapterInfo[] = [
  { id: 1, name: 'Sunny Grove', subtitle: 'Learn the basics', startLevel: 1, endLevel: 10 },
  { id: 2, name: 'Berry Bay', subtitle: 'Collect & combo', startLevel: 11, endLevel: 20 },
  { id: 3, name: 'Candy Cloud', subtitle: 'Blast mastery', startLevel: 21, endLevel: 30 },
  { id: 4, name: 'Spice Market', subtitle: 'Tighter targets', startLevel: 31, endLevel: 40 },
  { id: 5, name: 'Beast Kitchen', subtitle: 'Mid-season bosses', startLevel: 41, endLevel: 50 },
  { id: 6, name: 'Coral Reef', subtitle: 'Juicy currents', startLevel: 51, endLevel: 60 },
  { id: 7, name: 'Crystal Peak', subtitle: 'Sharp combos', startLevel: 61, endLevel: 70 },
  { id: 8, name: 'Thunder Orchard', subtitle: 'Storm fruit', startLevel: 71, endLevel: 80 },
  { id: 9, name: 'Mystic Vineyard', subtitle: 'Rare harvests', startLevel: 81, endLevel: 90 },
  { id: 10, name: 'Crown Orchard', subtitle: 'Final ascent', startLevel: 91, endLevel: 100 },
];

export function getChapterForLevel(level: number): ChapterInfo {
  const id = Math.min(CHAPTERS.length, Math.max(1, Math.ceil(level / LEVELS_PER_CHAPTER)));
  return CHAPTERS[id - 1]!;
}

export function isChapterStart(level: number): boolean {
  return level === 1 || (level - 1) % LEVELS_PER_CHAPTER === 0;
}
