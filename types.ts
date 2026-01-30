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

// Rank Types
export type RankTier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER';
export type RankDivision = 'I' | 'II' | 'III' | 'IV';

export const RANK_TIERS: RankTier[] = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];

export const RANK_LABELS: Record<RankTier, string> = {
  IRON: 'Fer',
  BRONZE: 'Bronze',
  SILVER: 'Argent',
  GOLD: 'Or',
  PLATINUM: 'Platine',
  EMERALD: 'Emeraude',
  DIAMOND: 'Diamant',
  MASTER: 'Master',
  GRANDMASTER: 'GrandMaster',
  CHALLENGER: 'Challenger'
};

export const RANK_COLORS: Record<RankTier, string> = {
  IRON: 'text-zinc-400',
  BRONZE: 'text-amber-700',
  SILVER: 'text-zinc-300',
  GOLD: 'text-yellow-500',
  PLATINUM: 'text-cyan-400',
  EMERALD: 'text-emerald-400',
  DIAMOND: 'text-blue-400',
  MASTER: 'text-purple-400',
  GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-yellow-300'
};

// Points de skill par rang (pour le calcul du rating)
export const RANK_SKILL_POINTS: Record<RankTier, number> = {
  IRON: 10,
  BRONZE: 20,
  SILVER: 35,
  GOLD: 50,
  PLATINUM: 62,
  EMERALD: 72,
  DIAMOND: 82,
  MASTER: 90,
  GRANDMASTER: 95,
  CHALLENGER: 100
};

// Points bonus par division (IV=0, III=1, II=2, I=3)
export const DIVISION_BONUS: Record<RankDivision, number> = {
  IV: 0,
  III: 2,
  II: 4,
  I: 6
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
  // Rank Solo/Duo
  soloTier?: RankTier | null;
  soloDivision?: RankDivision | null;
  soloLp?: number | null;
  rankUpdatedAt?: string | null;
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