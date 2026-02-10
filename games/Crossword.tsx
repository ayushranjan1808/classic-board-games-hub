import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player } from '../types';
import { motion } from 'framer-motion';
import { audio } from '../services/audio';
import { Trophy, RotateCcw, HelpCircle, Check, Keyboard, ArrowRight, ArrowDown } from 'lucide-react';

const GRID_SIZE = 10;

// --- Data ---
const WORD_BANK = [
  { answer: "REACT", clue: "A JS library for building UIs" },
  { answer: "CODE", clue: "Programmer's text" },
  { answer: "BUG", clue: "Error in software" },
  { answer: "DATA", clue: "Information processed by computer" },
  { answer: "WEB", clue: "World Wide ___" },
  { answer: "APP", clue: "Mobile application" },
  { answer: "JAVA", clue: "Coffee or a language" },
  { answer: "NODE", clue: "Server-side JS runtime" },
  { answer: "LOOP", clue: "Repeating code block" },
  { answer: "ARRAY", clue: "List of items" },
  { answer: "CONST", clue: "Unchanging variable" },
  { answer: "TRUE", clue: "Not false" },
  { answer: "NULL", clue: "Intentional absence of value" },
  { answer: "GIT", clue: "Version control system" },
  { answer: "KEY", clue: "Password or object property" },
  { answer: "MOUSE", clue: "Clicking device" },
  { answer: "SCREEN", clue: "Display monitor" },
  { answer: "PIXEL", clue: "Smallest screen element" },
  { answer: "WIFI", clue: "Wireless internet" },
  { answer: "CLOUD", clue: "Remote server storage" },
  { answer: "ROBOT", clue: "Automated machine" },
  { answer: "LOGIC", clue: "Reasoning used in coding" },
  { answer: "INPUT", clue: "Data entered into a system" },
  { answer: "FILE", clue: "Document storage unit" },
  { answer: "LINK", clue: "Hypertext connection" },
  { answer: "TAG", clue: "HTML element label" },
  { answer: "STYLE", clue: "CSS defines this" },
  { answer: "FONT", clue: "Typeface style" },
  { answer: "COLOR", clue: "Visual hue" },
  { answer: "GAME", clue: "Playful activity" }
];

// --- Types ---

interface CellData {
  char: string;       // The correct character
  userChar: string;   // User input
  isBlock: boolean;   // Is black square?
  number: number | null; // Clue number if start of word
  fixed: boolean;     // Pre-filled (difficulty)
  isError: boolean;   // Validation state
}

interface Clue {
  number: number;
  direction: 'across' | 'down';
  text: string;
  r: number;
  c: number;
  length: number;
}

type Direction = 'across' | 'down';

