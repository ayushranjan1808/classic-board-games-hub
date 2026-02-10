import React, { useState, useEffect, useCallback } from 'react';
import { Player, BoardCell } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audio';

export const TicTacToe: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [board, setBoard] = useState<BoardCell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<Player>('P1');
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  const checkWinner = useCallback((squares: BoardCell[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    return null;
  }, []);

  const handleClick = useCallback((i: number) => {
    if (board[i] || winningLine) return;
    
    audio.play('move');

    const newBoard = [...board];
    newBoard[i] = turn;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinningLine(result.line);
      setTimeout(() => onEnd(result.winner), 1200);
    } else if (!newBoard.includes(null)) {
      setTimeout(() => onEnd(null), 800);
    } else {
      setTurn(prev => prev === 'P1' ? 'P2' : 'P1');
    }
  }, [board, winningLine, turn, checkWinner, onEnd]);

  // Bot Logic
  useEffect(() => {
    if (vsComputer && turn === 'P2' && !winningLine) {
        const timer = setTimeout(() => {
            // Simple Heuristic Bot
            let move = -1;

            const emptyIndices = board.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
            if (emptyIndices.length === 0) return;

            // 1. Check for Win
            for (let idx of emptyIndices) {
                const temp = [...board];
                temp[idx] = 'P2';
                if (checkWinner(temp)?.winner === 'P2') { move = idx; break; }
            }

            // 2. Check for Block
            if (move === -1) {
                for (let idx of emptyIndices) {
                    const temp = [...board];
                    temp[idx] = 'P1';
                    if (checkWinner(temp)?.winner === 'P1') { move = idx; break; }
                }
            }

            // 3. Center
            if (move === -1 && board[4] === null) move = 4;

            // 4. Random
            if (move === -1) {
                move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            }
            
            handleClick(move);

        }, 800);
        return () => clearTimeout(timer);
    }
  }, [turn, vsComputer, board, winningLine, handleClick, checkWinner]);

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      <div className="mb-8 flex gap-6 text-xl font-bold text-slate-700">
         <motion.div 
            animate={turn === 'P1' ? { scale: 1.1, opacity: 1, y: -5 } : { scale: 0.9, opacity: 0.5, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-colors duration-300 ${turn === 'P1' ? 'bg-blue-100 text-blue-600 shadow-lg shadow-blue-100 ring-2 ring-blue-200' : 'bg-slate-50'}`}
         >
            <span className="text-2xl">❌</span> Player
         </motion.div>
         <motion.div 
            animate={turn === 'P2' ? { scale: 1.1, opacity: 1, y: -5 } : { scale: 0.9, opacity: 0.5, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-colors duration-300 ${turn === 'P2' ? 'bg-red-100 text-red-600 shadow-lg shadow-red-100 ring-2 ring-red-200' : 'bg-slate-50'}`}
         >
            <span className="text-2xl">⭕</span> {vsComputer ? 'CPU' : 'Player 2'}
         </motion.div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-200 rounded-2xl shadow-inner">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={!!cell || !!winningLine || (vsComputer && turn === 'P2')}
              className={`
                 w-24 h-24 sm:w-28 sm:h-28 rounded-xl text-6xl sm:text-7xl font-black flex items-center justify-center
                 transition-colors duration-200 relative overflow-hidden
                 ${!cell ? 'bg-slate-50 hover:bg-white shadow-sm' : 'bg-white shadow-md'}
              `}
            >
              <AnimatePresence mode="wait">
                {cell === 'P1' && (
                  <motion.span 
                    key="X"
                    initial={{ scale: 0.5, rotate: -180, opacity: 0 }} 
                    animate={{ scale: 1, rotate: 0, opacity: 1 }} 
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="text-blue-500 drop-shadow-sm"
                  >
                    X
                  </motion.span>
                )}
                {cell === 'P2' && (
                  <motion.span 
                    key="O"
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="text-red-500 drop-shadow-sm"
                  >
                    O
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>
        
        {/* Winning Line Overlay */}
        {winningLine && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" style={{ padding: '16px' }}>
                <motion.line
                    x1={winningLine[0] % 3 * 33 + 16 + '%'}
                    y1={Math.floor(winningLine[0] / 3) * 33 + 16 + '%'}
                    x2={winningLine[2] % 3 * 33 + 16 + '%'}
                    y2={Math.floor(winningLine[2] / 3) * 33 + 16 + '%'}
                    stroke="#FACC15"
                    strokeWidth="12"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </svg>
        )}
      </div>
    </div>
  );
};