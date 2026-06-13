import type { CrystalCategory } from './crystal.js';

export enum BoardTheme {
  CrystalCaverns = 'crystal_caverns',
  VolcanicCore = 'volcanic_core',
  SkyIslands = 'sky_islands',
  QuantumLabs = 'quantum_labs',
  FrozenKingdom = 'frozen_kingdom',
  AncientRuins = 'ancient_ruins',
  VoidRealm = 'void_realm',
  AstralNexus = 'astral_nexus',
  DragonSanctuary = 'dragon_sanctuary',
  TemporalDimension = 'temporal_dimension',
}

export enum BoardLayer {
  Surface = 'surface',
  Underground = 'underground',
  Astral = 'astral',
}

export enum GravityDirection {
  Down = 'down',
  Up = 'up',
  Left = 'left',
  Right = 'right',
  Diagonal = 'diagonal',
  Circular = 'circular',
  Rotational = 'rotational',
}

export enum TileType {
  Normal = 'normal',
  Blocked = 'blocked',
  Destructible = 'destructible',
  Portal = 'portal',
  Mirror = 'mirror',
  Hazard = 'hazard',
  MultiLayer = 'multi_layer',
}

export interface GridPosition {
  row: number;
  col: number;
  layer?: BoardLayer;
}

export interface BoardCell {
  position: GridPosition;
  tileType: TileType;
  crystalId: string | null;
  crystalCategory: CrystalCategory | null;
  health?: number;
  portalTarget?: GridPosition;
}

export interface BoardConfig {
  rows: number;
  cols: number;
  theme: BoardTheme;
  layers: BoardLayer[];
  gravity: GravityDirection;
  moveLimit: number;
  objectives: LevelObjective[];
  obstacles?: ObstacleConfig[];
}

export interface LevelObjective {
  type: 'collect' | 'score' | 'clear_obstacles' | 'defeat_boss' | 'survive';
  target: number;
  crystalCategory?: CrystalCategory;
}

export interface ObstacleConfig {
  position: GridPosition;
  type: TileType;
  health?: number;
}
