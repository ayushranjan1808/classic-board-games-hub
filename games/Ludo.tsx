import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Star, MoveRight, MoveDown, MoveLeft, MoveUp, Users, RotateCcw, Bot, Settings } from 'lucide-react';
import { audio } from '../services/audio';

// --- Geometry & Constants ---

type LudoColor = 'red' | 'green' | 'yellow' | 'blue';
type Coord = [number, number];

// GRID: 15x15 (0-14 indices)

// Base Token Anchors
const BASE_POSITIONS: Record<LudoColor, Coord[]> = {
    red:    [[1,1], [1,4], [4,1], [4,4]],
    green:  [[1,10], [1,13], [4,10], [4,13]],
    yellow: [[10,10], [10,13], [13,10], [13,13]],
    blue:   [[10,1], [10,4], [13,1], [13,4]]
};

// Main Path
const MAIN_PATH: Coord[] = [
  // Red Arm
  [6,1], [6,2], [6,3], [6,4], [6,5], 
  [5,6], [4,6], [3,6], [2,6], [1,6], [0,6],
  [0,7], [0,8],
  // Green Arm
  [1,8], [2,8], [3,8], [4,8], [5,8],
  [6,9], [6,10], [6,11], [6,12], [6,13], [6,14],
  [7,14], [8,14],
  // Yellow Arm
  [8,13], [8,12], [8,11], [8,10], [8,9],
  [9,8], [10,8], [11,8], [12,8], [13,8], [14,8],
  [14,7], [14,6],
  // Blue Arm
  [13,6], [12,6], [11,6], [10,6], [9,6],
  [8,5], [8,4], [8,3], [8,2], [8,1], [8,0],
  [7,0], [6,0]
];

