import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices } from 'lucide-react';
import { audio } from '../services/audio';

const BOARD_SIZE = 100;
const SNAKES: Record<number, number> = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const LADDERS: Record<number, number> = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };

export const SnakesAndLadders: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [positions, setPositions] = useState({ P1: 1, P2: 1 });
  const [turn, setTurn] = useState<Player>('P1');
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [log, setLog] = useState<string>("Ready to start!");

  const rollDice = async () => {
    if (rolling) return;
    setRolling(true);
    setLog("Rolling...");
    audio.play('dice');
    
    // Simulate roll duration
    setTimeout(() => {
        const roll = Math.ceil(Math.random() * 6);
        setDice(roll);
        movePlayer(roll);
    }, 1000);
  };

  const movePlayer = (roll: number) => {
    let newPos = positions[turn] + roll;
    let msg = `${turn === 'P1' ? 'Player 1' : (vsComputer ? 'CPU' : 'Player 2')} rolled ${roll}.`;
    
    // Overshoot rule
    if (newPos > 100) {
        msg += " Overshot!";
        newPos = positions[turn]; 
        audio.play('error');
    } else {
        audio.play('move');
    }

    setPositions(prev => ({ ...prev, [turn]: newPos }));

    // Check for Snake or Ladder after a delay for the first move animation to finish
    setTimeout(() => {
        if (SNAKES[newPos]) {
            setLog("Oh no! A Snake! 🐍");
            audio.play('capture'); // Negative sound
            setPositions(prev => ({ ...prev, [turn]: SNAKES[newPos] }));
        } else if (LADDERS[newPos]) {
            setLog("Awesome! A Ladder! 🪜");
            audio.play('bell'); // Positive sound
            setPositions(prev => ({ ...prev, [turn]: LADDERS[newPos] }));
        } else {
             setLog(msg);
        }
        
        // End Turn or Win
        setTimeout(() => {
            if (newPos === 100 || LADDERS[newPos] === 100) {
                onEnd(turn);
            } else {
                setTurn(prev => prev === 'P1' ? 'P2' : 'P1');
                setRolling(false);
                setDice(null);
            }
        }, 800);
    }, 600);
  };

  // Bot Logic
  useEffect(() => {
    if (vsComputer && turn === 'P2' && !rolling) {
        const timer = setTimeout(rollDice, 1500);
        return () => clearTimeout(timer);
    }
  }, [turn, vsComputer, rolling]);

  return (
    <div className="flex flex-col h-full w-full max-w-lg mx-auto">
      {/* Board */}
      <div className="aspect-square bg-white border-4 border-slate-700 grid grid-cols-10 grid-rows-10 text-[10px] sm:text-xs relative shadow-2xl rounded-lg overflow-hidden">
        {Array.from({ length: 100 }).map((_, i) => {
          const row = Math.floor(i / 10);
          const col = i % 10;
          let num = (9 - row) * 10 + (row % 2 === 0 ? col + 1 : 10 - col);
          const isDark = (row + col) % 2 === 1;
          
          return (
            <div key={num} className={`flex items-center justify-center relative ${isDark ? 'bg-slate-100' : 'bg-white'}`}>
              <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-200'}`}>{num}</span>
              
              {/* Snake/Ladder Indicators */}
              {SNAKES[num] && <span className="absolute text-red-400 opacity-40 text-xl">🐍</span>}
              {LADDERS[num] && <span className="absolute text-green-500 opacity-40 text-xl">🪜</span>}
              
              {/* Players */}
              <div className="absolute inset-0 flex items-center justify-center gap-1 pointer-events-none">
                 {positions.P1 === num && (
                    <motion.div 
                        layoutId="p1" 
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 border-2 border-white shadow-md z-10" 
                    />
                 )}
                 {positions.P2 === num && (
                    <motion.div 
                        layoutId="p2" 
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-600 border-2 border-white shadow-md z-10" 
                    />
                 )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-col items-center gap-4 bg-white p-4 rounded-xl shadow-lg border border-slate-100">
         <div className="text-sm font-bold text-slate-600 min-h-[20px]">{log}</div>
         
         <div className="flex items-center gap-8 w-full justify-center">
            <div className={`flex flex-col items-center transition-opacity ${turn === 'P1' ? 'opacity-100' : 'opacity-40'}`}>
                <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow mb-1"></div>
                <div className="font-bold text-slate-700">P1</div>
            </div>

            <button 
               onClick={rollDice}
               disabled={rolling || (vsComputer && turn === 'P2')}
               className="relative group w-24 h-24 flex items-center justify-center"
            >
               <motion.div
                  animate={rolling ? { rotate: 360, scale: [1, 0.8, 1.1, 1] } : {}}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className={`
                    w-20 h-20 rounded-2xl shadow-xl flex items-center justify-center border-b-4 active:border-b-0 active:translate-y-1 transition-all
                    ${rolling ? 'bg-slate-200 border-slate-300' : 'bg-indigo-600 border-indigo-800 text-white'}
                  `}
               >
                   {rolling ? (
                       <Dices className="w-10 h-10 text-slate-400 animate-spin" />
                   ) : dice ? (
                       <motion.span 
                         key={dice}
                         initial={{ scale: 0, rotate: 180 }}
                         animate={{ scale: 1, rotate: 0 }}
                         className="text-4xl font-black"
                       >
                         {dice}
                       </motion.span>
                   ) : (
                       <div className="flex flex-col items-center">
                           <Dices className="w-8 h-8 mb-1" />
                           <span className="text-xs font-bold">ROLL</span>
                       </div>
                   )}
               </motion.div>
            </button>

            <div className={`flex flex-col items-center transition-opacity ${turn === 'P2' ? 'opacity-100' : 'opacity-40'}`}>
                <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow mb-1"></div>
                <div className="font-bold text-slate-700">{vsComputer ? 'CPU' : 'P2'}</div>
            </div>
         </div>
      </div>
    </div>
  );
};
