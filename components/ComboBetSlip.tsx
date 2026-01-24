import React, { useState } from 'react';
import { X, Layers, TrendingUp, AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { useComboStore } from '../services/comboStore';
import { useStore } from '../services/store';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useGameStore } from '../services/gameStore';

const ComboBetSlip: React.FC = () => {
  const { selections, totalOdds, removeFromCombo, clearCombo } = useComboStore();
  const { placeBet } = useStore();
  const { profile, subtractCredits, recordBetPlaced } = useCreditsStore();
  const { user } = useAuthStore();
  const { isInGame } = useGameStore();

  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const credits = profile?.credits || 0;
  const combinedOdds = totalOdds();
  const potentialGain = amount ? Math.floor(parseInt(amount) * combinedOdds) : 0;

  const handlePlaceCombo = async () => {
    setError(null);
    setSuccess(false);

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

    if (selections.length < 2) {
      setError("Minimum 2 paris pour un combiné");
      return;
    }

    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) {
      setError("Mise invalide");
      return;
    }

    if (val > credits) {
      setError("T'es ruiné mon pote");
      return;
    }

    if (val < 10) {
      setError("Mise minimum: 10 JC");
      return;
    }

    setLoading(true);

    try {
      // Subtract credits from Supabase
      const result = await subtractCredits(val);

      if (!result) {
        setError("Pas assez de Johnny Coins !");
        setLoading(false);
        return;
      }

      // Place each bet in the combo as a linked bet
      const comboId = `combo_${Date.now()}`;
      selections.forEach((sel, index) => {
        placeBet(
          sel.prop.id,
          `[COMBO ${index + 1}/${selections.length}] ${sel.prop.title}`,
          combinedOdds, // Use combined odds for display
          index === 0 ? val : 0 // Only first bet shows the amount
        );
      });

      // Record bet for stats
      await recordBetPlaced(val);

      setAmount('');
      setSuccess(true);
      clearCombo();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Combo bet error:', err);
      setError(err?.message || "Erreur lors du pari");
    } finally {
      setLoading(false);
    }
  };

  // Quick bet amounts
  const quickBets = [50, 100, 250];

  if (selections.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white">Combiné</div>
              <div className="text-xs text-zinc-400">{selections.length} paris</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-zinc-400">Cote totale</div>
              <div className="text-lg font-mono font-bold text-gold">x{combinedOdds.toFixed(2)}</div>
            </div>
            <X className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-0' : 'rotate-45'}`} />
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Selection list */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selections.map((sel, index) => (
                <div
                  key={sel.prop.id}
                  className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{sel.prop.title}</div>
                    <div className="text-xs text-zinc-500">x{sel.prop.odds.toFixed(1)}</div>
                  </div>
                  <button
                    onClick={() => removeFromCombo(sel.prop.id)}
                    className="ml-2 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Clear all button */}
            <button
              onClick={clearCombo}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Vider le combiné
            </button>

            {/* Quick bet buttons */}
            <div className="flex gap-2">
              {quickBets.map((bet) => (
                <button
                  key={bet}
                  onClick={() => setAmount(bet.toString())}
                  disabled={bet > credits}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    amount === bet.toString()
                      ? 'bg-primary text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {bet}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              placeholder="Mise ton all-in"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors"
            />

            {/* Potential gain */}
            {amount && parseInt(amount) > 0 && (
              <div className="flex justify-between text-sm px-1 py-2 bg-gold/5 rounded-lg border border-gold/20">
                <span className="text-zinc-400">Gain potentiel:</span>
                <span className="text-gold font-bold font-mono text-lg">
                  {potentialGain.toLocaleString()} JC
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
                Combiné validé !
              </div>
            )}

            {/* Place bet button */}
            <button
              onClick={handlePlaceCombo}
              disabled={!isInGame || !amount || loading || !user || selections.length < 2}
              className="w-full py-3 bg-gradient-to-r from-primary via-accent to-primary-glow hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validation...
                </>
              ) : !user ? (
                'Connecte-toi pour parier'
              ) : !isInGame ? (
                'Attends une game'
              ) : selections.length < 2 ? (
                'Ajoute des paris'
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Valider le combiné x{combinedOdds.toFixed(1)}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComboBetSlip;
