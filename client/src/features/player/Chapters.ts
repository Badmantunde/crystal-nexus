/** Five chapters × 6 levels (30 total). */
export const LEVELS_PER_CHAPTER = 6;

export interface ChapterInfo {
  id: number;
  name: string;
  subtitle: string;
  startLevel: number;
  endLevel: number;
}

export const CHAPTERS: ChapterInfo[] = [
  { id: 1, name: 'Sunny Grove', subtitle: 'Learn the basics', startLevel: 1, endLevel: 6 },
  { id: 2, name: 'Berry Bay', subtitle: 'Collect & combo', startLevel: 7, endLevel: 12 },
  { id: 3, name: 'Candy Cloud', subtitle: 'Blast mastery', startLevel: 13, endLevel: 18 },
  { id: 4, name: 'Spice Market', subtitle: 'Tighter targets', startLevel: 19, endLevel: 24 },
  { id: 5, name: 'Beast Kitchen', subtitle: 'Chapter finales', startLevel: 25, endLevel: 30 },
];

export function getChapterForLevel(level: number): ChapterInfo {
  const id = Math.min(CHAPTERS.length, Math.max(1, Math.ceil(level / LEVELS_PER_CHAPTER)));
  return CHAPTERS[id - 1]!;
}

export function isChapterStart(level: number): boolean {
  return level === 1 || (level - 1) % LEVELS_PER_CHAPTER === 0;
}
