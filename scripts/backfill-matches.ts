/**
 * Backfill Match History Script
 *
 * Fetches historical matches for all tracked players from Riot API
 * and stores them in johnny_matches with full detailed stats.
 *
 * Only fetches Ranked Solo/Duo (420) and Ranked Flex (440).
 *
 * Usage:
 *   npx tsx scripts/backfill-matches.ts
 *
 * Options:
 *   --reset    Clear all existing johnny_matches before backfilling
 *   --count=N  Number of matches per queue per player (default: 80)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env') });

const RIOT_API_KEY = process.env.VITE_RIOT_API_KEY || process.env.RIOT_API_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Rate limiting: 100 requests per 2 minutes = 1 request per 1.2s to be safe
// Each match needs 2 API calls (match details + timeline for solo deaths)
const REQUEST_INTERVAL_MS = 1300;
let lastRequestTime = 0;
let totalRequests = 0;

// Champion name mapping (same as game-watcher)
const CHAMPIONS: Record<number, string> = {
  1: 'Annie', 2: 'Olaf', 3: 'Galio', 4: 'Twisted Fate', 5: 'Xin Zhao',
  6: 'Urgot', 7: 'LeBlanc', 8: 'Vladimir', 9: 'Fiddlesticks', 10: 'Kayle',
  11: 'Master Yi', 12: 'Alistar', 13: 'Ryze', 14: 'Sion', 15: 'Sivir',
  16: 'Soraka', 17: 'Teemo', 18: 'Tristana', 19: 'Warwick', 20: 'Nunu & Willump',
  21: 'Miss Fortune', 22: 'Ashe', 23: 'Tryndamere', 24: 'Jax', 25: 'Morgana',
  26: 'Zilean', 27: 'Singed', 28: 'Evelynn', 29: 'Twitch', 30: 'Karthus',
  31: "Cho'Gath", 32: 'Amumu', 33: 'Rammus', 34: 'Anivia', 35: 'Shaco',
  36: 'Dr. Mundo', 37: 'Sona', 38: 'Kassadin', 39: 'Irelia', 40: 'Janna',
  41: 'Gangplank', 42: 'Corki', 43: 'Karma', 44: 'Taric', 45: 'Veigar',
  48: 'Trundle', 50: 'Swain', 51: 'Caitlyn', 53: 'Blitzcrank', 54: 'Malphite',
  55: 'Katarina', 56: 'Nocturne', 57: 'Maokai', 58: 'Renekton', 59: 'Jarvan IV',
  60: 'Elise', 61: 'Orianna', 62: 'Wukong', 63: 'Brand', 64: 'Lee Sin',
  67: 'Vayne', 68: 'Rumble', 69: 'Cassiopeia', 72: 'Skarner', 74: 'Heimerdinger',
  75: 'Nasus', 76: 'Nidalee', 77: 'Udyr', 78: 'Poppy', 79: 'Gragas',
  80: 'Pantheon', 81: 'Ezreal', 82: 'Mordekaiser', 83: 'Yorick', 84: 'Akali',
  85: 'Kennen', 86: 'Garen', 89: 'Leona', 90: 'Malzahar', 91: 'Talon',
  92: 'Riven', 96: "Kog'Maw", 98: 'Shen', 99: 'Lux', 101: 'Xerath',
  102: 'Shyvana', 103: 'Ahri', 104: 'Graves', 105: 'Fizz', 106: 'Volibear',
  107: 'Rengar', 110: 'Varus', 111: 'Nautilus', 112: 'Viktor', 113: 'Sejuani',
  114: 'Fiora', 115: 'Ziggs', 117: 'Lulu', 119: 'Draven', 120: 'Hecarim',
  121: "Kha'Zix", 122: 'Darius', 126: 'Jayce', 127: 'Lissandra', 131: 'Diana',
  133: 'Quinn', 134: 'Syndra', 136: 'Aurelion Sol', 141: 'Kayn', 142: 'Zoe',
  143: 'Zyra', 145: "Kai'Sa", 147: 'Seraphine', 150: 'Gnar', 154: 'Zac',
  157: 'Yasuo', 161: "Vel'Koz", 163: 'Taliyah', 164: 'Camille', 166: 'Akshan',
  200: "Bel'Veth", 201: 'Braum', 202: 'Jhin', 203: 'Kindred', 221: 'Zeri',
  222: 'Jinx', 223: 'Tahm Kench', 233: 'Briar', 234: 'Viego', 235: 'Senna',
  236: 'Lucian', 238: 'Zed', 240: 'Kled', 245: 'Ekko', 246: 'Qiyana',
  254: 'Vi', 266: 'Aatrox', 267: 'Nami', 268: 'Azir', 350: 'Yuumi',
  360: 'Samira', 412: 'Thresh', 420: 'Illaoi', 421: "Rek'Sai", 427: 'Ivern',
  429: 'Kalista', 432: 'Bard', 497: 'Rakan', 498: 'Xayah', 516: 'Ornn',
  517: 'Sylas', 518: 'Neeko', 523: 'Aphelios', 526: 'Rell', 555: 'Pyke',
  711: 'Vex', 777: 'Yone', 875: 'Sett', 876: 'Lillia', 887: 'Gwen',
  888: 'Renata Glasc', 895: 'Nilah', 897: "K'Sante", 901: 'Smolder',
  902: 'Milio', 910: 'Hwei', 950: 'Naafiri', 893: 'Aurora'
};

// Queues we care about
const RANKED_QUEUES = [420, 440]; // Solo/Duo, Flex
const QUEUE_NAMES: Record<number, string> = { 420: 'Solo/Duo', 440: 'Flex' };

const ROUTING_MAP: Record<string, string> = {
  EUW: 'europe', EUNE: 'europe', NA: 'americas', KR: 'asia',
};

// ============================================================
// Rate-limited fetch
// ============================================================
async function riotFetch(url: string): Promise<Response | null> {
  const now = Date.now();
  const wait = REQUEST_INTERVAL_MS - (now - lastRequestTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  totalRequests++;

  try {
    const response = await fetch(url, {
      headers: { 'X-Riot-Token': RIOT_API_KEY }
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '10', 10);
      console.log(`  ⏳ Rate limited! Waiting ${retryAfter}s...`);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return riotFetch(url); // Retry
    }

    if (!response.ok) {
      console.error(`  ❌ API error ${response.status}: ${url.split('?')[0]}`);
      return null;
    }

    return response;
  } catch (err) {
    console.error(`  ❌ Fetch error:`, err);
    return null;
  }
}

// ============================================================
// Riot API calls
// ============================================================
async function getMatchIds(puuid: string, region: string, queue: number, start: number, count: number): Promise<string[]> {
  const routing = ROUTING_MAP[region] || 'europe';
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${queue}&start=${start}&count=${count}`;
  const resp = await riotFetch(url);
  if (!resp) return [];
  return resp.json();
}

async function getMatchDetails(matchId: string, region: string): Promise<any | null> {
  const routing = ROUTING_MAP[region] || 'europe';
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  const resp = await riotFetch(url);
  if (!resp) return null;
  return resp.json();
}

async function getMatchTimeline(matchId: string, region: string): Promise<any | null> {
  const routing = ROUTING_MAP[region] || 'europe';
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
  const resp = await riotFetch(url);
  if (!resp) return null;
  return resp.json();
}

function countSoloDeaths(timelineData: any, puuid: string): number {
  if (!timelineData?.info?.participants || !timelineData?.info?.frames) return 0;

  const participant = timelineData.info.participants.find((p: any) => p.puuid === puuid);
  if (!participant) return 0;

  const participantId = participant.participantId;
  let soloDeaths = 0;

  for (const frame of timelineData.info.frames) {
    for (const event of frame.events || []) {
      if (event.type === 'CHAMPION_KILL' &&
          event.victimId === participantId &&
          (!event.assistingParticipantIds || event.assistingParticipantIds.length === 0)) {
        soloDeaths++;
      }
    }
  }

  return soloDeaths;
}

// ============================================================
// Build johnny_matches row
// ============================================================
function buildMatch(matchData: any, puuid: string, playerName: string, soloDeaths: number) {
  const playerStats = matchData.info.participants.find((p: any) => p.puuid === puuid);
  if (!playerStats) return null;

  const team = matchData.info.participants.filter((p: any) => p.teamId === playerStats.teamId);
  const teamKills = team.reduce((sum: number, p: any) => sum + p.kills, 0);
  const teamDamage = team.reduce((sum: number, p: any) => sum + p.totalDamageDealtToChampions, 0);
  const kp = teamKills > 0 ? (playerStats.kills + playerStats.assists) / teamKills : 0;
  const teamDmgPct = teamDamage > 0 ? playerStats.totalDamageDealtToChampions / teamDamage : 0;

  // Precise top damage calculations
  const maxTeamDamage = Math.max(...team.map((p: any) => p.totalDamageDealtToChampions));
  const maxGameDamage = Math.max(...matchData.info.participants.map((p: any) => p.totalDamageDealtToChampions));

  return {
    id: matchData.metadata.matchId,
    puuid,
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
    double_kills: playerStats.doubleKills || 0,
    triple_kills: playerStats.tripleKills || 0,
    quadra_kills: playerStats.quadraKills || 0,
    penta_kills: playerStats.pentaKills || 0,
    solo_kills: playerStats.challenges?.soloKills || 0,
    first_blood_kill: playerStats.firstBloodKill === true,
    kill_participation: Math.round(kp * 10000) / 100,
    team_damage_pct: Math.round(teamDmgPct * 10000) / 100,
    damage_taken: playerStats.totalDamageTaken || 0,
    wards_placed: playerStats.wardsPlaced || 0,
    wards_killed: playerStats.wardsKilled || 0,
    solo_deaths: soloDeaths,
    is_top_damage_team: playerStats.totalDamageDealtToChampions === maxTeamDamage,
    is_top_damage_game: playerStats.totalDamageDealtToChampions === maxGameDamage,
    created_at: new Date().toISOString()
  };
}

// ============================================================
// Main backfill logic
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');
  const countArg = args.find(a => a.startsWith('--count='));
  const matchesPerQueue = countArg ? parseInt(countArg.split('=')[1], 10) : 80;

  console.log('🔄 JohnnyFF15 Match Backfill');
  console.log(`   Matches per queue per player: ${matchesPerQueue}`);
  console.log(`   Queues: ${RANKED_QUEUES.map(q => QUEUE_NAMES[q]).join(', ')}`);
  console.log(`   Rate limit: ~${Math.round(60000 / REQUEST_INTERVAL_MS)} req/min`);
  console.log('');

  if (!RIOT_API_KEY) {
    console.error('❌ RIOT_API_KEY not set in .env');
    process.exit(1);
  }

  // Get tracked players
  const { data: players, error } = await supabase
    .from('tracked_players')
    .select('*')
    .eq('is_active', true);

  if (error || !players?.length) {
    console.error('❌ No tracked players found:', error);
    process.exit(1);
  }

  console.log(`👥 Found ${players.length} tracked players\n`);

  // Reset if requested
  if (shouldReset) {
    console.log('🗑️  Resetting johnny_matches...');
    const { error: delError } = await supabase
      .from('johnny_matches')
      .delete()
      .not('id', 'is', null);
    if (delError) console.error('  Delete error:', delError);
    else console.log('  ✅ Table cleared\n');
  }

  // Cache match details and timelines to avoid re-fetching same game for multiple players
  const matchCache = new Map<string, any>();
  const timelineCache = new Map<string, any>();
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const player of players) {
    if (!player.puuid) {
      console.log(`⚠️  ${player.display_name}: no PUUID, skipping`);
      continue;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 ${player.display_name} (${player.region})`);

    for (const queue of RANKED_QUEUES) {
      const queueName = QUEUE_NAMES[queue];
      console.log(`\n  📋 Fetching ${queueName} match IDs...`);

      // Fetch match IDs in batches of 100
      const allMatchIds: string[] = [];
      let start = 0;
      const batchSize = 100;

      while (allMatchIds.length < matchesPerQueue) {
        const remaining = matchesPerQueue - allMatchIds.length;
        const count = Math.min(batchSize, remaining);
        const ids = await getMatchIds(player.puuid, player.region, queue, start, count);

        if (ids.length === 0) break;
        allMatchIds.push(...ids);
        start += ids.length;

        // If we got fewer than requested, no more matches available
        if (ids.length < count) break;
      }

      console.log(`  📊 Found ${allMatchIds.length} ${queueName} matches`);

      if (allMatchIds.length === 0) continue;

      // Fetch and insert each match
      let inserted = 0;
      let skipped = 0;

      for (let i = 0; i < allMatchIds.length; i++) {
        const matchId = allMatchIds[i];

        // Progress indicator
        if (i % 10 === 0) {
          const pct = Math.round((i / allMatchIds.length) * 100);
          console.log(`  ⏳ [${pct}%] Processing match ${i + 1}/${allMatchIds.length} (${totalRequests} API calls total)`);
        }

        // Get match details (from cache or API)
        let matchData = matchCache.get(matchId);
        if (!matchData) {
          matchData = await getMatchDetails(matchId, player.region);
          if (!matchData) {
            skipped++;
            continue;
          }
          matchCache.set(matchId, matchData);
        }

        // Get timeline for solo deaths (from cache or API)
        let timelineData = timelineCache.get(matchId);
        if (!timelineData) {
          timelineData = await getMatchTimeline(matchId, player.region);
          if (timelineData) {
            timelineCache.set(matchId, timelineData);
          }
        }

        const soloDeaths = timelineData ? countSoloDeaths(timelineData, player.puuid) : 0;

        // Build the row
        const row = buildMatch(matchData, player.puuid, player.display_name, soloDeaths);
        if (!row) {
          skipped++;
          continue;
        }

        // Insert (skip duplicates)
        const { error: insertError } = await supabase
          .from('johnny_matches')
          .insert([row]);

        if (insertError) {
          if (insertError.code === '23505') {
            skipped++; // Duplicate
          } else {
            console.error(`  ❌ Insert error for ${matchId}:`, insertError.message);
            skipped++;
          }
        } else {
          inserted++;
        }
      }

      console.log(`  ✅ ${queueName}: ${inserted} inserted, ${skipped} skipped`);
      totalInserted += inserted;
      totalSkipped += skipped;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏁 Backfill complete!`);
  console.log(`   Total inserted: ${totalInserted}`);
  console.log(`   Total skipped: ${totalSkipped}`);
  console.log(`   Total API calls: ${totalRequests}`);
  console.log(`   Match cache hits: ${matchCache.size} unique matches`);
}

main().catch(console.error);
