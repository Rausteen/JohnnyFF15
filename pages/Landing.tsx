import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2, Trophy, Users, History, Wifi, WifiOff, Swords, BarChart3, Crown, Shield, Target, TrendingUp, Eye } from 'lucide-react';
import { useAuthStore } from '../services/authStore';
import { useGameStore, PlayerGameState } from '../services/gameStore';
import { getChampionName, getQueueName } from '../services/riotApi';
import { supabase } from '../services/supabase';
import { TrackedPlayer, RANK_LABELS, RANK_COLORS, RANK_TIERS } from '../types';

// Rank badge component
const RankBadge = ({ tier, division, size = 'md' }: { tier?: string | null; division?: string | null; size?: 'sm' | 'md' | 'lg' }) => {
  if (!tier) return <span className="text-zinc-600 text-xs">Unranked</span>;

  const colorClass = RANK_COLORS[tier as keyof typeof RANK_COLORS] || 'text-zinc-400';
  const label = RANK_LABELS[tier as keyof typeof RANK_LABELS] || tier;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses[size]} rounded-full bg-zinc-800/80 border border-zinc-700/50 font-bold ${colorClass}`}>
      <Crown className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      {label} {division || ''}
    </span>
  );
};

// Player card for the grid
const PlayerCard = ({ player, gameState, recentStats }: {
  player: TrackedPlayer;
  gameState?: PlayerGameState;
  recentStats?: { wins: number; losses: number; avgKDA: string } | null;
}) => {
  const isInGame = gameState?.isInGame || false;
  const currentGame = gameState?.currentGame;
  const championId = currentGame?.participants?.find(p => p.puuid === player.puuid)?.championId;
  const championName = championId ? getChampionName(championId) : null;
  const gameMode = currentGame ? getQueueName(currentGame.gameQueueConfigId) : null;
  const gameTimeMinutes = currentGame ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60) : 0;

  return (
    <div className={`relative group rounded-2xl border transition-all duration-300 overflow-hidden ${
      isInGame
        ? 'bg-gradient-to-b from-green-900/30 to-zinc-900/90 border-green-500/40 shadow-lg shadow-green-500/10'
        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
    }`}>
      {/* Live indicator */}
      {isInGame && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
          </span>
          <span className="text-xs font-bold text-green-400 uppercase">Live</span>
        </div>
      )}

      <div className="p-5">
        {/* Player header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white ${
            isInGame
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30'
              : 'bg-gradient-to-br from-zinc-700 to-zinc-800'
          }`}>
            {player.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white font-bold text-lg truncate">{player.displayName}</div>
            <div className="text-zinc-500 text-sm truncate">{player.gameName}#{player.tagLine}</div>
          </div>
        </div>

        {/* Rank */}
        <div className="mb-4">
          <RankBadge tier={player.soloTier} division={player.soloDivision} />
        </div>

        {/* In-game info */}
        {isInGame && currentGame ? (
          <div className="bg-green-900/20 rounded-xl p-3 border border-green-500/20 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 text-sm font-bold flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4" />
                En game
              </span>
              <span className="text-green-300/70 text-xs font-mono">{gameTimeMinutes} min</span>
            </div>
            {championName && (
              <div className="flex items-center gap-2">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${championName.replace(/['\s.]/g, '')}.png`}
                  alt={championName}
                  className="w-8 h-8 rounded-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <div className="text-white text-sm font-bold">{championName}</div>
                  <div className="text-zinc-400 text-xs">{gameMode}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-zinc-600 text-sm mb-3">
            <WifiOff className="w-3.5 h-3.5" />
            Hors game
          </div>
        )}

        {/* Recent stats */}
        {recentStats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-xs text-zinc-500">W/L</div>
              <div className="font-mono font-bold text-sm">
                <span className="text-green-400">{recentStats.wins}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-red-400">{recentStats.losses}</span>
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-xs text-zinc-500">WR</div>
              <div className={`font-mono font-bold text-sm ${
                recentStats.wins + recentStats.losses > 0 && recentStats.wins / (recentStats.wins + recentStats.losses) >= 0.5
                  ? 'text-green-400' : 'text-red-400'
              }`}>
                {recentStats.wins + recentStats.losses > 0
                  ? Math.round((recentStats.wins / (recentStats.wins + recentStats.losses)) * 100)
                  : 0}%
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-xs text-zinc-500">KDA</div>
              <div className="font-mono font-bold text-sm text-white">{recentStats.avgKDA}</div>
            </div>
          </div>
        )}
      </div>

      {/* View profile link */}
      <Link
        to="/player-stats"
        className="block px-5 py-3 text-center text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/50 border-t border-zinc-800/50 transition-colors"
      >
        Voir les stats
      </Link>
    </div>
  );
};

const Landing = () => {
  const { user } = useAuthStore();
  const { trackedPlayers, playerStates, isPolling, loadTrackedPlayers, startPolling, isAnyPlayerInGame, getPlayersInGame } = useGameStore();
  const [recentStats, setRecentStats] = useState<Map<string, { wins: number; losses: number; avgKDA: string }>>(new Map());

  // Load config and start polling on mount
  useEffect(() => {
    const init = async () => {
      await loadTrackedPlayers();
    };
    init();
  }, []);

  useEffect(() => {
    if (trackedPlayers.length > 0 && !isPolling) {
      startPolling(30000);
    }
  }, [trackedPlayers.length, isPolling]);

  // Load recent stats for all players
  useEffect(() => {
    if (trackedPlayers.length === 0) return;
    const loadStats = async () => {
      const statsMap = new Map<string, { wins: number; losses: number; avgKDA: string }>();
      for (const player of trackedPlayers) {
        if (!player.puuid) continue;
        const { data } = await supabase
          .from('johnny_matches')
          .select('kills, deaths, assists, win')
          .eq('puuid', player.puuid)
          .eq('queue_id', 420)
          .order('game_creation', { ascending: false })
          .limit(20);

        if (data && data.length > 0) {
          const wins = data.filter(m => m.win).length;
          const losses = data.length - wins;
          const avgK = (data.reduce((s, m) => s + m.kills, 0) / data.length).toFixed(1);
          const avgD = (data.reduce((s, m) => s + m.deaths, 0) / data.length).toFixed(1);
          const avgA = (data.reduce((s, m) => s + m.assists, 0) / data.length).toFixed(1);
          statsMap.set(player.puuid, { wins, losses, avgKDA: `${avgK}/${avgD}/${avgA}` });
        }
      }
      setRecentStats(statsMap);
    };
    loadStats();
  }, [trackedPlayers]);

  // Get players currently in game
  const playersInGameStates = getPlayersInGame();
  const isInGame = isAnyPlayerInGame();

  // Sort players: in-game first, then by rank
  const sortedPlayers = [...trackedPlayers].filter(p => p.isActive).sort((a, b) => {
    const aInGame = a.puuid ? playerStates.get(a.puuid)?.isInGame : false;
    const bInGame = b.puuid ? playerStates.get(b.puuid)?.isInGame : false;
    if (aInGame && !bInGame) return -1;
    if (!aInGame && bInGame) return 1;
    // Sort by rank tier
    const aRank = RANK_TIERS.indexOf(a.soloTier as any);
    const bRank = RANK_TIERS.indexOf(b.soloTier as any);
    return bRank - aRank;
  });

  return (
    <div className="flex flex-col">
      {/* LIVE GAME BANNER */}
      {isInGame && (
        <div className="bg-gradient-to-r from-green-900/50 via-green-800/30 to-green-900/50 border-b border-green-500/30 py-4 relative z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Gamepad2 className="w-8 h-8 text-green-400" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-black text-lg">
                      {playersInGameStates.length === 1
                        ? `${playersInGameStates[0].player.displayName} EST EN GAME !`
                        : `${playersInGameStates.length} JOUEURS EN GAME !`}
                    </span>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">LIVE</span>
                  </div>
                  <div className="text-green-300/70 text-sm">
                    {playersInGameStates.map(ps => ps.player.displayName).join(', ')}
                  </div>
                </div>
              </div>
              <Link
                to={user ? "/dashboard" : "/login"}
                className="px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                VOIR LA GAME
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPolling ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPolling ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
            </span>
            Surveillance active : {trackedPlayers.filter(p => p.isActive).length} joueur{trackedPlayers.filter(p => p.isActive).length > 1 ? 's' : ''}
          </div>

          <h1 className="text-4xl md:text-6xl font-black leading-none tracking-tighter text-white mb-4">
            TRACK TON<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
              SQUAD
            </span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed mb-8">
            Suis tes potes en temps r&eacute;el. Ranks, games live, stats, et notifications Discord d&egrave;s que quelqu'un lance une game.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link
              to="/player-stats"
              className="w-full sm:w-auto group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-black text-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 text-white"
            >
              <BarChart3 className="w-5 h-5" />
              STATS JOUEURS
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link to="/history" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-2">
              <History className="w-5 h-5" />
              Historique
            </Link>

            {user && (
              <Link to="/dashboard" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-center gap-2">
                <Swords className="w-5 h-5" />
                Paris
              </Link>
            )}
          </div>
        </div>

        {/* Players Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Joueurs track&eacute;s
            </h2>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <div className={`w-2 h-2 rounded-full ${isInGame ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`}></div>
              {isInGame ? `${playersInGameStates.length} en game` : 'Personne en game'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPlayers.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                gameState={player.puuid ? playerStates.get(player.puuid) : undefined}
                recentStats={player.puuid ? recentStats.get(player.puuid) : undefined}
              />
            ))}
          </div>

          {sortedPlayers.length === 0 && (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Aucun joueur track&eacute;</h3>
              <p className="text-zinc-400">Ajoutez des joueurs depuis la page Admin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="relative z-10 py-10 bg-gradient-to-r from-zinc-900/50 via-cyan-500/5 to-zinc-900/50 border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-3xl md:text-4xl font-black text-cyan-400 mb-1">{trackedPlayers.filter(p => p.isActive).length}</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">Joueurs track&eacute;s</div>
            </div>
            <div className="p-4">
              <div className="text-3xl md:text-4xl font-black text-green-400 mb-1">{playersInGameStates.length}</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">En game</div>
            </div>
            <div className="p-4">
              <div className="text-3xl md:text-4xl font-black text-purple-400 mb-1">24/7</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">Surveillance</div>
            </div>
            <div className="p-4">
              <div className="text-3xl md:text-4xl font-black text-amber-400 mb-1">Discord</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">Notifs instant</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20 bg-black/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4">COMMENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">CA MARCHE</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-cyan-500/30 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-cyan-500/20">
                <Users className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">1. Track tes potes</h3>
              <p className="text-zinc-400 leading-relaxed">
                Ajoute les Riot ID de ton squad. Le bot surveille automatiquement s'ils sont en game, leur rank, leurs stats.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-green-500/30 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-green-500/20">
                <Wifi className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">2. Notifs en temps r&eacute;el</h3>
              <p className="text-zinc-400 leading-relaxed">
                D&egrave;s qu'un joueur lance une game, tout le monde re&ccedil;oit une notif Discord avec le champion, le mode, et les stats post-game.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-purple-500/30 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-purple-500/20">
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">3. Suis la progression</h3>
              <p className="text-zinc-400 leading-relaxed">
                Ranks, winrate, KDA, champions jou&eacute;s... Tout est track&eacute; et affich&eacute; pour comparer les perfs de chacun.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA - Login */}
      {!user && (
        <div className="relative z-10 py-16 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                REJOINS LE SQUAD
              </h2>
              <p className="text-lg text-zinc-400 mb-8">
                Connecte-toi pour acc&eacute;der aux stats d&eacute;taill&eacute;es, au Dashboard et aux paris entre potes.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-lg rounded-xl hover:scale-105 transition-transform shadow-xl shadow-cyan-500/20"
              >
                <Users className="w-6 h-6" />
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12 text-center border-t border-white/5 bg-black text-zinc-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <Gamepad2 className="w-5 h-5" />
          <span className="font-bold">JohnnyFF15</span>
        </div>
        <p className="max-w-md mx-auto px-4">
          Tracker de squad LoL entre potes. Surveillance 24/7, notifs Discord, stats et paris.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
