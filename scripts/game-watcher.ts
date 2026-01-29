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
const CHECK_INTERVAL = 45000; // 45 seconds

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Track notified games to avoid duplicates
const notifiedGames = new Set<string>();

// Track previous game state for each player (to detect game end)
const previousGameState = new Map<string, { isInGame: boolean; gameId: string | null }>();

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
  400: 'Normal Draft',
  430: 'Normal Blind',
  450: 'ARAM',
  900: 'URF',
  1700: 'Arena',
};

// Champion name from ID (loaded from Data Dragon)
let CHAMPIONS: Record<number, string> = {};

// Fetch champion data from Data Dragon
async function loadChampionData(): Promise<void> {
  try {
    // Get latest version
    const versionsRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await versionsRes.json();
    const latestVersion = versions[0];

    // Fetch champion data
    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
    const champData = await champRes.json();

    // Build ID -> name mapping
    for (const [name, data] of Object.entries(champData.data)) {
      const champ = data as { key: string; name: string };
      CHAMPIONS[parseInt(champ.key, 10)] = champ.name;
    }

    console.log(`✅ Loaded ${Object.keys(CHAMPIONS).length} champions from Data Dragon (v${latestVersion})`);
  } catch (error) {
    console.error('Failed to load champion data:', error);
    // Fallback to basic champions
    CHAMPIONS = {
      1: 'Annie', 2: 'Olaf', 3: 'Galio', 4: 'Twisted Fate', 5: 'Xin Zhao',
      6: 'Urgot', 7: 'LeBlanc', 8: 'Vladimir', 9: 'Fiddlesticks', 10: 'Kayle'
    };
  }
}

interface TrackedPlayer {
  id: string;
  puuid: string;
  game_name: string;
  tag_line: string;
  region: string;
  display_name: string;
  is_active: boolean;
}

interface CurrentGameInfo {
  gameId: number;
  gameStartTime: number;
  gameQueueConfigId: number;
  participants: Array<{
    puuid: string;
    championId: number;
  }>;
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

async function checkCurrentGame(puuid: string, region: string, retries = 2): Promise<CurrentGameInfo | null> {
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
      return null;
    }

    if (!response.ok) {
      console.error(`Riot API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking game:', error);
    return null;
  }
}

function getChampionImageUrl(championName: string): string {
  const normalized = championName.replace(/['\s.]/g, '');
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${normalized}.png`;
}

async function sendDiscordNotification(
  playerNames: string[],
  championNames: string[],
  gameMode: string,
  gameId: number
): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('No Discord webhook configured');
    return;
  }

  const isMultiple = playerNames.length > 1;
  const playersUpper = playerNames.map(p => p.toUpperCase()).join(' & ');
  const playersList = playerNames.join(' et ');
  const playersWithChamps = playerNames.map((p, i) => {
    const champ = championNames[i];
    return champ ? `${p} (${champ})` : p;
  }).join(', ');

  const fields = [
    { name: '🎮 Mode de jeu', value: gameMode || 'Ranked Solo/Duo', inline: true },
    { name: '👥 Joueurs', value: playersWithChamps, inline: true },
  ];

  if (championNames.length > 0) {
    fields.push({
      name: '🏆 Champion' + (championNames.length > 1 ? 's' : ''),
      value: championNames.join(', '),
      inline: true,
    });
  }

  fields.push(
    { name: '⏱️ Temps restant', value: '4 minutes pour parier', inline: true },
    { name: '🔗 Parier maintenant', value: '[Ouvrir JohnnyFF15](https://johnnyff15.fr/#/dashboard)', inline: false }
  );

  const thumbnailUrl = championNames.length > 0
    ? getChampionImageUrl(championNames[0])
    : 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png';

  const payload = {
    username: 'JohnnyFF15 Bot',
    avatar_url: 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png',
    content: '<@&1466416446094442578>',
    embeds: [{
      title: isMultiple
        ? `🎰 ${playersUpper} SONT EN GAME ENSEMBLE !`
        : `🎰 ${playersUpper} EST EN GAME !`,
      description: isMultiple
        ? `Les paris sont ouverts pendant **4 minutes** !\n\n**${playersList} jouent ensemble ! Viens parier sur leurs feeds !**`
        : `Les paris sont ouverts pendant **4 minutes** !\n\n**Viens parier sur le feed de ${playersList} !**`,
      color: 0x22c55e,
      fields,
      thumbnail: { url: thumbnailUrl },
      footer: { text: 'JohnnyFF15 - Le casino du feed' },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`✅ Discord notification sent for game ${gameId}`);
    } else {
      console.error(`Discord webhook error: ${response.status}`);
    }
  } catch (error) {
    console.error('Discord notification error:', error);
  }
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

// Get match details from Riot API
async function getMatchDetails(matchId: string, region: string): Promise<unknown | null> {
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

    return await response.json();
  } catch (error) {
    console.error('Error fetching match details:', error);
    return null;
  }
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

