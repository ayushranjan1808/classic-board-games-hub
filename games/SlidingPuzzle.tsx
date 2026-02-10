import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../types';
import { motion } from 'framer-motion';
import { audio } from '../services/audio';
import { Trophy, Timer, RotateCcw, Move } from 'lucide-react';

const GRID_SIZE = 4;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

// 1-15, 0 is empty
type Tile = number;

export const SlidingPuzzle: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd }) => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Logic ---

  // Check if board is solved (1, 2, 3... 15, 0)
  const checkWin = useCallback((currentTiles: Tile[]) => {
    for (let i = 0; i < CELL_COUNT - 1; i++) {
      if (currentTiles[i] !== i + 1) return false;
    }
    return currentTiles[CELL_COUNT - 1] === 0;
  }, []);

  // Initialize Board
  const initBoard = useCallback(() => {
    // Start with solved state
    let newTiles = Array.from({ length: CELL_COUNT }, (_, i) => (i + 1) % CELL_COUNT);
    let emptyIdx = CELL_COUNT - 1;
    let previousIdx = -1;

    // Shuffle by simulating valid moves to guarantee solvability
    // 200 random valid moves
    for (let i = 0; i < 200; i++) {
        const neighbors = [];
        const row = Math.floor(emptyIdx / GRID_SIZE);
        const col = emptyIdx % GRID_SIZE;

        if (row > 0) neighbors.push(emptyIdx - GRID_SIZE); // Up
        if (row < GRID_SIZE - 1) neighbors.push(emptyIdx + GRID_SIZE); // Down
        if (col > 0) neighbors.push(emptyIdx - 1); // Left
        if (col < GRID_SIZE - 1) neighbors.push(emptyIdx + 1); // Right

        // Don't undo immediate last move to ensure good shuffling
        const validNeighbors = neighbors.filter(n => n !== previousIdx);
        const randomNeighbor = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];

        // Swap
        newTiles[emptyIdx] = newTiles[randomNeighbor];
        newTiles[randomNeighbor] = 0;
        
        previousIdx = emptyIdx;
        emptyIdx = randomNeighbor;
    }

    setTiles(newTiles);
    setMoves(0);
    setSeconds(0);
    setIsSolved(false);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Timer
  useEffect(() => {
    if (!isPlaying || isSolved) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isSolved]);

  const handleTileClick = (index: number) => {
    if (isSolved) return;

    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const emptyRow = Math.floor(emptyIndex / GRID_SIZE);
    const emptyCol = emptyIndex % GRID_SIZE;

    // Check adjacency (Manhattan distance === 1)
    const dist = Math.abs(row - emptyRow) + Math.abs(col - emptyCol);
    
    if (dist === 1) {
      audio.play('move');
      
      const newTiles = [...tiles];
      newTiles[emptyIndex] = newTiles[index];
      newTiles[index] = 0;
      
      setTiles(newTiles);
      setMoves(m => m + 1);

      if (checkWin(newTiles)) {
        setIsSolved(true);
        audio.play('win');
        setTimeout(() => onEnd('P1'), 1500);
      }
    } else {
        // audio.play('error'); // Optional: feedback for invalid move
    }
  };

  const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (tiles.length === 0) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto">
      {/* Stats Bar */}
      <div className="flex items-center justify-between w-full mb-6 px-4">
        <div className="bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm border border-slate-200">
           <Move className="w-4 h-4 text-blue-500" />
           <span className="font-bold text-slate-700">{moves} <span className="text-xs text-slate-400 font-normal">MOVES</span></span>
        </div>
        
        {isSolved && (
            <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 animate-bounce">
                <Trophy className="w-4 h-4" /> SOLVED!
            </div>
        )}

        <div className="bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm border border-slate-200">
           <Timer className="w-4 h-4 text-purple-500" />
           <span className="font-bold text-slate-700">{formatTime(seconds)}</span>
        </div>
      </div>

      {/* Board */}
      <div className="relative p-2 bg-slate-800 rounded-2xl shadow-2xl border-b-8 border-slate-900">
          <div 
            className="grid gap-2"
            style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                width: 'min(80vw, 320px)',
                height: 'min(80vw, 320px)',
            }}
          >
              {tiles.map((num, i) => {
                  if (num === 0) {
                      return <div key="empty" className="w-full h-full" />;
                  }
                  
                  // Calculate correct position for 0-indexed sorted state to determine color hint?
                  // For now, simple elegant styling.
                  const isCorrectPos = num === i + 1;

                  return (
                      <motion.button
                          key={num}
                          layoutId={`tile-${num}`}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          onClick={() => handleTileClick(i)}
                          className={`
                            relative w-full h-full rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-black shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all
                            ${isCorrectPos && isSolved ? 'bg-green-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}
                          `}
                      >
                          {num}
                          {/* Inner bevel highlight */}
                          <div className="absolute inset-0 rounded-xl border-t border-l border-white/50 pointer-events-none"></div>
                      </motion.button>
                  );
              })}
          </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex gap-4">
          <button 
             onClick={initBoard}
             className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition-colors"
          >
             <RotateCcw className="w-4 h-4" /> Shuffle
          </button>
      </div>

      <div className="mt-4 text-center text-xs text-slate-400 max-w-xs">
         Order the tiles from 1 to 15. The empty space should end up in the bottom-right corner.
      </div>
    </div>
  );
};
