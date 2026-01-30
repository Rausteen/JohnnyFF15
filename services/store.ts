import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bet, BetStatus, GameState, MatchStatus, MatchHistoryItem } from '../types';
import { MOCK_HISTORY } from './mockData';

interface StoreState {
  balance: number;
  gameState: GameState;
  bets: Bet[];
  history: MatchHistoryItem[];
  isSyncing: boolean;

  // Actions
  addFunds: (amount: number) => void;
  placeBet: (propId: string, propTitle: string, odds: number, amount: number) => void;
  cancelBet: (betId: string) => void;

  // Admin Actions
  toggleMatchStatus: (status: MatchStatus) => void;
  simulateGameEnd: () => void;
  syncGames: () => Promise<void>;
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
      isSyncing: false,

      addFunds: (amount) => set((state) => ({ balance: state.balance + amount })),

      placeBet: (propId, propTitle, odds, amount) => {
        const { balance, gameState } = get();
        if (balance < amount) return;
        if (gameState.status !== MatchStatus.LIVE) return;

        const newBet: Bet = {
          id: `bet_${Date.now()}`,
          propId,
          propTitle,
          amount,
          odds,
          potentialPayout: Math.floor(amount * odds),
          status: BetStatus.PENDING,
          matchId: gameState.matchId,
          timestamp: Date.now(),
        };

        set((state) => ({
          balance: state.balance - amount,
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
      },

      syncGames: async () => {
        set({ isSyncing: true });

        // Liste des joueurs à synchroniser
        const players = ['Johnny'];
        const gamesPerPlayer = 20;

        // Simulation d'un appel API avec délai
        await new Promise(resolve => setTimeout(resolve, 1500));

        const champions = ['Yasuo', 'Yone', 'Zed', 'Vayne', 'Riven', 'Lee Sin', 'Akali', 'Katarina', 'Irelia', 'Fiora'];
        const funFacts = [
          "A blame le jungler 12 fois.",
          "S'est fait dive 3 fois niveau 2.",
          "A ragequit le vocal.",
          "A été honoré par l'équipe adverse.",
          "A flash dans le mur... deux fois.",
          "A écrit 'gg ez' après avoir été 0/8.",
          "Le support a demandé à changer de lane.",
          "A perdu un 1v1 contre un minion.",
        ];

        const newGames: MatchHistoryItem[] = [];

        for (const player of players) {
          for (let i = 0; i < gamesPerPlayer; i++) {
            const kills = Math.floor(Math.random() * 12);
            const deaths = Math.floor(Math.random() * 15) + 1;
            const assists = Math.floor(Math.random() * 15);
            const result = Math.random() > 0.6 ? 'DEFEAT' : (Math.random() > 0.1 ? 'VICTORY' : 'REMAKE');
            const daysAgo = i;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);

            newGames.push({
              id: `m_sync_${player}_${Date.now()}_${i}`,
              date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
              description: `Game ${i + 1} de ${player}`,
              stats: {
                champion: champions[Math.floor(Math.random() * champions.length)],
                kda: `${kills}/${deaths}/${assists}`,
                cs: Math.floor(Math.random() * 200) + 50,
                duration: `${Math.floor(Math.random() * 20) + 15}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                result: result as 'VICTORY' | 'DEFEAT' | 'REMAKE',
                funFact: funFacts[Math.floor(Math.random() * funFacts.length)]
              }
            });
          }
        }

        set((state) => ({
          isSyncing: false,
          history: [...newGames, ...state.history]
        }));
      }
    }),
    {
      name: 'johnny-ff15-storage',
    }
  )
);