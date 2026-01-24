import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Coins, Skull, History, ShieldAlert, Menu, X, Sparkles, User, LogOut } from 'lucide-react';
import { useStore } from '../services/store';
import { useAuthStore } from '../services/authStore';

const TopBar = () => {
  const { balance } = useStore();
  const { user, signOut, loading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/dashboard', label: 'Le Salon', icon: Skull },
    { path: '/my-bets', label: 'Mes Paris', icon: Coins },
    { path: '/history', label: 'Musée', icon: History },
    { path: '/admin', label: 'Admin', icon: ShieldAlert },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Get user display name (pseudo from metadata or email)
  const displayName = user?.user_metadata?.pseudo || user?.email?.split('@')[0] || 'Utilisateur';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
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
          {/* Solde */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 rounded-full bg-black/40 border border-gold/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
            <div className="bg-gold/20 p-1 rounded-full">
              <Sparkles className="w-3 h-3 text-gold" />
            </div>
            <span className="text-sm font-mono font-bold text-gold">
              {balance.toLocaleString('fr-FR')}
            </span>
          </div>

          {user ? (
            <>
              {/* User Info */}
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                <User className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white truncate max-w-[100px]">
                  {displayName}
                </span>
              </Link>
              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                disabled={loading}
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
                className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition cursor-pointer font-bold text-sm"
              >
                Se connecter
              </Link>
              {/* Profil */}
              <Link
                to="/profile"
                className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                <User className="w-5 h-5 text-white" />
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
        <div className="md:hidden border-t border-white/10 bg-black p-4 space-y-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 mb-4">
            <span className="text-zinc-400 text-sm">Solde actuel</span>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-gold" />
              <span className="font-mono font-bold text-gold">
                {balance.toLocaleString('fr-FR')}
              </span>
            </div>
          </div>

          {/* User info for mobile */}
          {user && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-bold">{displayName}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-red-400 hover:text-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
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

          {/* Login/Profile buttons for mobile */}
          {!user && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-primary/50 bg-primary/10 text-primary"
              >
                <User className="w-6 h-6" />
                <span className="text-sm font-bold">Se connecter</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/5 bg-zinc-900/50 text-zinc-400"
              >
                <User className="w-6 h-6" />
                <span className="text-sm font-bold">Profil</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default TopBar;