    const matchIds = await getMatchHistory(player.puuid, player.region, 1);
    if (!matchIds || matchIds.length === 0) {
      console.log(`  ⚠️ No matches found for ${player.display_name}`);
      continue;
    }

    const latestMatchId = matchIds[0];
    const matchKey = `${latestMatchId}_${player.puuid}`;

    if (existingKeys.has(matchKey)) {
      console.log(`  ✓ Match already synced for ${player.display_name}`);
      continue;
    }

    const matchData = await getMatchDetails(latestMatchId, player.region) as {
      metadata: { matchId: string };
      info: {
        gameCreation: number;
        gameDuration: number;
        gameMode: string;
        queueId: number;
        gameEndedInSurrender?: boolean;
        participants: Array<{
          puuid: string;
          championId: number;
          championName: string;
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
          teamEarlySurrendered?: boolean;
          teamId: number;
        }>;
      };
    } | null;
    if (!matchData) {
      console.log(`  ⚠️ Could not fetch match for ${player.display_name}`);
      continue;
    }

    const playerStats = matchData.info.participants.find((p: { puuid: string }) => p.puuid === player.puuid);
    if (!playerStats) continue;

    const team = matchData.info.participants.filter((p: { teamId: number }) => p.teamId === playerStats.teamId);
    const teamKills = team.reduce((sum: number, p: { kills: number }) => sum + p.kills, 0);

    const johnnyMatch = {
      id: matchData.metadata.matchId,
      puuid: player.puuid,
      player_name: player.display_name,
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
      created_at: new Date().toISOString()
    };

    // Use insert instead of upsert to allow same match_id for different players
    const { error } = await supabase
      .from('johnny_matches')
      .insert([johnnyMatch]);

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

    // Small delay between players
    await new Promise(r => setTimeout(r, 300));
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

