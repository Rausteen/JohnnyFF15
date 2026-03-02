import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  Save,
  Grid3X3,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import type {
  WordInput,
  CrosswordGridData,
  MysteryCell,
} from '../../../services/gridrush/gridrushTypes';
import {
  generateCrosswordLayout,
  assignMysteryCells,
  normalize,
  getWordCells,
  buildGridCellSet,
  getCellNumber,
} from '../../../services/gridrush/crosswordEngine';

interface GridEditorProps {
  onSave: (grid: CrosswordGridData) => void;
  onBack: () => void;
  initialDifficulty?: 'easy' | 'medium' | 'hard';
}

const GridEditor: React.FC<GridEditorProps> = ({ onSave, onBack, initialDifficulty = 'easy' }) => {
  const [gridName, setGridName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialDifficulty);
  const [words, setWords] = useState<Array<WordInput & { id: string }>>([]);
  const [mysteryWord, setMysteryWord] = useState('');
  const [mysteryClue, setMysteryClue] = useState('');
  const [mysteryHint5, setMysteryHint5] = useState('');
  const [mysteryHint8, setMysteryHint8] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // New word form
  const [newAnswer, setNewAnswer] = useState('');
  const [newClue, setNewClue] = useState('');
  const [newVariants, setNewVariants] = useState('');

  const addWord = () => {
    if (!newAnswer.trim() || !newClue.trim()) return;
    const variants = newVariants
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

    setWords(prev => [
      ...prev,
      {
        id: crypto.randomUUID?.() || Date.now().toString(),
        answer: newAnswer.trim(),
        clue: newClue.trim(),
        acceptedAnswers: variants.length > 0 ? variants : undefined,
      },
    ]);
    setNewAnswer('');
    setNewClue('');
    setNewVariants('');
  };

  const removeWord = (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  };

  // Generate preview
  const preview = useMemo(() => {
    if (words.length < 2) return null;
    try {
      const layout = generateCrosswordLayout(words);
      const mysteryCells = mysteryWord
        ? assignMysteryCells(layout.words, mysteryWord)
        : [];
      return { ...layout, mysteryCells };
    } catch {
      return null;
    }
  }, [words, mysteryWord]);

  const handleSave = useCallback(() => {
    if (!gridName.trim() || words.length < 5 || !mysteryWord.trim() || !mysteryClue.trim()) return;
    if (!preview) return;

    const gridData: CrosswordGridData = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      name: gridName.trim(),
      difficulty,
      rows: preview.rows,
      cols: preview.cols,
      words: preview.words,
      mysteryCells: preview.mysteryCells,
      mysteryWord: normalize(mysteryWord),
      mysteryClue: mysteryClue.trim(),
      mysteryHint5: mysteryHint5.trim() || mysteryClue.trim(),
      mysteryHint8: mysteryHint8.trim() || mysteryClue.trim(),
    };

    onSave(gridData);
  }, [gridName, words, mysteryWord, mysteryClue, mysteryHint5, mysteryHint8, difficulty, preview, onSave]);

  const canSave = gridName.trim() && words.length >= 5 && mysteryWord.trim() && mysteryClue.trim() && preview;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <Grid3X3 className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-black text-white">Éditeur de Grille</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Grid info */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
            <input
              type="text"
              value={gridName}
              onChange={(e) => setGridName(e.target.value)}
              placeholder="Nom de la grille"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-primary/50"
            />
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                    difficulty === d
                      ? d === 'easy'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : d === 'medium'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}
                >
                  {d === 'easy' ? 'Facile' : d === 'medium' ? 'Moyen' : 'Difficile'}
                </button>
              ))}
            </div>
          </div>

          {/* Add word */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
              Ajouter un mot ({words.length}/10)
            </h3>
            <input
              type="text"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Réponse (ex: Arceus)"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-primary/50"
            />
            <input
              type="text"
              value={newClue}
              onChange={(e) => setNewClue(e.target.value)}
              placeholder="Définition / indice"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-primary/50"
            />
            <input
              type="text"
              value={newVariants}
              onChange={(e) => setNewVariants(e.target.value)}
              placeholder="Variantes acceptées (séparées par des virgules)"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-primary/50"
            />
            <button
              onClick={addWord}
              disabled={!newAnswer.trim() || !newClue.trim() || words.length >= 10}
              className="w-full py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-bold text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          {/* Word list */}
          {words.length > 0 && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Mots ajoutés
              </h3>
              <div className="space-y-2">
                {words.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50"
                  >
                    <span className="font-mono font-bold text-xs text-primary">
                      {normalize(w.answer)}
                    </span>
                    <span className="text-xs text-zinc-500 flex-1 truncate">
                      {w.clue}
                    </span>
                    <button
                      onClick={() => removeWord(w.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mystery word */}
          <div className="bg-zinc-900/80 border border-red-500/20 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Mot Mystère
            </h3>
            <input
              type="text"
              value={mysteryWord}
              onChange={(e) => setMysteryWord(e.target.value)}
              placeholder="Le mot mystère à deviner"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-red-500/30 text-white text-sm placeholder-zinc-500 outline-none focus:border-red-500/50"
            />
            <input
              type="text"
              value={mysteryClue}
              onChange={(e) => setMysteryClue(e.target.value)}
              placeholder="Enigme / indice principal"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none"
            />
            <input
              type="text"
              value={mysteryHint5}
              onChange={(e) => setMysteryHint5(e.target.value)}
              placeholder="Indice à 5 mots trouvés"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none"
            />
            <input
              type="text"
              value={mysteryHint8}
              onChange={(e) => setMysteryHint8(e.target.value)}
              placeholder="Indice à 8 mots trouvés"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none"
            />
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Masquer' : 'Aperçu'}
            </button>

            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-white font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          </div>

          {showPreview && preview && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">
                Grille {preview.rows}x{preview.cols} — {preview.words.length} mots placés sur {words.length}
              </p>

              {/* Mini grid preview */}
              <div className="overflow-auto">
                <div
                  className="inline-grid gap-0"
                  style={{
                    gridTemplateColumns: `repeat(${preview.cols}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: preview.rows }).map((_, row) =>
                    Array.from({ length: preview.cols }).map((_, col) => {
                      const key = `${row},${col}`;
                      const cellSet = buildGridCellSet(preview.words);
                      const isCell = cellSet.has(key);
                      const isMystery = preview.mysteryCells.some(
                        mc => mc.row === row && mc.col === col
                      );
                      const number = getCellNumber(row, col, preview.words);

                      // Find the letter
                      let letter = '';
                      for (const w of preview.words) {
                        const cells = getWordCells(w);
                        for (let i = 0; i < cells.length; i++) {
                          if (cells[i].row === row && cells[i].col === col) {
                            letter = w.answer[i];
                          }
                        }
                      }

                      return (
                        <div
                          key={key}
                          className={`w-6 h-6 border text-[8px] font-bold flex items-center justify-center relative ${
                            !isCell
                              ? 'bg-zinc-950 border-zinc-950'
                              : isMystery
                              ? 'bg-red-900/40 border-red-500/30 text-red-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {number && (
                            <span className="absolute top-0 left-0.5 text-[5px] text-zinc-500">
                              {number}
                            </span>
                          )}
                          {letter}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Word placement info */}
              <div className="mt-3 space-y-1">
                {preview.words.map(w => (
                  <div key={w.id} className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono font-bold text-zinc-500">{w.number}.</span>
                    <span className="text-zinc-400">{w.answer}</span>
                    <span className="text-zinc-600">
                      ({w.direction === 'across' ? '→' : '↓'})
                    </span>
                  </div>
                ))}
                {words.length > preview.words.length && (
                  <p className="text-[10px] text-amber-400 mt-2">
                    {words.length - preview.words.length} mot(s) non placé(s) dans la grille
                  </p>
                )}
              </div>
            </div>
          )}

          {showPreview && !preview && words.length >= 2 && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-center text-sm text-zinc-500">
              Erreur lors de la génération de la grille
            </div>
          )}

          {showPreview && words.length < 2 && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-center text-sm text-zinc-500">
              Ajoute au moins 2 mots pour voir l'aperçu
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GridEditor;
