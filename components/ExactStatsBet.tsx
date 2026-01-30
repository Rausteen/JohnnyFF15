import React, { useState } from 'react';
import { Target, Swords, ChevronUp, ChevronDown, Trophy, Loader2, AlertCircle, CheckCircle, UserX } from 'lucide-react';
import { useStore } from '../services/store';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useGameStore } from '../services/gameStore';
import { TrackedPlayer } from '../types';
import { isUserThePlayer } from '../services/playersService';

interface ExactStatsBetProps {
  player?: TrackedPlayer;
}

type BetType = 'kda' | 'damage';

// KDA ranges with odds - based on how likely each range is
const KDA_ODDS: Record<string, { odds: number; label: string; category: 'facile' | 'moyen' | 'difficile' | 'legendaire' }> = {
  '0.0-0.5': { odds: 3.5, label: '0 - 0.5', category: 'moyen' },
  '0.5-1.0': { odds: 2.8, label: '0.5 - 1', category: 'facile' },
  '1.0-1.5': { odds: 2.5, label: '1 - 1.5', category: 'facile' },
  '1.5-2.0': { odds: 3.0, label: '1.5 - 2', category: 'moyen' },
  '2.0-2.5': { odds: 3.8, label: '2 - 2.5', category: 'moyen' },
  '2.5-3.0': { odds: 4.5, label: '2.5 - 3', category: 'difficile' },
  '3.0-4.0': { odds: 5.5, label: '3 - 4', category: 'difficile' },
  '4.0-5.0': { odds: 8.0, label: '4 - 5', category: 'legendaire' },
  '5.0+': { odds: 12.0, label: '5+', category: 'legendaire' },
};

// Damage ranges (in thousands) with odds
const DAMAGE_ODDS: Record<string, { odds: number; label: string; category: 'facile' | 'moyen' | 'difficile' | 'legendaire' }> = {
  '0-5': { odds: 6.0, label: '0 - 5k', category: 'difficile' },
  '5-8': { odds: 4.0, label: '5 - 8k', category: 'moyen' },
  '8-10': { odds: 3.2, label: '8 - 10k', category: 'facile' },
  '10-12': { odds: 3.0, label: '10 - 12k', category: 'facile' },
  '12-15': { odds: 3.2, label: '12 - 15k', category: 'facile' },
  '15-18': { odds: 3.8, label: '15 - 18k', category: 'moyen' },
  '18-22': { odds: 4.5, label: '18 - 22k', category: 'moyen' },
  '22-26': { odds: 6.0, label: '22 - 26k', category: 'difficile' },
  '26-30': { odds: 8.0, label: '26 - 30k', category: 'difficile' },
  '30+': { odds: 12.0, label: '30k+', category: 'legendaire' },
};

const KDA_OPTIONS = Object.keys(KDA_ODDS);
const DAMAGE_OPTIONS = Object.keys(DAMAGE_ODDS);

function getCategoryStyle(category: string): { bg: string; text: string; border: string } {
  switch (category) {
    case 'facile': return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' };
    case 'moyen': return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    case 'difficile': return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' };
    case 'legendaire': return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' };
    default: return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' };
  }
}

