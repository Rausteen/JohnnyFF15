import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';
import { User, Mail, Calendar, Coins, LogOut, LogIn, Gift, Clock, Sparkles, Trophy, TrendingUp } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuthStore();
  const { profile, claimDailyBonus, canClaimDailyBonus, getTimeUntilNextBonus, loading: creditsLoading } = useCreditsStore();
  const [bonusMessage, setBonusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [timeUntilBonus, setTimeUntilBonus] = useState<{ hours: number; minutes: number } | null>(null);

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      setTimeUntilBonus(getTimeUntilNextBonus());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [getTimeUntilNextBonus, profile?.last_daily_bonus]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleClaimBonus = async () => {
    setBonusMessage(null);
    const result = await claimDailyBonus();
    if (result.success) {
      setBonusMessage({ type: 'success', text: '+1 000 crédits ajoutés !' });
      setTimeout(() => setBonusMessage(null), 5000);
    } else {
      setBonusMessage({ type: 'error', text: result.error || 'Erreur lors de la réclamation' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-10 rounded-3xl text-center max-w-md border border-white/10 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-zinc-600" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Non connecté</h1>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            Connecte-toi pour accéder à ton profil, récupérer ton bonus quotidien et commencer à parier !
          </p>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-accent rounded-xl text-white font-bold mx-auto hover:scale-105 transition-transform shadow-lg shadow-primary/25"
          >
            <LogIn className="w-5 h-5" />
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.pseudo || user.user_metadata?.pseudo || user.email?.split('@')[0] || 'Utilisateur';
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Inconnu';

  const canClaim = canClaimDailyBonus();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
          <span className="text-3xl font-black text-white">{displayName.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">{displayName}</h1>
          <p className="text-zinc-400">Joueur du Casino du Throw</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Credits Card */}
        <div className="bg-gradient-to-br from-gold/10 via-amber-900/10 to-zinc-900 rounded-2xl p-6 border border-gold/20 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gold/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-white">Mes Crédits</h2>
          </div>

          <div className="text-5xl font-black text-gold mb-6 font-mono">
            {profile?.credits.toLocaleString('fr-FR') || '---'}
          </div>

          {/* Daily Bonus */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Gift className="w-4 h-4" />
                <span>Bonus Quotidien</span>
              </div>
              <span className="text-sm font-bold text-gold">+1 000</span>
            </div>

            {bonusMessage && (
              <div className={`mb-3 p-2 rounded-lg text-sm font-bold text-center ${
                bonusMessage.type === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {bonusMessage.text}
              </div>
            )}

            {canClaim ? (
              <button
                onClick={handleClaimBonus}
                disabled={creditsLoading}
                className="w-full py-3 bg-gradient-to-r from-gold to-amber-500 text-black font-bold rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-gold/25"
              >
                <Gift className="w-5 h-5" />
                Réclamer mon bonus !
              </button>
            ) : (
              <div className="text-center py-3 bg-zinc-800/50 rounded-xl border border-white/5">
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Prochain bonus dans</span>
                </div>
                <div className="text-xl font-mono font-bold text-white mt-1">
                  {timeUntilBonus ? `${timeUntilBonus.hours}h ${timeUntilBonus.minutes}m` : '--:--'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/5 rounded-xl">
              <User className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Informations</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-black/20 rounded-xl">
              <Mail className="w-5 h-5 text-zinc-500" />
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Email</div>
                <div className="text-white">{user.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-black/20 rounded-xl">
              <Calendar className="w-5 h-5 text-zinc-500" />
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Membre depuis</div>
                <div className="text-white">{createdAt}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-black/20 rounded-xl">
              <Trophy className="w-5 h-5 text-accent" />
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Statut</div>
                <div className="text-accent font-bold">Joueur Actif</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-white">Statistiques</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-black/20 rounded-xl">
              <div className="text-3xl font-bold text-white">0</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Paris totaux</div>
            </div>
            <div className="text-center p-4 bg-black/20 rounded-xl">
              <div className="text-3xl font-bold text-green-400">0%</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Taux de réussite</div>
            </div>
            <div className="text-center p-4 bg-black/20 rounded-xl">
              <div className="text-3xl font-bold text-gold">0</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Crédits gagnés</div>
            </div>
            <div className="text-center p-4 bg-black/20 rounded-xl">
              <div className="text-3xl font-bold text-red-400">0</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Crédits perdus</div>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <LogOut className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Actions</h2>
          </div>

          <button
            onClick={handleSignOut}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/20 transition disabled:opacity-50 font-bold"
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
