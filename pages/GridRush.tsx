import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, Grid3X3, Settings, Users, ShieldAlert } from 'lucide-react';
import { createGame } from '../services/gridrush/gridrushService';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';

type Mode = 'menu' | 'create';

const GridRush: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useCreditsStore();
  const isAdmin = profile?.pseudo === 'Rausteen';
  const [mode, setMode] = useState<Mode>('menu');

  // Create game form — pseudo comes from account
  const playerName = profile?.pseudo || '';
  const [teamName, setTeamName] = useState('');
  const [timerMin, setTimerMin] = useState(20);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!playerName || !teamName.trim()) return;
    setLoading(true);
    setError('');

    const result = await createGame(
      playerName,
      'default-set',
      teamName.trim(),
      timerMin * 60
    );

    if (result) {
      // Store player info in sessionStorage for the game page
      sessionStorage.setItem(
        'gridrush_session',
        JSON.stringify({
          gameId: result.gameId,
          gameCode: result.gameCode,
          teamId: result.teamId,
          playerId: result.playerId,
          playerName,
          isHost: true,
        })
      );
      navigate(`/gridrush/game/${result.gameCode}`);
    } else {
      setError('Erreur lors de la création de la partie');
    }
    setLoading(false);
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-bold mb-2">Accès réservé aux administrateurs</p>
          <p className="text-zinc-500 text-sm mb-4">Seul l'admin peut créer une partie GridRush.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-20">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              GRID<span className="text-red-400">RUSH</span>
            </h1>
          </div>
          <p className="text-zinc-500 text-sm">
            3 grilles de mots croisés. 1 mot mystère par grille. L'équipe la plus rapide gagne.
          </p>
        </div>

        {/* Menu */}
        {mode === 'menu' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600/90 to-amber-600/90 hover:brightness-110 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all"
            >
              <Plus className="w-6 h-6" />
              Créer une partie
            </button>

            <div className="pt-4 border-t border-zinc-800/50">
              <button
                onClick={() => navigate('/gridrush/editor')}
                className="w-full py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-medium flex items-center justify-center gap-2 transition-all text-sm"
              >
                <Grid3X3 className="w-4 h-4" />
                Éditeur de grilles
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        {mode === 'create' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('menu')}
              className="text-sm text-zinc-500 hover:text-white transition-colors mb-2"
            >
              ← Retour
            </button>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Créer une partie
              </h2>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <span className="text-xs text-zinc-500">Joueur :</span>
                <span className="text-sm font-bold text-white">{playerName}</span>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Nom de ton équipe</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Les Chevaliers"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-primary/50"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  <Settings className="w-3 h-3 inline mr-1" />
                  Timer (minutes)
                </label>
                <input
                  type="number"
                  value={timerMin}
                  onChange={(e) => setTimerMin(Math.max(5, Math.min(60, Number(e.target.value))))}
                  min={5}
                  max={60}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-primary/50"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={loading || !playerName || !teamName.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 text-white font-bold text-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer la partie'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GridRush;
