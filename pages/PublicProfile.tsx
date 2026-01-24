import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Calendar, Sparkles, Trophy, TrendingUp, TrendingDown, Target, ArrowLeft, Loader2, Crown } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../services/authStore';

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
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuthStore();

  const isOwnProfile = currentUser?.id === userId;

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
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-5xl font-black text-white">{profile.pseudo.charAt(0).toUpperCase()}</span>
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
