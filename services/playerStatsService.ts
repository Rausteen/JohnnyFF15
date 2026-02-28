// Service to calculate player skill ratings based on match history
import { supabase } from './supabase';
import { TrackedPlayer, PlayerSkillRating, PlayerWithSkill, RankTier, RankDivision, RANK_SKILL_POINTS, DIVISION_BONUS } from '../types';
import { JohnnyMatch } from './matchHistoryStore';

// ============================================
// WEIGHTS
// ============================================

// With rank: 60% rank, 40% in-game performance
const WEIGHTS_WITH_RANK = {
  rank: 0.60,
  performance: 0.40
};

// Performance sub-weights (sum = 1.0, used for both modes)
const PERF_WEIGHTS = {
  winRate: 0.25,
  kda: 0.15,
  killParticipation: 0.15,
  teamDamagePct: 0.12,
  csPerMin: 0.10,
  soloKills: 0.08,
  soloDeathsPenalty: 0.07, // inverse: more solo deaths = lower score
  damage: 0.05,
  vision: 0.03
};

// ============================================
// NORMALIZATION
// ============================================

const NORMS = {
  kda: { min: 0, max: 6 },
  csPerMin: { min: 0, max: 10 },
  damage: { min: 0, max: 35000 },
  vision: { min: 0, max: 50 },
  killParticipation: { min: 0, max: 100 },  // already percentage
  teamDamagePct: { min: 0, max: 40 },       // top damage ~35-40%
  soloKills: { min: 0, max: 5 },            // per game
  soloDeaths: { min: 0, max: 5 }            // per game (inverse)
};

