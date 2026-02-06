import React, { useState, useEffect, useMemo } from 'react';
import { Flame, Trophy, Loader2, AlertCircle, CheckCircle, GripVertical, X } from 'lucide-react';
import { useStore } from '../services/store';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useGameStore } from '../services/gameStore';
import { getUserPendingBets } from '../services/betsService';
import { TrackedPlayer } from '../types';

// Max 1 damage ranking bet per game
const MAX_RANKING_BETS = 1;

// Odds based on number of players ranked
// 3 players: 3! / 1 = 6 combinations, but only partial ranking
// 4 players: harder
// 5 players: 5! = 120 combinations
const RANKING_ODDS: Record<number, number> = {
  3: 8,   // 3 joueurs classés
  4: 20,  // 4 joueurs classés
  5: 50,  // 5 joueurs classés (très difficile)
};

interface RankedPlayer {
  player: TrackedPlayer;
  position: number; // 1-5
}

const DamageRankingBet: React.FC = () => {
  const { placeBet } = useStore();
  const { profile, subtractCredits, recordBetPlaced } = useCreditsStore();
  const { user } = useAuthStore();
  const {
    testMode,
    testMatchId,
    playerStates,
    trackedPlayers,
    bettingLimitEnabled
  } = useGameStore();

  const [rankedPlayers, setRankedPlayers] = useState<RankedPlayer[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<TrackedPlayer | null>(null);
  const [rankingBetsCount, setRankingBetsCount] = useState(0);

  // Get all tracked players currently in the same Flex game
  const playersInFlexGame = useMemo(() => {
    const inGamePlayers: { player: TrackedPlayer; gameId: string; queueId: number }[] = [];

    for (const player of trackedPlayers) {
      if (!player.puuid) continue;
      const state = playerStates.get(player.puuid);
      if (state?.isInGame && state.currentGame && state.currentGameId) {
        inGamePlayers.push({
          player,
          gameId: state.currentGameId,
          queueId: state.currentGame.gameQueueConfigId || 0
        });
      }
    }

    // Check if we have exactly 5 players in the same Flex game (queueId 440)
    if (inGamePlayers.length < 5) return [];

    // Group by gameId
    const gameGroups = new Map<string, typeof inGamePlayers>();
    for (const p of inGamePlayers) {
      const existing = gameGroups.get(p.gameId) || [];
      existing.push(p);
      gameGroups.set(p.gameId, existing);
    }

    // Find a Flex game with 5 tracked players
    for (const [_gameId, players] of gameGroups) {
      if (players.length === 5 && players[0].queueId === 440) {
        return players.map(p => p.player);
      }
    }

    return [];
  }, [trackedPlayers, playerStates]);

  const isFlexWith5Players = playersInFlexGame.length === 5;
  const betMatchId = isFlexWith5Players
    ? playerStates.get(playersInFlexGame[0].puuid!)?.currentGameId
    : null;

  // Calculate game time for betting window
  const currentGame = isFlexWith5Players
    ? playerStates.get(playersInFlexGame[0].puuid!)?.currentGame
    : null;
  const gameTimeMinutes = currentGame
    ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60)
    : 0;
  const isBettingWindowClosed = bettingLimitEnabled && gameTimeMinutes >= 4;

  // Count existing ranking bets for this game
  const maxRankingBetsReached = rankingBetsCount >= MAX_RANKING_BETS;

  useEffect(() => {
    const countRankingBets = async () => {
      if (!user || !betMatchId) {
        setRankingBetsCount(0);
        return;
      }
      try {
        const pendingBets = await getUserPendingBets(user.id);
        const count = pendingBets.filter(
          bet => bet.matchId === betMatchId && bet.propId.startsWith('damage_ranking_')
        ).length;
        setRankingBetsCount(count);
      } catch (err) {
        console.error('Error counting ranking bets:', err);
      }
    };
    countRankingBets();

    const handleBetPlaced = () => countRankingBets();
    window.addEventListener('betPlaced', handleBetPlaced);
    return () => window.removeEventListener('betPlaced', handleBetPlaced);
  }, [user, betMatchId]);

  // Available players (not yet ranked)
  const availablePlayers = useMemo(() => {
    return playersInFlexGame.filter(
      p => !rankedPlayers.some(rp => rp.player.puuid === p.puuid)
    );
  }, [playersInFlexGame, rankedPlayers]);

  // Get odds based on number of ranked players
  const currentOdds = RANKING_ODDS[rankedPlayers.length] || 0;
  const potentialGain = amount ? Math.floor(parseInt(amount) * currentOdds) : 0;
  const canPlaceBet = rankedPlayers.length >= 3 && rankedPlayers.length <= 5;

  const handleDragStart = (player: TrackedPlayer) => {
    setDraggedPlayer(player);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnPosition = (position: number) => {
    if (!draggedPlayer) return;

    // Remove from current position if already ranked
    const newRanked = rankedPlayers.filter(rp => rp.player.puuid !== draggedPlayer.puuid);

    // Check if position is already taken
    const existingAtPosition = newRanked.find(rp => rp.position === position);
    if (existingAtPosition) {
      // Swap positions
      newRanked.forEach(rp => {
        if (rp.position === position) {
          const oldPosition = rankedPlayers.find(r => r.player.puuid === draggedPlayer.puuid)?.position;
          if (oldPosition) {
            rp.position = oldPosition;
          } else {
            // Remove if dragged from available
            const idx = newRanked.indexOf(rp);
            newRanked.splice(idx, 1);
          }
        }
      });
    }

    newRanked.push({ player: draggedPlayer, position });
    setRankedPlayers(newRanked.sort((a, b) => a.position - b.position));
    setDraggedPlayer(null);
    setError(null);
  };

  const handleRemoveFromRanking = (puuid: string) => {
    setRankedPlayers(rankedPlayers.filter(rp => rp.player.puuid !== puuid));
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

    if (!isFlexWith5Players) {
      setError("Uniquement disponible en Flex 5");
      return;
    }

    if (isBettingWindowClosed) {
      setError("Paris fermés après 4 minutes");
      return;
    }

    if (maxRankingBetsReached) {
      setError("Maximum 1 pari classement dégâts par game");
      return;
    }

    if (!canPlaceBet) {
      setError("Classe au moins 3 joueurs");
      return;
    }

    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) {
      setError("Mise invalide");
      return;
    }

    if (val > (profile?.credits || 0)) {
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

      // Create prop ID encoding the ranking
      // Format: damage_ranking_[count]_[puuid1:pos1]_[puuid2:pos2]_...
      const rankingEncoded = rankedPlayers
        .map(rp => `${rp.player.puuid?.slice(-8)}:${rp.position}`)
        .join('_');
      const propId = `damage_ranking_${rankedPlayers.length}_${rankingEncoded}`;
      const propTitle = `🔥 Classement Dégâts (${rankedPlayers.length} joueurs)`;

      const bet = await placeBet(
        propId,
        propTitle,
        currentOdds,
        val,
        betMatchId || undefined,
        undefined,
        user.id,
        undefined,
        playersInFlexGame[0]?.puuid || undefined,
        'Flex 5'
      );

      if (!bet) {
        setError("Erreur lors de l'enregistrement du pari");
        setLoading(false);
        return;
      }

      await recordBetPlaced();
      window.dispatchEvent(new Event('betPlaced'));

      setAmount('');
      setRankedPlayers([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Damage ranking bet error:', err);
      setError(err?.message || "Erreur lors du pari");
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not in Flex 5
  if (!isFlexWith5Players && !testMode) {
    return null;
  }

  const quickBets = [50, 100, 250];

  return (
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-orange-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 px-4 py-3 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              Classement Dégâts
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full border border-orange-500/30">
                FLEX 5
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Prédit l'ordre des dégâts entre les 5 joueurs</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Ranking Slots */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((position) => {
            const rankedPlayer = rankedPlayers.find(rp => rp.position === position);
            return (
              <div
                key={position}
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnPosition(position)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all ${
                  rankedPlayer
                    ? 'border-orange-500/50 bg-orange-500/10'
                    : 'border-zinc-700 bg-zinc-800/30 hover:border-orange-500/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg ${
                  position === 1 ? 'bg-yellow-500 text-black' :
                  position === 2 ? 'bg-gray-400 text-black' :
                  position === 3 ? 'bg-amber-700 text-white' :
                  'bg-zinc-700 text-zinc-400'
                }`}>
                  {position}
                </div>

                {rankedPlayer ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-bold text-white">
                      {rankedPlayer.player.displayName}
                    </span>
                    <button
                      onClick={() => handleRemoveFromRanking(rankedPlayer.player.puuid!)}
                      className="p-1 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                ) : (
                  <span className="text-zinc-500 text-sm">
                    Glisse un joueur ici
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Available Players */}
        {availablePlayers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wide">
              Joueurs disponibles
            </p>
            <div className="flex flex-wrap gap-2">
              {availablePlayers.map((player) => (
                <div
                  key={player.puuid}
                  draggable
                  onDragStart={() => handleDragStart(player)}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg cursor-grab active:cursor-grabbing hover:bg-zinc-700 transition-colors border border-zinc-700"
                >
                  <GripVertical className="w-4 h-4 text-zinc-500" />
                  <span className="text-white font-medium text-sm">
                    {player.displayName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Odds Display */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="text-zinc-400 text-sm">Cote:</span>
          <span className={`text-2xl font-mono font-black ${canPlaceBet ? 'text-gold' : 'text-zinc-600'}`}>
            x{currentOdds || '?'}
          </span>
          {rankedPlayers.length > 0 && rankedPlayers.length < 3 && (
            <span className="text-xs text-orange-400">
              (min 3 joueurs)
            </span>
          )}
        </div>

        {/* Quick Bet Buttons */}
        <div className="flex gap-2">
          {quickBets.map((bet) => (
            <button
              key={bet}
              onClick={() => setAmount(bet.toString())}
              disabled={bet > (profile?.credits || 0)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                amount === bet.toString()
                  ? 'bg-orange-500 text-white'
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
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
        />

        {/* Potential Gain */}
        {amount && parseInt(amount) > 0 && canPlaceBet && (
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
            Pari Classement Dégâts validé !
          </div>
        )}

        {/* Place Bet Button */}
        <button
          onClick={handlePlaceBet}
          disabled={!canPlaceBet || !amount || loading || !user || isBettingWindowClosed || maxRankingBetsReached}
          className="w-full py-3 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validation...
            </>
          ) : !user ? (
            'Connecte-toi pour parier'
          ) : maxRankingBetsReached ? (
            'Pari déjà placé pour cette game'
          ) : isBettingWindowClosed ? (
            'Paris fermés (4 min)'
          ) : !canPlaceBet ? (
            `Classe ${3 - rankedPlayers.length} joueur${3 - rankedPlayers.length > 1 ? 's' : ''} de plus`
          ) : (
            <>
              <Flame className="w-4 h-4" />
              Valider le classement
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-center text-xs text-zinc-500">
          Tous les joueurs classés doivent être à la bonne position
        </p>
      </div>
    </div>
  );
};

export default DamageRankingBet;
