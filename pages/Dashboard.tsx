import React from 'react';
import MatchStatusCard from '../components/MatchStatusCard';
import PropCard from '../components/PropCard';
import { MOCK_PROPS } from '../services/mockData';
import { useStore } from '../services/store';
import { MatchStatus, BetStatus } from '../types';
import { XCircle, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const { gameState, bets, cancelBet } = useStore();

  const activeBets = bets.filter(b => b.matchId === gameState.matchId);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Top Section */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">État de la game</h2>
        <MatchStatusCard />
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Betting Props */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               Pariez sur le chaos
               {gameState.status === MatchStatus.LIVE && (
                 <span className="text-xs font-normal px-2 py-1 bg-red-900/30 text-red-400 rounded-full border border-red-900/50">
                    LIVE
                 </span>
               )}
             </h2>
          </div>

          {gameState.status === MatchStatus.LIVE ? (
            <div className="grid md:grid-cols-2 gap-4">
              {MOCK_PROPS.map(prop => (
                <PropCard key={prop.id} prop={prop} />
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-xl border border-dashed border-slate-800 text-center text-slate-500">
              <p>Les paris sont fermés. Attendez que Johnny lance une game.</p>
              <p className="text-sm mt-2 opacity-50">(Allez voir l'Admin pour le forcer à jouer)</p>
            </div>
          )}
        </section>

        {/* Right Column: Active Bets */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white">Tes choix de vie</h2>
          
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {activeBets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Aucun pari en cours.<br/>Tu as peur ou quoi ?
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {activeBets.map(bet => (
                  <div key={bet.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-200 text-sm">{bet.propTitle}</span>
                      <span className="text-amber-500 font-mono text-xs">x{bet.odds}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                      <span>Mise: {bet.amount}</span>
                      <span>Gain: {bet.potentialPayout}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border 
                        ${bet.status === BetStatus.PENDING ? 'bg-slate-800 border-slate-700 text-slate-400' : ''}
                        ${bet.status === BetStatus.WON ? 'bg-green-900/20 border-green-900 text-green-400' : ''}
                        ${bet.status === BetStatus.LOST ? 'bg-red-900/20 border-red-900 text-red-400' : ''}
                      `}>
                         {bet.status === BetStatus.PENDING && <><Clock className="w-3 h-3"/> En attente</>}
                         {bet.status === BetStatus.WON && <><CheckCircle className="w-3 h-3"/> Gagné</>}
                         {bet.status === BetStatus.LOST && <><XCircle className="w-3 h-3"/> Perdu</>}
                      </span>

                      {bet.status === BetStatus.PENDING && (
                        <button 
                          onClick={() => cancelBet(bet.id)}
                          className="text-xs text-red-400 hover:text-red-300 underline"
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
    </div>
  );
};

export default Dashboard;