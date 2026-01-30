export enum MatchStatus {
  OFFLINE = 'OFFLINE',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED'
}

// Team Balancer Types
export type PlayerRole = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT' | 'FILL';

export const ROLES: PlayerRole[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
export const ALL_ROLES: PlayerRole[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL'];

export const ROLE_LABELS: Record<PlayerRole, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MID: 'Mid',
  ADC: 'ADC',
  SUPPORT: 'Support',
  FILL: 'Fill'
};

export const ROLE_ICONS: Record<PlayerRole, string> = {
  TOP: '🛡️',
  JUNGLE: '🌲',
  MID: '⚡',
  ADC: '🏹',
  SUPPORT: '💚',
  FILL: '🎲'
};

export interface PlayerSkillRating {
  odverall: number; // 0-100 overall skill score
  winRate: number; // 0-100
  avgKDA: number;
  avgCSPerMin: number;
  avgDamage: number;
  avgVisionScore: number;
  gamesPlayed: number;
}

// Tracked player (someone we can bet on)
export interface TrackedPlayer {
  id: string;
  gameName: string;
  tagLine: string;
  puuid: string | null;
  region: string;
  displayName: string; // e.g., "Johnny", "Rausteen"
  isActive: boolean;
  createdAt?: string;
  userId?: string | null; // Linked Supabase user ID (prevents self-betting)
  primaryRole?: PlayerRole | null; // Preferred primary role
  secondaryRole?: PlayerRole | null; // Preferred secondary role
}

// Team Balancer - Player with calculated skill rating
export interface PlayerWithSkill extends TrackedPlayer {
  skillRating: PlayerSkillRating;
}

// Team Balancer - Balanced team result
export interface BalancedTeam {
  players: Array<{
    player: PlayerWithSkill;
    assignedRole: PlayerRole;
  }>;
  totalSkill: number;
}

export interface BalancedTeamsResult {
  team1: BalancedTeam;
  team2: BalancedTeam;
  skillDifference: number;
}

export enum BetStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST',
  REFUNDED = 'REFUNDED' // Remake logic
}

export interface Prop {
  id: string;
  title: string;
  description: string;
  odds: number;
  category: 'KDA' | 'GAMEPLAY' | 'TOXICITY' | 'EARLY' | 'LATE';
  maxGameTime?: number; // Max game time in minutes when this prop is available
}

export interface Bet {
  id: string;
  propId: string;
  propTitle: string;
  amount: number;
  odds: number;
  potentialPayout: number;
  status: BetStatus;
  matchId: string;
  timestamp: number;
  comboId?: string; // If part of a combo, all bets share this ID
  comboIndex?: number; // Position in combo (1/3, 2/3, etc.)
  comboTotal?: number; // Total bets in combo
  userId?: string; // Owner of this bet
  championName?: string; // Champion for this game
  resolvedStat?: string; // Actual stat that resolved the bet (e.g., "7 morts", "KDA: 0.4")
  playerPuuid?: string; // Which tracked player this bet is on
  playerName?: string; // Display name of the player (e.g., "Johnny", "Rausteen")
}

export interface MatchStats {
  champion: string;
  kda: string;
  cs: number;
  duration: string;
  result: 'VICTORY' | 'DEFEAT' | 'REMAKE';
  funFact: string;
}

export interface MatchHistoryItem {
  id: string;
  date: string;
  stats: MatchStats;
  description: string;
}

export interface GameState {
  status: MatchStatus;
  currentChampion: string;
  gameTime: number; // in seconds
  matchId: string;
}

export interface ComboBet {
  id: string;
  props: { propId: string; propTitle: string; odds: number }[];
  amount: number;
  totalOdds: number;
  potentialPayout: number;
  status: BetStatus;
  matchId: string;
  timestamp: number;
}