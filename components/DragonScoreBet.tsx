import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Flame, Trophy, Loader2, AlertCircle, CheckCircle, UserX } from 'lucide-react';
import { useStore } from '../services/store';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useGameStore } from '../services/gameStore';
import { TrackedPlayer } from '../types';
import { isUserThePlayer } from '../services/playersService';
import { getUserPendingBets } from '../services/betsService';

interface DragonScoreBetProps {
  player?: TrackedPlayer;
}

// Fixed odds for all dragon scores
const DRAGON_SCORE_ODDS = 36;

// Max bets per game
const MAX_DRAGON_BETS = 2;

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
    isAnyPlayerInGame,
    bettingLimitEnabled
  } = useGameStore();

  const activePlayer = testMode ? testPlayer : player;
  const playerState = activePlayer?.puuid ? playerStates.get(activePlayer.puuid) : undefined;
  const currentGame = playerState?.currentGame;
  const isInGame = testMode ? true : (playerState?.isInGame || false);
  const betMatchId = testMode ? testMatchId : playerState?.currentGameId;

  // Check if user is the player they're trying to bet on (self-betting prevention)
  const isSelfBetting = isUserThePlayer(activePlayer, user?.id);

  // Calculate game time in minutes for betting window
  const gameTimeMinutes = currentGame
    ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60)
    : 0;

  // Check if betting window is closed (4 minutes)
  const isBettingWindowClosed = bettingLimitEnabled && isInGame && gameTimeMinutes >= 4;

  const [teamDragons, setTeamDragons] = useState(2);
  const [enemyDragons, setEnemyDragons] = useState(1);
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragonBetsCount, setDragonBetsCount] = useState(0);

  const credits = profile?.credits || 0;
  const odds = DRAGON_SCORE_ODDS;
  const potentialGain = amount ? Math.floor(parseInt(amount) * odds) : 0;

  // Count existing dragon bets for this game
  useEffect(() => {
    const countDragonBets = async () => {
      if (!user || !betMatchId) {
        setDragonBetsCount(0);
        return;
      }
      try {
        const pendingBets = await getUserPendingBets(user.id);
        const count = pendingBets.filter(
          bet => bet.matchId === betMatchId && bet.propId.startsWith('dragon_score_')
        ).length;
        setDragonBetsCount(count);
      } catch (err) {
        console.error('Error counting dragon bets:', err);
      }
    };
    countDragonBets();

    // Listen for bet placed events to refresh count
    const handleBetPlaced = () => countDragonBets();
    window.addEventListener('betPlaced', handleBetPlaced);
    return () => window.removeEventListener('betPlaced', handleBetPlaced);
  }, [user, betMatchId]);

  // Check if max dragon bets reached
  const maxDragonBetsReached = dragonBetsCount >= MAX_DRAGON_BETS;

  const adjustScore = (team: 'ally' | 'enemy', delta: number) => {
    if (team === 'ally') {
      setTeamDragons(prev => Math.max(0, Math.min(5, prev + delta)));
    } else {
      setEnemyDragons(prev => Math.max(0, Math.min(5, prev + delta)));
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

    // Check betting window (4 minutes)
    if (isBettingWindowClosed) {
      setError("Paris fermés après 4 minutes");
      return;
    }

    // Check max dragon bets limit
    if (maxDragonBetsReached) {
      setError(`Max ${MAX_DRAGON_BETS} paris dragons par game !`);
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
                x{DRAGON_SCORE_ODDS}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Prédit le score exact des dragons</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Presets */}
        <div className="flex gap-2 justify-center flex-wrap">
          {[
            { t: 2, e: 1, label: '2-1' },
            { t: 3, e: 2, label: '3-2' },
            { t: 4, e: 0, label: '4-0' },
            { t: 0, e: 4, label: '0-4' },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setTeamDragons(preset.t);
                setEnemyDragons(preset.e);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                teamDragons === preset.t && enemyDragons === preset.e
                  ? 'bg-amber-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

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
          <span className="text-2xl font-mono font-black text-gold">x{odds}</span>
        </div>

        {/* Dragon bets remaining */}
        <div className={`text-center text-xs font-bold ${maxDragonBetsReached ? 'text-red-400' : 'text-zinc-400'}`}>
          {maxDragonBetsReached
            ? `⚠️ Maximum ${MAX_DRAGON_BETS} paris dragons atteint !`
            : `${MAX_DRAGON_BETS - dragonBetsCount} paris dragons restants`
          }
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
          disabled={!isInGame || !amount || loading || !user || isSelfBetting || isBettingWindowClosed || maxDragonBetsReached}
          className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          ) : isBettingWindowClosed ? (
            'Paris fermés (4 min)'
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
