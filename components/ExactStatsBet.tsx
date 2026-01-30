import React, { useState, useMemo } from 'react';
import { Target, Swords, Skull, Heart, ChevronUp, ChevronDown, Trophy, Loader2, AlertCircle, CheckCircle, UserX } from 'lucide-react';
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

// Calculate odds for exact K/D/A
// Base odds are high because exact stats are rare
function calculateKdaOdds(kills: number, deaths: number, assists: number): number {
  // Base odds for exact K/D/A prediction
  let baseOdds = 15.0;

  // Common kill ranges (2-8) are more predictable
  if (kills >= 2 && kills <= 8) {
    baseOdds *= 0.8;
  } else if (kills === 0) {
    baseOdds *= 1.3; // 0 kills is specific
  } else if (kills >= 10) {
    baseOdds *= 1.5; // 10+ kills is rare
  }

  // Common death ranges (3-7) are more predictable
  if (deaths >= 3 && deaths <= 7) {
    baseOdds *= 0.8;
  } else if (deaths === 0) {
    baseOdds *= 2.0; // 0 deaths is very rare
  } else if (deaths >= 10) {
    baseOdds *= 1.2; // 10+ deaths happens in bad games
  }

  // Common assist ranges (4-12) are more predictable
  if (assists >= 4 && assists <= 12) {
    baseOdds *= 0.85;
  } else if (assists === 0) {
    baseOdds *= 1.4; // 0 assists is rare
  } else if (assists >= 15) {
    baseOdds *= 1.3; // High assists is good support play
  }

  // Round to 1 decimal
  return Math.round(Math.max(8.0, Math.min(50.0, baseOdds)) * 10) / 10;
}

// Calculate odds for exact damage (within 1k range)
function calculateDamageOdds(damageK: number): number {
  // Base odds for damage prediction (1k precision)
  let baseOdds = 12.0;

  // Very low damage (support/tank/feeder)
  if (damageK < 5) {
    baseOdds *= 1.5;
  } else if (damageK >= 5 && damageK < 10) {
    baseOdds *= 1.2;
  } else if (damageK >= 10 && damageK < 18) {
    // Most common damage range
    baseOdds *= 0.9;
  } else if (damageK >= 18 && damageK < 25) {
    baseOdds *= 1.1;
  } else if (damageK >= 25) {
    // High damage carry
    baseOdds *= 1.4;
  }

  return Math.round(Math.max(6.0, Math.min(25.0, baseOdds)) * 10) / 10;
}

