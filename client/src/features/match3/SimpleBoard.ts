import type { CrystalCategory } from '@crystal-nexus/shared';
import { randomCandyType } from '../candy/CandyTypes';
import { makeCandy, isSpecial, cellCategory, type CandyCell, type SpecialType } from '../candy/CandyCell';

export interface CellPos {
  row: number;
  col: number;
}

export type SwipeAxis = 'horizontal' | 'vertical';

export interface MatchLine {
  cells: CellPos[];
  category: CrystalCategory;
  orientation: 'row' | 'col';
}

export interface ClearWave {
  cells: CellPos[];
  score: number;
  spawn?: { pos: CellPos; cell: CandyCell };
}

export interface SpecialBlast {
  kind: 'row' | 'col' | 'color' | 'cross' | 'col_double';
  origin: CellPos;
  secondaryOrigin?: CellPos;
  columns?: number[];
  cells: CellPos[];
  dirRow: number;
  dirCol: number;
  rows: number;
  cols: number;
  targetCategory?: CrystalCategory;
  strikeOrder?: CellPos[];
}

export interface FallMove {
  candy: CandyCell;
  col: number;
  fromRow: number;
  toRow: number;
  isNew: boolean;
}

export class SimpleBoard {
  readonly rows: number;
  readonly cols: number;
  private grid: (CandyCell | null)[][];
  private _score = 0;
  private _moves = 30;
  private _combo = 0;
  private lastPivot: CellPos | null = null;
  private lastSwipeAxis: SwipeAxis = 'horizontal';

  constructor(rows = 8, cols = 8, moves = 30) {
    this.rows = rows;
    this.cols = cols;
    this._moves = moves;
    this.grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    this.fill();
    while (this.findMatches().length > 0) this.refillRandom();
  }

  getCell(row: number, col: number): CandyCell | null {
    return this.grid[row]?.[col] ?? null;
  }

  /** @deprecated use getCell */
  getAt(row: number, col: number): CrystalCategory | null {
    return cellCategory(this.getCell(row, col));
  }

  getScore(): number {
    return this._score;
  }

  getMoves(): number {
    return this._moves;
  }

  getCombo(): number {
    return this._combo;
  }

  isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  swapCells(r1: number, c1: number, r2: number, c2: number): void {
    const t = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = t;
  }

  wouldMatchAfterSwap(r1: number, c1: number, r2: number, c2: number): boolean {
    const a = this.getCell(r1, c1);
    const b = this.getCell(r2, c2);
    if (isSpecial(a) || isSpecial(b)) return true;

    this.swapCells(r1, c1, r2, c2);
    const ok = this.findMatches().length > 0;
    this.swapCells(r1, c1, r2, c2);
    return ok;
  }

  findMatches(): MatchLine[] {
    const matches: MatchLine[] = [];

    for (let r = 0; r < this.rows; r++) {
      let runStart = 0;
      for (let c = 1; c <= this.cols; c++) {
        const curr = c < this.cols ? cellCategory(this.grid[r][c]) : null;
        const prev = cellCategory(this.grid[r][runStart]);
        if (c < this.cols && curr === prev && curr !== null) continue;

        const len = c - runStart;
        if (prev !== null && len >= 3) {
          const cells: CellPos[] = [];
          for (let i = runStart; i < c; i++) cells.push({ row: r, col: i });
          matches.push({ cells, category: prev, orientation: 'row' });
        }
        runStart = c;
      }
    }

    for (let c = 0; c < this.cols; c++) {
      let runStart = 0;
      for (let r = 1; r <= this.rows; r++) {
        const curr = r < this.rows ? cellCategory(this.grid[r][c]) : null;
        const prev = cellCategory(this.grid[runStart][c]);
        if (r < this.rows && curr === prev && curr !== null) continue;

        const len = r - runStart;
        if (prev !== null && len >= 3) {
          const cells: CellPos[] = [];
          for (let i = runStart; i < r; i++) cells.push({ row: i, col: c });
          matches.push({ cells, category: prev, orientation: 'col' });
        }
        runStart = r;
      }
    }

    return matches;
  }

