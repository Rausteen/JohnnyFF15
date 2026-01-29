import React, { useState, useMemo, useEffect } from 'react';
import PropCard from '../components/PropCard';
import ComboBetSlip from '../components/ComboBetSlip';
import { usePropsStore } from '../services/propsStore';
import { useStore } from '../services/store';
import { useGameStore, PlayerGameState } from '../services/gameStore';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';
import { getQueueName, getChampionName } from '../services/riotApi';
import { getUserPendingBets, getAllPendingBetsWithPseudos, BetWithPseudo } from '../services/betsService';
import { Bet, TrackedPlayer } from '../types';
import {
  Clock, Skull, Wifi, WifiOff, AlertTriangle,
  Gamepad2, Users, LogIn, FlaskConical, Zap, Target, Swords,
  Star, Timer, Award, Layers, Eye, ChevronDown, User
} from 'lucide-react';
import { Link } from 'react-router-dom';

type CategoryFilter = 'ALL' | 'FACILE' | 'MOYEN' | 'DIFFICILE' | 'LEGENDAIRE' | 'POPULAR';

const CATEGORY_INFO = {
  ALL: { label: 'Tous', icon: Swords, color: 'zinc' },
  POPULAR: { label: 'Populaires', icon: Star, color: 'gold' },
  FACILE: { label: 'Facile', icon: Target, color: 'green', minOdds: 0, maxOdds: 2.0 },
  MOYEN: { label: 'Moyen', icon: Zap, color: 'amber', minOdds: 2.0, maxOdds: 4.0 },
  DIFFICILE: { label: 'Difficile', icon: Timer, color: 'orange', minOdds: 4.0, maxOdds: 10.0 },
  LEGENDAIRE: { label: 'Légendaire', icon: Award, color: 'purple', minOdds: 10.0, maxOdds: 999 },
};

// Popular props (most bet on)
const POPULAR_PROP_IDS = ['kda1', 'out2', 'early1', 'kda3', 'out1', 'gp1'];

