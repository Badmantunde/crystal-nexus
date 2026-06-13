import {
  MATCHABLE_CATEGORIES,
  PowerType,
  type CrystalCategory,
  type BoardConfig,
  BoardTheme,
  GravityDirection,
  MatchPattern,
} from '@crystal-nexus/shared';
import { MatchDetector, type MatchGroup } from './MatchDetector';
import { GravitySystem } from './GravitySystem';
import { createCrystal, hasPower, type BoardCrystal } from './BoardCrystal';
import { FusionSystem } from '../fusion/FusionSystem';
import { AbilitySystem } from '../abilities/AbilitySystem';
import { BossEncounter, isBossLevel } from '../bosses/BossEncounter';
import { BossAttackType } from '@crystal-nexus/shared';

export interface SwapResult {
  valid: boolean;
  matches: MatchGroup[];
  combo: number;
  score: number;
  fusionCreated?: string;
  abilityActivated?: string;
  bossDamage?: number;
  bossAttack?: string;
}

export interface BoardState {
  grid: readonly (readonly (BoardCrystal | null)[])[];
  score: number;
  moves: number;
  combo: number;
  level: number;
  isBossFight: boolean;
  bossHp?: number;
  bossMaxHp?: number;
  bossName?: string;
}

export class Board {
  readonly rows: number;
  readonly cols: number;
  readonly level: number;
  private grid: (BoardCrystal | null)[][];
  private detector = new MatchDetector();
  private gravity = new GravitySystem();
  private fusion = new FusionSystem();
  private abilities = new AbilitySystem();
  private boss: BossEncounter | null = null;
  private movesLeft: number;
  private score = 0;
  private combo = 0;
  private targetScore: number;

  constructor(level = 1, config?: Partial<BoardConfig>) {
    this.level = level;
    this.rows = config?.rows ?? 8;
    this.cols = config?.cols ?? 8;
    this.movesLeft = config?.moveLimit ?? 30;
    this.targetScore = isBossLevel(level) ? 0 : 1000 + (level - 1) * 200;
    this.grid = this.createEmptyGrid();
    this.gravity.setDirection(config?.gravity ?? GravityDirection.Down);

    if (isBossLevel(level)) {
      this.boss = new BossEncounter(level);
    }

    this.fillBoard();
    this.removeInitialMatches();
  }

