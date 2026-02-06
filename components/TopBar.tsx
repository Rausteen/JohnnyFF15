import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Coins, Skull, History, ShieldAlert, Menu, X, Sparkles, User, LogOut, Gift, Trophy, Swords, Package } from 'lucide-react';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';
import { useCosmeticsLookup } from '../services/useCosmeticsLookup';

const TopBar = () => {
  const { user, signOut, loading: authLoading } = useAuthStore();
  const { profile } = useCreditsStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Check if user is admin (Rausteen)
  const isAdmin = profile?.pseudo === 'Rausteen';

const navLinks = [
  { path: '/dashboard', label: 'Le Salon', icon: Skull },
  { path: '/my-bets', label: 'Mes Paris', icon: Coins },
  { path: '/history', label: 'Musée', icon: History },
  { path: '/leaderboard', label: 'Classement', icon: Trophy },
  { path: '/cases', label: 'Caisses', icon: Package },
  ...(isAdmin ? [
    { path: '/team-balancer', label: '5v5', icon: Swords },
    { path: '/admin', label: 'Admin', icon: ShieldAlert }
  ] : []),
];


  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Get user display name
  const displayName = profile?.pseudo || user?.user_metadata?.pseudo || user?.email?.split('@')[0] || 'Utilisateur';

  // Get equipped cosmetics from Supabase
  const { getCosmetic } = useCosmeticsLookup();
  const equippedBorder = getCosmetic(profile?.equipped_border);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-50 group-hover:opacity-100 transition duration-500"></div>
            <Skull className="relative w-7 h-7 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-primary-300 to-accent-300 bg-clip-text text-transparent group-hover:from-primary group-hover:to-accent transition-all duration-300">
            JohnnyFF15
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                isActive(link.path)
                  ? 'bg-primary text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
        </div>

        {/* Balance + User Info & Mobile Menu */}
        <div className="flex items-center gap-3">
          {/* Solde - Only show when logged in */}
          {user && profile && (
            <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-gold/10 to-amber-900/20 border border-gold/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <div className="bg-gold/20 p-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
              </div>
              <span className="text-sm font-mono font-bold text-gold">
                {profile.credits.toLocaleString('fr-FR')} JC
              </span>
            </div>
          )}

          {user ? (
            <>
              {/* User Info */}
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                <div className="w-6 h-6 overflow-hidden relative">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  {equippedBorder?.image_url && (
                    <img
                      src={equippedBorder.image_url}
                      alt=""
                      className="absolute inset-0 w-full h-full pointer-events-none z-10 object-cover"
                    />
                  )}
                </div>
                <span className="text-sm font-bold text-white truncate max-w-[100px]">
                  {displayName}
                </span>
              </Link>
              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                disabled={authLoading}
                className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-red-500/20 hover:border-red-500/50 transition cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </>
          ) : (
            <>
              {/* Se connecter */}
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all cursor-pointer font-bold text-sm text-white shadow-lg shadow-primary/25"
              >
                Se connecter
              </Link>
            </>
          )}
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/95 backdrop-blur-xl p-4 space-y-4">
          {/* User info and balance for mobile */}
          {user && profile && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-900 to-black border border-gold/20 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 overflow-hidden relative">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  {equippedBorder?.image_url && (
                    <img
                      src={equippedBorder.image_url}
                      alt=""
                      className="absolute inset-0 w-full h-full pointer-events-none z-10 object-cover"
                    />
                  )}
                </div>
                <span className="text-white font-bold">{displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <span className="font-mono font-bold text-gold">
                  {profile.credits.toLocaleString('fr-FR')} JC
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                  isActive(link.path)
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <link.icon className="w-6 h-6" />
                <span className="text-sm font-bold">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Login/Logout buttons for mobile */}
          {user ? (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-accent/30 bg-accent/10 text-accent"
              >
                <Gift className="w-6 h-6" />
                <span className="text-sm font-bold">Profil</span>
              </Link>
              <button
                onClick={() => { handleSignOut(); setIsOpen(false); }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400"
              >
                <LogOut className="w-6 h-6" />
                <span className="text-sm font-bold">Déconnexion</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold mt-4"
            >
              <User className="w-5 h-5" />
              Se connecter
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default TopBar;
