/**
 * Data-Driven Odds Service
 *
 * Calculates odds based on actual player match history.
 * Each player gets personalized odds per queue (SoloQ vs Flex).
 *
 * Formula: odds = (1 / probability) * HOUSE_MARGIN
 * Minimum games required: MIN_GAMES (fallback to static odds otherwise)
 */

import { supabase } from './supabase';
import { Prop } from '../types';

// House margin: 12% edge
const HOUSE_MARGIN = 1.12;

// Minimum games needed to calculate data-driven odds
const MIN_GAMES = 15;

// Odds bounds
const MIN_ODDS = 1.05;
const MAX_ODDS = 15.0;

// Cache: puuid+queueId -> { odds, timestamp }
const oddsCache = new Map<string, { odds: Map<string, number>; timestamp: number; gamesCount: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface MatchRow {
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  vision_score: number;
  gold_earned: number;
  damage_dealt: number;
  win: boolean;
  first_blood_victim: boolean;
  first_blood_kill: boolean;
  game_ended_surrender: boolean;
  team_kills: number;
  game_duration: number;
  double_kills: number;
  triple_kills: number;
  quadra_kills: number;
  penta_kills: number;
  solo_kills: number;
  kill_participation: number;
  team_damage_pct: number;
  damage_taken: number;
  solo_deaths: number;
  is_top_damage_team: boolean;
  is_top_damage_game: boolean;
  queue_id: number;
}

/**
 * Evaluate if a prop would be true for a given match row
 */
function evaluatePropForMatch(propId: string, m: MatchRow): boolean {
  const kda = (m.kills + m.assists) / Math.max(1, m.deaths);
  const csPerMin = m.game_duration > 0 ? m.cs / (m.game_duration / 60) : 0;

  switch (propId) {
    // Outcomes
    case 'out2': return !m.win; // Défaite
    case 'out3': return m.win;  // Victoire

    // Deaths
    case 'early3': return m.deaths >= 5;
    case 'early6': return m.deaths <= 4;
    case 'kda1': return m.deaths >= 10;
    case 'kda2': return m.deaths >= 15;

    // KDA
    case 'kda3': return kda < 0.5;
    case 'kda6': return kda >= 1;
    case 'kda9': return kda >= 2;
    case 'sp2': return kda > 5; // Miracle KDA

    // Kills
    case 'kda4': return m.kills === 0;
    case 'kda5': return m.assists === 0;

    // Multi-kills
    case 'kda7': return m.double_kills > 0;
    case 'kda8': return m.triple_kills > 0;
    case 'sp6': return m.penta_kills > 0;

    // CS
    case 'gp1': return csPerMin < 4;
    case 'gp7': return csPerMin > 9.5;

    // Damage
    case 'gp4': return m.damage_dealt < 8000;

    // KP
    case 'gp6': return m.kill_participation < 25;
    case 'gp9': return m.kill_participation > 70;

    // First Blood
    case 'early1': return m.first_blood_victim;
    case 'early5': return m.first_blood_kill;

    // Surrender
    case 'out1': return m.game_ended_surrender && m.game_duration < 1200; // < 20min

    // Carry (top damage team) - precise boolean from match data
    case 'sp3': return m.is_top_damage_team;

    // Top damage game (10 players) - precise boolean from match data
    case 'gp8': return m.is_top_damage_game;

    // Solo kills
    case 'sk1': return m.solo_kills >= 3;
    case 'sk2': return m.solo_kills >= 5;
    case 'sk3': return m.solo_kills === 0;

    // Solo deaths
    case 'sd1': return m.solo_deaths === 0;
    case 'sd2': return m.solo_deaths >= 3;
    case 'sd3': return m.solo_deaths >= 5;

    default: return false;
  }
}

/**
 * Calculate probability from match history
 * Returns value between 0 and 1
 */
function calculateProbability(matches: MatchRow[], propId: string): number {
  if (matches.length === 0) return 0.5; // Default to 50% if no data

  let trueCount = 0;
  for (const m of matches) {
    if (evaluatePropForMatch(propId, m)) trueCount++;
  }

  return trueCount / matches.length;
}

/**
 * Convert probability to odds with house margin
 */
function probabilityToOdds(probability: number): number {
  if (probability <= 0) return MAX_ODDS;
  if (probability >= 1) return MIN_ODDS;

  const rawOdds = (1 / probability) * HOUSE_MARGIN;
  return Math.max(MIN_ODDS, Math.min(MAX_ODDS, Math.round(rawOdds * 100) / 100));
}

/**
 * Fetch player match history for a specific queue
 */
async function fetchPlayerMatches(puuid: string, queueId: number): Promise<MatchRow[]> {
  const { data, error } = await supabase
    .from('johnny_matches')
    .select('kills, deaths, assists, cs, vision_score, gold_earned, damage_dealt, win, first_blood_victim, first_blood_kill, game_ended_surrender, team_kills, game_duration, double_kills, triple_kills, quadra_kills, penta_kills, solo_kills, kill_participation, team_damage_pct, damage_taken, solo_deaths, is_top_damage_team, is_top_damage_game, queue_id')
    .eq('puuid', puuid)
    .eq('queue_id', queueId)
    .order('game_creation', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('Error fetching player matches:', error.message);
    return [];
  }

  return (data || []) as MatchRow[];
}

/**
 * Get all data-driven odds for a player in a specific queue
 * Returns a Map of propId -> calculated odds
 */
export async function getDataDrivenOdds(
  puuid: string,
  queueId: number,
  props: Prop[]
): Promise<{ odds: Map<string, number>; gamesCount: number; isDataDriven: boolean }> {
  // Check cache
  const cacheKey = `${puuid}_${queueId}`;
  const cached = oddsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { odds: cached.odds, gamesCount: cached.gamesCount, isDataDriven: cached.gamesCount >= MIN_GAMES };
  }

  // Fetch matches
  const matches = await fetchPlayerMatches(puuid, queueId);

  // If not enough games, return empty (will fallback to static odds)
  if (matches.length < MIN_GAMES) {
    const emptyOdds = new Map<string, number>();
    oddsCache.set(cacheKey, { odds: emptyOdds, timestamp: Date.now(), gamesCount: matches.length });
    return { odds: emptyOdds, gamesCount: matches.length, isDataDriven: false };
  }

  // Calculate odds for each prop
  const odds = new Map<string, number>();
  for (const prop of props) {
    const probability = calculateProbability(matches, prop.id);
    odds.set(prop.id, probabilityToOdds(probability));
  }

  // Cache results
  oddsCache.set(cacheKey, { odds, timestamp: Date.now(), gamesCount: matches.length });

  return { odds, gamesCount: matches.length, isDataDriven: true };
}

