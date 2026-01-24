import { create } from 'zustand';
import { riotApi, CurrentGameInfo, MatchDto, MatchParticipant, Region } from './riotApi';
import { supabase } from './supabase';
import { useMatchHistoryStore } from './matchHistoryStore';
import { resolveBets } from './betResolutionService';

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

      const config = {
        gameName: account.gameName,
        tagLine: account.tagLine,
        puuid: account.puuid,
        region
      };

      // Save to Supabase
      const riotId = `${account.gameName}#${account.tagLine}`;
      const { error: upsertError } = await supabase
        .from('johnny_config')
        .upsert({
          id: 1,
          riot_id: riotId,
          puuid: account.puuid,
          region: region,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Error saving config to Supabase:', upsertError);
        // Fallback to localStorage
        localStorage.setItem('johnny_config', JSON.stringify(config));
      }

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
    // Try to load from Supabase first
    try {
      const { data, error } = await supabase
        .from('johnny_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data && data.puuid) {
        const [gameName, tagLine] = data.riot_id.split('#');
        const config: JohnnyConfig = {
          gameName: gameName || '',
          tagLine: tagLine || '',
          puuid: data.puuid,
          region: (data.region as Region) || 'EUW'
        };
        riotApi.setRegion(config.region);
        set({ johnny: config });
        return;
      }
    } catch (e) {
      console.warn('Failed to load config from Supabase, trying localStorage');
    }

    // Fallback to localStorage
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
      console.warn('checkGameStatus: Johnny PUUID not configured');
      return;
    }

    try {
      console.log('Checking game status for', johnny.gameName || johnny.puuid);
      const currentGame = await riotApi.getCurrentGame(johnny.puuid);

      if (currentGame) {
        // Johnny is in game!
        console.log('Johnny is IN GAME!', currentGame.gameId);
        set({
          isInGame: true,
          currentGame,
          gameStartTime: currentGame.gameStartTime,
          error: null
        });
      } else {
        console.log('Johnny is not in game');
        // Not in game
        const wasInGame = get().isInGame;

        set({
          isInGame: false,
          currentGame: null,
          gameStartTime: null
        });

        // If was in game and now isn't, fetch the last match, resolve bets and save it
        if (wasInGame) {
          console.log('Game ended, waiting for Riot API to process...');

          // Wait for Riot API to have the match data (usually takes 30-60 seconds)
          setTimeout(async () => {
            const { johnny } = get();
            if (!johnny.puuid) return;

            console.log('Fetching last match for bet resolution...');

            // Fetch the match data
            const lastMatch = await riotApi.getLastMatch(johnny.puuid);
            if (lastMatch) {
              const stats = riotApi.getPlayerStatsFromMatch(lastMatch, johnny.puuid);
              set({ lastMatch, lastMatchStats: stats });

              // Resolve bets based on actual match data
              console.log('Resolving bets...');
              const results = await resolveBets(lastMatch, johnny.puuid);
              console.log('Bet resolution complete:', results);
            }

            // Also save to match history
            const matchHistoryStore = useMatchHistoryStore.getState();
            const newMatch = await matchHistoryStore.checkForNewMatch();
            if (newMatch) {
              console.log('New match saved:', newMatch.id);
            }
          }, 45000); // Wait 45 seconds for Riot API to process the match
        }
      }
    } catch (error: any) {
      console.error('Error checking game status:', error);
    }
  },

  startPolling: (intervalMs = 30000) => {
    const { isPolling, johnny } = get();

    if (isPolling) {
      console.log('Polling already active');
      return;
    }

    if (!johnny.puuid) {
      console.warn('Cannot start polling: PUUID not set');
      return;
    }

    console.log(`Starting polling every ${intervalMs / 1000}s for ${johnny.gameName}#${johnny.tagLine}`);

    // Initial check
    get().checkGameStatus();

    // Start polling
    const interval = window.setInterval(() => {
      get().checkGameStatus();
    }, intervalMs);

    set({ isPolling: true, pollInterval: interval as unknown as number });
    console.log('Polling started successfully');
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
