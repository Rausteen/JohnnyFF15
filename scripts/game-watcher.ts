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
    { name: '⏱️ Temps restant', value: '3 minutes pour parier', inline: true },
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
        ? `Les paris sont ouverts pendant **3 minutes** !\n\n**${playersList} jouent ensemble ! Viens parier sur leurs feeds !**`
        : `Les paris sont ouverts pendant **3 minutes** !\n\n**Viens parier sur le feed de ${playersList} !**`,
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

async function checkAllPlayers(): Promise<void> {
  console.log(`\n[${new Date().toLocaleTimeString()}] Checking players...`);

  const players = await getTrackedPlayers();
  if (players.length === 0) {
    console.log('No tracked players found');
    return;
  }

  // Group players by game
  const gameGroups = new Map<number, { players: TrackedPlayer[]; game: CurrentGameInfo; champions: string[] }>();

  for (const player of players) {
    if (!player.puuid) continue;

    const game = await checkCurrentGame(player.puuid, player.region);

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
    } else {
      const name = player.display_name || player.game_name || 'Unknown';
      console.log(`  ⏸️  ${name} not in game`);
      await updateGameStatusInSupabase(player.id, false, null, null);
    }

    // Delay between players to avoid rate limiting (500ms)
    await new Promise(r => setTimeout(r, 500));
  }

  // Send notifications for new games
  for (const [gameId, { players, game, champions }] of gameGroups) {
    const notifKey = `${gameId}`;

    if (!notifiedGames.has(notifKey)) {
      notifiedGames.add(notifKey);

      const playerNames = players.map(p => p.display_name || p.game_name || 'Joueur').filter(Boolean);
      const gameMode = QUEUE_NAMES[game.gameQueueConfigId] || 'Normal';

      await sendDiscordNotification(playerNames, champions, gameMode, gameId);

      // Clean up old notifications after 1 hour
      setTimeout(() => notifiedGames.delete(notifKey), 60 * 60 * 1000);
    }
  }
}

// Main loop
async function main(): Promise<void> {
  console.log('🎰 JohnnyFF15 Game Watcher Started');
  console.log(`   Checking every ${CHECK_INTERVAL / 1000} seconds`);
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

  // Schedule periodic checks
  setInterval(checkAllPlayers, CHECK_INTERVAL);
}

main().catch(console.error);
