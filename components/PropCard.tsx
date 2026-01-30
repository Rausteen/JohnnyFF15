import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2, Plus, Check, Layers, UserX } from 'lucide-react';
import { Prop, TrackedPlayer } from '../types';
import { useStore } from '../services/store';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useGameStore } from '../services/gameStore';
import { useComboStore } from '../services/comboStore';
import { isUserThePlayer } from '../services/playersService';
import { getAdjustedOdds, getOddsAdjustmentInfo } from '../services/oddsService';

interface PropCardProps {
  prop: Prop;
  player?: TrackedPlayer; // The player we're betting on
}

const PropCard: React.FC<PropCardProps> = ({ prop, player }) => {
  const { placeBet } = useStore();
  const { profile, subtractCredits, recordBetPlaced } = useCreditsStore();
  const { user } = useAuthStore();
  const {
    isAnyPlayerInGame,
    testMode,
    testMatchId,
    testMatchData,
    testPlayer,
    playerStates,
    getPlayerSkillRating
  } = useGameStore();
  const { addToCombo, removeFromCombo, isInCombo, selections } = useComboStore();

  const inCombo = isInCombo(prop.id);

  // Use the player prop or fall back to test player
  const activePlayer = testMode ? testPlayer : player;
  const playerState = activePlayer?.puuid ? playerStates.get(activePlayer.puuid) : undefined;
  const currentGame = playerState?.currentGame;
  const isInGame = testMode ? true : (playerState?.isInGame || false);

  // Get the match ID for the current bet (live game ID or test mode ID)
  const betMatchId = testMode ? testMatchId : playerState?.currentGameId;

  // Get player skill rating and calculate adjusted odds
  const skillRating = activePlayer?.puuid ? getPlayerSkillRating(activePlayer.puuid) : null;
  const { adjustedOdds, propType } = useMemo(
    () => getAdjustedOdds(prop, skillRating),
    [prop, skillRating]
  );
  const oddsInfo = useMemo(
    () => getOddsAdjustmentInfo(prop.odds, adjustedOdds, propType),
    [prop.odds, adjustedOdds, propType]
  );

  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate game time in minutes
  const gameTimeMinutes = currentGame
    ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60)
    : 0;

  // Check if user is the player they're trying to bet on (self-betting prevention)
  const isSelfBetting = isUserThePlayer(activePlayer, user?.id);

  // Check if betting is allowed based on prop type and game time
  const canBetOnProp = () => {
    if (!isInGame || !activePlayer) return false;

    // Prevent self-betting
    if (isSelfBetting) return false;

    // Global betting window: only allow bets in the first 4 minutes
    if (gameTimeMinutes >= 4) {
      return false;
    }

    return true;
  };

  // Check if betting window is closed (4 minutes)
  const isBettingWindowClosed = isInGame && gameTimeMinutes >= 4;

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

    if (!isInGame || !activePlayer) {
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

      // Get champion name from current game or test match
      let championName = 'Inconnu';
      if (testMode && testMatchData && testPlayer) {
        const playerStats = testMatchData.info.participants.find(p => p.puuid === testPlayer.puuid);
        championName = playerStats?.championName || 'Inconnu';
      } else if (currentGame && activePlayer) {
        const playerInGame = currentGame.participants.find(p => p.puuid === activePlayer.puuid);
        if (playerInGame) {
          // Get champion name from ID
          const { getChampionName } = await import('../services/riotApi');
          championName = getChampionName(playerInGame.championId);
        }
      }

      // Place bet in Supabase with match ID, user ID, champion, and player info
      // Use adjusted odds based on player skill rating
      const bet = await placeBet(
        prop.id,
        prop.title,
        adjustedOdds,
        val,
        betMatchId || undefined,
        undefined,
        user.id,
        championName,
        activePlayer?.puuid,
        activePlayer?.displayName
      );

      if (!bet) {
        setError("Erreur lors de l'enregistrement du pari");
        setLoading(false);
        return;
      }

      // Record bet for stats
      await recordBetPlaced();

      // Notify Dashboard to refresh bets list
      window.dispatchEvent(new Event('betPlaced'));

      setAmount('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Bet error:', err);
      setError(err?.message || "Erreur lors du pari");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !canBetOnProp() || !amount || loading || !user;
  const credits = profile?.credits || 0;

  // Quick bet amounts
  const quickBets = [50, 100, 500];

  return (
    <div className={`group relative rounded-xl sm:rounded-2xl border bg-zinc-900/80 p-3 sm:p-5 transition-all ${
      canBetOnProp()
        ? 'border-zinc-800 hover:border-primary/50 hover:bg-zinc-900'
        : 'border-zinc-800/50 opacity-60'
    }`}>
      {/* Prop header */}
      <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white group-hover:text-primary transition-colors text-sm sm:text-base leading-tight">
            {prop.title}
          </h4>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 line-clamp-2">
            {prop.description.replace('{player}', activePlayer?.displayName || 'Le joueur')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Add to combo button */}
          {canBetOnProp() && user && (
            <button
              onClick={() => inCombo ? removeFromCombo(prop.id) : addToCombo(prop, adjustedOdds, activePlayer?.puuid, activePlayer?.displayName, betMatchId || undefined)}
              disabled={!inCombo && selections.length >= 4}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                inCombo
                  ? 'bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
              title={inCombo ? 'Retirer du combiné' : 'Ajouter au combiné'}
            >
              {inCombo ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          )}
          {/* Odds badge with skill adjustment indicator */}
          <div className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs sm:text-sm">
            {oddsInfo.direction === 'up' ? (
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-400" />
            ) : oddsInfo.direction === 'down' ? (
              <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
            ) : (
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
            <span className={oddsInfo.direction === 'up' ? 'text-green-400' : oddsInfo.direction === 'down' ? 'text-red-400' : ''}>
              x{adjustedOdds.toFixed(2)}
            </span>
            {oddsInfo.direction !== 'none' && (
              <span className={`text-[10px] ${oddsInfo.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                ({oddsInfo.direction === 'up' ? '+' : '-'}{oddsInfo.percentChange}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Betting form */}
      <div className="space-y-2 sm:space-y-3">
        {/* Quick bet buttons */}
        <div className="flex gap-1.5 sm:gap-2">
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
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
        </div>

        {/* Potential gain display */}
        {amount && parseInt(amount) > 0 && (
          <div className="flex justify-between text-xs sm:text-sm px-1">
            <span className="text-zinc-500">Gain:</span>
            <span className="text-gold font-bold font-mono">
              {Math.floor(parseInt(amount) * adjustedOdds)} JC
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
          className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validation...
            </>
          ) : !user ? (
            'Connecte-toi'
          ) : isSelfBetting ? (
            <>
              <UserX className="w-4 h-4" />
              Tu ne peux pas parier sur toi
            </>
          ) : !canBetOnProp() ? (
            'Indisponible'
          ) : (
            'Parier'
          )}
        </button>
      </div>
    </div>
  );
};

export default PropCard;
