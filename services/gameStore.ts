import { create } from 'zustand';
import { CurrentGameInfo, MatchDto, MatchParticipant, getChampionName } from './riotApi';
import { supabase } from './supabase';
import { useMatchHistoryStore } from './matchHistoryStore';
import { resolveBets } from './betResolutionService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notifyGameStarted, notifyGameEnded } from './discordWebhook';
import { TrackedPlayer, PlayerSkillRating } from '../types';
import { getActiveTrackedPlayers, updateTrackedPlayer } from './playersService';
import { calculateMultiplePlayerSkillRatings } from './playerStatsService';
import { notifyGameStart, requestNotificationPermission } from './notificationService';

// Browser ID is no longer used - all status updates come from game-watcher
// const BROWSER_ID = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  // Player skill ratings (for dynamic odds)
  playerSkillRatings: Map<string, PlayerSkillRating>; // keyed by puuid

  // Admin settings
  bettingLimitEnabled: boolean; // 4-minute betting window limit

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
  getPlayerSkillRating: (puuid: string) => PlayerSkillRating | null;

  // Admin settings
  toggleBettingLimit: () => void;
}

// Read betting limit setting from localStorage (default: enabled)
function getBettingLimitEnabled(): boolean {
  try {
    const stored = localStorage.getItem('johnnyff_betting_limit_enabled');
    if (stored !== null) {
      return stored === 'true';
    }
  } catch (e) {
    console.error('Error reading betting limit setting:', e);
  }
  return true; // Default: enabled
}

function setBettingLimitEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('johnnyff_betting_limit_enabled', enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving betting limit setting:', e);
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  trackedPlayers: [],
  selectedPlayer: null,
  playerStates: new Map(),
  playerSkillRatings: new Map(),
  bettingLimitEnabled: getBettingLimitEnabled(),
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

      // Calculate skill ratings for all players (async, doesn't block UI)
      calculateMultiplePlayerSkillRatings(players).then(playersWithSkill => {
        const skillRatings = new Map<string, PlayerSkillRating>();
        for (const p of playersWithSkill) {
          if (p.puuid) {
            skillRatings.set(p.puuid, p.skillRating);
          }
        }
        set({ playerSkillRatings: skillRatings });
        console.log(`Loaded skill ratings for ${skillRatings.size} players`);
      }).catch(err => {
        console.error('Error calculating skill ratings:', err);
      });

      // Auto-subscribe to realtime updates (no polling needed, game-watcher handles checks)
      get().subscribeToAllPlayers();

      // Request notification permission (non-blocking)
      requestNotificationPermission().then(granted => {
        if (granted) console.log('Browser notifications enabled');
      });
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

              // Handle game start - send browser notification
              if (!wasInGame && newData.is_in_game && newData.game_id && !hasNotifiedGame(player.puuid, newData.game_id)) {
                console.log(`Game started for ${player.displayName}! Sending browser notification...`);
                setNotifiedGame(player.puuid, newData.game_id);

                // Get champion name from game data if available
                const championName = newData.game_data?.participants?.find(
                  p => p.puuid === player.puuid
                )?.championId;
                const championNameStr = championName ? getChampionName(championName) : undefined;
                const gameMode = newData.game_data?.gameMode || 'Ranked';

                notifyGameStart(
                  [player.displayName],
                  championNameStr ? [championNameStr] : undefined,
                  gameMode
                );
              }

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
      // ⛔ FRONTEND ONLY READS FROM SUPABASE - NO RIOT API CALLS
      // The game-watcher script handles all Riot API calls and bet resolution
      const { data: statusData } = await supabase
        .from('player_game_status')
        .select('*')
        .eq('player_id', targetPlayer.id)
        .single();

      if (statusData) {
        const lastCheckTime = new Date(statusData.last_check_at).getTime();
        const timeSinceLastCheck = Date.now() - lastCheckTime;

        // Silent - realtime updates will handle changes

        set(state => {
          const currentState = state.playerStates.get(puuid);

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

        // Note: Game end handling (bet resolution) is done by game-watcher script
        // Frontend does NOT handle bet resolution anymore
      } else {
        // No status data yet - player not being monitored by game-watcher
        console.log(`No game-watcher data for ${targetPlayer.displayName} - waiting for script to update`);

        set(state => {
          const currentState = state.playerStates.get(puuid);
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
      }
    } catch (error: any) {
      console.error(`Error reading game status for ${targetPlayer.displayName}:`, error);
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

  startPolling: (_intervalMs = 30000) => {
    const { isPolling, trackedPlayers } = get();

    if (isPolling) {
      console.log('Realtime already active');
      return;
    }

    if (trackedPlayers.length === 0) {
      console.warn('Cannot start realtime: No tracked players');
      return;
    }

    console.log(`Starting realtime subscription for ${trackedPlayers.length} players (no polling)`);

    // Subscribe to realtime updates - game-watcher will push changes
    get().subscribeToAllPlayers();

    // Do one initial check to populate state from existing data
    get().checkAllPlayersStatus();

    // NO polling interval - we rely entirely on realtime updates from game-watcher
    set({ isPolling: true, pollInterval: null });
    console.log('Realtime subscription active');
  },

  stopPolling: () => {
    const { pollInterval } = get();

    if (pollInterval) {
      clearInterval(pollInterval);
    }

    get().unsubscribeFromAllPlayers();
    set({ isPolling: false, pollInterval: null });
  },

  // ⛔ DISABLED: All Riot API calls are handled by game-watcher script
  fetchLastMatch: async (_player: TrackedPlayer) => {
    console.log('⛔ fetchLastMatch disabled - game-watcher handles all match fetching');
    // Do nothing - matches are fetched and saved by game-watcher script
    // Frontend reads from johnny_matches table via Supabase realtime
  },

  clearError: () => set({ error: null }),

  startTestMode: async (matchId: string, player: TrackedPlayer) => {
    if (!player.puuid) {
      set({ error: 'Joueur non configuré' });
      return false;
    }

    set({ loading: true, error: null });

    try {
      // Get match data via admin command (game-watcher handles the Riot API call)
      const { getMatch } = await import('./adminCommands');
      const result = await getMatch(matchId, player.region);

      if (!result.success || !result.matchData) {
        set({ error: result.message || 'Impossible de charger cette game', loading: false });
        return false;
      }

      const matchData = result.matchData as MatchDto;

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
  },

  getPlayerSkillRating: (puuid: string) => {
    return get().playerSkillRatings.get(puuid) || null;
  },

  toggleBettingLimit: () => {
    const current = get().bettingLimitEnabled;
    const newValue = !current;
    setBettingLimitEnabled(newValue);
    set({ bettingLimitEnabled: newValue });
    console.log(`Betting limit ${newValue ? 'enabled' : 'disabled'}`);
  }
}));

// Helper function to update player game status in Supabase
// ⛔ DISABLED: All game status updates now come from game-watcher script only
// This prevents frontend from creating stale/duplicate entries
async function updatePlayerGameStatus(
  _player: TrackedPlayer,
  _isInGame: boolean,
  _gameId: string | null,
  _gameData: CurrentGameInfo | null,
  _gameStartTime: number | null
) {
  // Do nothing - game-watcher handles all status updates
  console.log('⛔ updatePlayerGameStatus disabled - using game-watcher data only');
}

// ⛔ DISABLED: Game end handling is now done by game-watcher script
// The frontend no longer makes any Riot API calls or resolves bets
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleGameEnd(_player: TrackedPlayer, _previousGameId: string) {
  console.log('⛔ handleGameEnd disabled - game-watcher script handles all bet resolution');
  // Do nothing - game-watcher handles:
  // 1. Fetching match data from Riot API
  // 2. Resolving bets
  // 3. Sending Discord notifications
  // 4. Saving match to history
}