const ExactStatsBet: React.FC<ExactStatsBetProps> = ({ player }) => {
  const { placeBet } = useStore();
  const { profile, subtractCredits, recordBetPlaced } = useCreditsStore();
  const { user } = useAuthStore();
  const {
    testMode,
    testMatchId,
    testPlayer,
    playerStates,
  } = useGameStore();

  const activePlayer = testMode ? testPlayer : player;
  const playerState = activePlayer?.puuid ? playerStates.get(activePlayer.puuid) : undefined;
  const isInGame = testMode ? true : (playerState?.isInGame || false);
  const betMatchId = testMode ? testMatchId : playerState?.currentGameId;

  const isSelfBetting = isUserThePlayer(activePlayer, user?.id);

  const [betType, setBetType] = useState<BetType>('kda');
  const [selectedKda, setSelectedKda] = useState('1.0-1.5');
  const [selectedDamage, setSelectedDamage] = useState('10-12');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const credits = profile?.credits || 0;

  const currentOdds = betType === 'kda'
    ? KDA_ODDS[selectedKda]
    : DAMAGE_ODDS[selectedDamage];

  const odds = currentOdds?.odds || 3.0;
  const potentialGain = amount ? Math.floor(parseInt(amount) * odds) : 0;
  const categoryStyle = getCategoryStyle(currentOdds?.category || 'moyen');

  const handlePlaceBet = async () => {
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

    if (!isInGame || !activePlayer) {
      setError("Aucune game en cours");
      return;
    }

    if (isSelfBetting) {
      setError("Tu ne peux pas parier sur toi-même !");
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
      const result = await subtractCredits(val);

      if (!result) {
        setError("Pas assez de Johnny Coins !");
        setLoading(false);
        return;
      }

      let propId: string;
      let propTitle: string;

      if (betType === 'kda') {
        propId = `exact_kda_${selectedKda}`;
        propTitle = `🎯 KDA exact: ${KDA_ODDS[selectedKda].label}`;
      } else {
        propId = `exact_damage_${selectedDamage}`;
        propTitle = `⚔️ Dégâts exacts: ${DAMAGE_ODDS[selectedDamage].label}`;
      }

      const bet = await placeBet(
        propId,
        propTitle,
        odds,
        val,
        betMatchId || undefined,
        undefined,
        user.id,
        undefined,
        activePlayer?.puuid || undefined,
        activePlayer?.displayName
      );

      if (!bet) {
        setError("Erreur lors de l'enregistrement du pari");
        setLoading(false);
        return;
      }

      await recordBetPlaced();
      window.dispatchEvent(new Event('betPlaced'));

      setAmount('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Exact stats bet error:', err);
      setError(err?.message || "Erreur lors du pari");
    } finally {
      setLoading(false);
    }
  };

  const quickBets = [50, 100, 250];

  if (!isInGame) {
    return null;
  }

  return (
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-cyan-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 px-4 py-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              Stats Exactes
              <span className={`px-2 py-0.5 ${categoryStyle.bg} ${categoryStyle.text} text-xs font-bold rounded-full border ${categoryStyle.border}`}>
                {currentOdds?.category?.toUpperCase() || 'MOYEN'}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Prédit le KDA ou les dégâts exacts</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Bet Type Toggle */}
        <div className="flex gap-2 p-1 bg-zinc-800/50 rounded-xl">
          <button
            onClick={() => setBetType('kda')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              betType === 'kda'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            KDA
          </button>
          <button
            onClick={() => setBetType('damage')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              betType === 'damage'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Swords className="w-4 h-4" />
            Dégâts
          </button>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-3 gap-2">
          {(betType === 'kda' ? KDA_OPTIONS : DAMAGE_OPTIONS).map((option) => {
            const optionData = betType === 'kda' ? KDA_ODDS[option] : DAMAGE_ODDS[option];
            const isSelected = betType === 'kda' ? selectedKda === option : selectedDamage === option;
            const style = getCategoryStyle(optionData.category);

            return (
              <button
                key={option}
                onClick={() => {
                  if (betType === 'kda') setSelectedKda(option);
                  else setSelectedDamage(option);
                  setError(null);
                }}
                className={`p-2 rounded-xl text-center transition-all border ${
                  isSelected
                    ? `${style.bg} ${style.border} ${style.text}`
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <div className="text-sm font-bold">{optionData.label}</div>
                <div className={`text-xs ${isSelected ? style.text : 'text-zinc-500'}`}>
                  x{optionData.odds}
                </div>
              </button>
            );
          })}
        </div>

        {/* Odds Display */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="text-zinc-400 text-sm">Cote:</span>
          <span className="text-2xl font-mono font-black text-gold">x{odds.toFixed(2)}</span>
        </div>

        {/* Quick Bet Buttons */}
        <div className="flex gap-2">
          {quickBets.map((bet) => (
            <button
              key={bet}
              onClick={() => setAmount(bet.toString())}
              disabled={bet > credits}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                amount === bet.toString()
                  ? 'bg-cyan-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {bet}
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
          placeholder="Mise personnalisée"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
        />

        {/* Potential Gain */}
        {amount && parseInt(amount) > 0 && (
          <div className="flex justify-between text-sm px-3 py-2 bg-gold/5 rounded-lg border border-gold/20">
            <span className="text-zinc-400">Gain potentiel:</span>
            <span className="text-gold font-bold font-mono text-lg">
              {potentialGain.toLocaleString()} JC
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Pari Stats Exactes validé !
          </div>
        )}

        {/* Place Bet Button */}
        <button
          onClick={handlePlaceBet}
          disabled={!isInGame || !amount || loading || !user || isSelfBetting}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validation...
            </>
          ) : !user ? (
            'Connecte-toi pour parier'
          ) : isSelfBetting ? (
            <>
              <UserX className="w-4 h-4" />
              Tu ne peux pas parier sur toi
            </>
          ) : (
            <>
              <Target className="w-4 h-4" />
              {betType === 'kda' ? `Parier KDA ${KDA_ODDS[selectedKda].label}` : `Parier ${DAMAGE_ODDS[selectedDamage].label}`}
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-center text-xs text-zinc-500">
          {betType === 'kda'
            ? 'KDA = (Kills + Assists) / max(1, Deaths)'
            : 'Dégâts aux champions à la fin de la game'}
        </p>
      </div>
    </div>
  );
};

export default ExactStatsBet;
