import React, { useEffect, useRef } from 'react';
import type { PlacedWord, WordDirection } from '../../services/gridrush/gridrushTypes';
import { Check, ArrowRight, ArrowDown } from 'lucide-react';

interface Props {
  words: PlacedWord[]; wordsFound: number[];
  selectedWordId: number | null; selectedDirection: WordDirection;
  onSelectWord: (wordId: number, direction: WordDirection) => void;
}

const ClueList: React.FC<Props> = ({ words, wordsFound, selectedWordId, selectedDirection, onSelectWord }) => {
  const across = words.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number);
  const down = words.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current) selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedWordId]);

  const renderClue = (word: PlacedWord) => {
    const found = wordsFound.includes(word.id);
    const selected = selectedWordId === word.id;
    return (
      <button
        key={word.id}
        ref={selected ? selectedRef : undefined}
        onClick={() => onSelectWord(word.id, word.direction)}
        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-start gap-2 ${
          found ? 'bg-emerald-900/20 text-emerald-400/80'
            : selected ? 'bg-sky-500/15 text-white border border-sky-500/30'
            : 'hover:bg-zinc-800/70 text-zinc-400 border border-transparent'
        }`}
      >
        <span className={`font-mono font-bold text-xs mt-0.5 min-w-[24px] ${found ? 'text-emerald-500/60' : selected ? 'text-sky-400' : 'text-zinc-600'}`}>{word.number}.</span>
        <span className={`text-sm flex-1 ${found ? 'line-through opacity-60' : ''}`}>{word.clue}</span>
        {found && <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
      </button>
    );
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-y-auto max-h-[55vh] p-3 space-y-4">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 px-3 flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3" /> Horizontal
          </h3>
          <div className="space-y-0.5">{across.map(renderClue)}</div>
        </div>
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 px-3 flex items-center gap-1.5">
            <ArrowDown className="w-3 h-3" /> Vertical
          </h3>
          <div className="space-y-0.5">{down.map(renderClue)}</div>
        </div>
      </div>
    </div>
  );
};

export default ClueList;
