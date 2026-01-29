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
        .order('game_creation', { ascending: false })
        .limit(100);

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

  // Sync matches from Riot API to Supabase (for all tracked players)
  syncMatches: async () => {
    set({ syncing: true, error: null });

    try {
      // Get all tracked players
      const trackedPlayers = await getActiveTrackedPlayers();

      if (trackedPlayers.length === 0) {
        console.warn('No tracked players found, cannot sync matches');
        set({ syncing: false });
        return { newMatches: 0 };
      }

      // Get existing match IDs to avoid duplicates
      const { matches } = get();
      const existingIds = new Set(matches.map(m => m.id));

      let totalNewMatches = 0;
      const allNewMatches: JohnnyMatch[] = [];

      // Sync 1 game per player
      for (const player of trackedPlayers) {
        if (!player.puuid) continue;

        console.log(`Syncing matches for ${player.displayName}...`);

        // Set the correct region for this player
        riotApi.setRegion(player.region as Region);

        // Fetch last match from Riot API for this player
        const matchIds = await riotApi.getMatchHistory(player.puuid, 1);
        if (!matchIds) {
          console.warn(`Failed to fetch match history for ${player.displayName}`);
          continue;
        }

        // Filter out matches we already have
        const newMatchIds = matchIds.filter(id => !existingIds.has(id));

        // Fetch details for each new match
        for (const matchId of newMatchIds) {
          const match = await riotApi.getMatch(matchId);
          if (!match) continue;

          const johnnyMatch = convertMatchToJohnnyMatch(match, player.puuid, player.displayName);
          if (johnnyMatch) {
            allNewMatches.push(johnnyMatch);
            existingIds.add(matchId); // Avoid duplicates if same match for multiple players
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        totalNewMatches += newMatchIds.length;
      }

      // Save all new matches to Supabase
      if (allNewMatches.length > 0) {
        const { error: insertError } = await supabase
          .from('johnny_matches')
          .upsert(allNewMatches, { onConflict: 'id' });

        if (insertError) throw insertError;

        // Reload matches from Supabase
        await get().loadMatches();
      }

      set({ syncing: false, lastSync: new Date() });
      return { newMatches: allNewMatches.length };
    } catch (error: any) {
      console.error('Error syncing matches:', error);
      set({ error: error.message, syncing: false });
      return { newMatches: 0 };
    }
  },

  // Force sync only the last game for each player (for admin when auto-sync fails)
  syncLastGame: async () => {
    set({ syncing: true, error: null });

    try {
      // Get all tracked players
      const trackedPlayers = await getActiveTrackedPlayers();

      if (trackedPlayers.length === 0) {
        set({ syncing: false });
        return { success: false, error: 'Aucun joueur configuré' };
      }

      const { matches } = get();
      const existingIds = new Set(matches.map(m => m.id));
      const newMatches: JohnnyMatch[] = [];
      let lastMatch: JohnnyMatch | undefined;

      for (const player of trackedPlayers) {
        if (!player.puuid) continue;

        // Set the correct region for this player
        riotApi.setRegion(player.region as Region);

        // Get just the last match ID
        const matchIds = await riotApi.getMatchHistory(player.puuid, 1);
        if (!matchIds || matchIds.length === 0) {
          console.warn(`No matches found for ${player.displayName}`);
          continue;
        }

        const latestMatchId = matchIds[0];

        // Check if already in museum
        if (existingIds.has(latestMatchId)) {
          console.log(`Match ${latestMatchId} already in museum for ${player.displayName}`);
          continue;
        }

        // Fetch the match details
        const match = await riotApi.getMatch(latestMatchId);
        if (!match) {
          console.warn(`Could not fetch match details for ${player.displayName}`);
          continue;
        }

        const johnnyMatch = convertMatchToJohnnyMatch(match, player.puuid, player.displayName);
        if (!johnnyMatch) {
          console.warn(`Player ${player.displayName} not found in match ${latestMatchId}`);
          continue;
        }

        newMatches.push(johnnyMatch);
        existingIds.add(latestMatchId);
        lastMatch = johnnyMatch;

        // Auto-resolve pending bets for this match
        try {
          console.log(`Auto-resolving pending bets for ${player.displayName}'s match:`, johnnyMatch.id);
          const results = await resolveBets(match, player.puuid, player.displayName);
          if (results.length > 0) {
            const won = results.filter(r => r.won).length;
            const lost = results.length - won;
            console.log(`Auto-resolved ${results.length} bets: ${won} won, ${lost} lost`);
          }
        } catch (resolveError) {
          console.error('Error auto-resolving bets:', resolveError);
        }

        // Small delay between players
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (newMatches.length === 0) {
        set({ syncing: false, lastSync: new Date() });
        return { success: false, error: 'Aucune nouvelle game trouvée' };
      }

      // Save to Supabase
      const { error: insertError } = await supabase
        .from('johnny_matches')
        .upsert(newMatches, { onConflict: 'id' });

      if (insertError) throw insertError;

      // Update local state
      set({
        matches: [...newMatches, ...matches],
        syncing: false,
        lastSync: new Date()
      });

      return { success: true, match: lastMatch };
    } catch (error: any) {
      console.error('Error syncing last game:', error);
      set({ error: error.message, syncing: false });
      return { success: false, error: error.message };
    }
  },

  // Check if there's a new match for a specific player (call this after game ends)
  checkForNewMatch: async (playerPuuid?: string, playerName?: string, playerRegion?: string) => {
    const { matches } = get();

    // If no player specified, check all tracked players
    if (!playerPuuid) {
      const trackedPlayers = await getActiveTrackedPlayers();
      if (trackedPlayers.length === 0) {
        console.warn('checkForNewMatch: No tracked players configured');
        return null;
      }

      let foundMatch: JohnnyMatch | null = null;
      for (const player of trackedPlayers) {
        if (!player.puuid) continue;
        const match = await get().checkForNewMatch(player.puuid, player.displayName, player.region);
        if (match) foundMatch = match;
      }
      return foundMatch;
    }

    try {
      // Set region if provided
      if (playerRegion) {
        riotApi.setRegion(playerRegion as Region);
      }

      const matchIds = await riotApi.getMatchHistory(playerPuuid, 1);
      if (!matchIds || matchIds.length === 0) return null;

      const latestMatchId = matchIds[0];

      // Check if this match is already saved
      const existingIds = new Set(matches.map(m => m.id));
      if (existingIds.has(latestMatchId)) return null;

      // Fetch and save the new match
      const match = await riotApi.getMatch(latestMatchId);
      if (!match) return null;

      const johnnyMatch = convertMatchToJohnnyMatch(match, playerPuuid, playerName);
      if (!johnnyMatch) return null;

      // Save to Supabase
      const { error } = await supabase
        .from('johnny_matches')
        .upsert([johnnyMatch], { onConflict: 'id' });

      if (error) throw error;

      // Update local state
      set({ matches: [johnnyMatch, ...matches] });

      // Auto-resolve pending bets for this match
      try {
        console.log(`Auto-resolving pending bets for ${playerName || 'player'}'s new match:`, johnnyMatch.id);
        const results = await resolveBets(match, playerPuuid, playerName);
        if (results.length > 0) {
          const won = results.filter(r => r.won).length;
          const lost = results.length - won;
          console.log(`Auto-resolved ${results.length} bets: ${won} won, ${lost} lost`);
        }
      } catch (resolveError) {
        console.error('Error auto-resolving bets:', resolveError);
      }

      return johnnyMatch;
    } catch (error) {
      console.error('Error checking for new match:', error);
      return null;
    }
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
