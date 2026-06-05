import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Flame, Target, TrendingUp, BarChart3, Loader2, Zap, Award } from 'lucide-react';

interface PlayerStatsProps {
  userId: string;
  credits: number;
  jcWon: number;
  jcLost: number;
}

interface BetRow {
  prop_title: string;
  amount: number;
  potential_payout: number;
  odds: number;
  status: string;
  created_at: string;
}

interface StatsData {
  currentStreak: { type: 'win' | 'loss'; count: number };
  bestBet: { title: string; payout: number } | null;
  worstLoss: { title: string; amount: number } | null;
  roi: number;
  avgOdds: number;
  totalWagered: number;
  favoriteProps: { title: string; count: number }[];
}

const PlayerStats: React.FC<PlayerStatsProps> = ({ userId, credits, jcWon, jcLost }) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data: bets, error } = await supabase
          .from('bets')
          .select('prop_title, amount, potential_payout, odds, status, created_at')
          .eq('user_id', userId)
          .in('status', ['WON', 'LOST'])
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!bets || bets.length === 0) {
          setStats(null);
          setLoading(false);
          return;
        }

        // Current streak
        let streakType: 'win' | 'loss' = bets[bets.length - 1].status === 'WON' ? 'win' : 'loss';
        let streakCount = 0;
        for (let i = bets.length - 1; i >= 0; i--) {
          const isWin = bets[i].status === 'WON';
          if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) {
            streakCount++;
          } else break;
        }

        // Best bet (highest payout)
        const wonBets = bets.filter(b => b.status === 'WON');
        const bestBet = wonBets.length > 0
          ? wonBets.reduce((best, b) => b.potential_payout > best.potential_payout ? b : best)
          : null;

        // Worst single loss
        const lostBets = bets.filter(b => b.status === 'LOST');
        const worstLoss = lostBets.length > 0
          ? lostBets.reduce((worst, b) => b.amount > worst.amount ? b : worst)
          : null;

        // ROI
        const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
        const roi = totalWagered > 0 ? ((jcWon - jcLost) / totalWagered) * 100 : 0;

        // Average odds
        const avgOdds = bets.length > 0
          ? bets.reduce((sum, b) => sum + b.odds, 0) / bets.length
          : 0;

        // Favorite props (top 5)
        const propCounts = new Map<string, number>();
        bets.forEach(b => {
          // Simplify prop title (remove player name prefix if any)
          const title = b.prop_title;
          propCounts.set(title, (propCounts.get(title) || 0) + 1);
        });
        const favoriteProps = [...propCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([title, count]) => ({ title, count }));

        setStats({
          currentStreak: { type: streakType, count: streakCount },
          bestBet: bestBet ? { title: bestBet.prop_title, payout: bestBet.potential_payout } : null,
          worstLoss: worstLoss ? { title: worstLoss.prop_title, amount: worstLoss.amount } : null,
          roi,
          avgOdds,
          totalWagered,
          favoriteProps,
        });
      } catch (err) {
        console.error('Error fetching player stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId, jcWon, jcLost]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Streak */}
        <div className={`p-4 rounded-xl border ${
          stats.currentStreak.type === 'win'
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Flame className={`w-4 h-4 ${stats.currentStreak.type === 'win' ? 'text-green-400' : 'text-red-400'}`} />
            <span className="text-xs text-zinc-400">Streak</span>
          </div>
          <div className={`text-2xl font-black ${stats.currentStreak.type === 'win' ? 'text-green-400' : 'text-red-400'}`}>
            {stats.currentStreak.count}{stats.currentStreak.type === 'win' ? 'W' : 'L'}
          </div>
        </div>

        {/* ROI */}
        <div className={`p-4 rounded-xl border ${
          stats.roi >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-400">ROI</span>
          </div>
          <div className={`text-2xl font-black ${stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
          </div>
        </div>

        {/* Avg Odds */}
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-400">Cote moy.</span>
          </div>
          <div className="text-2xl font-black text-white">
            x{stats.avgOdds.toFixed(2)}
          </div>
        </div>

        {/* Total wagered */}
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-400">Total misé</span>
          </div>
          <div className="text-2xl font-black text-gold">
            {stats.totalWagered >= 1000 ? `${(stats.totalWagered / 1000).toFixed(0)}k` : stats.totalWagered}
          </div>
        </div>
      </div>

      {/* Best bet & worst loss */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.bestBet && (
          <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-bold">Meilleur pari</span>
            </div>
            <div className="text-green-300 font-bold text-sm truncate">{stats.bestBet.title}</div>
            <div className="text-green-400 font-mono font-bold mt-1">+{stats.bestBet.payout.toLocaleString('fr-FR')} JC</div>
          </div>
        )}

        {stats.worstLoss && (
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400 font-bold">Plus grosse perte</span>
            </div>
            <div className="text-red-300 font-bold text-sm truncate">{stats.worstLoss.title}</div>
            <div className="text-red-400 font-mono font-bold mt-1">-{stats.worstLoss.amount.toLocaleString('fr-FR')} JC</div>
          </div>
        )}
      </div>

      {/* Favorite props */}
      {stats.favoriteProps.length > 0 && (
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-white">Paris préférés</span>
          </div>
          <div className="space-y-2">
            {stats.favoriteProps.map((prop, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300 truncate flex-1 mr-3">{prop.title}</span>
                <span className="text-xs text-zinc-500 font-mono flex-shrink-0">{prop.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