const Dashboard = () => {
  const { cancelBet } = useStore();
  const { user } = useAuthStore();
  const { getProps } = usePropsStore();
  const { addCredits } = useCreditsStore();
  const {
    trackedPlayers,
    selectedPlayer,
    selectPlayer,
    playerStates,
    getPlayersInGame,
    isAnyPlayerInGame,
    isPolling,
    testMode,
    testMatchData,
    testPlayer
  } = useGameStore();

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('POPULAR');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);

  // Supabase pending bets
  const [supabasePendingBets, setSupabasePendingBets] = useState<Bet[]>([]);

  // Public pending bets (all users with pseudos)
  const [publicPendingBets, setPublicPendingBets] = useState<BetWithPseudo[]>([]);

  // Get players currently in game
  const playersInGame = getPlayersInGame();
  const isInGame = isAnyPlayerInGame();

  // Get the active player state (selected or first in-game player)
  const activePlayerState: PlayerGameState | undefined = useMemo(() => {
    if (testMode && testPlayer?.puuid) {
      return playerStates.get(testPlayer.puuid);
    }
    if (selectedPlayer?.puuid) {
      const state = playerStates.get(selectedPlayer.puuid);
      if (state?.isInGame) return state;
    }
    return playersInGame[0];
  }, [selectedPlayer, playerStates, playersInGame, testMode, testPlayer]);

  const currentGame = activePlayerState?.currentGame;
  const activePlayer = activePlayerState?.player;

  // Load pending bets from Supabase
  const loadPendingBets = async () => {
    if (!user) return;
    try {
      const pendingBets = await getUserPendingBets(user.id);
      setSupabasePendingBets(pendingBets);
    } catch (err) {
      console.error('Error loading pending bets:', err);
    }
  };

  // Load public pending bets
  const loadPublicPendingBets = async () => {
    try {
      const bets = await getAllPendingBetsWithPseudos();
      setPublicPendingBets(bets);
    } catch (err) {
      console.error('Error loading public pending bets:', err);
    }
  };

  // Load on mount and when user changes
  useEffect(() => {
    loadPendingBets();
    loadPublicPendingBets();
  }, [user?.id]);

  // Reload bets periodically to stay in sync
  useEffect(() => {
    const interval = setInterval(() => {
      loadPendingBets();
      loadPublicPendingBets();
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Listen for bet placed events to refresh immediately
  useEffect(() => {
    const handleBetPlaced = () => {
      loadPendingBets();
      loadPublicPendingBets();
    };
    window.addEventListener('betPlaced', handleBetPlaced);
    return () => window.removeEventListener('betPlaced', handleBetPlaced);
  }, [user?.id]);

  // Update current time every second for cancel button countdown
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if a bet can still be cancelled (within 1 minute)
  const canCancelBet = (betTimestamp: number) => {
    return currentTime - betTimestamp < 60 * 1000;
  };

  // Get remaining seconds to cancel
  const getCancelTimeLeft = (betTimestamp: number) => {
    const timeLeft = 60 - Math.floor((currentTime - betTimestamp) / 1000);
    return Math.max(0, timeLeft);
  };

  // Get props with custom odds applied
  const allProps = getProps();

  // Group bets for display: single bets + grouped combos
  interface BetGroup {
    type: 'single' | 'combo';
    bets: Bet[];
    comboId?: string;
    totalAmount: number;
    totalOdds: number;
    potentialPayout: number;
    timestamp: number;
    playerName?: string;
    championName?: string;
  }

  const groupedBets = useMemo(() => {
    const groups: BetGroup[] = [];
    const comboMap = new Map<string, Bet[]>();

    supabasePendingBets.forEach(bet => {
      if (bet.comboId) {
        const existing = comboMap.get(bet.comboId) || [];
        existing.push(bet);
        comboMap.set(bet.comboId, existing);
      } else {
        groups.push({
          type: 'single',
          bets: [bet],
          totalAmount: bet.amount,
          totalOdds: bet.odds,
          potentialPayout: bet.potentialPayout,
          timestamp: bet.timestamp,
          playerName: bet.playerName,
          championName: bet.championName
        });
      }
    });

    comboMap.forEach((bets, comboId) => {
      bets.sort((a, b) => (a.comboIndex || 0) - (b.comboIndex || 0));
      const mainBet = bets.find(b => b.amount > 0) || bets[0];
      groups.push({
        type: 'combo',
        bets,
        comboId,
        totalAmount: mainBet.amount,
        totalOdds: mainBet.odds,
        potentialPayout: mainBet.potentialPayout,
        timestamp: mainBet.timestamp,
        playerName: mainBet.playerName,
        championName: mainBet.championName
      });
    });

    return groups.sort((a, b) => b.timestamp - a.timestamp);
  }, [supabasePendingBets]);

  const gameTimeMinutes = currentGame
    ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60)
    : 0;

  // Find player in the current game participants
  const playerInGame = currentGame?.participants.find(p => p.puuid === activePlayer?.puuid);

  // Filter props by category (based on odds for difficulty levels)
  const filteredProps = useMemo(() => {
    if (categoryFilter === 'ALL') return allProps;
    if (categoryFilter === 'POPULAR') {
      return allProps.filter(p => POPULAR_PROP_IDS.includes(p.id));
    }
    const catInfo = CATEGORY_INFO[categoryFilter];
    if ('minOdds' in catInfo && 'maxOdds' in catInfo) {
      return allProps.filter(p => p.odds >= catInfo.minOdds && p.odds < catInfo.maxOdds);
    }
    return allProps;
  }, [categoryFilter, allProps]);

  // Sort props by odds (lower first = more likely)
  const sortedProps = useMemo(() => {
    return [...filteredProps].sort((a, b) => a.odds - b.odds);
  }, [filteredProps]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Player Selector (when multiple players are in game) */}
      {playersInGame.length > 1 && !testMode && (
        <div className="relative">
          <button
            onClick={() => setShowPlayerSelector(!showPlayerSelector)}
            className="w-full sm:w-auto flex items-center justify-between gap-3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl hover:border-zinc-600 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-white font-bold text-sm">{activePlayer?.displayName || 'Sélectionner'}</div>
                <div className="text-xs text-green-400">{playersInGame.length} joueurs en game</div>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${showPlayerSelector ? 'rotate-180' : ''}`} />
          </button>

          {showPlayerSelector && (
            <div className="absolute top-full left-0 right-0 sm:right-auto mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-xl min-w-[250px]">
              {playersInGame.map(state => (
                <button
                  key={state.player.id}
                  onClick={() => {
                    selectPlayer(state.player);
                    setShowPlayerSelector(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition ${
                    activePlayer?.id === state.player.id ? 'bg-green-500/10' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 font-bold text-sm">{state.player.displayName.charAt(0)}</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-medium text-sm">{state.player.displayName}</div>
                    <div className="text-xs text-zinc-400">
                      {state.currentGame ? getChampionName(
                        state.currentGame.participants.find(p => p.puuid === state.player.puuid)?.championId || 0
                      ) : ''}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">LIVE</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Game Status Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10">
        {isInGame && testMode && testMatchData && testPlayer ? (
          // TEST MODE BANNER
          <div className="bg-gradient-to-r from-purple-900/30 via-purple-800/20 to-fuchsia-900/30 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <FlaskConical className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg sm:text-xl font-black text-white">MODE TEST - {testPlayer.displayName}</h2>
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">TEST</span>
                  </div>
                  <p className="text-purple-300 text-xs sm:text-sm">Parie sur cette ancienne game</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
                {testMatchData.info.participants.find(p => p.puuid === testPlayer.puuid) && (
                  <>
                    <div className="text-center px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 rounded-xl shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-white">
                        {testMatchData.info.participants.find(p => p.puuid === testPlayer.puuid)?.championName}
                      </div>
                      <div className="text-xs text-purple-300">Champion</div>
                    </div>
                    <div className="text-center px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 rounded-xl shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-white font-mono">
                        {testMatchData.info.participants.find(p => p.puuid === testPlayer.puuid)?.kills}/
                        {testMatchData.info.participants.find(p => p.puuid === testPlayer.puuid)?.deaths}/
                        {testMatchData.info.participants.find(p => p.puuid === testPlayer.puuid)?.assists}
                      </div>
                      <div className="text-xs text-purple-300">KDA</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : isInGame && activePlayer ? (
          // LIVE GAME BANNER
          <div className="bg-gradient-to-r from-green-900/30 via-green-800/20 to-emerald-900/30 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-white">{activePlayer.displayName.toUpperCase()} EN GAME</h2>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">LIVE</span>
                  </div>
                  <p className="text-green-300 text-xs sm:text-sm">
                    {activePlayer.gameName} • {currentGame ? getQueueName(currentGame.gameQueueConfigId) : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
                <div className="text-center px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 rounded-xl shrink-0">
                  <div className="text-lg sm:text-xl font-mono font-bold text-white">{gameTimeMinutes}'</div>
                  <div className="text-xs text-green-300">Temps</div>
                </div>
                {playerInGame && (
                  <div className="text-center px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 rounded-xl shrink-0">
                    <div className="text-xs sm:text-sm font-bold text-white">{getChampionName(playerInGame.championId)}</div>
                    <div className="text-xs text-green-300">Champion</div>
                  </div>
                )}
                <div className="text-center px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 rounded-xl shrink-0">
                  <div className="text-xs sm:text-sm font-bold text-white">{allProps.length}</div>
                  <div className="text-xs text-green-300">Paris</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // OFFLINE BANNER
          <div className="bg-gradient-to-r from-zinc-900/80 via-zinc-800/50 to-zinc-900/80 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0">
                  <Skull className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-500" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white mb-1">
                    {trackedPlayers.length > 0 ? 'Personne en game' : 'Aucun joueur configuré'}
                  </h2>
                  <p className="text-zinc-400 text-xs sm:text-sm">
                    {trackedPlayers.length > 0 ? (
                      <>En attente... {isPolling && <span className="text-accent">(surveillance de {trackedPlayers.length} joueur{trackedPlayers.length > 1 ? 's' : ''})</span>}</>
                    ) : (
                      <span className="text-amber-400">Configure des joueurs dans Admin</span>
                    )}
                  </p>
                </div>
              </div>

              {isPolling ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 rounded-full border border-accent/30 self-start sm:self-auto">
                  <Wifi className="w-4 h-4 text-accent animate-pulse" />
                  <span className="text-accent text-sm font-bold">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-full border border-zinc-700 self-start sm:self-auto">
                  <WifiOff className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-500 text-sm">Inactive</span>
                </div>
              )}
            </div>

            {/* Show last match stats for selected player */}
            {selectedPlayer?.puuid && playerStates.get(selectedPlayer.puuid)?.lastMatchStats && (
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                <span className="text-zinc-500">Dernière ({selectedPlayer.displayName}):</span>
                <span className={`font-bold ${playerStates.get(selectedPlayer.puuid)?.lastMatchStats?.win ? 'text-green-400' : 'text-red-400'}`}>
                  {playerStates.get(selectedPlayer.puuid)?.lastMatchStats?.win ? 'Victoire' : 'Défaite'}
                </span>
                <span className="text-white font-mono">
                  {playerStates.get(selectedPlayer.puuid)?.lastMatchStats?.kills}/
                  {playerStates.get(selectedPlayer.puuid)?.lastMatchStats?.deaths}/
                  {playerStates.get(selectedPlayer.puuid)?.lastMatchStats?.assists}
                </span>
                <span className="text-zinc-400">{playerStates.get(selectedPlayer.puuid)?.lastMatchStats?.championName}</span>
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

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Active Bets - Shows first on mobile */}
        <section className="order-first lg:order-last lg:col-span-1 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white">Tes paris</h2>
            {groupedBets.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">
                {supabasePendingBets.length}
              </span>
            )}
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden lg:sticky lg:top-4">
            {!user ? (
              <div className="p-4 sm:p-6 text-center text-zinc-500 text-sm">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 opacity-50" />
                Connecte-toi
              </div>
            ) : groupedBets.length === 0 ? (
              <div className="p-4 sm:p-6 text-center text-zinc-500 text-sm">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 opacity-50" />
                Aucun pari en cours
              </div>
            ) : (
              <div className="divide-y divide-zinc-800 max-h-[30vh] lg:max-h-[50vh] overflow-y-auto">
                {groupedBets.map(group => (
                  <div key={group.comboId || group.bets[0].id} className="p-3 hover:bg-zinc-800/50 transition-colors">
                    {group.type === 'combo' ? (
                      // Combo bet display
                      <>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 to-accent flex items-center justify-center shrink-0">
                              <Layers className="w-3 h-3 text-white" />
                            </div>
                            <span className="font-bold text-purple-400 text-xs">COMBINÉ x{group.bets.length}</span>
                          </div>
                          <span className="text-amber-400 font-mono text-xs bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                            x{group.totalOdds.toFixed(1)}
                          </span>
                        </div>
                        <div className="space-y-1 mb-2 pl-2 border-l-2 border-purple-500/30">
                          {group.bets.map((bet, idx) => (
                            <div key={bet.id} className="text-xs">
                              <div className="flex items-center gap-1 mb-0.5">
                                {bet.playerName && (
                                  <span className="px-1 py-0.5 bg-primary/20 text-primary text-[9px] font-bold rounded">
                                    {bet.playerName}
                                  </span>
                                )}
                                {bet.championName && (
                                  <span className="text-[9px] text-zinc-500">{bet.championName}</span>
                                )}
                              </div>
                              <div className="text-zinc-300 truncate" title={bet.propTitle.replace(/^\[COMBO \d+\/\d+\] /, '')}>
                                {idx + 1}. {bet.propTitle.replace(/^\[COMBO \d+\/\d+\] /, '')}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500">
                            {group.totalAmount} → <span className="text-gold font-bold">{group.potentialPayout} JC</span>
                          </span>
                          {canCancelBet(group.timestamp) ? (
                            <button
                              onClick={async () => {
                                let allCancelled = true;
                                for (const bet of group.bets) {
                                  const success = await cancelBet(bet.id, bet.amount, bet.timestamp);
                                  if (!success) allCancelled = false;
                                }
                                if (allCancelled) {
                                  await addCredits(group.totalAmount);
                                  loadPendingBets();
                                }
                              }}
                              className="text-red-400 hover:text-red-300 p-1 flex items-center gap-1"
                              title={`${getCancelTimeLeft(group.timestamp)}s pour annuler`}
                            >
                              <span className="text-zinc-500 text-xs">{getCancelTimeLeft(group.timestamp)}s</span>
                              ✕
                            </button>
                          ) : (
                            <span className="text-zinc-600 text-xs">🔒</span>
                          )}
                        </div>
                      </>
                    ) : (
                      // Single bet display
                      <>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            {(group.playerName || group.championName) && (
                              <div className="flex items-center gap-1.5 mb-1">
                                {group.playerName && (
                                  <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded shrink-0">
                                    {group.playerName}
                                  </span>
                                )}
                                {group.championName && (
                                  <span className="text-[10px] text-zinc-400">{group.championName}</span>
                                )}
                              </div>
                            )}
                            <span className="font-medium text-zinc-200 text-xs sm:text-sm leading-tight block truncate">
                              {group.bets[0].propTitle}
                            </span>
                          </div>
                          <span className="text-amber-400 font-mono text-xs bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                            x{group.totalOdds.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500">
                            {group.totalAmount} → <span className="text-gold font-bold">{group.potentialPayout} JC</span>
                          </span>
                          {canCancelBet(group.timestamp) ? (
                            <button
                              onClick={async () => {
                                const bet = group.bets[0];
                                const success = await cancelBet(bet.id, bet.amount, bet.timestamp);
                                if (success) {
                                  await addCredits(bet.amount);
                                  loadPendingBets();
                                }
                              }}
                              className="text-red-400 hover:text-red-300 p-1 flex items-center gap-1"
                              title={`${getCancelTimeLeft(group.timestamp)}s pour annuler`}
                            >
                              <span className="text-zinc-500 text-xs">{getCancelTimeLeft(group.timestamp)}s</span>
                              ✕
                            </button>
                          ) : (
                            <span className="text-zinc-600 text-xs">🔒</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {user && (
              <Link
                to="/my-bets"
                className="block p-3 text-center text-xs sm:text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 border-t border-zinc-800 transition"
              >
                Voir tout →
              </Link>
            )}
          </div>
        </section>

        {/* Betting Props - Shows second on mobile */}
        <section className="lg:col-span-3 space-y-3 sm:space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {(Object.entries(CATEGORY_INFO) as [CategoryFilter, typeof CATEGORY_INFO.ALL][]).map(([key, info]) => {
              const Icon = info.icon;
              const isActive = categoryFilter === key;
              let count = 0;
              if (key === 'ALL') {
                count = allProps.length;
              } else if (key === 'POPULAR') {
                count = allProps.filter(p => POPULAR_PROP_IDS.includes(p.id)).length;
              } else if ('minOdds' in info && 'maxOdds' in info) {
                count = allProps.filter(p => p.odds >= (info as any).minOdds && p.odds < (info as any).maxOdds).length;
              }

              return (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{info.label}</span>
                  <span className="sm:hidden">{key === 'POPULAR' ? '⭐' : key === 'ALL' ? 'Tous' : key === 'LEGENDAIRE' ? '🏆' : info.label.slice(0, 3)}</span>
                  <span className={`text-xs px-1 sm:px-1.5 py-0.5 rounded-full ${
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
            <div className="p-3 sm:p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-amber-400 font-bold text-xs sm:text-sm">Paris fermés</p>
                <p className="text-xs text-zinc-400">Personne n'est en game. Tu peux consulter les paris mais pas parier.</p>
              </div>
            </div>
          )}
          {/* Betting window closed message (disabled for testing - set to 999 minutes) */}
          {isInGame && gameTimeMinutes >= 999 && (
            <div className="p-3 sm:p-4 rounded-xl border border-red-500/30 bg-red-500/5 mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-red-400 font-bold text-xs sm:text-sm">Fenêtre de paris fermée</p>
                <p className="text-xs text-zinc-400">Les paris sont fermés après 4 minutes de jeu. Attends la prochaine game !</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedProps.map(prop => (
              <PropCard key={prop.id} prop={prop} player={activePlayer} />
            ))}
          </div>
        </section>
      </div>

      {/* Public Pending Bets Section - Grouped by User */}
      {publicPendingBets.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white">Qui parie sur quoi ?</h2>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-bold">
              {publicPendingBets.length} paris en attente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              const betsByUser = new Map<string, typeof publicPendingBets>();
              publicPendingBets.forEach(bet => {
                const pseudo = bet.userPseudo || 'Inconnu';
                if (!betsByUser.has(pseudo)) {
                  betsByUser.set(pseudo, []);
                }
                betsByUser.get(pseudo)!.push(bet);
              });

              return Array.from(betsByUser.entries()).map(([pseudo, userBets]) => {
                const totalMise = userBets.reduce((sum, b) => sum + b.amount, 0);
                const totalPotentiel = userBets.reduce((sum, b) => sum + b.potentialPayout, 0);

                return (
                  <div key={pseudo} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="p-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-bold text-sm">{pseudo.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="font-bold text-white">{pseudo}</span>
                      </div>
                      <span className="text-xs text-zinc-400">{userBets.length} paris</span>
                    </div>

                    <div className="divide-y divide-zinc-800/50 max-h-48 overflow-y-auto">
                      {userBets.slice(0, 5).map(bet => (
                        <div key={bet.id} className="p-2.5 hover:bg-zinc-800/30 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {(bet.playerName || bet.championName) && (
                                <div className="flex items-center gap-1 mb-0.5">
                                  {bet.playerName && (
                                    <span className="px-1 py-0.5 bg-primary/20 text-primary text-[9px] font-bold rounded">
                                      {bet.playerName}
                                    </span>
                                  )}
                                  {bet.championName && (
                                    <span className="text-[9px] text-zinc-500">{bet.championName}</span>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-zinc-300 truncate">
                                {bet.propTitle.replace(/^\[COMBO \d+\/\d+\] /, '')}
                              </div>
                              {bet.comboId && (
                                <span className="text-[10px] text-purple-400">Combo</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-amber-400 font-mono text-xs">x{bet.odds.toFixed(1)}</div>
                              <div className="text-[10px] text-zinc-500">{bet.amount} JC</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {userBets.length > 5 && (
                        <div className="p-2 text-center text-[10px] text-zinc-500">
                          +{userBets.length - 5} autres paris
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-zinc-800/50 border-t border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Total misé: <span className="text-white font-mono">{totalMise} JC</span></span>
                      <span className="text-gold font-bold">→ {totalPotentiel} JC</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>
      )}

      {/* Combo Bet Slip (floating) */}
      <ComboBetSlip player={activePlayer} />
    </div>
  );
};

export default Dashboard;
