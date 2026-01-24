import React, { useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { Prop } from '../types';
import { useStore } from '../services/store';

interface PropCardProps {
  prop: Prop;
}

const PropCard: React.FC<PropCardProps> = ({ prop }) => {
  const { placeBet, balance } = useStore();
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleBet = () => {
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) {
      setError("Mise invalide");
      return;
    }
    if (val > balance) {
      setError("T'es ruiné mon pote");
      return;
    }
    
    placeBet(prop.id, prop.title, prop.odds, val);
    setAmount('');
    setError(null);
    
    // Tiny feedback
    alert(`Pari validé: ${val} crédits sur "${prop.title}"`);
  };

  return (
    <div className="group relative rounded-xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-red-900/50 hover:bg-slate-900/80">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-bold text-slate-200 group-hover:text-red-400 transition-colors">
            {prop.title}
          </h4>
          <p className="text-sm text-slate-500 mt-1">
            {prop.description}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-amber-500 font-mono font-bold text-sm">
          <TrendingUp className="w-3 h-3" />
          x{prop.odds.toFixed(1)}
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Mise ta fierté"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors"
          />
          <span className="absolute right-3 top-2.5 text-xs text-slate-600 font-mono">CRD</span>
        </div>
        
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}

        <button
          onClick={handleBet}
          disabled={!amount}
          className="w-full py-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Je prends ce risque
        </button>
      </div>
    </div>
  );
};

export default PropCard;