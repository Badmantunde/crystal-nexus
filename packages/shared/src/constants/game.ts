export const GAME_ID = 'crystal-nexus';
export const GAME_VERSION = '0.1.0';

export const DEFAULT_BOARD_ROWS = 8;
export const DEFAULT_BOARD_COLS = 8;
export const MIN_MATCH_LENGTH = 3;
export const BOSS_LEVEL_INTERVAL = 25;

export const EVOLUTION_XP_THRESHOLDS = {
  common: 0,
  rare: 100,
  epic: 500,
  legendary: 2000,
  mythic: 8000,
  ancient: 25000,
  transcendent: 100000,
} as const;

export const REGIONS = [
  { id: 'crystal_forest', name: 'Crystal Forest', unlockLevel: 1 },
  { id: 'frozen_citadel', name: 'Frozen Citadel', unlockLevel: 50 },
  { id: 'storm_peaks', name: 'Storm Peaks', unlockLevel: 100 },
  { id: 'volcanic_wastes', name: 'Volcanic Wastes', unlockLevel: 150 },
  { id: 'astral_ocean', name: 'Astral Ocean', unlockLevel: 200 },
  { id: 'void_lands', name: 'Void Lands', unlockLevel: 300 },
  { id: 'ancient_nexus', name: 'Ancient Nexus', unlockLevel: 500 },
] as const;

export const KINGDOM_BUILDINGS = [
  { id: 'crystal_forge', name: 'Crystal Forge', maxLevel: 20 },
  { id: 'energy_reactor', name: 'Energy Reactor', maxLevel: 20 },
  { id: 'research_lab', name: 'Research Lab', maxLevel: 15 },
  { id: 'guild_hall', name: 'Guild Hall', maxLevel: 10 },
  { id: 'portal_gate', name: 'Portal Gate', maxLevel: 10 },
  { id: 'astral_observatory', name: 'Astral Observatory', maxLevel: 15 },
  { id: 'dragon_sanctuary', name: 'Dragon Sanctuary', maxLevel: 10 },
] as const;

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MATCH_JOIN: 'match:join',
  MATCH_LEAVE: 'match:leave',
  MATCH_MOVE: 'match:move',
  MATCH_STATE: 'match:state',
  MATCH_END: 'match:end',
  GUILD_CHAT: 'guild:chat',
  GUILD_RAID: 'guild:raid',
  SYNC_REQUEST: 'sync:request',
  SYNC_RESPONSE: 'sync:response',
} as const;
