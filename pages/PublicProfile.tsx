import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Calendar, Sparkles, Trophy, TrendingUp, TrendingDown, Target, ArrowLeft, Loader2, Crown, ChevronDown, ChevronUp, Layers, Swords, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../services/authStore';
import { getBetsByUserId } from '../services/betsService';
import { BetStatus, Bet } from '../types';
import { useCosmeticsLookup } from '../services/useCosmeticsLookup';

interface PublicUser {
  id: string;
  pseudo: string;
  credits: number;
  total_bets: number;
  bets_won: number;
  bets_lost: number;
  jc_won: number;
  jc_lost: number;
  created_at: string;
  avatar_url?: string | null;
  equipped_badge?: string | null;
  equipped_title?: string | null;
  equipped_border?: string | null;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuthStore();
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());

  // Load bets from Supabase (public for all users)
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;

  // Load user bets from Supabase
  const loadUserBets = async () => {
    if (!userId) return;
    setBetsLoading(true);
    try {
      const bets = await getBetsByUserId(userId);
      setUserBets(bets);
    } catch (err) {
      console.error('Error loading user bets:', err);
    } finally {
      setBetsLoading(false);
    }
  };

  // Group bets by matchId/champion
  const groupedBets = useMemo(() => {
    const groups: Record<string, { champion: string; playerName?: string; bets: Bet[]; date: number }> = {};

    userBets.forEach(bet => {
      const key = bet.matchId || `unknown_${bet.timestamp}`;
      if (!groups[key]) {
        groups[key] = {
          champion: bet.championName || 'Inconnu',
          playerName: bet.playerName,
          bets: [],
          date: bet.timestamp
        };
      }
      groups[key].bets.push(bet);
      // Keep earliest timestamp for the group
      if (bet.timestamp < groups[key].date) {
        groups[key].date = bet.timestamp;
      }
      // Update playerName if not set yet
      if (!groups[key].playerName && bet.playerName) {
        groups[key].playerName = bet.playerName;
      }
    });

    // Sort groups by date (most recent first)
    return Object.entries(groups)
      .sort(([, a], [, b]) => b.date - a.date);
  }, [userBets]);

  const toggleGameExpanded = (matchId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        // Fetch the user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData as PublicUser);

        // Fetch rank (count users with more credits)
        const { count, error: rankError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('credits', profileData.credits);

        if (!rankError && count !== null) {
          setRank(count + 1);
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Profil introuvable');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    loadUserBets();
  }, [userId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-zinc-400">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-16">
          <User className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Profil introuvable</h2>
          <p className="text-zinc-400 mb-6">{error || "Ce joueur n'existe pas."}</p>
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/30 rounded-xl text-primary hover:bg-primary/20 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour au classement
          </Link>
        </div>
      </div>
    );
  }

  const winRate = profile.total_bets > 0 ? Math.round((profile.bets_won / profile.total_bets) * 100) : 0;
  const netGain = profile.jc_won - profile.jc_lost;
  const memberSince = new Date(profile.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Get equipped cosmetics from Supabase
  const { getCosmetic } = useCosmeticsLookup();
  const equippedTitle = getCosmetic(profile.equipped_title);
  const equippedBorder = getCosmetic(profile.equipped_border);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back button */}
      <Link
        to="/leaderboard"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour au classement
      </Link>

      {/* Profile Header */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-3xl border border-zinc-800 p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl shadow-lg shadow-primary/30 overflow-hidden relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.pseudo}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-5xl font-black text-white">{profile.pseudo.charAt(0).toUpperCase()}</span>
                </div>
              )}
              {equippedBorder?.image_url && (
                <img
                  src={equippedBorder.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full rounded-2xl pointer-events-none z-10 object-cover"
                />
              )}
            </div>
            {rank && rank <= 3 && (
              <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gold flex items-center justify-center shadow-lg">
                <Crown className="w-6 h-6 text-black" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-3xl font-black text-white">{profile.pseudo}</h1>
              {isOwnProfile && (
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold">
                  C'est toi !
                </span>
              )}
            </div>
            {equippedTitle && (
              <p className="text-zinc-400 italic mb-2">"{equippedTitle.name}"</p>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-zinc-400 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Membre depuis {memberSince}</span>
              </div>
              {rank && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold" />
                  <span className="text-gold font-bold">Rang #{rank}</span>
                </div>
              )}
            </div>

            {/* Johnny Coins */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-gold/10 to-amber-900/20 border border-gold/30">
              <Sparkles className="w-6 h-6 text-gold" />
              <span className="text-3xl font-black font-mono text-gold">
                {profile.credits.toLocaleString('fr-FR')}
              </span>
              <span className="text-gold/60 font-bold">JC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Target className="w-6 h-6" />}
          label="Paris totaux"
          value={profile.total_bets.toString()}
          color="white"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Paris gagnés"
          value={profile.bets_won.toString()}
          color="green"
        />
        <StatCard
          icon={<TrendingDown className="w-6 h-6" />}
          label="Paris perdus"
          value={profile.bets_lost.toString()}
          color="red"
        />
        <StatCard
          icon={<Trophy className="w-6 h-6" />}
          label="Win Rate"
          value={`${winRate}%`}
          color={winRate >= 50 ? 'green' : 'red'}
        />
      </div>

      {/* JC Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            Johnny Coins gagnés
          </h3>
          <div className="text-4xl font-black font-mono text-green-400">
            +{profile.jc_won.toLocaleString('fr-FR')}
          </div>
          <p className="text-zinc-500 text-sm mt-2">Total des gains sur les paris</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-400" />
            Johnny Coins perdus
          </h3>
          <div className="text-4xl font-black font-mono text-red-400">
            -{profile.jc_lost.toLocaleString('fr-FR')}
          </div>
          <p className="text-zinc-500 text-sm mt-2">Total des pertes sur les paris</p>
        </div>
      </div>

      {/* Net Gain */}
      <div className={`mt-4 p-6 rounded-2xl border ${netGain >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">Bilan net</span>
          <span className={`text-3xl font-black font-mono ${netGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {netGain >= 0 ? '+' : ''}{netGain.toLocaleString('fr-FR')} JC
          </span>
        </div>
      </div>

      {/* Betting History */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Historique des paris
          </h2>
          <button
            onClick={loadUserBets}
            disabled={betsLoading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-all"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${betsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {betsLoading ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
            <Loader2 className="w-8 h-8 text-zinc-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-500">Chargement des paris...</p>
          </div>
        ) : groupedBets.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
            <Swords className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">Aucun pari enregistré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedBets.map(([matchId, group]) => {
              const isExpanded = expandedGames.has(matchId);
              const pendingCount = group.bets.filter(b => b.status === BetStatus.PENDING).length;
              const wonCount = group.bets.filter(b => b.status === BetStatus.WON).length;
              const lostCount = group.bets.filter(b => b.status === BetStatus.LOST).length;
              const totalBet = group.bets.reduce((sum, b) => sum + (b.comboIndex && b.comboIndex > 1 ? 0 : b.amount), 0);
              const totalWon = group.bets
                .filter(b => b.status === BetStatus.WON)
                .reduce((sum, b) => sum + b.potentialPayout, 0);
              const isCombo = group.bets.some(b => b.comboId);
              const dateStr = new Date(group.date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={matchId}
                  className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
                >
                  {/* Game header */}
                  <button
                    onClick={() => toggleGameExpanded(matchId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition"
                  >
                    <div className="flex items-center gap-4">
                      {/* Champion icon */}
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/14.9.1/img/champion/${group.champion}.png`}
                          alt={group.champion}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          {group.playerName && (
                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded">
                              {group.playerName}
                            </span>
                          )}
                          <span className="font-bold text-white">{group.champion}</span>
                          {isCombo && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              Combiné
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span>{group.bets.length} pari{group.bets.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Status badges */}
                      <div className="flex items-center gap-2">
                        {pendingCount > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold">
                            {pendingCount} en cours
                          </span>
                        )}
                        {wonCount > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-bold">
                            {wonCount} gagné{wonCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {lostCount > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold">
                            {lostCount} perdu{lostCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded bets list */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                      {group.bets.map(bet => (
                        <div
                          key={bet.id}
                          className={`p-4 ${
                            bet.status === BetStatus.WON
                              ? 'bg-green-500/5'
                              : bet.status === BetStatus.LOST
                              ? 'bg-red-500/5'
                              : 'bg-zinc-800/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              {(bet.playerName || bet.championName) && (
                                <div className="flex items-center gap-1.5 mb-1">
                                  {bet.playerName && (
                                    <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded">
                                      {bet.playerName}
                                    </span>
                                  )}
                                  {bet.championName && (
                                    <span className="text-[10px] text-zinc-500">{bet.championName}</span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{bet.propTitle}</span>
                                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-lg">
                                  x{bet.odds.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              {(!bet.comboIndex || bet.comboIndex === 1) && (
                                <div>
                                  <div className="text-sm text-zinc-500">Mise</div>
                                  <div className="font-mono font-bold text-white">{bet.amount} JC</div>
                                </div>
                              )}
                              <div>
                                <div className="text-sm text-zinc-500">Statut</div>
                                <div className={`font-bold ${
                                  bet.status === BetStatus.WON
                                    ? 'text-green-400'
                                    : bet.status === BetStatus.LOST
                                    ? 'text-red-400'
                                    : 'text-amber-400'
                                }`}>
                                  {bet.status === BetStatus.WON && `+${bet.potentialPayout} JC`}
                                  {bet.status === BetStatus.LOST && 'Perdu'}
                                  {bet.status === BetStatus.PENDING && 'En cours'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Game summary */}
                      <div className="p-4 bg-zinc-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-400">Bilan de la game</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-zinc-500">Misé: <span className="font-mono text-white">{totalBet} JC</span></span>
                            {(() => {
                              const netResult = totalWon - totalBet;
                              if (pendingCount > 0) {
                                return <span className="text-sm text-amber-400">En attente...</span>;
                              }
                              return (
                                <span className={`text-sm ${netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  Bilan: <span className="font-mono font-bold">{netResult >= 0 ? '+' : ''}{netResult} JC</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'white' | 'green' | 'red' | 'gold' }) => {
  const colorClasses = {
    white: 'text-white',
    green: 'text-green-400',
    red: 'text-red-400',
    gold: 'text-gold'
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800 ${colorClasses[color]} mb-3`}>
        {icon}
      </div>
      <div className={`text-3xl font-black font-mono ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-zinc-500 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
};

export default PublicProfile;
