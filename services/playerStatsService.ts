// Service to calculate player skill ratings based on match history
import { supabase } from './supabase';
import { TrackedPlayer, PlayerSkillRating, PlayerWithSkill } from '../types';
import { JohnnyMatch } from './matchHistoryStore';

// Weights for skill rating calculation
const WEIGHTS = {
  winRate: 0.35,      // 35% - Win rate is important
  kda: 0.25,          // 25% - KDA reflects individual performance
  csPerMin: 0.15,     // 15% - Farm efficiency
  damage: 0.15,       // 15% - Damage contribution
  vision: 0.10        // 10% - Vision game
};

// Normalization constants (based on typical LoL values)
const NORMS = {
  kda: { min: 0, max: 5 },           // KDA typically ranges 0-5+
  csPerMin: { min: 0, max: 10 },     // CS/min typically 0-10
  damage: { min: 0, max: 30000 },    // Damage typically 5k-30k
  vision: { min: 0, max: 50 }        // Vision score typically 0-50
};

// Number of recent matches to consider for skill calculation
const MATCHES_TO_CONSIDER = 20;

/**
 * Calculate skill rating for a single player based on their match history
 */
export async function calculatePlayerSkillRating(player: TrackedPlayer): Promise<PlayerSkillRating> {
  if (!player.puuid) {
    return getDefaultSkillRating();
  }

  try {
    // Fetch recent matches for this player
    const { data: matches, error } = await supabase
      .from('johnny_matches')
      .select('*')
      .eq('puuid', player.puuid)
      .order('game_creation', { ascending: false })
      .limit(MATCHES_TO_CONSIDER);

    if (error || !matches || matches.length === 0) {
      console.log(`No matches found for ${player.displayName}`);
      return getDefaultSkillRating();
    }

    return computeSkillFromMatches(matches as JohnnyMatch[]);
  } catch (err) {
    console.error(`Error calculating skill for ${player.displayName}:`, err);
    return getDefaultSkillRating();
  }
}

/**
 * Calculate skill ratings for multiple players
 */
export async function calculateMultiplePlayerSkillRatings(
  players: TrackedPlayer[]
): Promise<PlayerWithSkill[]> {
  const playersWithSkill: PlayerWithSkill[] = [];

  // Get all PUUIDs
  const puuids = players.map(p => p.puuid).filter(Boolean) as string[];

  if (puuids.length === 0) {
    // No PUUIDs, return default ratings
    return players.map(p => ({
      ...p,
      skillRating: getDefaultSkillRating()
    }));
  }

  // Fetch all matches for all players in one query
  const { data: allMatches, error } = await supabase
    .from('johnny_matches')
    .select('*')
    .in('puuid', puuids)
    .order('game_creation', { ascending: false });

  if (error) {
    console.error('Error fetching matches for skill calculation:', error);
    return players.map(p => ({
      ...p,
      skillRating: getDefaultSkillRating()
    }));
  }

  // Group matches by player PUUID
  const matchesByPuuid: Record<string, JohnnyMatch[]> = {};
  (allMatches as JohnnyMatch[]).forEach(match => {
    if (!matchesByPuuid[match.puuid]) {
      matchesByPuuid[match.puuid] = [];
    }
    // Only keep recent matches
    if (matchesByPuuid[match.puuid].length < MATCHES_TO_CONSIDER) {
      matchesByPuuid[match.puuid].push(match);
    }
  });

  // Calculate skill for each player
  for (const player of players) {
    const playerMatches = player.puuid ? matchesByPuuid[player.puuid] || [] : [];
    const skillRating = playerMatches.length > 0
      ? computeSkillFromMatches(playerMatches)
      : getDefaultSkillRating();

    playersWithSkill.push({
      ...player,
      skillRating
    });
  }

  return playersWithSkill;
}

/**
 * Compute skill rating from a list of matches
 */
function computeSkillFromMatches(matches: JohnnyMatch[]): PlayerSkillRating {
  const gamesPlayed = matches.length;

  if (gamesPlayed === 0) {
    return getDefaultSkillRating();
  }

  // Calculate averages with recency weighting (more recent = higher weight)
  let totalWeight = 0;
  let weightedWins = 0;
  let weightedKDA = 0;
  let weightedCSPerMin = 0;
  let weightedDamage = 0;
  let weightedVision = 0;

  matches.forEach((match, index) => {
    // More recent games have higher weight (linear decay)
    const recencyWeight = 1 - (index * 0.03); // 3% decay per game
    const weight = Math.max(0.4, recencyWeight); // Minimum weight of 0.4
    totalWeight += weight;

    // Win rate
    weightedWins += match.win ? weight : 0;

    // KDA
    const kda = (match.kills + match.assists) / Math.max(1, match.deaths);
    weightedKDA += kda * weight;

    // CS per minute
    const gameDurationMin = match.game_duration / 60;
    const csPerMin = gameDurationMin > 0 ? match.cs / gameDurationMin : 0;
    weightedCSPerMin += csPerMin * weight;

    // Damage
    weightedDamage += match.damage_dealt * weight;

    // Vision score
    weightedVision += match.vision_score * weight;
  });

  // Calculate weighted averages
  const winRate = (weightedWins / totalWeight) * 100;
  const avgKDA = weightedKDA / totalWeight;
  const avgCSPerMin = weightedCSPerMin / totalWeight;
  const avgDamage = weightedDamage / totalWeight;
  const avgVisionScore = weightedVision / totalWeight;

  // Normalize each stat to 0-100 scale
  const normalizedWinRate = winRate; // Already 0-100
  const normalizedKDA = normalize(avgKDA, NORMS.kda.min, NORMS.kda.max);
  const normalizedCS = normalize(avgCSPerMin, NORMS.csPerMin.min, NORMS.csPerMin.max);
  const normalizedDamage = normalize(avgDamage, NORMS.damage.min, NORMS.damage.max);
  const normalizedVision = normalize(avgVisionScore, NORMS.vision.min, NORMS.vision.max);

  // Calculate overall skill rating
  const overall = Math.round(
    normalizedWinRate * WEIGHTS.winRate +
    normalizedKDA * WEIGHTS.kda +
    normalizedCS * WEIGHTS.csPerMin +
    normalizedDamage * WEIGHTS.damage +
    normalizedVision * WEIGHTS.vision
  );

  return {
    odverall: Math.min(100, Math.max(0, overall)),
    winRate: Math.round(winRate),
    avgKDA: Math.round(avgKDA * 10) / 10,
    avgCSPerMin: Math.round(avgCSPerMin * 10) / 10,
    avgDamage: Math.round(avgDamage),
    avgVisionScore: Math.round(avgVisionScore * 10) / 10,
    gamesPlayed
  };
}

/**
 * Normalize a value to 0-100 scale
 */
function normalize(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

/**
 * Get default skill rating for players with no match history
 */
function getDefaultSkillRating(): PlayerSkillRating {
  return {
    odverall: 50, // Neutral rating
    winRate: 50,
    avgKDA: 2.0,
    avgCSPerMin: 5.0,
    avgDamage: 15000,
    avgVisionScore: 15,
    gamesPlayed: 0
  };
}

/**
 * Get skill tier label based on overall rating
 */
export function getSkillTier(overall: number): { label: string; color: string } {
  if (overall >= 80) return { label: 'S', color: 'text-yellow-400' };
  if (overall >= 65) return { label: 'A', color: 'text-purple-400' };
  if (overall >= 50) return { label: 'B', color: 'text-blue-400' };
  if (overall >= 35) return { label: 'C', color: 'text-green-400' };
  return { label: 'D', color: 'text-zinc-400' };
}
