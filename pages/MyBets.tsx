import React, { useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../services/store';
import { useAuthStore } from '../services/authStore';
import { BetStatus, Bet } from '../types';
import {
  Filter, TrendingDown, TrendingUp, Wallet, ChevronDown, ChevronUp,
  Swords, Clock, Trophy, Skull, ArrowUpDown, Calendar, Coins, Layers
} from 'lucide-react';

interface GameGroup {
  matchId: string;
  championName: string;
  bets: Bet[];
  timestamp: number;
  totalWagered: number;
  netResult: number;
  status: 'pending' | 'won' | 'lost' | 'mixed';
  hasCombo: boolean;
}

type SortOption = 'date' | 'amount' | 'result';

const MyBets = () => {
  const { bets } = useStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<BetStatus | 'ALL'>('ALL');
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDesc, setSortDesc] = useState(true);

  // Redirect non-logged-in users to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Filter bets by current user
  const userBets = useMemo(() => {
    return bets.filter(b => b.userId === user.id);
  }, [bets, user.id]);

  const filteredBets = filter === 'ALL' ? userBets : userBets.filter(b => b.status === filter);

  // Group bets by matchId with computed stats
  const gameGroups = useMemo(() => {
    const groups = new Map<string, GameGroup>();

    filteredBets.forEach(bet => {
      const key = bet.matchId || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, {
          matchId: key,
          championName: bet.championName || 'Inconnu',
          bets: [],
          timestamp: bet.timestamp,
          totalWagered: 0,
          netResult: 0,
          status: 'pending',
          hasCombo: false
        });
      }
      const group = groups.get(key)!;
      group.bets.push(bet);
      group.totalWagered += bet.amount;

      if (bet.comboId) {
        group.hasCombo = true;
      }
    });

    // Calculate status and net result for each group
    groups.forEach(group => {
      const wonBets = group.bets.filter(b => b.status === BetStatus.WON);
      const lostBets = group.bets.filter(b => b.status === BetStatus.LOST);
      const pendingBets = group.bets.filter(b => b.status === BetStatus.PENDING);

      if (pendingBets.length > 0) {
        group.status = 'pending';
      } else if (wonBets.length > 0 && lostBets.length === 0) {
        group.status = 'won';
      } else if (lostBets.length > 0 && wonBets.length === 0) {
        group.status = 'lost';
      } else {
        group.status = 'mixed';
      }

      group.netResult = group.bets.reduce((acc, bet) => {
        if (bet.status === BetStatus.WON) return acc + bet.potentialPayout;
        if (bet.status === BetStatus.LOST) return acc - bet.amount;
        return acc;
      }, 0);
    });

    // Sort groups
    let sorted = Array.from(groups.values());

    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => sortDesc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
        break;
      case 'amount':
        sorted.sort((a, b) => sortDesc ? b.totalWagered - a.totalWagered : a.totalWagered - b.totalWagered);
        break;
      case 'result':
        sorted.sort((a, b) => sortDesc ? b.netResult - a.netResult : a.netResult - b.netResult);
        break;
    }

    return sorted;
  }, [filteredBets, sortBy, sortDesc]);

  // Auto-expand games with pending bets on first load
  useEffect(() => {
    const pendingGames = gameGroups
      .filter(g => g.status === 'pending')
      .map(g => g.matchId);
    if (pendingGames.length > 0) {
      setExpandedGames(new Set(pendingGames));
    }
  }, []);

  // Stats (from user's bets only)
  const stats = useMemo(() => {
    const totalWagered = userBets.reduce((acc, b) => acc + b.amount, 0);
    const wonBets = userBets.filter(b => b.status === BetStatus.WON);
    const lostBets = userBets.filter(b => b.status === BetStatus.LOST);
    const totalWon = wonBets.reduce((acc, b) => acc + b.potentialPayout, 0);
    const netProfit = totalWon - totalWagered;
    const winRate = userBets.length > 0
      ? (wonBets.length / userBets.filter(b => b.status !== BetStatus.PENDING).length) * 100 || 0
      : 0;

    return { totalWagered, totalWon, netProfit, winRate, wonCount: wonBets.length, lostCount: lostBets.length };
  }, [userBets]);

  const toggleGame = (matchId: string) => {
    setExpandedGames(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(option);
      setSortDesc(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <Trophy className="w-5 h-5" />;
      case 'lost': return <Skull className="w-5 h-5" />;
      case 'pending': return <Clock className="w-5 h-5" />;
      default: return <Swords className="w-5 h-5" />;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'won': return 'from-green-500/20 to-green-600/5 border-green-500/30 text-green-400';
      case 'lost': return 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-400';
      case 'pending': return 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400';
      default: return 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400';
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white">Mes Paris</h1>
          <p className="text-zinc-500 text-xs sm:text-base mt-0.5 sm:mt-1">Historique de tes prises de risque</p>
        </div>
        <div className="text-right">
          <div className="text-xs sm:text-sm text-zinc-500">Total paris</div>
          <div className="text-lg sm:text-2xl font-bold text-white">{userBets.length}</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 sm:p-4 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 text-zinc-500">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs font-medium">Misé</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-white">{stats.totalWagered.toLocaleString()} JC</div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 sm:p-4 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 text-zinc-500">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs font-medium">Profit</span>
          </div>
          <div className={`text-base sm:text-xl font-bold ${stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.netProfit > 0 ? '+' : ''}{stats.netProfit.toLocaleString()} JC
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 sm:p-4 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 text-zinc-500">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs font-medium">Gagnés</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-green-400">{stats.wonCount}</div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 sm:p-4 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 text-zinc-500">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs font-medium">Win Rate</span>
          </div>
          <div className={`text-base sm:text-xl font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-amber-400'}`}>
            {stats.winRate.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Status filters */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          {[
            { id: 'ALL', label: 'Tout', icon: null },
            { id: BetStatus.PENDING, label: 'En cours', icon: <Clock className="w-3 h-3" /> },
            { id: BetStatus.WON, label: 'Gagnés', icon: <Trophy className="w-3 h-3" /> },
            { id: BetStatus.LOST, label: 'Perdus', icon: <Skull className="w-3 h-3" /> },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                filter === f.id
                  ? 'bg-primary text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort options */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          {[
            { id: 'date' as SortOption, label: 'Date', icon: <Calendar className="w-3 h-3" /> },
            { id: 'amount' as SortOption, label: 'Mise', icon: <Coins className="w-3 h-3" /> },
            { id: 'result' as SortOption, label: 'Résultat', icon: <TrendingUp className="w-3 h-3" /> },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => toggleSort(s.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                sortBy === s.id
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {s.icon}
              {s.label}
              {sortBy === s.id && (
                <ArrowUpDown className={`w-3 h-3 transition-transform ${sortDesc ? '' : 'rotate-180'}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Games List */}
      <div className="space-y-2 sm:space-y-3">
        {gameGroups.length === 0 ? (
          <div className="text-center py-10 sm:py-16 bg-zinc-900/30 rounded-xl sm:rounded-2xl border border-dashed border-zinc-800">
            <Swords className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-zinc-700" />
            <p className="text-zinc-500 font-medium text-sm sm:text-base">Aucun pari trouvé</p>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1">Place des paris quand Johnny est en game !</p>
          </div>
        ) : (
          gameGroups.map((group) => {
            const isExpanded = expandedGames.has(group.matchId);
            const statusColors = getStatusColors(group.status);

            return (
              <div
                key={group.matchId}
                className={`bg-gradient-to-r ${statusColors} rounded-xl border overflow-hidden transition-all hover:border-opacity-50`}
              >
                {/* Game Header */}
                <button
                  onClick={() => toggleGame(group.matchId)}
                  className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-white/5 transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/30 flex items-center justify-center shrink-0`}>
                      {getStatusIcon(group.status)}
                    </div>

                    {/* Game Info */}
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm sm:text-lg truncate">{group.championName}</span>
                        {group.hasCombo && (
                          <span className="px-1.5 sm:px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full flex items-center gap-1 shrink-0">
                            <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span className="hidden sm:inline">Combo</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-zinc-400 mt-0.5 flex-wrap">
                        <span>{new Date(group.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{group.bets.length} pari{group.bets.length > 1 ? 's' : ''}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{group.totalWagered} JC</span>
                      </div>
                    </div>
                  </div>

                  {/* Result & Expand */}
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <div className={`font-mono font-bold text-sm sm:text-lg ${
                        group.netResult > 0 ? 'text-green-400' :
                        group.netResult < 0 ? 'text-red-400' :
                        'text-zinc-400'
                      }`}>
                        {group.netResult > 0 ? '+' : ''}{group.netResult} JC
                      </div>
                      <div className={`text-xs uppercase font-bold tracking-wide hidden sm:block`}>
                        {group.status === 'won' ? 'Gagné' :
                         group.status === 'lost' ? 'Perdu' :
                         group.status === 'pending' ? 'En cours' :
                         'Mixte'}
                      </div>
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-black/20 flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Bets */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/20">
                    {group.bets.map((bet, index) => (
                      <div
                        key={bet.id}
                        className={`p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 ${
                          index !== group.bets.length - 1 ? 'border-b border-white/5' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                              {bet.comboId && (
                                <span className="text-purple-400 text-xs font-mono">
                                  [{bet.comboIndex}/{bet.comboTotal}]
                                </span>
                              )}
                              <h3 className="font-medium text-white text-sm sm:text-base leading-tight">
                                {bet.propTitle.replace(/^\[COMBO \d+\/\d+\] /, '')}
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-0.5 text-xs sm:text-sm text-zinc-500">
                              <span>Mise: <span className="text-zinc-300">{bet.amount} JC</span></span>
                              <span>Cote: <span className="text-amber-400">x{bet.odds.toFixed(1)}</span></span>
                              <span>Gain: <span className="text-zinc-300">{bet.potentialPayout} JC</span></span>
                            </div>
                          </div>

                          <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shrink-0
                            ${bet.status === BetStatus.WON ? 'bg-green-500/20 text-green-400' : ''}
                            ${bet.status === BetStatus.LOST ? 'bg-red-500/20 text-red-400' : ''}
                            ${bet.status === BetStatus.PENDING ? 'bg-zinc-700/50 text-zinc-400' : ''}
                          `}>
                            {bet.status === BetStatus.WON && <Trophy className="w-3 h-3" />}
                            {bet.status === BetStatus.LOST && <Skull className="w-3 h-3" />}
                            {bet.status === BetStatus.PENDING && <Clock className="w-3 h-3" />}
                            <span className="hidden sm:inline">
                              {bet.status === BetStatus.WON ? `+${bet.potentialPayout} JC` :
                               bet.status === BetStatus.LOST ? `-${bet.amount} JC` :
                               'En attente'}
                            </span>
                            <span className="sm:hidden">
                              {bet.status === BetStatus.WON ? `+${bet.potentialPayout}` :
                               bet.status === BetStatus.LOST ? `-${bet.amount}` :
                               '...'}
                            </span>
                          </div>
                        </div>

                        {/* Stat qui a résolu le pari */}
                        {bet.resolvedStat && bet.status !== BetStatus.PENDING && (
                          <div className={`text-xs px-2 py-1.5 rounded-md ${
                            bet.status === BetStatus.WON
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            📊 {bet.resolvedStat}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyBets;
