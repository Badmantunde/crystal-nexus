import type { CrystalCategory, EvolutionTier } from './crystal.js';

export enum Currency {
  Gold = 'gold',
  Energy = 'energy',
  CrystalDust = 'crystal_dust',
  AncientShards = 'ancient_shards',
  AstralEssence = 'astral_essence',
  PremiumGems = 'premium_gems',
}

export interface Wallet {
  [Currency.Gold]: number;
  [Currency.Energy]: number;
  [Currency.CrystalDust]: number;
  [Currency.AncientShards]: number;
  [Currency.AstralEssence]: number;
  [Currency.PremiumGems]: number;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  level: number;
  experience: number;
  wallet: Wallet;
  unlockedRegions: string[];
  currentRegion: string;
  streakDays: number;
  lastLoginAt: string;
  settings: PlayerSettings;
  collection: CrystalCollectionEntry[];
}

export interface CrystalCollectionEntry {
  category: CrystalCategory;
  tier: EvolutionTier;
  count: number;
  discoveredAt: string;
}

export interface PlayerSettings {
  colorBlindMode: boolean;
  oneHandedMode: boolean;
  uiScale: number;
  hapticsEnabled: boolean;
  performanceTier: 'low' | 'medium' | 'high' | 'ultra';
  language: string;
  musicVolume: number;
  sfxVolume: number;
}

export const DEFAULT_WALLET: Wallet = {
  [Currency.Gold]: 1000,
  [Currency.Energy]: 100,
  [Currency.CrystalDust]: 0,
  [Currency.AncientShards]: 0,
  [Currency.AstralEssence]: 0,
  [Currency.PremiumGems]: 50,
};

export const DEFAULT_SETTINGS: PlayerSettings = {
  colorBlindMode: false,
  oneHandedMode: false,
  uiScale: 1,
  hapticsEnabled: true,
  performanceTier: 'high',
  language: 'en',
  musicVolume: 0.7,
  sfxVolume: 0.8,
};
