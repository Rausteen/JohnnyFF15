import React, { useEffect, useState, useMemo } from 'react';
import { BarChart3, User, Loader2, Target, Skull, Swords, Eye, Coins, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../services/gameStore';
import { supabase } from '../services/supabase';
import { getDetailedPlayerOdds } from '../services/dataOddsService';
import { MOCK_PROPS } from '../services/mockData';
import { TrackedPlayer } from '../types';

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

const PlayerStats = () => {
  const { trackedPlayers, loadTrackedPlayers } = useGameStore();
  const [selectedPlayer, setSelectedPlayer] = useState<TrackedPlayer | null>(null);
  const [selectedQueue, setSelectedQueue] = useState(420);
  const [loading, setLoading] = useState(false);
  const [matchStats, setMatchStats] = useState<PlayerMatchStats | null>(null);
  const [propDetails, setPropDetails] = useState<PropDetail[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [allPlayerStats, setAllPlayerStats] = useState<Map<string, { solo: PlayerMatchStats | null; flex: PlayerMatchStats | null }>>(new Map());

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
      const [stats, oddsResult] = await Promise.all([
        fetchMatchStats(selectedPlayer.puuid!, selectedQueue),
        getDetailedPlayerOdds(selectedPlayer.puuid!, selectedQueue, MOCK_PROPS)
      ]);
      setMatchStats(stats);

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
      // Sort by probability descending
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Stats Joueurs</h1>
        <p className="text-zinc-400">Statistiques et cotes data-driven par joueur</p>
      </div>

      {/* Players Overview Grid */}
      <div className="space-y-3 mb-8">
        {trackedPlayers.filter(p => p.isActive).map(player => {
          const stats = player.puuid ? allPlayerStats.get(player.puuid) : null;
          const soloStats = stats?.solo;
          const flexStats = stats?.flex;
          const totalGames = (soloStats?.gamesPlayed || 0) + (flexStats?.gamesPlayed || 0);
          const totalWins = (soloStats?.wins || 0) + (flexStats?.wins || 0);
          const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
          const isExpanded = expandedPlayer === player.puuid;

          return (
            <div key={player.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {/* Player Header - clickable */}
              <button
                onClick={() => handlePlayerClick(player)}
                className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{player.displayName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">{player.displayName}</div>
                    <div className="text-zinc-500 text-sm">
                      {player.gameName}#{player.tagLine}
                      {player.soloTier && (
                        <span className="ml-2 text-amber-400">{player.soloTier} {player.soloDivision}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
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
                  {/* Queue Selector */}
                  <div className="flex gap-2 mb-4">
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

      {trackedPlayers.filter(p => p.isActive).length === 0 && (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <User className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Aucun joueur tracked</h3>
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
