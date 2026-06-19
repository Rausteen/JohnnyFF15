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

for (const player of players || []) {
  if (!player.puuid) continue;

  const { data: matches, error } = await supabase
    .from('johnny_matches')
    .select('champion_name, kills, deaths, assists, win, damage_dealt, game_creation')
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

  const bestGame = [...matches].sort((a, b) => scoreGame(b) - scoreGame(a))[0];
  const worstGame = [...matches].sort((a, b) => scoreGame(a) - scoreGame(b))[0];
  const damageGame = [...matches].sort((a, b) => b.damage_dealt - a.damage_dealt)[0];

  const summary = {
    name: player.display_name,
    rank: formatRank(player),
    games,
    wins,
    losses: games - wins,
    winRate,
    kda,
    bestGame,
    worstGame,
    damageGame,
  };
  summaries.push(summary);

  if (!globalCarry || scoreGame(bestGame) > scoreGame(globalCarry.bestGame)) globalCarry = summary;
  if (!globalDisaster || scoreGame(worstGame) < scoreGame(globalDisaster.worstGame)) globalDisaster = summary;
  if (!bestDamage || damageGame.damage_dealt > bestDamage.damageGame.damage_dealt) bestDamage = summary;
}

if (summaries.length === 0) {
  console.log(`No games found in the last ${days} day(s).`);
  process.exit(0);
}

summaries.sort((a, b) => b.games - a.games || b.winRate - a.winRate);
const totalGames = summaries.reduce((s, p) => s + p.games, 0);

const fields = summaries.slice(0, 12).map(p => ({
  name: `${p.name} · ${p.rank}`,
  value: `${p.games} games · ${p.wins}W/${p.losses}L · ${p.winRate}% WR · KDA ${p.kda.toFixed(2)}`,
  inline: false,
}));

fields.unshift({
  name: 'Highlights',
  value: [
    `MVP: **${globalCarry.name}** sur ${globalCarry.bestGame.champion_name} (${formatKda(globalCarry.bestGame)})`,
    `Plus gros dégâts: **${bestDamage.name}** (${formatNumber(bestDamage.damageGame.damage_dealt)})`,
    `Game suspecte: **${globalDisaster.name}** sur ${globalDisaster.worstGame.champion_name} (${formatKda(globalDisaster.worstGame)})`,
  ].join('\n'),
  inline: false,
});

const payload = {
  username: 'JohnnyFF15 Bot',
  avatar_url: 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png',
  embeds: [{
    title: `📋 Récap squad · ${days} jour${days > 1 ? 's' : ''}`,
    description: `${totalGames} games trackées. Le projet respire encore.`,
    color: 0x06b6d4,
    fields,
    footer: { text: 'JohnnyFF15 - Squad Tracker' },
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
  return (match.kills + match.assists) / Math.max(1, match.deaths) + (match.win ? 1 : 0);
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
