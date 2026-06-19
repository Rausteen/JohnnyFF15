/**
 * Send a Discord summary for the tracked LoL squad.
 *
 * Usage:
 *   npm run squad-summary
 *   npm run squad-summary -- --days=1
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const DISCORD_WEBHOOK_URL = process.env.VITE_DISCORD_WEBHOOK_URL;
const SITE_URL = process.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/player-stats';

const daysArg = process.argv.find(arg => arg.startsWith('--days='));
const days = daysArg ? Number(daysArg.split('=')[1]) : 7;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !DISCORD_WEBHOOK_URL) {
  console.error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or VITE_DISCORD_WEBHOOK_URL');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const since = Date.now() - days * 24 * 60 * 60 * 1000;

const { data: players, error: playersError } = await supabase
  .from('tracked_players')
  .select('id, display_name, puuid, solo_tier, solo_division, solo_lp')
  .eq('is_active', true);

if (playersError) throw playersError;

const summaries = [];
let globalCarry: any = null;
let globalDisaster: any = null;
let bestDamage: any = null;
let mostDeaths: any = null;
let mostPlayedChampion: { champion: string; games: number; player: string } | null = null;
const championCounts = new Map<string, { champion: string; games: number; player: string }>();

for (const player of players || []) {
  if (!player.puuid) continue;

  const { data: matches, error } = await supabase
    .from('johnny_matches')
    .select('champion_name, kills, deaths, assists, win, damage_dealt, vision_score, cs, game_duration, game_creation')
    .eq('puuid', player.puuid)
    .gte('game_creation', since)
    .order('game_creation', { ascending: false });

  if (error || !matches?.length) continue;

  const games = matches.length;
  const wins = matches.filter(m => m.win).length;
  const kills = sum(matches, 'kills');
  const deaths = sum(matches, 'deaths');
  const assists = sum(matches, 'assists');
  const kda = (kills + assists) / Math.max(1, deaths);
  const winRate = Math.round((wins / games) * 100);
  const damage = sum(matches, 'damage_dealt');
  const vision = sum(matches, 'vision_score');
  const cs = sum(matches, 'cs');
  const durationMinutes = sum(matches, 'game_duration') / 60;
  const avgDamage = Math.round(damage / games);
  const avgVision = Math.round(vision / games);
  const avgCsPerMin = durationMinutes > 0 ? cs / durationMinutes : 0;

  const bestGame = [...matches].sort((a, b) => scoreGame(b) - scoreGame(a))[0];
  const worstGame = [...matches].sort((a, b) => scoreGame(a) - scoreGame(b))[0];
  const damageGame = [...matches].sort((a, b) => b.damage_dealt - a.damage_dealt)[0];
  const deathGame = [...matches].sort((a, b) => b.deaths - a.deaths)[0];
  const favoriteChampion = getFavoriteChampion(matches);

  if (favoriteChampion) {
    const key = `${player.display_name}:${favoriteChampion.champion}`;
    championCounts.set(key, { ...favoriteChampion, player: player.display_name });
  }

  const summary = {
    name: player.display_name,
    rank: formatRank(player),
    games,
    wins,
    losses: games - wins,
    winRate,
    kda,
    avgDamage,
    avgVision,
    avgCsPerMin,
    favoriteChampion,
    bestGame,
    worstGame,
    damageGame,
    deathGame,
    score: scorePlayer({ games, winRate, kda, avgDamage, avgCsPerMin }),
  };
  summaries.push(summary);

  if (!globalCarry || scoreGame(bestGame) > scoreGame(globalCarry.bestGame)) globalCarry = summary;
  if (!globalDisaster || scoreGame(worstGame) < scoreGame(globalDisaster.worstGame)) globalDisaster = summary;
  if (!bestDamage || damageGame.damage_dealt > bestDamage.damageGame.damage_dealt) bestDamage = summary;
  if (!mostDeaths || deathGame.deaths > mostDeaths.deathGame.deaths) mostDeaths = summary;
}

if (summaries.length === 0) {
  console.log(`No games found in the last ${days} day(s).`);
  process.exit(0);
}

for (const champ of championCounts.values()) {
  if (!mostPlayedChampion || champ.games > mostPlayedChampion.games) {
    mostPlayedChampion = champ;
  }
}

summaries.sort((a, b) => b.score - a.score || b.games - a.games);
const totalGames = summaries.reduce((s, p) => s + p.games, 0);
const totalWins = summaries.reduce((s, p) => s + p.wins, 0);
const totalLosses = summaries.reduce((s, p) => s + p.losses, 0);
const squadWinRate = Math.round((totalWins / Math.max(1, totalGames)) * 100);

const fields = summaries.slice(0, 10).map((p, index) => ({
  name: `${getPlacement(index)} ${p.name} · ${p.rank}`,
  value: [
    `**${p.games}G** · ${p.wins}W/${p.losses}L · **${p.winRate}% WR** · KDA **${p.kda.toFixed(2)}**`,
    `${formatNumber(p.avgDamage)} dmg avg · ${p.avgCsPerMin.toFixed(1)} CS/min · ${p.avgVision} vision`,
    p.favoriteChampion ? `Pick favori: ${p.favoriteChampion.champion} (${p.favoriteChampion.games} games)` : null,
  ].filter(Boolean).join('\n'),
  inline: false,
}));

fields.unshift({
  name: '🏁 Vue d’ensemble',
  value: [
    `**${totalGames}** games trackées · **${totalWins}W/${totalLosses}L** · **${squadWinRate}% WR squad**`,
    `Période: ${days} jour${days > 1 ? 's' : ''}`,
  ].join('\n'),
  inline: false,
});

fields.splice(1, 0, {
  name: '🏆 Awards',
  value: [
    `MVP: **${globalCarry.name}** sur **${globalCarry.bestGame.champion_name}** (${formatKda(globalCarry.bestGame)}, ${globalCarry.bestGame.win ? 'win' : 'lose'})`,
    `Plus gros dégâts: **${bestDamage.name}** sur **${bestDamage.damageGame.champion_name}** (${formatNumber(bestDamage.damageGame.damage_dealt)})`,
    `Game la plus suspecte: **${globalDisaster.name}** sur **${globalDisaster.worstGame.champion_name}** (${formatKda(globalDisaster.worstGame)})`,
    mostDeaths ? `Record de morts: **${mostDeaths.name}** (${mostDeaths.deathGame.deaths} deaths sur ${mostDeaths.deathGame.champion_name})` : null,
    mostPlayedChampion ? `Pick le plus spam: **${mostPlayedChampion.champion}** par ${mostPlayedChampion.player} (${mostPlayedChampion.games} games)` : null,
  ].filter(Boolean).join('\n'),
  inline: false,
});

fields.splice(2, 0, {
  name: '📈 Classement',
  value: summaries.slice(0, 5).map((p, index) => (
    `${getPlacement(index)} **${p.name}** · score ${p.score} · ${p.winRate}% WR · KDA ${p.kda.toFixed(2)}`
  )).join('\n'),
  inline: false,
});

fields.push({
  name: '🔗 Profils',
  value: `[Ouvrir les stats complètes](${SITE_URL})`,
  inline: false,
});

const bestPlayer = summaries[0];
const subtitle = [
  `${totalGames} games trackées`,
  `${totalWins}W/${totalLosses}L`,
  `${squadWinRate}% WR squad`,
  bestPlayer ? `leader: ${bestPlayer.name}` : null,
].filter(Boolean).join(' · ');

const payload = {
  username: 'JohnnyFF15 Bot',
  avatar_url: 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png',
  embeds: [{
    title: `📋 Récap squad · ${days} jour${days > 1 ? 's' : ''}`,
    description: subtitle,
    color: squadWinRate >= 50 ? 0x22c55e : 0xef4444,
    fields,
    footer: { text: `JohnnyFF15 - Squad Tracker · ${new Date().toLocaleDateString('fr-FR')}` },
    timestamp: new Date().toISOString(),
    url: SITE_URL,
  }],
};

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

function sum(rows: any[], key: string) {
  return rows.reduce((total, row) => total + (row[key] || 0), 0);
}

function scoreGame(match: any) {
  return (match.kills + match.assists) / Math.max(1, match.deaths) + (match.win ? 1.5 : 0) + (match.damage_dealt || 0) / 25000;
}

function scorePlayer(player: { games: number; winRate: number; kda: number; avgDamage: number; avgCsPerMin: number }) {
  const activity = Math.min(10, player.games) * 2;
  const winrateScore = player.winRate;
  const kdaScore = Math.min(40, player.kda * 10);
  const damageScore = Math.min(20, player.avgDamage / 1000);
  const csScore = Math.min(15, player.avgCsPerMin * 2);
  return Math.round(activity + winrateScore + kdaScore + damageScore + csScore);
}

function getFavoriteChampion(matches: any[]) {
  const counts = new Map<string, number>();
  for (const match of matches) {
    counts.set(match.champion_name, (counts.get(match.champion_name) || 0) + 1);
  }
  const [champion, games] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  return champion ? { champion, games } : null;
}

function getPlacement(index: number) {
  return ['🥇', '🥈', '🥉'][index] || `#${index + 1}`;
}

function formatRank(player: any) {
  if (!player.solo_tier) return 'Unranked';
  const division = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(player.solo_tier) ? '' : ` ${player.solo_division || ''}`;
  return `${player.solo_tier}${division} ${player.solo_lp ?? 0} LP`;
}

function formatKda(match: any) {
  return `${match.kills}/${match.deaths}/${match.assists}`;
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}
