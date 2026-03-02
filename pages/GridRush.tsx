import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, Trash2, Users, Clock, Play, CheckCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';
import { useGridRushStore } from '../services/gridRushStore';
import { supabase } from '../services/supabase';

// Admin users
const ADMIN_USERS = ['Rausteen'];

interface GameListItem {
  id: string;
  join_code: string;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
}

const GridRush = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useCreditsStore();
  const { createGame, loading, error } = useGridRushStore();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');

  const isAdmin = profile && ADMIN_USERS.includes(profile.pseudo);

  // Redirect non-admin users
  useEffect(() => {
    if (profile && !ADMIN_USERS.includes(profile.pseudo)) {
      navigate('/');
    }
  }, [profile, navigate]);

  // Load existing games
  useEffect(() => {
    const loadGames = async () => {
      if (!user) return;
      setLoadingGames(true);
      const { data } = await supabase
        .from('gridrush_games')
        .select('id, join_code, status, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setGames((data || []) as GameListItem[]);
      setLoadingGames(false);
    };
    loadGames();
  }, [user]);

  const handleCreateGame = async () => {
    if (!user) return;
    const joinCode = await createGame(user.id);
    if (joinCode) {
      navigate(`/gridrush/game/${joinCode}`);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    const { error } = await supabase
      .from('gridrush_games')
      .delete()
      .eq('id', gameId);

    if (!error) {
      setGames(games.filter((g) => g.id !== gameId));
    }
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}${window.location.pathname}#/gridrush/game/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleJoinByCode = () => {
    if (joinCode.trim()) {
      navigate(`/gridrush/game/${joinCode.trim().toUpperCase()}`);
    }
  };

  const statusLabel: Record<string, { text: string; color: string; icon: any }> = {
    waiting: { text: 'En attente', color: 'text-yellow-400', icon: Clock },
    playing: { text: 'En cours', color: 'text-green-400', icon: Play },
    finished: { text: 'Terminée', color: 'text-zinc-400', icon: CheckCircle },
  };

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-zinc-400">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30">
          <Zap className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            GridRush
          </h1>
          <p className="text-zinc-400 text-sm">Crée et gère tes parties de devinettes</p>
        </div>
      </div>

      {/* Create Game */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/50 border border-white/10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-accent" />
          Nouvelle Partie
        </h2>
        <p className="text-zinc-400 text-sm mb-4">
          Crée une nouvelle partie avec la grille de test. Un code d'invitation sera généré pour partager avec les joueurs.
        </p>
        <button
          onClick={handleCreateGame}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-primary hover:from-accent/80 hover:to-primary/80 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          Créer une partie
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Join by code */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/50 border border-white/10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-green-400" />
          Rejoindre par code
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="CODE..."
            maxLength={6}
            className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-lg tracking-widest uppercase focus:outline-none focus:border-accent/50"
            onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
          />
          <button
            onClick={handleJoinByCode}
            disabled={!joinCode.trim()}
            className="px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 transition disabled:opacity-50 cursor-pointer"
          >
            Rejoindre
          </button>
        </div>
      </div>

      {/* Games List */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/50 border border-white/10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-400" />
          Mes Parties
        </h2>

        {loadingGames ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mx-auto" />
          </div>
        ) : games.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">Aucune partie créée pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {games.map((game) => {
              const status = statusLabel[game.status];
              const StatusIcon = status.icon;
              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/5 hover:border-white/10 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-xl font-bold tracking-widest text-white">
                      {game.join_code}
                    </div>
                    <div className={`flex items-center gap-1.5 text-sm ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {status.text}
                    </div>
                    <div className="text-zinc-500 text-sm hidden sm:block">
                      {new Date(game.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(game.join_code)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-zinc-400 hover:text-white cursor-pointer"
                      title="Copier le lien"
                    >
                      {copiedCode === game.join_code ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/gridrush/game/${game.join_code}`)}
                      className="p-2 rounded-lg bg-accent/10 hover:bg-accent/20 transition text-accent cursor-pointer"
                      title="Ouvrir la partie"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {game.status !== 'playing' && (
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition text-red-400 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GridRush;
