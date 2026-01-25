import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bet, BetStatus, GameState, MatchStatus, MatchHistoryItem } from '../types';
import { MOCK_HISTORY } from './mockData';
import { saveBetToSupabase, deleteBetFromSupabase, updateBetStatus } from './betsService';

interface StoreState {
  balance: number;
  gameState: GameState;
  history: MatchHistoryItem[];

  // Actions
  addFunds: (amount: number) => void;

  // Bet actions (Supabase only - no local storage)
  placeBet: (propId: string, propTitle: string, odds: number, amount: number, matchId?: string, comboInfo?: { comboId: string; comboIndex: number; comboTotal: number }, userId?: string, championName?: string) => Promise<Bet | null>;
  cancelBet: (betId: string, betAmount: number, betTimestamp: number) => Promise<boolean>;

  // Admin Actions
  toggleMatchStatus: (status: MatchStatus) => void;
  simulateGameEnd: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      balance: 1000, // Starting balance ("Crédits de la mauvaise foi")
      gameState: {
        status: MatchStatus.OFFLINE,
        currentChampion: 'Yasuo',
        gameTime: 0,
        matchId: 'm_init'
      },
      history: MOCK_HISTORY,

      addFunds: (amount) => set((state) => ({ balance: state.balance + amount })),

      // Place bet - saves directly to Supabase (no local storage)
      placeBet: async (propId, propTitle, odds, amount, matchId, comboInfo, userId, championName) => {
        const { gameState } = get();

        const newBet: Bet = {
          id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          propId,
          propTitle,
          amount,
          odds,
          potentialPayout: Math.floor(amount * odds),
          status: BetStatus.PENDING,
          matchId: matchId || gameState.matchId,
          timestamp: Date.now(),
          userId,
          championName,
          ...(comboInfo && {
            comboId: comboInfo.comboId,
            comboIndex: comboInfo.comboIndex,
            comboTotal: comboInfo.comboTotal
          })
        };

        // Save to Supabase
        const success = await saveBetToSupabase(newBet);
        if (!success) {
          console.error('Failed to save bet to Supabase');
          return null;
        }

        return newBet;
      },

      // Cancel bet - deletes from Supabase (no local storage)
      cancelBet: async (betId, betAmount, betTimestamp) => {
        // Can only cancel within 1 minute of placing the bet
        const oneMinuteAgo = Date.now() - 60 * 1000;
        if (betTimestamp < oneMinuteAgo) {
          console.warn('Cannot cancel bet - time limit exceeded');
          return false;
        }

        // Delete from Supabase
        const success = await deleteBetFromSupabase(betId);
        if (!success) {
          console.error('Failed to delete bet from Supabase');
          return false;
        }

        return true;
      },

      toggleMatchStatus: (status) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            status,
            matchId: status === MatchStatus.LIVE ? `m_${Date.now()}` : state.gameState.matchId
          }
        }));
      },

      simulateGameEnd: () => {
        const { gameState, history } = get();

        // Add to history (simulation mode)
        const newHistoryItem: MatchHistoryItem = {
          id: gameState.matchId,
          date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          description: "Simulation chaotique par l'Admin",
          stats: {
            champion: gameState.currentChampion,
            kda: `${Math.floor(Math.random() * 10)}/${Math.floor(Math.random() * 15)}/${Math.floor(Math.random() * 10)}`,
            cs: Math.floor(Math.random() * 200),
            duration: '25:00',
            result: Math.random() > 0.5 ? 'DEFEAT' : 'VICTORY',
            funFact: "La game a été truquée."
          }
        };

        set((state) => ({
          gameState: { ...state.gameState, status: MatchStatus.FINISHED },
          history: [newHistoryItem, ...state.history]
        }));
      }
    }),
    {
      name: 'johnny-ff15-storage',
      // Only persist gameState and history, NOT bets
      partialize: (state) => ({
        gameState: state.gameState,
        history: state.history
      })
    }
  )
);
