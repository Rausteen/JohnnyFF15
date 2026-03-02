import React from 'react';
import type { PlacedWord, WordDirection } from '../../services/gridrush/gridrushTypes';
import { Check } from 'lucide-react';

interface Props {
  words: PlacedWord[]; wordsFound: number[];
  selectedWordId: number | null; selectedDirection: WordDirection;
  onSelectWord: (wordId: number, direction: WordDirection) => void;
}

const ClueList: React.FC<Props> = ({ words, wordsFound, selectedWordId, selectedDirection, onSelectWord }) => {
  const across = words.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number);
  const down = words.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number);

  const renderClue = (word: PlacedWord) => {
    const found = wordsFound.includes(word.id);
    const selected = selectedWordId === word.id;
    return (
      <button key={word.id} onClick={() => onSelectWord(word.id, word.direction)}
        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-start gap-2 ${found ? 'bg-emerald-900/30 text-emerald-300' : selected ? 'bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500/40' : 'hover:bg-zinc-800 text-zinc-300'}`}>
        <span className="font-mono font-bold text-xs mt-0.5 min-w-[24px] text-zinc-500">{word.number}.</span>
        <span className={`text-sm flex-1 ${found ? 'line-through opacity-70' : ''}`}>{word.clue}</span>
        {found && <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
      </button>
    );
  };

  return (
    <div className="space-y-4 overflow-y-auto max-h-[60vh]">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 px-3">Horizontal</h3>
        <div className="space-y-1">{across.map(renderClue)}</div>
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 px-3">Vertical</h3>
        <div className="space-y-1">{down.map(renderClue)}</div>
      </div>
    </div>
  );
};

export default ClueList;
