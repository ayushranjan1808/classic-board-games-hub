import React, { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Home, Info, Volume2, VolumeX, CheckCircle, Lightbulb } from 'lucide-react';
import { GameDefinition, GameStatus, Player } from '../types';
import { updateStats, hasSeenTutorial, markTutorialSeen } from '../services/storage';
import { Confetti } from './Confetti';
import { audio } from '../services/audio';
import { motion, AnimatePresence } from 'framer-motion';

interface GameShellProps {
  game: GameDefinition;
  onBack: () => void;
  children: (props: {
    status: GameStatus;
    currentPlayer: Player;
    winner: Player | null;
    onEndGame: (winner: Player | null) => void;
    restart: () => void;
  }) => React.ReactNode;
}

export const GameShell: React.FC<GameShellProps> = ({ game, onBack, children }) => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('P1');
  const [winner, setWinner] = useState<Player | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [muted, setMuted] = useState(audio.isMuted());

  // Check tutorial on mount
  useEffect(() => {
    const seen = hasSeenTutorial(game.id);
    if (!seen) {
      setShowTutorial(true);
    }
  }, [game.id]);

  const handleTutorialComplete = () => {
    audio.play('click');
    markTutorialSeen(game.id);
    setShowTutorial(false);
  };

  const handleEndGame = (w: Player | null) => {
    if (w) audio.play('win');
    setStatus(GameStatus.GAME_OVER);
    setWinner(w);
    if (w === 'P1') {
      updateStats(game.id, true);
    } else {
      updateStats(game.id, false);
    }
  };

  const handleRestart = () => {
    audio.play('bell');
    setStatus(GameStatus.PLAYING);
    setWinner(null);
    setCurrentPlayer('P1');
  };

  const toggleSound = () => {
    setMuted(audio.toggleMute());
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white px-2 sm:px-4 py-3 shadow-sm flex flex-wrap items-center justify-between z-10 sticky top-0 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { audio.play('click'); onBack(); }}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit</span>
          </button>
          
          <div className="flex items-center gap-2 px-2 border-l border-slate-100">
             <div className={`p-1.5 rounded-lg ${game.color} text-white shadow-sm hidden xs:block`}>
                <game.icon className="w-4 h-4" />
             </div>
             <h1 className="text-sm sm:text-lg font-black text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] sm:max-w-none">{game.name}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
           <button 
             onClick={toggleSound}
             className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
             aria-label="Toggle Sound"
           >
             {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
           </button>

           <button 
            onClick={() => { audio.play('click'); setShowRules(true); }}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs sm:text-sm hover:bg-blue-100 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>Rules</span>
          </button>
          
          <button 
            onClick={handleRestart}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart</span>
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-2 sm:p-4">
        {status === GameStatus.GAME_OVER && winner && <Confetti />}
        
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-4 sm:p-6 min-h-[500px] flex flex-col relative overflow-hidden border border-slate-200">
           {children({
             status,
             currentPlayer,
             winner,
             onEndGame: handleEndGame,
             restart: handleRestart
           })}

           {/* Tutorial Overlay */}
           <AnimatePresence>
             {showTutorial && (
               <motion.div
                 initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                 animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                 exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                 className="absolute inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-6"
               >
                 <motion.div 
                   initial={{ scale: 0.9, y: 20 }}
                   animate={{ scale: 1, y: 0 }}
                   exit={{ scale: 0.9, opacity: 0 }}
                   className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                 >
                    <div className={`w-16 h-16 ${game.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg mx-auto`}>
                       <game.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-center text-slate-800 mb-2">{game.name}</h2>
                    <p className="text-center text-slate-500 font-bold mb-8 uppercase text-xs tracking-wider">Quick Guide</p>

                    <div className="space-y-4 mb-8">
                      {game.tutorialSteps.map((step, i) => (
                        <div key={i} className="flex gap-4 items-start">
                           <div className="mt-1 min-w-[24px] h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                             {i + 1}
                           </div>
                           <p className="text-slate-600 font-medium leading-tight">{step}</p>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={handleTutorialComplete}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      Got it, let's play <CheckCircle className="w-5 h-5" />
                    </button>
                 </motion.div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Game Over Overlay */}
           <AnimatePresence>
             {status === GameStatus.GAME_OVER && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-white/95 backdrop-blur-md z-40 flex flex-col items-center justify-center text-center p-8"
               >
                  {winner ? (
                    <div className="mb-8 relative">
                       <div className="absolute inset-0 bg-yellow-400 blur-[60px] opacity-20 rounded-full animate-pulse"></div>
                       <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-6 drop-shadow-lg" />
                       <h2 className="text-5xl font-black text-slate-900 mb-2 tracking-tight">
                         {winner === 'P1' ? 'Victory!' : 'Defeat!'}
                       </h2>
                       <p className="text-slate-500 text-xl font-medium">
                         {winner === 'P1' ? 'You played amazingly.' : 'Better luck next time.'}
                       </p>
                    </div>
                  ) : (
                    <div className="mb-8">
                      <div className="text-8xl mb-6">🤝</div>
                      <h2 className="text-4xl font-black text-slate-900 mb-2">It's a Draw!</h2>
                      <p className="text-slate-500 text-xl font-medium">Well matched.</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button 
                      onClick={handleRestart}
                      className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" /> Play Again
                    </button>
                    <button 
                      onClick={() => { audio.play('click'); onBack(); }}
                      className="w-full py-4 rounded-2xl bg-white text-slate-600 font-bold text-lg border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Home className="w-5 h-5" /> Back to Home
                    </button>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </main>

       {/* Rules Modal */}
       <AnimatePresence>
        {showRules && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowRules(false)}
          >
            <motion.div 
               initial={{ y: 50, scale: 0.9 }}
               animate={{ y: 0, scale: 1 }}
               exit={{ y: 20, opacity: 0 }}
               className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
               onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Lightbulb className="w-6 h-6" /></div>
                  <h3 className="text-2xl font-black text-slate-800">How to Play</h3>
              </div>
              
              <p className="text-slate-600 mb-8 leading-relaxed text-lg font-medium">
                {game.description}
              </p>
              
              <div className="bg-slate-50 p-4 rounded-xl mb-8 border border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider">Goal</h4>
                  <ul className="space-y-2">
                      {game.tutorialSteps.map((step, i) => (
                          <li key={i} className="flex gap-2 text-slate-600 text-sm">
                              <span className="text-blue-500 font-bold">•</span> {step}
                          </li>
                      ))}
                  </ul>
              </div>

              <button 
                onClick={() => { audio.play('click'); setShowRules(false); }}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};