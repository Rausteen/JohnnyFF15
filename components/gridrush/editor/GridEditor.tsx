import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Grid3X3,
  Sparkles,
  ArrowLeft,
  Pencil,
  Check,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type {
  WordInput,
  CrosswordGridData,
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

  // New word form
  const [newAnswer, setNewAnswer] = useState('');
  const [newClue, setNewClue] = useState('');
  const [newVariants, setNewVariants] = useState('');

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAnswer, setEditAnswer] = useState('');
  const [editClue, setEditClue] = useState('');

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newAnswer.trim() && newClue.trim()) {
      e.preventDefault();
      addWord();
    }
  };

  const removeWord = (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (w: WordInput & { id: string }) => {
    setEditingId(w.id);
    setEditAnswer(w.answer);
    setEditClue(w.clue);
  };

  const confirmEdit = () => {
    if (!editingId || !editAnswer.trim() || !editClue.trim()) return;
    setWords(prev => prev.map(w =>
      w.id === editingId ? { ...w, answer: editAnswer.trim(), clue: editClue.trim() } : w
    ));
    setEditingId(null);
  };

  const moveWord = (id: string, dir: 'up' | 'down') => {
    setWords(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx < 0) return prev;
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
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

  // Mystery word coverage check
  const mysteryLettersCovered = useMemo(() => {
    if (!mysteryWord || !preview) return 0;
    return preview.mysteryCells.length;
  }, [mysteryWord, preview]);

  const mysteryTotalLetters = mysteryWord ? normalize(mysteryWord).length : 0;

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

  // Validation messages
  const validationIssues: string[] = [];
  if (!gridName.trim()) validationIssues.push('Nom de la grille manquant');
  if (words.length < 5) validationIssues.push(`${5 - words.length} mot(s) manquant(s) (min. 5)`);
  if (!mysteryWord.trim()) validationIssues.push('Mot mystère manquant');
  if (!mysteryClue.trim()) validationIssues.push('Indice du mot mystère manquant');
  if (preview && words.length > preview.words.length) validationIssues.push(`${words.length - preview.words.length} mot(s) non placé(s) dans la grille`);
  if (mysteryTotalLetters > 0 && mysteryLettersCovered < mysteryTotalLetters) validationIssues.push(`Mot mystère: ${mysteryLettersCovered}/${mysteryTotalLetters} lettres couvertes`);

  // Pre-compute cell set for preview rendering
  const cellSet = useMemo(() => preview ? buildGridCellSet(preview.words) : new Set<string>(), [preview]);

  return (
    <div className="max-w-5xl mx-auto">
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
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
            <div className="flex gap-2">
              <input
                type="text"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Réponse"
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-primary/50"
              />
              <input
                type="text"
                value={newClue}
                onChange={(e) => setNewClue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Définition / indice"
                className="flex-[2] px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-primary/50"
              />
            </div>
            <input
              type="text"
              value={newVariants}
              onChange={(e) => setNewVariants(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Variantes acceptées (séparées par des virgules, optionnel)"
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
                {words.map((w, idx) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 group"
                  >
                    {editingId === w.id ? (
                      <>
                        <input
                          type="text"
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          className="w-24 px-2 py-1 rounded bg-zinc-700 border border-zinc-600 text-white text-xs font-mono outline-none"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editClue}
                          onChange={(e) => setEditClue(e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-zinc-700 border border-zinc-600 text-white text-xs outline-none"
                        />
                        <button
                          onClick={confirmEdit}
                          className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveWord(w.id, 'up')} disabled={idx === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20">
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => moveWord(w.id, 'down')} disabled={idx === words.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20">
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono font-bold text-xs text-primary min-w-[60px]">
                          {normalize(w.answer)}
                        </span>
                        <span className="text-xs text-zinc-500 flex-1 truncate">
                          {w.clue}
                        </span>
                        <button
                          onClick={() => startEdit(w)}
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeWord(w.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
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
            {mysteryTotalLetters > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${mysteryLettersCovered >= mysteryTotalLetters ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={mysteryLettersCovered >= mysteryTotalLetters ? 'text-emerald-400' : 'text-amber-400'}>
                  {mysteryLettersCovered}/{mysteryTotalLetters} lettres couvertes par la grille
                </span>
              </div>
            )}
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
              placeholder="Indice à 5 mots trouvés (optionnel)"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none"
            />
            <input
              type="text"
              value={mysteryHint8}
              onChange={(e) => setMysteryHint8(e.target.value)}
              placeholder="Indice à 8 mots trouvés (optionnel)"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none"
            />
          </div>
        </div>

        {/* Right: Preview (always visible) + Save */}
        <div className="space-y-4">
          {/* Validation */}
          {validationIssues.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1">
              {validationIssues.map((issue, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-white font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Sauvegarder la grille
          </button>

          {/* Preview */}
          {preview ? (
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
                      const k = `${row},${col}`;
                      const isCell = cellSet.has(k);
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
                          key={k}
                          className={`w-7 h-7 border text-[9px] font-bold flex items-center justify-center relative ${
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
              <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
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
                    {words.length - preview.words.length} mot(s) non placé(s)
                  </p>
                )}
              </div>
            </div>
          ) : words.length >= 2 ? (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-center text-sm text-zinc-500">
              Erreur lors de la génération de la grille
            </div>
          ) : (
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
