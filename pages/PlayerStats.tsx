import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, User, Loader2, Target, Skull, Swords, Eye, Coins, Shield, ChevronDown, ChevronUp, Crown, Gamepad2, WifiOff, TrendingUp, TrendingDown } from 'lucide-react';
import { useGameStore } from '../services/gameStore';
import { supabase } from '../services/supabase';
import { getDetailedPlayerOdds } from '../services/dataOddsService';
import { MOCK_PROPS } from '../services/mockData';
import { TrackedPlayer, RANK_LABELS, RANK_COLORS, RANK_TIERS } from '../types';
import { getChampionName, getQueueName } from '../services/riotApi';

interface PlayerMatchStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCs: number;
  avgCsPerMin: number;
  avgDamage: number;
  avgVision: number;
  avgGold: number;
  avgKP: number;
}

interface ChampionStats {
  championName: string;
  championId: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
}

interface PropDetail {
  propId: string;
  title: string;
  probability: number;
  odds: number;
  staticOdds: number;
  hits: number;
  gamesCount: number;
}

const QUEUE_OPTIONS = [
  { id: 420, label: 'Solo/Duo' },
  { id: 440, label: 'Flex' },
];

// Rank badge component
const RankBadge = ({ tier, division, lp, size = 'md' }: { tier?: string | null; division?: string | null; lp?: number | null; size?: 'sm' | 'md' | 'lg' }) => {
  if (!tier) return <span className="text-zinc-600 text-sm">Unranked</span>;

  const colorClass = RANK_COLORS[tier as keyof typeof RANK_COLORS] || 'text-zinc-400';
  const label = RANK_LABELS[tier as keyof typeof RANK_LABELS] || tier;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-2',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} rounded-full bg-zinc-800/80 border border-zinc-700/50 font-bold ${colorClass}`}>
      <Crown className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      {label} {division || ''}
      {lp !== null && lp !== undefined && <span className="text-zinc-400 font-normal">({lp} LP)</span>}
    </span>
  );
};

