import { GravityDirection } from '@crystal-nexus/shared';

export class GravitySystem {
  constructor(private direction: GravityDirection = GravityDirection.Down) {}

  setDirection(direction: GravityDirection): void {
    this.direction = direction;
  }

  getDirection(): GravityDirection {
    return this.direction;
  }

  apply<T>(grid: (T | null)[][]): boolean {
    switch (this.direction) {
      case GravityDirection.Down:
        return this.applyDown(grid);
      case GravityDirection.Up:
        return this.applyUp(grid);
      case GravityDirection.Left:
        return this.applyLeft(grid);
      case GravityDirection.Right:
        return this.applyRight(grid);
      default:
        return this.applyDown(grid);
    }
  }

  private applyDown<T>(grid: (T | null)[][]): boolean {
    let moved = false;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    for (let c = 0; c < cols; c++) {
      let writeRow = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (grid[r][c] !== null) {
          if (r !== writeRow) {
            grid[writeRow][c] = grid[r][c];
            grid[r][c] = null;
            moved = true;
          }
          writeRow--;
        }
      }
    }
    return moved;
  }

  private applyUp<T>(grid: (T | null)[][]): boolean {
    let moved = false;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    for (let c = 0; c < cols; c++) {
      let writeRow = 0;
      for (let r = 0; r < rows; r++) {
        if (grid[r][c] !== null) {
          if (r !== writeRow) {
            grid[writeRow][c] = grid[r][c];
            grid[r][c] = null;
            moved = true;
          }
          writeRow++;
        }
      }
    }
    return moved;
  }

  private applyLeft<T>(grid: (T | null)[][]): boolean {
    let moved = false;
    const rows = grid.length;

    for (let r = 0; r < rows; r++) {
      let writeCol = 0;
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] !== null) {
          if (c !== writeCol) {
            grid[r][writeCol] = grid[r][c];
            grid[r][c] = null;
            moved = true;
          }
          writeCol++;
        }
      }
    }
    return moved;
  }

  private applyRight<T>(grid: (T | null)[][]): boolean {
    let moved = false;
    const rows = grid.length;

    for (let r = 0; r < rows; r++) {
      const cols = grid[r].length;
      let writeCol = cols - 1;
      for (let c = cols - 1; c >= 0; c--) {
        if (grid[r][c] !== null) {
          if (c !== writeCol) {
            grid[r][writeCol] = grid[r][c];
            grid[r][c] = null;
            moved = true;
          }
          writeCol--;
        }
      }
    }
    return moved;
  }
}
