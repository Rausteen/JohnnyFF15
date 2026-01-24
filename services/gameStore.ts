import { create } from 'zustand';
import { riotApi, CurrentGameInfo, MatchDto, MatchParticipant, Region } from './riotApi';
import { supabase } from './supabase';

export interface JohnnyConfig {
  gameName: string;
  tagLine: string;
  puuid: string | null;
  region: Region;
}

export interface GameState {
  // Johnny's config
  johnny: JohnnyConfig;

  // Current game status
  isInGame: boolean;
  currentGame: CurrentGameInfo | null;
  gameStartTime: number | null;

  // Last match data
  lastMatch: MatchDto | null;
  lastMatchStats: MatchParticipant | null;

  // Polling
  isPolling: boolean;
  pollInterval: number | null;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  setJohnnyConfig: (gameName: string, tagLine: string, region: Region) => Promise<boolean>;
  loadJohnnyConfig: () => Promise<void>;
  checkGameStatus: () => Promise<void>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
  fetchLastMatch: () => Promise<void>;
  clearError: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  johnny: {
    gameName: '',
    tagLine: '',
    puuid: null,
    region: 'EUW'
  },
  isInGame: false,
  currentGame: null,
  gameStartTime: null,
  lastMatch: null,
  lastMatchStats: null,
  isPolling: false,
  pollInterval: null,
  loading: false,
  error: null,

  setJohnnyConfig: async (gameName, tagLine, region) => {
    set({ loading: true, error: null });

    try {
      riotApi.setRegion(region);

      // Get PUUID from Riot API
      const account = await riotApi.getAccountByRiotId(gameName, tagLine);

      if (!account) {
        set({ error: 'Joueur non trouvé. Vérifie le Riot ID.', loading: false });
        return false;
      }

      // Save to Supabase (in a settings table or similar)
      const config = {
        gameName: account.gameName,
        tagLine: account.tagLine,
        puuid: account.puuid,
        region
      };

      // Store in localStorage for now (could be moved to Supabase)
      localStorage.setItem('johnny_config', JSON.stringify(config));

      set({
        johnny: config,
        loading: false
      });

      return true;
    } catch (error: any) {
      set({ error: error.message || 'Erreur de configuration', loading: false });
      return false;
    }
  },

  loadJohnnyConfig: async () => {
    // Load from localStorage
    const saved = localStorage.getItem('johnny_config');
    if (saved) {
      try {
        const config = JSON.parse(saved) as JohnnyConfig;
        riotApi.setRegion(config.region);
        set({ johnny: config });
      } catch (e) {
        console.error('Failed to load johnny config:', e);
      }
    }
  },

  checkGameStatus: async () => {
    const { johnny } = get();

    if (!johnny.puuid) {
      set({ error: 'Johnny non configuré' });
      return;
    }

    try {
      const currentGame = await riotApi.getCurrentGame(johnny.puuid);

      if (currentGame) {
        // Johnny is in game!
        set({
          isInGame: true,
          currentGame,
          gameStartTime: currentGame.gameStartTime,
          error: null
        });
      } else {
        // Not in game
        const wasInGame = get().isInGame;

        set({
          isInGame: false,
          currentGame: null,
          gameStartTime: null
        });

        // If was in game and now isn't, fetch the last match
        if (wasInGame) {
          get().fetchLastMatch();
        }
      }
    } catch (error: any) {
      console.error('Error checking game status:', error);
    }
  },

  startPolling: (intervalMs = 30000) => {
    const { isPolling, johnny } = get();

    if (isPolling || !johnny.puuid) return;

    // Initial check
    get().checkGameStatus();

    // Start polling
    const interval = window.setInterval(() => {
      get().checkGameStatus();
    }, intervalMs);

    set({ isPolling: true, pollInterval: interval as unknown as number });
  },

  stopPolling: () => {
    const { pollInterval } = get();

    if (pollInterval) {
      clearInterval(pollInterval);
    }

    set({ isPolling: false, pollInterval: null });
  },

  fetchLastMatch: async () => {
    const { johnny } = get();

    if (!johnny.puuid) return;

    set({ loading: true });

    try {
      const lastMatch = await riotApi.getLastMatch(johnny.puuid);

      if (lastMatch) {
        const stats = riotApi.getPlayerStatsFromMatch(lastMatch, johnny.puuid);
        set({ lastMatch, lastMatchStats: stats, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error: any) {
      console.error('Error fetching last match:', error);
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null })
}));
