import React, { useState, useEffect, useCallback } from 'react';
import { Player, Move } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audio';

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
interface Piece {
  id: string;
  type: PieceType;
  player: Player;
}

const SIZE = 8;
const SYMBOLS: Record<string, string> = {
  'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
};
const VALUES: Record<string, number> = {
  'p': 1, 'r': 5, 'n': 3, 'b': 3, 'q': 9, 'k': 100
};

export const Chess: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [board, setBoard] = useState<(Piece | null)[][]>([]);
  const [turn, setTurn] = useState<Player>('P1');
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [checkState, setCheckState] = useState<{inCheck: boolean, player: Player | null}>({ inCheck: false, player: null });

  useEffect(() => {
     const b = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
     const setup = (row: number, p: Player, types: PieceType[]) => {
         types.forEach((t, c) => { b[row][c] = { id: `${p}-${t}-${c}`, type: t, player: p } });
     };
     const royal = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'] as PieceType[];
     setup(0, 'P2', royal);
     setup(1, 'P2', Array(8).fill('p'));
     setup(6, 'P1', Array(8).fill('p'));
     setup(7, 'P1', royal);
     setBoard(b);
  }, []);

  const isValidPos = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

  // --- Move Generation ---
  
  const getPseudoMoves = useCallback((b: (Piece | null)[][], r: number, c: number): Move[] => {
      const p = b[r][c];
      if (!p) return [];
      const moves: Move[] = [];
      const isP1 = p.player === 'P1'; // P1 (White) moves Up (-1)

      if (p.type === 'p') {
          const dir = isP1 ? -1 : 1;
          const startRow = isP1 ? 6 : 1;
          
          // Forward 1
          if (isValidPos(r + dir, c) && !b[r + dir][c]) {
              moves.push({ from: {r,c}, to: {r: r + dir, c} });
              // Forward 2 (First move only)
              if (r === startRow && isValidPos(r + dir * 2, c) && !b[r + dir * 2][c]) {
                   moves.push({ from: {r,c}, to: {r: r + dir * 2, c} });
              }
          }
          // Capture Diagonally
          [[dir, -1], [dir, 1]].forEach(([dr, dc]) => {
              if (isValidPos(r + dr, c + dc)) {
                  const target = b[r + dr][c + dc];
                  if (target && target.player !== p.player) {
                      moves.push({ from: {r,c}, to: {r: r + dr, c: c + dc} });
                  }
              }
          });
      }
      else if (p.type === 'n') {
          const jumps = [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]];
          jumps.forEach(([dr, dc]) => {
              const nr = r + dr, nc = c + dc;
              if (isValidPos(nr, nc)) {
                  if (!b[nr][nc] || b[nr][nc]?.player !== p.player) {
                      moves.push({ from: {r,c}, to: {r: nr, c: nc} });
                  }
              }
          });
      }
      else if (p.type === 'k') {
          const steps = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
          steps.forEach(([dr, dc]) => {
              const nr = r + dr, nc = c + dc;
              if (isValidPos(nr, nc)) {
                  if (!b[nr][nc] || b[nr][nc]?.player !== p.player) {
                      moves.push({ from: {r,c}, to: {r: nr, c: nc} });
                  }
              }
          });
      }
      else {
          // Sliding (Rook, Bishop, Queen)
          const dirs = [];
          if (p.type === 'r' || p.type === 'q') dirs.push([0,1],[0,-1],[1,0],[-1,0]);
          if (p.type === 'b' || p.type === 'q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);

          dirs.forEach(([dr, dc]) => {
              let i = 1;
              while (true) {
                  const nr = r + dr * i, nc = c + dc * i;
                  if (!isValidPos(nr, nc)) break;
                  const target = b[nr][nc];
                  if (!target) {
                      moves.push({ from: {r,c}, to: {r: nr, c: nc} });
                  } else {
                      if (target.player !== p.player) moves.push({ from: {r,c}, to: {r: nr, c: nc} });
                      break; // Blocked
                  }
                  i++;
              }
          });
      }
      return moves;
  }, []);

  const isKingInCheck = useCallback((b: (Piece | null)[][], player: Player) => {
      // Locate King
      let kr = -1, kc = -1;
      for(let r=0; r<SIZE; r++) {
          for(let c=0; c<SIZE; c++) {
              if (b[r][c]?.type === 'k' && b[r][c]?.player === player) {
                  kr = r; kc = c; break;
              }
          }
      }
      if (kr === -1) return false;

      // Check if any enemy can hit King
      const enemy = player === 'P1' ? 'P2' : 'P1';
      for(let r=0; r<SIZE; r++) {
          for(let c=0; c<SIZE; c++) {
              if (b[r][c]?.player === enemy) {
                  const moves = getPseudoMoves(b, r, c);
                  if (moves.some(m => m.to.r === kr && m.to.c === kc)) return true;
              }
          }
      }
      return false;
  }, [getPseudoMoves]);

  const getLegalMoves = useCallback((b: (Piece | null)[][], r: number, c: number) => {
      const pseudo = getPseudoMoves(b, r, c);
      const p = b[r][c]!;
      // Filter moves that leave King in check
      return pseudo.filter(m => {
          const clone = b.map(row => [...row]);
          clone[m.to.r][m.to.c] = clone[m.from!.r][m.from!.c];
          clone[m.from!.r][m.from!.c] = null;
          return !isKingInCheck(clone, p.player);
      });
  }, [getPseudoMoves, isKingInCheck]);

  const hasMoves = useCallback((b: (Piece | null)[][], player: Player) => {
      for(let r=0; r<SIZE; r++) {
          for(let c=0; c<SIZE; c++) {
              if (b[r][c]?.player === player) {
                  if (getLegalMoves(b, r, c).length > 0) return true;
              }
          }
      }
      return false;
  }, [getLegalMoves]);

  const handleClick = (r: number, c: number) => {
      if (vsComputer && turn === 'P2') return;

      // Select or Move
      if (validMoves.some(m => m.to.r === r && m.to.c === c)) {
          executeMove({ from: selected!, to: {r, c} });
      } else {
          const p = board[r][c];
          if (p && p.player === turn) {
              setSelected({r, c});
              setValidMoves(getLegalMoves(board, r, c));
          } else {
              setSelected(null);
              setValidMoves([]);
          }
      }
  };

  const executeMove = useCallback((m: Move) => {
      const newBoard = board.map(row => [...row]);
      const p = newBoard[m.from!.r][m.from!.c]!;
      const target = newBoard[m.to.r][m.to.c];
      
      newBoard[m.to.r][m.to.c] = p;
      newBoard[m.from!.r][m.from!.c] = null;

      if (target) audio.play('capture');
      else audio.play('move');

      // Promotion (Auto-Queen)
      if (p.type === 'p') {
          if ((p.player === 'P1' && m.to.r === 0) || (p.player === 'P2' && m.to.r === SIZE-1)) {
              newBoard[m.to.r][m.to.c] = { ...p, type: 'q' };
              audio.play('bell');
          }
      }

      setBoard(newBoard);
      setSelected(null);
      setValidMoves([]);
      
      const nextTurn = turn === 'P1' ? 'P2' : 'P1';
      const inCheck = isKingInCheck(newBoard, nextTurn);
      const canMove = hasMoves(newBoard, nextTurn);

      setCheckState({ inCheck, player: inCheck ? nextTurn : null });

      if (inCheck) audio.play('check');

      if (!canMove) {
          if (inCheck) onEnd(turn); // Checkmate
          else onEnd(null); // Stalemate
      } else {
          setTurn(nextTurn);
      }
  }, [board, turn, isKingInCheck, hasMoves, onEnd]);

  // Bot Logic
  useEffect(() => {
    if (vsComputer && turn === 'P2') {
        const timer = setTimeout(() => {
            const allMoves: { move: Move, score: number }[] = [];
            
            // Gather all legal moves
            for(let r=0; r<SIZE; r++) {
                for(let c=0; c<SIZE; c++) {
                    if (board[r][c]?.player === 'P2') {
                        const moves = getLegalMoves(board, r, c);
                        moves.forEach(m => {
                            let score = 0;
                            const target = board[m.to.r][m.to.c];
                            if (target) {
                                score += VALUES[target.type] * 10;
                            }
                            // Small random factor to avoid repetition
                            score += Math.random();
                            allMoves.push({ move: m, score });
                        });
                    }
                }
            }

            if (allMoves.length === 0) return; // Should satisfy checkmate check in previous turn

            // Sort descending
            allMoves.sort((a, b) => b.score - a.score);
            executeMove(allMoves[0].move);

        }, 800);
        return () => clearTimeout(timer);
    }
  }, [turn, vsComputer, board, getLegalMoves, executeMove]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
       <div className="mb-4 flex items-center gap-4 h-10">
           {checkState.inCheck && (
               <div className="bg-red-500 text-white px-4 py-1 rounded-full font-bold animate-pulse shadow">CHECK!</div>
           )}
           <div className="text-slate-500 font-bold">
               {turn === 'P1' ? 'White to Move' : (vsComputer ? 'CPU Thinking...' : 'Black to Move')}
           </div>
       </div>

       <div className="bg-[#785440] p-3 rounded-lg shadow-2xl">
          {board.map((row, r) => (
              <div key={r} className="flex">
                  {row.map((cell, c) => {
                      const isDark = (r + c) % 2 === 1;
                      const isSelected = selected?.r === r && selected?.c === c;
                      const isValid = validMoves.some(m => m.to.r === r && m.to.c === c);
                      const isKingDanger = cell?.type === 'k' && checkState.inCheck && cell.player === checkState.player;

                      return (
                          <div 
                             key={`${r}-${c}`}
                             onClick={() => handleClick(r, c)}
                             className={`
                                w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center relative
                                ${isDark ? 'bg-[#b88b68]' : 'bg-[#eccfa4]'}
                                ${isSelected ? 'bg-yellow-200 ring-inset ring-4 ring-yellow-400' : ''}
                                ${isKingDanger ? 'bg-red-400' : ''}
                             `}
                          >
                              {isValid && !cell && <motion.div initial={{scale:0}} animate={{scale:1}} className="w-3 h-3 bg-black/20 rounded-full" />}
                              {isValid && cell && <div className="absolute inset-0 border-4 border-black/20" />}
                              
                              <AnimatePresence>
                                  {cell && (
                                      <motion.div
                                        layoutId={cell.id}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: isSelected ? 1.2 : 1, zIndex: isSelected ? 50 : 10 }}
                                        exit={{ scale: 0, rotate: 180, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        className={`text-4xl select-none relative z-20 cursor-pointer ${cell.player === 'P1' ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_1px_0px_rgba(255,255,255,0.4)]'}`}
                                      >
                                          {SYMBOLS[cell.type]}
                                      </motion.div>
                                  )}
                              </AnimatePresence>
                          </div>
                      );
                  })}
              </div>
          ))}
       </div>
    </div>
  );
};
