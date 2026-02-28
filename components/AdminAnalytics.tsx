import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { BarChart3, TrendingUp, TrendingDown, Users, Coins, Target, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface EconomyStats {
  totalCredits: number;
  avgCredits: number;
  medianCredits: number;
  totalUsers: number;
  totalBetsPlaced: number;
  totalBetsWon: number;
  totalBetsLost: number;
  totalJcWon: number;
  totalJcLost: number;
  creditDistribution: { range: string; count: number }[];
}

interface BetAnalytics {
  topProps: { title: string; count: number; wins: number; losses: number; winRate: number }[];
  unusedProps: string[];
  overpowered: { title: string; winRate: number; count: number }[];
  underpowered: { title: string; winRate: number; count: number }[];
  totalBetVolume: number;
  avgBetSize: number;
}

interface PlayerAnalytics {
  mostActive: { pseudo: string; total_bets: number }[];
  richest: { pseudo: string; credits: number }[];
  poorest: { pseudo: string; credits: number }[];
  whales: { pseudo: string; totalWagered: number }[];
}

const AdminAnalytics: React.FC = () => {
  const [economy, setEconomy] = useState<EconomyStats | null>(null);
  const [betStats, setBetStats] = useState<BetAnalytics | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    economy: true,
    bets: false,
    players: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchEconomy(), fetchBetAnalytics(), fetchPlayerAnalytics()]);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEconomy = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('credits, total_bets, bets_won, bets_lost, jc_won, jc_lost');

    if (!profiles) return;

    const credits = profiles.map(p => p.credits).sort((a, b) => a - b);
    const totalCredits = credits.reduce((s, c) => s + c, 0);
    const medianCredits = credits.length > 0 ? credits[Math.floor(credits.length / 2)] : 0;

    // Distribution
    const ranges = [
      { range: '0-5k', min: 0, max: 5000 },
      { range: '5k-10k', min: 5000, max: 10000 },
      { range: '10k-20k', min: 10000, max: 20000 },
      { range: '20k-50k', min: 20000, max: 50000 },
      { range: '50k-100k', min: 50000, max: 100000 },
      { range: '100k+', min: 100000, max: Infinity },
    ];

    const creditDistribution = ranges.map(r => ({
      range: r.range,
      count: credits.filter(c => c >= r.min && c < r.max).length,
    }));

    setEconomy({
      totalCredits,
      avgCredits: profiles.length > 0 ? Math.round(totalCredits / profiles.length) : 0,
      medianCredits,
      totalUsers: profiles.length,
      totalBetsPlaced: profiles.reduce((s, p) => s + (p.total_bets || 0), 0),
      totalBetsWon: profiles.reduce((s, p) => s + (p.bets_won || 0), 0),
      totalBetsLost: profiles.reduce((s, p) => s + (p.bets_lost || 0), 0),
      totalJcWon: profiles.reduce((s, p) => s + (p.jc_won || 0), 0),
      totalJcLost: profiles.reduce((s, p) => s + (p.jc_lost || 0), 0),
      creditDistribution,
    });
  };

  const fetchBetAnalytics = async () => {
    const { data: bets } = await supabase
      .from('bets')
      .select('prop_id, prop_title, amount, status')
      .in('status', ['WON', 'LOST']);

    if (!bets) return;

    // Group by prop
    const propMap = new Map<string, { title: string; count: number; wins: number; losses: number; totalAmount: number }>();
    for (const bet of bets) {
      const existing = propMap.get(bet.prop_id) || { title: bet.prop_title, count: 0, wins: 0, losses: 0, totalAmount: 0 };
      existing.count++;
      existing.totalAmount += bet.amount;
      if (bet.status === 'WON') existing.wins++;
      else existing.losses++;
      propMap.set(bet.prop_id, existing);
    }

    const allProps = [...propMap.values()].map(p => ({
      ...p,
      winRate: p.count > 0 ? Math.round((p.wins / p.count) * 100) : 0,
    }));

    // Top props by popularity
    const topProps = [...allProps].sort((a, b) => b.count - a.count).slice(0, 10);

    // Overpowered props (win rate > 70%, at least 5 bets)
    const overpowered = allProps
      .filter(p => p.winRate > 70 && p.count >= 5)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);

    // Underpowered props (win rate < 20%, at least 5 bets)
    const underpowered = allProps
      .filter(p => p.winRate < 20 && p.count >= 5)
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 10);

    const totalBetVolume = bets.reduce((s, b) => s + b.amount, 0);

    setBetStats({
      topProps,
      unusedProps: [], // Can't know from resolved bets alone
      overpowered,
      underpowered,
      totalBetVolume,
      avgBetSize: bets.length > 0 ? Math.round(totalBetVolume / bets.length) : 0,
    });
  };

  const fetchPlayerAnalytics = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('pseudo, credits, total_bets');

    if (!profiles) return;

    const mostActive = [...profiles].sort((a, b) => (b.total_bets || 0) - (a.total_bets || 0)).slice(0, 10);
    const richest = [...profiles].sort((a, b) => b.credits - a.credits).slice(0, 10);
    const poorest = [...profiles].sort((a, b) => a.credits - b.credits).slice(0, 10);

    // Whales: fetch total wagered from bets
    const { data: bets } = await supabase
      .from('bets')
      .select('user_id, amount')
      .in('status', ['WON', 'LOST', 'PENDING']);

    const wagerMap = new Map<string, number>();
    if (bets) {
      for (const b of bets) {
        wagerMap.set(b.user_id, (wagerMap.get(b.user_id) || 0) + b.amount);
      }
    }

    const whales = profiles
      .map(p => {
        const profileWithId = p as any;
        return { pseudo: p.pseudo, totalWagered: wagerMap.get(profileWithId.id) || 0 };
      })
      .sort((a, b) => b.totalWagered - a.totalWagered)
      .slice(0, 10);

    setPlayerStats({
      mostActive: mostActive.map(p => ({ pseudo: p.pseudo, total_bets: p.total_bets || 0 })),
      richest: richest.map(p => ({ pseudo: p.pseudo, credits: p.credits })),
      poorest: poorest.map(p => ({ pseudo: p.pseudo, credits: p.credits })),
      whales,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Economy Section */}
      <div className="bg-gradient-to-b from-green-950/20 to-zinc-900 p-6 rounded-2xl border border-green-500/30">
        <button onClick={() => toggleSection('economy')} className="flex items-center justify-between w-full mb-4">
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-green-400" />
            <h3 className="font-bold text-white">Économie Globale</h3>
          </div>
          {openSections.economy ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {openSections.economy && economy && (
          <div className="space-y-4">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                <div className="text-2xl font-black text-gold">{(economy.totalCredits / 1000).toFixed(0)}k</div>
                <div className="text-[10px] text-zinc-500 uppercase">Masse monétaire</div>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                <div className="text-2xl font-black text-white">{(economy.avgCredits / 1000).toFixed(1)}k</div>
                <div className="text-[10px] text-zinc-500 uppercase">Moyenne/joueur</div>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                <div className="text-2xl font-black text-white">{(economy.medianCredits / 1000).toFixed(1)}k</div>
                <div className="text-[10px] text-zinc-500 uppercase">Médiane</div>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                <div className="text-2xl font-black text-white">{economy.totalUsers}</div>
                <div className="text-[10px] text-zinc-500 uppercase">Joueurs</div>
              </div>
            </div>

            {/* JC flow */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">JC gagnés (paris)</span>
                </div>
                <div className="text-xl font-black text-green-400">+{(economy.totalJcWon / 1000).toFixed(0)}k</div>
              </div>
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400">JC perdus (paris)</span>
                </div>
                <div className="text-xl font-black text-red-400">-{(economy.totalJcLost / 1000).toFixed(0)}k</div>
              </div>
            </div>

            {/* Distribution */}
            <div>
              <div className="text-xs text-zinc-400 mb-2 font-bold">Distribution des soldes</div>
              <div className="flex gap-1 h-20 items-end">
                {economy.creditDistribution.map(d => {
                  const maxCount = Math.max(...economy.creditDistribution.map(x => x.count), 1);
                  const height = (d.count / maxCount) * 100;
                  return (
                    <div key={d.range} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-zinc-400 font-mono">{d.count}</span>
                      <div className="w-full bg-green-500/40 rounded-t" style={{ height: `${Math.max(height, 4)}%` }} />
                      <span className="text-[9px] text-zinc-600">{d.range}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bets Analytics Section */}
      <div className="bg-gradient-to-b from-blue-950/20 to-zinc-900 p-6 rounded-2xl border border-blue-500/30">
        <button onClick={() => toggleSection('bets')} className="flex items-center justify-between w-full mb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white">Analyse des Paris</h3>
          </div>
          {openSections.bets ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {openSections.bets && betStats && (
          <div className="space-y-4">
            {/* Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                <div className="text-2xl font-black text-gold">{(betStats.totalBetVolume / 1000).toFixed(0)}k</div>
                <div className="text-[10px] text-zinc-500 uppercase">Volume total misé</div>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                <div className="text-2xl font-black text-white">{betStats.avgBetSize.toLocaleString('fr-FR')}</div>
                <div className="text-[10px] text-zinc-500 uppercase">Mise moyenne</div>
              </div>
            </div>

            {/* Top props */}
            <div>
              <div className="text-xs text-blue-400 font-bold mb-2">Top 10 paris les plus populaires</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {betStats.topProps.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-zinc-500 font-mono text-xs w-5">#{i + 1}</span>
                    <span className="text-sm text-white truncate flex-1">{p.title}</span>
                    <span className="text-xs text-zinc-400 font-mono">{p.count}x</span>
                    <span className={`text-xs font-bold ${p.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.winRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Overpowered */}
            {betStats.overpowered.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-red-400 font-bold mb-2">
                  <AlertTriangle className="w-3 h-3" />
                  Trop forts (win rate &gt; 70%)
                </div>
                <div className="space-y-1.5">
                  {betStats.overpowered.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20">
                      <span className="text-sm text-white truncate flex-1">{p.title}</span>
                      <span className="text-xs text-zinc-400 font-mono">{p.count}x</span>
                      <span className="text-xs font-bold text-red-400">{p.winRate}% win</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Underpowered */}
            {betStats.underpowered.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-2">
                  <AlertTriangle className="w-3 h-3" />
                  Trop faibles (win rate &lt; 20%)
                </div>
                <div className="space-y-1.5">
                  {betStats.underpowered.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <span className="text-sm text-white truncate flex-1">{p.title}</span>
                      <span className="text-xs text-zinc-400 font-mono">{p.count}x</span>
                      <span className="text-xs font-bold text-amber-400">{p.winRate}% win</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Players Section */}
      <div className="bg-gradient-to-b from-purple-950/20 to-zinc-900 p-6 rounded-2xl border border-purple-500/30">
        <button onClick={() => toggleSection('players')} className="flex items-center justify-between w-full mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white">Analyse des Joueurs</h3>
          </div>
          {openSections.players ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {openSections.players && playerStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Most Active */}
            <div>
              <div className="text-xs text-purple-400 font-bold mb-2">Les plus actifs</div>
              <div className="space-y-1">
                {playerStats.mostActive.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/20">
                    <span className="text-sm text-white">{p.pseudo}</span>
                    <span className="text-xs text-zinc-400 font-mono">{p.total_bets} paris</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Richest */}
            <div>
              <div className="text-xs text-gold font-bold mb-2">Les plus riches</div>
              <div className="space-y-1">
                {playerStats.richest.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/20">
                    <span className="text-sm text-white">{p.pseudo}</span>
                    <span className="text-xs text-gold font-mono">{p.credits.toLocaleString('fr-FR')} JC</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Poorest */}
            <div>
              <div className="text-xs text-red-400 font-bold mb-2">Les plus pauvres</div>
              <div className="space-y-1">
                {playerStats.poorest.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/20">
                    <span className="text-sm text-white">{p.pseudo}</span>
                    <span className="text-xs text-red-400 font-mono">{p.credits.toLocaleString('fr-FR')} JC</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Whales */}
            <div>
              <div className="text-xs text-blue-400 font-bold mb-2">Whales (+ gros parieurs)</div>
              <div className="space-y-1">
                {playerStats.whales.filter(w => w.totalWagered > 0).slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/20">
                    <span className="text-sm text-white">{p.pseudo}</span>
                    <span className="text-xs text-blue-400 font-mono">{(p.totalWagered / 1000).toFixed(0)}k misé</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