const PlayerStats = () => {
  const { trackedPlayers, loadTrackedPlayers, playerStates } = useGameStore();
  const [selectedPlayer, setSelectedPlayer] = useState<TrackedPlayer | null>(null);
  const [selectedQueue, setSelectedQueue] = useState(420);
  const [loading, setLoading] = useState(false);
  const [matchStats, setMatchStats] = useState<PlayerMatchStats | null>(null);
  const [propDetails, setPropDetails] = useState<PropDetail[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [allPlayerStats, setAllPlayerStats] = useState<Map<string, { solo: PlayerMatchStats | null; flex: PlayerMatchStats | null }>>(new Map());
  const [championStats, setChampionStats] = useState<ChampionStats[]>([]);

  useEffect(() => {
    loadTrackedPlayers();
  }, [loadTrackedPlayers]);

  // Load overview stats for all players
  useEffect(() => {
    if (trackedPlayers.length === 0) return;
    const loadAllStats = async () => {
      const statsMap = new Map<string, { solo: PlayerMatchStats | null; flex: PlayerMatchStats | null }>();
      for (const player of trackedPlayers) {
        if (!player.puuid) continue;
        const solo = await fetchMatchStats(player.puuid, 420);
        const flex = await fetchMatchStats(player.puuid, 440);
        statsMap.set(player.puuid, { solo, flex });
      }
      setAllPlayerStats(statsMap);
    };
    loadAllStats();
  }, [trackedPlayers]);

  // Load detailed stats when player/queue changes
  useEffect(() => {
    if (!selectedPlayer?.puuid) return;
    const load = async () => {
      setLoading(true);
      const [stats, oddsResult, champStats] = await Promise.all([
        fetchMatchStats(selectedPlayer.puuid!, selectedQueue),
        getDetailedPlayerOdds(selectedPlayer.puuid!, selectedQueue, MOCK_PROPS),
        fetchChampionStats(selectedPlayer.puuid!, selectedQueue)
      ]);
      setMatchStats(stats);
      setChampionStats(champStats);

      const details: PropDetail[] = oddsResult.details.map(d => {
        const prop = MOCK_PROPS.find(p => p.id === d.propId);
        return {
          propId: d.propId,
          title: prop?.title || d.propId,
          probability: d.probability,
          odds: d.odds,
          staticOdds: prop?.odds || 0,
          hits: d.hits,
          gamesCount: oddsResult.gamesCount
        };
      });
      details.sort((a, b) => b.probability - a.probability);
      setPropDetails(details);
      setLoading(false);
    };
    load();
  }, [selectedPlayer, selectedQueue]);

  const handlePlayerClick = (player: TrackedPlayer) => {
    if (selectedPlayer?.puuid === player.puuid) {
      setSelectedPlayer(null);
      setExpandedPlayer(null);
    } else {
      setSelectedPlayer(player);
      setExpandedPlayer(player.puuid);
    }
  };

  // Sort players: in-game first, then by rank
  const sortedPlayers = [...trackedPlayers].filter(p => p.isActive).sort((a, b) => {
    const aInGame = a.puuid ? playerStates.get(a.puuid)?.isInGame : false;
    const bInGame = b.puuid ? playerStates.get(b.puuid)?.isInGame : false;
    if (aInGame && !bInGame) return -1;
    if (!aInGame && bInGame) return 1;
    const aRank = RANK_TIERS.indexOf(a.soloTier as any);
    const bRank = RANK_TIERS.indexOf(b.soloTier as any);
    return bRank - aRank;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <BarChart3 className="w-8 h-8 text-cyan-400" />
          Joueurs & Stats
        </h1>
        <p className="text-zinc-400">Ranks, stats et progression de chaque joueur</p>
      </div>

      {/* Players List */}
      <div className="space-y-3 mb-8">
        {sortedPlayers.map(player => {
          const stats = player.puuid ? allPlayerStats.get(player.puuid) : null;
          const soloStats = stats?.solo;
          const flexStats = stats?.flex;
          const totalGames = (soloStats?.gamesPlayed || 0) + (flexStats?.gamesPlayed || 0);
          const totalWins = (soloStats?.wins || 0) + (flexStats?.wins || 0);
          const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
          const isExpanded = expandedPlayer === player.puuid;
          const gameState = player.puuid ? playerStates.get(player.puuid) : undefined;
          const isInGame = gameState?.isInGame || false;
          const currentGame = gameState?.currentGame;

          return (
            <div key={player.id} className={`rounded-xl border overflow-hidden transition-all ${
              isInGame
                ? 'bg-gradient-to-r from-green-900/20 to-zinc-900 border-green-500/30'
                : 'bg-zinc-900 border-zinc-800'
            }`}>
              {/* Player Header - clickable */}
              <button
                onClick={() => handlePlayerClick(player)}
                className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white ${
                    isInGame
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20'
                      : 'bg-gradient-to-br from-zinc-700 to-zinc-800'
                  }`}>
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">{player.displayName}</span>
                      {isInGame && (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400"></span>
                          </span>
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-zinc-500 text-sm">{player.gameName}#{player.tagLine}</span>
                      <RankBadge tier={player.soloTier} division={player.soloDivision} lp={player.soloLp} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* In-game info */}
                  {isInGame && currentGame && (
                    <div className="hidden sm:flex items-center gap-2 text-green-400 text-sm">
                      <Gamepad2 className="w-4 h-4" />
                      {getQueueName(currentGame.gameQueueConfigId)}
                    </div>
                  )}
                  {/* Quick stats */}
                  <div className="hidden sm:flex items-center gap-6">
                    <QuickStat label="Games" value={totalGames.toString()} />
                    <QuickStat
                      label="Win Rate"
                      value={`${winRate}%`}
                      color={winRate >= 50 ? 'text-green-400' : 'text-red-400'}
                    />
                    {soloStats && (
                      <QuickStat
                        label="KDA Moy"
                        value={`${soloStats.avgKills.toFixed(1)}/${soloStats.avgDeaths.toFixed(1)}/${soloStats.avgAssists.toFixed(1)}`}
                      />
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-zinc-800 p-4">
                  {/* Rank Display */}
                  <div className="flex items-center gap-4 mb-4 p-3 bg-zinc-800/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Crown className="w-5 h-5 text-amber-400" />
                      <span className="text-zinc-400 text-sm font-bold">Rang Solo/Duo :</span>
                    </div>
                    <RankBadge tier={player.soloTier} division={player.soloDivision} lp={player.soloLp} size="md" />
                    {player.rankUpdatedAt && (
                      <span className="text-zinc-600 text-xs ml-auto">
                        MAJ: {new Date(player.rankUpdatedAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  {/* Queue Selector */}
                  <div className="flex gap-2 mb-4">
                    <Link
                      to={`/players/${player.id}`}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110 transition"
                    >
                      Profil complet
                    </Link>
                    {QUEUE_OPTIONS.map(q => (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQueue(q.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          selectedQueue === q.id
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {q.label}
                        {q.id === 420 && soloStats && (
                          <span className="ml-2 text-xs opacity-70">{soloStats.gamesPlayed}g</span>
                        )}
                        {q.id === 440 && flexStats && (
                          <span className="ml-2 text-xs opacity-70">{flexStats.gamesPlayed}g</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <span className="ml-2 text-zinc-400">Chargement...</span>
                    </div>
                  ) : matchStats && matchStats.gamesPlayed > 0 ? (
                    <>
                      {/* Stats Overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                        <StatCard icon={<Swords className="w-4 h-4" />} label="Games" value={matchStats.gamesPlayed.toString()} />
                        <StatCard
                          icon={<Target className="w-4 h-4" />}
                          label="Win Rate"
                          value={`${Math.round((matchStats.wins / matchStats.gamesPlayed) * 100)}%`}
                          color={matchStats.wins / matchStats.gamesPlayed >= 0.5 ? 'text-green-400' : 'text-red-400'}
                        />
                        <StatCard icon={<Skull className="w-4 h-4" />} label="K/D/A" value={`${matchStats.avgKills.toFixed(1)}/${matchStats.avgDeaths.toFixed(1)}/${matchStats.avgAssists.toFixed(1)}`} />
                        <StatCard label="CS/min" value={matchStats.avgCsPerMin.toFixed(1)} />
                        <StatCard label="Damage" value={formatNumber(matchStats.avgDamage)} />
                        <StatCard icon={<Eye className="w-4 h-4" />} label="Vision" value={matchStats.avgVision.toFixed(1)} />
                        <StatCard icon={<Coins className="w-4 h-4" />} label="Gold" value={formatNumber(matchStats.avgGold)} />
                        <StatCard icon={<Shield className="w-4 h-4" />} label="KP" value={`${matchStats.avgKP.toFixed(0)}%`} />
                      </div>

                      {/* Champion Stats */}
                      {championStats.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                            <Swords className="w-4 h-4 text-amber-400" />
                            Top Champions ({selectedQueue === 420 ? 'Solo/Duo' : 'Flex'})
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {championStats.slice(0, 6).map(champ => {
                              const wr = Math.round((champ.wins / champ.gamesPlayed) * 100);
                              return (
                                <div key={champ.championName} className="flex items-center gap-3 p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
                                  <img
                                    src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${champ.championName.replace(/['\s.]/g, '')}.png`}
                                    alt={champ.championName}
                                    className="w-9 h-9 rounded-lg"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-white text-sm font-bold truncate">{champ.championName}</div>
                                    <div className="text-xs text-zinc-500">
                                      {champ.avgKills.toFixed(1)}/{champ.avgDeaths.toFixed(1)}/{champ.avgAssists.toFixed(1)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-bold font-mono ${wr >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                      {wr}%
                                    </div>
                                    <div className="text-xs text-zinc-500">{champ.gamesPlayed}G</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Odds Table */}
                      <div className="mb-2">
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-cyan-400" />
                          Cotes Data-Driven ({matchStats.gamesPlayed} games)
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800">
                              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Pari</th>
                              <th className="text-center py-2 px-2 text-zinc-500 font-medium">Freq.</th>
                              <th className="text-center py-2 px-2 text-zinc-500 font-medium">Proba</th>
                              <th className="text-center py-2 px-2 text-zinc-500 font-medium">Cote Data</th>
                              <th className="text-center py-2 px-2 text-zinc-500 font-medium">Cote Statique</th>
                              <th className="text-center py-2 px-2 text-zinc-500 font-medium">Diff</th>
                            </tr>
                          </thead>
                          <tbody>
                            {propDetails.map(d => {
                              const diff = d.staticOdds > 0 ? ((d.odds - d.staticOdds) / d.staticOdds * 100) : 0;
                              const probPct = (d.probability * 100).toFixed(1);
                              return (
                                <tr key={d.propId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                  <td className="py-2 px-3 text-white font-medium">{d.title}</td>
                                  <td className="text-center py-2 px-2 text-zinc-400">
                                    {d.hits}/{d.gamesCount}
                                  </td>
                                  <td className="text-center py-2 px-2">
                                    <ProbabilityBadge pct={parseFloat(probPct)} />
                                  </td>
                                  <td className="text-center py-2 px-2 text-cyan-400 font-mono font-bold">
                                    {d.odds.toFixed(2)}
                                  </td>
                                  <td className="text-center py-2 px-2 text-zinc-500 font-mono">
                                    {d.staticOdds.toFixed(2)}
                                  </td>
                                  <td className="text-center py-2 px-2">
                                    <span className={`text-xs font-mono ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      Aucune game en {selectedQueue === 420 ? 'Solo/Duo' : 'Flex'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sortedPlayers.length === 0 && (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <User className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Aucun joueur track&eacute;</h3>
          <p className="text-zinc-400">Ajoutez des joueurs depuis la page Admin.</p>
        </div>
      )}
    </div>
  );
};

// Fetch basic match stats from Supabase
async function fetchMatchStats(puuid: string, queueId: number): Promise<PlayerMatchStats | null> {
  const { data, error } = await supabase
    .from('johnny_matches')
    .select('kills, deaths, assists, cs, vision_score, gold_earned, damage_dealt, win, game_duration, kill_participation')
    .eq('puuid', puuid)
    .eq('queue_id', queueId)
    .order('game_creation', { ascending: false });

  if (error || !data || data.length === 0) return null;

  const games = data.length;
  const totalKills = data.reduce((s, m) => s + m.kills, 0);
  const totalDeaths = data.reduce((s, m) => s + m.deaths, 0);
  const totalAssists = data.reduce((s, m) => s + m.assists, 0);
  const totalCs = data.reduce((s, m) => s + m.cs, 0);
  const totalDuration = data.reduce((s, m) => s + (m.game_duration || 1), 0);
  const totalDamage = data.reduce((s, m) => s + m.damage_dealt, 0);
  const totalVision = data.reduce((s, m) => s + m.vision_score, 0);
  const totalGold = data.reduce((s, m) => s + m.gold_earned, 0);
  const totalKP = data.reduce((s, m) => s + (m.kill_participation || 0), 0);
  const wins = data.filter(m => m.win).length;

  return {
    gamesPlayed: games,
    wins,
    losses: games - wins,
    avgKills: totalKills / games,
    avgDeaths: totalDeaths / games,
    avgAssists: totalAssists / games,
    avgCs: totalCs / games,
    avgCsPerMin: totalCs / (totalDuration / 60),
    avgDamage: totalDamage / games,
    avgVision: totalVision / games,
    avgGold: totalGold / games,
    avgKP: totalKP / games,
  };
}

// Fetch per-champion stats
async function fetchChampionStats(puuid: string, queueId: number): Promise<ChampionStats[]> {
  const { data, error } = await supabase
    .from('johnny_matches')
    .select('champion_name, champion_id, kills, deaths, assists, win')
    .eq('puuid', puuid)
    .eq('queue_id', queueId)
    .order('game_creation', { ascending: false });

  if (error || !data || data.length === 0) return [];

  // Group by champion
  const champMap = new Map<string, { championId: number; games: typeof data }>();
  for (const match of data) {
    const name = match.champion_name;
    if (!champMap.has(name)) {
      champMap.set(name, { championId: match.champion_id, games: [] });
    }
    champMap.get(name)!.games.push(match);
  }

  const stats: ChampionStats[] = [];
  for (const [name, { championId, games }] of champMap) {
    const gamesPlayed = games.length;
    const wins = games.filter(g => g.win).length;
    stats.push({
      championName: name,
      championId,
      gamesPlayed,
      wins,
      losses: gamesPlayed - wins,
      avgKills: games.reduce((s, g) => s + g.kills, 0) / gamesPlayed,
      avgDeaths: games.reduce((s, g) => s + g.deaths, 0) / gamesPlayed,
      avgAssists: games.reduce((s, g) => s + g.assists, 0) / gamesPlayed,
    });
  }

  // Sort by games played descending
  stats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  return stats;
}

// Helper components
const QuickStat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="text-center">
    <div className={`font-mono font-bold ${color || 'text-white'}`}>{value}</div>
    <div className="text-xs text-zinc-500">{label}</div>
  </div>
);

const StatCard = ({ icon, label, value, color }: { icon?: React.ReactNode; label: string; value: string; color?: string }) => (
  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
    {icon && <div className="flex justify-center mb-1 text-zinc-500">{icon}</div>}
    <div className={`font-mono font-bold text-sm ${color || 'text-white'}`}>{value}</div>
    <div className="text-xs text-zinc-500 mt-1">{label}</div>
  </div>
);

const ProbabilityBadge = ({ pct }: { pct: number }) => {
  let color = 'text-zinc-400 bg-zinc-800';
  if (pct >= 60) color = 'text-green-400 bg-green-500/20';
  else if (pct >= 40) color = 'text-amber-400 bg-amber-500/20';
  else if (pct >= 20) color = 'text-orange-400 bg-orange-500/20';
  else if (pct > 0) color = 'text-red-400 bg-red-500/20';

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${color}`}>
      {pct}%
    </span>
  );
};

function formatNumber(num: number): string {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return Math.round(num).toString();
}

export default PlayerStats;
