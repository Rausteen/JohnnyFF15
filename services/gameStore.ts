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
  currentGameId: string | null; // Riot game ID for bet tracking
  gameStartTime: number | null;

  // Last match data
  lastMatch: MatchDto | null;
  lastMatchStats: MatchParticipant | null;

  // Test mode (for betting on historical games)
  testMode: boolean;
  testMatchId: string | null;
  testMatchData: MatchDto | null;

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

  // Test mode actions
  startTestMode: (matchId: string) => Promise<boolean>;
  endTestMode: () => Promise<{ won: number; lost: number }>;
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
  currentGameId: null,
  gameStartTime: null,
  lastMatch: null,
  lastMatchStats: null,
  testMode: false,
  testMatchId: null,
  testMatchData: null,
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
    const { johnny, testMode } = get();

    // Don't check if in test mode
    if (testMode) {
      console.log('Test mode active, skipping game status check');
      return;
    }

    if (!johnny.puuid) {
      console.warn('checkGameStatus: Johnny PUUID not configured');
      return;
    }

    try {
      console.log('Checking game status for', johnny.gameName || johnny.puuid);
      const currentGame = await riotApi.getCurrentGame(johnny.puuid);

      if (currentGame) {
        // Johnny is in game!
        // Create match ID format: PLATFORM_GAMEID (e.g., EUW1_1234567890)
        const gameId = `${currentGame.platformId}_${currentGame.gameId}`;
        console.log('Johnny is IN GAME!', gameId);

        set({
          isInGame: true,
          currentGame,
          currentGameId: gameId,
          gameStartTime: currentGame.gameStartTime,
          error: null
        });
      } else {
        console.log('Johnny is not in game');
        // Not in game
        const wasInGame = get().isInGame;
        const previousGameId = get().currentGameId;

        set({
          isInGame: false,
          currentGame: null,
          gameStartTime: null
          // Keep currentGameId until bets are resolved
        });

        // If was in game and now isn't, fetch the last match, resolve bets and save it
        if (wasInGame && previousGameId) {
          console.log('Game ended! Previous game ID:', previousGameId);
          console.log('Waiting for Riot API to process match data...');

          // Wait for Riot API to have the match data (usually takes 30-60 seconds)
          setTimeout(async () => {
            const { johnny, currentGameId } = get();
            if (!johnny.puuid) return;

            console.log('Fetching last match for bet resolution...');

            // Fetch the match data
            const lastMatch = await riotApi.getLastMatch(johnny.puuid);
            if (lastMatch) {
              const stats = riotApi.getPlayerStatsFromMatch(lastMatch, johnny.puuid);
              set({ lastMatch, lastMatchStats: stats });

              console.log('Match found:', lastMatch.metadata.matchId);

              // Resolve bets based on actual match data
              console.log('Resolving bets for game:', currentGameId);
              const results = await resolveBets(lastMatch, johnny.puuid);
              console.log('Bet resolution complete:', results.length, 'bets resolved');

              // Now clear the game ID
              set({ currentGameId: null });
            }

            // Save to match history (auto-sync)
            console.log('Auto-syncing match to museum...');
            const matchHistoryStore = useMatchHistoryStore.getState();
            const newMatch = await matchHistoryStore.checkForNewMatch();
            if (newMatch) {
              console.log('New match saved to museum:', newMatch.id);
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

  clearError: () => set({ error: null }),

  // Start test mode - simulate a live game using a historical match
  startTestMode: async (matchId: string) => {
    const { johnny } = get();

    if (!johnny.puuid) {
      set({ error: 'Johnny non configuré' });
      return false;
    }

    set({ loading: true, error: null });

    try {
      // Fetch the match data from Riot API
      const matchData = await riotApi.getMatch(matchId);

      if (!matchData) {
        set({ error: 'Impossible de charger cette game', loading: false });
        return false;
      }

      console.log('Starting test mode with match:', matchId);

      // Set test mode active - this makes isInGame true for betting
      set({
        testMode: true,
        testMatchId: matchId,
        testMatchData: matchData,
        isInGame: true, // This enables betting
        gameStartTime: matchData.info.gameStartTimestamp,
        loading: false
      });

      return true;
    } catch (error: any) {
      console.error('Error starting test mode:', error);
      set({ error: error.message, loading: false });
      return false;
    }
  },

  // End test mode - resolve all pending bets based on the test match
  endTestMode: async () => {
    const { testMatchData, johnny } = get();

    if (!testMatchData || !johnny.puuid) {
      set({ testMode: false, testMatchId: null, testMatchData: null, isInGame: false });
      return { won: 0, lost: 0 };
    }

    console.log('Ending test mode, resolving bets...');

    try {
      // Resolve bets using the test match data
      const results = await resolveBets(testMatchData, johnny.puuid);

      const won = results.filter(r => r.won).length;
      const lost = results.filter(r => !r.won).length;

      console.log(`Test mode ended: ${won} won, ${lost} lost`);

      // Reset test mode state
      set({
        testMode: false,
        testMatchId: null,
        testMatchData: null,
        isInGame: false,
        gameStartTime: null
      });

      return { won, lost };
    } catch (error: any) {
      console.error('Error ending test mode:', error);

      // Reset anyway
      set({
        testMode: false,
        testMatchId: null,
        testMatchData: null,
        isInGame: false,
        gameStartTime: null
      });

      return { won: 0, lost: 0 };
    }
  }
}));