export const Crossword: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd }) => {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [direction, setDirection] = useState<Direction>('across');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [solved, setSolved] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- Generator ---

  const generateCrossword = useCallback(async () => {
    setLoading(true);
    // await new Promise(r => setTimeout(r, 100)); // Render cycle

    // 1. Init Grid
    let g: string[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('.')); // '.' = empty/block
    let placedWords: {word: string, r: number, c: number, dir: Direction}[] = [];
    
    // Shuffle words
    const pool = [...WORD_BANK].sort(() => Math.random() - 0.5);
    
    // Helpers
    const canPlace = (word: string, r: number, c: number, dir: Direction) => {
        if (dir === 'across') {
            if (c + word.length > GRID_SIZE) return false;
            // Check neighbors (simplified for reliability)
            // We allow overlap if char matches. 
            // We allow touching if it's a valid cross.
            // Simplified check: Check exact cells.
            for (let i = 0; i < word.length; i++) {
                const cell = g[r][c + i];
                if (cell !== '.' && cell !== word[i]) return false;
                
                // Check immediate vertical neighbors (unless it's a crossing point)
                // If we are placing 'A' at [r, c+i], check [r-1, c+i] and [r+1, c+i]
                // If they are not empty, they must be part of a vertical word.
                // For a simple generator, we enforce that if a cell is empty, its neighbors perp to direction should be empty
                // unless we are forming a cross. 
                // This is complex. Standard approach:
                // Only place if cell is empty OR cell matches. 
                // AND if cell is empty, ensure perp neighbors are empty to avoid adjacent word merging.
                if (cell === '.') {
                     if (r > 0 && g[r-1][c+i] !== '.') return false;
                     if (r < GRID_SIZE-1 && g[r+1][c+i] !== '.') return false;
                }
            }
            // Check ends
            if (c > 0 && g[r][c-1] !== '.') return false;
            if (c + word.length < GRID_SIZE && g[r][c + word.length] !== '.') return false;
        } else {
            if (r + word.length > GRID_SIZE) return false;
            for (let i = 0; i < word.length; i++) {
                const cell = g[r + i][c];
                if (cell !== '.' && cell !== word[i]) return false;
                if (cell === '.') {
                     if (c > 0 && g[r+i][c-1] !== '.') return false;
                     if (c < GRID_SIZE-1 && g[r+i][c+1] !== '.') return false;
                }
            }
            if (r > 0 && g[r-1][c] !== '.') return false;
            if (r + word.length < GRID_SIZE && g[r + word.length][c] !== '.') return false;
        }
        return true;
    };

    const place = (word: string, r: number, c: number, dir: Direction) => {
        if (dir === 'across') {
            for (let i = 0; i < word.length; i++) g[r][c+i] = word[i];
        } else {
            for (let i = 0; i < word.length; i++) g[r+i][c] = word[i];
        }
        placedWords.push({ word, r, c, dir });
    };

    // Algorithm:
    // 1. Place first word in center-ish
    // 2. Try to cross subsequent words
    
    // Place first
    const first = pool.pop();
    if (first) {
        const r = Math.floor((GRID_SIZE - 1) / 2);
        const c = Math.floor((GRID_SIZE - first.answer.length) / 2);
        place(first.answer, r, c, 'across');
    }

    // Try others
    let failures = 0;
    while (pool.length > 0 && failures < 50) {
        const next = pool[0];
        let placed = false;
        
        // Find intersection points
        // Iterate through all placed words, find matching letters
        for (const pw of placedWords) {
            if (placed) break;
            // Iterate letters of placed word
            for (let i = 0; i < pw.word.length; i++) {
                const char = pw.word[i];
                const pr = pw.dir === 'across' ? pw.r : pw.r + i;
                const pc = pw.dir === 'across' ? pw.c + i : pw.c;
                
                // Does new word have this char?
                for (let j = 0; j < next.answer.length; j++) {
                    if (next.answer[j] === char) {
                        // Attempt cross perpendicular
                        const newDir = pw.dir === 'across' ? 'down' : 'across';
                        const nr = newDir === 'down' ? pr - j : pr;
                        const nc = newDir === 'across' ? pc - j : pc;

                        if (nr >= 0 && nc >= 0 && canPlace(next.answer, nr, nc, newDir)) {
                            place(next.answer, nr, nc, newDir);
                            pool.shift(); // Remove from pool
                            placed = true;
                            break;
                        }
                    }
                }
                if (placed) break;
            }
        }
        
        if (!placed) {
            // Move to end of queue to try later? Or just discard.
            // Discarding keeps density low but safe.
            // Let's rotate pool.
            pool.push(pool.shift()!);
            failures++;
        } else {
            failures = 0;
        }
    }

    // Convert to CellData
    const finalGrid: CellData[][] = g.map(row => row.map(char => ({
        char: char === '.' ? '' : char,
        userChar: '',
        isBlock: char === '.',
        number: null,
        fixed: false,
        isError: false
    })));

    // Generate Clues & Numbers
    const finalClues: Clue[] = [];
    let numCounter = 1;

    // We scan grid to assign numbers. A cell gets a number if it starts a word.
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (finalGrid[r][c].isBlock) continue;
            
            let startsAcross = false;
            let startsDown = false;

            // Check Across start: (left is block or bound) AND (right is char)
            if ((c === 0 || finalGrid[r][c-1].isBlock) && (c+1 < GRID_SIZE && !finalGrid[r][c+1].isBlock)) {
                startsAcross = true;
            }
            // Check Down start: (top is block or bound) AND (bottom is char)
            if ((r === 0 || finalGrid[r-1][c].isBlock) && (r+1 < GRID_SIZE && !finalGrid[r+1][c].isBlock)) {
                startsDown = true;
            }

            if (startsAcross || startsDown) {
                finalGrid[r][c].number = numCounter;
                
                if (startsAcross) {
                    // Find word
                    let len = 0;
                    let txt = "";
                    while (c+len < GRID_SIZE && !finalGrid[r][c+len].isBlock) {
                        txt += finalGrid[r][c+len].char;
                        len++;
                    }
                    const def = WORD_BANK.find(w => w.answer === txt);
                    finalClues.push({
                        number: numCounter,
                        direction: 'across',
                        text: def ? def.clue : "???",
                        r, c, length: len
                    });
                }
                
                if (startsDown) {
                     let len = 0;
                    let txt = "";
                    while (r+len < GRID_SIZE && !finalGrid[r+len][c].isBlock) {
                        txt += finalGrid[r+len][c].char;
                        len++;
                    }
                    const def = WORD_BANK.find(w => w.answer === txt);
                    finalClues.push({
                        number: numCounter,
                        direction: 'down',
                        text: def ? def.clue : "???",
                        r, c, length: len
                    });
                }

                numCounter++;
            }
        }
    }

    // Apply Difficulty (Pre-fill)
    const totalChars = finalGrid.flat().filter(c => !c.isBlock).length;
    const fillPercent = difficulty === 'EASY' ? 0.3 : difficulty === 'MEDIUM' ? 0.1 : 0;
    let fills = Math.floor(totalChars * fillPercent);

    while (fills > 0) {
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);
        if (!finalGrid[r][c].isBlock && !finalGrid[r][c].fixed) {
            finalGrid[r][c].fixed = true;
            finalGrid[r][c].userChar = finalGrid[r][c].char;
            fills--;
        }
    }

    setGrid(finalGrid);
    setClues(finalClues);
    setSolved(false);
    
    // Select first clue
    if (finalClues.length > 0) {
        setSelected({ r: finalClues[0].r, c: finalClues[0].c });
        setDirection(finalClues[0].direction);
    }

    setLoading(false);
  }, [difficulty]);

  useEffect(() => {
    generateCrossword();
  }, [generateCrossword]);

  // --- Interaction ---

  const handleCellClick = (r: number, c: number) => {
    if (grid[r][c].isBlock) return;
    
    if (selected?.r === r && selected?.c === c) {
        setDirection(prev => prev === 'across' ? 'down' : 'across');
    } else {
        setSelected({r, c});
        // Smart direction: if cell starts only one word, pick that.
        // Or if moving adjacent, preserve.
    }
  };

  const checkWin = (currentGrid: CellData[][]) => {
      const allFilled = currentGrid.every(row => row.every(cell => cell.isBlock || cell.userChar !== ''));
      if (!allFilled) return false;
      const allCorrect = currentGrid.every(row => row.every(cell => cell.isBlock || cell.userChar === cell.char));
      return allCorrect;
  };

  const handleInput = useCallback((char: string) => {
      if (!selected || solved) return;
      const { r, c } = selected;
      if (grid[r][c].fixed) {
          // Move cursor but don't edit
          moveCursor(r, c, 1);
          return;
      }

      const newGrid = grid.map(row => row.map(cell => ({...cell}))); // Deep copy needed? Shallow row copy enough usually
      // Actual deep copy for 2d
      for(let i=0; i<GRID_SIZE; i++) newGrid[i] = [...grid[i]];

      newGrid[r][c].userChar = char.toUpperCase();
      newGrid[r][c].isError = false; // clear error on edit
      
      setGrid(newGrid);
      audio.play('move');

      if (checkWin(newGrid)) {
          setSolved(true);
          audio.play('win');
          setTimeout(() => onEnd('P1'), 1500);
      } else {
          moveCursor(r, c, 1);
      }
  }, [selected, grid, direction, solved]);

  const moveCursor = (r: number, c: number, step: number) => {
      let nr = r;
      let nc = c;
      
      if (direction === 'across') {
          nc += step;
      } else {
          nr += step;
      }

      // Check bounds
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (!grid[nr][nc].isBlock) {
              setSelected({r: nr, c: nc});
          } else {
              // Stop at block or jump over? Standard is stop or jump. 
              // Simple: check next cell if jump.
              // For now, stop.
          }
      }
  };

  const handleBackspace = () => {
      if (!selected || solved) return;
      const { r, c } = selected;
      
      if (!grid[r][c].fixed && grid[r][c].userChar !== '') {
          // Clear current
          const newGrid = [...grid];
          newGrid[r] = [...grid[r]];
          newGrid[r][c] = { ...newGrid[r][c], userChar: '', isError: false };
          setGrid(newGrid);
      } else {
          // Move back and clear
           moveCursor(r, c, -1);
      }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (solved) return;
      
      if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
          handleInput(e.key);
      } else if (e.key === 'Backspace') {
          handleBackspace();
      } else if (e.key === 'ArrowUp') {
          setSelected(prev => prev ? {r: Math.max(0, prev.r-1), c: prev.c} : null);
      } else if (e.key === 'ArrowDown') {
          setSelected(prev => prev ? {r: Math.min(GRID_SIZE-1, prev.r+1), c: prev.c} : null);
      } else if (e.key === 'ArrowLeft') {
          setSelected(prev => prev ? {r: prev.r, c: Math.max(0, prev.c-1)} : null);
      } else if (e.key === 'ArrowRight') {
          setSelected(prev => prev ? {r: prev.r, c: Math.min(GRID_SIZE-1, prev.c+1)} : null);
      }
      // Space to toggle direction
      else if (e.key === ' ') {
          setDirection(prev => prev === 'across' ? 'down' : 'across');
          e.preventDefault();
      }
  }, [handleInput, handleBackspace, solved]);

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // --- Helpers ---

  // Find active clue based on selected cell and direction
  const activeClue = clues.find(c => {
      if (c.direction !== direction) return false;
      if (direction === 'across') return c.r === selected?.r && selected.c >= c.c && selected.c < c.c + c.length;
      else return c.c === selected?.c && selected.r >= c.r && selected.r < c.r + c.length;
  });

  const checkPuzzle = () => {
      const newGrid = grid.map(row => row.map(cell => {
          if (!cell.isBlock && cell.userChar !== '' && cell.userChar !== cell.char) {
              return { ...cell, isError: true };
          }
          return cell;
      }));
      setGrid(newGrid);
      audio.play('bell'); // Feedback sound
  };

  if (loading) {
      return <div className="flex h-full items-center justify-center font-bold text-slate-400">Building Puzzle...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center h-full w-full max-w-4xl mx-auto gap-6 p-2">
       
       {/* Left Column: Grid & Controls */}
       <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
          
          {/* Controls */}
          <div className="flex justify-between w-full max-w-md px-2">
               <div className="flex gap-1">
                   {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                       <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`text-[10px] font-bold px-2 py-1 rounded border ${difficulty === d ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-slate-500'}`}
                       >
                           {d}
                       </button>
                   ))}
               </div>
               <div className="flex gap-2">
                   <button onClick={checkPuzzle} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 flex items-center gap-1 text-xs font-bold shadow-sm" title="Check Errors">
                       <Check className="w-3 h-3"/> Check
                   </button>
                   <button onClick={generateCrossword} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 flex items-center gap-1 text-xs font-bold shadow-sm" title="New Game">
                       <RotateCcw className="w-3 h-3"/> Reset
                   </button>
               </div>
          </div>

          {/* Current Clue Banner (Mobile mainly) */}
          <div className="w-full max-w-md bg-blue-600 text-white p-3 rounded-xl shadow-md min-h-[3rem] flex items-center justify-center text-center text-sm font-medium">
              {activeClue ? (
                  <span>
                      <span className="font-bold mr-2">{activeClue.number} {activeClue.direction.toUpperCase()}:</span>
                      {activeClue.text}
                  </span>
              ) : "Select a cell to start"}
          </div>

          {/* Grid */}
          <div className="bg-slate-900 p-2 rounded-lg shadow-2xl">
              <div 
                  className="grid gap-[1px] bg-slate-700 border-2 border-slate-700"
                  style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
              >
                  {grid.map((row, r) => (
                      row.map((cell, c) => {
                          const isSel = selected?.r === r && selected?.c === c;
                          const isInWord = activeClue && (
                              (activeClue.direction === 'across' && r === activeClue.r && c >= activeClue.c && c < activeClue.c + activeClue.length) ||
                              (activeClue.direction === 'down' && c === activeClue.c && r >= activeClue.r && r < activeClue.r + activeClue.length)
                          );

                          if (cell.isBlock) {
                              return <div key={`${r}-${c}`} className="w-8 h-8 sm:w-9 sm:h-9 bg-black" />;
                          }

                          return (
                              <div 
                                 key={`${r}-${c}`}
                                 onClick={() => handleCellClick(r, c)}
                                 className={`
                                     w-8 h-8 sm:w-9 sm:h-9 relative bg-white flex items-center justify-center text-lg font-bold cursor-pointer select-none
                                     ${isSel ? 'bg-yellow-300' : isInWord ? 'bg-blue-100' : ''}
                                     ${cell.isError ? 'text-red-500 bg-red-50' : cell.fixed ? 'text-slate-900' : 'text-blue-600'}
                                 `}
                              >
                                  {/* Number */}
                                  {cell.number && (
                                      <span className="absolute top-0.5 left-0.5 text-[8px] leading-none text-slate-500 font-normal">{cell.number}</span>
                                  )}
                                  {cell.userChar}
                              </div>
                          );
                      })
                  ))}
              </div>
          </div>
          
          {/* Virtual Keyboard (Simple) */}
          <div className="w-full max-w-md grid grid-cols-10 gap-1 mt-2">
              {"QWERTYUIOPASDFGHJKLZXCVBNM".split('').map(char => (
                  <button
                    key={char}
                    onClick={() => handleInput(char)}
                    className="aspect-square bg-white rounded shadow text-xs font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                  >
                      {char}
                  </button>
              ))}
              <button onClick={() => setDirection(d => d==='across'?'down':'across')} className="col-span-2 bg-slate-200 rounded text-[10px] font-bold">DIR</button>
              <button onClick={handleBackspace} className="col-span-2 bg-red-100 text-red-600 rounded text-[10px] font-bold">DEL</button>
          </div>

       </div>

       {/* Right Column: Clues */}
       <div className="flex flex-row lg:flex-col gap-4 w-full h-64 lg:h-[500px] overflow-hidden">
           {['across', 'down'].map(dir => (
               <div key={dir} className="flex-1 bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
                   <div className="bg-slate-100 p-2 font-bold text-slate-600 uppercase text-xs tracking-wider border-b border-slate-200 flex items-center gap-2">
                       {dir === 'across' ? <ArrowRight className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>}
                       {dir}
                   </div>
                   <div className="overflow-y-auto flex-1 p-2 space-y-2">
                       {clues.filter(c => c.direction === dir).map(c => {
                           const isActive = activeClue === c;
                           return (
                               <button
                                  key={c.number}
                                  onClick={() => {
                                      setSelected({r: c.r, c: c.c});
                                      setDirection(c.direction as Direction);
                                  }}
                                  className={`w-full text-left text-xs p-2 rounded hover:bg-slate-50 transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                               >
                                   <span className="font-bold mr-1">{c.number}.</span>
                                   <span className="text-slate-600">{c.text}</span>
                               </button>
                           );
                       })}
                   </div>
               </div>
           ))}
       </div>

    </div>
  );
};