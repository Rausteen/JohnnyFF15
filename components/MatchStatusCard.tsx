import React from 'react';
import { Gamepad2, WifiOff, Clock } from 'lucide-react';
import { useStore } from '../services/store';
import { MatchStatus } from '../types';

const MatchStatusCard = () => {
  const { gameState } = useStore();
  
  if (gameState.status === MatchStatus.OFFLINE) {
    return (
      <div className="w-full rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
        <div className="p-4 rounded-full bg-slate-800/50">
          <WifiOff className="w-8 h-8 text-slate-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-300">Johnny n'est pas en game</h3>
          <p className="text-slate-500 mt-1">Le calme avant la tempête. Préparez vos crédits.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl border border-red-900/50 bg-gradient-to-b from-slate-900 to-slate-950 p-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 overflow-hidden">
                {/* Placeholder champion icon */}
                <Gamepad2 className="w-8 h-8 text-slate-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 uppercase">
               Ranked
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h3 className="text-2xl font-bold text-white tracking-tight">
                {gameState.currentChampion}
               </h3>
               <span className="animate-pulse px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/20">
                 LIVE
               </span>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-1">
              <Clock className="w-3 h-3" /> 12:34 (Estimation)
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-950/30 border border-red-900/50">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-fast"></div>
            <span className="text-sm font-bold text-red-400 uppercase tracking-wide">
              Paris Ouverts
            </span>
          </div>
          <p className="text-xs text-slate-500 italic text-right">
            "Si je perds c'est le jungler"
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatchStatusCard;