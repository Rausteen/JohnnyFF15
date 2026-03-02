import React, { useCallback, useMemo } from 'react';
import CrosswordCell from './CrosswordCell';
import type {
  CrosswordGridData,
  WordDirection,
  CellValues,
  MysteryCell,
} from '../../services/gridrush/gridrushTypes';
import {
  buildGridCellSet,
  buildCellWordMap,
  getCellNumber,
  getWordCells,
} from '../../services/gridrush/crosswordEngine';

interface CrosswordGridProps {
  grid: CrosswordGridData;
  cellValues: CellValues;
  wordsFound: number[];
  selectedCell: { row: number; col: number } | null;
  selectedDirection: WordDirection;
  selectedWordId: number | null;
  onCellInput: (row: number, col: number, value: string) => void;
  onCellSelect: (row: number, col: number, direction?: WordDirection) => void;
  onWordSelect: (wordId: number | null) => void;
  onDirectionChange: (dir: WordDirection) => void;
  onCheckWords: () => void;
}

const CrosswordGrid: React.FC<CrosswordGridProps> = ({
  grid,
  cellValues,
  wordsFound,
  selectedCell,
  selectedDirection,
  selectedWordId,
  onCellInput,
  onCellSelect,
  onWordSelect,
  onDirectionChange,
  onCheckWords,
}) => {
  const gridCellSet = useMemo(() => buildGridCellSet(grid.words), [grid.words]);
  const cellWordMap = useMemo(() => buildCellWordMap(grid.words), [grid.words]);

  const mysteryCellMap = useMemo(() => {
    const map = new Map<string, MysteryCell>();
    for (const mc of grid.mysteryCells) map.set(`${mc.row},${mc.col}`, mc);
    return map;
  }, [grid.mysteryCells]);

  const highlightedCells = useMemo(() => {
    if (selectedWordId === null) return new Set<string>();
    const word = grid.words.find(w => w.id === selectedWordId);
    if (!word) return new Set<string>();
    return new Set(getWordCells(word).map(c => `${c.row},${c.col}`));
  }, [selectedWordId, grid.words]);

  const foundCells = useMemo(() => {
    const set = new Set<string>();
    for (const wordId of wordsFound) {
      const word = grid.words.find(w => w.id === wordId);
      if (word) for (const c of getWordCells(word)) set.add(`${c.row},${c.col}`);
    }
    return set;
  }, [wordsFound, grid.words]);

  const handleCellClick = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    if (!gridCellSet.has(key)) return;

    if (selectedCell?.row === row && selectedCell?.col === col) {
      const newDir = selectedDirection === 'across' ? 'down' : 'across';
      onDirectionChange(newDir);
      const wordIds = cellWordMap.get(key) || [];
      const wordInNewDir = wordIds.map(id => grid.words.find(w => w.id === id)).find(w => w?.direction === newDir);
      if (wordInNewDir) onWordSelect(wordInNewDir.id);
    } else {
      onCellSelect(row, col);
      const wordIds = cellWordMap.get(key) || [];
      const wordInDir = wordIds.map(id => grid.words.find(w => w.id === id)).find(w => w?.direction === selectedDirection);
      const fallback = wordIds.map(id => grid.words.find(w => w.id === id)).find(Boolean);
      const selected = wordInDir || fallback;
      if (selected) {
        onWordSelect(selected.id);
        if (!wordInDir && fallback) onDirectionChange(fallback.direction);
      }
    }
  }, [selectedCell, selectedDirection, cellWordMap, grid.words, onCellSelect, onWordSelect, onDirectionChange, gridCellSet]);

  const moveToNextCell = useCallback((row: number, col: number, direction: WordDirection, reverse = false) => {
    const dr = direction === 'down' ? (reverse ? -1 : 1) : 0;
    const dc = direction === 'across' ? (reverse ? -1 : 1) : 0;
    const nr = row + dr;
    const nc = col + dc;
    if (gridCellSet.has(`${nr},${nc}`)) onCellSelect(nr, nc);
  }, [gridCellSet, onCellSelect]);

  const handleCellInput = useCallback((row: number, col: number, value: string) => {
    onCellInput(row, col, value);
    if (value) moveToNextCell(row, col, selectedDirection);
    setTimeout(() => onCheckWords(), 50);
  }, [onCellInput, moveToNextCell, selectedDirection, onCheckWords]);

  const handleKeyDown = useCallback((row: number, col: number, key: string) => {
    switch (key) {
      case 'ArrowRight':
        selectedDirection !== 'across' ? onDirectionChange('across') : moveToNextCell(row, col, 'across');
        break;
      case 'ArrowLeft':
        selectedDirection !== 'across' ? onDirectionChange('across') : moveToNextCell(row, col, 'across', true);
        break;
      case 'ArrowDown':
        selectedDirection !== 'down' ? onDirectionChange('down') : moveToNextCell(row, col, 'down');
        break;
      case 'ArrowUp':
        selectedDirection !== 'down' ? onDirectionChange('down') : moveToNextCell(row, col, 'down', true);
        break;
      case 'Backspace':
        if (!cellValues[`${row},${col}`]) moveToNextCell(row, col, selectedDirection, true);
        onCellInput(row, col, '');
        setTimeout(() => onCheckWords(), 50);
        break;
      case 'Tab': {
        const sorted = [...grid.words].sort((a, b) => a.number - b.number);
        const curIdx = sorted.findIndex(w => w.id === selectedWordId);
        for (let i = 1; i <= sorted.length; i++) {
          const w = sorted[(curIdx + i) % sorted.length];
          if (!wordsFound.includes(w.id)) {
            onWordSelect(w.id);
            onDirectionChange(w.direction);
            onCellSelect(w.row, w.col, w.direction);
            break;
          }
        }
        break;
      }
    }
  }, [selectedDirection, selectedWordId, onDirectionChange, moveToNextCell, cellValues, onCellInput, onCheckWords, grid.words, wordsFound, onWordSelect, onCellSelect]);

  return (
    <div className="inline-block select-none bg-zinc-950 p-1 rounded-lg shadow-xl shadow-black/30">
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: grid.rows }).map((_, row) =>
          Array.from({ length: grid.cols }).map((_, col) => {
            const key = `${row},${col}`;
            const mysteryCell = mysteryCellMap.get(key);
            return (
              <CrosswordCell
                key={key}
                row={row}
                col={col}
                letter={cellValues[key] || ''}
                isActive={selectedCell?.row === row && selectedCell?.col === col}
                isHighlighted={highlightedCells.has(key)}
                isFound={foundCells.has(key)}
                isMystery={mysteryCellMap.has(key)}
                number={getCellNumber(row, col, grid.words)}
                isBlack={!gridCellSet.has(key)}
                mysteryIndex={mysteryCell?.mysteryIndex ?? null}
                onClick={handleCellClick}
                onInput={handleCellInput}
                onKeyDown={handleKeyDown}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default CrosswordGrid;
