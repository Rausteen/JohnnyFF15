import { create } from 'zustand';
import { supabase } from './supabase';
import { riotApi, MatchDto, getChampionName, getQueueName, Region } from './riotApi';
import { resolveBets } from './betResolutionService';
import { useGameStore } from './gameStore';
import { getActiveTrackedPlayers } from './playersService';

// Type for a saved match in Supabase
export interface JohnnyMatch {
  id: string; // Riot match ID
  puuid: string; // Player's PUUID for this match
  player_name?: string; // Display name of the player
  game_creation: number;
  game_duration: number;
  game_mode: string;
  queue_id: number;
  champion_id: number;
  champion_name: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  vision_score: number;
  gold_earned: number;
  damage_dealt: number;
  win: boolean;
  first_blood_victim: boolean;
  game_ended_surrender: boolean;
  team_kills: number;
  created_at: string;
  // Detailed stats
  double_kills?: number;
  triple_kills?: number;
  quadra_kills?: number;
  penta_kills?: number;
  solo_kills?: number;
  first_blood_kill?: boolean;
  kill_participation?: number; // percentage (e.g. 65.43)
  team_damage_pct?: number; // percentage (e.g. 25.12)
  damage_taken?: number;
  wards_placed?: number;
  wards_killed?: number;
  solo_deaths?: number;
  is_top_damage_team?: boolean;
  is_top_damage_game?: boolean;
}

// Type for Johnny's config from Supabase
export interface JohnnyConfig {
  riot_id: string;
  puuid: string | null;
  region: string;
  last_match_id: string | null;
}

interface MatchHistoryState {
  matches: JohnnyMatch[];
  config: JohnnyConfig | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSync: Date | null;

  // Actions
  loadConfig: () => Promise<void>;
  loadMatches: () => Promise<void>;
  syncMatches: () => Promise<{ newMatches: number }>;
  syncLastGame: () => Promise<{ success: boolean; match?: JohnnyMatch; error?: string }>;
  checkForNewMatch: () => Promise<JohnnyMatch | null>;
  clearAllMatches: () => Promise<boolean>;
}

