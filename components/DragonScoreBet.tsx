import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Flame, Trophy, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../services/store';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useGameStore } from '../services/gameStore';
import { TrackedPlayer } from '../types';

interface DragonScoreBetProps {
  player?: TrackedPlayer;
}

// Calculate odds based on score probability
// More extreme/rare scores = higher odds
function calculateDragonOdds(teamDragons: number, enemyDragons: number): number {
  // Base probability distribution for dragon scores
  // Average game has ~4-6 total dragons, distributed between teams
  const totalDragons = teamDragons + enemyDragons;

  // Probability factors:
  // 1. Total dragons: 3-5 total is most common
  // 2. Score difference: close games more likely
  // 3. Exact score match: always low probability

  let baseProbability = 0.15; // Base 15% chance

  // Adjust for total dragons (0-8 range realistic)
  if (totalDragons === 0) baseProbability *= 0.1; // Very rare: no dragons
  else if (totalDragons <= 2) baseProbability *= 0.4;
  else if (totalDragons <= 4) baseProbability *= 1.0; // Most common
  else if (totalDragons <= 6) baseProbability *= 0.8;
  else if (totalDragons <= 8) baseProbability *= 0.3;
  else baseProbability *= 0.05; // Very rare: 9+ dragons

  // Adjust for score difference (close games more likely)
  const diff = Math.abs(teamDragons - enemyDragons);
  if (diff === 0) baseProbability *= 0.7; // Ties less common in objectives
  else if (diff === 1) baseProbability *= 1.0;
  else if (diff === 2) baseProbability *= 0.8;
  else if (diff === 3) baseProbability *= 0.4;
  else baseProbability *= 0.2; // 4+ diff is soul + elder territory

  // Exact score penalty (guessing exact is hard)
  baseProbability *= 0.5;

  // Convert probability to odds (minimum 2.0, max 50.0)
  const odds = Math.min(50, Math.max(2.0, 1 / baseProbability));

  // Round to 1 decimal
  return Math.round(odds * 10) / 10;
}

const DragonScoreBet: React.FC<DragonScoreBetProps> = ({ player }) => {
  const { placeBet } = useStore();
  const { profile, subtractCredits, recordBetPlaced } = useCreditsStore();
  const { user } = useAuthStore();
  const {
    testMode,
    testMatchId,
    testMatchData,
    testPlayer,
    playerStates,
    isAnyPlayerInGame
  } = useGameStore();

  const activePlayer = testMode ? testPlayer : player;
  const playerState = activePlayer?.puuid ? playerStates.get(activePlayer.puuid) : undefined;
  const isInGame = testMode ? true : (playerState?.isInGame || false);
  const betMatchId = testMode ? testMatchId : playerState?.currentGameId;

  const [teamDragons, setTeamDragons] = useState(2);
  const [enemyDragons, setEnemyDragons] = useState(1);
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const credits = profile?.credits || 0;
  const odds = calculateDragonOdds(teamDragons, enemyDragons);
  const potentialGain = amount ? Math.floor(parseInt(amount) * odds) : 0;

  const adjustScore = (team: 'ally' | 'enemy', delta: number) => {
    if (team === 'ally') {
      setTeamDragons(prev => Math.max(0, Math.min(8, prev + delta)));
    } else {
      setEnemyDragons(prev => Math.max(0, Math.min(8, prev + delta)));
    }
    setError(null);
  };

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

      // Create unique prop ID for dragon score bet
      const propId = `dragon_score_${teamDragons}_${enemyDragons}`;
      const propTitle = `🐉 Score Dragons: ${teamDragons} - ${enemyDragons}`;

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
      console.error('Dragon score bet error:', err);
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
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-amber-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 px-4 py-3 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              Dragon Score
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
                PRESTIGE
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Prédit le score exact des dragons</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Score Selector - Football Style */}
        <div className="flex items-center justify-center gap-4">
          {/* Team Score */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-green-400 font-bold mb-2 uppercase tracking-wide">
              {activePlayer?.displayName || 'Équipe'}
            </span>
            <div className="flex flex-col items-center bg-zinc-800/50 rounded-xl border border-green-500/30 overflow-hidden">
              <button
                onClick={() => adjustScore('ally', 1)}
                className="w-full p-2 hover:bg-green-500/20 transition-colors border-b border-zinc-700"
              >
                <ChevronUp className="w-5 h-5 text-green-400 mx-auto" />
              </button>
              <div className="px-6 py-3">
                <span className="text-4xl font-black text-white font-mono">{teamDragons}</span>
              </div>
              <button
                onClick={() => adjustScore('ally', -1)}
                className="w-full p-2 hover:bg-green-500/20 transition-colors border-t border-zinc-700"
              >
                <ChevronDown className="w-5 h-5 text-green-400 mx-auto" />
              </button>
            </div>
          </div>

          {/* VS Separator */}
          <div className="flex flex-col items-center gap-1">
            <Flame className="w-6 h-6 text-amber-500" />
            <span className="text-2xl font-black text-zinc-600">-</span>
            <Flame className="w-6 h-6 text-red-500" />
          </div>

          {/* Enemy Score */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-red-400 font-bold mb-2 uppercase tracking-wide">
              Adversaires
            </span>
            <div className="flex flex-col items-center bg-zinc-800/50 rounded-xl border border-red-500/30 overflow-hidden">
              <button
                onClick={() => adjustScore('enemy', 1)}
                className="w-full p-2 hover:bg-red-500/20 transition-colors border-b border-zinc-700"
              >
                <ChevronUp className="w-5 h-5 text-red-400 mx-auto" />
              </button>
              <div className="px-6 py-3">
                <span className="text-4xl font-black text-white font-mono">{enemyDragons}</span>
              </div>
              <button
                onClick={() => adjustScore('enemy', -1)}
                className="w-full p-2 hover:bg-red-500/20 transition-colors border-t border-zinc-700"
              >
                <ChevronDown className="w-5 h-5 text-red-400 mx-auto" />
              </button>
            </div>
          </div>
        </div>

        {/* Odds Display */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="text-zinc-400 text-sm">Cote:</span>
          <span className="text-2xl font-mono font-black text-gold">x{odds.toFixed(1)}</span>
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
                  ? 'bg-amber-500 text-white'
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
          placeholder="Mise ton all-in"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
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
            Pari Dragon Score validé !
          </div>
        )}

        {/* Place Bet Button */}
        <button
          onClick={handlePlaceBet}
          disabled={!isInGame || !amount || loading || !user}
          className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validation...
            </>
          ) : !user ? (
            'Connecte-toi pour parier'
          ) : (
            <>
              <Flame className="w-4 h-4" />
              Parier {teamDragons} - {enemyDragons}
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-center text-xs text-zinc-500">
          Score exact des dragons à la fin de la game
        </p>
      </div>
    </div>
  );
};

export default DragonScoreBet;
