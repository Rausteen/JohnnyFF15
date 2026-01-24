import React, { useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Prop } from '../types';
import { useStore } from '../services/store';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useGameStore } from '../services/gameStore';

interface PropCardProps {
  prop: Prop;
}

const PropCard: React.FC<PropCardProps> = ({ prop }) => {
  const { placeBet } = useStore();
  const { profile, subtractCredits } = useCreditsStore();
  const { user } = useAuthStore();
  const { isInGame, currentGame } = useGameStore();

  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate game time in minutes
  const gameTimeMinutes = currentGame
    ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60)
    : 0;

  // Check if betting is allowed based on prop type and game time
  const canBetOnProp = () => {
    if (!isInGame) return false;

    // Some props are only available early game (e.g., "0/10 avant 15min")
    if (prop.maxGameTime && gameTimeMinutes > prop.maxGameTime) {
      return false;
    }

    return true;
  };

  const handleBet = async () => {
    setError(null);
    setSuccess(false);

    // Validation
    if (!user) {
      setError("Connecte-toi pour parier !");
      return;
    }

    if (!profile) {
      setError("Profil non chargé");
      return;
    }

    if (!isInGame) {
      setError("Aucune game en cours");
      return;
    }

    if (!canBetOnProp()) {
      setError("Ce pari n'est plus disponible");
      return;
    }

    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) {
      setError("Mise invalide");
      return;
    }

    if (val > profile.credits) {
      setError("T'es ruiné mon pote");
      return;
    }

    if (val < 10) {
      setError("Mise minimum: 10 crédits");
      return;
    }

    setLoading(true);

    try {
      // Subtract credits from Supabase
      const success = await subtractCredits(val);

      if (!success) {
        setError("Erreur lors du paiement");
        setLoading(false);
        return;
      }

      // Place bet in local store
      placeBet(prop.id, prop.title, prop.odds, val);

      setAmount('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Erreur lors du pari");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !canBetOnProp() || !amount || loading || !user;
  const credits = profile?.credits || 0;

  // Quick bet amounts
  const quickBets = [50, 100, 500];

  return (
    <div className={`group relative rounded-2xl border bg-zinc-900/80 p-5 transition-all ${
      canBetOnProp()
        ? 'border-zinc-800 hover:border-primary/50 hover:bg-zinc-900'
        : 'border-zinc-800/50 opacity-60'
    }`}>
      {/* Prop header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h4 className="font-bold text-white group-hover:text-primary transition-colors">
            {prop.title}
          </h4>
          <p className="text-sm text-zinc-500 mt-1">
            {prop.description}
          </p>
          {prop.maxGameTime && (
            <p className="text-xs text-amber-500 mt-2">
              ⏱️ Disponible avant {prop.maxGameTime} min
              {gameTimeMinutes > 0 && ` (${gameTimeMinutes} min écoulées)`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-sm ml-3">
          <TrendingUp className="w-3.5 h-3.5" />
          x{prop.odds.toFixed(1)}
        </div>
      </div>

      {/* Betting form */}
      <div className="space-y-3">
        {/* Quick bet buttons */}
        <div className="flex gap-2">
          {quickBets.map((bet) => (
            <button
              key={bet}
              onClick={() => setAmount(bet.toString())}
              disabled={!canBetOnProp() || bet > credits}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                amount === bet.toString()
                  ? 'bg-primary text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {bet}
            </button>
          ))}
          <button
            onClick={() => setAmount(Math.floor(credits / 2).toString())}
            disabled={!canBetOnProp() || credits < 20}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            50%
          </button>
        </div>

        {/* Amount input */}
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            placeholder="Mise ta fierté"
            disabled={!canBetOnProp()}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
          <span className="absolute right-4 top-3.5 text-xs text-zinc-500 font-mono">CRD</span>
        </div>

        {/* Potential gain display */}
        {amount && parseInt(amount) > 0 && (
          <div className="flex justify-between text-sm px-1">
            <span className="text-zinc-500">Gain potentiel:</span>
            <span className="text-gold font-bold font-mono">
              {Math.floor(parseInt(amount) * prop.odds)} CRD
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Pari validé !
          </div>
        )}

        {/* Bet button */}
        <button
          onClick={handleBet}
          disabled={isDisabled}
          className="w-full py-3 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validation...
            </>
          ) : !user ? (
            'Connecte-toi pour parier'
          ) : !canBetOnProp() ? (
            'Pari indisponible'
          ) : (
            'Je prends ce risque'
          )}
        </button>
      </div>
    </div>
  );
};

export default PropCard;