  private createEmptyGrid(): (BoardCrystal | null)[][] {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => null),
    );
  }

  private randomCategory(): CrystalCategory {
    return MATCHABLE_CATEGORIES[Math.floor(Math.random() * MATCHABLE_CATEGORIES.length)];
  }

  private fillBoard(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = createCrystal(this.randomCategory());
      }
    }
  }

  private removeInitialMatches(): void {
    let matches = this.detector.findMatches(this.grid);
    while (matches.length > 0) {
      for (const match of matches) {
        for (const cell of match.cells) {
          this.grid[cell.row][cell.col] = createCrystal(this.randomCategory());
        }
      }
      matches = this.detector.findMatches(this.grid);
    }
  }

  getState(): BoardState {
    return {
      grid: this.grid,
      score: this.score,
      moves: this.movesLeft,
      combo: this.combo,
      level: this.level,
      isBossFight: this.boss !== null,
      bossHp: this.boss?.getHp(),
      bossMaxHp: this.boss?.getMaxHp(),
      bossName: this.boss?.definition.name,
    };
  }

  getGrid(): readonly (readonly (BoardCrystal | null)[])[] {
    return this.grid;
  }

  getScore(): number {
    return this.score;
  }

  getMovesLeft(): number {
    return this.movesLeft;
  }

  getCombo(): number {
    return this.combo;
  }

  getTheme(): BoardTheme {
    return BoardTheme.CrystalCaverns;
  }

  isBossFight(): boolean {
    return this.boss !== null;
  }

  isBossDefeated(): boolean {
    return this.boss?.isDefeated() ?? false;
  }

  isLevelComplete(): boolean {
    if (this.boss) return this.boss.isDefeated();
    return this.score >= this.targetScore;
  }

  isLevelFailed(): boolean {
    return this.movesLeft <= 0 && !this.isLevelComplete();
  }

  getTargetScore(): number {
    return this.targetScore;
  }

  getCell(row: number, col: number): BoardCrystal | null {
    return this.grid[row]?.[col] ?? null;
  }

  canSwap(r1: number, c1: number, r2: number, c2: number): boolean {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    if (dr + dc !== 1) return false;
    if (this.movesLeft <= 0) return false;
    return this.grid[r1][c1] !== null && this.grid[r2][c2] !== null;
  }

  activatePower(row: number, col: number): SwapResult {
    const cell = this.grid[row][col];
    if (!cell || !hasPower(cell)) {
      return { valid: false, matches: [], combo: 0, score: 0 };
    }
    if (this.movesLeft <= 0) {
      return { valid: false, matches: [], combo: 0, score: 0 };
    }

    this.movesLeft--;
    const ability = this.abilities.resolvePower(cell, row, col, this.rows, this.cols);
    this.clearCells(ability.cellsToClear);
    this.score += ability.bonusScore;

    const cascadeResult = this.resolveCascades();
    const bossDamage = this.applyBossDamage(ability.bonusScore + cascadeResult.score);
    const bossAttack = this.tickBoss();

    return {
      valid: true,
      matches: cascadeResult.matches,
      combo: cascadeResult.combo,
      score: ability.bonusScore + cascadeResult.score,
      abilityActivated: ability.description,
      bossDamage,
      bossAttack,
    };
  }

  swap(r1: number, c1: number, r2: number, c2: number): SwapResult {
    if (!this.canSwap(r1, c1, r2, c2)) {
      return { valid: false, matches: [], combo: 0, score: 0 };
    }

    const cellA = this.grid[r1][c1]!;
    const cellB = this.grid[r2][c2]!;
    const powerA = hasPower(cellA);
    const powerB = hasPower(cellB);

    const recipe = this.fusion.findRecipe(cellA.category, cellB.category);
    if (recipe) {
      return this.executeFusion(r1, c1, r2, c2, recipe);
    }

    if (powerA || powerB) {
      return this.executePoweredSwap(r1, c1, r2, c2, powerA, powerB);
    }

    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;

    let matches = this.detector.findMatches(this.grid);
    if (matches.length === 0) {
      this.grid[r2][c2] = this.grid[r1][c1];
      this.grid[r1][c1] = temp;
      return { valid: false, matches: [], combo: 0, score: 0 };
    }

    this.movesLeft--;
    const pivot = { row: r2, col: c2 };
    const result = this.resolveMatches(matches, pivot);
    const bossDamage = this.applyBossDamage(result.score);
    const bossAttack = this.tickBoss();

    return { ...result, bossDamage, bossAttack };
  }

  private executePoweredSwap(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    powerA: boolean,
    powerB: boolean,
  ): SwapResult {
    this.movesLeft--;

    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;

    let totalScore = 0;
    const allMatches: MatchGroup[] = [];
    let abilityActivated: string | undefined;

    if (powerA) {
      const res = this.triggerPowerAt(r2, c2);
      totalScore += res.score;
      allMatches.push(...res.matches);
      abilityActivated = res.abilityActivated;
    }
    if (powerB) {
      const res = this.triggerPowerAt(r1, c1);
      totalScore += res.score;
      allMatches.push(...res.matches);
      abilityActivated = res.abilityActivated ?? abilityActivated;
    }

    const cascade = this.resolveCascades();
    totalScore += cascade.score;
    allMatches.push(...cascade.matches);

    this.score += totalScore;
    return {
      valid: true,
      matches: allMatches,
      combo: cascade.combo,
      score: totalScore,
      abilityActivated,
      bossDamage: this.applyBossDamage(totalScore),
      bossAttack: this.tickBoss(),
    };
  }

  private triggerPowerAt(
    row: number,
    col: number,
  ): { score: number; matches: MatchGroup[]; abilityActivated?: string } {
    const cell = this.grid[row][col];
    if (!cell || !hasPower(cell)) {
      return { score: 0, matches: [] };
    }

    const ability = this.abilities.resolvePower(cell, row, col, this.rows, this.cols);
    this.grid[row][col] = null;
    this.clearCells(ability.cellsToClear);
    return {
      score: ability.bonusScore,
      matches: [],
      abilityActivated: ability.description,
    };
  }

  private executeFusion(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    recipe: { resultName: string; exclusiveAbility: string },
  ): SwapResult {
    this.movesLeft--;
    const fused = this.fusion.createFusedCrystal(
      this.fusion.findRecipe(this.grid[r1][c1]!.category, this.grid[r2][c2]!.category)!,
    );
    this.grid[r1][c1] = null;
    this.grid[r2][c2] = fused;

    this.gravity.apply(this.grid);
    this.refill();

    const cascadeResult = this.resolveCascades();
    const fusionBonus = 150;
    this.score += fusionBonus;

    return {
      valid: true,
      matches: cascadeResult.matches,
      combo: cascadeResult.combo,
      score: fusionBonus + cascadeResult.score,
      fusionCreated: recipe.resultName,
      bossDamage: this.applyBossDamage(fusionBonus + cascadeResult.score),
      bossAttack: this.tickBoss(),
    };
  }

  private resolveMatches(
    matches: MatchGroup[],
    pivot: { row: number; col: number },
  ): SwapResult {
    this.combo = 0;
    const allMatches: MatchGroup[] = [];
    let roundScore = 0;

    while (matches.length > 0) {
      this.combo++;
      const spawns: { row: number; col: number; crystal: BoardCrystal }[] = [];

      for (const match of matches) {
        roundScore += this.scoreMatch(match);
        const spawn = this.pickPowerSpawn(match, pivot);
        for (const cell of match.cells) {
          if (spawn && cell.row === spawn.row && cell.col === spawn.col) {
            spawns.push({ row: cell.row, col: cell.col, crystal: spawn.crystal });
          }
          this.grid[cell.row][cell.col] = null;
        }
        allMatches.push(match);
      }

      for (const s of spawns) {
        this.grid[s.row][s.col] = s.crystal;
      }

      this.gravity.apply(this.grid);
      this.refill();
      matches = this.detector.findMatches(this.grid);
    }

    this.score += roundScore;
    return { valid: true, matches: allMatches, combo: this.combo, score: roundScore };
  }

  private pickPowerSpawn(
    match: MatchGroup,
    pivot: { row: number; col: number },
  ): { row: number; col: number; crystal: BoardCrystal } | null {
    if (match.pattern === MatchPattern.Three) return null;

    const pivotCell = match.cells.find((c) => c.row === pivot.row && c.col === pivot.col);
    const target = pivotCell ?? match.cells[Math.floor(match.cells.length / 2)];

    let power = PowerType.None;
    if (match.pattern === MatchPattern.Five || match.orientation === 'mixed') {
      power = PowerType.Nova;
    } else if (match.pattern === MatchPattern.Four) {
      power = match.orientation === 'vertical' ? PowerType.LineCol : PowerType.LineRow;
    }

    if (power === PowerType.None) return null;

    return {
      row: target.row,
      col: target.col,
      crystal: createCrystal(match.category, power),
    };
  }

  private resolveCascades(): { matches: MatchGroup[]; combo: number; score: number } {
    let matches = this.detector.findMatches(this.grid);
    if (matches.length === 0) return { matches: [], combo: 0, score: 0 };

    const savedCombo = this.combo;
    const result = this.resolveMatches(matches, { row: -1, col: -1 });
    this.combo = Math.max(savedCombo, result.combo);
    return result;
  }

  private clearCells(cells: { row: number; col: number }[]): void {
    for (const { row, col } of cells) {
      this.grid[row][col] = null;
    }
    this.gravity.apply(this.grid);
    this.refill();
  }

  private scoreMatch(match: MatchGroup): number {
    const base = match.cells.length * 10;
    const comboBonus = this.combo * 5;
    const patternBonus =
      match.pattern === MatchPattern.Five ? 100 : match.pattern === MatchPattern.Four ? 50 : 0;
    const bossMultiplier = this.boss ? 2 : 1;
    return (base + comboBonus + patternBonus) * bossMultiplier;
  }

  private applyBossDamage(damage: number): number | undefined {
    if (!this.boss) return undefined;
    const bossDamage = Math.floor(damage * 0.5);
    this.boss.takeDamage(bossDamage);
    return bossDamage;
  }

  private tickBoss(): string | undefined {
    if (!this.boss) return undefined;
    const attack = this.boss.onPlayerMove(this.grid, this.rows, this.cols);
    if (!attack) return undefined;

    if (attack.type === BossAttackType.StealMove) {
      this.movesLeft = Math.max(0, this.movesLeft - 1);
    }
    return attack.message;
  }

  private refill(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === null) {
          this.grid[r][c] = createCrystal(this.randomCategory());
        }
      }
    }
  }
}
