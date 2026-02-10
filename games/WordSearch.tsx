import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '../types';
import { motion } from 'framer-motion';
import { audio } from '../services/audio';
import { Trophy, RotateCcw, Search, Check } from 'lucide-react';

const GRID_SIZE = 10;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type Direction = 'H' | 'V' | 'D'; // Horizontal, Vertical, Diagonal

const CATEGORIES: Record<string, string[]> = {
    ANIMALS: ["LION", "TIGER", "BEAR", "ZEBRA", "ELEPHANT", "GIRAFFE", "MONKEY", "SNAKE", "WOLF", "FOX", "CAT", "DOG", "PANDA", "KOALA"],
    FRUITS: ["APPLE", "BANANA", "ORANGE", "GRAPE", "LEMON", "LIME", "PEACH", "PEAR", "PLUM", "MANGO", "KIWI", "MELON", "BERRY", "FIG"],
    COUNTRIES: ["USA", "CHINA", "INDIA", "JAPAN", "FRANCE", "SPAIN", "ITALY", "BRAZIL", "CANADA", "PERU", "CHILE", "EGYPT", "KENYA", "IRAN"],
    OBJECTS: ["TABLE", "CHAIR", "LAMP", "DESK", "PHONE", "BOOK", "PEN", "CUP", "DOOR", "CLOCK", "BED", "SOFA", "VASE", "RUG"]
};

interface WordStatus {
  word: string;
  found: boolean;
  color: string;
}

interface Selection {
    start: { r: number, c: number };
    end: { r: number, c: number };
    cells: string[]; // "r-c" strings
}

const COLORS = [
    'bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 
    'bg-purple-200', 'bg-pink-200', 'bg-indigo-200', 'bg-orange-200'
];

