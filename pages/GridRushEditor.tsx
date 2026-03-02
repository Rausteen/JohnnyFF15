import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Save, CheckCircle } from 'lucide-react';
import GridEditor from '../components/gridrush/editor/GridEditor';
import type { CrosswordGridData } from '../services/gridrush/gridrushTypes';
import { saveGrid } from '../services/gridrush/gridrushService';

const GridRushEditor: React.FC = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedGrids, setSavedGrids] = useState<CrosswordGridData[]>([]);

  const handleSave = async (grid: CrosswordGridData) => {
    setSaving(true);
    const createdBy = 'editor'; // Could be a username

    const gridId = await saveGrid(grid, createdBy);

    if (gridId) {
      setSavedGrids(prev => [...prev, { ...grid, id: gridId }]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="px-4 pt-6 pb-20">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black">
              GRID<span className="text-red-400">RUSH</span>
              <span className="text-zinc-600 font-normal text-lg ml-2">/ Éditeur</span>
            </h1>
          </div>

          {/* Saved grids summary */}
          {savedGrids.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {savedGrids.map((g, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  {g.name} ({g.difficulty})
                </span>
              ))}
            </div>
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
