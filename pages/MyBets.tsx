import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../services/store';
import { useAuthStore } from '../services/authStore';
import { BetStatus, Bet } from '../types';
import { Filter, TrendingDown, TrendingUp, Wallet, ChevronDown, ChevronUp, Swords } from 'lucide-react';

interface GameGroup {
  matchId: string;
  championName: string;
  bets: Bet[];
  timestamp: number;
}

const MyBets = () => {
  const { bets } = useStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<BetStatus | 'ALL'>('ALL');
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());

  // Redirect non-logged-in users to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Filter bets by current user
  const userBets = useMemo(() => {
    return bets.filter(b => b.userId === user.id);
  }, [bets, user.id]);

  const filteredBets = filter === 'ALL' ? userBets : userBets.filter(b => b.status === filter);

  // Group bets by matchId
  const gameGroups = useMemo(() => {
    const groups = new Map<string, GameGroup>();

    filteredBets.forEach(bet => {
      const key = bet.matchId || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, {
          matchId: key,
          championName: bet.championName || 'Inconnu',
          bets: [],
          timestamp: bet.timestamp
        });
      }
      groups.get(key)!.bets.push(bet);
    });

    // Sort by most recent first
    return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredBets]);

  // Stats (from user's bets only)
  const totalWagered = userBets.reduce((acc, b) => acc + b.amount, 0);
  const totalWon = userBets
    .filter(b => b.status === BetStatus.WON)
    .reduce((acc, b) => acc + b.potentialPayout, 0);
  const netProfit = totalWon - totalWagered;
  const winRate = userBets.length > 0
    ? (userBets.filter(b => b.status === BetStatus.WON).length / userBets.length) * 100
    : 0;

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

  // Get game result for a group
  const getGameResult = (group: GameGroup) => {
    const wonBets = group.bets.filter(b => b.status === BetStatus.WON);
    const lostBets = group.bets.filter(b => b.status === BetStatus.LOST);
    const pendingBets = group.bets.filter(b => b.status === BetStatus.PENDING);

    if (pendingBets.length > 0) return 'pending';
    if (wonBets.length > 0 && lostBets.length === 0) return 'won';
    if (lostBets.length > 0 && wonBets.length === 0) return 'lost';
    return 'mixed';
  };

  // Get net result for a group
  const getGroupNetResult = (group: GameGroup) => {
    return group.bets.reduce((acc, bet) => {
      if (bet.status === BetStatus.WON) return acc + bet.potentialPayout;
      if (bet.status === BetStatus.LOST) return acc - bet.amount;
      return acc;
    }, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-white mb-8">Archives de la honte</h1>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 mb-2 text-slate-400">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium">Crédits Sacrifiés</span>
          </div>
          <div className="text-2xl font-bold text-white">{totalWagered.toLocaleString()}</div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 mb-2 text-slate-400">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Retour sur mauvaise foi</span>
          </div>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {netProfit > 0 ? '+' : ''}{netProfit.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
           <div className="flex items-center gap-3 mb-2 text-slate-400">
            <TrendingDown className="w-5 h-5" />
            <span className="text-sm font-medium">Taux de miracles</span>
          </div>
          <div className="text-2xl font-bold text-amber-500">{winRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {[
          { id: 'ALL', label: 'Tout' },
          { id: BetStatus.PENDING, label: 'En cours' },
          { id: BetStatus.WON, label: 'Gagnés (GG)' },
          { id: BetStatus.LOST, label: 'Perdus (Cheh)' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Games List */}
      <div className="space-y-4">
        {gameGroups.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
            <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Aucun pari pour le moment.</p>
            <p className="text-sm mt-2">Place des paris quand Johnny est en game !</p>
          </div>
        ) : (
          gameGroups.map((group) => {
            const isExpanded = expandedGames.has(group.matchId);
            const result = getGameResult(group);
            const netResult = getGroupNetResult(group);

            return (
              <div key={group.matchId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Game Header */}
                <button
                  onClick={() => toggleGame(group.matchId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result === 'won' ? 'bg-green-500/20 text-green-400' :
                      result === 'lost' ? 'bg-red-500/20 text-red-400' :
                      result === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      <Swords className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{group.championName}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(group.timestamp).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        {group.bets.length} pari{group.bets.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`font-mono font-bold ${
                        netResult > 0 ? 'text-green-400' :
                        netResult < 0 ? 'text-red-400' :
                        'text-slate-400'
                      }`}>
                        {netResult > 0 ? '+' : ''}{netResult} JC
                      </div>
                      <div className={`text-xs uppercase font-bold ${
                        result === 'won' ? 'text-green-400' :
                        result === 'lost' ? 'text-red-400' :
                        result === 'pending' ? 'text-amber-400' :
                        'text-purple-400'
                      }`}>
                        {result === 'won' ? 'Gagné' :
                         result === 'lost' ? 'Perdu' :
                         result === 'pending' ? 'En cours' :
                         'Mixte'}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Bets in this game */}
                {isExpanded && (
                  <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                    {group.bets.map((bet) => (
                      <div key={bet.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{bet.propTitle}</h3>
                            <span className="text-xs text-slate-500 font-mono">#{bet.id.slice(-4)}</span>
                          </div>
                          <div className="text-sm text-slate-400">
                            Misé: <span className="text-slate-200">{bet.amount}</span> • Cote: <span className="text-amber-500">x{bet.odds}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                          <div className="text-right">
                            <span className="block text-xs text-slate-500">Résultat</span>
                            <span className={`font-mono font-bold ${
                              bet.status === BetStatus.WON ? 'text-green-400' :
                              bet.status === BetStatus.LOST ? 'text-red-400' : 'text-slate-300'
                            }`}>
                              {bet.status === BetStatus.WON ? `+${bet.potentialPayout}` :
                               bet.status === BetStatus.LOST ? `-${bet.amount}` : '...'}
                            </span>
                          </div>

                          <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider
                            ${bet.status === BetStatus.WON ? 'bg-green-950 text-green-400 border border-green-900' : ''}
                            ${bet.status === BetStatus.LOST ? 'bg-red-950 text-red-400 border border-red-900' : ''}
                            ${bet.status === BetStatus.PENDING ? 'bg-slate-800 text-slate-400 border border-slate-700' : ''}
                          `}>
                            {bet.status}
                          </div>
                        </div>
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
