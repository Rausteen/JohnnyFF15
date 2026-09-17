/**
 * Standalone Game Watcher Script
 *
 * Run this script to detect games 24/7 without needing users on the site.
 *
 * Usage:
 *   npx ts-node scripts/game-watcher.ts
 *
 * Or compile and run:
 *   npx tsc scripts/game-watcher.ts --outDir dist
 *   node dist/game-watcher.js
 *
 * Environment variables needed (in .env file):
 *   VITE_RIOT_API_KEY - Your Riot API key
 *   VITE_DISCORD_WEBHOOK_URL - Discord webhook URL
 *   VITE_SUPABASE_URL - Supabase URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anon key
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  loadLolAssets,
  getChampionNames,
  getChampionIconUrl,
  getChampionSplashUrl,
  getProfileIconUrl,
  getRankEmblemUrl,
  formatRank,
  formatSpells,
  formatRunes,
  formatRole,
  guessRole,
  formatK,
  formatSigned,
  formatDuration,
  ROLE_LABELS,
  DISCORD_COLORS,
  type Role,
} from './lib/lolAssets';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root
config({ path: resolve(__dirname, '..', '.env') });

// Config from environment (support both VITE_ prefix and without)
const RIOT_API_KEY = process.env.VITE_RIOT_API_KEY || process.env.RIOT_API_KEY || '';
const DISCORD_WEBHOOK_URL = process.env.VITE_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const PREVIEW_MODE = process.argv.includes('--preview'); // npx tsx scripts/game-watcher.ts --preview
const CHECK_INTERVAL = 45000; // 45 seconds
const WEALTH_TAX_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
const RANK_SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const WEALTH_TAX_THRESHOLD = 200000; // 200k JC
const WEALTH_TAX_RATE = 0.05; // 5%

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Track notified games to avoid duplicates
const notifiedGames = new Set<string>();

// Track previous game state for each player (to detect game end)
const previousGameState = new Map<string, { isInGame: boolean; gameId: string | null }>();

// ============================================
// CACHE FOR MATCH DETAILS AND TIMELINE
// ============================================
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Timeline event type for kill events (needed for cache type)
interface TimelineKillEvent {
  type: string;
  timestamp: number;
  killerId: number;
  victimId: number;
  assistingParticipantIds: number[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Condensed timeline data (kills + gold snapshot at 15 min)
interface MatchTimeline {
  participants: Array<{ participantId: number; puuid: string }>;
  killEvents: TimelineKillEvent[];
  goldAt15: Record<number, number>; // participantId -> totalGold at the 15 min frame (empty if game < 15 min)
}

// Data caches
const matchDetailsCache = new Map<string, CacheEntry<unknown>>();
const matchTimelineCache = new Map<string, CacheEntry<MatchTimeline>>();

// In-flight request deduplication (prevents duplicate API calls when multiple players finish same game)
const matchDetailsInFlight = new Map<string, Promise<unknown | null>>();
const matchTimelineInFlight = new Map<string, Promise<MatchTimeline | null>>();

// Clean expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  let detailsCleaned = 0;
  let timelineCleaned = 0;

  for (const [key, value] of matchDetailsCache) {
    if (now - value.timestamp > CACHE_TTL) {
      matchDetailsCache.delete(key);
      detailsCleaned++;
    }
  }

  for (const [key, value] of matchTimelineCache) {
    if (now - value.timestamp > CACHE_TTL) {
      matchTimelineCache.delete(key);
      timelineCleaned++;
    }
  }

  if (detailsCleaned > 0 || timelineCleaned > 0) {
    console.log(`🧹 Cache cleanup: ${detailsCleaned} details, ${timelineCleaned} timelines removed`);
  }
}, 10 * 60 * 1000);

// Command polling interval (5 seconds)
const COMMAND_CHECK_INTERVAL = 5000;

interface AdminCommand {
  id: string;
  command: string;
  params: Record<string, unknown>;
  status: string;
}

// Queue name mapping
const QUEUE_NAMES: Record<number, string> = {
  420: 'Ranked Solo/Duo',
  440: 'Ranked Flex',
  700: 'Clash',
  400: 'Normal Draft',
  430: 'Normal Blind',
  450: 'ARAM',
  900: 'URF',
  1700: 'Arena',
};

// Only allow bets on these queues (Solo/Duo, Flex, and Clash)
const ALLOWED_QUEUE_IDS = [420, 440, 700];

// Champion data from Data Dragon (loaded through scripts/lib/lolAssets)
let CHAMPIONS: Record<number, string> = {}; // ID -> display name (e.g., "Wukong")

// Fetch champions, runes, summoner spells and role rates
async function loadChampionData(): Promise<void> {
  await loadLolAssets();
  CHAMPIONS = getChampionNames();
}

interface TrackedPlayer {
  id: string;
  puuid: string;
  game_name: string;
  tag_line: string;
  region: string;
  display_name: string;
  is_active: boolean;
  solo_tier: string | null;
  solo_division: string | null;
  solo_lp: number | null;
  rank_updated_at: string | null;
}

interface CurrentGameParticipant {
  puuid: string;
  championId: number;
  teamId: number;
  spell1Id?: number;
  spell2Id?: number;
  riotId?: string;
  perks?: {
    perkIds: number[];
    perkStyle: number;
    perkSubStyle: number;
  };
}

interface CurrentGameInfo {
  gameId: number;
  gameStartTime: number;
  gameQueueConfigId: number;
  participants: CurrentGameParticipant[];
}

async function getTrackedPlayers(): Promise<TrackedPlayer[]> {
  const { data, error } = await supabase
    .from('tracked_players')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching tracked players:', error);
    return [];
  }

  return data || [];
}

// Returns:
// - CurrentGameInfo: player is in game
// - null: player is NOT in game (confirmed by 404)
// - undefined: API error, state unknown (don't change previous state)
async function checkCurrentGame(puuid: string, region: string, retries = 2): Promise<CurrentGameInfo | null | undefined> {
  const platformMap: Record<string, string> = {
    EUW: 'euw1',
    EUNE: 'eun1',
    NA: 'na1',
    KR: 'kr',
  };

  const platform = platformMap[region] || 'euw1';
  const url = `https://${platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;

  try {
    const response = await fetch(url, {
      headers: { 'X-Riot-Token': RIOT_API_KEY }
    });

    if (response.status === 404) return null; // Not in game

    // Rate limited - wait and retry
    if (response.status === 429) {
      if (retries > 0) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        console.log(`  ⏳ Rate limited, waiting ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        return checkCurrentGame(puuid, region, retries - 1);
      }
      console.error('Rate limit exceeded, skipping this check');
      return undefined; // Don't assume game ended
    }

    if (!response.ok) {
      console.error(`Riot API error: ${response.status}`);
      return undefined; // Don't assume game ended
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking game:', error);
    return undefined; // Don't assume game ended
  }
}

function getChampionImageUrl(championNameOrId: string | number): string {
  return getChampionIconUrl(championNameOrId);
}

function getPlayerProfileUrl(playerId: string): string {
  const baseUrl = process.env.VITE_SITE_URL || 'https://johnnyff15.fr';
  const cleanBase = baseUrl.replace(/\/$/, '').replace(/#\/.*$/, '');
  return `${cleanBase}/#/players/${playerId}`;
}

function getPlayerLabel(player: TrackedPlayer): string {
  return player.display_name || player.game_name || 'Joueur';
}

async function postDiscordWebhook(payload: Record<string, unknown>, logLabel: string): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    if (PREVIEW_MODE) {
      console.log(`\n===== ${logLabel} =====\n${JSON.stringify(payload, null, 2)}`);
      return true;
    }
    console.log('No Discord webhook configured');
    return false;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'JohnnyFF15 Bot',
        avatar_url: getProfileIconUrl(),
        ...payload,
      }),
    });

    if (!response.ok) {
      console.error(`Discord webhook error (${logLabel}): ${response.status} ${await response.text()}`);
      return false;
    }

    console.log(`✅ Discord notification sent: ${logLabel}`);
    return true;
  } catch (error) {
    console.error(`Discord notification error (${logLabel}):`, error);
    return false;
  }
}

// How often a player has played each role on a champion (from johnny_matches)
async function getPlayerRoleHistory(puuid: string, championId: number): Promise<Partial<Record<Role, number>> | undefined> {
  const { data, error } = await supabase
    .from('johnny_matches')
    .select('team_position')
    .eq('puuid', puuid)
    .eq('champion_id', championId)
    .not('team_position', 'is', null)
    .limit(30);

  if (error || !data?.length) return undefined;

  const history: Partial<Record<Role, number>> = {};
  for (const row of data as Array<{ team_position: string }>) {
    const role = row.team_position as Role;
    if (ROLE_LABELS[role]) history[role] = (history[role] || 0) + 1;
  }
  return history;
}

interface GameStartPlayerInfo {
  player: TrackedPlayer;
  participant: CurrentGameParticipant | undefined;
  championName: string;
  role: Role | null;
}

function formatTeamComposition(game: CurrentGameInfo, highlightPuuids: Set<string>): string {
  const teams = [100, 200].map(teamId => {
    const names = game.participants
      .filter(p => p.teamId === teamId)
      .map(p => {
        const name = CHAMPIONS[p.championId] || `Champion${p.championId}`;
        return highlightPuuids.has(p.puuid) ? `**${name}**` : name;
      });
    return names.length ? names.join(' · ') : '?';
  });
  return `🔵 ${teams[0]}\n🔴 ${teams[1]}`;
}

function describeLoadout(participant: CurrentGameParticipant | undefined, role: Role | null): string[] {
  const lines: string[] = [];
  const roleText = formatRole(role);
  if (roleText) lines.push(roleText);
  const spells = formatSpells(participant?.spell1Id, participant?.spell2Id);
  if (spells) lines.push(spells);
  const runes = formatRunes(participant?.perks?.perkIds, participant?.perks?.perkSubStyle);
  if (runes) lines.push(`🔮 ${runes.keystone}${runes.secondary ? ` + ${runes.secondary}` : ''}`);
  return lines;
}

async function sendDiscordNotification(
  players: TrackedPlayer[],
  gameMode: string,
  game: CurrentGameInfo
): Promise<void> {

  const infos: GameStartPlayerInfo[] = [];
  for (const player of players) {
    const participant = game.participants.find(p => p.puuid === player.puuid);
    const championId = participant?.championId || 0;
    const spellIds = [participant?.spell1Id, participant?.spell2Id].filter((id): id is number => !!id);
    const history = championId ? await getPlayerRoleHistory(player.puuid, championId) : undefined;
    infos.push({
      player,
      participant,
      championName: championId ? (CHAMPIONS[championId] || `Champion${championId}`) : '',
      role: championId ? guessRole(championId, spellIds, history) : null,
    });
  }

  const isMultiple = infos.length > 1;
  const playersUpper = infos.map(i => getPlayerLabel(i.player).toUpperCase()).join(' & ');
  const main = infos[0];
  const mainChampionId = main.participant?.championId || 0;
  const highlight = new Set(players.map(p => p.puuid));

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];
  let description: string;

  if (!isMultiple) {
    const roleText = formatRole(main.role);
    description = `**[${getPlayerLabel(main.player)}](${getPlayerProfileUrl(main.player.id)})** lance une game sur **${main.championName || '?'}**${roleText ? ` en ${roleText}` : ''}.`;

    const spells = formatSpells(main.participant?.spell1Id, main.participant?.spell2Id);
    const runes = formatRunes(main.participant?.perks?.perkIds, main.participant?.perks?.perkSubStyle);
    fields.push({ name: '🎯 Rôle', value: roleText || 'Inconnu', inline: true });
    fields.push({ name: '✨ Sorts', value: spells || 'Inconnus', inline: true });
    fields.push({
      name: '🔮 Runes',
      value: runes ? `${runes.keystone}${runes.secondary ? `\n↳ ${runes.secondary}` : ''}` : 'Inconnues',
      inline: true,
    });
  } else {
    description = `**${infos.map(i => getPlayerLabel(i.player)).join('** et **')}** jouent ensemble !`;
    for (const info of infos) {
      const lines = [`**${info.championName || '?'}**`, ...describeLoadout(info.participant, info.role)];
      fields.push({
        name: `👤 ${getPlayerLabel(info.player)}`,
        value: `${lines.join('\n')}\n[Profil](${getPlayerProfileUrl(info.player.id)})`,
        inline: true,
      });
    }
  }

  fields.push({ name: '⚔️ Les équipes', value: formatTeamComposition(game, highlight), inline: false });

  const rankLine = !isMultiple && main.player.solo_tier
    ? `${gameMode} · ${formatRank(main.player.solo_tier, main.player.solo_division, main.player.solo_lp)}`
    : gameMode;

  const splash = mainChampionId ? getChampionSplashUrl(mainChampionId) : null;

  const payload = {
    content: PREVIEW_MODE ? '🧪 **TEST** — aperçu de la notification de début de game (données fictives)' : '<@&1466416446094442578>',
    embeds: [{
      author: {
        name: rankLine,
        icon_url: !isMultiple ? getRankEmblemUrl(main.player.solo_tier) : getProfileIconUrl(),
      },
      title: isMultiple
        ? `🎮 ${playersUpper} SONT EN GAME ENSEMBLE !`
        : `🎮 ${playersUpper} EST EN GAME !`,
      url: getPlayerProfileUrl(main.player.id),
      description,
      color: DISCORD_COLORS.GREEN,
      fields,
      thumbnail: { url: mainChampionId ? getChampionImageUrl(mainChampionId) : getProfileIconUrl() },
      ...(splash ? { image: { url: splash } } : {}),
      footer: { text: 'JohnnyFF15 · Récap envoyé en fin de game' },
      timestamp: new Date().toISOString(),
    }],
  };

  await postDiscordWebhook(payload, `game start ${game.gameId}`);
}

async function updateGameStatusInSupabase(
  playerId: string,
  isInGame: boolean,
  gameId: string | null,
  gameData: CurrentGameInfo | null
): Promise<void> {
  const { error } = await supabase
    .from('player_game_status')
    .upsert({
      player_id: playerId,
      is_in_game: isInGame,
      game_id: gameId,
      game_data: gameData,
      game_start_time: gameData?.gameStartTime || null,
      last_check_at: new Date().toISOString(),
      last_checker_id: 'game-watcher-script',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'player_id' });

  if (error) {
    console.error('Error updating game status:', error);
  }
}

// ============================================
// ADMIN COMMANDS HANDLING
// ============================================

async function getPendingCommands(): Promise<AdminCommand[]> {
  const { data, error } = await supabase
    .from('admin_commands')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching commands:', error);
    return [];
  }
  return data || [];
}

async function updateCommandStatus(
  commandId: string,
  status: 'running' | 'completed' | 'error',
  result?: unknown
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (result !== undefined) update.result = result;
  if (status === 'completed' || status === 'error') {
    update.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('admin_commands')
    .update(update)
    .eq('id', commandId);

  if (error) {
    console.error('Error updating command status:', error);
  }
}

// Get match history from Riot API
async function getMatchHistory(puuid: string, region: string, count: number = 1): Promise<string[] | null> {
  const routingMap: Record<string, string> = {
    EUW: 'europe',
    EUNE: 'europe',
    NA: 'americas',
    KR: 'asia',
  };

  const routing = routingMap[region] || 'europe';
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;

  try {
    const response = await fetch(url, {
      headers: { 'X-Riot-Token': RIOT_API_KEY }
    });

    if (!response.ok) {
      console.error(`Match history API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching match history:', error);
    return null;
  }
}

// Get match details from Riot API (with cache + in-flight deduplication)
async function getMatchDetails(matchId: string, region: string): Promise<unknown | null> {
  // Check cache first
  const cached = matchDetailsCache.get(matchId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`  📦 Match details from cache: ${matchId}`);
    return cached.data;
  }

  // Check if request is already in-flight (another player from same game)
  const inFlight = matchDetailsInFlight.get(matchId);
  if (inFlight) {
    console.log(`  ⏳ Match details waiting for in-flight request: ${matchId}`);
    return inFlight;
  }

  // Make the API call and store promise for deduplication
  const fetchPromise = (async () => {
    const routingMap: Record<string, string> = {
      EUW: 'europe',
      EUNE: 'europe',
      NA: 'americas',
      KR: 'asia',
    };

    const routing = routingMap[region] || 'europe';
    const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`;

    try {
      const response = await fetch(url, {
        headers: { 'X-Riot-Token': RIOT_API_KEY }
      });

      if (!response.ok) {
        console.error(`Match details API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Store in cache
      matchDetailsCache.set(matchId, {
        data,
        timestamp: Date.now()
      });
      console.log(`  💾 Match details cached: ${matchId}`);

      return data;
    } catch (error) {
      console.error('Error fetching match details:', error);
      return null;
    } finally {
      // Remove from in-flight when done
      matchDetailsInFlight.delete(matchId);
    }
  })();

  // Store in-flight promise for other concurrent requests
  matchDetailsInFlight.set(matchId, fetchPromise);

  return fetchPromise;
}

// Get match timeline from Riot API (with cache + in-flight deduplication)
async function getMatchTimeline(matchId: string, region: string): Promise<MatchTimeline | null> {
  // Check cache first
  const cached = matchTimelineCache.get(matchId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`  📦 Match timeline from cache: ${matchId}`);
    return cached.data;
  }

  // Check if request is already in-flight (another player from same game)
  const inFlight = matchTimelineInFlight.get(matchId);
  if (inFlight) {
    console.log(`  ⏳ Match timeline waiting for in-flight request: ${matchId}`);
    return inFlight;
  }

  // Make the API call and store promise for deduplication
  const fetchPromise = (async () => {
    const routingMap: Record<string, string> = {
      EUW: 'europe',
      EUNE: 'europe',
      NA: 'americas',
      KR: 'asia',
    };

    const routing = routingMap[region] || 'europe';
    const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;

    try {
      const response = await fetch(url, {
        headers: { 'X-Riot-Token': RIOT_API_KEY }
      });

      if (!response.ok) {
        console.error(`Match timeline API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Extract kill events from all frames
      const killEvents: TimelineKillEvent[] = [];
      for (const frame of data.info.frames || []) {
        for (const event of frame.events || []) {
          if (event.type === 'CHAMPION_KILL') {
            killEvents.push({
              type: event.type,
              timestamp: event.timestamp,
              killerId: event.killerId,
              victimId: event.victimId,
              assistingParticipantIds: event.assistingParticipantIds || [],
            });
          }
        }
      }

      // Gold snapshot at 15 min (frames are 1 min apart, index 15 = 15:00)
      const goldAt15: Record<number, number> = {};
      const frame15 = (data.info.frames || [])[15];
      if (frame15?.participantFrames) {
        for (const [pid, pf] of Object.entries(frame15.participantFrames as Record<string, { totalGold?: number }>)) {
          if (typeof pf.totalGold === 'number') goldAt15[parseInt(pid, 10)] = pf.totalGold;
        }
      }

      const result: MatchTimeline = {
        participants: data.info.participants || [],
        killEvents,
        goldAt15,
      };

      // Store in cache
      matchTimelineCache.set(matchId, {
        data: result,
        timestamp: Date.now()
      });
      console.log(`  💾 Match timeline cached: ${matchId}`);

      return result;
    } catch (error) {
      console.error('Error fetching match timeline:', error);
      return null;
    } finally {
      // Remove from in-flight when done
      matchTimelineInFlight.delete(matchId);
    }
  })();

  // Store in-flight promise for other concurrent requests
  matchTimelineInFlight.set(matchId, fetchPromise);

  return fetchPromise;
}

// Count solo deaths for a player from timeline data
function countSoloDeaths(
  timeline: MatchTimeline,
  playerPuuid: string
): number {
  // Find player's participantId
  const participant = timeline.participants.find(p => p.puuid === playerPuuid);
  if (!participant) return 0;

  const participantId = participant.participantId;

  // Count deaths where player is victim and no assists (solo kill)
  return timeline.killEvents.filter(
    event => event.victimId === participantId && event.assistingParticipantIds.length === 0
  ).length;
}

// Check if player was the first blood victim (using timeline data)
// Riot API doesn't return firstBloodVictim in match details, only firstBloodKill
function isFirstBloodVictim(
  timeline: MatchTimeline,
  playerPuuid: string
): boolean {
  const participant = timeline.participants.find(p => p.puuid === playerPuuid);
  if (!participant || timeline.killEvents.length === 0) return false;

  // First CHAMPION_KILL event = first blood
  const firstKill = timeline.killEvents[0];
  return firstKill.victimId === participant.participantId;
}

// Sync last game for all players
async function syncLastGameForAllPlayers(): Promise<{ success: boolean; message: string; matches: unknown[] }> {
  console.log('📥 Syncing last game for all players...');

  const players = await getTrackedPlayers();
  if (players.length === 0) {
    return { success: false, message: 'Aucun joueur configuré', matches: [] };
  }

  // Get existing matches from Supabase (match ID + puuid combo)
  const { data: existingMatches } = await supabase
    .from('johnny_matches')
    .select('id, puuid');
  const existingKeys = new Set((existingMatches || []).map((m: { id: string; puuid: string }) => `${m.id}_${m.puuid}`));

  const newMatches: unknown[] = [];

  for (const player of players) {
    if (!player.puuid) continue;

    const matchIds = await getMatchHistory(player.puuid, player.region, 20);
    if (!matchIds || matchIds.length === 0) {
      console.log(`  ⚠️ No matches found for ${player.display_name}`);
      continue;
    }

    console.log(`  📋 Found ${matchIds.length} matches for ${player.display_name}`);

    for (const matchId of matchIds) {
      const matchKey = `${matchId}_${player.puuid}`;

      if (existingKeys.has(matchKey)) {
        continue;
      }

      const matchData = await getMatchDetails(matchId, player.region) as MatchData | null;

      if (!matchData) {
        console.log(`  ⚠️ Could not fetch match for ${player.display_name}`);
        continue;
      }

      const playerStats = matchData.info.participants.find((p: { puuid: string }) => p.puuid === player.puuid);
      if (!playerStats) continue;

      const team = matchData.info.participants.filter((p: { teamId: number }) => p.teamId === playerStats.teamId);
      const teamKills = team.reduce((sum: number, p: { kills: number }) => sum + p.kills, 0);

      const johnnyMatch = buildJohnnyMatch(matchData, playerStats, player.puuid, player.display_name, teamKills);

      // Use insert instead of upsert to allow same match_id for different players
      const error = await insertJohnnyMatch(johnnyMatch);

      if (error) {
        // If duplicate key error, it means match already exists for this player
        if (error.code === '23505') {
          console.log(`  ✓ Match already exists for ${player.display_name}`);
        } else {
          console.error(`  ❌ Error saving match for ${player.display_name}:`, error);
        }
      } else {
        console.log(`  ✅ Synced match for ${player.display_name}: ${playerStats.kills}/${playerStats.deaths}/${playerStats.assists}`);
        newMatches.push(johnnyMatch);
        existingKeys.add(matchKey);
      }

      // Small delay between API calls
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (newMatches.length === 0) {
    return { success: true, message: 'Aucune nouvelle game trouvée', matches: [] };
  }

  return {
    success: true,
    message: `${newMatches.length} game(s) synchronisée(s)`,
    matches: newMatches
  };
}

// Get PUUID from Riot ID
async function getPuuidFromRiotId(
  gameName: string,
  tagLine: string,
  region: string
): Promise<{ success: boolean; puuid?: string; message: string }> {
  const routingMap: Record<string, string> = {
    EUW: 'europe',
    EUNE: 'europe',
    NA: 'americas',
    KR: 'asia',
  };

  const routing = routingMap[region] || 'europe';
  const url = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

  try {
    const response = await fetch(url, {
      headers: { 'X-Riot-Token': RIOT_API_KEY }
    });

    if (response.status === 404) {
      return { success: false, message: `Joueur ${gameName}#${tagLine} non trouvé` };
    }

    if (!response.ok) {
      return { success: false, message: `Erreur API Riot: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, puuid: data.puuid, message: 'PUUID récupéré' };
  } catch (error) {
    console.error('Error fetching PUUID:', error);
    return { success: false, message: 'Erreur lors de la récupération du PUUID' };
  }
}

// Get ranked info for a player by PUUID
async function getRankedInfo(puuid: string, region: string): Promise<{
  tier: string;
  division: string;
  lp: number;
} | null> {
  const platformMap: Record<string, string> = {
    EUW: 'euw1',
    EUNE: 'eun1',
    NA: 'na1',
    KR: 'kr',
  };

  const platform = platformMap[region] || 'euw1';
  const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;

  try {
    const response = await fetch(url, {
      headers: { 'X-Riot-Token': RIOT_API_KEY }
    });

    if (!response.ok) {
      console.error(`Ranked API error: ${response.status}`);
      return null;
    }

    const entries = await response.json() as Array<{
      queueType: string;
      tier: string;
      rank: string;
      leaguePoints: number;
    }>;

    // Find Solo/Duo queue entry
    const soloEntry = entries.find(e => e.queueType === 'RANKED_SOLO_5x5');
    if (!soloEntry) {
      return null; // Player is unranked in Solo/Duo
    }

    return {
      tier: soloEntry.tier,
      division: soloEntry.rank,
      lp: soloEntry.leaguePoints
    };
  } catch (error) {
    console.error('Error fetching ranked info:', error);
    return null;
  }
}

// Sync games for a specific player by ID
async function syncGamesForPlayer(playerId: string): Promise<{ success: boolean; message: string; matches: unknown[] }> {
  console.log(`📥 Syncing games for player ${playerId}...`);

  // Get the player
  const { data: playerData, error: playerError } = await supabase
    .from('tracked_players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (playerError || !playerData) {
    return { success: false, message: 'Joueur non trouvé', matches: [] };
  }

  const player = playerData as TrackedPlayer;

  if (!player.puuid) {
    return { success: false, message: `${player.display_name} n'a pas de PUUID`, matches: [] };
  }

  // Get existing matches for this player
  const { data: existingMatches } = await supabase
    .from('johnny_matches')
    .select('id')
    .eq('puuid', player.puuid);
  const existingIds = new Set((existingMatches || []).map((m: { id: string }) => m.id));

  const matchIds = await getMatchHistory(player.puuid, player.region, 20);
  if (!matchIds || matchIds.length === 0) {
    return { success: true, message: `Aucun match trouvé pour ${player.display_name}`, matches: [] };
  }

  console.log(`  📋 Found ${matchIds.length} matches for ${player.display_name}`);
  console.log(`  📊 Already have ${existingIds.size} matches for this player`);

  const newMatches: unknown[] = [];
  let skippedCount = 0;
  let errorCount = 0;

  for (const matchId of matchIds) {
    if (existingIds.has(matchId)) {
      skippedCount++;
      continue;
    }

    const matchData = await getMatchDetails(matchId, player.region) as MatchData | null;

    if (!matchData) {
      console.log(`  ⚠️ Could not fetch match ${matchId}`);
      continue;
    }

    const playerStats = matchData.info.participants.find((p: { puuid: string }) => p.puuid === player.puuid);
    if (!playerStats) continue;

    const team = matchData.info.participants.filter((p: { teamId: number }) => p.teamId === playerStats.teamId);
    const teamKills = team.reduce((sum: number, p: { kills: number }) => sum + p.kills, 0);

    const johnnyMatch = buildJohnnyMatch(matchData, playerStats, player.puuid, player.display_name, teamKills);

    const error = await insertJohnnyMatch(johnnyMatch);

    if (error) {
      if (error.code === '23505') {
        console.log(`  ⚠️ Match ${matchId} déjà en base (duplicate key - migration pas appliquée?)`);
        errorCount++;
      } else {
        console.error(`  ❌ Error saving match ${matchId}:`, error);
        errorCount++;
      }
    } else {
      console.log(`  ✅ Synced: ${playerStats.kills}/${playerStats.deaths}/${playerStats.assists}`);
      newMatches.push(johnnyMatch);
      existingIds.add(matchId);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`  📈 Summary: ${newMatches.length} added, ${skippedCount} skipped (already had), ${errorCount} errors`);

  if (errorCount > 0 && newMatches.length === 0) {
    return {
      success: false,
      message: `${player.display_name}: ${errorCount} erreurs - exécutez database/migration-fix-matches-pk.sql`,
      matches: []
    };
  }

  if (newMatches.length === 0) {
    return { success: true, message: `${player.display_name}: déjà à jour (${skippedCount} games)`, matches: [] };
  }

  return {
    success: true,
    message: `${player.display_name}: ${newMatches.length} game(s) synchronisée(s)`,
    matches: newMatches
  };
}

// Sync ranks for all tracked players
async function syncRanksForAllPlayers(): Promise<{ success: boolean; message: string; updated: number }> {
  console.log('🏆 Syncing ranks for all players...');

  const players = await getTrackedPlayers();
  if (players.length === 0) {
    return { success: false, message: 'Aucun joueur configuré', updated: 0 };
  }

  let updated = 0;
  let columnsExist = true;

  for (const player of players) {
    if (!player.puuid) {
      console.log(`  ⚠️ No PUUID for ${player.display_name}`);
      continue;
    }

    // Skip rank sync if columns don't exist
    if (!columnsExist) {
      continue;
    }

    const rankInfo = await getRankedInfo(player.puuid, player.region);

    if (rankInfo) {
      // Try with all columns first
      let { error } = await supabase
        .from('tracked_players')
        .update({
          solo_tier: rankInfo.tier,
          solo_division: rankInfo.division,
          solo_lp: rankInfo.lp,
          rank_updated_at: new Date().toISOString()
        })
        .eq('id', player.id);

      // If any column doesn't exist (PGRST204), mark and skip
      if (error?.code === 'PGRST204') {
        console.error('  ❌ Colonnes de rank manquantes. Exécutez la migration SQL:');
        console.error('     database/migration-player-ranks.sql');
        columnsExist = false;
        continue;
      }

      if (error) {
        console.error(`  ❌ Error updating rank for ${player.display_name}:`, error);
      } else {
        console.log(`  ✅ ${player.display_name}: ${rankInfo.tier} ${rankInfo.division} (${rankInfo.lp} LP)`);
        updated++;
      }
    } else {
      // Player is unranked on Riot API
      // If they already have a manually set rank, keep it
      if (player.solo_tier) {
        console.log(`  ⏭️ ${player.display_name}: Unranked sur Riot, rank manuel conservé (${player.solo_tier} ${player.solo_division || ''})`);
      } else {
        console.log(`  ⚠️ ${player.display_name}: Unranked`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  if (!columnsExist) {
    return {
      success: false,
      message: 'Colonnes de rank manquantes. Exécutez database/migration-player-ranks.sql dans Supabase.',
      updated: 0
    };
  }

  return {
    success: true,
    message: `${updated} joueur(s) mis à jour`,
    updated
  };
}

// Execute a command
async function executeCommand(command: AdminCommand): Promise<void> {
  console.log(`\n⚡ Executing command: ${command.command}`);
  await updateCommandStatus(command.id, 'running');

  try {
    let result: unknown;

    switch (command.command) {
      case 'sync_last_game':
        result = await syncLastGameForAllPlayers();
        break;

      case 'check_status':
        await checkAllPlayers();
        result = { success: true, message: 'Status vérifié' };
        break;

      case 'sync_ranks':
        result = await syncRanksForAllPlayers();
        break;

      case 'sync_player_games': {
        const { playerId } = command.params as { playerId: string };
        if (!playerId) {
          result = { success: false, message: 'Paramètre manquant: playerId' };
        } else {
          result = await syncGamesForPlayer(playerId);
        }
        break;
      }

      case 'get_puuid': {
        const { gameName, tagLine, region } = command.params as { gameName: string; tagLine: string; region: string };
        if (!gameName || !tagLine || !region) {
          result = { success: false, message: 'Paramètres manquants: gameName, tagLine, region' };
        } else {
          result = await getPuuidFromRiotId(gameName, tagLine, region);
        }
        break;
      }

      case 'get_match': {
        const { matchId, region } = command.params as { matchId: string; region: string };
        if (!matchId || !region) {
          result = { success: false, message: 'Paramètres manquants: matchId, region' };
        } else {
          const matchData = await getMatchDetails(matchId, region);
          if (matchData) {
            result = { success: true, message: 'Match récupéré', matchData };
          } else {
            result = { success: false, message: 'Match non trouvé ou erreur API' };
          }
        }
        break;
      }

      default:
        result = { success: false, message: `Commande inconnue: ${command.command}` };
    }

    await updateCommandStatus(command.id, 'completed', result);
    console.log(`✅ Command completed: ${command.command}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Command failed: ${command.command}`, error);
    await updateCommandStatus(command.id, 'error', { success: false, message: errorMessage });
  }
}

// Process pending commands
async function processCommands(): Promise<void> {
  const commands = await getPendingCommands();

  for (const command of commands) {
    await executeCommand(command);
  }
}

// ============================================
// GAME END HANDLING
// ============================================

// Send Discord notification for game end
// Type for match participant stats
interface MatchParticipant {
  puuid: string;
  participantId?: number;
  riotIdGameName?: string;
  summonerName?: string;
  championId: number;
  championName: string;
  champLevel?: number;
  teamPosition?: string; // TOP / JUNGLE / MIDDLE / BOTTOM / UTILITY ('' in non-SR modes)
  summoner1Id?: number;
  summoner2Id?: number;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  win: boolean;
  firstBloodVictim?: boolean;
  firstBloodKill?: boolean;
  doubleKills?: number;
  tripleKills?: number;
  quadraKills?: number;
  pentaKills?: number;
  totalDamageTaken?: number;
  wardsPlaced?: number;
  wardsKilled?: number;
  gameEndedInSurrender?: boolean;
  teamEarlySurrendered?: boolean;
  teamId: number;
  perks?: {
    styles?: Array<{
      description: string; // primaryStyle / subStyle
      style: number;
      selections: Array<{ perk: number }>;
    }>;
  };
  // Challenges object from Riot API (advanced stats)
  challenges?: {
    soloKills?: number;
    killParticipation?: number;
    teamDamagePercentage?: number;
    damagePerMinute?: number;
    goldPerMinute?: number;
    visionScorePerMinute?: number;
    turretPlatesTaken?: number;
  };
  // Calculated from Timeline API
  soloDeaths?: number;
  goldAt15?: number;
}

// Type for match data
interface MatchData {
  metadata: { matchId: string };
  info: {
    gameCreation?: number;
    gameDuration: number;
    gameMode: string;
    queueId: number;
    gameEndedInSurrender?: boolean;
    participants: MatchParticipant[];
    teams?: Array<{
      teamId: number;
      objectives: Record<string, { kills: number }>;
    }>;
  };
}

// The enemy playing the same position (Summoner's Rift only)
function findLaneOpponent(matchData: MatchData, playerStats: MatchParticipant): MatchParticipant | null {
  if (!playerStats.teamPosition) return null;
  return matchData.info.participants.find(
    p => p.teamId !== playerStats.teamId && p.teamPosition === playerStats.teamPosition
  ) || null;
}

// Columns added by supabase/migrations/add_match_lane_stats.sql
const OPTIONAL_MATCH_COLUMNS = ['team_position', 'lane_gold_diff', 'lp_change'] as const;

// Insert a johnny_matches row; if the optional columns are not migrated yet, retry without them.
// Returns the Supabase error (if any) so callers keep their existing handling.
async function insertJohnnyMatch(row: Record<string, unknown>): Promise<{ code?: string; message?: string } | null> {
  const { error } = await supabase.from('johnny_matches').insert([row]);
  if (!error) return null;

  const missingColumn = error.code === 'PGRST204' || error.code === '42703' || /column/i.test(error.message || '');
  if (!missingColumn) return error;

  console.warn(`  ⚠️ johnny_matches missing columns (${error.message}) - run supabase/migrations/add_match_lane_stats.sql. Retrying without them.`);
  const fallback = { ...row };
  for (const col of OPTIONAL_MATCH_COLUMNS) delete fallback[col];
  const { error: retryError } = await supabase.from('johnny_matches').insert([fallback]);
  return retryError || null;
}

interface GameEndNotificationParams {
  player: TrackedPlayer;
  matchData: MatchData;
  playerStats: MatchParticipant;
  gameMode: string;
  rankInfo?: { tier: string; division: string; lp: number } | null;
  lpChange?: number | null;
}

// Verdict on the lane matchup from the gold difference (relative to the average gold of the two)
function getLaneVerdict(goldDiff: number, playerGold: number, opponentGold: number, opponentName: string): string {
  const avg = Math.max(1, (playerGold + opponentGold) / 2);
  const pct = goldDiff / avg;
  const diffText = `${formatSigned(goldDiff, formatK)} gold`;
  if (pct >= 0.18) return `🔨 **GAP MONUMENTAL** — ${opponentName} s'est fait gapped (${diffText})`;
  if (pct >= 0.07) return `💪 **Lane gagnée** face à ${opponentName} (${diffText})`;
  if (pct > -0.07) return `🤝 **Lane serrée** contre ${opponentName} (${diffText})`;
  if (pct > -0.18) return `😬 **Lane perdue** contre ${opponentName} (${diffText})`;
  return `💀 **GAPPED** par ${opponentName} (${diffText})`;
}

// Global verdict on the player's game
function getPerformanceVerdict(stats: MatchParticipant): string {
  const kdaRatio = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
  if (stats.pentaKills) return '🏆 PENTAKILL';
  if (kdaRatio >= 5) return '🔥 Il a carry';
  if (kdaRatio >= 3) return '✨ Très propre';
  if (kdaRatio >= 2) return '👍 Solide';
  if (stats.deaths >= 10) return '🚨 Game suspecte';
  if (kdaRatio < 1) return '💀 À review';
  return '😐 Correct';
}

function getHighlights(stats: MatchParticipant, matchData: MatchData): string[] {
  const highlights: string[] = [];
  if (stats.pentaKills) highlights.push(`🏆 ${stats.pentaKills} Penta`);
  else if (stats.quadraKills) highlights.push(`💥 ${stats.quadraKills} Quadra`);
  else if (stats.tripleKills) highlights.push(`🔥 ${stats.tripleKills} Triple`);
  else if (stats.doubleKills && stats.doubleKills >= 2) highlights.push(`⚡ ${stats.doubleKills} Double`);

  if (stats.firstBloodKill) highlights.push('🩸 First Blood');
  else if (stats.firstBloodVictim) highlights.push('🩸 A donné le First Blood');

  if ((stats.challenges?.soloKills || 0) >= 2) highlights.push(`🗡️ ${stats.challenges!.soloKills} solo kills`);
  if ((stats.soloDeaths || 0) >= 3) highlights.push(`☠️ ${stats.soloDeaths} morts solo`);

  const maxGameDamage = Math.max(...matchData.info.participants.map(p => p.totalDamageDealtToChampions));
  if (stats.totalDamageDealtToChampions === maxGameDamage) highlights.push('🏅 Top dégâts de la game');

  if (matchData.info.gameEndedInSurrender || stats.teamEarlySurrendered) highlights.push('🏳️ Fin par FF');
  return highlights;
}

// Monospace table comparing the player with the lane opponent
function buildMatchupTable(
  playerName: string,
  player: MatchParticipant,
  opponentName: string,
  opponent: MatchParticipant
): string {
  const col = (text: string, width: number) => text.padStart(width);
  const label = (text: string) => text.padEnd(8);
  const w = Math.max(6, playerName.length, opponentName.length);
  const row = (name: string, a: string, b: string, diff?: string) =>
    `${label(name)}${col(a, w)}  ${col(b, w)}${diff != null ? `  ${col(diff, 6)}` : ''}`;

  const playerCs = player.totalMinionsKilled + player.neutralMinionsKilled;
  const opponentCs = opponent.totalMinionsKilled + opponent.neutralMinionsKilled;
  const lines = [
    row('', playerName, opponentName, 'Diff'),
    row('Gold', formatK(player.goldEarned), formatK(opponent.goldEarned), formatSigned(player.goldEarned - opponent.goldEarned, formatK)),
  ];
  if (player.goldAt15 != null && opponent.goldAt15 != null) {
    lines.push(row('Gold@15', formatK(player.goldAt15), formatK(opponent.goldAt15), formatSigned(player.goldAt15 - opponent.goldAt15, formatK)));
  }
  lines.push(
    row('CS', String(playerCs), String(opponentCs), formatSigned(playerCs - opponentCs)),
    row('Dégâts', formatK(player.totalDamageDealtToChampions), formatK(opponent.totalDamageDealtToChampions), formatSigned(player.totalDamageDealtToChampions - opponent.totalDamageDealtToChampions, formatK)),
    row('KDA', `${player.kills}/${player.deaths}/${player.assists}`, `${opponent.kills}/${opponent.deaths}/${opponent.assists}`),
  );
  if (player.champLevel != null && opponent.champLevel != null) {
    lines.push(row('Niveau', String(player.champLevel), String(opponent.champLevel), formatSigned(player.champLevel - opponent.champLevel)));
  }
  const fence = '`'.repeat(3);
  return `${fence}\n${lines.join('\n')}\n${fence}`;
}

async function sendGameEndNotification(params: GameEndNotificationParams): Promise<void> {
  const { player, matchData, playerStats, gameMode, rankInfo, lpChange } = params;

  const playerName = getPlayerLabel(player);
  const profileUrl = getPlayerProfileUrl(player.id);
  const championName = playerStats.championName || CHAMPIONS[playerStats.championId] || 'Unknown';
  const win = playerStats.win;
  const durationSec = matchData.info.gameDuration;
  const minutes = Math.max(1, durationSec / 60);

  const team = matchData.info.participants.filter(p => p.teamId === playerStats.teamId);
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
  const teamDamage = team.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);
  const kp = playerStats.challenges?.killParticipation != null
    ? playerStats.challenges.killParticipation * 100
    : teamKills > 0 ? ((playerStats.kills + playerStats.assists) / teamKills) * 100 : 0;
  const teamDmgPct = teamDamage > 0 ? (playerStats.totalDamageDealtToChampions / teamDamage) * 100 : 0;
  const cs = playerStats.totalMinionsKilled + playerStats.neutralMinionsKilled;
  const kdaRatio = (playerStats.kills + playerStats.assists) / Math.max(1, playerStats.deaths);

  const role = (playerStats.teamPosition || null) as Role | null;
  const roleText = formatRole(role);
  const spells = formatSpells(playerStats.summoner1Id, playerStats.summoner2Id);
  const primaryStyle = playerStats.perks?.styles?.find(s => s.description === 'primaryStyle');
  const subStyle = playerStats.perks?.styles?.find(s => s.description === 'subStyle');
  const runes = formatRunes(primaryStyle?.selections?.map(s => s.perk), subStyle?.style);

  // Header lines
  const descriptionLines = [
    `**${championName}**${roleText ? ` · ${roleText}` : ''} · ⏱️ ${formatDuration(durationSec)} · ${gameMode}`,
  ];
  const loadout = [spells, runes ? `🔮 ${runes.keystone}` : null].filter(Boolean).join(' · ');
  if (loadout) descriptionLines.push(loadout);
  descriptionLines.push('', `**${getPerformanceVerdict(playerStats)}**`);
  const highlights = getHighlights(playerStats, matchData);
  if (highlights.length) descriptionLines.push(highlights.join(' · '));

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: '⚔️ KDA', value: `**${playerStats.kills}/${playerStats.deaths}/${playerStats.assists}** · ${kdaRatio.toFixed(2)}`, inline: true },
    { name: '🌾 CS', value: `**${cs}** · ${(cs / minutes).toFixed(1)}/min`, inline: true },
    { name: '💥 Dégâts', value: `**${formatK(playerStats.totalDamageDealtToChampions)}** · ${Math.round(teamDmgPct)}% team`, inline: true },
    { name: '🤝 KP', value: `**${Math.round(kp)}%**`, inline: true },
    { name: '💰 Gold', value: `**${formatK(playerStats.goldEarned)}** · ${Math.round(playerStats.goldEarned / minutes)}/min`, inline: true },
    { name: '👁️ Vision', value: `**${playerStats.visionScore}**`, inline: true },
  ];

  // Lane matchup
  const opponent = findLaneOpponent(matchData, playerStats);
  if (opponent) {
    const opponentChamp = opponent.championName || CHAMPIONS[opponent.championId] || 'Adversaire';
    const goldDiff = playerStats.goldEarned - opponent.goldEarned;
    fields.push({
      name: `🥊 Face à face · ${championName} vs ${opponentChamp}`,
      value: `${buildMatchupTable(championName, playerStats, opponentChamp, opponent)}\n${getLaneVerdict(goldDiff, playerStats.goldEarned, opponent.goldEarned, opponentChamp)}`,
      inline: false,
    });
  }

  // Rank header (author line)
  let authorName = gameMode;
  if (rankInfo) {
    authorName = formatRank(rankInfo.tier, rankInfo.division, rankInfo.lp);
    if (lpChange != null) authorName += ` (${formatSigned(lpChange)} LP)`;
  }

  const lpTitle = lpChange != null ? ` · ${formatSigned(lpChange)} LP` : '';

  const payload = {
    ...(PREVIEW_MODE ? { content: '🧪 **TEST** — aperçu du récap de fin de game (données fictives)' } : {}),
    embeds: [{
      author: {
        name: authorName,
        icon_url: getRankEmblemUrl(rankInfo?.tier || player.solo_tier),
      },
      title: win ? `🏆 VICTOIRE — ${playerName.toUpperCase()}${lpTitle}` : `💀 DÉFAITE — ${playerName.toUpperCase()}${lpTitle}`,
      url: profileUrl,
      description: descriptionLines.join('\n'),
      color: win ? DISCORD_COLORS.GREEN : DISCORD_COLORS.RED,
      fields,
      thumbnail: { url: playerStats.championId > 0 ? getChampionImageUrl(playerStats.championId) : getChampionImageUrl(championName) },
      footer: { text: `JohnnyFF15 · Récap de game · ${playerName}` },
      timestamp: new Date().toISOString(),
    }],
  };

  await postDiscordWebhook(payload, `game end ${playerName}`);
}

// Build a johnny_matches row with all detailed stats
function buildJohnnyMatch(
  matchData: MatchData,
  playerStats: MatchParticipant,
  playerPuuid: string,
  playerName: string,
  teamKills: number,
  lpChange: number | null = null
) {
  const team = matchData.info.participants.filter(p => p.teamId === playerStats.teamId);
  const teamDamage = team.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);
  const kp = teamKills > 0 ? (playerStats.kills + playerStats.assists) / teamKills : 0;
  const teamDmgPct = teamDamage > 0 ? playerStats.totalDamageDealtToChampions / teamDamage : 0;

  // Precise top damage calculations
  const maxTeamDamage = Math.max(...team.map(p => p.totalDamageDealtToChampions));
  const maxGameDamage = Math.max(...matchData.info.participants.map(p => p.totalDamageDealtToChampions));
  const isTopDamageTeam = playerStats.totalDamageDealtToChampions === maxTeamDamage;
  const isTopDamageGame = playerStats.totalDamageDealtToChampions === maxGameDamage;

  const opponent = findLaneOpponent(matchData, playerStats);

  return {
    id: matchData.metadata.matchId,
    puuid: playerPuuid,
    player_name: playerName,
    game_creation: matchData.info.gameCreation,
    game_duration: matchData.info.gameDuration,
    game_mode: matchData.info.gameMode,
    queue_id: matchData.info.queueId,
    champion_id: playerStats.championId,
    champion_name: playerStats.championName || CHAMPIONS[playerStats.championId] || 'Unknown',
    kills: playerStats.kills,
    deaths: playerStats.deaths,
    assists: playerStats.assists,
    cs: playerStats.totalMinionsKilled + playerStats.neutralMinionsKilled,
    vision_score: playerStats.visionScore,
    gold_earned: playerStats.goldEarned,
    damage_dealt: playerStats.totalDamageDealtToChampions,
    win: playerStats.win,
    first_blood_victim: playerStats.firstBloodVictim === true,
    game_ended_surrender: matchData.info.gameEndedInSurrender || playerStats.teamEarlySurrendered || false,
    team_kills: teamKills,
    // New detailed stats
    double_kills: playerStats.doubleKills || 0,
    triple_kills: playerStats.tripleKills || 0,
    quadra_kills: playerStats.quadraKills || 0,
    penta_kills: playerStats.pentaKills || 0,
    solo_kills: playerStats.challenges?.soloKills || 0,
    first_blood_kill: playerStats.firstBloodKill === true,
    kill_participation: Math.round(kp * 10000) / 100, // Store as percentage (e.g., 65.43)
    team_damage_pct: Math.round(teamDmgPct * 10000) / 100,
    damage_taken: playerStats.totalDamageTaken || 0,
    wards_placed: playerStats.wardsPlaced || 0,
    wards_killed: playerStats.wardsKilled || 0,
    solo_deaths: playerStats.soloDeaths || 0,
    is_top_damage_team: isTopDamageTeam,
    is_top_damage_game: isTopDamageGame,
    // Lane / ranked context (see supabase/migrations/add_match_lane_stats.sql)
    team_position: playerStats.teamPosition || null,
    lane_gold_diff: opponent ? playerStats.goldEarned - opponent.goldEarned : null,
    lp_change: lpChange,
    created_at: new Date().toISOString()
  };
}

// Evaluate if a prop condition was met based on match stats
// (same logic as services/betResolutionService.ts)
function evaluateProp(propId: string, stats: MatchParticipant, match: MatchData): boolean {
  const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
  const csPerMin = (stats.totalMinionsKilled + stats.neutralMinionsKilled) / (match.info.gameDuration / 60);

  // Get player's team kills for kill participation
  const team = match.info.participants.filter(p => p.teamId === stats.teamId);
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
  const killParticipation = teamKills > 0 ? (stats.kills + stats.assists) / teamKills * 100 : 0;

  // Check if player has less gold than lowest teammate
  const teammates = match.info.participants.filter(p => p.teamId === stats.teamId && p.puuid !== stats.puuid);
  const lowestTeammateGold = teammates.length > 0 ? Math.min(...teammates.map(p => p.goldEarned)) : Infinity;

  // Handle Dragon Score bets (format: dragon_score_X_Y)
  if (propId.startsWith('dragon_score_')) {
    const parts = propId.split('_');
    const predictedTeam = parseInt(parts[2], 10);
    const predictedEnemy = parseInt(parts[3], 10);

    const playerTeam = match.info.teams?.find(t => t.teamId === stats.teamId);
    const enemyTeam = match.info.teams?.find(t => t.teamId !== stats.teamId);
    const actualTeam = playerTeam?.objectives.dragon.kills || 0;
    const actualEnemy = enemyTeam?.objectives.dragon.kills || 0;

    return predictedTeam === actualTeam && predictedEnemy === actualEnemy;
  }

  // Handle Exact KDA bets (format: exact_kda_K_D_A)
  if (propId.startsWith('exact_kda_')) {
    const parts = propId.replace('exact_kda_', '').split('_');
    const predictedKills = parseInt(parts[0], 10);
    const predictedDeaths = parseInt(parts[1], 10);
    const predictedAssists = parseInt(parts[2], 10);

    return stats.kills === predictedKills &&
           stats.deaths === predictedDeaths &&
           stats.assists === predictedAssists;
  }

  // Handle Exact Damage bets (format: exact_damage_Xk or exact_damage_40k+)
  if (propId.startsWith('exact_damage_')) {
    const damageStr = propId.replace('exact_damage_', '');
    const actualK = Math.floor(stats.totalDamageDealtToChampions / 1000);

    // Handle 40k+ case
    if (damageStr === '40k+') {
      return actualK >= 40;
    }

    const predictedK = parseInt(damageStr.replace('k', ''), 10);
    return actualK === predictedK;
  }

  // Handle Damage Ranking bets (format: damage_ranking_[count]_[puuid:pos]_[puuid:pos]_...)
  if (propId.startsWith('damage_ranking_')) {
    const parts = propId.split('_');
    const count = parseInt(parts[2], 10);

    // Get all tracked players in this match and sort by damage
    const teamParticipants = match.info.participants.filter(p => p.teamId === stats.teamId);
    const sortedByDamage = [...teamParticipants].sort(
      (a, b) => b.totalDamageDealtToChampions - a.totalDamageDealtToChampions
    );

    // Create actual ranking map (puuid last 8 chars -> position 1-5)
    const actualRanking = new Map<string, number>();
    sortedByDamage.forEach((p, idx) => {
      actualRanking.set(p.puuid.slice(-8), idx + 1);
    });

    // Parse predicted rankings from propId
    // Format: damage_ranking_3_abc12345:1_def67890:2_ghi11111:3
    let allCorrect = true;
    for (let i = 3; i < 3 + count; i++) {
      const rankPart = parts[i];
      if (!rankPart) {
        allCorrect = false;
        break;
      }
      const [puuidShort, posStr] = rankPart.split(':');
      const predictedPos = parseInt(posStr, 10);
      const actualPos = actualRanking.get(puuidShort);

      if (actualPos !== predictedPos) {
        allCorrect = false;
        break;
      }
    }

    return allCorrect;
  }

  switch (propId) {
    // ========== EARLY GAME ==========
    case 'early1': // First Blood victime
      return stats.firstBloodVictim === true;
    case 'early5': // First Blood kill
      return stats.firstBloodKill === true;
    case 'early3': // 5 morts ou plus
      return stats.deaths >= 5;
    case 'early6': // 4 morts ou moins
      return stats.deaths <= 4;
    case 'early4': // 0 mort toute la game
      return stats.deaths === 0;

    // ========== KDA ==========
    case 'kda1': // Le 0/10 Powerspike (10+ deaths)
      return stats.deaths >= 10;
    case 'kda2': // Le 0/15 Légendaire (15+ deaths)
      return stats.deaths >= 15;
    case 'kda3': // KDA < 0.5
      return kda < 0.5;
    case 'kda4': // 0 Kill toute la game
      return stats.kills === 0;
    case 'kda5': // 0 Assist toute la game
      return stats.assists === 0;
    case 'kda6': // KDA >= 1
      return kda >= 1.0;
    case 'kda9': // KDA >= 2
      return kda >= 2.0;
    case 'kda7': // Double kill ou plus
      return (stats.doubleKills || 0) >= 1;
    case 'kda8': // Triple kill ou plus
      return (stats.tripleKills || 0) >= 1;

    // ========== SOLO KILLS ==========
    case 'sk1': // 3 Solo Kills ou plus
      return (stats.challenges?.soloKills || 0) >= 3;
    case 'sk2': // 5 Solo Kills ou plus
      return (stats.challenges?.soloKills || 0) >= 5;
    case 'sk3': // 0 Solo Kill
      return (stats.challenges?.soloKills || 0) === 0;

    // ========== SOLO DEATHS (Timeline API) ==========
    case 'sd1': // 0 Solo Death
      return (stats.soloDeaths || 0) === 0;
    case 'sd2': // 3+ Solo Deaths
      return (stats.soloDeaths || 0) >= 3;
    case 'sd3': // 5+ Solo Deaths
      return (stats.soloDeaths || 0) >= 5;

    // ========== GAMEPLAY ==========
    case 'gp1': // CS de la honte (<4/min)
      return csPerMin < 4;
    case 'gp7': // CS > 9.5/min
      return csPerMin > 9.5;
    case 'gp2': // 0 Vision Score
      return stats.visionScore === 0;
    case 'gp3': // Vision < 5
      return stats.visionScore < 5;
    case 'gp4': // Moins de 8k dégâts
      return stats.totalDamageDealtToChampions < 8000;
    case 'gp6': // Participation < 25%
      return killParticipation < 25;
    case 'gp9': // KP > 70%
      return killParticipation > 70;

    // ========== RÉSULTAT ==========
    case 'out1': // FF avant 20 min
      return (stats.gameEndedInSurrender || match.info.gameEndedInSurrender === true) && match.info.gameDuration < 1200;
    case 'out2': // Défaite
      return !stats.win;
    case 'out3': // VICTOIRE
      return stats.win;
    case 'out4': // Game > 40 min
      return match.info.gameDuration > 2400;

    // ========== LÉGENDAIRES ==========
    case 'sp2': // Le Miracle KDA (KDA > 5.0)
      return kda > 5.0;
    case 'sp3': // Le Carry Mystique (top damage de l'équipe)
      const maxTeamDamage = Math.max(...team.map(p => p.totalDamageDealtToChampions));
      return stats.totalDamageDealtToChampions === maxTeamDamage;
    case 'gp8': // Top Damage de la Game (10 joueurs)
      const maxGameDamage = Math.max(...match.info.participants.map(p => p.totalDamageDealtToChampions));
      return stats.totalDamageDealtToChampions === maxGameDamage;
    case 'sp6': // Le Pentakill
      return (stats.pentaKills || 0) >= 1;

    default:
      console.warn(`  Unknown prop ID: ${propId}`);
      return false;
  }
}

// Get the actual stat string that explains the bet result
function getResolvedStat(propId: string, stats: MatchParticipant, match: MatchData): string {
  const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
  const csPerMin = (stats.totalMinionsKilled + stats.neutralMinionsKilled) / (match.info.gameDuration / 60);
  const gameDurationMin = Math.floor(match.info.gameDuration / 60);

  const team = match.info.participants.filter(p => p.teamId === stats.teamId);
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
  const killParticipation = teamKills > 0 ? (stats.kills + stats.assists) / teamKills * 100 : 0;

  const teammates = match.info.participants.filter(p => p.teamId === stats.teamId && p.puuid !== stats.puuid);
  const lowestTeammateGold = teammates.length > 0 ? Math.min(...teammates.map(p => p.goldEarned)) : 0;

  // Handle Dragon Score bets
  if (propId.startsWith('dragon_score_')) {
    const playerTeam = match.info.teams?.find(t => t.teamId === stats.teamId);
    const enemyTeam = match.info.teams?.find(t => t.teamId !== stats.teamId);
    const teamDragons = playerTeam?.objectives.dragon.kills || 0;
    const enemyDragons = enemyTeam?.objectives.dragon.kills || 0;
    return `🐉 Dragons: ${teamDragons} - ${enemyDragons}`;
  }

  // Handle Exact KDA bets
  if (propId.startsWith('exact_kda_')) {
    return `🎯 K/D/A: ${stats.kills}/${stats.deaths}/${stats.assists}`;
  }

  // Handle Exact Damage bets
  if (propId.startsWith('exact_damage_')) {
    const damageK = Math.floor(stats.totalDamageDealtToChampions / 1000);
    return `⚔️ Dégâts: ${damageK}k`;
  }

  // Handle Damage Ranking bets
  if (propId.startsWith('damage_ranking_')) {
    const sortedByDamage = [...team].sort(
      (a, b) => b.totalDamageDealtToChampions - a.totalDamageDealtToChampions
    );
    const ranking = sortedByDamage
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${(p.totalDamageDealtToChampions / 1000).toFixed(0)}k`)
      .join(' | ');
    return `🔥 Classement: ${ranking}`;
  }

  switch (propId) {
    case 'early1': return stats.firstBloodVictim ? '🩸 First Blood victime' : '✓ Pas First Blood victime';
    case 'early5': return stats.firstBloodKill ? '🗡️ First Blood kill' : '✗ Pas First Blood';
    case 'early3': return `${stats.deaths} morts`;
    case 'early6': return `${stats.deaths} morts`;
    case 'early4': return `${stats.deaths} morts`;
    case 'kda1': return `${stats.deaths} morts`;
    case 'kda2': return `${stats.deaths} morts`;
    case 'kda3': return `KDA: ${kda.toFixed(2)} (${stats.kills}/${stats.deaths}/${stats.assists})`;
    case 'kda4': return `${stats.kills} kills`;
    case 'kda5': return `${stats.assists} assists`;
    case 'kda6': return `KDA: ${kda.toFixed(2)} (${stats.kills}/${stats.deaths}/${stats.assists})`;
    case 'kda9': return `KDA: ${kda.toFixed(2)} (${stats.kills}/${stats.deaths}/${stats.assists})`;
    case 'kda7': return `${stats.doubleKills || 0} double kills`;
    case 'kda8': return `${stats.tripleKills || 0} triple kills`;
    case 'sk1': return `${stats.challenges?.soloKills || 0} solo kills`;
    case 'sk2': return `${stats.challenges?.soloKills || 0} solo kills`;
    case 'sk3': return `${stats.challenges?.soloKills || 0} solo kills`;
    case 'sd1': return `${stats.soloDeaths || 0} solo deaths`;
    case 'sd2': return `${stats.soloDeaths || 0} solo deaths`;
    case 'sd3': return `${stats.soloDeaths || 0} solo deaths`;
    case 'gp1': return `${csPerMin.toFixed(1)} CS/min`;
    case 'gp7': return `${csPerMin.toFixed(1)} CS/min`;
    case 'gp2': return `Vision: ${stats.visionScore}`;
    case 'gp3': return `Vision: ${stats.visionScore}`;
    case 'gp4': return `${(stats.totalDamageDealtToChampions / 1000).toFixed(1)}k dégâts`;
    case 'gp6': return `${killParticipation.toFixed(0)}% KP`;
    case 'gp9': return `${killParticipation.toFixed(0)}% KP`;
    case 'out1': return `${stats.gameEndedInSurrender || match.info.gameEndedInSurrender ? 'FF' : 'Pas FF'} à ${gameDurationMin}min`;
    case 'out2': return stats.win ? 'Victoire' : 'Défaite';
    case 'out3': return stats.win ? 'Victoire' : 'Défaite';
    case 'out4': return `Durée: ${gameDurationMin}min`;
    case 'sp2': return `KDA: ${kda.toFixed(2)}`;
    case 'sp3': {
      const maxDmg = Math.max(...team.map(p => p.totalDamageDealtToChampions));
      return `${(stats.totalDamageDealtToChampions / 1000).toFixed(1)}k dmg (max équipe: ${(maxDmg / 1000).toFixed(1)}k)`;
    }
    case 'gp8': {
      const maxGameDmg = Math.max(...match.info.participants.map(p => p.totalDamageDealtToChampions));
      return `${(stats.totalDamageDealtToChampions / 1000).toFixed(1)}k dmg (max game: ${(maxGameDmg / 1000).toFixed(1)}k)`;
    }
    case 'sp6': return `${stats.pentaKills || 0} pentakill${(stats.pentaKills || 0) > 1 ? 's' : ''}`;
    default: return `${stats.kills}/${stats.deaths}/${stats.assists}`;
  }
}

// Calculate tax on winnings
// > 100k gain: 10% tax
// > 500k gain: 20% tax
function calculateWinningsTax(payout: number, amount: number): { netPayout: number; taxAmount: number; taxRate: number } {
  const gain = payout - amount; // Net gain (profit)

  if (gain <= 0) {
    return { netPayout: payout, taxAmount: 0, taxRate: 0 };
  }

  let taxRate = 0;
  if (gain > 500000) {
    taxRate = 0.20; // 20% tax
  } else if (gain > 100000) {
    taxRate = 0.10; // 10% tax
  }

  const taxAmount = Math.floor(gain * taxRate);
  const netPayout = payout - taxAmount;

  return { netPayout, taxAmount, taxRate };
}

// Update user credits using RPC or fallback
async function updateUserCredits(userId: string, won: boolean, amount: number, payout: number): Promise<void> {
  try {
    // Try RPC function first
    const { error } = await supabase.rpc('update_user_credits_on_bet_resolution', {
      p_user_id: userId,
      p_won: won,
      p_amount: amount,
      p_payout: payout
    });

    if (error) {
      console.log(`  RPC failed, trying direct update...`);
      // Fallback: direct update
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits, bets_won, bets_lost, jc_won, jc_lost')
        .eq('id', userId)
        .single();

      if (profile) {
        if (won) {
          await supabase
            .from('profiles')
            .update({
              credits: profile.credits + payout,
              bets_won: (profile.bets_won || 0) + 1,
              jc_won: (profile.jc_won || 0) + (payout - amount)
            })
            .eq('id', userId);
        } else {
          await supabase
            .from('profiles')
            .update({
              bets_lost: (profile.bets_lost || 0) + 1,
              jc_lost: (profile.jc_lost || 0) + amount
            })
            .eq('id', userId);
        }
      }
    }
  } catch (err) {
    console.error(`  Error updating user credits:`, err);
  }
}

// Resolve bets for a specific match
async function resolveBetsForMatch(
  matchData: MatchData,
  playerPuuid: string,
  playerName: string
): Promise<{ resolved: number; errors: number }> {
  const playerStats = matchData.info.participants.find(p => p.puuid === playerPuuid);
  if (!playerStats) {
    console.error(`Could not find player stats for ${playerName}`);
    return { resolved: 0, errors: 1 };
  }

  // Get ALL pending bets, then filter by player
  // This ensures we catch bets with NULL player_puuid (legacy) OR matching player_puuid
  const { data: allPendingBets, error: betsError } = await supabase
    .from('bets')
    .select('*')
    .eq('status', 'PENDING');

  if (betsError) {
    console.error('Error fetching pending bets:', betsError);
    return { resolved: 0, errors: 1 };
  }

  // Filter bets: include if player_puuid is null OR matches the current player
  const pendingBets = (allPendingBets || []).filter(bet =>
    !bet.player_puuid || bet.player_puuid === playerPuuid
  );

  if (pendingBets.length === 0) {
    console.log(`  No pending bets for ${playerName}`);
    return { resolved: 0, errors: 0 };
  }

  console.log(`  📊 Found ${pendingBets.length} pending bets for ${playerName} (${allPendingBets?.length || 0} total pending)`);

  // Get champion name for enrichment (fixes "Inconnu" from placement time)
  const resolvedChampionName = playerStats.championName || CHAMPIONS[playerStats.championId] || null;

  // Separate single bets from combo bets
  const singleBets = pendingBets.filter(b => !b.combo_id);
  const comboBets = pendingBets.filter(b => b.combo_id);

  // Group combo bets by combo_id
  const comboGroups = new Map<string, typeof comboBets>();
  for (const bet of comboBets) {
    const existing = comboGroups.get(bet.combo_id) || [];
    existing.push(bet);
    comboGroups.set(bet.combo_id, existing);
  }

  let resolved = 0;
  let errors = 0;

  // Process single bets
  for (const bet of singleBets) {
    try {
      const won = evaluateProp(bet.prop_id, playerStats, matchData);
      const resolvedStat = getResolvedStat(bet.prop_id, playerStats, matchData);
      const payout = won ? bet.potential_payout : 0;

      const updateData: Record<string, unknown> = {
        status: won ? 'WON' : 'LOST',
        resolved_stat: resolvedStat,
      };
      // Enrich champion name if it was missing at placement time
      if (resolvedChampionName && (!bet.champion_name || bet.champion_name === 'Inconnu')) {
        updateData.champion_name = resolvedChampionName;
      }
      const { error: updateError } = await supabase
        .from('bets')
        .update(updateData)
        .eq('id', bet.id);

      if (updateError) {
        console.error(`  Error updating bet ${bet.id}:`, updateError);
        errors++;
        continue;
      }

      if (bet.user_id) {
        await updateUserCredits(bet.user_id, won, bet.amount, payout);
      }

      console.log(`  ${won ? '✅' : '❌'} ${bet.prop_title}: ${won ? 'WON' : 'LOST'} (${resolvedStat})`);
      resolved++;
    } catch (error) {
      console.error(`  Error resolving bet ${bet.id}:`, error);
      errors++;
    }
  }

  // Process combo bets - ALL bets in combo must win for payout
  for (const [comboId, bets] of comboGroups) {
    try {
      console.log(`  🎲 Processing combo ${comboId.slice(0, 8)}... with ${bets.length} bets`);

      // Evaluate each bet in the combo
      const betResults = bets.map(bet => ({
        bet,
        won: evaluateProp(bet.prop_id, playerStats, matchData),
        resolvedStat: getResolvedStat(bet.prop_id, playerStats, matchData)
      }));

      // Combo wins only if ALL bets won
      const comboWon = betResults.every(r => r.won);

      // Find the main bet (first bet in combo with the amount)
      const mainBet = bets.find(b => b.amount > 0) || bets[0];
      const totalAmount = mainBet.amount;
      const actualPayout = comboWon ? mainBet.potential_payout : 0;

      for (const { bet, resolvedStat } of betResults) {
        const comboUpdateData: Record<string, unknown> = {
          status: comboWon ? 'WON' : 'LOST',
          resolved_stat: resolvedStat,
        };
        // Enrich champion name if it was missing at placement time
        if (resolvedChampionName && (!bet.champion_name || bet.champion_name === 'Inconnu')) {
          comboUpdateData.champion_name = resolvedChampionName;
        }
        const { error: updateError } = await supabase
          .from('bets')
          .update(comboUpdateData)
          .eq('id', bet.id);

        if (updateError) {
          console.error(`  Error updating combo bet ${bet.id}:`, updateError);
          errors++;
        } else {
          resolved++;
        }
      }

      if (mainBet.user_id) {
        await updateUserCredits(mainBet.user_id, comboWon, totalAmount, actualPayout);
      }

      console.log(`  ${comboWon ? '✅' : '❌'} Combo ${comboId.slice(0, 8)}...: ${comboWon ? 'WON +' + actualPayout + ' JC' : 'LOST -' + totalAmount + ' JC'}`);
    } catch (error) {
      console.error(`  Error resolving combo ${comboId}:`, error);
      errors++;
    }
  }

  return { resolved, errors };
}

// Handle game end for a player
async function handleGameEnd(player: TrackedPlayer, previousGameId: string): Promise<void> {
  console.log(`\n🏁 Game ended for ${player.display_name}! Fetching results...`);

  // Wait a bit for Riot API to process the match (90 seconds)
  console.log('  ⏳ Waiting 90s for Riot API to process match data...');
  await new Promise(r => setTimeout(r, 90000));

  // Fetch last match with retries (API can be slow after game ends)
  let matchIds: string[] | null = null;
  let matchData: MatchData | null = null;

  const RETRY_DELAYS = [0, 30000, 60000, 120000]; // immediate, 30s, 60s, 2min
  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) {
      console.log(`  🔄 Retry ${attempt}/${RETRY_DELAYS.length - 1} - waiting ${RETRY_DELAYS[attempt] / 1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
    }

    matchIds = await getMatchHistory(player.puuid, player.region, 1);
    if (!matchIds || matchIds.length === 0) {
      console.error(`  ❌ No match found for ${player.display_name} (attempt ${attempt + 1})`);
      continue;
    }

    matchData = await getMatchDetails(matchIds[0], player.region) as MatchData | null;
    if (matchData) break;
    console.error(`  ❌ Could not fetch match data for ${player.display_name} (attempt ${attempt + 1})`);
  }

  if (!matchData) {
    console.error(`  ❌ All retries failed for ${player.display_name} - giving up`);
    return;
  }

  const matchId = matchIds![0];

  const playerStats = matchData.info.participants.find(p => p.puuid === player.puuid);
  if (!playerStats) {
    console.error(`  ❌ Player not found in match participants`);
    return;
  }

  // Fetch timeline for solo deaths + gold @15 (player and lane opponent)
  console.log('  📊 Fetching timeline for solo deaths...');
  const timeline = await getMatchTimeline(matchId, player.region);
  if (timeline) {
    const soloDeaths = countSoloDeaths(timeline, player.puuid);
    playerStats.soloDeaths = soloDeaths;
    console.log(`  💀 Solo deaths: ${soloDeaths}`);

    // Fix: Riot API doesn't return firstBloodVictim, determine from timeline
    const fbVictim = isFirstBloodVictim(timeline, player.puuid);
    playerStats.firstBloodVictim = fbVictim;
    if (fbVictim) console.log(`  🩸 First Blood victim!`);

    for (const participant of matchData.info.participants) {
      const tp = timeline.participants.find(p => p.puuid === participant.puuid);
      const gold = tp ? timeline.goldAt15[tp.participantId] : undefined;
      if (gold != null) participant.goldAt15 = gold;
    }
  } else {
    console.log('  ⚠️ Could not fetch timeline, solo deaths will be 0');
    playerStats.soloDeaths = 0;
  }

  // Fetch current rank + LP after game (for webhook, match row and DB update)
  let newRankInfo: { tier: string; division: string; lp: number } | null = null;
  let lpChange: number | null = null;
  try {
    newRankInfo = await getRankedInfo(player.puuid, player.region);
    if (newRankInfo) {
      // Calculate LP change from stored rank
      if (player.solo_tier === newRankInfo.tier &&
          player.solo_division === newRankInfo.division &&
          player.solo_lp != null) {
        lpChange = newRankInfo.lp - player.solo_lp;
      }

      // Update rank in DB
      await supabase
        .from('tracked_players')
        .update({
          solo_tier: newRankInfo.tier,
          solo_division: newRankInfo.division,
          solo_lp: newRankInfo.lp,
          rank_updated_at: new Date().toISOString()
        })
        .eq('id', player.id);

      console.log(`  🎖️ Rank: ${newRankInfo.tier} ${newRankInfo.division} ${newRankInfo.lp} LP${lpChange != null ? ` (${lpChange >= 0 ? '+' : ''}${lpChange})` : ''}`);
    }
  } catch (rankErr) {
    console.error('  ⚠️ Error fetching rank:', rankErr);
  }

  // Save match to johnny_matches
  try {
    const team = matchData.info.participants.filter(p => p.teamId === playerStats.teamId);
    const teamKills = team.reduce((sum, p) => sum + p.kills, 0);

    const johnnyMatch = buildJohnnyMatch(matchData, playerStats, player.puuid, player.display_name, teamKills, lpChange);
    const saveError = await insertJohnnyMatch(johnnyMatch);

    if (saveError && saveError.code !== '23505') {
      console.error(`  ❌ Error saving match:`, saveError);
    } else {
      console.log(`  ✅ Match saved: ${playerStats.kills}/${playerStats.deaths}/${playerStats.assists}`);
    }
  } catch (saveErr) {
    console.error(`  ❌ Exception saving match:`, saveErr);
  }

  // Resolve bets
  try {
    const { resolved, errors } = await resolveBetsForMatch(matchData, player.puuid, player.display_name);
    console.log(`  📊 Bets resolved: ${resolved} (${errors} errors)`);
  } catch (resolveErr) {
    console.error(`  ❌ Exception resolving bets:`, resolveErr);
  }

  // Send game end notification (always runs even if above steps failed)
  const gameMode = QUEUE_NAMES[matchData.info.queueId] || matchData.info.gameMode || 'Normal';
  await sendGameEndNotification({
    player,
    matchData,
    playerStats,
    gameMode,
    rankInfo: newRankInfo,
    lpChange,
  });
}

// ============================================
// GAME CHECKING
// ============================================

async function checkAllPlayers(): Promise<void> {
  console.log(`\n[${new Date().toLocaleTimeString()}] Checking players...`);

  const players = await getTrackedPlayers();
  if (players.length === 0) {
    console.log('No tracked players found');
    return;
  }

  // Group players by game
  const gameGroups = new Map<number, { players: TrackedPlayer[]; game: CurrentGameInfo; champions: string[]; championIds: number[] }>();

  // Track players whose games ended (to handle after the loop)
  const gameEndedPlayers: { player: TrackedPlayer; previousGameId: string }[] = [];

  for (const player of players) {
    if (!player.puuid) continue;

    const game = await checkCurrentGame(player.puuid, player.region);

    // Get previous state
    const prevState = previousGameState.get(player.id);
    const wasInGame = prevState?.isInGame || false;
    const previousGameId = prevState?.gameId || null;

    // undefined = API error, keep previous state and skip this player
    if (game === undefined) {
      const name = player.display_name || player.game_name || 'Unknown';
      console.log(`  ⚠️  ${name} - API error, keeping previous state`);
      continue;
    }

    if (game) {
      const gameId = game.gameId;
      const queueId = game.gameQueueConfigId;
      const queueName = QUEUE_NAMES[queueId] || 'Unknown';
      const name = player.display_name || player.game_name || 'Unknown';

      // Check if this is an allowed queue (Solo/Duo or Flex)
      if (!ALLOWED_QUEUE_IDS.includes(queueId)) {
        console.log(`  ⏭️  ${name} is in ${queueName} (ignored - not ranked)`);
        // Treat as not in game for betting purposes
        await updateGameStatusInSupabase(player.id, false, null, null);
        previousGameState.set(player.id, { isInGame: false, gameId: null });
      } else {
        const participant = game.participants.find(p => p.puuid === player.puuid);
        const championId = participant?.championId || 0;
        const championName = participant ? (CHAMPIONS[championId] || `Champion${championId}`) : '';

        if (!gameGroups.has(gameId)) {
          gameGroups.set(gameId, { players: [], game, champions: [], championIds: [] });
        }

        const group = gameGroups.get(gameId)!;
        group.players.push(player);
        group.champions.push(championName);
        group.championIds.push(championId);

        console.log(`  🎮 ${name} is in game (${queueName})`);
        await updateGameStatusInSupabase(player.id, true, String(gameId), game);

        // Update previous state
        previousGameState.set(player.id, { isInGame: true, gameId: String(gameId) });
      }
    } else {
      // game === null: confirmed not in game (404 from Riot API)
      const name = player.display_name || player.game_name || 'Unknown';
      console.log(`  ⏸️  ${name} not in game`);
      await updateGameStatusInSupabase(player.id, false, null, null);

      // Check if game just ended
      if (wasInGame && previousGameId) {
        console.log(`  🏁 Game just ended for ${name}!`);
        gameEndedPlayers.push({ player, previousGameId });
      }

      // Update previous state
      previousGameState.set(player.id, { isInGame: false, gameId: null });
    }

    // Delay between players to avoid rate limiting (500ms)
    await new Promise(r => setTimeout(r, 500));
  }

  // Send notifications for new games
  for (const [gameId, { players: gamePlayers, game, champions, championIds }] of gameGroups) {
    const notifKey = `${gameId}`;

    if (!notifiedGames.has(notifKey)) {
      notifiedGames.add(notifKey);

      const gameMode = QUEUE_NAMES[game.gameQueueConfigId] || 'Normal';

      console.log(`  📣 New game ${gameId}: ${champions.join(', ')} (${championIds.join(', ')})`);
      await sendDiscordNotification(gamePlayers, gameMode, game);

      // Clean up old notifications after 1 hour
      setTimeout(() => notifiedGames.delete(notifKey), 60 * 60 * 1000);
    }
  }

  // Handle game ends (in parallel but with slight delay)
  for (const { player, previousGameId } of gameEndedPlayers) {
    // Don't await - handle in background so we don't block the next check
    handleGameEnd(player, previousGameId).catch(err => {
      console.error(`Error handling game end for ${player.display_name}:`, err);
    });
  }
}

// ============================================
// WEEKLY WEALTH TAX
// ============================================

async function checkAndApplyWeeklyWealthTax(): Promise<void> {
  // Check if it's Sunday
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  if (dayOfWeek !== 0) {
    return; // Only run on Sundays
  }

  // Check if we already ran today (using a simple flag in Supabase)
  const todayKey = `wealth_tax_${now.toISOString().slice(0, 10)}`; // e.g., "wealth_tax_2026-02-08"

  const { data: existing } = await supabase
    .from('admin_commands')
    .select('id')
    .eq('command', todayKey)
    .eq('status', 'completed')
    .limit(1);

  if (existing && existing.length > 0) {
    return; // Already ran today
  }

  console.log('\n🏦 WEEKLY WEALTH TAX - Running...');
  console.log(`   Threshold: ${WEALTH_TAX_THRESHOLD.toLocaleString()} JC`);
  console.log(`   Tax rate: ${WEALTH_TAX_RATE * 100}%`);

  // Fetch all users with credits above threshold
  const { data: richUsers, error: fetchError } = await supabase
    .from('profiles')
    .select('id, pseudo, credits')
    .gt('credits', WEALTH_TAX_THRESHOLD)
    .order('credits', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching profiles:', fetchError);
    return;
  }

  if (!richUsers || richUsers.length === 0) {
    console.log('✅ No users above wealth tax threshold.');

    // Mark as completed
    await supabase.from('admin_commands').insert([{
      command: todayKey,
      params: { users_taxed: 0, total_collected: 0 },
      status: 'completed',
      result: { message: 'No users above threshold' }
    }]);
    return;
  }

  console.log(`   Found ${richUsers.length} users above threshold`);

  let totalTaxCollected = 0;
  let usersProcessed = 0;

  for (const user of richUsers) {
    const taxAmount = Math.floor(user.credits * WEALTH_TAX_RATE);
    const newCredits = user.credits - taxAmount;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', user.id);

    if (!updateError) {
      console.log(`   💰 ${user.pseudo}: ${user.credits.toLocaleString()} → ${newCredits.toLocaleString()} JC (-${taxAmount.toLocaleString()})`);
      totalTaxCollected += taxAmount;
      usersProcessed++;
    } else {
      console.error(`   ❌ Error taxing ${user.pseudo}:`, updateError);
    }
  }

  console.log(`\n   ═══════════════════════════════════`);
  console.log(`   📊 Users taxed: ${usersProcessed}`);
  console.log(`   💵 Total collected: ${totalTaxCollected.toLocaleString()} JC`);
  console.log(`   ═══════════════════════════════════\n`);

  // Mark as completed in admin_commands
  await supabase.from('admin_commands').insert([{
    command: todayKey,
    params: { users_taxed: usersProcessed, total_collected: totalTaxCollected },
    status: 'completed',
    result: { success: true, users_taxed: usersProcessed, total_collected: totalTaxCollected }
  }]);

  // Send Discord notification
  if (DISCORD_WEBHOOK_URL && usersProcessed > 0) {
    const payload = {
      username: 'JohnnyFF15 Bot',
      avatar_url: 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png',
      embeds: [{
        title: '🏦 TAXE HEBDOMADAIRE APPLIQUÉE',
        description: `La taxe de ${WEALTH_TAX_RATE * 100}% sur les portefeuilles > ${WEALTH_TAX_THRESHOLD.toLocaleString()} JC a été prélevée.`,
        color: 0xf59e0b,
        fields: [
          { name: '👥 Joueurs taxés', value: `${usersProcessed}`, inline: true },
          { name: '💵 Total collecté', value: `${totalTaxCollected.toLocaleString()} JC`, inline: true },
        ],
        footer: { text: 'JohnnyFF15 - Chaque dimanche à minuit' },
        timestamp: new Date().toISOString(),
      }],
    };

    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Discord notification error:', err);
    }
  }
}

// ============================================
// PREVIEW MODE (mock data, no Riot API calls)
// ============================================

async function runPreview(): Promise<void> {
  console.log('🧪 Preview mode: sending game start + game end notifications with mock data\n');

  const player: TrackedPlayer = {
    id: 'preview-player',
    puuid: 'preview-puuid',
    game_name: 'Johnny',
    tag_line: 'EUW',
    region: 'EUW',
    display_name: 'Johnny',
    is_active: true,
    solo_tier: 'EMERALD',
    solo_division: 'II',
    solo_lp: 45,
    rank_updated_at: null,
  };

  // Spectator-like data: Yasuo mid with Flash/Ignite, Conqueror + Resolve
  const blue = [
    { puuid: 'b1', championId: 266, teamId: 100, spell1Id: 4, spell2Id: 12 },   // Aatrox
    { puuid: 'b2', championId: 64, teamId: 100, spell1Id: 4, spell2Id: 11 },    // Lee Sin
    { puuid: 'preview-puuid', championId: 157, teamId: 100, spell1Id: 4, spell2Id: 14, perks: { perkIds: [8010, 9111, 9104, 8014, 8444, 8451, 5008, 5008, 5001], perkStyle: 8000, perkSubStyle: 8400 } }, // Yasuo
    { puuid: 'b4', championId: 222, teamId: 100, spell1Id: 4, spell2Id: 7 },    // Jinx
    { puuid: 'b5', championId: 412, teamId: 100, spell1Id: 4, spell2Id: 14 },   // Thresh
  ];
  const red = [
    { puuid: 'r1', championId: 122, teamId: 200, spell1Id: 4, spell2Id: 6 },    // Darius
    { puuid: 'r2', championId: 104, teamId: 200, spell1Id: 4, spell2Id: 11 },   // Graves
    { puuid: 'r3', championId: 238, teamId: 200, spell1Id: 4, spell2Id: 14 },   // Zed
    { puuid: 'r4', championId: 51, teamId: 200, spell1Id: 4, spell2Id: 7 },     // Caitlyn
    { puuid: 'r5', championId: 117, teamId: 200, spell1Id: 4, spell2Id: 3 },    // Lulu
  ];
  const game: CurrentGameInfo = {
    gameId: 1,
    gameStartTime: Date.now(),
    gameQueueConfigId: 420,
    participants: [...blue, ...red],
  };

  await sendDiscordNotification([player], QUEUE_NAMES[420], game);

  // Match-v5-like data for the same game
  const mk = (
    p: CurrentGameParticipant,
    position: string,
    stats: Partial<MatchParticipant>
  ): MatchParticipant => ({
    puuid: p.puuid,
    championId: p.championId,
    championName: CHAMPIONS[p.championId] || `Champion${p.championId}`,
    teamId: p.teamId,
    teamPosition: position,
    summoner1Id: p.spell1Id,
    summoner2Id: p.spell2Id,
    kills: 2, deaths: 4, assists: 6,
    totalMinionsKilled: 150, neutralMinionsKilled: 0,
    visionScore: 20, goldEarned: 10500, totalDamageDealtToChampions: 15000,
    champLevel: 15,
    win: p.teamId === 100,
    ...stats,
  });

  const matchData: MatchData = {
    metadata: { matchId: 'EUW1_PREVIEW' },
    info: {
      gameCreation: Date.now() - 34 * 60 * 1000,
      gameDuration: 34 * 60 + 12,
      gameMode: 'CLASSIC',
      queueId: 420,
      participants: [
        mk(blue[0], 'TOP', {}),
        mk(blue[1], 'JUNGLE', { neutralMinionsKilled: 120, totalMinionsKilled: 30 }),
        mk(blue[2], 'MIDDLE', {
          kills: 9, deaths: 3, assists: 12, totalMinionsKilled: 245, goldEarned: 14200,
          totalDamageDealtToChampions: 28400, visionScore: 24, champLevel: 17,
          tripleKills: 1, firstBloodKill: true, goldAt15: 5800,
          perks: { styles: [
            { description: 'primaryStyle', style: 8000, selections: [{ perk: 8010 }, { perk: 9111 }, { perk: 9104 }, { perk: 8014 }] },
            { description: 'subStyle', style: 8400, selections: [{ perk: 8444 }, { perk: 8451 }] },
          ] },
          challenges: { soloKills: 3, killParticipation: 0.68 },
        }),
        mk(blue[3], 'BOTTOM', {}),
        mk(blue[4], 'UTILITY', { totalMinionsKilled: 30, visionScore: 70 }),
        mk(red[0], 'TOP', {}),
        mk(red[1], 'JUNGLE', {}),
        mk(red[2], 'MIDDLE', {
          kills: 3, deaths: 7, assists: 4, totalMinionsKilled: 198, goldEarned: 11800,
          totalDamageDealtToChampions: 19100, champLevel: 15, goldAt15: 5100,
        }),
        mk(red[3], 'BOTTOM', {}),
        mk(red[4], 'UTILITY', {}),
      ],
    },
  };

  const playerStats = matchData.info.participants[2];
  playerStats.soloDeaths = 1;

  await sendGameEndNotification({
    player,
    matchData,
    playerStats,
    gameMode: QUEUE_NAMES[420],
    rankInfo: { tier: 'EMERALD', division: 'II', lp: 67 },
    lpChange: 22,
  });

  console.log('\n🧪 Preview done');
}

// Main loop
async function main(): Promise<void> {
  console.log('🎰 JohnnyFF15 Game Watcher Started');
  console.log(`   Game check: every ${CHECK_INTERVAL / 1000} seconds`);
  console.log(`   Command check: every ${COMMAND_CHECK_INTERVAL / 1000} seconds`);
  console.log(`   Rank sync: every 24 hours`);
  console.log(`   Wealth tax check: every hour (runs on Sundays)`);
  console.log('   Press Ctrl+C to stop\n');

  // Validate config
  if (!RIOT_API_KEY) {
    console.error('❌ VITE_RIOT_API_KEY not set!');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials not set!');
    process.exit(1);
  }

  // Load champion data from Data Dragon
  await loadChampionData();

  if (PREVIEW_MODE) {
    await runPreview();
    process.exit(0);
  }

  // Initial check
  await checkAllPlayers();

  // Schedule periodic game checks
  setInterval(checkAllPlayers, CHECK_INTERVAL);

  // Schedule command processing
  setInterval(processCommands, COMMAND_CHECK_INTERVAL);

  // Sync ranks on startup and schedule every 24 hours
  await syncRanksForAllPlayers();
  setInterval(syncRanksForAllPlayers, RANK_SYNC_INTERVAL);

  // Check wealth tax on startup and schedule periodic checks
  await checkAndApplyWeeklyWealthTax();
  setInterval(checkAndApplyWeeklyWealthTax, WEALTH_TAX_CHECK_INTERVAL);
}

main().catch(console.error);