// Home Paths
const HOME_PATHS: Record<LudoColor, Coord[]> = {
  red:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green:  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue:   [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

const START_INDICES: Record<LudoColor, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

interface Token {
  id: string;
  player: Player;
  color: LudoColor;
  position: number; // -1: Base. 0-51: Main. 100+: Home.
}

export const Ludo: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [setupMode, setSetupMode] = useState(true);
  const [numPlayers, setNumPlayers] = useState<2 | 3 | 4>(2);
  const [activeColors, setActiveColors] = useState<LudoColor[]>([]);
  
  const [tokens, setTokens] = useState<Token[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [log, setLog] = useState("Setup Game");

  const activeColor = activeColors[turnIndex];

  // --- Logic ---

  const startGame = (players: 2 | 3 | 4) => {
    let colors: LudoColor[] = [];
    if (players === 2) colors = ['red', 'yellow'];
    else if (players === 3) colors = ['red', 'green', 'yellow'];
    else colors = ['red', 'green', 'yellow', 'blue'];

    const newTokens: Token[] = [];
    colors.forEach((c) => {
      const pid: Player = c === 'red' ? 'P1' : c === 'green' ? 'P2' : c === 'yellow' ? (players === 2 ? 'P2' : 'P3') : 'P4';
      for(let i=0; i<4; i++) {
        newTokens.push({ id: `${c}-${i}`, color: c, player: pid, position: -1 });
      }
    });

    setActiveColors(colors);
    setTokens(newTokens);
    setNumPlayers(players);
    setTurnIndex(0);
    setSetupMode(false);
    setLog(`${colors[0].toUpperCase()} Starts!`);
  };

  const getTargetPosition = (t: Token, roll: number) => {
      if (t.position === -1) {
          return roll === 6 ? START_INDICES[t.color] : -1;
      }
      if (t.position >= 100) {
          const homeIdx = t.position - 100;
          return (homeIdx + roll <= 5) ? t.position + roll : t.position;
      }
      const start = START_INDICES[t.color];
      let stepsMoved = t.position >= start ? t.position - start : (52 - start) + t.position;
      
      if (stepsMoved + roll <= 50) {
          return (t.position + roll) % 52;
      } else {
          const stepsToEntry = 50 - stepsMoved;
          const remaining = roll - stepsToEntry;
          return remaining <= 6 ? 100 + (remaining - 1) : t.position;
      }
  };

  const calcMoves = useCallback((roll: number, color: LudoColor) => {
      const myTokens = tokens.filter(t => t.color === color);
      const moves: string[] = [];
      let canMove = false;

      myTokens.forEach(t => {
          // Already in goal
          if (t.position >= 100 && (t.position - 100) === 5) return; 

          if (t.position === -1) {
              if (roll === 6) { moves.push(t.id); canMove = true; }
              return;
          }

          let stepsMoved = 0;
          const start = START_INDICES[color];
          
          if (t.position >= 100) {
              const homeIdx = t.position - 100;
              if (homeIdx + roll <= 5) { moves.push(t.id); canMove = true; }
          } else {
              if (t.position >= start) stepsMoved = t.position - start;
              else stepsMoved = (52 - start) + t.position;
              
              if (stepsMoved + roll <= 50) {
                   moves.push(t.id); canMove = true;
              } else {
                   const stepsToEntry = 50 - stepsMoved;
                   const remaining = roll - stepsToEntry;
                   if (remaining <= 6) { moves.push(t.id); canMove = true; }
              }
          }
      });
      return { moves, canMove };
  }, [tokens]);

  const rollDice = () => {
    if (rolling || dice !== null) return;
    setRolling(true);
    audio.play('dice');
    setTimeout(() => {
        const val = Math.ceil(Math.random() * 6);
        setDice(val);
        setRolling(false);
        const { moves, canMove } = calcMoves(val, activeColor);
        setValidMoves(moves);
        if (!canMove) {
            setLog("No moves!");
            setTimeout(nextTurn, 1000);
        }
    }, 500);
  };

  const nextTurn = () => {
      setDice(null);
      setValidMoves([]);
      setTurnIndex((prev) => (prev + 1) % activeColors.length);
  };

  const handleTokenClick = (id: string) => {
      if (!validMoves.includes(id) || dice === null) return;

      const t = tokens.find(x => x.id === id)!;
      let newPos = getTargetPosition(t, dice);
      let captured = false;

      // Capture Logic
      let newTokens = [...tokens];
      if (newPos < 100) { 
          const enemies = tokens.filter(x => x.position === newPos && x.color !== t.color);
          if (enemies.length > 0 && !SAFE_INDICES.includes(newPos)) {
              captured = true;
              newTokens = newTokens.map(x => (x.position === newPos && x.color !== t.color) ? { ...x, position: -1 } : x);
              setLog("CAPTURED!");
              audio.play('capture');
          }
      }

      if (!captured) audio.play('move');

      newTokens = newTokens.map(x => x.id === id ? { ...x, position: newPos } : x);
      setTokens(newTokens);
      setValidMoves([]);

      // Check Win
      const myFinished = newTokens.filter(x => x.color === t.color && x.position >= 100 && (x.position - 100) === 5).length;
      if (myFinished === 4) {
          onEnd(t.player);
          return;
      }

      if (dice === 6 || captured || (newPos >= 100 && (newPos - 100) === 5)) {
          setDice(null);
      } else {
          nextTurn();
      }
  };

  // Bot Logic
  useEffect(() => {
    if (vsComputer && activeColor === 'yellow' && !setupMode) { // Assuming Yellow is always CPU P2
        if (dice === null && !rolling) {
            // Auto Roll
            const timer = setTimeout(rollDice, 1000);
            return () => clearTimeout(timer);
        } else if (dice !== null && validMoves.length > 0) {
            // Auto Move
            const timer = setTimeout(() => {
                let bestMove = validMoves[0];
                let bestScore = -100;

                validMoves.forEach(moveId => {
                    let score = 0;
                    const t = tokens.find(x => x.id === moveId)!;
                    const targetPos = getTargetPosition(t, dice);

                    // 1. Enter Goal (High Priority)
                    if (targetPos >= 100 && (targetPos - 100) === 5) score += 100;
                    
                    // 2. Capture (High Priority)
                    if (targetPos < 100 && !SAFE_INDICES.includes(targetPos)) {
                        const enemy = tokens.find(x => x.position === targetPos && x.color !== t.color);
                        if (enemy) score += 50;
                    }

                    // 3. Exit Base (Medium)
                    if (t.position === -1) score += 30;

                    // 4. Safe Spot (Low)
                    if (SAFE_INDICES.includes(targetPos)) score += 20;

                    // 5. Advance
                    score += 5;

                    // Randomize slightly to vary play
                    score += Math.random() * 5;

                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = moveId;
                    }
                });

                handleTokenClick(bestMove);

            }, 1000);
            return () => clearTimeout(timer);
        }
    }
  }, [vsComputer, activeColor, dice, validMoves, rolling, setupMode, tokens]);

  // --- Rendering ---
  
  const getTokensByCell = () => {
      const groups: Record<string, Token[]> = {};
      tokens.forEach(t => {
          let r = 0, c = 0;
          if (t.position === -1) {
              const idx = parseInt(t.id.split('-')[1]);
              [r, c] = BASE_POSITIONS[t.color][idx];
          } else if (t.position >= 100) {
              const idx = t.position - 100;
              [r, c] = HOME_PATHS[t.color][idx];
          } else {
              [r, c] = MAIN_PATH[t.position];
          }
          const key = `${r}-${c}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(t);
      });
      return groups;
  };

  const renderTokenStack = (cellTokens: Token[], r: number, c: number) => {
     if (!cellTokens.length) return null;
     return (
        <div style={{ gridArea: `${r+1} / ${c+1} / ${r+2} / ${c+2}` }} className="relative w-full h-full pointer-events-none z-20">
            {cellTokens.map((t, i) => {
                const count = cellTokens.length;
                const isValid = validMoves.includes(t.id);
                let scale = 0.75;
                let x = 0;
                let y = 0;
                if (count === 2) { scale = 0.6; if (i === 0) { x = -15; y = -15; } if (i === 1) { x = 15; y = 15; } } 
                else if (count === 3) { scale = 0.55; if (i === 0) { y = -20; } if (i === 1) { x = -15; y = 10; } if (i === 2) { x = 15; y = 10; } } 
                else if (count >= 4) { scale = 0.5; if (i === 0) { x = -15; y = -15; } if (i === 1) { x = 15; y = -15; } if (i === 2) { x = -15; y = 15; } if (i === 3) { x = 15; y = 15; } }

                return (
                    <motion.button
                        key={t.id}
                        layoutId={t.id}
                        onClick={() => handleTokenClick(t.id)}
                        disabled={!isValid || (vsComputer && activeColor === 'yellow')}
                        initial={false}
                        animate={{ x: `${x}%`, y: `${y}%`, scale: scale }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className={`
                            absolute inset-0 m-auto w-[80%] h-[80%] rounded-full shadow-sm border-[1.5px] border-white pointer-events-auto flex items-center justify-center
                            ${t.color === 'red' ? 'bg-red-600' : ''}
                            ${t.color === 'green' ? 'bg-green-600' : ''}
                            ${t.color === 'yellow' ? 'bg-yellow-400' : ''}
                            ${t.color === 'blue' ? 'bg-blue-600' : ''}
                            ${isValid ? 'ring-2 ring-white ring-offset-1 ring-offset-black/20 z-50 cursor-pointer' : ''}
                        `}
                    >
                         <div className="w-full h-full rounded-full bg-gradient-to-tr from-black/10 to-white/40"></div>
                    </motion.button>
                );
            })}
        </div>
     );
  };

  const renderBoardLayer = () => {
    const cells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
         if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8)) continue;
         if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue;
         let bg = 'bg-white';
         let icon = null;
         if (r === 7 && c > 0 && c < 6) bg = 'bg-red-500';
         if (c === 7 && r > 0 && r < 6) bg = 'bg-green-500';
         if (r === 7 && c > 8 && c < 14) bg = 'bg-yellow-400';
         if (c === 7 && r > 8 && r < 14) bg = 'bg-blue-500';
         if (r === 6 && c === 1) { bg = 'bg-red-500'; icon = <MoveRight className="w-4 h-4 text-white opacity-80" />; }
         if (r === 1 && c === 8) { bg = 'bg-green-500'; icon = <MoveDown className="w-4 h-4 text-white opacity-80" />; }
         if (r === 8 && c === 13) { bg = 'bg-yellow-400'; icon = <MoveLeft className="w-4 h-4 text-white opacity-80" />; }
         if (r === 13 && c === 6) { bg = 'bg-blue-500'; icon = <MoveUp className="w-4 h-4 text-white opacity-80" />; }
         if ((r===2 && c===6) || (r===6 && c===12) || (r===12 && c===8) || (r===8 && c===2)) {
             icon = <Star className="w-4 h-4 text-slate-400/50" />;
         }
         cells.push(<div key={`cell-${r}-${c}`} style={{ gridArea: `${r+1} / ${c+1} / ${r+2} / ${c+2}` }} className={`${bg} border border-slate-900/10 flex items-center justify-center relative`}>{icon}</div>);
      }
    }
    return cells;
  };

  const tokenGroups = getTokensByCell();

  if (setupMode) {
      return (
          <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in zoom-in duration-300">
              <h2 className="text-3xl font-black text-slate-800">Select Players</h2>
              <div className="flex gap-4">
                  {[2, 3, 4].map(n => {
                      // Only support 2 players in CPU mode for now
                      if (vsComputer && n !== 2) return null;
                      return (
                          <button 
                            key={n}
                            onClick={() => startGame(n as 2|3|4)}
                            className="w-24 h-24 bg-white rounded-2xl shadow-xl border-b-4 border-slate-200 hover:-translate-y-1 hover:border-blue-500 hover:text-blue-500 transition-all flex flex-col items-center justify-center gap-2 group"
                          >
                              {vsComputer ? <Bot className="w-8 h-8 text-slate-400 group-hover:text-blue-500" /> : <Users className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />}
                              <span className="font-bold text-xl">{n}</span>
                          </button>
                      );
                  })}
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-xl mx-auto">
        <div className="relative w-full aspect-square bg-white shadow-2xl border-4 border-slate-800 rounded-xl overflow-hidden select-none">
            <div className="grid w-full h-full" style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}>
                <div style={{ gridArea: '1 / 1 / 7 / 7' }} className="bg-red-500 border-r-4 border-b-4 border-slate-800 relative"><div className="absolute inset-0 m-auto w-[66.66%] h-[66.66%] bg-white rounded-3xl border-4 border-slate-800"></div></div>
                <div style={{ gridArea: '1 / 10 / 7 / 16' }} className="bg-green-500 border-l-4 border-b-4 border-slate-800 relative"><div className="absolute inset-0 m-auto w-[66.66%] h-[66.66%] bg-white rounded-3xl border-4 border-slate-800"></div></div>
                <div style={{ gridArea: '10 / 1 / 16 / 7' }} className="bg-blue-500 border-r-4 border-t-4 border-slate-800 relative"><div className="absolute inset-0 m-auto w-[66.66%] h-[66.66%] bg-white rounded-3xl border-4 border-slate-800"></div></div>
                <div style={{ gridArea: '10 / 10 / 16 / 16' }} className="bg-yellow-400 border-l-4 border-t-4 border-slate-800 relative"><div className="absolute inset-0 m-auto w-[66.66%] h-[66.66%] bg-white rounded-3xl border-4 border-slate-800"></div></div>
                <div style={{ gridArea: '7 / 7 / 10 / 10' }} className="relative bg-slate-800">
                    <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(0 0, 50% 50%, 0 100%)', backgroundColor: '#ef4444' }}></div> 
                    <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)', backgroundColor: '#22c55e' }}></div> 
                    <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)', backgroundColor: '#facc15' }}></div> 
                    <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)', backgroundColor: '#3b82f6' }}></div> 
                </div>
                {renderBoardLayer()}
                {Object.keys(tokenGroups).map(key => {
                    const [r, c] = key.split('-').map(Number);
                    return renderTokenStack(tokenGroups[key], r, c);
                })}
            </div>
        </div>
        <div className="mt-6 flex items-center justify-between w-full px-4 bg-white p-4 rounded-2xl shadow-lg border border-slate-100">
             <div className="flex items-center gap-3">
                 <div className={`w-12 h-12 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-colors ${
                     activeColor === 'red' ? 'bg-red-600' : activeColor === 'green' ? 'bg-green-600' : activeColor === 'yellow' ? 'bg-yellow-400' : 'bg-blue-600'
                 }`}>
                     <div className="w-4 h-4 bg-white rounded-full animate-ping opacity-75"></div>
                 </div>
                 <div className="flex flex-col">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turn</span>
                     <span className="font-black text-slate-800 capitalize text-lg">{activeColor === 'yellow' && vsComputer ? 'CPU' : activeColor}</span>
                 </div>
             </div>
             <div className="flex flex-col items-center">
                 <div className="text-xs font-bold text-slate-400 mb-2 h-4">{log}</div>
                 <button 
                    onClick={rollDice}
                    disabled={rolling || dice !== null || (vsComputer && activeColor === 'yellow')}
                    className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border-b-4 transition-all flex-col gap-1
                        ${rolling ? 'bg-slate-100 border-slate-200' : 'bg-indigo-600 border-indigo-800 text-white active:border-b-0 active:translate-y-1 hover:bg-indigo-500'}
                    `}
                 >
                     {rolling ? <Dices className="animate-spin text-slate-400" /> : dice ? <span className="text-3xl font-black">{dice}</span> : <>
                        <Dices />
                        <span className="text-[10px] font-bold">ROLL</span>
                     </>}
                 </button>
             </div>
             <button onClick={() => setSetupMode(true)} className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors gap-1" title="Setup Game">
                 <Settings className="w-5 h-5" />
                 <span className="text-[10px] font-bold">SETUP</span>
             </button>
        </div>
    </div>
  );
};