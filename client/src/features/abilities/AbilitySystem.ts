import { PowerType, CRYSTAL_DEFINITIONS, type CrystalCategory } from '@crystal-nexus/shared';
import type { BoardCrystal } from '../match3/BoardCrystal';

export interface AbilityResult {
  cellsToClear: { row: number; col: number }[];
  bonusScore: number;
  description: string;
}

export class AbilitySystem {
  resolvePower(
    cell: BoardCrystal,
    row: number,
    col: number,
    rows: number,
    cols: number,
  ): AbilityResult {
    switch (cell.power) {
      case PowerType.LineRow:
        return this.lineClear(row, col, rows, cols, 'row', cell.category);
      case PowerType.LineCol:
        return this.lineClear(row, col, rows, cols, 'col', cell.category);
      case PowerType.Nova:
        return this.novaBlast(row, col, rows, cols, cell.category);
      case PowerType.Fused:
        return this.fusionBurst(row, col, rows, cols, cell);
      default:
        return this.categoryAbility(cell.category, row, col, rows, cols);
    }
  }

  private lineClear(
    row: number,
    col: number,
    rows: number,
    cols: number,
    axis: 'row' | 'col',
    category: CrystalCategory,
  ): AbilityResult {
    const cells: { row: number; col: number }[] = [];
    if (axis === 'row') {
      for (let c = 0; c < cols; c++) cells.push({ row, col: c });
    } else {
      for (let r = 0; r < rows; r++) cells.push({ row: r, col });
    }
    const def = CRYSTAL_DEFINITIONS[category];
    return {
      cellsToClear: cells,
      bonusScore: cells.length * 15,
      description: `${def.displayName} line blast!`,
    };
  }

  private novaBlast(
    row: number,
    col: number,
    rows: number,
    cols: number,
    category: CrystalCategory,
  ): AbilityResult {
    const cells: { row: number; col: number }[] = [];
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          cells.push({ row: r, col: c });
        }
      }
    }
    const def = CRYSTAL_DEFINITIONS[category];
    return {
      cellsToClear: cells,
      bonusScore: cells.length * 25,
      description: `${def.displayName} nova burst!`,
    };
  }

  private fusionBurst(
    row: number,
    col: number,
    rows: number,
    cols: number,
    cell: BoardCrystal,
  ): AbilityResult {
    const cells: { row: number; col: number }[] = [];
    for (let r = row - 2; r <= row + 2; r++) {
      for (let c = col - 2; c <= col + 2; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          cells.push({ row: r, col: c });
        }
      }
    }
    return {
      cellsToClear: cells,
      bonusScore: cells.length * 40,
      description: `Fusion unleashed: ${cell.fusedAbilityId ?? 'unknown'}!`,
    };
  }

  private categoryAbility(
    category: CrystalCategory,
    row: number,
    col: number,
    rows: number,
    cols: number,
  ): AbilityResult {
    const cells: { row: number; col: number }[] = [{ row, col }];
    const def = CRYSTAL_DEFINITIONS[category];

    switch (category) {
      case 'storm':
        for (let c = 0; c < cols; c++) cells.push({ row, col: c });
        break;
      case 'fire':
        for (let r = 0; r < rows; r++) cells.push({ row: r, col });
        break;
      case 'void':
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < rows && c >= 0 && c < cols) {
              cells.push({ row: r, col: c });
            }
          }
        }
        break;
      default:
        break;
    }

    return {
      cellsToClear: cells,
      bonusScore: cells.length * 10,
      description: `${def.displayName} power!`,
    };
  }
}