/**
 * Get a single prop's data-driven odds for a player
 * Falls back to the prop's base odds if not enough data
 */
export async function getDataOddsForProp(
  puuid: string,
  queueId: number,
  prop: Prop,
  allProps: Prop[]
): Promise<{ odds: number; isDataDriven: boolean; gamesCount: number }> {
  const { odds, gamesCount, isDataDriven } = await getDataDrivenOdds(puuid, queueId, allProps);

  if (!isDataDriven || !odds.has(prop.id)) {
    return { odds: prop.odds, isDataDriven: false, gamesCount };
  }

  return { odds: odds.get(prop.id)!, isDataDriven: true, gamesCount };
}

/**
 * Get detailed odds with probabilities for display purposes
 * Returns odds, probability, and hit count for each prop
 */
export async function getDetailedPlayerOdds(
  puuid: string,
  queueId: number,
  props: Prop[]
): Promise<{ details: { propId: string; probability: number; odds: number; hits: number }[]; gamesCount: number }> {
  const matches = await fetchPlayerMatches(puuid, queueId);
  const details = props.map(prop => {
    const hits = matches.filter(m => evaluatePropForMatch(prop.id, m)).length;
    const probability = matches.length > 0 ? hits / matches.length : 0;
    return {
      propId: prop.id,
      probability,
      odds: probabilityToOdds(probability),
      hits
    };
  });
  return { details, gamesCount: matches.length };
}

/**
 * Clear the odds cache (call after new matches are imported)
 */
export function clearOddsCache(): void {
  oddsCache.clear();
}
