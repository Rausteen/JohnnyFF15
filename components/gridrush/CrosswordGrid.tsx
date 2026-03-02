import React, { useRef, useCallback, useMemo } from 'react';
import CrosswordCell from './CrosswordCell';
import type {
  PlacedWord,
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
  const inputRef = useRef<HTMLInputElement>(null);

  const gridCellSet = useMemo(() => buildGridCellSet(grid.words), [grid.words]);
  const cellWordMap = useMemo(() => buildCellWordMap(grid.words), [grid.words]);

  const mysteryCellMap = useMemo(() => {
    const map = new Map<string, MysteryCell>();
    for (const mc of grid.mysteryCells) {
      map.set(`${mc.row},${mc.col}`, mc);
    }
    return map;
  }, [grid.mysteryCells]);

  // Get currently highlighted cells (cells of the selected word)
  const highlightedCells = useMemo(() => {
    if (selectedWordId === null) return new Set<string>();
    const word = grid.words.find(w => w.id === selectedWordId);
    if (!word) return new Set<string>();
    const cells = getWordCells(word);
    return new Set(cells.map(c => `${c.row},${c.col}`));
  }, [selectedWordId, grid.words]);

  // Get found word cells
  const foundCells = useMemo(() => {
    const set = new Set<string>();
    for (const wordId of wordsFound) {
      const word = grid.words.find(w => w.id === wordId);
      if (word) {
        const cells = getWordCells(word);
        for (const c of cells) set.add(`${c.row},${c.col}`);
      }
    }
    return set;
  }, [wordsFound, grid.words]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const key = `${row},${col}`;
      if (!gridCellSet.has(key)) return;

      // If clicking the same cell, toggle direction
      if (selectedCell?.row === row && selectedCell?.col === col) {
        const newDir = selectedDirection === 'across' ? 'down' : 'across';
        onDirectionChange(newDir);

        // Find word in the new direction at this cell
        const wordIds = cellWordMap.get(key) || [];
        const wordInNewDir = wordIds
          .map(id => grid.words.find(w => w.id === id))
          .find(w => w?.direction === newDir);
        if (wordInNewDir) {
          onWordSelect(wordInNewDir.id);
        }
      } else {
        onCellSelect(row, col);

        // Find word at this cell in the current direction (or fallback)
        const wordIds = cellWordMap.get(key) || [];
        const wordInDir = wordIds
          .map(id => grid.words.find(w => w.id === id))
          .find(w => w?.direction === selectedDirection);
        const fallback = wordIds
          .map(id => grid.words.find(w => w.id === id))
          .find(Boolean);

        const selectedWord = wordInDir || fallback;
        if (selectedWord) {
          onWordSelect(selectedWord.id);
          if (!wordInDir && fallback) {
            onDirectionChange(fallback.direction);
          }
        }
      }

      // Focus input
      setTimeout(() => inputRef.current?.focus(), 10);
    },
    [selectedCell, selectedDirection, cellWordMap, grid.words, onCellSelect, onWordSelect, onDirectionChange, gridCellSet]
  );

  const moveToNextCell = useCallback(
    (row: number, col: number, direction: WordDirection, reverse = false) => {
      const dr = direction === 'down' ? (reverse ? -1 : 1) : 0;
      const dc = direction === 'across' ? (reverse ? -1 : 1) : 0;
      const nextRow = row + dr;
      const nextCol = col + dc;
      const nextKey = `${nextRow},${nextCol}`;

      if (gridCellSet.has(nextKey)) {
        onCellSelect(nextRow, nextCol);
      }
    },
    [gridCellSet, onCellSelect]
  );

  const handleCellInput = useCallback(
    (row: number, col: number, value: string) => {
      onCellInput(row, col, value);

      if (value) {
        // Move to next cell
        moveToNextCell(row, col, selectedDirection);
      }

      // Debounced word check
      setTimeout(() => onCheckWords(), 100);
    },
    [onCellInput, moveToNextCell, selectedDirection, onCheckWords]
  );

  const handleKeyDown = useCallback(
    (row: number, col: number, key: string) => {
      switch (key) {
        case 'ArrowRight':
          if (selectedDirection !== 'across') {
            onDirectionChange('across');
          } else {
            moveToNextCell(row, col, 'across');
          }
          break;
        case 'ArrowLeft':
          if (selectedDirection !== 'across') {
            onDirectionChange('across');
          } else {
            moveToNextCell(row, col, 'across', true);
          }
          break;
        case 'ArrowDown':
          if (selectedDirection !== 'down') {
            onDirectionChange('down');
          } else {
            moveToNextCell(row, col, 'down');
          }
          break;
        case 'ArrowUp':
          if (selectedDirection !== 'down') {
            onDirectionChange('down');
          } else {
            moveToNextCell(row, col, 'down', true);
          }
          break;
        case 'Backspace':
          if (!cellValues[`${row},${col}`]) {
            moveToNextCell(row, col, selectedDirection, true);
          }
          onCellInput(row, col, '');
          setTimeout(() => onCheckWords(), 100);
          break;
        case 'Tab':
          // Move to next word (handled by browser default - could be enhanced)
          break;
      }
    },
    [selectedDirection, onDirectionChange, moveToNextCell, cellValues, onCellInput, onCheckWords]
  );

  return (
    <div className="inline-block select-none">
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: grid.rows }).map((_, row) =>
          Array.from({ length: grid.cols }).map((_, col) => {
            const key = `${row},${col}`;
            const isGridCell = gridCellSet.has(key);
            const cellNumber = getCellNumber(row, col, grid.words);
            const mysteryCell = mysteryCellMap.get(key);
            const letter = cellValues[key] || '';

            return (
              <CrosswordCell
                key={key}
                row={row}
                col={col}
                letter={letter}
                isActive={selectedCell?.row === row && selectedCell?.col === col}
                isHighlighted={highlightedCells.has(key)}
                isFound={foundCells.has(key)}
                isMystery={mysteryCellMap.has(key)}
                number={cellNumber}
                isBlack={!isGridCell}
                mysteryIndex={mysteryCell?.mysteryIndex ?? null}
                onClick={handleCellClick}
                onInput={handleCellInput}
                onKeyDown={handleKeyDown}
                inputRef={inputRef}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default CrosswordGrid;
