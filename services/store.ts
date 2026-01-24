import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bet, BetStatus, GameState, MatchStatus, MatchHistoryItem } from '../types';
import { MOCK_HISTORY } from './mockData';

interface StoreState {
  balance: number;
  gameState: GameState;
  bets: Bet[];
  history: MatchHistoryItem[];

  // Actions
  addFunds: (amount: number) => void;
  placeBet: (propId: string, propTitle: string, odds: number, amount: number, matchId?: string, comboInfo?: { comboId: string; comboIndex: number; comboTotal: number }) => void;
  cancelBet: (betId: string) => void;

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
      bets: [],
      history: MOCK_HISTORY,

      addFunds: (amount) => set((state) => ({ balance: state.balance + amount })),

      placeBet: (propId, propTitle, odds, amount, matchId, comboInfo) => {
        const { balance, gameState } = get();
        if (balance < amount) return;
        // Note: Game status check is now done in PropCard using gameStore.isInGame

        const newBet: Bet = {
          id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          propId,
          propTitle,
          amount,
          odds,
          potentialPayout: Math.floor(amount * odds),
          status: BetStatus.PENDING,
          matchId: matchId || gameState.matchId, // Use provided matchId or fallback
          timestamp: Date.now(),
          ...(comboInfo && {
            comboId: comboInfo.comboId,
            comboIndex: comboInfo.comboIndex,
            comboTotal: comboInfo.comboTotal
          })
        };

        set((state) => ({
          bets: [newBet, ...state.bets],
        }));
      },

      cancelBet: (betId) => {
        const { bets } = get();
        const bet = bets.find((b) => b.id === betId);
        if (!bet || bet.status !== BetStatus.PENDING) return;

        set((state) => ({
          balance: state.balance + bet.amount,
          bets: state.bets.filter((b) => b.id !== betId),
        }));
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
        const { bets, gameState, history } = get();
        
        // Randomly determine result for current pending bets
        const updatedBets = bets.map(bet => {
          if (bet.matchId === gameState.matchId && bet.status === BetStatus.PENDING) {
            // 50% chance to win, pure chaos
            const isWin = Math.random() > 0.5;
            return {
              ...bet,
              status: isWin ? BetStatus.WON : BetStatus.LOST
            };
          }
          return bet;
        });

        // Calculate winnings
        let winnings = 0;
        updatedBets.forEach(bet => {
          if (bet.matchId === gameState.matchId && bet.status === BetStatus.WON) {
            winnings += bet.potentialPayout;
          }
        });

        // Add to history
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
          bets: updatedBets,
          balance: state.balance + winnings,
          history: [newHistoryItem, ...state.history]
        }));
      }
    }),
    {
      name: 'johnny-ff15-storage',
    }
  )
);