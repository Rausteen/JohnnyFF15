import React, { useState } from 'react';
import { useStore } from '../services/store';
import { BetStatus } from '../types';
import { Filter, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

const MyBets = () => {
  const { bets } = useStore();
  const [filter, setFilter] = useState<BetStatus | 'ALL'>('ALL');

  const filteredBets = filter === 'ALL' ? bets : bets.filter(b => b.status === filter);

  // Stats
  const totalWagered = bets.reduce((acc, b) => acc + b.amount, 0);
  const totalWon = bets
    .filter(b => b.status === BetStatus.WON)
    .reduce((acc, b) => acc + b.potentialPayout, 0);
  const netProfit = totalWon - totalWagered;
  const winRate = bets.length > 0 
    ? (bets.filter(b => b.status === BetStatus.WON).length / bets.length) * 100 
    : 0;

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

      {/* List */}
      <div className="space-y-4">
        {filteredBets.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
            <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Rien à voir ici.</p>
          </div>
        ) : (
          filteredBets.map((bet) => (
            <div key={bet.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          ))
        )}
      </div>
    </div>
  );
};

export default MyBets;