import React, { useState, useEffect, useCallback } from 'react';
import { Player, BoardCell } from '../types';
import { motion } from 'framer-motion';
import { audio } from '../services/audio';

const ROWS = 6;
const COLS = 7;

export const ConnectFour: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [board, setBoard] = useState<BoardCell[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [turn, setTurn] = useState<Player>('P1');
  const [dropping, setDropping] = useState(false);
  const [winningCells, setWinningCells] = useState<[number, number][] | null>(null);

  const checkWin = useCallback((b: BoardCell[][], r: number, c: number, p: Player) => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dr, dc] of directions) {
      const cells: [number, number][] = [[r, c]];
      
      // Check forward
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === p) cells.push([nr, nc]);
        else break;
      }
      // Check backward
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === p) cells.push([nr, nc]);
        else break;
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }, []);

  const handleColumnClick = useCallback(async (c: number) => {
    if (dropping || winningCells) return;
    
    // Find lowest empty row
    let r = ROWS - 1;
    while (r >= 0 && board[r][c] !== null) {
      r--;
    }
    if (r < 0) return; // Column full

    setDropping(true);
    audio.play('move'); // Drop sound

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = turn;
    setBoard(newBoard);

    const winLine = checkWin(newBoard, r, c, turn);

    if (winLine) {
      setWinningCells(winLine);
      setTimeout(() => onEnd(turn), 1500);
    } else if (newBoard.every(row => row.every(cell => cell !== null))) {
      setTimeout(() => onEnd(null), 1000);
    } else {
      setTimeout(() => {
          setTurn(prev => prev === 'P1' ? 'P2' : 'P1');
          setDropping(false);
      }, 400); 
    }
  }, [board, dropping, winningCells, turn, checkWin, onEnd]);

  // Bot Logic
  useEffect(() => {
    if (vsComputer && turn === 'P2' && !dropping && !winningCells) {
       const timer = setTimeout(() => {
           // Heuristic Bot
           // Prioritize: 1. Win, 2. Block, 3. Center, 4. Random
           
           const getNextRow = (col: number) => {
               for (let r = ROWS - 1; r >= 0; r--) {
                   if (board[r][col] === null) return r;
               }
               return -1;
           };

           let bestCol = -1;

           // 1. Check Win
           for (let c = 0; c < COLS; c++) {
               const r = getNextRow(c);
               if (r !== -1) {
                   const temp = board.map(row => [...row]);
                   temp[r][c] = 'P2';
                   if (checkWin(temp, r, c, 'P2')) { bestCol = c; break; }
               }
           }

           // 2. Check Block
           if (bestCol === -1) {
               for (let c = 0; c < COLS; c++) {
                   const r = getNextRow(c);
                   if (r !== -1) {
                       const temp = board.map(row => [...row]);
                       temp[r][c] = 'P1';
                       if (checkWin(temp, r, c, 'P1')) { bestCol = c; break; }
                   }
               }
           }

           // 3. Center Bias
           if (bestCol === -1) {
               const priority = [3, 2, 4, 1, 5, 0, 6];
               for (let c of priority) {
                   if (getNextRow(c) !== -1) { bestCol = c; break; }
               }
           }

           handleColumnClick(bestCol);

       }, 1000);
       return () => clearTimeout(timer);
    }
  }, [turn, vsComputer, board, dropping, winningCells, handleColumnClick, checkWin]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mb-6 flex gap-12">
        <div className={`flex flex-col items-center transition-all duration-300 ${turn === 'P1' ? 'scale-110 opacity-100' : 'opacity-50 scale-90'}`}>
           <div className="w-10 h-10 rounded-full bg-red-500 border-4 border-white shadow-md mb-2"></div>
           <span className="font-bold text-slate-700">Player 1</span>
        </div>
        <div className={`flex flex-col items-center transition-all duration-300 ${turn === 'P2' ? 'scale-110 opacity-100' : 'opacity-50 scale-90'}`}>
           <div className="w-10 h-10 rounded-full bg-yellow-400 border-4 border-white shadow-md mb-2"></div>
           <span className="font-bold text-slate-700">{vsComputer ? 'CPU' : 'Player 2'}</span>
        </div>
      </div>

      <div className="bg-blue-600 p-4 pb-6 rounded-b-2xl rounded-t-lg shadow-2xl inline-block relative border-b-8 border-blue-800">
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {Array(ROWS).fill(0).map((_, r) => (
             Array(COLS).fill(0).map((_, c) => {
                const isWinner = winningCells?.some(([wr, wc]) => wr === r && wc === c);
                return (
                    <div 
                       key={`${r}-${c}`}
                       onClick={() => handleColumnClick(c)}
                       className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-800 overflow-hidden relative shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)]
                                   ${(dropping || (vsComputer && turn === 'P2')) ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                       {/* Piece */}
                       {board[r][c] === 'P1' && (
                         <motion.div 
                            initial={{ y: -400, opacity: 0.5 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            transition={{ type: "spring", stiffness: 400, damping: 25, mass: 1.2 }}
                            className="w-full h-full bg-red-500 rounded-full border-4 border-red-600 box-border" 
                         />
                       )}
                       {board[r][c] === 'P2' && (
                         <motion.div 
                            initial={{ y: -400, opacity: 0.5 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            transition={{ type: "spring", stiffness: 400, damping: 25, mass: 1.2 }}
                            className="w-full h-full bg-yellow-400 rounded-full border-4 border-yellow-500 box-border" 
                         />
                       )}

                       {/* Winner Highlight Overlay */}
                       {isWinner && (
                         <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ repeat: Infinity, duration: 0.8, repeatType: "reverse" }}
                            className="absolute inset-0 bg-white/50 rounded-full z-10"
                         />
                       )}
                    </div>
                );
             })
          ))}
        </div>
        
        {/* Legs/Stand */}
        <div className="absolute -bottom-6 -left-4 w-6 h-24 bg-blue-700 rounded-full -z-10 transform rotate-12 border-r-4 border-blue-900"></div>
        <div className="absolute -bottom-6 -right-4 w-6 h-24 bg-blue-700 rounded-full -z-10 transform -rotate-12 border-l-4 border-blue-900"></div>
      </div>
    </div>
  );
};
