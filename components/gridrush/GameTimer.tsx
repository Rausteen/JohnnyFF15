import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const GameTimer: React.FC<{ timeRemaining: number }> = ({ timeRemaining }) => {
  const m = Math.floor(timeRemaining / 60);
  const s = timeRemaining % 60;
  const low = timeRemaining <= 120;
  const crit = timeRemaining <= 30;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg transition-all ${
      crit ? 'bg-red-900/50 text-red-300 border border-red-500/50 animate-pulse'
        : low ? 'bg-amber-900/40 text-amber-300 border border-amber-500/40'
        : 'bg-zinc-800/80 text-white border border-zinc-700'
    }`}>
      {crit ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
      <span>{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
    </div>
  );
};

export default GameTimer;
