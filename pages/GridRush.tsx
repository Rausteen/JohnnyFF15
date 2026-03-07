import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, Grid3X3, Settings, Users, ShieldAlert, ChevronDown, Check, Layers } from 'lucide-react';
import { createGame, cleanupStaleGames, listSavedGrids, createGridSet, listGridSets, type SavedGridSummary } from '../services/gridrush/gridrushService';
import { DEFAULT_SETS } from '../services/gridrush/gridrushData';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';

type Mode = 'menu' | 'create';

interface ExistingSet { id: string; name: string; createdAt: string; }

const GridRush: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useCreditsStore();
  const isAdmin = ['Rausteen', 'AlbertEinstein 300IQ'].includes(profile?.pseudo || '');
  const playerName = profile?.pseudo || '';
  const [mode, setMode] = useState<Mode>('menu');

  // Create game form
  const [timerMin, setTimerMin] = useState(20);

  // Grid selection
  const [gridSource, setGridSource] = useState<'default' | 'custom'>('default');
  const [selectedDefaultSet, setSelectedDefaultSet] = useState<string>('default-set');
  const [savedGrids, setSavedGrids] = useState<SavedGridSummary[]>([]);
  const [existingSets, setExistingSets] = useState<ExistingSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [customEasyId, setCustomEasyId] = useState<string>('');
  const [customMediumId, setCustomMediumId] = useState<string>('');
  const [customHardId, setCustomHardId] = useState<string>('');
  const [customSetName, setCustomSetName] = useState('');
  const [loadingGrids, setLoadingGrids] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved grids + sets when switching to create mode
  useEffect(() => {
    if (mode === 'create') {
      setLoadingGrids(true);
      Promise.all([listSavedGrids(), listGridSets()]).then(([grids, sets]) => {
        setSavedGrids(grids);
        setExistingSets(sets);
        setLoadingGrids(false);
      });
    }
  }, [mode]);

  const easyGrids = savedGrids.filter(g => g.difficulty === 'easy');
  const mediumGrids = savedGrids.filter(g => g.difficulty === 'medium');
  const hardGrids = savedGrids.filter(g => g.difficulty === 'hard');

  const handleCreate = async () => {
    if (!playerName) return;
    setLoading(true);
    setError('');

    // Cleanup stale games first
    await cleanupStaleGames(playerName);
    sessionStorage.removeItem('gridrush_session');

    let gridSetId = selectedDefaultSet;

    if (gridSource === 'custom') {
      if (selectedSetId) {
        // Use an existing set
        gridSetId = selectedSetId;
      } else if (customEasyId && customMediumId && customHardId) {
        // Create a new set from selected grids
        const setName = customSetName.trim() || `Set ${new Date().toLocaleDateString('fr-FR')}`;
        const setId = await createGridSet(setName, customEasyId, customMediumId, customHardId, playerName);
        if (!setId) {
          setError("Erreur lors de la création du set de grilles");
          setLoading(false);
          return;
        }
        gridSetId = setId;
      } else {
        setError("Sélectionne une grille facile, moyenne et difficile");
        setLoading(false);
        return;
      }
    }

    const result = await createGame(
      playerName,
      gridSetId,
      '',
      timerMin * 60
    );

    if (result) {
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

              {/* Grid selection */}
              <div>
                <label className="block text-xs text-zinc-500 mb-2">
                  <Layers className="w-3 h-3 inline mr-1" />
                  Grilles
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => { setGridSource('default'); setSelectedSetId(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      gridSource === 'default'
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    Par défaut
                  </button>
                  <button
                    onClick={() => setGridSource('custom')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      gridSource === 'custom'
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    Personnalisées
                  </button>
                </div>

                {gridSource === 'default' && (
                  <div className="space-y-1 mb-3">
                    {DEFAULT_SETS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedDefaultSet(s.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                          selectedDefaultSet === s.id
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {selectedDefaultSet === s.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        <span className="font-bold">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {gridSource === 'custom' && (
                  <div className="space-y-3">
                    {loadingGrids && <p className="text-xs text-zinc-600">Chargement...</p>}

                    {/* Existing sets */}
                    {existingSets.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Sets existants</p>
                        <div className="space-y-1">
                          {existingSets.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setSelectedSetId(selectedSetId === s.id ? '' : s.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                                selectedSetId === s.id
                                  ? 'bg-primary/20 text-primary border border-primary/40'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                              }`}
                            >
                              {selectedSetId === s.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                              <span className="font-bold">{s.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Or compose a new set */}
                    {!selectedSetId && (
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500">{existingSets.length > 0 ? 'Ou compose un nouveau set :' : 'Compose un set :'}</p>

                        <input
                          type="text"
                          value={customSetName}
                          onChange={(e) => setCustomSetName(e.target.value)}
                          placeholder="Nom du set (optionnel)"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none"
                        />

                        <GridPicker label="Facile" grids={easyGrids} selectedId={customEasyId} onSelect={setCustomEasyId} color="emerald" />
                        <GridPicker label="Moyen" grids={mediumGrids} selectedId={customMediumId} onSelect={setCustomMediumId} color="amber" />
                        <GridPicker label="Difficile" grids={hardGrids} selectedId={customHardId} onSelect={setCustomHardId} color="red" />

                        {savedGrids.length === 0 && !loadingGrids && (
                          <p className="text-xs text-zinc-600">
                            Aucune grille sauvegardée.{' '}
                            <button onClick={() => navigate('/gridrush/editor')} className="text-primary hover:underline">
                              Crée-en une
                            </button>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={loading || !playerName}
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

// Small sub-component for picking a grid per difficulty
const GridPicker: React.FC<{
  label: string;
  grids: SavedGridSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
  color: 'emerald' | 'amber' | 'red';
}> = ({ label, grids, selectedId, onSelect, color }) => {
  const [open, setOpen] = useState(false);
  const selected = grids.find(g => g.id === selectedId);

  const colors = {
    emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
    red: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400' },
  }[color];

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
          selected ? `${colors.border} ${colors.bg} ${colors.text}` : 'border-zinc-700 bg-zinc-800 text-zinc-400'
        }`}
      >
        <span className="font-bold">{label}: {selected ? selected.name : '—'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
          {grids.length === 0 && (
            <p className="text-xs text-zinc-600 px-2 py-1">Aucune grille {label.toLowerCase()}</p>
          )}
          {grids.map(g => (
            <button
              key={g.id}
              onClick={() => { onSelect(g.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-all ${
                selectedId === g.id
                  ? `${colors.bg} ${colors.text} border ${colors.border}`
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {selectedId === g.id && <Check className="w-3 h-3 flex-shrink-0" />}
              <span className="font-bold">{g.name}</span>
              <span className="text-zinc-600 ml-auto">{g.wordCount} mots</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GridRush;
