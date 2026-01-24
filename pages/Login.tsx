import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const images = [
  '/background_image/vayne.PNG',
  '/background_image/gateau.PNG',
  '/background_image/teemo.PNG',
];

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fond
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true); // true = visible

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); // commence le fondu
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setFade(true); // fade in
      }, 1000); // durée du fade
    }, 6000); // toutes les 6s
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pseudo && password) {
      alert('Connexion réussie !');
      navigate('/dashboard');
    } else {
      alert('Pseudo ou mot de passe manquant !');
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }
    alert('Inscription réussie !');
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black p-4">
      {/* Fond */}
      <div
        className={`absolute inset-0 bg-center bg-no-repeat bg-contain transition-opacity duration-[1000ms]`}
        style={{
          backgroundImage: `url(${images[currentIndex]})`,
          opacity: fade ? 1 : 0, // fade in/out
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

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Pseudo"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="w-full py-2 bg-primary rounded text-white font-bold">
              Se connecter
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <input
              type="text"
              placeholder="Pseudo"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirme le mot de passe"
              className="w-full p-2 rounded bg-zinc-800 text-white"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button className="w-full py-2 bg-primary rounded text-white font-bold">
              S'inscrire
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
