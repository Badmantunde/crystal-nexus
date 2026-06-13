import { MatchPattern, type CrystalCategory } from '@crystal-nexus/shared';
import { crystalCategory, type BoardCrystal } from './BoardCrystal';

export interface GridCell {
  row: number;
  col: number;
  category: CrystalCategory;
}

export interface MatchGroup {
  pattern: MatchPattern;
  cells: GridCell[];
  category: CrystalCategory;
  orientation: 'horizontal' | 'vertical' | 'mixed';
}

export class MatchDetector {
  findMatches(grid: (BoardCrystal | null)[][]): MatchGroup[] {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const matches: MatchGroup[] = [];
    const claimed = new Set<string>();

    const key = (r: number, c: number) => `${r},${c}`;
    const catAt = (r: number, c: number) => crystalCategory(grid[r]?.[c] ?? null);

    for (let r = 0; r < rows; r++) {
      let runStart = 0;
      for (let c = 1; c <= cols; c++) {
        const curr = c < cols ? catAt(r, c) : null;
        const prev = catAt(r, runStart);
        if (c < cols && curr === prev && curr !== null) continue;

        const runLen = c - runStart;
        if (prev !== null && runLen >= 3) {
          const cells: GridCell[] = [];
          for (let i = runStart; i < c; i++) {
            if (!claimed.has(key(r, i))) {
              cells.push({ row: r, col: i, category: prev });
              claimed.add(key(r, i));
            }
          }
          if (cells.length >= 3) {
            matches.push({
              pattern: this.classifyLength(cells.length),
              cells,
              category: prev,
              orientation: 'horizontal',
            });
          }
        }
        runStart = c;
      }
    }

    for (let c = 0; c < cols; c++) {
      let runStart = 0;
      for (let r = 1; r <= rows; r++) {
        const curr = r < rows ? catAt(r, c) : null;
        const prev = catAt(r, runStart);
        if (r < rows && curr === prev && curr !== null) continue;

        const runLen = r - runStart;
        if (prev !== null && runLen >= 3) {
          const cells: GridCell[] = [];
          for (let i = runStart; i < r; i++) {
            if (!claimed.has(key(i, c))) {
              cells.push({ row: i, col: c, category: prev });
              claimed.add(key(i, c));
            }
          }
          if (cells.length >= 3) {
            matches.push({
              pattern: this.classifyLength(cells.length),
              cells,
              category: prev,
              orientation: 'vertical',
            });
          }
        }
        runStart = r;
      }
    }

    return this.mergeOverlapping(matches);
  }

  private classifyLength(len: number): MatchPattern {
    if (len >= 5) return MatchPattern.Five;
    if (len === 4) return MatchPattern.Four;
    return MatchPattern.Three;
  }

  private mergeOverlapping(matches: MatchGroup[]): MatchGroup[] {
    const merged: MatchGroup[] = [];
    const used = new Set<string>();

    for (const match of matches) {
      const cellKeys = match.cells.map((c) => `${c.row},${c.col}`);
      if (cellKeys.some((k) => used.has(k))) {
        const existing = merged.find((m) =>
          m.cells.some((c) => cellKeys.includes(`${c.row},${c.col}`)),
        );
        if (existing) {
          for (const cell of match.cells) {
            const k = `${cell.row},${cell.col}`;
            if (!used.has(k)) {
              existing.cells.push(cell);
              used.add(k);
            }
          }
          existing.pattern = this.classifyLength(existing.cells.length);
          if (existing.orientation !== match.orientation) {
            existing.orientation = 'mixed';
          }
        }
      } else {
        for (const k of cellKeys) used.add(k);
        merged.push({ ...match, cells: [...match.cells] });
      }
    }
    return merged;
  }
}
