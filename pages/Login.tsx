import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { Loader2, Lock, User, AlertCircle, CheckCircle, Skull } from 'lucide-react';

const images = [
  '/background_image/vayne.PNG',
  '/background_image/gateau.PNG',
  '/background_image/teemo.png',
];

const funnySubtitles = [
  "Parie sur le int de Johnny",
  "0/10 powerspike incoming",
  "FF@15 ou tilt@5 ?",
  "La mauvaise foi en action",
];

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading, error, clearError } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [subtitle] = useState(() => funnySubtitles[Math.floor(Math.random() * funnySubtitles.length)]);

  // Fond
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setFade(true);
      }, 1000);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Clear errors when switching modes
  useEffect(() => {
    setLocalError('');
    setSuccessMessage('');
    clearError();
  }, [isLogin, clearError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!pseudo || !password) {
      setLocalError('Pseudo ou mot de passe manquant !');
      return;
    }

    const result = await signIn(pseudo, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!password || !pseudo) {
      setLocalError('Tous les champs sont requis !');
      return;
    }

    if (pseudo.length < 3) {
      setLocalError("Le pseudo doit contenir au moins 3 caractères !");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Les mots de passe ne correspondent pas !");
      return;
    }

    if (password.length < 6) {
      setLocalError("Le mot de passe doit contenir au moins 6 caractères !");
      return;
    }

    const result = await signUp(pseudo, password);
    if (result.success) {
      setSuccessMessage('Inscription réussie ! Tu peux maintenant te connecter.');
      setIsLogin(true);
      setPseudo('');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const displayError = localError || error;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black p-4">
      {/* Fond avec animation de zoom */}
      <div
        className={`absolute inset-0 bg-center bg-no-repeat bg-cover transition-all duration-[1500ms] ease-out ${
          fade ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
        }`}
        style={{
          backgroundImage: `url(${images[currentIndex]})`,
        }}
      ></div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70"></div>

      {/* Formulaire */}
      <div className="relative z-10 bg-zinc-900/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md text-white border border-zinc-800">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Skull className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-black text-primary">JohnnyFF15</h1>
          </div>
          <p className="text-zinc-400 text-sm italic">"{subtitle}"</p>
        </div>

        {/* Toggle Login / Sign Up */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`px-6 py-2.5 rounded-l-lg font-semibold transition-all duration-200 ${
              isLogin
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Se connecter
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`px-6 py-2.5 rounded-r-lg font-semibold transition-all duration-200 ${
              !isLogin
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            S'inscrire
          </button>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Pseudo"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-zinc-800/80 text-white border border-zinc-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-zinc-500"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                placeholder="Mot de passe"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-zinc-800/80 text-white border border-zinc-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-zinc-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button
              className="w-full py-3 bg-primary hover:bg-primary/90 rounded-lg text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-primary/25 mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Pseudo (visible par tes potes)"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-zinc-800/80 text-white border border-zinc-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-zinc-500"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                placeholder="Mot de passe (6 caractères min)"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-zinc-800/80 text-white border border-zinc-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-zinc-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                placeholder="Confirme le mot de passe"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-zinc-800/80 text-white border border-zinc-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-zinc-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button
              className="w-full py-3 bg-primary hover:bg-primary/90 rounded-lg text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-primary/25 mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inscription...
                </>
              ) : (
                "S'inscrire"
              )}
            </button>

            {/* Info bonus */}
            <p className="text-center text-zinc-500 text-xs mt-4">
              10 000 JC offerts + 1 000 JC/jour
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