      case 'get_puuid': {
        const { gameName, tagLine, region } = command.params as { gameName: string; tagLine: string; region: string };
        if (!gameName || !tagLine || !region) {
          result = { success: false, message: 'Paramètres manquants: gameName, tagLine, region' };
        } else {
          result = await getPuuidFromRiotId(gameName, tagLine, region);
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
async function sendGameEndNotification(
  playerName: string,
  championName: string,
  win: boolean,
  kills: number,
  deaths: number,
  assists: number,
  gameMode: string
): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return;

  const result = win ? '🏆 VICTOIRE' : '💀 DÉFAITE';
  const color = win ? 0x22c55e : 0xef4444;
  const kda = `${kills}/${deaths}/${assists}`;

  const payload = {
    username: 'JohnnyFF15 Bot',
    avatar_url: 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png',
    embeds: [{
      title: `${result} - ${playerName.toUpperCase()}`,
      description: `La game de **${playerName}** est terminée !\n\nLes paris ont été résolus automatiquement.`,
      color,
      fields: [
        { name: '🎮 Mode', value: gameMode, inline: true },
        { name: '🏆 Champion', value: championName, inline: true },
        { name: '📊 KDA', value: kda, inline: true },
      ],
      thumbnail: { url: getChampionImageUrl(championName) },
      footer: { text: 'JohnnyFF15 - Les paris sont résolus' },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`✅ Game end notification sent for ${playerName}`);
  } catch (error) {
    console.error('Discord notification error:', error);
  }
}

// Resolve bets for a specific match
async function resolveBetsForMatch(
  matchData: {
    metadata: { matchId: string };
    info: {
      gameDuration: number;
      gameMode: string;
      queueId: number;
      participants: Array<{
        puuid: string;
        championId: number;
        championName: string;
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
        teamId: number;
      }>;
    };
  },
  playerPuuid: string,
  playerName: string
): Promise<{ resolved: number; errors: number }> {
  const playerStats = matchData.info.participants.find(p => p.puuid === playerPuuid);
  if (!playerStats) {
    console.error(`Could not find player stats for ${playerName}`);
    return { resolved: 0, errors: 1 };
  }

  // Get pending bets for this player
  const { data: pendingBets, error: betsError } = await supabase
    .from('bets')
    .select('*')
    .eq('player_puuid', playerPuuid)
    .eq('status', 'PENDING');

  if (betsError) {
    console.error('Error fetching pending bets:', betsError);
    return { resolved: 0, errors: 1 };
  }

  if (!pendingBets || pendingBets.length === 0) {
    console.log(`  No pending bets for ${playerName}`);
    return { resolved: 0, errors: 0 };
  }

  console.log(`  📊 Resolving ${pendingBets.length} bets for ${playerName}...`);

  let resolved = 0;
  let errors = 0;

  for (const bet of pendingBets) {
    try {
      // Determine if bet won based on bet type and actual stats
      let won = false;
      let actualValue: number | boolean = 0;

      switch (bet.bet_type) {
        case 'deaths_over':
          actualValue = playerStats.deaths;
          won = playerStats.deaths > bet.threshold;
          break;
        case 'deaths_under':
          actualValue = playerStats.deaths;
          won = playerStats.deaths < bet.threshold;
          break;
        case 'kills_over':
          actualValue = playerStats.kills;
          won = playerStats.kills > bet.threshold;
          break;
        case 'kills_under':
          actualValue = playerStats.kills;
          won = playerStats.kills < bet.threshold;
          break;
        case 'win':
          actualValue = playerStats.win;
          won = playerStats.win === true;
          break;
        case 'lose':
          actualValue = playerStats.win;
          won = playerStats.win === false;
          break;
        case 'first_blood_victim':
          actualValue = playerStats.firstBloodVictim === true;
          won = playerStats.firstBloodVictim === true;
          break;
        case 'kda_over':
          const kda = playerStats.deaths === 0
            ? playerStats.kills + playerStats.assists
            : (playerStats.kills + playerStats.assists) / playerStats.deaths;
          actualValue = kda;
          won = kda > bet.threshold;
          break;
        case 'kda_under':
          const kdaUnder = playerStats.deaths === 0
            ? playerStats.kills + playerStats.assists
            : (playerStats.kills + playerStats.assists) / playerStats.deaths;
          actualValue = kdaUnder;
          won = kdaUnder < bet.threshold;
          break;
        default:
          console.warn(`  Unknown bet type: ${bet.bet_type}`);
          continue;
      }

      // Calculate payout
      const payout = won ? Math.floor(bet.amount * bet.odds) : 0;

      // Update bet status
      const { error: updateError } = await supabase
        .from('bets')
        .update({
          status: won ? 'won' : 'lost',
          actual_value: actualValue,
          payout,
          resolved_at: new Date().toISOString(),
          match_id: matchData.metadata.matchId,
        })
        .eq('id', bet.id);

      if (updateError) {
        console.error(`  Error updating bet ${bet.id}:`, updateError);
        errors++;
        continue;
      }

      // If won, add credits to user
      if (won && payout > 0) {
        const { error: creditError } = await supabase.rpc('add_credits_to_user', {
          p_user_id: bet.user_id,
          p_amount: payout,
        });

        if (creditError) {
          // Fallback: direct update
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', bet.user_id)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({ credits: profile.credits + payout })
              .eq('id', bet.user_id);
          }
        }
      }

      console.log(`  ${won ? '✅' : '❌'} Bet ${bet.bet_type}: ${won ? 'WON' : 'LOST'} (actual: ${actualValue}, threshold: ${bet.threshold})`);
      resolved++;
    } catch (error) {
      console.error(`  Error resolving bet ${bet.id}:`, error);
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

  // Fetch last match
  const matchIds = await getMatchHistory(player.puuid, player.region, 1);
  if (!matchIds || matchIds.length === 0) {
    console.error(`  ❌ No match found for ${player.display_name}`);
    return;
  }

  const matchId = matchIds[0];
  const matchData = await getMatchDetails(matchId, player.region) as {
    metadata: { matchId: string };
    info: {
      gameCreation: number;
      gameDuration: number;
      gameMode: string;
      queueId: number;
      gameEndedInSurrender?: boolean;
      participants: Array<{
        puuid: string;
        championId: number;
        championName: string;
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
        teamEarlySurrendered?: boolean;
        teamId: number;
      }>;
    };
  } | null;

  if (!matchData) {
    console.error(`  ❌ Could not fetch match data for ${player.display_name}`);
    return;
  }

  const playerStats = matchData.info.participants.find(p => p.puuid === player.puuid);
  if (!playerStats) {
    console.error(`  ❌ Player not found in match participants`);
    return;
  }

  // Save match to johnny_matches
  const team = matchData.info.participants.filter(p => p.teamId === playerStats.teamId);
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);

  const johnnyMatch = {
    id: matchData.metadata.matchId,
    puuid: player.puuid,
    player_name: player.display_name,
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
    created_at: new Date().toISOString()
  };

  const { error: saveError } = await supabase
    .from('johnny_matches')
    .insert([johnnyMatch]);

  if (saveError && saveError.code !== '23505') {
    console.error(`  ❌ Error saving match:`, saveError);
  } else {
    console.log(`  ✅ Match saved: ${playerStats.kills}/${playerStats.deaths}/${playerStats.assists}`);
  }

  // Resolve bets
  const { resolved, errors } = await resolveBetsForMatch(matchData, player.puuid, player.display_name);
  console.log(`  📊 Bets resolved: ${resolved} (${errors} errors)`);

  // Send game end notification
  const gameMode = QUEUE_NAMES[matchData.info.queueId] || matchData.info.gameMode || 'Normal';
  const championName = playerStats.championName || CHAMPIONS[playerStats.championId] || 'Unknown';
  await sendGameEndNotification(
    player.display_name,
    championName,
    playerStats.win,
    playerStats.kills,
    playerStats.deaths,
    playerStats.assists,
    gameMode
  );
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
  const gameGroups = new Map<number, { players: TrackedPlayer[]; game: CurrentGameInfo; champions: string[] }>();

  // Track players whose games ended (to handle after the loop)
  const gameEndedPlayers: { player: TrackedPlayer; previousGameId: string }[] = [];

  for (const player of players) {
    if (!player.puuid) continue;

    const game = await checkCurrentGame(player.puuid, player.region);

    // Get previous state
    const prevState = previousGameState.get(player.id);
    const wasInGame = prevState?.isInGame || false;
    const previousGameId = prevState?.gameId || null;

    if (game) {
      const gameId = game.gameId;
      const participant = game.participants.find(p => p.puuid === player.puuid);
      const championName = participant ? (CHAMPIONS[participant.championId] || `Champion${participant.championId}`) : '';

      if (!gameGroups.has(gameId)) {
        gameGroups.set(gameId, { players: [], game, champions: [] });
      }

      const group = gameGroups.get(gameId)!;
      group.players.push(player);
      group.champions.push(championName);

      const name = player.display_name || player.game_name || 'Unknown';
      console.log(`  🎮 ${name} is in game (${QUEUE_NAMES[game.gameQueueConfigId] || 'Unknown'})`);
      await updateGameStatusInSupabase(player.id, true, String(gameId), game);

      // Update previous state
      previousGameState.set(player.id, { isInGame: true, gameId: String(gameId) });
    } else {
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
  for (const [gameId, { players: gamePlayers, game, champions }] of gameGroups) {
    const notifKey = `${gameId}`;

    if (!notifiedGames.has(notifKey)) {
      notifiedGames.add(notifKey);

      const playerNames = gamePlayers.map(p => p.display_name || p.game_name || 'Joueur').filter(Boolean);
      const gameMode = QUEUE_NAMES[game.gameQueueConfigId] || 'Normal';

      await sendDiscordNotification(playerNames, champions, gameMode, gameId);

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

// Main loop
async function main(): Promise<void> {
  console.log('🎰 JohnnyFF15 Game Watcher Started');
  console.log(`   Game check: every ${CHECK_INTERVAL / 1000} seconds`);
  console.log(`   Command check: every ${COMMAND_CHECK_INTERVAL / 1000} seconds`);
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

  // Initial check
  await checkAllPlayers();

  // Schedule periodic game checks
  setInterval(checkAllPlayers, CHECK_INTERVAL);

  // Schedule command processing
  setInterval(processCommands, COMMAND_CHECK_INTERVAL);
}

main().catch(console.error);
