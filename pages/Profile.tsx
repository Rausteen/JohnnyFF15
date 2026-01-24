import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { useStore } from '../services/store';
import { User, Mail, Calendar, Coins, LogOut, LogIn } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuthStore();
  const { balance } = useStore();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="p-4 text-white min-h-[60vh] flex flex-col items-center justify-center">
        <div className="bg-zinc-900 p-8 rounded-xl text-center max-w-md">
          <User className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Non connecté</h1>
          <p className="text-zinc-400 mb-6">
            Connecte-toi pour accéder à ton profil et commencer à parier !
          </p>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-6 py-3 bg-primary rounded-lg text-white font-bold mx-auto hover:bg-primary/80 transition"
          >
            <LogIn className="w-5 h-5" />
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const displayName = user.user_metadata?.pseudo || user.email?.split('@')[0] || 'Utilisateur';
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Inconnu';

  return (
    <div className="p-4 text-white max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mon Profil</h1>

      {/* User Info Card */}
      <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-white/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{displayName}</h2>
            <p className="text-zinc-400 text-sm">Joueur du Casino</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-zinc-300">
            <Mail className="w-5 h-5 text-zinc-500" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <Calendar className="w-5 h-5 text-zinc-500" />
            <span>Membre depuis le {createdAt}</span>
          </div>
          <div className="flex items-center gap-3 text-gold">
            <Coins className="w-5 h-5" />
            <span className="font-mono font-bold">{balance.toLocaleString('fr-FR')} crédits</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-bold mb-4">Actions</h3>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Profile;
