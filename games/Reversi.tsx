import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audio';

const SIZE = 8;

// P1 = Black, P2 = White
// Black moves first.

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Heuristic Weight Map for Bot
const WEIGHTS = [
  [100, -20, 10,  5,  5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [ 10,  -2,  5,  1,  1,  5,  -2,  10],
  [  5,  -2,  1,  1,  1,  1,  -2,   5],
  [  5,  -2,  1,  1,  1,  1,  -2,   5],
  [ 10,  -2,  5,  1,  1,  5,  -2,  10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10,  5,  5, 10, -20, 100]
];

export const Reversi: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [board, setBoard] = useState<(Player | null)[][]>([]);
  const [turn, setTurn] = useState<Player>('P1');
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [log, setLog] = useState("Black's Turn");
  const [gameEnded, setGameEnded] = useState(false);

  // --- Core Game Logic ---

  const isValidPos = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

  const getFlips = (b: (Player | null)[][], r: number, c: number, p: Player) => {
    if (b[r][c] !== null) return []; 
    
    const opponent = p === 'P1' ? 'P2' : 'P1';
    let totalFlips: [number, number][] = [];

    DIRECTIONS.forEach(([dr, dc]) => {
      let currentFlips: [number, number][] = [];
      let i = 1;
      while (true) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        
        if (!isValidPos(nr, nc)) break;
        
        const cell = b[nr][nc];
        if (cell === null) break; 
        if (cell === opponent) {
          currentFlips.push([nr, nc]);
        } else if (cell === p) {
          if (currentFlips.length > 0) {
            totalFlips.push(...currentFlips);
          }
          break; 
        }
        i++;
      }
    });

    return totalFlips;
  };

  const getValidMoves = useCallback((b: (Player | null)[][], p: Player) => {
    const moves: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (getFlips(b, r, c, p).length > 0) {
          moves.push(`${r},${c}`);
        }
      }
    }
    return moves;
  }, []);

  useEffect(() => {
    const b = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
    b[3][3] = 'P2'; b[4][4] = 'P2';
    b[3][4] = 'P1'; b[4][3] = 'P1';
    setBoard(b);
    setLegalMoves(getValidMoves(b, 'P1'));
  }, [getValidMoves]);

  const handleMove = useCallback((r: number, c: number) => {
    if (gameEnded) return;
    
    const flips = getFlips(board, r, c, turn);
    if (flips.length === 0) return;

    audio.play('move');

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = turn;
    flips.forEach(([fr, fc]) => {
      newBoard[fr][fc] = turn;
    });

    setBoard(newBoard);
    setLastMove([r, c]);

    const nextPlayer = turn === 'P1' ? 'P2' : 'P1';
    const nextMoves = getValidMoves(newBoard, nextPlayer);

    if (nextMoves.length > 0) {
      setTurn(nextPlayer);
      setLegalMoves(nextMoves);
      setLog(`${nextPlayer === 'P1' ? 'Black' : 'White'}'s Turn`);
    } else {
      const currentMoves = getValidMoves(newBoard, turn);
      if (currentMoves.length > 0) {
        setLog(`${nextPlayer === 'P1' ? 'Black' : 'White'} has no moves! ${turn === 'P1' ? 'Black' : 'White'} goes again.`);
        setLegalMoves(currentMoves);
      } else {
        setGameEnded(true);
        calculateWinner(newBoard);
      }
    }
  }, [board, turn, gameEnded, getValidMoves]);

  const calculateWinner = (b: (Player | null)[][]) => {
    let p1 = 0, p2 = 0;
    b.forEach(row => row.forEach(cell => {
      if (cell === 'P1') p1++;
      if (cell === 'P2') p2++;
    }));
    
    setLog(`Game Over! Black: ${p1}, White: ${p2}`);
    setTimeout(() => {
      if (p1 > p2) onEnd('P1');
      else if (p2 > p1) onEnd('P2');
      else onEnd(null);
    }, 2000);
  };

  useEffect(() => {
    if (vsComputer && turn === 'P2' && !gameEnded) {
      const timer = setTimeout(() => {
        if (legalMoves.length === 0) return;

        let bestMoveStr = legalMoves[0];
        let bestScore = -Infinity;

        legalMoves.forEach(moveStr => {
          const [r, c] = moveStr.split(',').map(Number);
          let score = WEIGHTS[r][c];
          const flips = getFlips(board, r, c, 'P2');
          score += flips.length;
          score += Math.random() * 0.5;

          if (score > bestScore) {
            bestScore = score;
            bestMoveStr = moveStr;
          }
        });

        const [br, bc] = bestMoveStr.split(',').map(Number);
        handleMove(br, bc);

      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, vsComputer, legalMoves, gameEnded, board, handleMove]);

  const counts = board.flat().reduce((acc, cell) => {
    if (cell === 'P1') acc.P1++;
    if (cell === 'P2') acc.P2++;
    return acc;
  }, { P1: 0, P2: 0 });

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between w-full mb-6 px-4">
          <motion.div 
            animate={turn === 'P1' ? { scale: 1.1, opacity: 1 } : { scale: 0.9, opacity: 0.6 }}
            className="flex flex-col items-center"
          >
              <div className="w-12 h-12 rounded-full bg-slate-900 border-4 border-slate-200 shadow-lg mb-1 flex items-center justify-center relative">
                  <span className="text-white font-bold text-lg">{counts.P1}</span>
              </div>
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Black</span>
          </motion.div>

          <div className="flex flex-col items-center px-4">
              <div className="text-sm font-bold text-slate-500 bg-white px-4 py-1 rounded-full shadow-sm border border-slate-100 mb-1 whitespace-nowrap">
                  {log}
              </div>
          </div>

          <motion.div 
            animate={turn === 'P2' ? { scale: 1.1, opacity: 1 } : { scale: 0.9, opacity: 0.6 }}
            className="flex flex-col items-center"
          >
              <div className="w-12 h-12 rounded-full bg-white border-4 border-slate-200 shadow-lg mb-1 flex items-center justify-center relative">
                  <span className="text-slate-900 font-bold text-lg">{counts.P2}</span>
              </div>
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">{vsComputer ? 'CPU' : 'White'}</span>
          </motion.div>
      </div>

      <div className="relative aspect-square w-full bg-[#1e8a4a] rounded-lg shadow-2xl border-8 border-[#145c32] p-2">
         <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 pointer-events-none z-0">
            {Array.from({length: 64}).map((_, i) => (
                <div key={i} className="border border-[#145c32]/30"></div>
            ))}
         </div>

         <div className="grid grid-cols-8 grid-rows-8 gap-0.5 w-full h-full relative z-10">
            {board.map((row, r) => (
               row.map((cell, c) => {
                  const isLegal = legalMoves.includes(`${r},${c}`);
                  const isLastMove = lastMove && lastMove[0] === r && lastMove[1] === c;

                  return (
                     <div 
                        key={`${r}-${c}`}
                        onClick={() => isLegal && handleMove(r, c)}
                        className={`
                           relative w-full h-full flex items-center justify-center
                           ${isLegal ? 'cursor-pointer hover:bg-white/10' : ''}
                        `}
                     >
                        {isLegal && !gameEnded && (!vsComputer || turn === 'P1') && (
                           <div className="w-3 h-3 rounded-full bg-black/20 shadow-inner"></div>
                        )}

                        {((r===2 && c===2) || (r===2 && c===6) || (r===6 && c===2) || (r===6 && c===6)) && !cell && !isLegal && (
                            <div className="w-1.5 h-1.5 rounded-full bg-black/40"></div>
                        )}

                        <AnimatePresence mode="popLayout">
                           {cell && (
                              <motion.div
                                 // Use a key that changes with cell content to trigger re-animation
                                 key={`${r}-${c}-${cell}`} 
                                 initial={{ rotateX: 90, opacity: 0 }}
                                 animate={{ rotateX: 0, opacity: 1 }}
                                 exit={{ rotateX: -90, opacity: 0, transition: { duration: 0.15 } }}
                                 transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                 className={`
                                    w-[85%] h-[85%] rounded-full shadow-md
                                    ${cell === 'P1' ? 'bg-slate-900' : 'bg-slate-50'}
                                    flex items-center justify-center
                                 `}
                              >
                                  <div className={`w-[90%] h-[90%] rounded-full border-2 ${cell === 'P1' ? 'border-white/10' : 'border-black/5'}`}></div>
                                  
                                  {isLastMove && (
                                     <div className={`absolute w-2 h-2 rounded-full bg-red-500`}></div>
                                  )}
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>
                  );
               })
            ))}
         </div>
      </div>
      
      <div className="mt-6 text-center text-xs text-slate-400 font-medium">
         <p>Capture opponent discs by bracketing them between yours.</p>
      </div>
    </div>
  );
};
