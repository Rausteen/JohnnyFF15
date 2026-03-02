import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, LogIn, Grid3X3, Settings, Users } from 'lucide-react';
import { createGame, joinGame } from '../services/gridrush/gridrushService';

type Mode = 'menu' | 'create' | 'join';

const GridRush: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('menu');

  // Create game form
  const [hostName, setHostName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [timerMin, setTimerMin] = useState(20);

  // Join game form
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinTeamOption, setJoinTeamOption] = useState<'new' | 'existing'>('new');
  const [joinNewTeamName, setJoinNewTeamName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!hostName.trim() || !teamName.trim()) return;
    setLoading(true);
    setError('');

    const result = await createGame(
      hostName.trim(),
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
          playerName: hostName.trim(),
          isHost: true,
        })
      );
      navigate(`/gridrush/game/${result.gameCode}`);
    } else {
      setError('Erreur lors de la création de la partie');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinName.trim()) return;
    setLoading(true);
    setError('');

    const result = await joinGame(
      joinCode.trim(),
      joinName.trim(),
      undefined,
      joinTeamOption === 'new' ? joinNewTeamName.trim() || `Équipe ${joinName}` : undefined
    );

    if (result) {
      sessionStorage.setItem(
        'gridrush_session',
        JSON.stringify({
          gameId: result.gameId,
          gameCode: joinCode.trim().toUpperCase(),
          teamId: result.teamId,
          playerId: result.playerId,
          playerName: joinName.trim(),
          isHost: false,
        })
      );
      navigate(`/gridrush/game/${joinCode.trim().toUpperCase()}`);
    } else {
      setError('Code invalide ou partie déjà lancée');
    }
    setLoading(false);
  };

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

            <button
              onClick={() => setMode('join')}
              className="w-full py-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all"
            >
              <LogIn className="w-6 h-6" />
              Rejoindre une partie
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

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Ton pseudo</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Ex: Johnny"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-primary/50"
                  maxLength={20}
                />
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
                disabled={loading || !hostName.trim() || !teamName.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 text-white font-bold text-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer la partie'}
              </button>
            </div>
          </div>
        )}

        {/* Join form */}
        {mode === 'join' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('menu')}
              className="text-sm text-zinc-500 hover:text-white transition-colors mb-2"
            >
              ← Retour
            </button>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <LogIn className="w-5 h-5 text-primary" />
                Rejoindre une partie
              </h2>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Code de la partie</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC123"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono text-center text-xl tracking-[0.3em] placeholder-zinc-500 outline-none focus:border-primary/50 uppercase"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Ton pseudo</label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Ex: Rausteen"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-primary/50"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Équipe</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setJoinTeamOption('new')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      joinTeamOption === 'new'
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    Nouvelle équipe
                  </button>
                  <button
                    onClick={() => setJoinTeamOption('existing')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      joinTeamOption === 'existing'
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    Rejoindre existante
                  </button>
                </div>
                {joinTeamOption === 'new' && (
                  <input
                    type="text"
                    value={joinNewTeamName}
                    onChange={(e) => setJoinNewTeamName(e.target.value)}
                    placeholder="Nom de l'équipe"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-primary/50"
                    maxLength={30}
                  />
                )}
                {joinTeamOption === 'existing' && (
                  <p className="text-xs text-zinc-500 px-2">
                    Tu pourras rejoindre une équipe existante dans le lobby
                  </p>
                )}
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                onClick={handleJoin}
                disabled={loading || !joinCode.trim() || !joinName.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:brightness-110 text-white font-bold text-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Connexion...' : 'Rejoindre'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridRush;
