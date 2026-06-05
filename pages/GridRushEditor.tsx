import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Save, CheckCircle, Trash2, Grid3X3 } from 'lucide-react';
import GridEditor from '../components/gridrush/editor/GridEditor';
import type { CrosswordGridData } from '../services/gridrush/gridrushTypes';
import { saveGrid, listSavedGrids, deleteGrid, type SavedGridSummary } from '../services/gridrush/gridrushService';

const diffLabel = (d: string) => d === 'easy' ? 'Facile' : d === 'medium' ? 'Moyen' : 'Difficile';
const diffClass = (d: string) =>
  d === 'easy' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : d === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-red-500/20 text-red-400 border-red-500/30';

const GridRushEditor: React.FC = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedGrids, setSavedGrids] = useState<SavedGridSummary[]>([]);
  const [loadingGrids, setLoadingGrids] = useState(true);

  // Load saved grids on mount
  useEffect(() => {
    listSavedGrids().then(grids => {
      setSavedGrids(grids);
      setLoadingGrids(false);
    });
  }, []);

  const handleSave = async (grid: CrosswordGridData) => {
    setSaving(true);
    const createdBy = 'editor';
    const gridId = await saveGrid(grid, createdBy);
    if (gridId) {
      setSavedGrids(prev => [{ id: gridId, name: grid.name, difficulty: grid.difficulty, wordCount: grid.words.length, createdBy, createdAt: new Date().toISOString() }, ...prev]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleDelete = async (gridId: string) => {
    const ok = await deleteGrid(gridId);
    if (ok) setSavedGrids(prev => prev.filter(g => g.id !== gridId));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="px-4 pt-6 pb-20">
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black">
              GRID<span className="text-red-400">RUSH</span>
              <span className="text-zinc-600 font-normal text-lg ml-2">/ Éditeur</span>
            </h1>
          </div>

          {/* Saved grids list */}
          {savedGrids.length > 0 && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Grilles sauvegardées ({savedGrids.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {savedGrids.map(g => (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 group">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${diffClass(g.difficulty)}`}>
                      {diffLabel(g.difficulty)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-white truncate block">{g.name}</span>
                      <span className="text-[10px] text-zinc-600">{g.wordCount} mots</span>
                    </div>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loadingGrids && (
            <p className="text-xs text-zinc-600 mb-4">Chargement des grilles...</p>
          )}
        </div>

        <GridEditor
          onSave={handleSave}
          onBack={() => navigate('/gridrush')}
        />

        {/* Save notification */}
        {saved && (
          <div className="fixed bottom-4 right-4 z-50 bg-emerald-900/90 border border-emerald-500/40 rounded-xl px-6 py-3 text-emerald-300 font-bold text-sm flex items-center gap-2 shadow-xl">
            <Save className="w-4 h-4" />
            Grille sauvegardée !
          </div>
        )}
      </div>
    </div>
  );
};

export default GridRushEditor;