export const useMatchHistoryStore = create<MatchHistoryState>((set, get) => ({
  matches: [],
  config: null,
  loading: false,
  syncing: false,
  error: null,
  lastSync: null,

  // Load Johnny's config from Supabase
  loadConfig: async () => {
    try {
      const { data, error } = await supabase
        .from('johnny_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;

      let config = data as JohnnyConfig;

      // If we have a riot_id but no puuid, try to fetch it
      if (config.riot_id && !config.puuid) {
        const [gameName, tagLine] = config.riot_id.split('#');
        if (gameName && tagLine) {
          console.log('Fetching PUUID for', config.riot_id);
          riotApi.setRegion((config.region as any) || 'EUW');
          const account = await riotApi.getAccountByRiotId(gameName, tagLine);
          if (account?.puuid) {
            // Save PUUID to Supabase
            await supabase
              .from('johnny_config')
              .update({ puuid: account.puuid })
              .eq('id', 1);
            config = { ...config, puuid: account.puuid };
            console.log('PUUID saved:', account.puuid);
          }
        }
      }

      set({ config });
    } catch (error: any) {
      console.error('Error loading config:', error);
      set({ error: error.message });
    }
  },

  // Load matches from Supabase (all tracked players)
  loadMatches: async () => {
    set({ loading: true, error: null });
    try {
      // Get all tracked player PUUIDs
      const trackedPlayers = await getActiveTrackedPlayers();
      const puuids = trackedPlayers.map(p => p.puuid).filter(Boolean);

      let query = supabase
        .from('johnny_matches')
        .select('*')
        .order('game_creation', { ascending: false });

      // Filter by tracked player PUUIDs if any
      if (puuids.length > 0) {
        query = query.in('puuid', puuids);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ matches: data as JohnnyMatch[], loading: false });
    } catch (error: any) {
      console.error('Error loading matches:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Sync matches via game-watcher command (no direct API calls)
  syncMatches: async () => {
    set({ syncing: true, error: null });

    try {
      // Use game-watcher command to sync matches
      const { syncLastGame } = await import('./adminCommands');
      const result = await syncLastGame();

      // Reload matches from Supabase
      await get().loadMatches();

      set({ syncing: false, lastSync: new Date() });
      return { newMatches: result.matches?.length || 0 };
    } catch (error: any) {
      console.error('Error syncing matches:', error);
      set({ error: error.message, syncing: false });
      return { newMatches: 0 };
    }
  },

  // Force sync only the last game for each player via game-watcher command
  syncLastGame: async () => {
    set({ syncing: true, error: null });

    try {
      // Use game-watcher command to sync matches
      const { syncLastGame: syncLastGameCommand } = await import('./adminCommands');
      const result = await syncLastGameCommand();

      // Reload matches from Supabase
      await get().loadMatches();

      set({ syncing: false, lastSync: new Date() });

      if (!result.success) {
        return { success: false, error: result.message };
      }

      const matches = result.matches as JohnnyMatch[] | undefined;
      return {
        success: true,
        match: matches && matches.length > 0 ? matches[matches.length - 1] : undefined
      };
    } catch (error: any) {
      console.error('Error syncing last game:', error);
      set({ error: error.message, syncing: false });
      return { success: false, error: error.message };
    }
  },

  // ⛔ DISABLED: All Riot API calls and bet resolution are handled by game-watcher script
  // This function now only reloads matches from Supabase
  checkForNewMatch: async (_playerPuuid?: string, _playerName?: string, _playerRegion?: string) => {
    console.log('⛔ checkForNewMatch disabled - game-watcher handles all match fetching and bet resolution');

    // Just reload matches from Supabase to get any new ones added by game-watcher
    await get().loadMatches();

    return null;
  },

  // Clear all matches from Supabase (admin only)
  clearAllMatches: async () => {
    try {
      set({ loading: true, error: null });

      // Delete all matches from Supabase
      const { error } = await supabase
        .from('johnny_matches')
        .delete()
        .neq('id', ''); // This deletes all rows

      if (error) throw error;

      // Reset last_match_id in config
      await supabase
        .from('johnny_config')
        .update({ last_match_id: null })
        .eq('id', 1);

      // Clear local state
      set({ matches: [], loading: false });
      console.log('All matches cleared');
      return true;
    } catch (error: any) {
      console.error('Error clearing matches:', error);
      set({ error: error.message, loading: false });
      return false;
    }
  }
}));

// Helper: Convert Riot API match to our format
function convertMatchToJohnnyMatch(match: MatchDto, puuid: string, playerName?: string): JohnnyMatch | null {
  const johnnyStats = match.info.participants.find(p => p.puuid === puuid);
  if (!johnnyStats) {
    console.warn(`Player (PUUID: ${puuid}) not found in match ${match.metadata.matchId}`);
    return null;
  }

  // Get team kills
  const team = match.info.participants.filter(p => p.teamId === johnnyStats.teamId);
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);

  return {
    id: match.metadata.matchId,
    puuid: puuid, // Store player's PUUID to filter later
    player_name: playerName, // Store player name for display
    game_creation: match.info.gameCreation,
    game_duration: match.info.gameDuration,
    game_mode: match.info.gameMode,
    queue_id: match.info.queueId,
    champion_id: johnnyStats.championId,
    champion_name: johnnyStats.championName || getChampionName(johnnyStats.championId),
    kills: johnnyStats.kills,
    deaths: johnnyStats.deaths,
    assists: johnnyStats.assists,
    cs: johnnyStats.totalMinionsKilled + johnnyStats.neutralMinionsKilled,
    vision_score: johnnyStats.visionScore,
    gold_earned: johnnyStats.goldEarned,
    damage_dealt: johnnyStats.totalDamageDealtToChampions,
    win: johnnyStats.win,
    first_blood_victim: johnnyStats.firstBloodVictim === true,
    game_ended_surrender: johnnyStats.gameEndedInSurrender || johnnyStats.teamEarlySurrendered,
    team_kills: teamKills,
    created_at: new Date().toISOString()
  };
}

// Helper functions for display
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

export function generateFunFact(match: JohnnyMatch): string {
  const kda = (match.kills + match.assists) / Math.max(1, match.deaths);
  const csPerMin = match.cs / (match.game_duration / 60);
  const killParticipation = (match.kills + match.assists) / Math.max(1, match.team_kills) * 100;

  // Collection of fun facts based on stats
  if (match.deaths >= 15) return "A essayé de battre son record de morts.";
  if (match.deaths >= 10 && !match.win) return "Le 0/10 powerspike n'a pas fonctionné cette fois.";
  if (match.kills === 0 && match.deaths >= 5) return "A joué support sans le savoir.";
  if (match.vision_score === 0) return "Les wards, c'est pour les faibles.";
  if (match.vision_score < 5) return "A oublié que les wards existaient.";
  if (csPerMin < 3) return "Les sbires, c'est compliqué.";
  if (csPerMin < 5) return "CS? Connais pas.";
  if (match.first_blood_victim) return "First blood... mais pas dans le bon sens.";
  if (match.game_ended_surrender && match.game_duration < 1200) return "FF15 réussi avec brio.";
  if (killParticipation < 15) return "A regardé ses coéquipiers jouer.";
  if (killParticipation < 25) return "Spectateur premium.";
  if (match.damage_dealt < 5000) return "Présent physiquement, absent mentalement.";
  if (kda >= 3 && match.win) return "Quelqu'un l'a boost ?";
  if (match.win && match.deaths > 8) return "Victoire par chance divine.";
  if (match.win) return "Carry par l'équipe, comme d'habitude.";
  if (match.game_duration > 2400) return "40 min de souffrance pour ses mates.";

  return "Une game de plus au palmarès du throw.";
}
