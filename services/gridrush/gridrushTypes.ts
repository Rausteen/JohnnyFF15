export type WordDirection = 'across' | 'down';

export interface PlacedWord {
  id: number;
  answer: string;
  acceptedAnswers: string[];
  clue: string;
  row: number;
  col: number;
  direction: WordDirection;
  number: number;
}

export interface MysteryCell {
  row: number;
  col: number;
  mysteryIndex: number;
}

export interface CrosswordGridData {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  rows: number;
  cols: number;
  words: PlacedWord[];
  mysteryCells: MysteryCell[];
  mysteryWord: string;
  mysteryClue: string;
  mysteryHint5: string;
  mysteryHint8: string;
}

export interface GridSet {
  id: string;
  name: string;
  grids: [CrosswordGridData, CrosswordGridData, CrosswordGridData];
  createdBy: string;
  createdAt: string;
}

export type GameStatus = 'lobby' | 'playing' | 'finished';
export type TeamStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  name: string;
  teamId: string;
  isHost: boolean;
}

export interface Team {
  id: string;
  gameId: string;
  name: string;
  players: Player[];
  status: TeamStatus;
  currentGridIndex: number;
  wordsFoundPerGrid: number[][];
  finishedAt?: string;
}

export interface GameSession {
  id: string;
  gameCode: string;
  gridSetId: string;
  hostId: string;
  status: GameStatus;
  teams: Team[];
  startedAt?: string;
  finishedAt?: string;
  winnerTeamId?: string;
  timerDuration: number;
}

export interface ChatMessage {
  id: string;
  teamId: string;
  playerName: string;
  message: string;
  createdAt: string;
}

export interface CellUpdate {
  row: number;
  col: number;
  value: string;
  playerName: string;
  gridIndex: number;
}

export type RealtimeEvent =
  | { type: 'cell_update'; data: CellUpdate }
  | { type: 'word_found'; data: { wordId: number; gridIndex: number; playerName: string } }
  | { type: 'mystery_found'; data: { gridIndex: number; playerName: string } }
  | { type: 'grid_complete'; data: { gridIndex: number; nextGridIndex: number } }
  | { type: 'game_started'; data: { startedAt: string } }
  | { type: 'team_finished'; data: { teamId: string; teamName: string; timeMs: number } }
  | { type: 'game_over'; data: { reason: 'won' | 'timeout'; winnerTeamId?: string; winnerTeamName?: string } }
  | { type: 'chat_message'; data: ChatMessage }
  | { type: 'player_joined'; data: { player: Player; teamId: string } }
  | { type: 'player_left'; data: { playerId: string; teamId: string } };

export interface WordInput {
  answer: string;
  clue: string;
  acceptedAnswers?: string[];
}

export type CellValues = Record<string, string>;
