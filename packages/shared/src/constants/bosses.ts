export enum BossAttackType {
  Corrupt = 'corrupt',
  Freeze = 'freeze',
  StealMove = 'steal_move',
  Shatter = 'shatter',
}

export interface BossDefinition {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  attackInterval: number;
  attacks: BossAttackType[];
  color: string;
}

export const BOSS_ROSTER: BossDefinition[] = [
  {
    id: 'crystal_guardian',
    name: 'Crystal Guardian',
    title: 'Sentinel of the Caverns',
    maxHp: 800,
    attackInterval: 4,
    attacks: [BossAttackType.Corrupt, BossAttackType.Shatter],
    color: '#a78bfa',
  },
  {
    id: 'void_titan',
    name: 'Void Titan',
    title: 'Devourer of Light',
    maxHp: 1500,
    attackInterval: 3,
    attacks: [BossAttackType.Corrupt, BossAttackType.StealMove, BossAttackType.Freeze],
    color: '#7c3aed',
  },
  {
    id: 'dragon_overlord',
    name: 'Ancient Crystal Dragon',
    title: 'Lord of the Nexus',
    maxHp: 2500,
    attackInterval: 3,
    attacks: [BossAttackType.Shatter, BossAttackType.Corrupt, BossAttackType.StealMove],
    color: '#dc2626',
  },
];

export function getBossForLevel(level: number): BossDefinition {
  const index = Math.floor(level / 25) - 1;
  return BOSS_ROSTER[Math.min(Math.max(index, 0), BOSS_ROSTER.length - 1)];
}
