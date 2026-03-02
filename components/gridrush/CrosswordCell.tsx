import React from 'react';

interface Props {
  row: number; col: number; letter: string;
  isActive: boolean; isHighlighted: boolean; isFound: boolean;
  isMystery: boolean; number: number | null; isBlack: boolean;
  mysteryIndex: number | null;
  onClick: (r: number, c: number) => void;
  onInput: (r: number, c: number, v: string) => void;
  onKeyDown: (r: number, c: number, k: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const CrosswordCell: React.FC<Props> = ({ row, col, letter, isActive, isHighlighted, isFound, isMystery, number, isBlack, mysteryIndex, onClick, onInput, onKeyDown, inputRef }) => {
  if (isBlack) return <div className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-950" />;

  let bg = 'bg-zinc-800 border-zinc-600';
  if (isFound) bg = 'bg-emerald-900/60 border-emerald-500/50';
  else if (isMystery) bg = 'bg-red-900/40 border-red-500/50';
  if (isActive) bg += ' ring-2 ring-yellow-400 ring-offset-1 ring-offset-zinc-950';
  else if (isHighlighted) bg += ' brightness-125';

  return (
    <div className={`relative w-8 h-8 sm:w-10 sm:h-10 border ${bg} cursor-pointer transition-all duration-100`} onClick={() => onClick(row, col)}>
      {number !== null && <span className="absolute top-0 left-0.5 text-[8px] sm:text-[9px] font-bold text-zinc-400 leading-none select-none">{number}</span>}
      {isMystery && mysteryIndex !== null && <span className="absolute bottom-0 right-0.5 text-[7px] sm:text-[8px] font-bold text-red-400 leading-none select-none">{mysteryIndex + 1}</span>}
      <input
        ref={isActive ? inputRef : undefined}
        type="text" maxLength={1} value={letter} readOnly={isFound}
        className={`absolute inset-0 w-full h-full text-center font-bold text-sm sm:text-lg uppercase bg-transparent border-none outline-none cursor-pointer select-none ${isFound ? 'text-emerald-300' : isMystery ? 'text-red-200' : 'text-white'}`}
        onChange={(e) => { const v = e.target.value.slice(-1); if (/^[a-zA-ZÀ-ÿ]$/.test(v) || v === '') onInput(row, col, v.toUpperCase()); }}
        onKeyDown={(e) => onKeyDown(row, col, e.key)}
        tabIndex={-1} autoComplete="off" spellCheck={false}
      />
    </div>
  );
};

export default React.memo(CrosswordCell);
