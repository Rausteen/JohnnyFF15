import type { PlacedWord, WordDirection, MysteryCell, WordInput } from './gridrushTypes';

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalize(str: string): string {
  return removeDiacritics(str).replace(/\s+/g, '').toUpperCase();
}

export function matchesAnswer(input: string, acceptedAnswers: string[]): boolean {
  const n = normalize(input);
  return acceptedAnswers.some(a => normalize(a) === n);
}

interface GridCell { letter: string; wordIds: number[]; }
type SparseGrid = Map<string, GridCell>;

function key(r: number, c: number) { return `${r},${c}`; }
function getCell(g: SparseGrid, r: number, c: number) { return g.get(key(r, c)); }
function setCell(g: SparseGrid, r: number, c: number, letter: string, wid: number) {
  const ex = g.get(key(r, c));
  if (ex) { ex.wordIds.push(wid); } else { g.set(key(r, c), { letter, wordIds: [wid] }); }
}

function canPlace(grid: SparseGrid, word: string, sr: number, sc: number, dir: WordDirection, placed: PlacedWord[]): { valid: boolean; intersections: number } {
  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'across' ? sr : sr + i;
    const c = dir === 'across' ? sc + i : sc;
    const cell = getCell(grid, r, c);
    if (cell) {
      if (cell.letter !== word[i]) return { valid: false, intersections: 0 };
      if (!cell.wordIds.every(wid => { const pw = placed.find(w => w.id === wid); return pw && pw.direction !== dir; }))
        return { valid: false, intersections: 0 };
      intersections++;
    } else {
      if (dir === 'across') { if (getCell(grid, r - 1, c) || getCell(grid, r + 1, c)) return { valid: false, intersections: 0 }; }
      else { if (getCell(grid, r, c - 1) || getCell(grid, r, c + 1)) return { valid: false, intersections: 0 }; }
    }
  }
  if (dir === 'across') {
    if (getCell(grid, sr, sc - 1) || getCell(grid, sr, sc + word.length)) return { valid: false, intersections: 0 };
  } else {
    if (getCell(grid, sr - 1, sc) || getCell(grid, sr + word.length, sc)) return { valid: false, intersections: 0 };
  }
  if (placed.length > 0 && intersections === 0) return { valid: false, intersections: 0 };
  return { valid: true, intersections };
}

function placeOnGrid(grid: SparseGrid, word: string, sr: number, sc: number, dir: WordDirection, wid: number) {
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'across' ? sr : sr + i;
    const c = dir === 'across' ? sc + i : sc;
    setCell(grid, r, c, word[i], wid);
  }
}

export function generateCrosswordLayout(wordInputs: WordInput[]): { words: PlacedWord[]; rows: number; cols: number } {
  const grid: SparseGrid = new Map();
  const placedWords: PlacedWord[] = [];
  let nextNum = 1;

  const indexed = wordInputs.map((w, i) => ({ ...w, norm: normalize(w.answer), idx: i }));
  const sorted = [...indexed].sort((a, b) => b.norm.length - a.norm.length);

  const first = sorted[0];
  const fp: PlacedWord = { id: first.idx, answer: first.norm, acceptedAnswers: [first.answer, ...(first.acceptedAnswers || [])], clue: first.clue, row: 0, col: 0, direction: 'across', number: nextNum++ };
  placeOnGrid(grid, first.norm, 0, 0, 'across', first.idx);
  placedWords.push(fp);

  for (let w = 1; w < sorted.length; w++) {
    const wd = sorted[w];
    let best: { row: number; col: number; direction: WordDirection; score: number } | null = null;
    for (let i = 0; i < wd.norm.length; i++) {
      for (const [ck, cell] of grid.entries()) {
        if (cell.letter !== wd.norm[i]) continue;
        const [cr, cc] = ck.split(',').map(Number);
        for (const dir of ['across', 'down'] as WordDirection[]) {
          const sr = dir === 'across' ? cr : cr - i;
          const sc = dir === 'across' ? cc - i : cc;
          const res = canPlace(grid, wd.norm, sr, sc, dir, placedWords);
          if (res.valid && (!best || res.intersections > best.score)) {
            best = { row: sr, col: sc, direction: dir, score: res.intersections };
          }
        }
      }
    }
    if (best) {
      const pw: PlacedWord = { id: wd.idx, answer: wd.norm, acceptedAnswers: [wd.answer, ...(wd.acceptedAnswers || [])], clue: wd.clue, row: best.row, col: best.col, direction: best.direction, number: nextNum++ };
      placeOnGrid(grid, wd.norm, best.row, best.col, best.direction, wd.idx);
      placedWords.push(pw);
    }
  }

  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const k of grid.keys()) { const [r, c] = k.split(',').map(Number); minR = Math.min(minR, r); minC = Math.min(minC, c); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
  for (const pw of placedWords) { pw.row -= minR; pw.col -= minC; }

  const numPos = new Map<string, number>();
  let num = 1;
  const starts = placedWords.map(pw => ({ row: pw.row, col: pw.col, word: pw }));
  starts.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  for (const s of starts) {
    const pk = `${s.row},${s.col}`;
    if (!numPos.has(pk)) numPos.set(pk, num++);
    s.word.number = numPos.get(pk)!;
  }

  return { words: placedWords, rows: maxR - minR + 1, cols: maxC - minC + 1 };
}

