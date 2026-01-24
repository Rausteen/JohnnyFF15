import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { Loader2 } from 'lucide-react';

const images = [
  '/background_image/vayne.PNG',
  '/background_image/gateau.PNG',
  '/background_image/teemo.PNG',
];

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading, error, clearError } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

    if (!email || !password) {
      setLocalError('Email ou mot de passe manquant !');
      return;
    }

    const result = await signIn(email, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password || !pseudo) {
      setLocalError('Tous les champs sont requis !');
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

    const result = await signUp(email, password, pseudo);
    if (result.success) {
      setSuccessMessage('Inscription réussie ! Vérifie ton email pour confirmer ton compte.');
    }
  };

  const displayError = localError || error;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black p-4">
      {/* Fond */}
      <div
        className={`absolute inset-0 bg-center bg-no-repeat bg-contain transition-opacity duration-[1000ms]`}
        style={{
          backgroundImage: `url(${images[currentIndex]})`,
          opacity: fade ? 1 : 0,
        }}
      ></div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Formulaire */}
      <div className="relative z-10 bg-zinc-900 p-8 rounded-xl shadow-lg w-full max-w-md text-white">
        {/* Toggle Login / Sign Up */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`px-4 py-2 rounded-tl-lg rounded-bl-lg ${
              isLogin ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Se connecter
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`px-4 py-2 rounded-tr-lg rounded-br-lg ${
              !isLogin ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            S'inscrire
          </button>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="mb-4 p-3 rounded bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
            {displayError}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 rounded bg-green-500/20 border border-green-500/50 text-green-300 text-sm">
            {successMessage}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              className="w-full py-2 bg-primary rounded text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Pseudo"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              required
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Confirme le mot de passe"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              className="w-full py-2 bg-primary rounded text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Inscription...
                </>
              ) : (
                "S'inscrire"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
