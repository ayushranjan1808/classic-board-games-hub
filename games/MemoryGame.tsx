import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player } from '../types';
import { motion } from 'framer-motion';
import { 
  Cat, Dog, Fish, Bird, Bug, Rabbit, Turtle, Snail, 
  Zap, Heart, Moon, Sun, Cloud, Snowflake, Star, Music, Anchor, Ghost, Smile, Bell 
} from 'lucide-react';
import { audio } from '../services/audio';

const ICONS = [
  Cat, Dog, Fish, Bird, Bug, Rabbit, Turtle, Snail, 
  Star, Heart, Moon, Sun, Cloud, Snowflake, Zap, Music, Anchor, Ghost, Smile, Bell
];

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface Card {
  id: number;
  iconId: number;
  status: 'HIDDEN' | 'FLIPPED' | 'MATCHED';
  owner: Player | null; // Who matched this card
}

interface GameState {
  cards: Card[];
  difficulty: Difficulty;
  turn: Player;
  scores: { P1: number; P2: number };
  flippedIndices: number[];
  isProcessing: boolean;
  moves: number;
}

export const MemoryGame: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
  const [setupMode, setSetupMode] = useState(true);
  const [game, setGame] = useState<GameState>({
    cards: [],
    difficulty: 'EASY',
    turn: 'P1',
    scores: { P1: 0, P2: 0 },
    flippedIndices: [],
    isProcessing: false,
    moves: 0,
  });

  // Bot Memory: Map iconId -> indices seen
  // We use a ref so it persists across renders without triggering them
  const botMemory = useRef<Map<number, number[]>>(new Map());

  // --- Logic ---

  const initializeGame = (diff: Difficulty) => {
    let pairs = 8;
    if (diff === 'MEDIUM') pairs = 12;
    if (diff === 'HARD') pairs = 18;

    const selectedIcons = ICONS.slice(0, pairs);
    const deck = [...selectedIcons, ...selectedIcons]
      .map((_, i) => ({ id: i, iconId: i % pairs, status: 'HIDDEN' as const, owner: null }))
      .sort(() => Math.random() - 0.5);

    setGame({
      cards: deck,
      difficulty: diff,
      turn: 'P1',
      scores: { P1: 0, P2: 0 },
      flippedIndices: [],
      isProcessing: false,
      moves: 0,
    });
    
    // Clear bot memory
    botMemory.current.clear();
    setSetupMode(false);
  };

  const handleCardClick = useCallback((index: number) => {
    // Validation
    if (game.isProcessing) return;
    if (game.cards[index].status !== 'HIDDEN') return;
    if (vsComputer && game.turn === 'P2') return; // Not human turn

    performFlip(index);
  }, [game, vsComputer]);

  const performFlip = (index: number) => {
    audio.play('move'); // Flip sound
    // Add to bot memory (Bot sees all moves)
    const iconId = game.cards[index].iconId;
    const currentMem = botMemory.current.get(iconId) || [];
    if (!currentMem.includes(index)) {
        botMemory.current.set(iconId, [...currentMem, index]);
    }

    setGame(prev => {
      const newCards = [...prev.cards];
      newCards[index] = { ...newCards[index], status: 'FLIPPED' };
      
      const newFlipped = [...prev.flippedIndices, index];
      
      return {
        ...prev,
        cards: newCards,
        flippedIndices: newFlipped,
        isProcessing: newFlipped.length === 2, // Lock if 2 cards
      };
    });
  };

  // Effect to handle match logic when 2 cards are flipped
  useEffect(() => {
    if (game.flippedIndices.length === 2) {
      const [first, second] = game.flippedIndices;
      const card1 = game.cards[first];
      const card2 = game.cards[second];
      
      // Delay for viewing
      const timer = setTimeout(() => {
        if (card1.iconId === card2.iconId) {
          // MATCH
          audio.play('bell'); // Match sound
          setGame(prev => {
             const newCards = [...prev.cards];
             newCards[first] = { ...newCards[first], status: 'MATCHED', owner: prev.turn };
             newCards[second] = { ...newCards[second], status: 'MATCHED', owner: prev.turn };
             
             const newScores = { ...prev.scores, [prev.turn]: prev.scores[prev.turn] + 1 };
             
             // Check Win
             const allMatched = newCards.every(c => c.status === 'MATCHED');
             if (allMatched) {
                setTimeout(() => {
                    if (vsComputer) {
                        if (newScores.P1 > newScores.P2) onEnd('P1');
                        else if (newScores.P2 > newScores.P1) onEnd('P2');
                        else onEnd(null);
                    } else {
                        onEnd('P1'); // Single player done
                    }
                }, 1000);
             }

             // In Match, player KEEPS turn
             return {
                 ...prev,
                 cards: newCards,
                 flippedIndices: [],
                 scores: newScores,
                 isProcessing: false,
                 moves: prev.moves + 1,
             };
          });
          
          // Remove from bot memory if matched (optional, keep memory clean)
          botMemory.current.delete(card1.iconId);

        } else {
          // NO MATCH
          audio.play('error'); // Mismatch sound
          setGame(prev => {
             const newCards = [...prev.cards];
             newCards[first] = { ...newCards[first], status: 'HIDDEN' };
             newCards[second] = { ...newCards[second], status: 'HIDDEN' };
             
             return {
                 ...prev,
                 cards: newCards,
                 flippedIndices: [],
                 turn: prev.turn === 'P1' ? 'P2' : 'P1', // Switch Turn
                 isProcessing: false,
                 moves: prev.moves + 1,
             };
          });
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [game.flippedIndices, game.cards, game.turn, game.scores, vsComputer, onEnd]);


  // --- BOT LOGIC ---
  useEffect(() => {
    if (vsComputer && game.turn === 'P2' && !game.isProcessing && !setupMode) {
        
        // Bot Thinking Delay
        const timer = setTimeout(() => {
            const hiddenIndices = game.cards
               .map((c, i) => c.status === 'HIDDEN' ? i : -1)
               .filter(i => i !== -1);
            
            if (hiddenIndices.length === 0) return;

            let moveIndex = -1;

            // Step 1: Check if we have 1 card already flipped (mid-turn)
            if (game.flippedIndices.length === 1) {
                const currentIdx = game.flippedIndices[0];
                const currentIcon = game.cards[currentIdx].iconId;
                
                // Do we know where the pair is?
                const knownLocations = botMemory.current.get(currentIcon) || [];
                const pairIndex = knownLocations.find(idx => idx !== currentIdx && game.cards[idx].status === 'HIDDEN');
                
                if (pairIndex !== undefined) {
                    moveIndex = pairIndex;
                }
            } 
            // Step 2: Start of turn - do we know any full pairs?
            else {
                // Find an iconId in memory that has 2 distinct hidden indices
                for (const [iconId, indices] of botMemory.current.entries()) {
                    const validIndices = indices.filter(idx => game.cards[idx].status === 'HIDDEN');
                    if (validIndices.length >= 2) {
                        moveIndex = validIndices[0]; // Pick first one, next turn loop will pick second
                        break;
                    }
                }
            }

            // Step 3: Random guess if no knowledge
            if (moveIndex === -1) {
                // Heuristic: Don't pick a card we matched? (Already filtered by status=HIDDEN)
                // Prefer cards NOT in memory? (Exploration)
                // Actually, just random unknown is fine.
                const completelyUnknown = hiddenIndices.filter(idx => {
                    // check if this index is in any memory value list
                    for (const indices of botMemory.current.values()) {
                        if (indices.includes(idx)) return false;
                    }
                    return true;
                });

                if (completelyUnknown.length > 0) {
                    moveIndex = completelyUnknown[Math.floor(Math.random() * completelyUnknown.length)];
                } else {
                    moveIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
                }
            }

            performFlip(moveIndex);

        }, 1000); // 1s delay per action
        return () => clearTimeout(timer);
    }
  }, [game.turn, game.isProcessing, game.cards, game.flippedIndices, setupMode, vsComputer]);

  // --- Rendering ---

  if (setupMode) {
      return (
          <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in zoom-in duration-300">
              <h2 className="text-3xl font-black text-slate-800">Select Difficulty</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
                  {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                      <button 
                        key={d}
                        onClick={() => initializeGame(d)}
                        className={`
                            p-6 rounded-2xl shadow-xl border-b-4 transition-all hover:-translate-y-1
                            ${d === 'EASY' ? 'bg-green-100 border-green-300 hover:bg-green-200' : ''}
                            ${d === 'MEDIUM' ? 'bg-blue-100 border-blue-300 hover:bg-blue-200' : ''}
                            ${d === 'HARD' ? 'bg-purple-100 border-purple-300 hover:bg-purple-200' : ''}
                        `}
                      >
                          <div className="text-xl font-bold text-slate-700 mb-1">{d}</div>
                          <div className="text-xs text-slate-500 font-medium">
                              {d === 'EASY' ? '4x4 (8 Pairs)' : d === 'MEDIUM' ? '4x6 (12 Pairs)' : '6x6 (18 Pairs)'}
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      );
  }

  // Grid Config
  let gridClass = 'grid-cols-4';
  if (game.difficulty === 'HARD') gridClass = 'grid-cols-6';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      {/* HUD */}
      <div className="flex items-center justify-between w-full max-w-lg mb-4 px-2">
         {vsComputer ? (
             <>
                 <div className={`flex flex-col items-center transition-opacity ${game.turn === 'P1' ? 'opacity-100' : 'opacity-50'}`}>
                     <span className="text-xs font-bold text-slate-400">PLAYER</span>
                     <span className="text-2xl font-black text-purple-600">{game.scores.P1}</span>
                 </div>
                 <div className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">
                     Turn: {game.turn === 'P1' ? 'Player' : 'CPU'}
                 </div>
                 <div className={`flex flex-col items-center transition-opacity ${game.turn === 'P2' ? 'opacity-100' : 'opacity-50'}`}>
                     <span className="text-xs font-bold text-slate-400">CPU</span>
                     <span className="text-2xl font-black text-slate-700">{game.scores.P2}</span>
                 </div>
             </>
         ) : (
             <div className="flex justify-between w-full">
                 <div className="bg-purple-100 text-purple-600 px-4 py-2 rounded-full font-bold shadow-sm">
                    Moves: {Math.floor(game.moves / 2)}
                 </div>
                 <div className="bg-green-100 text-green-600 px-4 py-2 rounded-full font-bold shadow-sm">
                    Matches: {game.scores.P1}
                 </div>
             </div>
         )}
      </div>

      <div className={`grid gap-2 sm:gap-3 ${gridClass} w-full max-w-lg mx-auto`}>
        {game.cards.map((card, i) => {
            const Icon = ICONS[card.iconId];
            return (
                <div 
                   key={card.id}
                   onClick={() => handleCardClick(i)}
                   className={`
                      aspect-square perspective-1000 relative cursor-pointer
                      ${game.difficulty === 'HARD' ? 'w-10 sm:w-14' : 'w-16 sm:w-20'}
                   `}
                >
                    <motion.div
                       className="w-full h-full relative preserve-3d transition-all duration-500"
                       animate={{ 
                           rotateY: card.status !== 'HIDDEN' ? 180 : 0,
                           scale: card.status === 'MATCHED' ? 0.9 : 1,
                           opacity: card.status === 'MATCHED' ? 0.8 : 1
                       }}
                       style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* Front (Hidden) */}
                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-md border-b-4 border-purple-800 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold opacity-30">?</span>
                        </div>
                        
                        {/* Back (Revealed) */}
                        <div 
                           className={`absolute inset-0 backface-hidden bg-white rounded-xl shadow-md border-b-4 flex items-center justify-center
                               ${card.status === 'MATCHED' 
                                   ? (card.owner === 'P1' ? 'border-purple-300 bg-purple-50' : 'border-slate-300 bg-slate-50') 
                                   : 'border-purple-200'}
                           `}
                           style={{ transform: 'rotateY(180deg)' }}
                        >
                           <Icon className={`w-1/2 h-1/2 ${card.status === 'MATCHED' ? 'text-green-500' : 'text-slate-700'}`} />
                        </div>
                    </motion.div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
