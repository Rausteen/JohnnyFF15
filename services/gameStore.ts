import { create } from 'zustand';
import { riotApi, CurrentGameInfo, MatchDto, MatchParticipant, Region, getQueueName, getChampionName } from './riotApi';
import { supabase } from './supabase';
import { useMatchHistoryStore } from './matchHistoryStore';
import { resolveBets } from './betResolutionService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notifyGameStarted, notifyGameEnded } from './discordWebhook';
import { TrackedPlayer } from '../types';
import { getActiveTrackedPlayers, updateTrackedPlayer } from './playersService';

// Generate a unique browser ID for this session
const BROWSER_ID = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// How long before game status is considered stale (in ms)
const STALE_THRESHOLD = 120000; // 2 minutes - game-watcher updates every 45s, so this should always use cached data

// Track which games we've already sent notifications for (prevents duplicates on refresh)
// Persisted to localStorage to survive page refreshes
const NOTIFIED_GAMES_KEY = 'johnnyff_notified_games';

function getNotifiedGames(): Map<string, string> {
  try {
    const stored = localStorage.getItem(NOTIFIED_GAMES_KEY);
    if (stored) {
      return new Map(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Error reading notified games from localStorage:', e);
  }
  return new Map();
}

function setNotifiedGame(puuid: string, gameId: string): void {
  try {
    const map = getNotifiedGames();
    map.set(puuid, gameId);
    localStorage.setItem(NOTIFIED_GAMES_KEY, JSON.stringify([...map]));
  } catch (e) {
    console.error('Error saving notified game to localStorage:', e);
  }
}

function hasNotifiedGame(puuid: string, gameId: string): boolean {
  const map = getNotifiedGames();
  return map.get(puuid) === gameId;
}

// Pending notifications to be sent after all player checks complete
// This allows grouping players in the same game into one notification
interface PendingNotification {
  gameId: string;
  riotGameId: number;
  gameMode: string;
  playerName: string;
  championName?: string;
}

let pendingNotifications: PendingNotification[] = [];

function addPendingNotification(notification: PendingNotification): void {
  pendingNotifications.push(notification);
}

function clearPendingNotifications(): void {
  pendingNotifications = [];
}

async function processPendingNotifications(): Promise<void> {
  if (pendingNotifications.length === 0) return;

  // Group notifications by riotGameId (players in the same game)
  const gameGroups = new Map<number, PendingNotification[]>();
  for (const notif of pendingNotifications) {
    const existing = gameGroups.get(notif.riotGameId) || [];
    existing.push(notif);
    gameGroups.set(notif.riotGameId, existing);
  }

  // Send one notification per game (with all player names and champion names)
  for (const [riotGameId, notifications] of gameGroups) {
    const playerNames = notifications.map(n => n.playerName);
    const championNames = notifications.map(n => n.championName).filter(Boolean) as string[];
    const gameMode = notifications[0].gameMode;

    console.log(`Sending grouped notification for game ${riotGameId}: ${playerNames.join(', ')}`);

    notifyGameStarted(riotGameId, gameMode, playerNames, championNames.length > 0 ? championNames : undefined)
      .then(sent => {
        if (sent) console.log('Discord notification sent successfully');
      })
      .catch(err => console.error('Discord notification error:', err));
  }

  clearPendingNotifications();
}

// Player game status from Supabase
interface PlayerGameStatusRow {
  player_id: string;
  is_in_game: boolean;
  game_id: string | null;
  game_data: CurrentGameInfo | null;
  game_start_time: number | null;
  last_check_at: string;
  last_checker_id: string | null;
  updated_at: string;
}

// Per-player game state
export interface PlayerGameState {
  player: TrackedPlayer;
  isInGame: boolean;
  currentGame: CurrentGameInfo | null;
  currentGameId: string | null;
  gameStartTime: number | null;
  lastMatch: MatchDto | null;
  lastMatchStats: MatchParticipant | null;
}

export interface GameState {
  // All tracked players
  trackedPlayers: TrackedPlayer[];

  // Currently selected player (for betting UI)
  selectedPlayer: TrackedPlayer | null;

  // Per-player game states
  playerStates: Map<string, PlayerGameState>; // keyed by puuid

  // Test mode (for betting on historical games)
  testMode: boolean;
  testMatchId: string | null;
  testMatchData: MatchDto | null;
  testPlayer: TrackedPlayer | null;

  // Polling
  isPolling: boolean;
  pollInterval: number | null;

  // Realtime subscriptions (one per player)
  realtimeChannels: Map<string, RealtimeChannel>;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  loadTrackedPlayers: () => Promise<void>;
  selectPlayer: (player: TrackedPlayer | null) => void;
  addTrackedPlayer: (gameName: string, tagLine: string, region: Region, displayName: string) => Promise<boolean>;

  checkGameStatus: (player?: TrackedPlayer) => Promise<void>;
  checkAllPlayersStatus: () => Promise<void>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
  fetchLastMatch: (player: TrackedPlayer) => Promise<void>;
  clearError: () => void;

  // Realtime subscription
  subscribeToAllPlayers: () => void;
  unsubscribeFromAllPlayers: () => void;

  // Test mode actions
  startTestMode: (matchId: string, player: TrackedPlayer) => Promise<boolean>;
  endTestMode: () => Promise<{ won: number; lost: number }>;

  // Getters
  getPlayerState: (puuid: string) => PlayerGameState | undefined;
  getPlayersInGame: () => PlayerGameState[];
  isAnyPlayerInGame: () => boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  trackedPlayers: [],
  selectedPlayer: null,
  playerStates: new Map(),
  testMode: false,
  testMatchId: null,
  testMatchData: null,
  testPlayer: null,
  isPolling: false,
  pollInterval: null,
  realtimeChannels: new Map(),
  loading: false,
  error: null,

  loadTrackedPlayers: async () => {
    set({ loading: true });
    try {
      const players = await getActiveTrackedPlayers();
      const existingStates = get().playerStates;

      // Initialize player states, preserving existing game state
      const playerStates = new Map<string, PlayerGameState>();
      for (const player of players) {
        if (player.puuid) {
          const existingState = existingStates.get(player.puuid);
          if (existingState) {
            // Preserve existing game state, just update player info
            playerStates.set(player.puuid, {
              ...existingState,
              player // Update player info in case it changed
            });
          } else {
            // New player, initialize with default state
            playerStates.set(player.puuid, {
              player,
              isInGame: false,
              currentGame: null,
              currentGameId: null,
              gameStartTime: null,
              lastMatch: null,
              lastMatchStats: null
            });
          }
        }
      }

      // Auto-select first player if none selected
      const currentSelected = get().selectedPlayer;
      const selectedPlayer = currentSelected && players.find(p => p.id === currentSelected.id)
        ? currentSelected
        : players[0] || null;

      set({ trackedPlayers: players, playerStates, selectedPlayer, loading: false });
    } catch (error: any) {
      console.error('Error loading tracked players:', error);
      set({ error: error.message, loading: false });
    }
  },

  selectPlayer: (player) => {
    set({ selectedPlayer: player });
  },

  addTrackedPlayer: async (gameName, tagLine, region, displayName) => {
    set({ loading: true, error: null });

    try {
      // Get PUUID via game-watcher command (no direct API call from frontend)
      const { getPuuid } = await import('./adminCommands');
      const puuidResult = await getPuuid(gameName, tagLine, region);

      if (!puuidResult.success || !puuidResult.puuid) {
        set({ error: puuidResult.message || 'Joueur non trouvé. Vérifie le Riot ID.', loading: false });
        return false;
      }

      // Save to Supabase
      const { error: insertError } = await supabase
        .from('tracked_players')
        .insert({
          game_name: gameName,
          tag_line: tagLine,
          puuid: puuidResult.puuid,
          region: region,
          display_name: displayName,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding player to Supabase:', insertError);
        set({ error: 'Erreur lors de l\'ajout du joueur', loading: false });
        return false;
      }

      // Reload players list
      await get().loadTrackedPlayers();
      set({ loading: false });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Erreur de configuration', loading: false });
      return false;
    }
  },

  subscribeToAllPlayers: () => {
    const { trackedPlayers, realtimeChannels } = get();

    // Subscribe to each player's game status
    for (const player of trackedPlayers) {
      if (!player.puuid || realtimeChannels.has(player.puuid)) continue;

      console.log(`Subscribing to game status for ${player.displayName}...`);

      const channel = supabase
        .channel(`player_status_${player.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'player_game_status',
            filter: `player_id=eq.${player.id}`
          },
          (payload) => {
            const newData = payload.new as PlayerGameStatusRow;
            const { testMode, playerStates } = get();

            if (testMode) return;

            console.log(`Received game status update for ${player.displayName}:`, newData?.is_in_game);

            if (newData && player.puuid) {
              const currentState = playerStates.get(player.puuid);
              const wasInGame = currentState?.isInGame || false;
              const previousGameId = currentState?.currentGameId;

              // Update player state
              const newPlayerStates = new Map(playerStates);
              newPlayerStates.set(player.puuid, {
                player,
                isInGame: newData.is_in_game,
                currentGame: newData.game_data,
                currentGameId: newData.game_id,
                gameStartTime: newData.game_start_time,
                lastMatch: currentState?.lastMatch || null,
                lastMatchStats: currentState?.lastMatchStats || null
              });
              set({ playerStates: newPlayerStates });

              // Handle game end
              if (wasInGame && !newData.is_in_game && previousGameId) {
                console.log(`Game ended for ${player.displayName}! Triggering bet resolution...`);
                handleGameEnd(player, previousGameId);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`Realtime subscription for ${player.displayName}:`, status);
        });

      const newChannels = new Map(get().realtimeChannels);
      newChannels.set(player.puuid, channel);
      set({ realtimeChannels: newChannels });
    }
  },

  unsubscribeFromAllPlayers: () => {
    const { realtimeChannels } = get();

    for (const [puuid, channel] of realtimeChannels) {
      console.log('Unsubscribing from player:', puuid);
      supabase.removeChannel(channel);
    }

    set({ realtimeChannels: new Map() });
  },

  checkGameStatus: async (player?: TrackedPlayer) => {
    const { testMode, selectedPlayer } = get();
    const targetPlayer = player || selectedPlayer;

    if (testMode) {
      console.log('Test mode active, skipping game status check');
      return;
    }

    if (!targetPlayer?.puuid) {
      console.warn('checkGameStatus: No player or PUUID');
      return;
    }

    const puuid = targetPlayer.puuid;

    try {
      // Check Supabase for recent game status
      const { data: statusData } = await supabase
        .from('player_game_status')
        .select('*')
        .eq('player_id', targetPlayer.id)
        .single();

      if (statusData) {
        const lastCheckTime = new Date(statusData.last_check_at).getTime();
        const timeSinceLastCheck = Date.now() - lastCheckTime;

        if (timeSinceLastCheck < STALE_THRESHOLD) {
          console.log(`Using cached status for ${targetPlayer.displayName} (${Math.round(timeSinceLastCheck / 1000)}s old)`);

          // Use functional set to avoid race conditions with parallel updates
          let wasInGame = false;
          let previousGameId: string | null = null;

          set(state => {
            const currentState = state.playerStates.get(puuid);
            wasInGame = currentState?.isInGame || false;
            previousGameId = currentState?.currentGameId || null;

            const newPlayerStates = new Map(state.playerStates);
            newPlayerStates.set(puuid, {
              player: targetPlayer,
              isInGame: statusData.is_in_game,
              currentGame: statusData.game_data,
              currentGameId: statusData.game_id,
              gameStartTime: statusData.game_start_time,
              lastMatch: currentState?.lastMatch || null,
              lastMatchStats: currentState?.lastMatchStats || null
            });
            return { playerStates: newPlayerStates };
          });

          if (wasInGame && !statusData.is_in_game && previousGameId) {
            handleGameEnd(targetPlayer, previousGameId);
          }
          return;
        }
      }

      // Poll Riot API
      console.log(`Checking game status for ${targetPlayer.displayName} (${targetPlayer.gameName}#${targetPlayer.tagLine})`);
      riotApi.setRegion(targetPlayer.region as Region);
      const currentGame = await riotApi.getCurrentGame(puuid);

      if (currentGame) {
        const gameId = `${currentGame.platformId}_${currentGame.gameId}`;
        console.log(`${targetPlayer.displayName} is IN GAME!`, gameId);

        let isNewGame = false;

        // Check localStorage to determine if this is truly a new game
        // This persists across page refreshes and is the source of truth for notifications
        const alreadyNotifiedInLocalStorage = hasNotifiedGame(puuid, gameId);

        // Use functional set to avoid race conditions
        set(state => {
          const currentState = state.playerStates.get(puuid);
          // Only consider it a new game if localStorage doesn't have this game_id
          isNewGame = !alreadyNotifiedInLocalStorage;

          const newPlayerStates = new Map(state.playerStates);
          newPlayerStates.set(puuid, {
            player: targetPlayer,
            isInGame: true,
            currentGame,
            currentGameId: gameId,
            gameStartTime: currentGame.gameStartTime,
            lastMatch: currentState?.lastMatch || null,
            lastMatchStats: currentState?.lastMatchStats || null
          });
          return { playerStates: newPlayerStates };
        });

        await updatePlayerGameStatus(targetPlayer, true, gameId, currentGame, currentGame.gameStartTime);

        // Always mark this game in localStorage to prevent future duplicates
        setNotifiedGame(puuid, gameId);

        if (isNewGame) {
          console.log(`New game detected for ${targetPlayer.displayName}! Adding to pending notifications...`);
          // Find champion from game participants
          const playerParticipant = currentGame.participants.find(p => p.puuid === puuid);
          const championName = playerParticipant ? getChampionName(playerParticipant.championId) : undefined;
          // Add to pending notifications - will be sent grouped after all players are checked
          addPendingNotification({
            gameId,
            riotGameId: currentGame.gameId,
            gameMode: getQueueName(currentGame.gameQueueConfigId),
            playerName: targetPlayer.displayName,
            championName
          });
        }
      } else {
        console.log(`${targetPlayer.displayName} is not in game`);

        let wasInGame = false;
        let previousGameId: string | null = null;

        // Use functional set to avoid race conditions
        set(state => {
          const currentState = state.playerStates.get(puuid);
          wasInGame = currentState?.isInGame || false;
          previousGameId = currentState?.currentGameId || null;

          const newPlayerStates = new Map(state.playerStates);
          newPlayerStates.set(puuid, {
            player: targetPlayer,
            isInGame: false,
            currentGame: null,
            currentGameId: null,
            gameStartTime: null,
            lastMatch: currentState?.lastMatch || null,
            lastMatchStats: currentState?.lastMatchStats || null
          });
          return { playerStates: newPlayerStates };
        });

        await updatePlayerGameStatus(targetPlayer, false, null, null, null);

        if (wasInGame && previousGameId) {
          handleGameEnd(targetPlayer, previousGameId);
        }
      }
    } catch (error: any) {
      console.error(`Error checking game status for ${targetPlayer.displayName}:`, error);
    }
  },

  checkAllPlayersStatus: async () => {
    const { trackedPlayers, testMode } = get();

    if (testMode) return;

    // Clear any pending notifications from previous check
    clearPendingNotifications();

    // Check all players in parallel
    await Promise.all(
      trackedPlayers
        .filter(p => p.puuid && p.isActive)
        .map(player => get().checkGameStatus(player))
    );

    // After all checks complete, send grouped notifications
    // (players in the same game will be grouped together)
    await processPendingNotifications();
  },

  startPolling: (intervalMs = 30000) => {
    const { isPolling, trackedPlayers } = get();

    if (isPolling) {
      console.log('Polling already active');
      return;
    }

    if (trackedPlayers.length === 0) {
      console.warn('Cannot start polling: No tracked players');
      return;
    }

    console.log(`Starting polling every ${intervalMs / 1000}s for ${trackedPlayers.length} players`);

    get().subscribeToAllPlayers();
    get().checkAllPlayersStatus();

    const interval = window.setInterval(() => {
      get().checkAllPlayersStatus();
    }, intervalMs);

    set({ isPolling: true, pollInterval: interval as unknown as number });
    console.log('Polling started successfully');
  },

  stopPolling: () => {
    const { pollInterval } = get();

    if (pollInterval) {
      clearInterval(pollInterval);
    }

    get().unsubscribeFromAllPlayers();
    set({ isPolling: false, pollInterval: null });
  },

  fetchLastMatch: async (player: TrackedPlayer) => {
    if (!player.puuid) return;

    set({ loading: true });

    try {
      riotApi.setRegion(player.region as Region);
      const lastMatch = await riotApi.getLastMatch(player.puuid);

      if (lastMatch) {
        const stats = riotApi.getPlayerStatsFromMatch(lastMatch, player.puuid);

        const { playerStates } = get();
        const currentState = playerStates.get(player.puuid);

        const newPlayerStates = new Map(playerStates);
        newPlayerStates.set(player.puuid, {
          ...currentState!,
          lastMatch,
          lastMatchStats: stats
        });
        set({ playerStates: newPlayerStates, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error: any) {
      console.error('Error fetching last match:', error);
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),

  startTestMode: async (matchId: string, player: TrackedPlayer) => {
    if (!player.puuid) {
      set({ error: 'Joueur non configuré' });
      return false;
    }

    set({ loading: true, error: null });

    try {
      riotApi.setRegion(player.region as Region);
      const matchData = await riotApi.getMatch(matchId);

      if (!matchData) {
        set({ error: 'Impossible de charger cette game', loading: false });
        return false;
      }

      console.log(`Starting test mode with match ${matchId} for ${player.displayName}`);

      // Update player state to be "in game"
      const { playerStates } = get();
      const currentState = playerStates.get(player.puuid);

      const newPlayerStates = new Map(playerStates);
      newPlayerStates.set(player.puuid, {
        ...currentState!,
        isInGame: true,
        gameStartTime: matchData.info.gameStartTimestamp
      });

      set({
        testMode: true,
        testMatchId: matchId,
        testMatchData: matchData,
        testPlayer: player,
        playerStates: newPlayerStates,
        loading: false
      });

      return true;
    } catch (error: any) {
      console.error('Error starting test mode:', error);
      set({ error: error.message, loading: false });
      return false;
    }
  },

  endTestMode: async () => {
    const { testMatchData, testPlayer, playerStates } = get();

    if (!testMatchData || !testPlayer?.puuid) {
      set({ testMode: false, testMatchId: null, testMatchData: null, testPlayer: null });
      return { won: 0, lost: 0 };
    }

    console.log('Ending test mode, resolving bets...');

    try {
      const results = await resolveBets(testMatchData, testPlayer.puuid, testPlayer.displayName);

      const won = results.filter(r => r.won).length;
      const lost = results.filter(r => !r.won).length;

      console.log(`Test mode ended: ${won} won, ${lost} lost`);

      // Reset player state
      const currentState = playerStates.get(testPlayer.puuid);
      const newPlayerStates = new Map(playerStates);
      newPlayerStates.set(testPlayer.puuid, {
        ...currentState!,
        isInGame: false,
        gameStartTime: null
      });

      set({
        testMode: false,
        testMatchId: null,
        testMatchData: null,
        testPlayer: null,
        playerStates: newPlayerStates
      });

      return { won, lost };
    } catch (error: any) {
      console.error('Error ending test mode:', error);

      set({
        testMode: false,
        testMatchId: null,
        testMatchData: null,
        testPlayer: null
      });

      return { won: 0, lost: 0 };
    }
  },

  getPlayerState: (puuid: string) => {
    return get().playerStates.get(puuid);
  },

  getPlayersInGame: () => {
    const { playerStates, testMode, testPlayer } = get();

    if (testMode && testPlayer?.puuid) {
      const state = playerStates.get(testPlayer.puuid);
      return state ? [state] : [];
    }

    return Array.from(playerStates.values()).filter(s => s.isInGame);
  },

  isAnyPlayerInGame: () => {
    const { testMode } = get();
    if (testMode) return true;
    return get().getPlayersInGame().length > 0;
  }
}));

// Helper function to update player game status in Supabase
async function updatePlayerGameStatus(
  player: TrackedPlayer,
  isInGame: boolean,
  gameId: string | null,
  gameData: CurrentGameInfo | null,
  gameStartTime: number | null
) {
  try {
    const { error } = await supabase
      .from('player_game_status')
      .upsert({
        player_id: player.id,
        is_in_game: isInGame,
        game_id: gameId,
        game_data: gameData,
        game_start_time: gameStartTime,
        last_check_at: new Date().toISOString(),
        last_checker_id: BROWSER_ID,
        updated_at: new Date().toISOString()
      }, { onConflict: 'player_id' });

    if (error) {
      console.error('Error updating player game status:', error);
    }
  } catch (e) {
    console.error('Failed to update player game status:', e);
  }
}

// Helper function to handle game end (bet resolution)
function handleGameEnd(player: TrackedPlayer, previousGameId: string) {
  console.log(`Game ended for ${player.displayName}! Previous game ID:`, previousGameId);
  console.log('Waiting for Riot API to process match data (90 seconds)...');

  setTimeout(async () => {
    if (!player.puuid) return;

    console.log(`Fetching last match for ${player.displayName} bet resolution...`);

    riotApi.setRegion(player.region as Region);
    let lastMatch = await riotApi.getLastMatch(player.puuid);
    let retryCount = 0;
    const maxRetries = 4;
    const retryDelays = [30000, 60000, 60000, 60000];

    while (lastMatch && lastMatch.metadata.matchId !== previousGameId && retryCount < maxRetries) {
      console.log(`Match found (${lastMatch.metadata.matchId}) doesn't match expected (${previousGameId})`);
      console.log(`Retrying in ${retryDelays[retryCount] / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryDelays[retryCount]));
      lastMatch = await riotApi.getLastMatch(player.puuid);
      retryCount++;
    }

    if (!lastMatch) {
      console.log('No match found yet, retrying in 30 seconds...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      lastMatch = await riotApi.getLastMatch(player.puuid);
    }

    if (lastMatch) {
      if (lastMatch.metadata.matchId !== previousGameId) {
        console.error(`MATCH ID MISMATCH for ${player.displayName}! Expected: ${previousGameId}, Got: ${lastMatch.metadata.matchId}`);
        console.error('NOT resolving bets to prevent wrong resolution.');
        return;
      }

      const stats = riotApi.getPlayerStatsFromMatch(lastMatch, player.puuid);

      // Update player state
      const { playerStates } = useGameStore.getState();
      const currentState = playerStates.get(player.puuid);
      if (currentState) {
        const newPlayerStates = new Map(playerStates);
        newPlayerStates.set(player.puuid, {
          ...currentState,
          lastMatch,
          lastMatchStats: stats,
          currentGameId: null
        });
        useGameStore.setState({ playerStates: newPlayerStates });
      }

      console.log(`Match verified for ${player.displayName}:`, lastMatch.metadata.matchId);
      console.log(`${player.displayName} stats:`, stats?.kills, '/', stats?.deaths, '/', stats?.assists);

      if (stats) {
        notifyGameEnded(
          stats.win,
          stats.kills,
          stats.deaths,
          stats.assists,
          stats.championName,
          player.displayName,
          lastMatch.metadata.matchId
        ).catch(err => console.error('Discord end notification error:', err));
      }

      console.log(`Resolving pending bets for ${player.displayName}, match:`, previousGameId);
      const results = await resolveBets(lastMatch, player.puuid, player.displayName, previousGameId);
      console.log('Bet resolution complete:', results.length, 'bets resolved');

      if (results.length > 0) {
        const won = results.filter(r => r.won).length;
        const lost = results.length - won;
        console.log(`Results: ${won} won, ${lost} lost`);
      }

      // Save to match history
      console.log('Auto-syncing match to museum...');
      const matchHistoryStore = useMatchHistoryStore.getState();
      await matchHistoryStore.checkForNewMatch();
    } else {
      console.error(`Could not fetch match data for ${player.displayName} after retries`);
    }
  }, 90000);
}
