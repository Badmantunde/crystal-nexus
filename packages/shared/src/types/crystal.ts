export enum CrystalCategory {
  Fire = 'fire',
  Ice = 'ice',
  Nature = 'nature',
  Storm = 'storm',
  Void = 'void',
  Plasma = 'plasma',
  Celestial = 'celestial',
  Quantum = 'quantum',
  Cosmic = 'cosmic',
  Shadow = 'shadow',
  Dragon = 'dragon',
  Ancient = 'ancient',
}

export enum EvolutionTier {
  Common = 'common',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
  Mythic = 'mythic',
  Ancient = 'ancient',
  Transcendent = 'transcendent',
}

export enum MatchPattern {
  Three = 'match3',
  Four = 'match4',
  Five = 'match5',
  LShape = 'l_shape',
  TShape = 't_shape',
  Cross = 'cross',
  Loop = 'loop',
  Circle = 'circle',
  Cluster = 'cluster',
  Fusion = 'fusion',
}

export interface CrystalDefinition {
  id: string;
  category: CrystalCategory;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  emissiveIntensity: number;
  shape: 'octahedron' | 'dodecahedron' | 'icosahedron' | 'tetrahedron' | 'prism';
  abilityId?: string;
  fusionParents?: [CrystalCategory, CrystalCategory];
}

export interface CrystalInstance {
  id: string;
  category: CrystalCategory;
  tier: EvolutionTier;
  experience: number;
  powerLevel: number;
  fused: boolean;
  fusionResult?: CrystalCategory;
}

export interface FusionRecipe {
  inputs: [CrystalCategory, CrystalCategory];
  result: CrystalCategory;
  resultName: string;
  exclusiveAbility: string;
}