export function assignMysteryCells(placedWords: PlacedWord[], mysteryWord: string): MysteryCell[] {
  const nm = normalize(mysteryWord);
  const cells: MysteryCell[] = [];
  const used = new Set<string>();
  const wCount = new Map<number, number>();

  const letterCells = new Map<string, Array<{ row: number; col: number; wordId: number }>>();
  for (const pw of placedWords) {
    for (let i = 0; i < pw.answer.length; i++) {
      const r = pw.direction === 'across' ? pw.row : pw.row + i;
      const c = pw.direction === 'across' ? pw.col + i : pw.col;
      const l = pw.answer[i];
      if (!letterCells.has(l)) letterCells.set(l, []);
      letterCells.get(l)!.push({ row: r, col: c, wordId: pw.id });
    }
  }

  for (let i = 0; i < nm.length; i++) {
    const avail = (letterCells.get(nm[i]) || []).filter(c => !used.has(`${c.row},${c.col}`));
    if (avail.length === 0) continue;
    avail.sort((a, b) => (wCount.get(a.wordId) || 0) - (wCount.get(b.wordId) || 0));
    const ch = avail[0];
    cells.push({ row: ch.row, col: ch.col, mysteryIndex: i });
    used.add(`${ch.row},${ch.col}`);
    wCount.set(ch.wordId, (wCount.get(ch.wordId) || 0) + 1);
  }
  return cells;
}

export function isWordComplete(word: PlacedWord, cellValues: Record<string, string>): boolean {
  for (let i = 0; i < word.answer.length; i++) {
    const r = word.direction === 'across' ? word.row : word.row + i;
    const c = word.direction === 'across' ? word.col + i : word.col;
    const v = cellValues[`${r},${c}`];
    if (!v || v.toUpperCase() !== word.answer[i]) return false;
  }
  return true;
}

export function getWordCells(word: PlacedWord): Array<{ row: number; col: number }> {
  return Array.from({ length: word.answer.length }, (_, i) => ({
    row: word.direction === 'across' ? word.row : word.row + i,
    col: word.direction === 'across' ? word.col + i : word.col,
  }));
}

export function buildCellWordMap(words: PlacedWord[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const w of words) for (const c of getWordCells(w)) {
    const k = `${c.row},${c.col}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(w.id);
  }
  return map;
}

export function buildGridCellSet(words: PlacedWord[]): Set<string> {
  const s = new Set<string>();
  for (const w of words) for (const c of getWordCells(w)) s.add(`${c.row},${c.col}`);
  return s;
}

export function getCellNumber(row: number, col: number, words: PlacedWord[]): number | null {
  for (const w of words) if (w.row === row && w.col === col) return w.number;
  return null;
}