export const WordSearch: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd }) => {
  const [grid, setGrid] = useState<string[][]>([]);
  const [wordList, setWordList] = useState<WordStatus[]>([]);
  const [category, setCategory] = useState<string>('ANIMALS');
  const [foundCells, setFoundCells] = useState<Map<string, string>>(new Map()); // "r-c" -> color class
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // --- Logic ---

  const generateGrid = useCallback(() => {
    // 1. Initialize Grid
    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
    
    // 2. Select Words
    const catKeys = Object.keys(CATEGORIES);
    const selectedCat = catKeys[Math.floor(Math.random() * catKeys.length)];
    setCategory(selectedCat);
    
    const allWords = [...CATEGORIES[selectedCat]];
    const targetWords: string[] = [];
    // Pick 6-8 words depending on length
    while (targetWords.length < 6 && allWords.length > 0) {
        const idx = Math.floor(Math.random() * allWords.length);
        const word = allWords.splice(idx, 1)[0];
        if (word.length <= GRID_SIZE) targetWords.push(word);
    }

    // 3. Place Words
    const placedWords: WordStatus[] = [];
    
    for (const word of targetWords) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const dir = Math.random() < 0.33 ? 'H' : Math.random() < 0.5 ? 'V' : 'D';
            let r = 0, c = 0;
            
            // Determine bounds based on direction
            if (dir === 'H') {
                r = Math.floor(Math.random() * GRID_SIZE);
                c = Math.floor(Math.random() * (GRID_SIZE - word.length + 1));
            } else if (dir === 'V') {
                r = Math.floor(Math.random() * (GRID_SIZE - word.length + 1));
                c = Math.floor(Math.random() * GRID_SIZE);
            } else { // Diagonal
                r = Math.floor(Math.random() * (GRID_SIZE - word.length + 1));
                c = Math.floor(Math.random() * (GRID_SIZE - word.length + 1));
            }

            // Check collision
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
                const nr = dir === 'H' ? r : dir === 'V' ? r + i : r + i;
                const nc = dir === 'H' ? c + i : dir === 'V' ? c : c + i;
                if (newGrid[nr][nc] !== '' && newGrid[nr][nc] !== word[i]) {
                    canPlace = false;
                    break;
                }
            }

            // Place
            if (canPlace) {
                for (let i = 0; i < word.length; i++) {
                    const nr = dir === 'H' ? r : dir === 'V' ? r + i : r + i;
                    const nc = dir === 'H' ? c + i : dir === 'V' ? c : c + i;
                    newGrid[nr][nc] = word[i];
                }
                placedWords.push({ 
                    word, 
                    found: false, 
                    color: COLORS[placedWords.length % COLORS.length] 
                });
                placed = true;
            }
            attempts++;
        }
    }

    // 4. Fill Empty
    for(let r=0; r<GRID_SIZE; r++) {
        for(let c=0; c<GRID_SIZE; c++) {
            if (newGrid[r][c] === '') {
                newGrid[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
            }
        }
    }

    setGrid(newGrid);
    setWordList(placedWords);
    setFoundCells(new Map());
    setSelection(null);
  }, []);

  useEffect(() => {
      generateGrid();
  }, [generateGrid]);

  // --- Interaction ---

  const getCellFromTouch = (e: React.Touch | React.MouseEvent) => {
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (element?.hasAttribute('data-r') && element?.hasAttribute('data-c')) {
          const r = parseInt(element.getAttribute('data-r')!);
          const c = parseInt(element.getAttribute('data-c')!);
          return { r, c };
      }
      return null;
  };

  const calculateSelection = (start: {r: number, c: number}, end: {r: number, c: number}) => {
      const cells: string[] = [];
      const dr = end.r - start.r;
      const dc = end.c - start.c;
      
      // Determine valid straight line
      // H: dr=0, V: dc=0, D: |dr| == |dc| and (dr/dc) > 0 for TL->BR
      // Prompt said: Horiz (L->R), Vert (T->B), Diag (TL->BR)
      // We will allow reverse selection for better UX (player might drag backwards), but normalize validation.
      
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      if (steps === 0) return { cells: [`${start.r}-${start.c}`], isValid: true };

      const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
      const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

      // Enforce 8-way (or strictly 3-way if strict mode, but usually UI allows dragging back)
      // The prompt specified placement is H/V/D. It didn't strictly say selection MUST be L->R.
      // Usually games allow selecting "LION" as "NOIL". 
      // But placement rule said: "Horizontally (left → right)..."
      // We will allow dragging in any valid line, but check string against word list and reverse word list.

      if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return { cells: [], isValid: false };

      for(let i=0; i<=steps; i++) {
          cells.push(`${start.r + i*stepR}-${start.c + i*stepC}`);
      }
      return { cells, isValid: true };
  };

  const handleStart = (r: number, c: number) => {
      if (foundCells.has(`${r}-${c}`)) {
          // Optional: handle re-drag? For now, start new.
      }
      setIsDragging(true);
      setSelection({ start: {r, c}, end: {r, c}, cells: [`${r}-${c}`] });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging || !selection) return;
      
      // For touch, we need global coords
      let target = { r: 0, c: 0 };
      if ('touches' in e) {
          const cell = getCellFromTouch(e.touches[0]);
          if (!cell) return;
          target = cell;
      } else {
          // Mouse enter event on specific cell handles this simpler, 
          // but we use a global move handler on the grid container for smoothness
          const cell = getCellFromTouch(e as React.MouseEvent);
          if (!cell) return;
          target = cell;
      }

      if (target.r !== selection.end.r || target.c !== selection.end.c) {
          const { cells, isValid } = calculateSelection(selection.start, target);
          if (isValid) {
              setSelection({ ...selection, end: target, cells });
          }
      }
  };

  const handleEnd = () => {
      if (!isDragging || !selection) return;
      setIsDragging(false);
      
      // Validate Word
      const selectedWord = selection.cells.map(key => {
          const [r, c] = key.split('-').map(Number);
          return grid[r][c];
      }).join('');

      const reversedWord = selectedWord.split('').reverse().join('');
      
      // Find matches (allow forward or backward selection for UX ease)
      const match = wordList.find(w => !w.found && (w.word === selectedWord || w.word === reversedWord));

      if (match) {
          audio.play('bell');
          // Mark found
          const newFound = new Map(foundCells);
          selection.cells.forEach(key => newFound.set(key, match.color));
          setFoundCells(newFound);

          const newList = wordList.map(w => w.word === match.word ? { ...w, found: true } : w);
          setWordList(newList);

          // Check Win
          if (newList.every(w => w.found)) {
              audio.play('win');
              setTimeout(() => onEnd('P1'), 1500);
          }
      } else {
          // Invalid or already found
          // audio.play('error');
      }

      setSelection(null);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto p-4 select-none touch-none">
      
      {/* HUD */}
      <div className="flex items-center justify-between w-full mb-4">
         <div className="flex items-center gap-2">
             <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                 <Search className="w-5 h-5" />
             </div>
             <div className="flex flex-col">
                 <span className="text-xs font-bold text-slate-400">CATEGORY</span>
                 <span className="font-bold text-slate-700">{category}</span>
             </div>
         </div>
         <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">
             {wordList.filter(w => w.found).length} / {wordList.length} FOUND
         </div>
      </div>

      {/* Grid Container */}
      <div 
        className="relative bg-white p-2 rounded-xl shadow-xl border-4 border-slate-200"
        onMouseLeave={() => { if(isDragging) handleEnd(); }}
        onMouseUp={handleEnd}
        onTouchEnd={handleEnd}
        onTouchMove={handleMove}
        onMouseMove={handleMove}
      >
          <div className="grid grid-cols-10 gap-1" ref={gridRef}>
              {grid.map((row, r) => (
                  row.map((letter, c) => {
                      const key = `${r}-${c}`;
                      const isFound = foundCells.has(key);
                      const isSelected = selection?.cells.includes(key);
                      const colorClass = isFound ? foundCells.get(key) : isSelected ? 'bg-blue-500 text-white scale-90 rounded-full' : 'bg-slate-50 text-slate-700';

                      return (
                          <div
                            key={key}
                            data-r={r}
                            data-c={c}
                            onMouseDown={() => handleStart(r, c)}
                            onTouchStart={() => handleStart(r, c)}
                            className={`
                                w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center 
                                text-sm sm:text-base md:text-lg font-bold rounded-md transition-all duration-150 cursor-pointer
                                ${colorClass}
                                ${isFound ? 'opacity-80' : ''}
                            `}
                          >
                              {letter}
                          </div>
                      );
                  })
              ))}
          </div>

          {/* Selection Line Overlay (Optional visual polish could go here, but cell-based highlighting is simpler) */}
      </div>

      {/* Word List */}
      <div className="mt-6 w-full">
          <div className="grid grid-cols-3 gap-2">
              {wordList.map((w, i) => (
                  <motion.div
                    key={w.word}
                    animate={{ scale: w.found ? 0.95 : 1, opacity: w.found ? 0.6 : 1 }}
                    className={`
                        flex items-center justify-center p-2 rounded-lg text-xs sm:text-sm font-bold border-2 transition-colors
                        ${w.found ? `bg-slate-100 border-transparent text-slate-400 line-through decoration-2` : 'bg-white border-slate-100 text-slate-700'}
                    `}
                  >
                      {w.found && <Check className="w-3 h-3 mr-1" />}
                      {w.word}
                  </motion.div>
              ))}
          </div>
      </div>

      <div className="mt-6">
           <button 
              onClick={generateGrid}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition-colors"
           >
               <RotateCcw className="w-4 h-4" /> New Puzzle
           </button>
      </div>
    </div>
  );
};
