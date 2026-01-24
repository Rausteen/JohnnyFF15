import { create } from 'zustand';
import { supabase } from './supabase';
import { riotApi, MatchDto, getChampionName, getQueueName } from './riotApi';

// Type for a saved match in Supabase
export interface JohnnyMatch {
  id: string; // Riot match ID
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
  checkForNewMatch: () => Promise<JohnnyMatch | null>;
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

  // Load matches from Supabase
  loadMatches: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('johnny_matches')
        .select('*')
        .order('game_creation', { ascending: false })
        .limit(50);

      if (error) throw error;
      set({ matches: data as JohnnyMatch[], loading: false });
    } catch (error: any) {
      console.error('Error loading matches:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Sync matches from Riot API to Supabase
  syncMatches: async () => {
    const { config, matches } = get();

    if (!config?.puuid) {
      console.warn('No PUUID configured, cannot sync matches');
      return { newMatches: 0 };
    }

    set({ syncing: true, error: null });

    try {
      // Get existing match IDs to avoid duplicates
      const existingIds = new Set(matches.map(m => m.id));

      // Fetch last 20 matches from Riot API
      const matchIds = await riotApi.getMatchHistory(config.puuid, 20);
      if (!matchIds) {
        throw new Error('Failed to fetch match history from Riot API');
      }

      // Filter out matches we already have
      const newMatchIds = matchIds.filter(id => !existingIds.has(id));

      if (newMatchIds.length === 0) {
        set({ syncing: false, lastSync: new Date() });
        return { newMatches: 0 };
      }

      // Fetch details for each new match
      const newMatches: JohnnyMatch[] = [];
      for (const matchId of newMatchIds) {
        const match = await riotApi.getMatch(matchId);
        if (!match) continue;

        const johnnyMatch = convertMatchToJohnnyMatch(match, config.puuid);
        if (johnnyMatch) {
          newMatches.push(johnnyMatch);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Save new matches to Supabase
      if (newMatches.length > 0) {
        const { error: insertError } = await supabase
          .from('johnny_matches')
          .upsert(newMatches, { onConflict: 'id' });

        if (insertError) throw insertError;

        // Update last_match_id in config
        if (matchIds.length > 0) {
          await supabase
            .from('johnny_config')
            .update({ last_match_id: matchIds[0] })
            .eq('id', 1);
        }

        // Reload matches from Supabase
        await get().loadMatches();
      }

      set({ syncing: false, lastSync: new Date() });
      return { newMatches: newMatches.length };
    } catch (error: any) {
      console.error('Error syncing matches:', error);
      set({ error: error.message, syncing: false });
      return { newMatches: 0 };
    }
  },

  // Check if there's a new match (call this after game ends)
  checkForNewMatch: async () => {
    const { config, matches } = get();

    if (!config?.puuid) return null;

    try {
      const matchIds = await riotApi.getMatchHistory(config.puuid, 1);
      if (!matchIds || matchIds.length === 0) return null;

      const latestMatchId = matchIds[0];

      // Check if this match is already saved
      const existingIds = new Set(matches.map(m => m.id));
      if (existingIds.has(latestMatchId)) return null;

      // Fetch and save the new match
      const match = await riotApi.getMatch(latestMatchId);
      if (!match) return null;

      const johnnyMatch = convertMatchToJohnnyMatch(match, config.puuid);
      if (!johnnyMatch) return null;

      // Save to Supabase
      const { error } = await supabase
        .from('johnny_matches')
        .upsert([johnnyMatch], { onConflict: 'id' });

      if (error) throw error;

      // Update local state
      set({ matches: [johnnyMatch, ...matches] });

      // Update last_match_id
      await supabase
        .from('johnny_config')
        .update({ last_match_id: latestMatchId })
        .eq('id', 1);

      return johnnyMatch;
    } catch (error) {
      console.error('Error checking for new match:', error);
      return null;
    }
  }
}));

// Helper: Convert Riot API match to our format
function convertMatchToJohnnyMatch(match: MatchDto, puuid: string): JohnnyMatch | null {
  const johnnyStats = match.info.participants.find(p => p.puuid === puuid);
  if (!johnnyStats) return null;

  // Get team kills
  const team = match.info.participants.filter(p => p.teamId === johnnyStats.teamId);
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);

  return {
    id: match.metadata.matchId,
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
    first_blood_victim: johnnyStats.firstBloodKill === false && johnnyStats.deaths > 0 &&
      match.info.participants.some(p => p.firstBloodKill && p.teamId !== johnnyStats.teamId),
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