  getMatchedCells(): CellPos[] {
    const seen = new Set<string>();
    const out: CellPos[] = [];
    for (const m of this.findMatches()) {
      for (const cell of m.cells) {
        const k = `${cell.row},${cell.col}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push(cell);
        }
      }
    }
    return out;
  }

  /**
   * Player swap — target (r2,c2) is where the dragged candy lands.
   * Swipe axis picks row vs column bomb on match-4.
   */
  playerSwap(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    swipeAxis: SwipeAxis,
  ): boolean {
    if (!this.isAdjacent(r1, c1, r2, c2) || this._moves <= 0) return false;
    if (!this.wouldMatchAfterSwap(r1, c1, r2, c2)) return false;

    this.swapCells(r1, c1, r2, c2);
    this._moves--;
    this.lastPivot = { row: r2, col: c2 };
    this.lastSwipeAxis = swipeAxis;

    return true;
  }

  /** Call after swap — returns blast info without clearing (for animation). */
  detectSpecialBlast(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
  ): SpecialBlast | null {
    const dirRow = r2 - r1;
    const dirCol = c2 - c1;
    const resolved = this.resolveSpecialSwap(r2, c2, r1, c1);
    if (!resolved) return null;

    const { cells, kind, origin, secondaryOrigin, columns } = resolved;
    const landed = this.getCell(r2, c2);
    const other = this.getCell(r1, c1);
    const partner = isSpecial(landed) ? other : landed;
    const targetCategory = kind === 'color' ? partner?.category : undefined;
    const strikeOrder =
      kind === 'color'
        ? [...cells].sort((a, b) => {
            const da = Math.hypot(a.row - origin.row, a.col - origin.col);
            const db = Math.hypot(b.row - origin.row, b.col - origin.col);
            return da - db;
          })
        : undefined;

    return {
      kind,
      origin,
      secondaryOrigin,
      columns,
      cells,
      dirRow:
        kind === 'col' || kind === 'col_double' ? (dirRow !== 0 ? dirRow : 1) : 0,
      dirCol: kind === 'row' || kind === 'cross' ? (dirCol !== 0 ? dirCol : 1) : 0,
      rows: this.rows,
      cols: this.cols,
      targetCategory,
      strikeOrder,
    };
  }

  commitSpecialBlast(blast: SpecialBlast): void {
    this._combo++;
    this._score += blast.cells.length * 15;
    this.clearCells(blast.cells);
  }

  /**
   * Special candies (e.g. star with row/col/color bomb) that sit in a match line
   * activate when matched — even if the player swapped a normal candy from elsewhere.
   */
  detectMatchedSpecialBlasts(matchedCells: CellPos[]): SpecialBlast[] {
    const blasts: SpecialBlast[] = [];
    const processed = new Set<string>();

    for (const pos of matchedCells) {
      const cell = this.getCell(pos.row, pos.col);
      if (!cell || !isSpecial(cell)) continue;

      const key = `${pos.row},${pos.col}`;
      if (processed.has(key)) continue;
      processed.add(key);

      const matchCategory = this.categoryForMatchAt(pos) ?? cell.category;
      const toClear = new Map<string, CellPos>();
      this.addSpecialEffect(toClear, pos, cell, makeCandy(matchCategory));
      const kind = this.inferBlastKind(cell);

      const strikeOrder =
        kind === 'color'
          ? [...toClear.values()].sort((a, b) => {
              const da = Math.hypot(a.row - pos.row, a.col - pos.col);
              const db = Math.hypot(b.row - pos.row, b.col - pos.col);
              return da - db;
            })
          : undefined;

      blasts.push({
        kind,
        origin: pos,
        cells: [...toClear.values()],
        dirRow: kind === 'col' ? 1 : 0,
        dirCol: kind === 'row' ? 1 : 0,
        rows: this.rows,
        cols: this.cols,
        targetCategory: kind === 'color' ? matchCategory : undefined,
        strikeOrder,
      });
    }

    return blasts;
  }

  private categoryForMatchAt(pos: CellPos): CrystalCategory | null {
    for (const match of this.findMatches()) {
      if (match.cells.some((c) => c.row === pos.row && c.col === pos.col)) {
        return match.category;
      }
    }
    return null;
  }

  applyCascade(): void {
    const moves = this.computeFallMoves();
    this.applyFallMoves(moves);
  }

  private resolveSpecialSwap(
    r2: number,
    c2: number,
    r1: number,
    c1: number,
  ): {
    cells: CellPos[];
    kind: SpecialBlast['kind'];
    origin: CellPos;
    secondaryOrigin?: CellPos;
    columns?: number[];
  } | null {
    const landed = this.getCell(r2, c2);
    const other = this.getCell(r1, c1);
    if (!isSpecial(landed) && !isSpecial(other)) return null;

    const specials: { pos: CellPos; cell: CandyCell }[] = [];
    if (isSpecial(landed)) specials.push({ pos: { row: r2, col: c2 }, cell: landed! });
    if (isSpecial(other)) specials.push({ pos: { row: r1, col: c1 }, cell: other! });

    const toClear = new Map<string, CellPos>();
    let kind: SpecialBlast['kind'] = 'color';
    let origin: CellPos = specials[0].pos;
    let secondaryOrigin: CellPos | undefined;
    let columns: number[] | undefined;

    if (specials.length === 2) {
      const a = specials[0];
      const b = specials[1];
      const hasRow = a.cell.special === 'row' || b.cell.special === 'row';
      const hasCol = a.cell.special === 'col' || b.cell.special === 'col';

      if (hasRow && hasCol) {
        kind = 'cross';
        const rowBomb = a.cell.special === 'row' ? a : b;
        const colBomb = a.cell.special === 'col' ? a : b;
        origin = rowBomb.pos;
        secondaryOrigin = colBomb.pos;
        this.addRowCells(toClear, origin);
        this.addColCells(toClear, secondaryOrigin);
      } else if (a.cell.special === 'col' && b.cell.special === 'col') {
        kind = 'col_double';
        origin = a.pos;
        secondaryOrigin = b.pos;
        columns = [...new Set([a.pos.col, b.pos.col])];
        for (const col of columns) {
          for (let r = 0; r < this.rows; r++) toClear.set(`${r},${col}`, { row: r, col });
        }
      } else {
        for (const { pos, cell } of specials) {
          this.addSpecialEffect(toClear, pos, cell, other ?? landed);
        }
        kind = this.inferBlastKind(specials[0].cell);
        origin = specials[0].pos;
      }

      toClear.set(`${r1},${c1}`, { row: r1, col: c1 });
      toClear.set(`${r2},${c2}`, { row: r2, col: c2 });
    } else {
      const { pos, cell } = specials[0];
      this.addSpecialEffect(toClear, pos, cell, other ?? landed);
      kind = this.inferBlastKind(cell);
      origin = pos;
    }

    return { cells: [...toClear.values()], kind, origin, secondaryOrigin, columns };
  }

  private inferBlastKind(cell: CandyCell): SpecialBlast['kind'] {
    if (cell.special === 'row') return 'row';
    if (cell.special === 'col') return 'col';
    return 'color';
  }

  private addRowCells(out: Map<string, CellPos>, pos: CellPos): void {
    for (let c = 0; c < this.cols; c++) out.set(`${pos.row},${c}`, { row: pos.row, col: c });
    out.set(`${pos.row},${pos.col}`, pos);
  }

  private addColCells(out: Map<string, CellPos>, pos: CellPos): void {
    for (let r = 0; r < this.rows; r++) out.set(`${r},${pos.col}`, { row: r, col: pos.col });
    out.set(`${pos.row},${pos.col}`, pos);
  }

  private addSpecialEffect(
    out: Map<string, CellPos>,
    pos: CellPos,
    special: CandyCell,
    partner: CandyCell | null,
  ): void {
    const partnerCat = partner?.category ?? special.category;

    switch (special.special) {
      case 'row':
        for (let c = 0; c < this.cols; c++) out.set(`${pos.row},${c}`, { row: pos.row, col: c });
        break;
      case 'col':
        for (let r = 0; r < this.rows; r++) out.set(`${r},${pos.col}`, { row: r, col: pos.col });
        break;
      case 'color':
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            if (cellCategory(this.grid[r][c]) === partnerCat) {
              out.set(`${r},${c}`, { row: r, col: c });
            }
          }
        }
        break;
    }
    out.set(`${pos.row},${pos.col}`, pos);
  }

  peekWave(): ClearWave | null {
    const matches = this.findMatches();
    if (matches.length === 0) return null;

    const cells = this.getMatchedCells();
    const combo = this._combo + 1;
    const score = cells.length * 10 * combo;

    let spawn: ClearWave['spawn'];
    const longest = matches.reduce((a, b) => (a.cells.length >= b.cells.length ? a : b));

    if (longest.cells.length >= 5) {
      const pos = this.pickSpawnPos(longest.cells);
      spawn = { pos, cell: makeCandy(longest.category, 'color') };
    } else if (longest.cells.length === 4) {
      const pos = this.pickSpawnPos(longest.cells);
      const special: SpecialType = this.lastSwipeAxis === 'horizontal' ? 'row' : 'col';
      spawn = { pos, cell: makeCandy(longest.category, special) };
    }

    return { cells, score, spawn };
  }

  private pickSpawnPos(cells: CellPos[]): CellPos {
    if (this.lastPivot && cells.some((c) => c.row === this.lastPivot!.row && c.col === this.lastPivot!.col)) {
      return this.lastPivot;
    }
    return cells[Math.floor(cells.length / 2)];
  }

  /** Clear matched cells only — gravity applied separately via fall animation. */
  clearWaveCells(wave: ClearWave): void {
    const spawnKey = wave.spawn ? `${wave.spawn.pos.row},${wave.spawn.pos.col}` : '';

    for (const { row, col } of wave.cells) {
      if (`${row},${col}` === spawnKey) continue;
      this.grid[row][col] = null;
    }

    if (wave.spawn) {
      this.grid[wave.spawn.pos.row][wave.spawn.pos.col] = wave.spawn.cell;
    }

    this._combo++;
    this._score += wave.score;
    this.lastPivot = null;
  }

  computeFallMoves(): FallMove[] {
    const moves: FallMove[] = [];

    for (let c = 0; c < this.cols; c++) {
      const stack: { row: number; candy: CandyCell }[] = [];
      for (let r = this.rows - 1; r >= 0; r--) {
        const candy = this.grid[r][c];
        if (candy) stack.push({ row: r, candy });
      }

      let writeRow = this.rows - 1;
      for (const item of stack) {
        moves.push({
          candy: item.candy,
          col: c,
          fromRow: item.row,
          toRow: writeRow,
          isNew: false,
        });
        writeRow--;
      }

      let spawned = 0;
      while (writeRow >= 0) {
        spawned++;
        moves.push({
          candy: makeCandy(randomCandyType()),
          col: c,
          fromRow: -spawned,
          toRow: writeRow,
          isNew: true,
        });
        writeRow--;
      }
    }

    return moves;
  }

  applyFallMoves(moves: FallMove[]): void {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) this.grid[r][c] = null;
    }
    for (const m of moves) {
      this.grid[m.toRow][m.col] = m.candy;
    }
  }

  clearMatchedWave(): ClearWave | null {
    const wave = this.peekWave();
    if (!wave) return null;

    this.clearWaveCells(wave);
    const moves = this.computeFallMoves();
    this.applyFallMoves(moves);

    return wave;
  }

  clearCells(cells: CellPos[]): void {
    for (const { row, col } of cells) this.grid[row][col] = null;
  }

  applyGravity(): void {
    for (let c = 0; c < this.cols; c++) {
      let writeRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== writeRow) {
            this.grid[writeRow][c] = this.grid[r][c];
            this.grid[r][c] = null;
          }
          writeRow--;
        }
      }
    }
  }

  refill(): void {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.grid[r][c] === null) {
          this.grid[r][c] = makeCandy(randomCandyType());
        }
      }
    }
  }

  resetCombo(): void {
    this._combo = 0;
  }

  private fill(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = makeCandy(randomCandyType());
      }
    }
  }

  private refillRandom(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = makeCandy(randomCandyType());
      }
    }
  }
}
