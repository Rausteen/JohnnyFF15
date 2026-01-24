export enum MatchStatus {
  OFFLINE = 'OFFLINE',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED'
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