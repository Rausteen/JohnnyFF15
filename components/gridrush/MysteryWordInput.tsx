import React, { useState, useMemo } from 'react';
import type { CrosswordGridData, CellValues } from '../../services/gridrush/gridrushTypes';
import { getWordCells } from '../../services/gridrush/crosswordEngine';
import { Lock, Unlock, Sparkles, AlertTriangle } from 'lucide-react';

interface Props {
  grid: CrosswordGridData;
  wordsFoundCount: number;
  wordsFound: number[];
  cellValues: CellValues;
  mysteryInput: string;
  onInputChange: (v: string) => void;
  onSubmit: (input: string) => boolean;
}

/** Deterministic shuffle based on a seed string (so it doesn't re-shuffle on every render) */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  for (let i = copy.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MysteryWordInput: React.FC<Props> = ({ grid, wordsFoundCount, wordsFound, cellValues, mysteryInput, onInputChange, onSubmit }) => {
  const [error, setError] = useState(false);
  const show5 = wordsFoundCount >= 5;
  const show8 = wordsFoundCount >= 8;

  // Find which mystery cells have been revealed (their word is found)
  const revealedLetters = useMemo(() => {
    // Build set of all cells belonging to found words
    const foundCellKeys = new Set<string>();
    for (const wordId of wordsFound) {
      const word = grid.words.find(w => w.id === wordId);
      if (word) for (const c of getWordCells(word)) foundCellKeys.add(`${c.row},${c.col}`);
    }

    // Check each mystery cell — if it belongs to a found word, the letter is revealed
    const letters: string[] = [];
    for (const mc of grid.mysteryCells) {
      const key = `${mc.row},${mc.col}`;
      if (foundCellKeys.has(key)) {
        const val = cellValues[key];
        if (val) letters.push(val.toUpperCase());
      }
    }
    return letters;
  }, [wordsFound, grid.words, grid.mysteryCells, cellValues]);

  // Shuffle the revealed letters with a deterministic seed based on grid id
  // so the order is consistent per grid but not matching the real mystery word order
  const shuffledLetters = useMemo(() => {
    return seededShuffle(revealedLetters, grid.id + '-mystery');
  }, [revealedLetters, grid.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mysteryInput.trim()) return;
    if (!onSubmit(mysteryInput)) { setError(true); setTimeout(() => setError(false), 800); }
  };

  return (
    <div className="bg-zinc-900/80 border border-red-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-red-400" />
        <h3 className="font-bold text-red-300 text-sm uppercase tracking-wider">Mot Mystère</h3>
        <span className="text-xs text-zinc-500 ml-auto">{grid.mysteryWord.length} lettres</span>
      </div>
      <div className="space-y-2 mb-3">
        <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${show5 ? 'bg-amber-900/30 text-amber-300' : 'bg-zinc-800/50 text-zinc-600'}`}>
          {show5 ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          <span>{show5 ? `Indice : ${grid.mysteryHint5}` : `Indice à 5 mots (${wordsFoundCount}/5)`}</span>
        </div>
        <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${show8 ? 'bg-amber-900/30 text-amber-300' : 'bg-zinc-800/50 text-zinc-600'}`}>
          {show8 ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          <span>{show8 ? `Indice 2 : ${grid.mysteryHint8}` : `Indice 2 à 8 mots (${wordsFoundCount}/8)`}</span>
        </div>
      </div>

      {/* Mystery word boxes: show typed input */}
      <div className="flex flex-wrap gap-1 mb-3 justify-center">
        {Array.from({ length: grid.mysteryWord.length }).map((_, i) => (
          <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 border border-red-500/40 bg-red-950/30 rounded flex items-center justify-center text-sm font-bold text-red-300">
            {mysteryInput[i]?.toUpperCase() || ''}
          </div>
        ))}
      </div>

      {/* Revealed letters (shuffled) as clickable chips */}
      {shuffledLetters.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Lettres découvertes (mélangées)</p>
          <div className="flex flex-wrap gap-1 justify-center">
            {shuffledLetters.map((letter, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onInputChange(mysteryInput + letter)}
                className="w-7 h-7 sm:w-8 sm:h-8 border border-red-500/30 bg-red-900/40 rounded flex items-center justify-center text-sm font-bold text-red-300 hover:bg-red-800/50 hover:border-red-400/50 transition-colors cursor-pointer"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input type="text" value={mysteryInput} onChange={(e) => { setError(false); onInputChange(e.target.value); }}
          placeholder="Tape le Mot Mystère..." className={`flex-1 px-3 py-2 rounded-lg bg-zinc-800 border text-white text-sm placeholder-zinc-500 outline-none ${error ? 'border-red-500' : 'border-zinc-700 focus:border-red-500/50'}`}
          autoComplete="off" spellCheck={false} />
        <button type="submit" disabled={!mysteryInput.trim()} className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm disabled:opacity-50">Valider</button>
      </form>
      {error && <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400"><AlertTriangle className="w-3.5 h-3.5" />Mauvaise réponse !</div>}
    </div>
  );
};

export default MysteryWordInput;