function normalize(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

// ============================================
// RANK HELPERS
// ============================================

function getRankSkillPoints(tier: RankTier | null, division: RankDivision | null): number | null {
  if (!tier) return null;
  const basePoints = RANK_SKILL_POINTS[tier];
  const divisionBonus = division ? DIVISION_BONUS[division] : 0;
  return basePoints + divisionBonus;
}

// ============================================
// SINGLE PLAYER CALCULATION
// ============================================

export async function calculatePlayerSkillRating(player: TrackedPlayer): Promise<PlayerSkillRating> {
  if (!player.puuid) {
    return getDefaultSkillRating();
  }

  try {
    const { data: matches, error } = await supabase
      .from('johnny_matches')
      .select('*')
      .eq('puuid', player.puuid)
      .order('game_creation', { ascending: false });

    if (error || !matches || matches.length === 0) {
      return getDefaultSkillRating();
    }

    return computeSkillFromMatches(matches as JohnnyMatch[], player.soloTier, player.soloDivision);
  } catch (err) {
    console.error(`Error calculating skill for ${player.displayName}:`, err);
    return getDefaultSkillRating();
  }
}

// ============================================
// BATCH CALCULATION
// ============================================

export async function calculateMultiplePlayerSkillRatings(
  players: TrackedPlayer[]
): Promise<PlayerWithSkill[]> {
  const puuids = players.map(p => p.puuid).filter(Boolean) as string[];

  if (puuids.length === 0) {
    return players.map(p => ({ ...p, skillRating: getDefaultSkillRating() }));
  }

  // Fetch ALL matches for all players (no limit)
  const { data: allMatches, error } = await supabase
    .from('johnny_matches')
    .select('*')
    .in('puuid', puuids)
    .order('game_creation', { ascending: false });

  if (error) {
    console.error('Error fetching matches for skill calculation:', error);
    return players.map(p => ({ ...p, skillRating: getDefaultSkillRating() }));
  }

  // Group matches by player PUUID
  const matchesByPuuid: Record<string, JohnnyMatch[]> = {};
  (allMatches as JohnnyMatch[]).forEach(match => {
    if (!matchesByPuuid[match.puuid]) {
      matchesByPuuid[match.puuid] = [];
    }
    matchesByPuuid[match.puuid].push(match);
  });

  // Calculate skill for each player
  const playersWithSkill: PlayerWithSkill[] = [];
  for (const player of players) {
    const playerMatches = player.puuid ? matchesByPuuid[player.puuid] || [] : [];
    const skillRating = computeSkillFromMatches(playerMatches, player.soloTier, player.soloDivision);
    playersWithSkill.push({ ...player, skillRating });
  }

  return playersWithSkill;
}

// ============================================
// CORE ALGORITHM
// ============================================

function computeSkillFromMatches(
  matches: JohnnyMatch[],
  rankTier?: RankTier | null,
  rankDivision?: RankDivision | null
): PlayerSkillRating {
  const gamesPlayed = matches.length;
  const rankPoints = getRankSkillPoints(rankTier || null, rankDivision || null);
  const hasRank = rankPoints !== null;

  if (gamesPlayed === 0 && !hasRank) {
    return getDefaultSkillRating();
  }

  // Recency weighting: exponential decay
  // Most recent = 1.0, ~50% weight at game #35, minimum 0.15
  let totalWeight = 0;
  let weightedWins = 0;
  let weightedKDA = 0;
  let weightedCSPerMin = 0;
  let weightedDamage = 0;
  let weightedVision = 0;
  let weightedKP = 0;
  let weightedTeamDmgPct = 0;
  let weightedSoloKills = 0;
  let weightedSoloDeaths = 0;

  matches.forEach((match, index) => {
    const weight = Math.max(0.15, Math.pow(0.98, index)); // 2% decay per game
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

    // Kill Participation (use stored value or compute from team_kills)
    if (match.kill_participation != null) {
      weightedKP += match.kill_participation * weight;
    } else if (match.team_kills > 0) {
      const kp = ((match.kills + match.assists) / match.team_kills) * 100;
      weightedKP += kp * weight;
    } else {
      weightedKP += 50 * weight; // default 50% if no data
    }

    // Team Damage %
    if (match.team_damage_pct != null) {
      weightedTeamDmgPct += match.team_damage_pct * weight;
    } else {
      weightedTeamDmgPct += 20 * weight; // default 20% (1/5 of team)
    }

    // Solo Kills
    weightedSoloKills += (match.solo_kills || 0) * weight;

    // Solo Deaths
    weightedSoloDeaths += (match.solo_deaths || 0) * weight;
  });

  // Calculate weighted averages
  const winRate = gamesPlayed > 0 ? (weightedWins / totalWeight) * 100 : 50;
  const avgKDA = gamesPlayed > 0 ? weightedKDA / totalWeight : 2.0;
  const avgCSPerMin = gamesPlayed > 0 ? weightedCSPerMin / totalWeight : 5.0;
  const avgDamage = gamesPlayed > 0 ? weightedDamage / totalWeight : 15000;
  const avgVisionScore = gamesPlayed > 0 ? weightedVision / totalWeight : 15;
  const avgKP = gamesPlayed > 0 ? weightedKP / totalWeight : 50;
  const avgTeamDmgPct = gamesPlayed > 0 ? weightedTeamDmgPct / totalWeight : 20;
  const avgSoloKills = gamesPlayed > 0 ? weightedSoloKills / totalWeight : 0;
  const avgSoloDeaths = gamesPlayed > 0 ? weightedSoloDeaths / totalWeight : 0;

  // Normalize all stats to 0-100
  const nWinRate = winRate; // already 0-100
  const nKDA = normalize(avgKDA, NORMS.kda.min, NORMS.kda.max);
  const nCS = normalize(avgCSPerMin, NORMS.csPerMin.min, NORMS.csPerMin.max);
  const nDamage = normalize(avgDamage, NORMS.damage.min, NORMS.damage.max);
  const nVision = normalize(avgVisionScore, NORMS.vision.min, NORMS.vision.max);
  const nKP = normalize(avgKP, NORMS.killParticipation.min, NORMS.killParticipation.max);
  const nTeamDmg = normalize(avgTeamDmgPct, NORMS.teamDamagePct.min, NORMS.teamDamagePct.max);
  const nSoloKills = normalize(avgSoloKills, NORMS.soloKills.min, NORMS.soloKills.max);
  // Solo deaths: INVERSE — more deaths = lower score
  const nSoloDeathsInv = 100 - normalize(avgSoloDeaths, NORMS.soloDeaths.min, NORMS.soloDeaths.max);

  // Performance score (0-100) from all stats
  const performanceScore =
    nWinRate * PERF_WEIGHTS.winRate +
    nKDA * PERF_WEIGHTS.kda +
    nKP * PERF_WEIGHTS.killParticipation +
    nTeamDmg * PERF_WEIGHTS.teamDamagePct +
    nCS * PERF_WEIGHTS.csPerMin +
    nSoloKills * PERF_WEIGHTS.soloKills +
    nSoloDeathsInv * PERF_WEIGHTS.soloDeathsPenalty +
    nDamage * PERF_WEIGHTS.damage +
    nVision * PERF_WEIGHTS.vision;

  // Confidence factor: with few games, pull toward rank or default (50)
  // Ramps from 0.3 at 1 game to 1.0 at 30+ games
  const confidence = Math.min(1.0, 0.3 + (gamesPlayed / 30) * 0.7);

  let overall: number;

  if (hasRank) {
    // Blend: rank + performance, scaled by confidence
    const statsComponent = performanceScore * confidence + rankPoints! * (1 - confidence);
    overall = Math.round(
      rankPoints! * WEIGHTS_WITH_RANK.rank +
      statsComponent * WEIGHTS_WITH_RANK.performance
    );
  } else {
    // Stats-only, with confidence pulling toward 50
    overall = Math.round(performanceScore * confidence + 50 * (1 - confidence));
  }

  return {
    odverall: Math.min(100, Math.max(0, overall)),
    winRate: Math.round(winRate),
    avgKDA: Math.round(avgKDA * 10) / 10,
    avgCSPerMin: Math.round(avgCSPerMin * 10) / 10,
    avgDamage: Math.round(avgDamage),
    avgVisionScore: Math.round(avgVisionScore * 10) / 10,
    gamesPlayed,
    avgKillParticipation: Math.round(avgKP * 10) / 10,
    avgTeamDamagePct: Math.round(avgTeamDmgPct * 10) / 10,
    avgSoloKills: Math.round(avgSoloKills * 10) / 10,
    avgSoloDeaths: Math.round(avgSoloDeaths * 10) / 10
  };
}

// ============================================
// DEFAULTS & TIERS
// ============================================

function getDefaultSkillRating(): PlayerSkillRating {
  return {
    odverall: 50,
    winRate: 50,
    avgKDA: 2.0,
    avgCSPerMin: 5.0,
    avgDamage: 15000,
    avgVisionScore: 15,
    gamesPlayed: 0,
    avgKillParticipation: 50,
    avgTeamDamagePct: 20,
    avgSoloKills: 0,
    avgSoloDeaths: 0
  };
}

export function getSkillTier(overall: number): { label: string; color: string } {
  if (overall >= 80) return { label: 'S', color: 'text-yellow-400' };
  if (overall >= 65) return { label: 'A', color: 'text-purple-400' };
  if (overall >= 50) return { label: 'B', color: 'text-blue-400' };
  if (overall >= 35) return { label: 'C', color: 'text-green-400' };
  return { label: 'D', color: 'text-zinc-400' };
}
