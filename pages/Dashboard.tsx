import React, { useEffect } from 'react';
import PropCard from '../components/PropCard';
import ComboBetSlip from '../components/ComboBetSlip';
import { MOCK_PROPS } from '../services/mockData';
import { useStore } from '../services/store';
import { useGameStore } from '../services/gameStore';
import { useAuthStore } from '../services/authStore';
import { getQueueName, getChampionName } from '../services/riotApi';
import { BetStatus } from '../types';
import { XCircle, CheckCircle, Clock, Skull, Wifi, WifiOff, AlertTriangle, Gamepad2, Users, LogIn, Swords, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { bets, cancelBet } = useStore();
  const { user } = useAuthStore();
  const {
    johnny,
    isInGame,
    currentGame,
    isPolling,
    lastMatchStats,
    testMode,
    testMatchData,
    loadJohnnyConfig,
    startPolling,
    stopPolling
  } = useGameStore();

  // Load config and start polling
  useEffect(() => {
    const init = async () => {
      await loadJohnnyConfig();
    };
    init();
  }, [loadJohnnyConfig]);

  // Auto-start polling if johnny is configured
  useEffect(() => {
    if (johnny.puuid && !isPolling) {
      console.log('Starting surveillance for', johnny.gameName);
      startPolling(30000);
    }
  }, [johnny.puuid, isPolling, startPolling]);

  const activeBets = bets.filter(b => b.status === BetStatus.PENDING);
  const gameTimeMinutes = currentGame
    ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60)
    : 0;

  // Find Johnny in the current game participants
  const johnnyInGame = currentGame?.participants.find(p => p.puuid === johnny.puuid);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Game Status Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10">
        {isInGame && testMode && testMatchData ? (
          // TEST MODE BANNER
          <div className="bg-gradient-to-r from-purple-900/30 via-purple-800/20 to-fuchsia-900/30 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <FlaskConical className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-black text-white">MODE TEST ACTIF</h2>
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full animate-pulse">TEST</span>
                  </div>
                  <p className="text-purple-300">
                    Parie sur cette ancienne game • Les résultats seront basés sur les vraies stats
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {testMatchData.info.participants.find(p => p.puuid === johnny.puuid) && (
                  <>
                    <div className="text-center px-4 py-2 bg-white/10 rounded-xl">
                      <div className="text-lg font-bold text-white">
                        {testMatchData.info.participants.find(p => p.puuid === johnny.puuid)?.championName}
                      </div>
                      <div className="text-xs text-purple-300 uppercase">Champion</div>
                    </div>
                    <div className="text-center px-4 py-2 bg-white/10 rounded-xl">
                      <div className="text-lg font-bold text-white">
                        {testMatchData.info.participants.find(p => p.puuid === johnny.puuid)?.kills}/
                        {testMatchData.info.participants.find(p => p.puuid === johnny.puuid)?.deaths}/
                        {testMatchData.info.participants.find(p => p.puuid === johnny.puuid)?.assists}
                      </div>
                      <div className="text-xs text-purple-300 uppercase">KDA réel</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-500/20 text-center">
              <p className="text-xs text-purple-300">
                Place tes paris puis retourne dans <Link to="/admin" className="underline font-bold">Admin</Link> pour terminer le test et voir les résultats
              </p>
            </div>
          </div>
        ) : isInGame ? (
          // LIVE GAME BANNER
          <div className="bg-gradient-to-r from-green-900/30 via-green-800/20 to-emerald-900/30 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Gamepad2 className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-black text-white">JOHNNY EST EN GAME !</h2>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">LIVE</span>
                  </div>
                  <p className="text-green-300">
                    {johnny.gameName}#{johnny.tagLine} • {currentGame ? getQueueName(currentGame.gameQueueConfigId) : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-white">{gameTimeMinutes}</div>
                  <div className="text-xs text-green-300 uppercase">Minutes</div>
                </div>
                {johnnyInGame && (
                  <div className="text-center px-4 py-2 bg-white/10 rounded-xl">
                    <div className="text-lg font-bold text-white">{getChampionName(johnnyInGame.championId)}</div>
                    <div className="text-xs text-green-300 uppercase">Champion</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-zinc-900/80 via-zinc-800/50 to-zinc-900/80 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <Skull className="w-8 h-8 text-zinc-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">Johnny est AFK</h2>
                  <p className="text-zinc-400">
                    {johnny.puuid ? (
                      <>En attente de sa prochaine game... {isPolling && <span className="text-accent">(surveillance active)</span>}</>
                    ) : (
                      <span className="text-amber-400">⚠️ Configure Johnny dans Admin pour activer le tracking</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isPolling ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full border border-accent/30">
                    <Wifi className="w-4 h-4 text-accent animate-pulse" />
                    <span className="text-accent text-sm font-bold">Surveillance active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-full border border-zinc-700">
                    <WifiOff className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-500 text-sm font-bold">Surveillance inactive</span>
                  </div>
                )}
              </div>
            </div>

            {/* Last Match Stats */}
            {lastMatchStats && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-xs text-zinc-500 uppercase mb-2">Dernière game</div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`font-bold ${lastMatchStats.win ? 'text-green-400' : 'text-red-400'}`}>
                    {lastMatchStats.win ? 'Victoire' : 'Défaite'}
                  </span>
                  <span className="text-white font-mono">
                    {lastMatchStats.kills}/{lastMatchStats.deaths}/{lastMatchStats.assists}
                  </span>
                  <span className="text-zinc-400">{lastMatchStats.championName}</span>
                  {lastMatchStats.gameEndedInEarlySurrender && (
                    <span className="text-amber-400 font-bold">FF15!</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Login prompt for non-logged users */}
      {!user && (
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Connecte-toi pour parier !</h3>
          <p className="text-zinc-400 mb-4">Tu dois être connecté pour placer des paris et suivre tes gains.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-xl text-white font-bold hover:scale-105 transition-transform"
          >
            <LogIn className="w-5 h-5" />
            Se connecter
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Betting Props */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Pariez sur le chaos
              {isInGame && (
                <span className="text-xs font-normal px-2 py-1 bg-red-900/30 text-red-400 rounded-full border border-red-900/50 animate-pulse">
                  PARIS OUVERTS
                </span>
              )}
            </h2>
          </div>

          {isInGame ? (
            <div className="grid md:grid-cols-2 gap-4">
              {MOCK_PROPS.map(prop => (
                <PropCard key={prop.id} prop={prop} />
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 text-center">
              <Skull className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg font-bold mb-2">Les paris sont fermés</p>
              <p className="text-sm text-zinc-500">
                Attendez que Johnny lance une game pour parier sur sa déchéance.
              </p>
              {!johnny.puuid && (
                <Link to="/admin" className="inline-block mt-4 text-primary hover:underline text-sm">
                  → Configurer Johnny dans Admin
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Active Bets */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white">Tes paris en cours</h2>

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            {!user ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Connecte-toi pour voir tes paris
              </div>
            ) : activeBets.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Aucun pari en cours.<br />Tu as peur ou quoi ?
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {activeBets.map(bet => (
                  <div key={bet.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-zinc-200 text-sm">{bet.propTitle}</span>
                      <span className="text-amber-500 font-mono text-xs bg-amber-500/10 px-2 py-0.5 rounded">x{bet.odds}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-zinc-400 mb-3">
                      <span>Mise: <span className="text-white font-bold">{bet.amount}</span></span>
                      <span>Gain potentiel: <span className="text-gold font-bold">{bet.potentialPayout}</span></span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border
                        ${bet.status === BetStatus.PENDING ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : ''}
                        ${bet.status === BetStatus.WON ? 'bg-green-900/20 border-green-900 text-green-400' : ''}
                        ${bet.status === BetStatus.LOST ? 'bg-red-900/20 border-red-900 text-red-400' : ''}
                      `}>
                        {bet.status === BetStatus.PENDING && <><Clock className="w-3 h-3" /> En attente</>}
                        {bet.status === BetStatus.WON && <><CheckCircle className="w-3 h-3" /> Gagné</>}
                        {bet.status === BetStatus.LOST && <><XCircle className="w-3 h-3" /> Perdu</>}
                      </span>

                      {bet.status === BetStatus.PENDING && (
                        <button
                          onClick={() => cancelBet(bet.id)}
                          className="text-xs text-red-400 hover:text-red-300 hover:underline"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
