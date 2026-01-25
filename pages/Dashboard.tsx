import React, { useState, useMemo } from 'react';
import PropCard from '../components/PropCard';
import ComboBetSlip from '../components/ComboBetSlip';
import { usePropsStore } from '../services/propsStore';
import { useStore } from '../services/store';
import { useGameStore } from '../services/gameStore';
import { useAuthStore } from '../services/authStore';
import { getQueueName, getChampionName } from '../services/riotApi';
import { BetStatus } from '../types';
import {
  Clock, Skull, Wifi, WifiOff, AlertTriangle,
  Gamepad2, Users, LogIn, FlaskConical, Zap, Target, Swords,
  Star, Timer, Award, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

type CategoryFilter = 'ALL' | 'EARLY' | 'KDA' | 'GAMEPLAY' | 'LATE' | 'POPULAR';

const CATEGORY_INFO = {
  ALL: { label: 'Tous', icon: Swords, color: 'zinc' },
  POPULAR: { label: 'Populaires', icon: Star, color: 'gold' },
  EARLY: { label: 'Early Game', icon: Timer, color: 'amber' },
  KDA: { label: 'KDA', icon: Target, color: 'red' },
  GAMEPLAY: { label: 'Gameplay', icon: Zap, color: 'blue' },
  LATE: { label: 'Résultats', icon: Award, color: 'green' },
};

// Popular props (most bet on)
const POPULAR_PROP_IDS = ['kda1', 'out2', 'early1', 'kda5', 'out1', 'gp1'];

const Dashboard = () => {
  const { bets, cancelBet } = useStore();
  const { user } = useAuthStore();
  const { getProps } = usePropsStore();
  const {
    johnny,
    isInGame,
    currentGame,
    isPolling,
    lastMatchStats,
    testMode,
    testMatchData
  } = useGameStore();

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('POPULAR');

  // Get props with custom odds applied
  const allProps = getProps();
  const activeBets = bets.filter(b => b.status === BetStatus.PENDING && b.userId === user?.id);
  const gameTimeMinutes = currentGame
    ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60)
    : 0;

  // Find Johnny in the current game participants
  const johnnyInGame = currentGame?.participants.find(p => p.puuid === johnny.puuid);

  // Filter props by category
  const filteredProps = useMemo(() => {
    if (categoryFilter === 'ALL') return allProps;
    if (categoryFilter === 'POPULAR') {
      return allProps.filter(p => POPULAR_PROP_IDS.includes(p.id));
    }
    return allProps.filter(p => p.category === categoryFilter);
  }, [categoryFilter, allProps]);

  // Sort props: available first, then by odds
  const sortedProps = useMemo(() => {
    return [...filteredProps].sort((a, b) => {
      // Early game props that expired go to the end
      const aExpired = a.maxGameTime && gameTimeMinutes > a.maxGameTime;
      const bExpired = b.maxGameTime && gameTimeMinutes > b.maxGameTime;
      if (aExpired && !bExpired) return 1;
      if (!aExpired && bExpired) return -1;
      // Then sort by odds (lower first = more likely)
      return a.odds - b.odds;
    });
  }, [filteredProps, gameTimeMinutes]);

  // Stats for current game
  const availableProps = allProps.filter(p => !p.maxGameTime || gameTimeMinutes <= p.maxGameTime);
  const expiredProps = allProps.filter(p => p.maxGameTime && gameTimeMinutes > p.maxGameTime);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Game Status Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10">
        {isInGame && testMode && testMatchData ? (
          // TEST MODE BANNER
          <div className="bg-gradient-to-r from-purple-900/30 via-purple-800/20 to-fuchsia-900/30 p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <FlaskConical className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-black text-white">MODE TEST</h2>
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">TEST</span>
                  </div>
                  <p className="text-purple-300 text-sm">Parie sur cette ancienne game</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {testMatchData.info.participants.find(p => p.puuid === johnny.puuid) && (
                  <>
                    <div className="text-center px-3 py-2 bg-white/10 rounded-xl">
                      <div className="text-sm font-bold text-white">
                        {testMatchData.info.participants.find(p => p.puuid === johnny.puuid)?.championName}
                      </div>
                      <div className="text-xs text-purple-300">Champion</div>
                    </div>
                    <div className="text-center px-3 py-2 bg-white/10 rounded-xl">
                      <div className="text-sm font-bold text-white font-mono">
                        {testMatchData.info.participants.find(p => p.puuid === johnny.puuid)?.kills}/
                        {testMatchData.info.participants.find(p => p.puuid === johnny.puuid)?.deaths}/
                        {testMatchData.info.participants.find(p => p.puuid === johnny.puuid)?.assists}
                      </div>
                      <div className="text-xs text-purple-300">KDA</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : isInGame ? (
          // LIVE GAME BANNER
          <div className="bg-gradient-to-r from-green-900/30 via-green-800/20 to-emerald-900/30 p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Gamepad2 className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-black text-white">JOHNNY EN GAME</h2>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">LIVE</span>
                  </div>
                  <p className="text-green-300 text-sm">
                    {johnny.gameName} • {currentGame ? getQueueName(currentGame.gameQueueConfigId) : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center px-3 py-2 bg-white/10 rounded-xl">
                  <div className="text-xl font-mono font-bold text-white">{gameTimeMinutes}'</div>
                  <div className="text-xs text-green-300">Temps</div>
                </div>
                {johnnyInGame && (
                  <div className="text-center px-3 py-2 bg-white/10 rounded-xl">
                    <div className="text-sm font-bold text-white">{getChampionName(johnnyInGame.championId)}</div>
                    <div className="text-xs text-green-300">Champion</div>
                  </div>
                )}
                <div className="text-center px-3 py-2 bg-white/10 rounded-xl">
                  <div className="text-sm font-bold text-white">{availableProps.length}</div>
                  <div className="text-xs text-green-300">Paris</div>
                </div>
              </div>
            </div>

            {gameTimeMinutes > 0 && expiredProps.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400">{expiredProps.length} paris Early expirés</span>
              </div>
            )}
          </div>
        ) : (
          // OFFLINE BANNER
          <div className="bg-gradient-to-r from-zinc-900/80 via-zinc-800/50 to-zinc-900/80 p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <Skull className="w-7 h-7 text-zinc-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white mb-1">Johnny AFK</h2>
                  <p className="text-zinc-400 text-sm">
                    {johnny.puuid ? (
                      <>En attente... {isPolling && <span className="text-accent">(surveillance)</span>}</>
                    ) : (
                      <span className="text-amber-400">Configure Johnny dans Admin</span>
                    )}
                  </p>
                </div>
              </div>

              {isPolling ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 rounded-full border border-accent/30">
                  <Wifi className="w-4 h-4 text-accent animate-pulse" />
                  <span className="text-accent text-sm font-bold">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-full border border-zinc-700">
                  <WifiOff className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-500 text-sm">Inactive</span>
                </div>
              )}
            </div>

            {lastMatchStats && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-4 text-sm">
                <span className="text-zinc-500">Dernière:</span>
                <span className={`font-bold ${lastMatchStats.win ? 'text-green-400' : 'text-red-400'}`}>
                  {lastMatchStats.win ? 'Victoire' : 'Défaite'}
                </span>
                <span className="text-white font-mono">
                  {lastMatchStats.kills}/{lastMatchStats.deaths}/{lastMatchStats.assists}
                </span>
                <span className="text-zinc-400">{lastMatchStats.championName}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Login prompt */}
      {!user && (
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-primary" />
            <span className="text-white font-medium">Connecte-toi pour parier</span>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-white font-bold hover:bg-primary/90 transition text-sm"
          >
            <LogIn className="w-4 h-4" />
            Connexion
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Column: Betting Props (3 cols) */}
        <section className="lg:col-span-3 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(Object.entries(CATEGORY_INFO) as [CategoryFilter, typeof CATEGORY_INFO.ALL][]).map(([key, info]) => {
              const Icon = info.icon;
              const isActive = categoryFilter === key;
              const count = key === 'ALL' ? allProps.length :
                           key === 'POPULAR' ? allProps.filter(p => POPULAR_PROP_IDS.includes(p.id)).length :
                           allProps.filter(p => p.category === key).length;

              return (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {info.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-zinc-800'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Props Grid */}
          {!isInGame && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-amber-400 font-bold text-sm">Paris fermés</p>
                <p className="text-xs text-zinc-400">Johnny n'est pas en game. Tu peux consulter les paris mais pas parier.</p>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            {sortedProps.map(prop => (
              <PropCard key={prop.id} prop={prop} />
            ))}
          </div>
        </section>

        {/* Right Column: Active Bets (1 col) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Tes paris</h2>
            {activeBets.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">
                {activeBets.length}
              </span>
            )}
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden lg:sticky lg:top-4">
            {!user ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                Connecte-toi
              </div>
            ) : activeBets.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                Aucun pari en cours
              </div>
            ) : (
              <div className="divide-y divide-zinc-800 max-h-[50vh] overflow-y-auto">
                {activeBets.map(bet => (
                  <div key={bet.id} className="p-3 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-medium text-zinc-200 text-sm leading-tight">
                        {bet.propTitle.replace(/^\[COMBO \d+\/\d+\] /, '')}
                      </span>
                      <span className="text-amber-400 font-mono text-xs bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        x{bet.odds.toFixed(1)}
                      </span>
                    </div>

                    {bet.comboId && (
                      <div className="flex items-center gap-1 text-xs text-purple-400 mb-1">
                        <Layers className="w-3 h-3" />
                        Combo [{bet.comboIndex}/{bet.comboTotal}]
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">
                        {bet.amount} → <span className="text-gold font-bold">{bet.potentialPayout} JC</span>
                      </span>
                      <button
                        onClick={() => cancelBet(bet.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user && (
              <Link
                to="/my-bets"
                className="block p-3 text-center text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 border-t border-zinc-800 transition"
              >
                Voir tout →
              </Link>
            )}
          </div>
        </section>
      </div>

      {/* Combo Bet Slip (floating) */}
      <ComboBetSlip />
    </div>
  );
};

export default Dashboard;
