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
  category: 'KDA' | 'GAMEPLAY' | 'TOXICITY';
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