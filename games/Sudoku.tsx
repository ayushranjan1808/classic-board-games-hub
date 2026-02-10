import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audio';
import { Trophy, RotateCcw, Eraser, Settings, AlertCircle } from 'lucide-react';

const BLANK = 0;
const GRID_SIZE = 9;

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type CellValue = number; // 0-9
type Board = CellValue[][];

export const Sudoku: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd }) => {
  const [initialBoard, setInitialBoard] = useState<Board>([]);
  const [board, setBoard] = useState<Board>([]);
  const [solution, setSolution] = useState<Board>([]);
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [mistakes, setMistakes] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- SUDOKU GENERATOR LOGIC ---

  const getEmptyBoard = (): Board => Array.from({ length: 9 }, () => Array(9).fill(BLANK));

  const isValid = (b: Board, row: number, col: number, num: number) => {
    for (let x = 0; x < 9; x++) if (b[row][x] === num) return false;
    for (let x = 0; x < 9; x++) if (b[x][col] === num) return false;
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            if (b[i + startRow][j + startCol] === num) return false;
    return true;
  };

  const solveBoard = (b: Board, randomize = false): boolean => {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (b[row][col] === BLANK) {
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                if (randomize) nums.sort(() => Math.random() - 0.5);
                
                for (let num of nums) {
                    if (isValid(b, row, col, num)) {
                        b[row][col] = num;
                        if (solveBoard(b, randomize)) return true;
                        b[row][col] = BLANK;
                    }
                }
                return false;
            }
        }
    }
    return true;
  };

  const countSolutions = (b: Board, limit = 2): number => {
    let count = 0;
    const solve = (curr: Board): void => {
        if (count >= limit) return;
        
        let row = -1, col = -1;
        let found = false;
        for(let r=0; r<9; r++){
            for(let c=0; c<9; c++){
                if(curr[r][c] === BLANK){
                    row = r; col = c; found = true; break;
                }
            }
            if(found) break;
        }

        if (row === -1) {
            count++;
            return;
        }

        for (let num = 1; num <= 9; num++) {
            if (isValid(curr, row, col, num)) {
                curr[row][col] = num;
                solve(curr);
                curr[row][col] = BLANK;
            }
        }
    };
    
    // Deep clone to avoid mutation of working board during count
    solve(b.map(r => [...r]));
    return count;
  };

  const generatePuzzle = useCallback(async () => {
    setLoading(true);
    // await new Promise(r => setTimeout(r, 100)); // allow UI render

    // 1. Generate Full Board
    const fullBoard = getEmptyBoard();
    
    // Fill diagonal 3x3 boxes first (independent)
    for (let i = 0; i < 9; i = i + 3) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        let idx = 0;
        for(let r=0; r<3; r++)
            for(let c=0; c<3; c++)
                fullBoard[i+r][i+c] = nums[idx++];
    }
    
    solveBoard(fullBoard, true);
    const solutionBoard = fullBoard.map(r => [...r]);
    
    // 2. Remove Digits
    let attempts = difficulty === 'EASY' ? 30 : difficulty === 'MEDIUM' ? 45 : 56;
    const puzzle = fullBoard.map(r => [...r]);
    
    while (attempts > 0) {
        let row = Math.floor(Math.random() * 9);
        let col = Math.floor(Math.random() * 9);
        
        if (puzzle[row][col] !== BLANK) {
            const backup = puzzle[row][col];
            puzzle[row][col] = BLANK;
            
            // 3. Check Uniqueness
            // If checking uniqueness is too slow on some devices, one might skip it for Easy.
            // But requirement says "EXACTLY ONE solution".
            const solutions = countSolutions(puzzle);
            if (solutions !== 1) {
                puzzle[row][col] = backup; // Put it back
            } else {
                attempts--;
            }
        }
    }

    setInitialBoard(puzzle.map(r => [...r]));
    setBoard(puzzle.map(r => [...r]));
    setSolution(solutionBoard);
    setMistakes(0);
    setIsSolved(false);
    setLoading(false);
  }, [difficulty]);

  useEffect(() => {
    generatePuzzle();
  }, [generatePuzzle]);

  // --- INTERACTIONS ---

  const handleNumberInput = (num: number) => {
      if (!selected || loading || isSolved) return;
      const { r, c } = selected;

      // Cannot edit fixed cells
      if (initialBoard[r][c] !== BLANK) return;

      const newBoard = board.map(row => [...row]);
      
      if (newBoard[r][c] === num) return; // No change

      newBoard[r][c] = num;
      setBoard(newBoard);
      audio.play('move');

      // Validation
      if (num !== 0) {
         if (num !== solution[r][c]) {
             setMistakes(m => m + 1);
             audio.play('error');
         } else {
             // Check Win
             let filled = true;
             let correct = true;
             for(let i=0; i<9; i++) {
                 for(let j=0; j<9; j++) {
                     if (newBoard[i][j] === BLANK) filled = false;
                     if (newBoard[i][j] !== solution[i][j]) correct = false;
                 }
             }
             if (filled && correct) {
                 setIsSolved(true);
                 audio.play('win');
                 setTimeout(() => onEnd('P1'), 1000);
             }
         }
      }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (!selected) return;
      const key = e.key;
      if (key >= '1' && key <= '9') handleNumberInput(parseInt(key));
      if (key === 'Backspace' || key === 'Delete') handleNumberInput(0);
      
      // Arrow navigation
      if (key === 'ArrowUp') setSelected(prev => prev ? { r: Math.max(0, prev.r-1), c: prev.c } : null);
      if (key === 'ArrowDown') setSelected(prev => prev ? { r: Math.min(8, prev.r+1), c: prev.c } : null);
      if (key === 'ArrowLeft') setSelected(prev => prev ? { r: prev.r, c: Math.max(0, prev.c-1) } : null);
      if (key === 'ArrowRight') setSelected(prev => prev ? { r: prev.r, c: Math.min(8, prev.c+1) } : null);

  }, [selected, board, initialBoard, isSolved, loading]);

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  // --- RENDER HELPERS ---

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mb-4"></div>
              <p className="text-slate-500 font-bold">Generating Puzzle...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto px-2">
      
      {/* HUD */}
      <div className="w-full flex justify-between items-center mb-4 px-2">
          <div className="flex gap-2">
              {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => { if(d !== difficulty) setDifficulty(d); }}
                    className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg border transition-colors ${difficulty === d ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                      {d}
                  </button>
              ))}
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>Mistakes: {mistakes}/3</span>
          </div>
      </div>

      {/* GRID */}
      <div className="bg-slate-800 p-1 rounded-lg shadow-2xl relative select-none">
         <div className="grid grid-cols-9 bg-slate-400 gap-px border-2 border-slate-800">
             {board.map((row, r) => (
                 row.map((cell, c) => {
                     const isFixed = initialBoard[r][c] !== BLANK;
                     const isSelected = selected?.r === r && selected?.c === c;
                     const isError = cell !== BLANK && cell !== solution[r][c];
                     const isRelated = selected && (selected.r === r || selected.c === c || (Math.floor(selected.r/3) === Math.floor(r/3) && Math.floor(selected.c/3) === Math.floor(c/3)));
                     
                     // Borders for 3x3
                     const borderRight = (c + 1) % 3 === 0 && c !== 8 ? 'border-r-2 border-r-slate-800' : '';
                     const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? 'border-b-2 border-b-slate-800' : '';

                     return (
                         <div
                            key={`${r}-${c}`}
                            onClick={() => setSelected({r, c})}
                            className={`
                                w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center text-lg sm:text-2xl font-medium cursor-pointer relative
                                ${borderRight} ${borderBottom}
                                ${isSelected ? 'bg-blue-500 text-white' : 
                                  isError ? 'bg-red-100 text-red-600' :
                                  isRelated ? 'bg-blue-50' : 
                                  'bg-white'}
                                ${isFixed ? 'font-bold text-slate-900' : 'text-blue-600'}
                            `}
                         >
                             <AnimatePresence mode="popLayout">
                                {cell !== BLANK && (
                                    <motion.span
                                        key={cell}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        {cell}
                                    </motion.span>
                                )}
                             </AnimatePresence>
                         </div>
                     );
                 })
             ))}
         </div>
      </div>

      {/* NUMPAD */}
      <div className="grid grid-cols-5 gap-2 mt-6 w-full max-w-sm">
           {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
               <button
                  key={num}
                  onClick={() => handleNumberInput(num)}
                  className="bg-white border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 rounded-xl h-12 flex items-center justify-center text-xl font-bold text-blue-600 shadow-sm hover:bg-slate-50 transition-all"
               >
                   {num}
               </button>
           ))}
           <button
              onClick={() => handleNumberInput(0)}
              className="bg-red-50 border-b-4 border-red-200 active:border-b-0 active:translate-y-1 rounded-xl h-12 flex items-center justify-center text-red-500 shadow-sm hover:bg-red-100 transition-all"
           >
               <Eraser className="w-6 h-6" />
           </button>
      </div>

      <div className="mt-4 flex gap-4">
           <button 
              onClick={generatePuzzle}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-300"
           >
               <RotateCcw className="w-4 h-4" /> New Game
           </button>
      </div>

    </div>
  );
};