function getCategoryFromOdds(odds: number): { label: string; bg: string; text: string; border: string } {
  if (odds < 10) return { label: 'MOYEN', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' };
  if (odds < 15) return { label: 'DIFFICILE', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' };
  if (odds < 25) return { label: 'TRÈS DUR', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
  return { label: 'LÉGENDAIRE', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' };
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
  const [kills, setKills] = useState(4);
  const [deaths, setDeaths] = useState(5);
  const [assists, setAssists] = useState(7);
  const [damageK, setDamageK] = useState(12);
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const credits = profile?.credits || 0;

  const odds = useMemo(() => {
    if (betType === 'kda') {
      return calculateKdaOdds(kills, deaths, assists);
    } else {
      return calculateDamageOdds(damageK);
    }
  }, [betType, kills, deaths, assists, damageK]);

  const potentialGain = amount ? Math.floor(parseInt(amount) * odds) : 0;
  const categoryStyle = getCategoryFromOdds(odds);

  const adjustStat = (stat: 'kills' | 'deaths' | 'assists' | 'damage', delta: number) => {
    switch (stat) {
      case 'kills':
        setKills(prev => Math.max(0, Math.min(20, prev + delta)));
        break;
      case 'deaths':
        setDeaths(prev => Math.max(0, Math.min(20, prev + delta)));
        break;
      case 'assists':
        setAssists(prev => Math.max(0, Math.min(30, prev + delta)));
        break;
      case 'damage':
        setDamageK(prev => Math.max(0, Math.min(40, prev + delta)));
        break;
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
        propId = `exact_kda_${kills}_${deaths}_${assists}`;
        propTitle = `🎯 KDA exact: ${kills}/${deaths}/${assists}`;
      } else {
        propId = `exact_damage_${damageK}k`;
        propTitle = `⚔️ Dégâts exacts: ${damageK}k - ${damageK + 1}k`;
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

  // Quick presets for KDA
  const kdaPresets = [
    { k: 0, d: 10, a: 2, label: '0/10/2' },
    { k: 5, d: 5, a: 10, label: '5/5/10' },
    { k: 10, d: 3, a: 8, label: '10/3/8' },
    { k: 3, d: 0, a: 5, label: '3/0/5' },
  ];

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
                {categoryStyle.label}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Prédit le K/D/A ou les dégâts exacts</p>
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
            K/D/A
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

        {betType === 'kda' ? (
          <>
            {/* KDA Presets */}
            <div className="flex gap-2 justify-center flex-wrap">
              {kdaPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setKills(preset.k);
                    setDeaths(preset.d);
                    setAssists(preset.a);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    kills === preset.k && deaths === preset.d && assists === preset.a
                      ? 'bg-cyan-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* K/D/A Selector */}
            <div className="flex items-center justify-center gap-2">
              {/* Kills */}
              <div className="flex flex-col items-center">
                <span className="text-xs text-green-400 font-bold mb-1 uppercase">Kills</span>
                <div className="flex flex-col items-center bg-zinc-800/50 rounded-xl border border-green-500/30 overflow-hidden">
                  <button
                    onClick={() => adjustStat('kills', 1)}
                    className="w-full p-1.5 hover:bg-green-500/20 transition-colors border-b border-zinc-700"
                  >
                    <ChevronUp className="w-4 h-4 text-green-400 mx-auto" />
                  </button>
                  <div className="px-4 py-2">
                    <span className="text-2xl font-black text-green-400 font-mono">{kills}</span>
                  </div>
                  <button
                    onClick={() => adjustStat('kills', -1)}
                    className="w-full p-1.5 hover:bg-green-500/20 transition-colors border-t border-zinc-700"
                  >
                    <ChevronDown className="w-4 h-4 text-green-400 mx-auto" />
                  </button>
                </div>
              </div>

              <span className="text-2xl font-black text-zinc-600 mt-5">/</span>

              {/* Deaths */}
              <div className="flex flex-col items-center">
                <span className="text-xs text-red-400 font-bold mb-1 uppercase">Deaths</span>
                <div className="flex flex-col items-center bg-zinc-800/50 rounded-xl border border-red-500/30 overflow-hidden">
                  <button
                    onClick={() => adjustStat('deaths', 1)}
                    className="w-full p-1.5 hover:bg-red-500/20 transition-colors border-b border-zinc-700"
                  >
                    <ChevronUp className="w-4 h-4 text-red-400 mx-auto" />
                  </button>
                  <div className="px-4 py-2">
                    <span className="text-2xl font-black text-red-400 font-mono">{deaths}</span>
                  </div>
                  <button
                    onClick={() => adjustStat('deaths', -1)}
                    className="w-full p-1.5 hover:bg-red-500/20 transition-colors border-t border-zinc-700"
                  >
                    <ChevronDown className="w-4 h-4 text-red-400 mx-auto" />
                  </button>
                </div>
              </div>

              <span className="text-2xl font-black text-zinc-600 mt-5">/</span>

              {/* Assists */}
              <div className="flex flex-col items-center">
                <span className="text-xs text-blue-400 font-bold mb-1 uppercase">Assists</span>
                <div className="flex flex-col items-center bg-zinc-800/50 rounded-xl border border-blue-500/30 overflow-hidden">
                  <button
                    onClick={() => adjustStat('assists', 1)}
                    className="w-full p-1.5 hover:bg-blue-500/20 transition-colors border-b border-zinc-700"
                  >
                    <ChevronUp className="w-4 h-4 text-blue-400 mx-auto" />
                  </button>
                  <div className="px-4 py-2">
                    <span className="text-2xl font-black text-blue-400 font-mono">{assists}</span>
                  </div>
                  <button
                    onClick={() => adjustStat('assists', -1)}
                    className="w-full p-1.5 hover:bg-blue-500/20 transition-colors border-t border-zinc-700"
                  >
                    <ChevronDown className="w-4 h-4 text-blue-400 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Damage Presets */}
            <div className="flex gap-2 justify-center flex-wrap">
              {[5, 10, 15, 20, 25].map((d) => (
                <button
                  key={d}
                  onClick={() => setDamageK(d)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    damageK === d
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {d}k
                </button>
              ))}
            </div>

            {/* Damage Selector */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-orange-400 font-bold mb-2 uppercase">Dégâts (en milliers)</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => adjustStat('damage', -1)}
                  className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                >
                  <ChevronDown className="w-5 h-5 text-orange-400" />
                </button>
                <div className="px-6 py-3 bg-zinc-800/50 rounded-xl border border-orange-500/30">
                  <span className="text-3xl font-black text-orange-400 font-mono">{damageK}k</span>
                  <span className="text-zinc-500 text-sm ml-1">- {damageK + 1}k</span>
                </div>
                <button
                  onClick={() => adjustStat('damage', 1)}
                  className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                >
                  <ChevronUp className="w-5 h-5 text-orange-400" />
                </button>
              </div>
            </div>
          </>
        )}

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
              {betType === 'kda' ? `Parier ${kills}/${deaths}/${assists}` : `Parier ${damageK}k - ${damageK + 1}k`}
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-center text-xs text-zinc-500">
          {betType === 'kda'
            ? 'Prédit les Kills / Deaths / Assists exacts'
            : 'Prédit les dégâts aux champions (±1000)'}
        </p>
      </div>
    </div>
  );
};

export default ExactStatsBet;
