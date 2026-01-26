import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Sparkles, TrendingUp, TrendingDown, Target, Loader2, Crown, Award } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../services/authStore';

interface LeaderboardUser {
  id: string;
  pseudo: string;
  credits: number;
  total_bets: number;
  bets_won: number;
  bets_lost: number;
  jc_won: number;
  jc_lost: number;
  created_at: string;
}

const Leaderboard = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('credits', { ascending: false });

        if (error) throw error;
        setUsers(data as LeaderboardUser[]);
      } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Real-time subscription for instant updates
    const subscription = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Leaderboard update:', payload);
          // Refetch the full leaderboard to ensure correct order
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-zinc-400">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <Trophy className="w-10 h-10 text-gold" />
          <h1 className="text-4xl font-black text-white">Classement</h1>
        </div>
        <p className="text-zinc-400">Les meilleurs parieurs du Casino du Throw</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-center">
          Erreur: {error}
        </div>
      )}

      {/* Top 3 Podium */}
      {users.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-10">
          {/* 2nd Place */}
          <div className="order-1 pt-8">
            <PodiumCard user={users[1]} rank={2} isCurrentUser={currentUser?.id === users[1].id} />
          </div>
          {/* 1st Place */}
          <div className="order-2">
            <PodiumCard user={users[0]} rank={1} isCurrentUser={currentUser?.id === users[0].id} />
          </div>
          {/* 3rd Place */}
          <div className="order-3 pt-12">
            <PodiumCard user={users[2]} rank={3} isCurrentUser={currentUser?.id === users[2].id} />
          </div>
        </div>
      )}

      {/* Rest of the leaderboard */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-800/50 text-sm font-bold text-zinc-400 uppercase tracking-wide">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">Joueur</div>
          <div className="col-span-3 text-right">Johnny Coins</div>
          <div className="col-span-2 text-center">Paris</div>
          <div className="col-span-2 text-center">Win Rate</div>
        </div>

        <div className="divide-y divide-zinc-800">
          {users.slice(3).map((user, index) => (
            <LeaderboardRow
              key={user.id}
              user={user}
              rank={index + 4}
              isCurrentUser={currentUser?.id === user.id}
            />
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            Aucun joueur pour le moment
          </div>
        )}
      </div>
    </div>
  );
};

// Podium Card for Top 3
const PodiumCard = ({ user, rank, isCurrentUser }: { user: LeaderboardUser; rank: number; isCurrentUser: boolean }) => {
  const winRate = user.total_bets > 0 ? Math.round((user.bets_won / user.total_bets) * 100) : 0;

  const rankStyles = {
    1: {
      bg: 'bg-gradient-to-b from-gold/20 via-amber-900/10 to-zinc-900',
      border: 'border-gold/50',
      icon: <Crown className="w-8 h-8 text-gold" />,
      text: 'text-gold'
    },
    2: {
      bg: 'bg-gradient-to-b from-zinc-400/20 via-zinc-600/10 to-zinc-900',
      border: 'border-zinc-400/50',
      icon: <Medal className="w-7 h-7 text-zinc-300" />,
      text: 'text-zinc-300'
    },
    3: {
      bg: 'bg-gradient-to-b from-amber-700/20 via-amber-900/10 to-zinc-900',
      border: 'border-amber-700/50',
      icon: <Award className="w-6 h-6 text-amber-600" />,
      text: 'text-amber-600'
    }
  };

  const style = rankStyles[rank as keyof typeof rankStyles];

  return (
    <Link
      to={`/user/${user.id}`}
      className={`block p-6 rounded-2xl border ${style.bg} ${style.border} ${isCurrentUser ? 'ring-2 ring-primary' : ''} hover:scale-105 transition-transform`}
    >
      <div className="flex flex-col items-center text-center">
        {style.icon}
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mt-4 mb-3 ${rank === 1 ? 'ring-4 ring-gold/50' : ''}`}>
          <span className="text-2xl font-black text-white">{user.pseudo.charAt(0).toUpperCase()}</span>
        </div>
        <h3 className="font-bold text-white text-lg truncate max-w-full">{user.pseudo}</h3>
        <div className={`flex items-center gap-2 mt-2 ${style.text}`}>
          <Sparkles className="w-4 h-4" />
          <span className="font-mono font-bold">{user.credits.toLocaleString('fr-FR')} JC</span>
        </div>
        <div className="text-sm text-zinc-500 mt-2">
          {user.total_bets} paris • {winRate}% win
        </div>
      </div>
    </Link>
  );
};

// Leaderboard Row for ranks 4+
const LeaderboardRow: React.FC<{ user: LeaderboardUser; rank: number; isCurrentUser: boolean }> = ({ user, rank, isCurrentUser }) => {
  const winRate = user.total_bets > 0 ? Math.round((user.bets_won / user.total_bets) * 100) : 0;
  const netGain = user.jc_won - user.jc_lost;

  return (
    <Link
      to={`/user/${user.id}`}
      className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-800/50 transition-colors ${isCurrentUser ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
    >
      <div className="col-span-1 text-center font-bold text-zinc-500">
        {rank}
      </div>
      <div className="col-span-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-white">{user.pseudo.charAt(0).toUpperCase()}</span>
        </div>
        <span className="font-bold text-white truncate">{user.pseudo}</span>
        {isCurrentUser && <span className="text-xs text-primary">(toi)</span>}
      </div>
      <div className="col-span-3 flex items-center justify-end gap-2">
        <Sparkles className="w-4 h-4 text-gold" />
        <span className="font-mono font-bold text-gold">{user.credits.toLocaleString('fr-FR')}</span>
      </div>
      <div className="col-span-2 text-center">
        <span className="text-white font-bold">{user.total_bets}</span>
        <span className="text-zinc-500 text-sm ml-1">
          ({user.bets_won}W/{user.bets_lost}L)
        </span>
      </div>
      <div className="col-span-2 flex items-center justify-center">
        {winRate >= 50 ? (
          <span className="flex items-center gap-1 text-green-400 font-bold">
            <TrendingUp className="w-4 h-4" />
            {winRate}%
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-400 font-bold">
            <TrendingDown className="w-4 h-4" />
            {winRate}%
          </span>
        )}
      </div>
    </Link>
  );
};

export default Leaderboard;
