import {
  BossAttackType,
  getBossForLevel,
  type BossDefinition,
} from '@crystal-nexus/shared';
import { MATCHABLE_CATEGORIES, type CrystalCategory } from '@crystal-nexus/shared';
import type { BoardCrystal } from '../match3/BoardCrystal';
import { createCrystal } from '../match3/BoardCrystal';

export interface BossAttack {
  type: BossAttackType;
  message: string;
  row?: number;
  col?: number;
  newCategory?: CrystalCategory;
}

export class BossEncounter {
  readonly definition: BossDefinition;
  private hp: number;
  private movesSinceAttack = 0;

  constructor(level: number) {
    this.definition = getBossForLevel(level);
    this.hp = this.definition.maxHp;
  }

  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.definition.maxHp;
  }

  getHpPercent(): number {
    return this.hp / this.definition.maxHp;
  }

  isDefeated(): boolean {
    return this.hp <= 0;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  onPlayerMove(
    grid: (BoardCrystal | null)[][],
    rows: number,
    cols: number,
  ): BossAttack | null {
    this.movesSinceAttack++;
    if (this.movesSinceAttack < this.definition.attackInterval) return null;

    this.movesSinceAttack = 0;
    return this.executeAttack(grid, rows, cols);
  }

  private executeAttack(
    grid: (BoardCrystal | null)[][],
    rows: number,
    cols: number,
  ): BossAttack {
    const attackType =
      this.definition.attacks[
        Math.floor(Math.random() * this.definition.attacks.length)
      ];

    const occupied: { row: number; col: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) occupied.push({ row: r, col: c });
      }
    }

    if (occupied.length === 0) {
      return { type: attackType, message: `${this.definition.name} roars!` };
    }

    const target = occupied[Math.floor(Math.random() * occupied.length)];

    switch (attackType) {
      case BossAttackType.Corrupt: {
        const newCat =
          MATCHABLE_CATEGORIES[Math.floor(Math.random() * MATCHABLE_CATEGORIES.length)];
        grid[target.row][target.col] = createCrystal(newCat);
        return {
          type: attackType,
          message: `${this.definition.name} corrupts a crystal!`,
          row: target.row,
          col: target.col,
          newCategory: newCat,
        };
      }
      case BossAttackType.Freeze:
      case BossAttackType.Shatter:
        grid[target.row][target.col] = null;
        return {
          type: attackType,
          message: `${this.definition.name} shatters a crystal!`,
          row: target.row,
          col: target.col,
        };
      case BossAttackType.StealMove:
        return {
          type: attackType,
          message: `${this.definition.name} drains your energy!`,
        };
      default:
        return { type: attackType, message: `${this.definition.name} attacks!` };
    }
  }
}

export function isBossLevel(level: number): boolean {
  return level > 0 && level % 25 === 0;
}
