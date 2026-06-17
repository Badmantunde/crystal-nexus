import type { CellPos } from './SimpleBoard';
import { mulberry32 } from '../player/DayChallenge';

export interface BoardModifierLayout {
  jelly: CellPos[];
  crates: CellPos[];
}

/** Chapter 3+ jelly; chapter 4+ crates. Seeded per level. */
export function getModifiersForLevel(
  level: number,
  rows: number,
  cols: number,
): BoardModifierLayout | null {
  if (level < 13) return null;

  const rng = mulberry32(level * 97_931);
  const jelly: CellPos[] = [];
  const crates: CellPos[] = [];
  const used = new Set<string>();

  const jellyCount = level < 19 ? 2 + (level - 13) : 4 + Math.floor((level - 19) / 2);
  const crateCount = level < 19 ? 0 : 2 + (level - 19);

  const pick = (): CellPos | null => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const row = Math.floor(rng() * rows);
      const col = Math.floor(rng() * cols);
      const key = `${row},${col}`;
      if (used.has(key)) continue;
      if (row === 0 && col === 0) continue;
      used.add(key);
      return { row, col };
    }
    return null;
  };

  for (let i = 0; i < jellyCount; i++) {
    const pos = pick();
    if (pos) jelly.push(pos);
  }

  for (let i = 0; i < crateCount; i++) {
    const pos = pick();
    if (pos) crates.push(pos);
  }

  if (jelly.length === 0 && crates.length === 0) return null;
  return { jelly, crates };
}
