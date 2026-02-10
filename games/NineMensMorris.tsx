import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audio';

// --- Graph & Geometry ---
const NODES = [
  { id: 0, x: 0, y: 0 }, { id: 1, x: 3, y: 0 }, { id: 2, x: 6, y: 0 },
  { id: 3, x: 1, y: 1 }, { id: 4, x: 3, y: 1 }, { id: 5, x: 5, y: 1 },
  { id: 6, x: 2, y: 2 }, { id: 7, x: 3, y: 2 }, { id: 8, x: 4, y: 2 },
  { id: 9, x: 0, y: 3 }, { id: 10, x: 1, y: 3 }, { id: 11, x: 2, y: 3 }, { id: 12, x: 4, y: 3 }, { id: 13, x: 5, y: 3 }, { id: 14, x: 6, y: 3 },
  { id: 15, x: 2, y: 4 }, { id: 16, x: 3, y: 4 }, { id: 17, x: 4, y: 4 },
  { id: 18, x: 1, y: 5 }, { id: 19, x: 3, y: 5 }, { id: 20, x: 5, y: 5 },
  { id: 21, x: 0, y: 6 }, { id: 22, x: 3, y: 6 }, { id: 23, x: 6, y: 6 },
];

const ADJACENCY: Record<number, number[]> = {
  0: [1, 9], 1: [0, 2, 4], 2: [1, 14],
  3: [4, 10], 4: [1, 3, 5, 7], 5: [4, 13],
  6: [7, 11], 7: [4, 6, 8], 8: [7, 12],
  9: [0, 10, 21], 10: [3, 9, 11, 18], 11: [6, 10, 15], 12: [8, 13, 17], 13: [5, 12, 14, 20], 14: [2, 13, 23],
  15: [11, 16], 16: [15, 17, 19], 17: [12, 16],
  18: [10, 19], 19: [16, 18, 20, 22], 20: [13, 19],
  21: [9, 22], 22: [19, 21, 23], 23: [14, 22]
};

const MILLS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], 
  [9, 10, 11], [12, 13, 14],       
  [15, 16, 17], [18, 19, 20], [21, 22, 23], 
  [0, 9, 21], [3, 10, 18], [6, 11, 15], 
  [1, 4, 7], [16, 19, 22],          
  [8, 12, 17], [5, 13, 20], [2, 14, 23] 
];

type Phase = 'PLACING' | 'MOVING' | 'FLYING' | 'REMOVING';

