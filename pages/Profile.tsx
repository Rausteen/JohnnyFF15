import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore, TRANSFER_LIMITS } from '../services/creditsStore';
import { supabase } from '../services/supabase';
import { User, Mail, Calendar, Coins, LogOut, LogIn, Gift, Clock, Sparkles, Trophy, TrendingUp, Send, Loader2, Info, ChevronDown, Camera, X } from 'lucide-react';
import { useCosmeticsLookup } from '../services/useCosmeticsLookup';

interface UserOption {
  id: string;
  pseudo: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuthStore();
  const { profile, claimDailyBonus, canClaimDailyBonus, getTimeUntilNextBonus, transferCredits, getTransferLimits, loading: creditsLoading } = useCreditsStore();
  const [bonusMessage, setBonusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [timeUntilBonus, setTimeUntilBonus] = useState<{ hours: number; minutes: number } | null>(null);

  // Transfer credits state
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Get equipped cosmetics from Supabase (must be before any early return)
  const { getCosmetic } = useCosmeticsLookup();

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      setTimeUntilBonus(getTimeUntilNextBonus());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [getTimeUntilNextBonus, profile?.last_daily_bonus]);

  // Load all users for transfer dropdown
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, pseudo')
        .order('pseudo');

      if (!error && data) {
        setAllUsers(data);
      }
    };
    loadUsers();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleClaimBonus = async () => {
    setBonusMessage(null);
    const result = await claimDailyBonus();
    if (result.success) {
      setBonusMessage({ type: 'success', text: '+1 000 JC ajoutés !' });
      setTimeout(() => setBonusMessage(null), 5000);
    } else {
      setBonusMessage({ type: 'error', text: result.error || 'Erreur lors de la réclamation' });
    }
  };

  const handleTransfer = async () => {
    if (!transferRecipient.trim() || !transferAmount) return;
    const amount = parseInt(transferAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setTransferMessage({ type: 'error', text: 'Montant invalide' });
      return;
    }

    setTransferLoading(true);
    setTransferMessage(null);

    const result = await transferCredits(transferRecipient.trim(), amount);

    setTransferLoading(false);
    if (result.success) {
      const feeText = result.fee ? ` (frais: ${result.fee.toLocaleString('fr-FR')} JC)` : '';
      setTransferMessage({ type: 'success', text: `${amount.toLocaleString('fr-FR')} JC envoyés à ${transferRecipient}!${feeText}` });
      setTransferRecipient('');
      setTransferAmount('');
      setTimeout(() => setTransferMessage(null), 5000);
    } else {
      setTransferMessage({ type: 'error', text: result.error || 'Erreur lors du transfert' });
    }
  };

  // Get current transfer limits
  const transferLimits = getTransferLimits();

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setAvatarError('Le fichier doit être une image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image trop grande (max 2 Mo)');
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Reload profile to reflect changes
      const { loadProfile } = useCreditsStore.getState();
      await loadProfile(user.id);

    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setAvatarError(err.message || 'Erreur lors de l\'upload');
    } finally {
      setAvatarUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove avatar handler
  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Reload profile
      const { loadProfile } = useCreditsStore.getState();
      await loadProfile(user.id);

    } catch (err: any) {
      console.error('Remove avatar error:', err);
      setAvatarError(err.message || 'Erreur lors de la suppression');
    } finally {
      setAvatarUploading(false);
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

  const equippedTitle = getCosmetic(profile?.equipped_title);
  const equippedBorder = getCosmetic(profile?.equipped_border);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {/* Avatar with upload */}
        <div className="relative group">
          <div className="w-20 h-20 shadow-lg shadow-primary/30 relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-3xl font-black text-white">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            {equippedBorder?.image_url && (
              <img
                src={equippedBorder.image_url}
                alt=""
                className="absolute inset-0 w-full h-full pointer-events-none z-10 object-cover scale-[1.2]"
              />
            )}
          </div>

          {/* Upload overlay */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
          >
            {avatarUploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </div>

          {/* Remove avatar button */}
          {profile?.avatar_url && !avatarUploading && (
            <button
              onClick={handleRemoveAvatar}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Supprimer la photo"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-white">{displayName}</h1>
          </div>
          {equippedTitle ? (
            <p className="text-zinc-400 italic">"{equippedTitle.name}"</p>
          ) : (
            <p className="text-zinc-400">Joueur du Casino du Throw</p>
          )}
          {avatarError && (
            <p className="text-red-400 text-sm mt-1">{avatarError}</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Credits Card */}
        <div className="bg-gradient-to-br from-gold/10 via-amber-900/10 to-zinc-900 rounded-2xl p-6 border border-gold/20 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gold/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-white">Johnny Coins</h2>
          </div>

          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-black text-gold font-mono">
              {profile?.credits.toLocaleString('fr-FR') || '---'}
            </span>
            <span className="text-xl font-bold text-gold/60">JC</span>
          </div>

          {/* Daily Bonus */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Gift className="w-4 h-4" />
                <span>Bonus Quotidien</span>
              </div>
              <span className="text-sm font-bold text-gold">+1 000 JC</span>
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
              <div className="text-3xl font-bold text-white">{profile?.total_bets || 0}</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">Paris totaux</div>
            </div>
            <div className="text-center p-4 bg-black/20 rounded-xl">
              {(() => {
                const resolved = (profile?.bets_won || 0) + (profile?.bets_lost || 0);
                const winRate = resolved > 0 ? Math.round((profile?.bets_won || 0) / resolved * 100) : 0;
                return (
                  <div className={`text-3xl font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {winRate}%
                  </div>
                );
              })()}
              <div className="text-xs text-zinc-500 uppercase mt-1">Taux de réussite</div>
            </div>
            <div className="text-center p-4 bg-black/20 rounded-xl">
              <div className="text-3xl font-bold text-green-400">+{(profile?.jc_won || 0).toLocaleString('fr-FR')}</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">JC gagnés</div>
            </div>
            <div className="text-center p-4 bg-black/20 rounded-xl">
              <div className="text-3xl font-bold text-red-400">-{(profile?.jc_lost || 0).toLocaleString('fr-FR')}</div>
              <div className="text-xs text-zinc-500 uppercase mt-1">JC perdus</div>
            </div>
          </div>
        </div>

        {/* Transfer Credits Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Send className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Envoyer des JC</h2>
          </div>

          {/* Transfer limits info */}
          <div className="mb-4 p-3 bg-black/30 rounded-xl border border-white/5 text-xs space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Info className="w-3 h-3" />
              <span className="font-bold">Limites</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-zinc-500">
              <span>Min/Max:</span>
              <span className="text-zinc-300">{TRANSFER_LIMITS.MIN.toLocaleString('fr-FR')} - {transferLimits.max.toLocaleString('fr-FR')} JC</span>
              <span>Frais:</span>
              <span className="text-amber-400">{transferLimits.fee}%</span>
              <span>Limite/jour:</span>
              <span className="text-zinc-300">{transferLimits.dailyRemaining.toLocaleString('fr-FR')} JC restants</span>
              {transferLimits.cooldownRemaining && (
                <>
                  <span>Cooldown:</span>
                  <span className="text-red-400">{Math.ceil(transferLimits.cooldownRemaining / 60)} min</span>
                </>
              )}
            </div>
          </div>

          {transferMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-bold ${
              transferMessage.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {transferMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wide mb-2">Destinataire</label>
              <div className="relative">
                <select
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition appearance-none cursor-pointer"
                >
                  <option value="" className="bg-zinc-900">Choisir un joueur...</option>
                  {allUsers
                    .filter(u => u.pseudo !== profile?.pseudo)
                    .map(u => (
                      <option key={u.id} value={u.pseudo} className="bg-zinc-900">
                        {u.pseudo}
                      </option>
                    ))
                  }
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wide mb-2">Montant</label>
              <div className="relative">
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder={`${TRANSFER_LIMITS.MIN} - ${transferLimits.max}`}
                  min={TRANSFER_LIMITS.MIN}
                  max={transferLimits.max}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none transition pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">JC</span>
              </div>
              {transferAmount && parseInt(transferAmount) >= TRANSFER_LIMITS.MIN && (
                <div className="mt-1 text-xs text-amber-400">
                  Frais: {Math.ceil(parseInt(transferAmount) * TRANSFER_LIMITS.FEE_PERCENT).toLocaleString('fr-FR')} JC
                </div>
              )}
            </div>

            <button
              onClick={handleTransfer}
              disabled={transferLoading || !transferRecipient.trim() || !transferAmount || transferLimits.cooldownRemaining !== null}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {transferLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {transferLimits.cooldownRemaining ? `Attendre ${Math.ceil(transferLimits.cooldownRemaining / 60)} min` : 'Envoyer'}
            </button>
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
