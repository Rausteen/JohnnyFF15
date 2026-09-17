/**
 * Send a Discord summary for the tracked LoL squad.
 *
 * Three embeds: overall record + leaderboard, player of the week, awards.
 *
 * Usage:
 *   npm run squad-summary
 *   npm run squad-summary -- --days=1
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  loadLolAssets,
  getChampionDisplayName,
  getChampionIconUrl,
  getProfileIconUrl,
  getRankEmblemUrl,
  formatRank,
  formatK,
  formatSigned,
  progressBar,
  DISCORD_COLORS,
} from './lib/lolAssets';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const DISCORD_WEBHOOK_URL = process.env.VITE_DISCORD_WEBHOOK_URL;
const SITE_URL = process.env.VITE_SITE_URL || 'https://johnnyff15.fr';

const daysArg = process.argv.find(arg => arg.startsWith('--days='));
const days = daysArg ? Number(daysArg.split('=')[1]) : 7;
// --preview: build the message from mock data (no Supabase) and print it if no webhook is configured
const PREVIEW_MODE = process.argv.includes('--preview');

if (!PREVIEW_MODE && (!SUPABASE_URL || !SUPABASE_ANON_KEY || !DISCORD_WEBHOOK_URL)) {
  console.error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or VITE_DISCORD_WEBHOOK_URL');
  process.exit(1);
}
interface MatchRow {
  champion_name: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  damage_dealt: number;
  vision_score: number;
  cs: number;
  game_duration: number;
  game_creation: number;
  penta_kills: number | null;
  solo_deaths: number | null;
  game_ended_surrender: boolean | null;
  team_position: string | null;
  lane_gold_diff: number | null;
  lp_change: number | null;
}

interface PlayerRow {
  id: string;
  display_name: string;
  puuid: string | null;
  solo_tier: string | null;
  solo_division: string | null;
  solo_lp: number | null;
}

interface PlayerSummary {
  player: PlayerRow;
  name: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kda: number;
  lpChange: number | null;
  playtimeSec: number;
  favorite: { champion: string; games: number; wins: number } | null;
  bestGame: MatchRow;
  matches: MatchRow[];
}

const supabase = PREVIEW_MODE ? null : createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
const since = Date.now() - days * 24 * 60 * 60 * 1000;

await loadLolAssets();

const players = await loadPlayers();
const summaries: PlayerSummary[] = [];

for (const player of players) {
  if (!player.puuid) continue;

  const matches = PREVIEW_MODE ? mockMatches(player) : await fetchMatches(player.puuid);
  if (!matches.length) continue;

  const games = matches.length;
  const wins = matches.filter(m => m.win).length;
  const kills = sum(matches, 'kills');
  const deaths = sum(matches, 'deaths');
  const assists = sum(matches, 'assists');
  const lpRows = matches.filter(m => m.lp_change != null);

  summaries.push({
    player,
    name: player.display_name,
    games,
    wins,
    losses: games - wins,
    winRate: Math.round((wins / games) * 100),
    kda: (kills + assists) / Math.max(1, deaths),
    lpChange: lpRows.length ? sum(lpRows, 'lp_change') : null,
    playtimeSec: sum(matches, 'game_duration'),
    favorite: getFavoriteChampion(matches),
    bestGame: [...matches].sort((a, b) => scoreGame(b) - scoreGame(a))[0],
    matches,
  });
}

if (summaries.length === 0) {
  console.log(`No games found in the last ${days} day(s).`);
  process.exit(0);
}

// Leaderboard: who gained the most (net wins), then win rate, then activity
summaries.sort((a, b) =>
  (b.wins - b.losses) - (a.wins - a.losses) || b.winRate - a.winRate || b.games - a.games
);

const totalGames = summaries.reduce((s, p) => s + p.games, 0);
const totalWins = summaries.reduce((s, p) => s + p.wins, 0);
const totalLosses = totalGames - totalWins;
const totalPlaytimeSec = summaries.reduce((s, p) => s + p.playtimeSec, 0);
const squadWinRate = totalWins / Math.max(1, totalGames);
const hasLpData = summaries.some(p => p.lpChange != null);
const allMatches = summaries.flatMap(p => p.matches.map(m => ({ ...m, playerName: p.name })));

const periodLabel = days === 7 ? 'DE LA SEMAINE' : days === 1 ? 'DU JOUR' : `DES ${days} DERNIERS JOURS`;
const dateFrom = new Date(since).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
const dateTo = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

// ============================================
// Embed 1 — Overall record + leaderboard
// ============================================
const leaderboardRow = (cells: string[]) => {
  const cols = [
    cells[0].padEnd(3),
    cells[1].padEnd(10),
    cells[2].padStart(3),
    cells[3].padStart(5),
    cells[4].padStart(5),
    cells[5].padStart(5),
  ];
  if (hasLpData) cols.push(cells[6].padStart(6));
  return cols.join(' ');
};

const leaderboardLines = [
  leaderboardRow(['#', 'Joueur', 'G', 'W-L', 'WR', 'KDA', 'LP']),
  ...summaries.slice(0, 10).map((p, i) => leaderboardRow([
    `${i + 1}.`,
    truncate(p.name, 10),
    String(p.games),
    `${p.wins}-${p.losses}`,
    `${p.winRate}%`,
    p.kda.toFixed(1),
    p.lpChange != null ? formatSigned(p.lpChange) : '—',
  ])),
];

const overviewEmbed = {
  title: `📊 BILAN ${periodLabel}`,
  url: SITE_URL,
  description: [
    `**${totalGames} games** · **${totalWins} W** / **${totalLosses} L** · ⏱️ **${formatPlaytime(totalPlaytimeSec)}** de jeu`,
    `\`${progressBar(squadWinRate, 12)}\` **${Math.round(squadWinRate * 100)} %** de winrate squad`,
    `📅 ${dateFrom} → ${dateTo}`,
  ].join('\n'),
  color: squadWinRate >= 0.5 ? DISCORD_COLORS.GREEN : DISCORD_COLORS.RED,
  fields: [
    { name: '🏆 Classement', value: codeBlock(leaderboardLines.join('\n')), inline: false },
  ],
  footer: { text: 'JohnnyFF15 · Squad Tracker' },
  timestamp: new Date().toISOString(),
};

// ============================================
// Embed 2 — Player of the week
// ============================================
const best = summaries[0];
const bestFavorite = best.favorite;
const bestLines = [
  `**${best.games} games** · **${best.winRate} %** WR · KDA **${best.kda.toFixed(2)}** · ⏱️ ${formatPlaytime(best.playtimeSec)}`,
];
if (bestFavorite) {
  bestLines.push(`🎯 Champion favori : **${champName(bestFavorite.champion)}** (${bestFavorite.games} game${bestFavorite.games > 1 ? 's' : ''}, ${Math.round((bestFavorite.wins / bestFavorite.games) * 100)} % WR)`);
}
bestLines.push(`🔥 Meilleure game : **${champName(best.bestGame.champion_name)}** ${formatKda(best.bestGame)} · ${formatK(best.bestGame.damage_dealt)} dégâts (${best.bestGame.win ? 'win' : 'lose'})`);
if (best.lpChange != null) bestLines.push(`📈 LP sur la période : **${formatSigned(best.lpChange)}**`);


const playerOfTheWeekEmbed = {
  author: {
    name: formatRank(best.player.solo_tier, best.player.solo_division, best.player.solo_lp),
    icon_url: getRankEmblemUrl(best.player.solo_tier),
  },
  title: `⭐ JOUEUR ${periodLabel} — ${best.name.toUpperCase()}`,
  url: getPlayerProfileUrl(best.player.id),
  description: bestLines.join('\n'),
  color: DISCORD_COLORS.GOLD,
  thumbnail: { url: getChampionIconUrl(bestFavorite?.champion || best.bestGame.champion_name) },
};

// ============================================
// Embed 3 — Awards
// ============================================
const awards: Array<{ name: string; value: string; inline: boolean }> = [];

const gameOfTheWeek = [...allMatches].sort((a, b) => scoreGame(b) - scoreGame(a))[0];
awards.push(award('🔥 Game de la semaine', gameOfTheWeek.playerName, `${champName(gameOfTheWeek.champion_name)} · ${formatKda(gameOfTheWeek)}`));

const damageGame = [...allMatches].sort((a, b) => b.damage_dealt - a.damage_dealt)[0];
awards.push(award('💥 Machine à dégâts', damageGame.playerName, `${champName(damageGame.champion_name)} · ${formatK(damageGame.damage_dealt)} dégâts`));

const feedGame = [...allMatches].sort((a, b) => b.deaths - a.deaths)[0];
awards.push(award('💀 Feeder', feedGame.playerName, `${champName(feedGame.champion_name)} · ${formatKda(feedGame)}${feedGame.solo_deaths ? ` · ${feedGame.solo_deaths} morts solo` : ''}`));

const laneGames = allMatches.filter(m => m.lane_gold_diff != null);
if (laneGames.length) {
  const biggestGap = [...laneGames].sort((a, b) => b.lane_gold_diff! - a.lane_gold_diff!)[0];
  const mostGapped = [...laneGames].sort((a, b) => a.lane_gold_diff! - b.lane_gold_diff!)[0];
  if (biggestGap.lane_gold_diff! > 0) {
    awards.push(award('🔨 Plus gros gap', biggestGap.playerName, `${champName(biggestGap.champion_name)} · ${formatSigned(biggestGap.lane_gold_diff!, formatK)} gold vs lane`));
  }
  if (mostGapped.lane_gold_diff! < 0) {
    awards.push(award('😬 Le plus gappé', mostGapped.playerName, `${champName(mostGapped.champion_name)} · ${formatSigned(mostGapped.lane_gold_diff!, formatK)} gold vs lane`));
  }
}

const noLife = [...summaries].sort((a, b) => b.playtimeSec - a.playtimeSec)[0];if (summaries.length > 1) {  awards.push(award('🕹️ No-life', noLife.name, `${formatPlaytime(noLife.playtimeSec)} · ${noLife.games} games`));}
const spammer = summaries
  .filter(p => p.favorite)
  .sort((a, b) => b.favorite!.games - a.favorite!.games)[0];
if (spammer && spammer.favorite!.games >= 3) {
  awards.push(award('🎯 Spammeur', spammer.name, `${champName(spammer.favorite!.champion)} · ${spammer.favorite!.games} games`));
}

const ffCount = new Map<string, number>();
for (const m of allMatches) {
  if (m.game_ended_surrender && !m.win) ffCount.set(m.playerName, (ffCount.get(m.playerName) || 0) + 1);
}
const ffKing = [...ffCount.entries()].sort((a, b) => b[1] - a[1])[0];
if (ffKing && ffKing[1] >= 2) {
  awards.push(award('🏳️ Roi du FF', ffKing[0], `${ffKing[1]} games rendues`));
}

const awardsEmbed = {
  title: '🎖️ AWARDS',
  color: DISCORD_COLORS.PURPLE,
  fields: awards.slice(0, 9),
  footer: { text: `JohnnyFF15 · ${new Date().toLocaleDateString('fr-FR')}` },
};

const payload = {
  username: 'JohnnyFF15 Bot',
  avatar_url: getProfileIconUrl(),
  ...(PREVIEW_MODE ? { content: '🧪 **TEST** — aperçu du bilan hebdo (données fictives)' } : {}),
  embeds: [overviewEmbed, playerOfTheWeekEmbed, awardsEmbed],
};

if (!DISCORD_WEBHOOK_URL) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const response = await fetch(DISCORD_WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  console.error(`Discord webhook error: ${response.status} ${await response.text()}`);
  process.exit(1);
}

console.log(`Sent squad summary for ${summaries.length} player(s), ${totalGames} total game rows.`);

// ============================================
// Helpers
// ============================================

async function loadPlayers(): Promise<PlayerRow[]> {
  if (PREVIEW_MODE) return mockPlayers();

  const { data, error } = await supabase!
    .from('tracked_players')
    .select('id, display_name, puuid, solo_tier, solo_division, solo_lp')
    .eq('is_active', true);

  if (error) throw error;
  return (data || []) as PlayerRow[];
}

async function fetchMatches(puuid: string): Promise<MatchRow[]> {
  const baseColumns = 'champion_name, kills, deaths, assists, win, damage_dealt, vision_score, cs, game_duration, game_creation, penta_kills, solo_deaths, game_ended_surrender';
  const laneColumns = ', team_position, lane_gold_diff, lp_change';

  const query = (columns: string) => supabase!
    .from('johnny_matches')
    .select(columns)
    .eq('puuid', puuid)
    .gte('game_creation', since)
    .order('game_creation', { ascending: false })
    .then(res => ({ rows: (res.data || []) as unknown as Partial<MatchRow>[], error: res.error }));

  let { rows, error } = await query(baseColumns + laneColumns);

  // Columns from supabase/migrations/add_match_lane_stats.sql not applied yet
  if (error && /column/i.test(error.message || '')) {
    console.warn(`Lane columns missing (${error.message}) - run supabase/migrations/add_match_lane_stats.sql`);
    ({ rows, error } = await query(baseColumns));
  }

  if (error) {
    console.error(`Error fetching matches for ${puuid}:`, error.message);
    return [];
  }

  return rows.map(row => ({
    champion_name: row.champion_name || 'Unknown',
    kills: row.kills || 0,
    deaths: row.deaths || 0,
    assists: row.assists || 0,
    win: !!row.win,
    damage_dealt: row.damage_dealt || 0,
    vision_score: row.vision_score || 0,
    cs: row.cs || 0,
    game_duration: row.game_duration || 0,
    game_creation: row.game_creation || 0,
    penta_kills: row.penta_kills ?? null,
    solo_deaths: row.solo_deaths ?? null,
    game_ended_surrender: row.game_ended_surrender ?? null,
    team_position: row.team_position ?? null,
    lane_gold_diff: row.lane_gold_diff ?? null,
    lp_change: row.lp_change ?? null,
  }));
}

function sum<T extends object>(rows: T[], key: keyof T): number {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function scoreGame(match: MatchRow): number {
  return (match.kills + match.assists) / Math.max(1, match.deaths)
    + (match.win ? 1.5 : 0)
    + (match.damage_dealt || 0) / 25000
    + (match.penta_kills || 0) * 3;
}

function getFavoriteChampion(matches: MatchRow[]): PlayerSummary['favorite'] {
  const counts = new Map<string, { games: number; wins: number }>();
  for (const match of matches) {
    const entry = counts.get(match.champion_name) || { games: 0, wins: 0 };
    entry.games++;
    if (match.win) entry.wins++;
    counts.set(match.champion_name, entry);
  }
  const top = [...counts.entries()].sort((a, b) => b[1].games - a[1].games)[0];
  return top ? { champion: top[0], ...top[1] } : null;
}

function award(name: string, playerName: string, detail: string) {
  return { name, value: `**${playerName}**\n${detail}`, inline: true };
}

function champName(name: string): string {
  return getChampionDisplayName(name);
}

function formatKda(match: MatchRow): string {
  return `${match.kills}/${match.deaths}/${match.assists}`;
}
function formatPlaytime(seconds: number): string {  const hours = Math.floor(seconds / 3600);  const minutes = Math.round((seconds % 3600) / 60);  return hours > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${minutes} min`;}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function codeBlock(text: string): string {
  const fence = '`'.repeat(3);
  return `${fence}\n${text}\n${fence}`;
}

function getPlayerProfileUrl(playerId: string): string {
  const cleanBase = SITE_URL.replace(/\/$/, '').replace(/#\/.*$/, '');
  return `${cleanBase}/#/players/${playerId}`;
}

// ============================================
// Preview data (--preview)
// ============================================

function mockPlayers(): PlayerRow[] {
  return [
    { id: 'p1', display_name: 'Johnny', puuid: 'p1', solo_tier: 'EMERALD', solo_division: 'II', solo_lp: 67 },
    { id: 'p2', display_name: 'Paul', puuid: 'p2', solo_tier: 'GOLD', solo_division: 'I', solo_lp: 12 },
    { id: 'p3', display_name: 'Marc', puuid: 'p3', solo_tier: 'PLATINUM', solo_division: 'IV', solo_lp: 80 },
    { id: 'p4', display_name: 'Léa', puuid: 'p4', solo_tier: null, solo_division: null, solo_lp: null },
  ];
}

function mockMatches(player: PlayerRow): MatchRow[] {
  const base = (over: Partial<MatchRow>): MatchRow => ({
    champion_name: 'Yasuo', kills: 5, deaths: 5, assists: 8, win: true, damage_dealt: 18000,
    vision_score: 22, cs: 180, game_duration: 1800, game_creation: Date.now() - 3600_000,
    penta_kills: 0, solo_deaths: 1, game_ended_surrender: false,
    team_position: 'MIDDLE', lane_gold_diff: 500, lp_change: 20,
    ...over,
  });
  const sets: Record<string, MatchRow[]> = {
    p1: [
      base({ kills: 12, deaths: 2, assists: 8, damage_dealt: 32000, lane_gold_diff: 4200, lp_change: 24 }),
      base({ kills: 7, deaths: 4, assists: 10, lp_change: 21 }),
      base({ champion_name: 'Zed', kills: 3, deaths: 6, assists: 2, win: false, lane_gold_diff: -1200, lp_change: -18 }),
      base({ kills: 9, deaths: 3, assists: 12, lp_change: 22 }),
      base({ champion_name: 'MonkeyKing', team_position: 'TOP', kills: 4, deaths: 5, assists: 9, lp_change: 19 }),
      base({ kills: 6, deaths: 1, assists: 4, lp_change: 23 }),
    ],
    p2: [
      base({ champion_name: 'Darius', team_position: 'TOP', kills: 8, deaths: 3, assists: 2, lane_gold_diff: 3100, lp_change: 25 }),
      base({ champion_name: 'Darius', team_position: 'TOP', kills: 2, deaths: 8, assists: 3, win: false, lane_gold_diff: -2900, lp_change: -20, game_ended_surrender: true }),
      base({ champion_name: 'Garen', team_position: 'TOP', kills: 5, deaths: 5, assists: 5, win: false, lp_change: -17, game_ended_surrender: true }),
      base({ champion_name: 'Darius', team_position: 'TOP', kills: 6, deaths: 4, assists: 4, lp_change: 22 }),
    ],
    p3: [
      base({ champion_name: 'Jinx', team_position: 'BOTTOM', kills: 2, deaths: 14, assists: 3, win: false, damage_dealt: 9000, lane_gold_diff: -3800, lp_change: -22, solo_deaths: 5 }),
      base({ champion_name: 'Jinx', team_position: 'BOTTOM', kills: 4, deaths: 9, assists: 6, win: false, lp_change: -19 }),
      base({ champion_name: 'Kaisa', team_position: 'BOTTOM', kills: 11, deaths: 4, assists: 7, damage_dealt: 41200, lp_change: 21 }),
      base({ champion_name: 'Jinx', team_position: 'BOTTOM', kills: 3, deaths: 7, assists: 4, win: false, lp_change: -20, game_ended_surrender: true }),
      base({ champion_name: 'Jinx', team_position: 'BOTTOM', kills: 6, deaths: 6, assists: 8, win: false, lp_change: -18, game_ended_surrender: true }),
    ],
    p4: [
      base({ champion_name: 'Thresh', team_position: 'UTILITY', kills: 1, deaths: 4, assists: 18, vision_score: 70, cs: 30, lp_change: null }),
      base({ champion_name: 'Thresh', team_position: 'UTILITY', kills: 0, deaths: 6, assists: 12, win: false, vision_score: 55, cs: 25, lp_change: null }),
    ],
  };
  return sets[player.id] || [];
}
