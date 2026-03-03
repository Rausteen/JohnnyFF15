import React, { useRef, useLayoutEffect } from 'react';

interface Props {
  row: number; col: number; letter: string;
  isActive: boolean; isHighlighted: boolean; isFound: boolean;
  isMystery: boolean; number: number | null; isBlack: boolean;
  mysteryIndex: number | null;
  onClick: (r: number, c: number) => void;
  onInput: (r: number, c: number, v: string) => void;
  onKeyDown: (r: number, c: number, k: string) => void;
}

const CELL = 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12';

const CrosswordCell: React.FC<Props> = ({ row, col, letter, isActive, isHighlighted, isFound, isMystery, number, isBlack, mysteryIndex, onClick, onInput, onKeyDown }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (isActive && inputRef.current) inputRef.current.focus();
  }, [isActive]);

  if (isBlack) return <div className={CELL} />;

  let border = 'border-zinc-600/70';
  let bg = 'bg-zinc-800/90';
  let text = 'text-white';

  if (isFound) { bg = 'bg-emerald-900/50'; border = 'border-emerald-500/60'; text = 'text-emerald-200'; }
  else if (isActive) { bg = 'bg-yellow-500/25'; border = 'border-yellow-400'; }
  else if (isHighlighted) { bg = 'bg-sky-500/15'; border = 'border-sky-500/50'; }
  else if (isMystery) { bg = 'bg-red-900/30'; border = 'border-red-500/40'; }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(e.key)) {
      e.preventDefault();
      onKeyDown(row, col, e.key);
      return;
    }
    if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
      e.preventDefault();
      onInput(row, col, e.key.toUpperCase());
    }
  };

  return (
    <div className={`relative ${CELL} border-[1.5px] ${border} ${bg} cursor-pointer transition-colors duration-75 rounded-[3px]`} onClick={() => onClick(row, col)}>
      {number !== null && <span className="absolute top-[1px] left-[3px] text-[8px] sm:text-[9px] font-bold text-zinc-400 leading-none select-none pointer-events-none z-10">{number}</span>}
      {/* Mystery cells show a small red diamond indicator instead of an index number */}
      {isMystery && <span className="absolute bottom-[1px] right-[3px] text-[7px] text-red-400/60 leading-none select-none pointer-events-none z-10">&#9670;</span>}
      {isActive && <div className="absolute inset-[-1px] rounded-[3px] ring-2 ring-yellow-400 ring-offset-1 ring-offset-zinc-950 pointer-events-none z-20" />}
      <input
        ref={inputRef}
        type="text"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
        onKeyDown={handleKeyDown}
        onFocus={() => { if (!isActive) onClick(row, col); }}
        readOnly={isFound}
        tabIndex={isActive ? 0 : -1}
        autoComplete="off"
        spellCheck={false}
      />
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-base sm:text-lg md:text-xl select-none pointer-events-none ${text}`}>
        {letter}
      </div>
    </div>
  );
};

export default React.memo(CrosswordCell);
