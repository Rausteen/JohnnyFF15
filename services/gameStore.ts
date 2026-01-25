import { create } from 'zustand';
import { riotApi, CurrentGameInfo, MatchDto, MatchParticipant, Region } from './riotApi';
import { supabase } from './supabase';
import { useMatchHistoryStore } from './matchHistoryStore';
import { resolveBets } from './betResolutionService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notifyGameStarted, notifyGameEnded } from './discordWebhook';

// Generate a unique browser ID for this session
const BROWSER_ID = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// How long before game status is considered stale (in ms)
const STALE_THRESHOLD = 25000; // 25 seconds

export interface JohnnyConfig {
  gameName: string;
  tagLine: string;
  puuid: string | null;
  region: Region;
}

interface GameStatusRow {
  id: number;
  is_in_game: boolean;
  game_id: string | null;
  game_data: CurrentGameInfo | null;
  game_start_time: number | null;
  last_check_at: string;
  last_checker_id: string | null;
  updated_at: string;
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

  // Realtime subscription
  realtimeChannel: RealtimeChannel | null;

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

  // Realtime subscription
  subscribeToGameStatus: () => void;
  unsubscribeFromGameStatus: () => void;

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
  realtimeChannel: null,
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

  // Subscribe to realtime game status updates
  subscribeToGameStatus: () => {
    const { realtimeChannel } = get();

    // Already subscribed
    if (realtimeChannel) return;

    console.log('Subscribing to game status updates...');

    const channel = supabase
      .channel('game_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_status',
          filter: 'id=eq.1'
        },
        (payload) => {
          const newData = payload.new as GameStatusRow;
          const { testMode, currentGameId } = get();

          // Don't update if in test mode
          if (testMode) return;

          console.log('Received game status update from Supabase:', newData.is_in_game);

          // Check if game just ended (was in game, now not)
          const wasInGame = get().isInGame;
          const previousGameId = get().currentGameId;

          // Update local state from shared state
          set({
            isInGame: newData.is_in_game,
            currentGame: newData.game_data,
            currentGameId: newData.game_id,
            gameStartTime: newData.game_start_time,
            error: null
          });

          // If game just ended, handle bet resolution
          if (wasInGame && !newData.is_in_game && previousGameId) {
            console.log('Game ended (detected via realtime)! Triggering bet resolution...');
            handleGameEnd(previousGameId);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    set({ realtimeChannel: channel });
  },

  unsubscribeFromGameStatus: () => {
    const { realtimeChannel } = get();

    if (realtimeChannel) {
      console.log('Unsubscribing from game status updates...');
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
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
      // First, check Supabase for recent game status
      const { data: statusData, error: statusError } = await supabase
        .from('game_status')
        .select('*')
        .eq('id', 1)
        .single();

      if (!statusError && statusData) {
        const lastCheckTime = new Date(statusData.last_check_at).getTime();
        const timeSinceLastCheck = Date.now() - lastCheckTime;

        // If data is fresh (another user checked recently), use it
        if (timeSinceLastCheck < STALE_THRESHOLD) {
          console.log(`Using cached game status (${Math.round(timeSinceLastCheck / 1000)}s old, checked by ${statusData.last_checker_id?.slice(0, 15)}...)`);

          // Update local state from shared state
          const { currentGameId: prevGameId, isInGame: wasInGame } = get();

          set({
            isInGame: statusData.is_in_game,
            currentGame: statusData.game_data,
            currentGameId: statusData.game_id,
            gameStartTime: statusData.game_start_time,
            error: null
          });

          // Check if game ended
          if (wasInGame && !statusData.is_in_game && prevGameId) {
            handleGameEnd(prevGameId);
          }

          return; // No API call needed!
        }

        console.log(`Game status is stale (${Math.round(timeSinceLastCheck / 1000)}s old), polling Riot API...`);
      }

      // Data is stale or doesn't exist - poll Riot API
      console.log('Checking game status for', johnny.gameName || johnny.puuid);
      const currentGame = await riotApi.getCurrentGame(johnny.puuid);

      const wasInGame = get().isInGame;
      const previousGameId = get().currentGameId;

      if (currentGame) {
        // Johnny is in game!
        const gameId = `${currentGame.platformId}_${currentGame.gameId}`;
        console.log('Johnny is IN GAME!', gameId);

        // Check if this is a NEW game (wasn't in game before)
        const isNewGame = !wasInGame;

        // Update local state
        set({
          isInGame: true,
          currentGame,
          currentGameId: gameId,
          gameStartTime: currentGame.gameStartTime,
          error: null
        });

        // Update shared state in Supabase
        await updateSharedGameStatus(true, gameId, currentGame, currentGame.gameStartTime);

        // Send Discord notification for NEW games only
        if (isNewGame) {
          console.log('New game detected! Sending Discord notification...');
          notifyGameStarted(currentGame.gameId, currentGame.gameMode || 'Ranked Solo/Duo')
            .then(sent => {
              if (sent) console.log('Discord notification sent successfully');
              else console.log('Discord notification not sent (check webhook URL)');
            })
            .catch(err => console.error('Discord notification error:', err));
        }

      } else {
        console.log('Johnny is not in game');

        // Update local state
        set({
          isInGame: false,
          currentGame: null,
          gameStartTime: null
        });

        // Update shared state in Supabase
        await updateSharedGameStatus(false, null, null, null);

        // If was in game and now isn't, handle game end
        if (wasInGame && previousGameId) {
          handleGameEnd(previousGameId);
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

    // Subscribe to realtime updates
    get().subscribeToGameStatus();

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

    // Unsubscribe from realtime
    get().unsubscribeFromGameStatus();

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

// Helper function to update shared game status in Supabase
async function updateSharedGameStatus(
  isInGame: boolean,
  gameId: string | null,
  gameData: CurrentGameInfo | null,
  gameStartTime: number | null
) {
  try {
    const { error } = await supabase
      .from('game_status')
      .upsert({
        id: 1,
        is_in_game: isInGame,
        game_id: gameId,
        game_data: gameData,
        game_start_time: gameStartTime,
        last_check_at: new Date().toISOString(),
        last_checker_id: BROWSER_ID,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error updating shared game status:', error);
    } else {
      console.log('Shared game status updated');
    }
  } catch (e) {
    console.error('Failed to update shared game status:', e);
  }
}

// Helper function to handle game end (bet resolution)
function handleGameEnd(previousGameId: string) {
  console.log('Game ended! Previous game ID:', previousGameId);
  console.log('Waiting for Riot API to process match data (90 seconds)...');

  // Wait for Riot API to have the match data
  setTimeout(async () => {
    const { johnny } = useGameStore.getState();
    if (!johnny.puuid) return;

    console.log('Fetching last match for bet resolution...');

    // Try to fetch the match data, retry once if not found
    let lastMatch = await riotApi.getLastMatch(johnny.puuid);

    if (!lastMatch) {
      console.log('Match not found yet, retrying in 30 seconds...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      lastMatch = await riotApi.getLastMatch(johnny.puuid);
    }

    if (lastMatch) {
      const stats = riotApi.getPlayerStatsFromMatch(lastMatch, johnny.puuid);
      useGameStore.setState({ lastMatch, lastMatchStats: stats });

      console.log('Match found:', lastMatch.metadata.matchId);
      console.log('Johnny stats:', stats?.kills, '/', stats?.deaths, '/', stats?.assists);

      // Send Discord notification for game end
      if (stats) {
        notifyGameEnded(
          stats.win,
          stats.kills,
          stats.deaths,
          stats.assists,
          stats.championName
        ).catch(err => console.error('Discord end notification error:', err));
      }

      // Resolve bets based on actual match data
      console.log('Resolving all pending bets...');
      const results = await resolveBets(lastMatch, johnny.puuid);
      console.log('Bet resolution complete:', results.length, 'bets resolved');

      if (results.length > 0) {
        const won = results.filter(r => r.won).length;
        const lost = results.length - won;
        console.log(`Results: ${won} won, ${lost} lost`);
      }

      // Now clear the game ID
      useGameStore.setState({ currentGameId: null });

      // Save to match history (auto-sync)
      console.log('Auto-syncing match to museum...');
      const matchHistoryStore = useMatchHistoryStore.getState();
      const newMatch = await matchHistoryStore.checkForNewMatch();
      if (newMatch) {
        console.log('New match saved to museum:', newMatch.id);
      } else {
        console.log('Match not saved to museum (might already exist)');
      }
    } else {
      console.error('Could not fetch match data after retry');
      // Clear game ID anyway to avoid blocking future games
      useGameStore.setState({ currentGameId: null });
    }
  }, 90000); // Wait 90 seconds for Riot API to process the match
}