export const NineMensMorris: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [board, setBoard] = useState<(Player | null)[]>(Array(24).fill(null));
  const [turn, setTurn] = useState<Player>('P1');
  const [phase, setPhase] = useState<Phase>('PLACING');
  const [prevPhase, setPrevPhase] = useState<Phase>('PLACING');
  const [piecesPlaced, setPiecesPlaced] = useState({ P1: 0, P2: 0 });
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  const getPiecesOnBoard = (p: Player) => board.filter(cell => cell === p).length;

  const checkMillFormed = useCallback((nodeId: number, player: Player, currentBoard: (Player | null)[]) => {
    const possibleMills = MILLS.filter(m => m.includes(nodeId));
    return possibleMills.some(mill => mill.every(n => currentBoard[n] === player));
  }, []);

  const hasLegalMoves = useCallback((player: Player, currentBoard: (Player | null)[]) => {
    if (getPiecesOnBoard(player) === 3 && piecesPlaced[player] === 9) {
        return currentBoard.some(c => c === null);
    }
    for (let i = 0; i < 24; i++) {
        if (currentBoard[i] === player) {
            const neighbors = ADJACENCY[i];
            if (neighbors.some(n => currentBoard[n] === null)) return true;
        }
    }
    return false;
  }, [piecesPlaced, board]);

  const handleNodeClick = useCallback((nodeId: number) => {
    if (phase === 'REMOVING') {
       handleRemovePiece(nodeId);
       return;
    }

    if (phase === 'PLACING') {
       if (board[nodeId] !== null) return;
       
       audio.play('move');
       const newBoard = [...board];
       newBoard[nodeId] = turn;
       setBoard(newBoard);
       
       const newPiecesPlaced = { ...piecesPlaced, [turn]: piecesPlaced[turn] + 1 };
       setPiecesPlaced(newPiecesPlaced);

       if (checkMillFormed(nodeId, turn, newBoard)) {
           setPrevPhase('PLACING');
           setPhase('REMOVING');
           audio.play('bell');
       } else {
           endTurn(newBoard, newPiecesPlaced);
       }
    } 
    else if (phase === 'MOVING' || phase === 'FLYING') {
       if (board[nodeId] === turn) {
           setSelectedNode(nodeId);
       }
       else if (board[nodeId] === null && selectedNode !== null) {
           const isAdjacent = ADJACENCY[selectedNode].includes(nodeId);
           const isFlying = phase === 'FLYING';
           
           if (isAdjacent || isFlying) {
               audio.play('move');
               const newBoard = [...board];
               newBoard[selectedNode] = null;
               newBoard[nodeId] = turn;
               setBoard(newBoard);
               setSelectedNode(null);

               if (checkMillFormed(nodeId, turn, newBoard)) {
                   setPrevPhase(phase);
                   setPhase('REMOVING');
                   audio.play('bell');
               } else {
                   endTurn(newBoard, piecesPlaced);
               }
           }
       }
    }
  }, [board, phase, selectedNode, turn, piecesPlaced, checkMillFormed]);

  const handleRemovePiece = (nodeId: number) => {
      const target = board[nodeId];
      if (target === null || target === turn) return; 

      const isInMill = checkMillFormed(nodeId, target, board);
      if (isInMill) {
          const opponent = turn === 'P1' ? 'P2' : 'P1';
          const opponentNodes = board.map((p, i) => p === opponent ? i : -1).filter(i => i !== -1);
          const allInMill = opponentNodes.every(n => checkMillFormed(n, opponent, board));
          if (!allInMill) return; 
      }

      audio.play('capture');
      const newBoard = [...board];
      newBoard[nodeId] = null;
      setBoard(newBoard);
      
      const opponent = turn === 'P1' ? 'P2' : 'P1';
      const oppPieces = newBoard.filter(p => p === opponent).length;
      
      if (piecesPlaced[opponent] === 9 && oppPieces < 3) {
          onEnd(turn);
          return;
      }
      
      if (piecesPlaced[opponent] === 9 && !hasLegalMoves(opponent, newBoard)) {
          onEnd(turn);
          return;
      }

      endTurn(newBoard, piecesPlaced, true);
  };

  const endTurn = (currentBoard: (Player | null)[], currentPlaced: {P1: number, P2: number}, fromRemove: boolean = false) => {
      const nextPlayer = turn === 'P1' ? 'P2' : 'P1';
      setTurn(nextPlayer);
      setSelectedNode(null);

      if (currentPlaced.P1 < 9 || currentPlaced.P2 < 9) {
          setPhase('PLACING');
      } else {
          const count = currentBoard.filter(p => p === nextPlayer).length;
          if (count === 3) setPhase('FLYING');
          else setPhase('MOVING');
      }
      
      if (currentPlaced[nextPlayer] === 9 && !hasLegalMoves(nextPlayer, currentBoard)) {
          onEnd(turn);
      }
  };

  // Bot Logic
  useEffect(() => {
    if (vsComputer && turn === 'P2') {
        const timer = setTimeout(() => {
            if (phase === 'PLACING') {
                const empty = board.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
                let move = -1;
                move = empty.find(i => {
                     const t = [...board]; t[i] = 'P2'; return checkMillFormed(i, 'P2', t);
                }) ?? -1;
                if (move === -1) {
                    move = empty.find(i => {
                        const t = [...board]; t[i] = 'P1'; return checkMillFormed(i, 'P1', t);
                    }) ?? -1;
                }
                if (move === -1) move = empty[Math.floor(Math.random() * empty.length)];
                handleNodeClick(move);
            } 
            else if (phase === 'MOVING' || phase === 'FLYING') {
                const myPieces = board.map((c, i) => c === 'P2' ? i : -1).filter(i => i !== -1);
                let allMoves: {from: number, to: number, score: number}[] = [];
                
                myPieces.forEach(from => {
                    const targets = phase === 'FLYING' ? board.map((c, i) => c === null ? i : -1).filter(i => i !== -1) : ADJACENCY[from].filter(n => board[n] === null);
                    targets.forEach(to => {
                        let score = 0;
                        const temp = [...board];
                        temp[from] = null;
                        temp[to] = 'P2';
                        if (checkMillFormed(to, 'P2', temp)) score += 100;
                        const temp2 = [...board]; temp2[to] = 'P1'; 
                        if (checkMillFormed(to, 'P1', temp2)) score += 50;

                        allMoves.push({from, to, score});
                    });
                });

                if (allMoves.length > 0) {
                    allMoves.sort((a, b) => b.score - a.score);
                    handleNodeClick(allMoves[0].from);
                    setTimeout(() => handleNodeClick(allMoves[0].to), 300);
                }
            } 
            else if (phase === 'REMOVING') {
                const enemies = board.map((c, i) => c === 'P1' ? i : -1).filter(i => i !== -1);
                const validTargets = enemies.filter(i => {
                    const inMill = checkMillFormed(i, 'P1', board);
                    if (!inMill) return true;
                    return enemies.every(e => checkMillFormed(e, 'P1', board));
                });
                
                if (validTargets.length > 0) {
                    handleNodeClick(validTargets[Math.floor(Math.random() * validTargets.length)]);
                }
            }
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [turn, vsComputer, phase, board, piecesPlaced, handleNodeClick, checkMillFormed]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto">
      {/* HUD */}
      <div className="flex items-center justify-between w-full mb-6 px-4">
          <div className={`flex flex-col items-center transition-opacity ${turn === 'P1' ? 'opacity-100 scale-110' : 'opacity-50'}`}>
              <div className="w-10 h-10 rounded-full bg-red-600 border-4 border-white shadow-lg mb-1 relative">
                  <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-white">
                      {9 - piecesPlaced.P1 > 0 ? 9 - piecesPlaced.P1 : getPiecesOnBoard('P1')}
                  </span>
              </div>
              <span className="font-bold text-slate-700 text-xs">Player 1</span>
          </div>

          <div className="flex flex-col items-center">
              <div className="text-lg font-black text-slate-800 uppercase tracking-widest">{phase}</div>
              <div className="text-xs font-bold text-slate-400">
                  {phase === 'REMOVING' ? 'Remove Opponent Piece!' : 
                   phase === 'PLACING' ? 'Place a Piece' : (turn === 'P2' && vsComputer ? 'CPU Moving...' : 'Move a Piece')}
              </div>
          </div>

          <div className={`flex flex-col items-center transition-opacity ${turn === 'P2' ? 'opacity-100 scale-110' : 'opacity-50'}`}>
              <div className="w-10 h-10 rounded-full bg-slate-800 border-4 border-white shadow-lg mb-1 relative">
                  <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-white">
                      {9 - piecesPlaced.P2 > 0 ? 9 - piecesPlaced.P2 : getPiecesOnBoard('P2')}
                  </span>
              </div>
              <span className="font-bold text-slate-700 text-xs">{vsComputer ? 'CPU' : 'Player 2'}</span>
          </div>
      </div>

      {/* BOARD */}
      <div className="relative aspect-square w-full bg-[#e6d5b8] rounded-xl shadow-2xl border-8 border-[#8b5a2b] p-4 sm:p-8">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-multiply pointer-events-none"></div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
             <rect x="10" y="10" width="80" height="80" fill="none" stroke="#5d4037" strokeWidth="2" />
             <rect x="25" y="25" width="50" height="50" fill="none" stroke="#5d4037" strokeWidth="2" />
             <rect x="40" y="40" width="20" height="20" fill="none" stroke="#5d4037" strokeWidth="2" />
             <line x1="50" y1="10" x2="50" y2="40" stroke="#5d4037" strokeWidth="2" />
             <line x1="50" y1="60" x2="50" y2="90" stroke="#5d4037" strokeWidth="2" />
             <line x1="10" y1="50" x2="40" y2="50" stroke="#5d4037" strokeWidth="2" />
             <line x1="60" y1="50" x2="90" y2="50" stroke="#5d4037" strokeWidth="2" />
          </svg>

          {/* Nodes */}
          {NODES.map((node) => {
              const p = board[node.id];
              const mapCoord = (c: number) => {
                  if (c === 0) return 10;
                  if (c === 1) return 25;
                  if (c === 2) return 40;
                  if (c === 3) return 50;
                  if (c === 4) return 60;
                  if (c === 5) return 75;
                  if (c === 6) return 90;
                  return 50;
              };

              const left = mapCoord(node.x);
              const top = mapCoord(node.y);
              
              const isSelected = selectedNode === node.id;
              const isTargetable = 
                  (!vsComputer || turn === 'P1' || phase === 'REMOVING') && (
                  (phase === 'PLACING' && !p) ||
                  (phase === 'MOVING' && !p && selectedNode !== null && ADJACENCY[selectedNode].includes(node.id)) ||
                  (phase === 'FLYING' && !p && selectedNode !== null) ||
                  (phase === 'REMOVING' && p && p !== turn));
              
              const isRemovable = phase === 'REMOVING' && p && p !== turn;

              return (
                  <div 
                     key={node.id}
                     onClick={() => {
                         if (!isTargetable && !(board[node.id] === turn && (phase === 'MOVING' || phase === 'FLYING'))) return;
                         handleNodeClick(node.id)
                     }}
                     className="absolute w-6 h-6 sm:w-8 sm:h-8 -ml-3 -mt-3 sm:-ml-4 sm:-mt-4 rounded-full z-10 flex items-center justify-center cursor-pointer transition-all"
                     style={{ left: `${left}%`, top: `${top}%` }}
                  >
                      <div className={`absolute inset-0 w-full h-full transform scale-150 rounded-full ${isTargetable ? 'bg-black/10' : ''}`}></div>

                      <div className={`
                         relative w-full h-full rounded-full shadow-md flex items-center justify-center border-2
                         ${p === 'P1' ? 'bg-red-600 border-red-800' : p === 'P2' ? 'bg-slate-800 border-black' : 'bg-[#5d4037] border-[#3e2723] scale-50'}
                         ${isSelected ? 'ring-4 ring-yellow-400 z-20 scale-110' : ''}
                         ${isRemovable ? 'animate-pulse ring-4 ring-red-500 z-20' : ''}
                      `}>
                          {p && <div className="w-[40%] h-[40%] bg-white/20 rounded-full"></div>}
                      </div>

                      {isTargetable && !p && phase !== 'REMOVING' && (
                          <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`absolute w-4 h-4 rounded-full opacity-50 ${turn === 'P1' ? 'bg-red-400' : 'bg-slate-500'}`}
                          />
                      )}
                      
                      <AnimatePresence>
                          {p && (
                              <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="absolute inset-0 rounded-full"
                                  style={{
                                      backgroundColor: p === 'P1' ? '#dc2626' : '#1e293b'
                                  }}
                              />
                          )}
                      </AnimatePresence>
                  </div>
              );
          })}
      </div>
    </div>
  );
};
