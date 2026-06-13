export enum MultiplayerMode {
  PuzzleDuel = 'puzzle_duel',
  RankedBattle = 'ranked_battle',
  GuildBattle = 'guild_battle',
  CoopRaid = 'coop_raid',
  Tournament = 'tournament',
  GhostChallenge = 'ghost_challenge',
}

export enum MatchStatus {
  Waiting = 'waiting',
  InProgress = 'in_progress',
  Completed = 'completed',
  Abandoned = 'abandoned',
}

export interface MultiplayerMatch {
  id: string;
  mode: MultiplayerMode;
  status: MatchStatus;
  playerIds: string[];
  scores: Record<string, number>;
  startedAt?: string;
  endedAt?: string;
  winnerId?: string;
  replayData?: unknown;
}

export interface GuildInfo {
  id: string;
  name: string;
  tag: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  emblemUrl?: string;
  description?: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  score: number;
  avatarUrl?: string;
}
