import React, { useState, useEffect, useCallback } from 'react';
import { Player, Move } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import { audio } from '../services/audio';

interface CheckerPiece {
  id: string;
  player: Player;
  isKing: boolean;
}

// 8x8 Board
const SIZE = 8;

export const Checkers: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [board, setBoard] = useState<(CheckerPiece | null)[][]>([]);
  const [turn, setTurn] = useState<Player>('P1'); // P1 is Red (bottom), P2 is Black (top)
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  
  // Initialize
  useEffect(() => {
    const newBoard = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
    let idCounter = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) newBoard[r][c] = { id: `p2-${idCounter++}`, player: 'P2', isKing: false };
          if (r > 4) newBoard[r][c] = { id: `p1-${idCounter++}`, player: 'P1', isKing: false };
        }
      }
    }
    setBoard(newBoard);
  }, []);

  const isValidPos = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

  const getMoves = useCallback((b: (CheckerPiece | null)[][], player: Player, forceCapture: boolean = false) => {
    const moves: Move[] = [];
    let captureAvailable = false;

    // Scan all pieces
    for(let r=0; r<SIZE; r++){
        for(let c=0; c<SIZE; c++){
            const p = b[r][c];
            if(!p || p.player !== player) continue;

            const directions = [];
            if(p.player === 'P1' || p.isKing) directions.push(-1); // Up
            if(p.player === 'P2' || p.isKing) directions.push(1);  // Down
            
            // Check captures
            for(const dr of directions){
                for(const dc of [-1, 1]){
                    const jr = r + dr * 2;
                    const jc = c + dc * 2;
                    const mr = r + dr;
                    const mc = c + dc;

                    if(isValidPos(jr, jc) && b[jr][jc] === null && b[mr][mc] && b[mr][mc]?.player !== player){
                         moves.push({ from: {r, c}, to: {r: jr, c: jc} }); // Is capture
                         captureAvailable = true;
                    }
                }
            }
        }
    }

    // If capture is mandatory and available, return only captures
    if(captureAvailable) return { moves: moves.filter(m => Math.abs(m.to.r - (m.from!.r)) === 2), hasCapture: true };
    
    if(forceCapture) return { moves: [], hasCapture: false };

    // Normal moves
    for(let r=0; r<SIZE; r++){
        for(let c=0; c<SIZE; c++){
            const p = b[r][c];
            if(!p || p.player !== player) continue;
            
            const directions = [];
            if(p.player === 'P1' || p.isKing) directions.push(-1);
            if(p.player === 'P2' || p.isKing) directions.push(1);

             for(const dr of directions){
                for(const dc of [-1, 1]){
                    const nr = r + dr;
                    const nc = c + dc;
                    if(isValidPos(nr, nc) && b[nr][nc] === null){
                        moves.push({ from: {r, c}, to: {r: nr, c: nc} });
                    }
                }
             }
        }
    }

    return { moves, hasCapture: false };
  }, []);

  const handleSelect = (r: number, c: number) => {
    if(!board[r][c] || board[r][c]?.player !== turn) return;
    
    const { moves } = getMoves(board, turn);
    const pieceMoves = moves.filter(m => m.from?.r === r && m.from?.c === c);
    
    if(pieceMoves.length > 0) {
        setSelected({r, c});
        setValidMoves(pieceMoves);
    }
  };

  const handleMove = useCallback((m: Move) => {
     // Execute Move
     const newBoard = board.map(row => [...row]);
     const p = newBoard[m.from!.r][m.from!.c];
     if (!p) return;

     newBoard[m.to.r][m.to.c] = p;
     newBoard[m.from!.r][m.from!.c] = null;

     // Capture Logic
     let captured = false;
     if(Math.abs(m.to.r - m.from!.r) === 2){
         const mr = (m.to.r + m.from!.r) / 2;
         const mc = (m.to.c + m.from!.c) / 2;
         newBoard[mr][mc] = null; 
         captured = true;
         audio.play('capture');
     } else {
         audio.play('move');
     }

     // King Promotion
     if((p.player === 'P1' && m.to.r === 0) || (p.player === 'P2' && m.to.r === SIZE-1)){
         newBoard[m.to.r][m.to.c] = { ...p, isKing: true };
         if (!captured) audio.play('bell'); // Promotion sound
     }

     setBoard(newBoard);
     setSelected(null);
     setValidMoves([]);

     // Multi-jump logic check
     if(captured){
         const { moves, hasCapture } = getMoves(newBoard, turn, true);
         const followUp = moves.filter(mv => mv.from?.r === m.to.r && mv.from?.c === m.to.c);
         
         if(hasCapture && followUp.length > 0){
             if (turn === 'P2' && vsComputer) {
                 return;
             }
             if (!vsComputer || turn === 'P1') {
                 // Human must make next move
                 return; 
             }
         }
     }
     
     // Check Win
     const p1Count = newBoard.flat().filter(x => x?.player === 'P1').length;
     const p2Count = newBoard.flat().filter(x => x?.player === 'P2').length;
     
     if(p1Count === 0) onEnd('P2');
     else if(p2Count === 0) onEnd('P1');
     else setTurn(prev => prev === 'P1' ? 'P2' : 'P1');
  }, [board, turn, vsComputer, onEnd, getMoves]);


  // Bot Logic
  useEffect(() => {
    if (vsComputer && turn === 'P2') {
        const timer = setTimeout(() => {
            const { moves, hasCapture } = getMoves(board, 'P2');
            
            if (moves.length === 0) {
                onEnd('P1'); // No moves = Loss
                return;
            }

            let bestMove = moves[0];
            
            // Heuristic
            const kingMoves = moves.filter(m => m.to.r === SIZE - 1);
            if (kingMoves.length > 0) {
                bestMove = kingMoves[Math.floor(Math.random() * kingMoves.length)];
            } else {
                bestMove = moves[Math.floor(Math.random() * moves.length)];
            }
            
            handleMove(bestMove);

        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [turn, vsComputer, board, getMoves, handleMove, onEnd]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
       <div className="mb-6 flex gap-8 items-center justify-center">
           <motion.div 
               animate={turn === 'P1' ? { scale: 1.1, opacity: 1 } : { scale: 0.9, opacity: 0.5 }}
               className="transition-all duration-300"
           >
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-red-600 border-4 border-white shadow-lg mb-2"></div>
                <span className="font-bold text-slate-700">Red</span>
              </div>
           </motion.div>
           <motion.div 
               animate={turn === 'P2' ? { scale: 1.1, opacity: 1 } : { scale: 0.9, opacity: 0.5 }}
               className="transition-all duration-300"
           >
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-800 border-4 border-white shadow-lg mb-2"></div>
                <span className="font-bold text-slate-700">{vsComputer ? 'CPU' : 'Black'}</span>
              </div>
           </motion.div>
       </div>

       <div className="bg-amber-900 p-2 rounded-lg shadow-2xl relative">
          {board.map((row, r) => (
              <div key={r} className="flex">
                  {row.map((cell, c) => {
                      const isDark = (r + c) % 2 === 1;
                      const isValid = validMoves.some(m => m.to.r === r && m.to.c === c);
                      const isSelected = selected?.r === r && selected?.c === c;

                      return (
                          <div 
                             key={`${r}-${c}`}
                             onClick={() => {
                                 if (vsComputer && turn === 'P2') return;
                                 if(isValid) handleMove(validMoves.find(m => m.to.r === r && m.to.c === c)!);
                                 else handleSelect(r, c);
                             }}
                             className={`
                                w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 flex items-center justify-center relative
                                ${isDark ? 'bg-[#5D4037]' : 'bg-[#D7CCC8]'}
                             `}
                          >
                             {/* Valid Move Indicator */}
                             {isValid && (
                               <motion.div 
                                 initial={{ scale: 0 }}
                                 animate={{ scale: 1 }}
                                 className="w-4 h-4 bg-green-500 rounded-full z-10 shadow-lg shadow-green-500/50 cursor-pointer hover:scale-125 transition-transform" 
                               />
                             )}
                             
                             {/* Piece */}
                             <AnimatePresence>
                               {cell && (
                                   <motion.div 
                                      layoutId={cell.id}
                                      initial={{ scale: 0 }}
                                      animate={{ scale: isSelected ? 1.15 : 1, zIndex: isSelected ? 50 : 20 }}
                                      exit={{ scale: [1, 1.2, 0], opacity: 0, transition: { duration: 0.3 } }}
                                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                      className={`
                                        w-[85%] h-[85%] rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.4)]
                                        flex items-center justify-center relative
                                        ${cell.player === 'P1' 
                                            ? 'bg-gradient-to-br from-red-500 to-red-700 ring-2 ring-red-900' 
                                            : 'bg-gradient-to-br from-slate-700 to-slate-900 ring-2 ring-black'}
                                        ${isSelected ? 'ring-4 ring-yellow-400' : ''}
                                      `}
                                   >
                                       {/* Inner detail for 3D effect */}
                                       <div className="absolute inset-2 rounded-full border-2 border-white/10"></div>
                                       
                                       {/* King Icon */}
                                       {cell.isKing && (
                                          <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring" }}
                                          >
                                             <Crown className="w-5 h-5 text-yellow-400 drop-shadow-md" />
                                          </motion.div>
                                       )}
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
