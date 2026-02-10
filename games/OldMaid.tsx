import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audio';
import { User, Bot, Crown, Sparkles, AlertCircle } from 'lucide-react';

// --- Types ---

type Suit = 'C' | 'D' | 'H' | 'S';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
type Phase = 'SETUP' | 'DEALING' | 'DISCARDING' | 'PLAYING' | 'GAMEOVER';

interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isOldMaid: boolean;
}

interface OMPlayer {
  id: string;
  name: string;
  isBot: boolean;
  hand: Card[];
  isOut: boolean;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const SUITS: Suit[] = ['C', 'D', 'H', 'S'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// --- Helpers ---

const getCardColor = (suit: Suit) => (suit === 'H' || suit === 'D' ? 'text-red-600' : 'text-slate-900');
const getSuitSymbol = (suit: Suit) => {
    switch(suit) {
        case 'C': return '♣';
        case 'D': return '♦';
        case 'H': return '♥';
        case 'S': return '♠';
    }
};

const createDeck = (): Card[] => {
  let deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      // REMOVE QUEEN OF CLUBS
      if (rank === 'Q' && suit === 'C') return;
      
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        isOldMaid: rank === 'Q' && suit === 'S' // Optionally mark Q-Spades as the visual "Old Maid" counterpart if needed, but logic uses rank matching.
      });
    });
  });
  return deck;
};

const shuffle = (array: Card[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- Sub-Components ---

const CardView: React.FC<{ 
    card?: Card; 
    faceUp: boolean; 
    onClick?: () => void;
    highlight?: boolean;
    scale?: number;
}> = ({ card, faceUp, onClick, highlight, scale = 1 }) => {
    return (
        <motion.div 
            layoutId={card?.id}
            onClick={onClick}
            initial={{ scale: 0.8 }}
            animate={{ scale: highlight ? 1.1 : 1 }}
            whileHover={onClick ? { y: -10 } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`
                relative rounded-lg shadow-md border border-slate-300 overflow-hidden select-none bg-white
                ${highlight ? 'ring-4 ring-yellow-400 z-50' : ''}
                ${onClick ? 'cursor-pointer' : ''}
            `}
            style={{ 
                width: 70 * scale, 
                height: 100 * scale,
            }}
        >
            {faceUp && card ? (
                <div className="w-full h-full flex flex-col items-center justify-between p-1">
                    <div className="w-full flex justify-between leading-none">
                        <span className={`text-sm font-bold ${getCardColor(card.suit)}`}>{card.rank}</span>
                    </div>
                    <div className={`text-3xl ${getCardColor(card.suit)}`}>{getSuitSymbol(card.suit)}</div>
                    <div className="w-full flex justify-end leading-none rotate-180">
                        <span className={`text-sm font-bold ${getCardColor(card.suit)}`}>{card.rank}</span>
                    </div>
                    {card.rank === 'Q' && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                            <Crown size={40} className="text-yellow-600" />
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full h-full bg-blue-600 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] flex items-center justify-center border-2 border-white/20">
                     <div className="w-8 h-8 rounded-full bg-white/20"></div>
                </div>
            )}
        </motion.div>
    );
};

const PlayerArea: React.FC<{
    player: OMPlayer;
    isActive: boolean;
    isTarget: boolean;
    onCardClick: (index: number) => void;
}> = ({ player, isActive, isTarget, onCardClick }) => {
    // Fan calculations
    const count = player.hand.length;
    const angleStep = Math.min(40 / (count || 1), 10);
    const startAngle = -((count - 1) * angleStep) / 2;

    // Layout styles based on position
    let containerStyle = "";
    switch(player.position) {
        case 'bottom': containerStyle = "bottom-4 left-1/2 -translate-x-1/2"; break;
        case 'top': containerStyle = "top-4 left-1/2 -translate-x-1/2 flex-col-reverse"; break;
        case 'left': containerStyle = "left-4 top-1/2 -translate-y-1/2 rotate-90"; break;
        case 'right': containerStyle = "right-4 top-1/2 -translate-y-1/2 -rotate-90"; break;
    }

    const isHuman = !player.isBot;
    const showFaceUp = isHuman;

    return (
        <div className={`absolute ${containerStyle} flex flex-col items-center gap-2 transition-opacity duration-500 ${player.isOut ? 'opacity-40 grayscale' : 'opacity-100'}`}>
            
            {/* Avatar */}
            <div className={`
                relative w-16 h-16 rounded-full border-4 shadow-xl flex items-center justify-center bg-slate-800 z-20
                ${isActive ? 'border-yellow-400 ring-4 ring-yellow-400/50 scale-110' : 'border-slate-600'}
                ${isTarget ? 'animate-bounce ring-4 ring-blue-400' : ''}
                transition-all
            `}>
                {player.isBot ? <Bot className="text-white" /> : <User className="text-white" />}
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                    {player.hand.length}
                </div>
            </div>

            {/* Name Tag */}
            <div className={`
                 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm z-20
                 ${isActive ? 'bg-yellow-500 text-black' : 'bg-black/50'}
            `}>
                {player.isOut ? 'SAFE' : player.name}
            </div>

            {/* Hand (Fanned) */}
            <div className="relative h-28 w-24 flex justify-center z-10 mt-2">
                <AnimatePresence>
                    {player.hand.map((card, idx) => {
                        const angle = startAngle + idx * angleStep;
                        return (
                            <motion.div
                                key={card.id}
                                layoutId={card.id}
                                initial={{ scale: 0, y: 50 }}
                                animate={{ scale: 1, y: Math.abs(angle), rotate: angle }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute origin-bottom"
                                style={{
                                    zIndex: idx,
                                    bottom: 0,
                                }}
                            >
                                <CardView 
                                    card={card} 
                                    faceUp={showFaceUp} 
                                    onClick={() => {
                                        if (isTarget && !player.isOut) onCardClick(idx);
                                    }}
                                    highlight={isTarget} // Highlight card backs if target
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};


// --- Main Game ---

export const OldMaid: React.FC<{
  onEnd: (winner: Player | null) => void;
  vsComputer?: boolean;
}> = ({ onEnd, vsComputer }) => {
    const [phase, setPhase] = useState<Phase>('SETUP');
    const [players, setPlayers] = useState<OMPlayer[]>([]);
    const [turnIndex, setTurnIndex] = useState(0);
    const [status, setStatus] = useState("Initializing...");
    const [discardPile, setDiscardPile] = useState<Card[]>([]);

    // --- Core Logic ---

    // 1. Initialize immediately on mount
    useEffect(() => {
        setupGame();
    }, []);

    const setupGame = async () => {
        setStatus("Dealing cards...");
        setPhase('DEALING');
        
        const deck = shuffle(createDeck());
        const numPlayers = vsComputer ? 4 : 2;
        
        // Define Positions
        const posMap: Record<number, OMPlayer['position']> = numPlayers === 2 
            ? { 0: 'bottom', 1: 'top' }
            : { 0: 'bottom', 1: 'left', 2: 'top', 3: 'right' };

        const newPlayers: OMPlayer[] = Array.from({ length: numPlayers }).map((_, i) => ({
            id: `p-${i}`,
            name: i === 0 ? 'You' : `Bot ${i}`,
            isBot: i !== 0,
            hand: [],
            isOut: false,
            position: posMap[i]
        }));

        // Deal cards
        let p = 0;
        while (deck.length > 0) {
            newPlayers[p].hand.push(deck.pop()!);
            p = (p + 1) % numPlayers;
        }

        setPlayers(newPlayers);

        // Pause for dramatic effect
        await new Promise(r => setTimeout(r, 1000));
        
        startDiscardPhase(newPlayers);
    };

    const startDiscardPhase = async (currentPlayers: OMPlayer[]) => {
        setPhase('DISCARDING');
        setStatus("Discarding matching pairs...");

        const updatedPlayers = [...currentPlayers];
        const newDiscards: Card[] = [];

        // Simple synchronous discard for robustness
        for (let i = 0; i < updatedPlayers.length; i++) {
            const p = updatedPlayers[i];
            const { newHand, pairs } = removePairs(p.hand);
            
            if (pairs.length > 0) {
                audio.play('move');
                newDiscards.push(...pairs);
                updatedPlayers[i] = { ...p, hand: shuffle(newHand) };
                
                // Visual update per player
                setPlayers([...updatedPlayers]);
                setDiscardPile(prev => [...prev, ...pairs]);
                await new Promise(r => setTimeout(r, 500));
            }
        }

        setPhase('PLAYING');
        setStatus("Your Turn! Pick a card.");
        setTurnIndex(0); // Human starts
    };

    const removePairs = (hand: Card[]): { newHand: Card[], pairs: Card[] } => {
        const ranks: Record<string, Card[]> = {};
        hand.forEach(c => {
            if (!ranks[c.rank]) ranks[c.rank] = [];
            ranks[c.rank].push(c);
        });

        const newHand: Card[] = [];
        const pairs: Card[] = [];

        Object.values(ranks).forEach(group => {
            while (group.length >= 2) {
                pairs.push(group.pop()!);
                pairs.push(group.pop()!);
            }
            if (group.length === 1) newHand.push(group[0]);
        });

        return { newHand, pairs };
    };

    // --- Game Flow ---

    const getNextActivePlayer = (currentIdx: number) => {
        let next = (currentIdx + 1) % players.length;
        while (players[next].isOut) {
            next = (next + 1) % players.length;
            if (next === currentIdx) return -1; // Should not happen
        }
        return next;
    };

    const handleDraw = async (drawerIdx: number, targetIdx: number, cardIdx: number) => {
        if (phase !== 'PLAYING') return;
        
        const drawer = players[drawerIdx];
        const target = players[targetIdx];

        if (cardIdx >= target.hand.length) return; // Safety

        // 1. Take Card
        const card = target.hand[cardIdx];
        const newTargetHand = target.hand.filter((_, i) => i !== cardIdx);
        
        // Update State 1 (Remove from target)
        const tempPlayers = [...players];
        tempPlayers[targetIdx] = { ...target, hand: newTargetHand };
        
        if (newTargetHand.length === 0) {
            tempPlayers[targetIdx].isOut = true;
            audio.play('bell');
        }
        setPlayers(tempPlayers);
        audio.play('move');

        await new Promise(r => setTimeout(r, 500));

        // 2. Add to Drawer
        const newDrawerHand = [...drawer.hand, card];
        const { newHand, pairs } = removePairs(newDrawerHand);

        tempPlayers[drawerIdx] = { ...drawer, hand: shuffle(newHand) };
        if (newHand.length === 0) {
            tempPlayers[drawerIdx].isOut = true;
            audio.play('bell');
        }
        
        if (pairs.length > 0) {
            audio.play('capture');
            setDiscardPile(prev => [...prev, ...pairs]);
        }

        setPlayers([...tempPlayers]);

        // 3. Check Win Condition
        const active = tempPlayers.filter(p => !p.isOut);
        if (active.length === 1) {
            const loser = active[0];
            setPhase('GAMEOVER');
            setStatus("Game Over!");
            audio.play(loser.isBot ? 'win' : 'error');
            setTimeout(() => onEnd(loser.isBot ? 'P1' : 'P2'), 3000);
            return;
        }

        // 4. Next Turn
        const nextIdx = getNextActivePlayer(drawerIdx);
        setTurnIndex(nextIdx);
    };

    // --- Bot Logic ---
    useEffect(() => {
        if (phase === 'PLAYING') {
            const currentP = players[turnIndex];
            if (currentP && currentP.isBot && !currentP.isOut) {
                const targetIdx = getNextActivePlayer(turnIndex);
                if (targetIdx === -1) return;
                
                setStatus(`${currentP.name} is picking...`);
                
                const timer = setTimeout(() => {
                    const targetHand = players[targetIdx].hand;
                    if (targetHand.length > 0) {
                        const randomIdx = Math.floor(Math.random() * targetHand.length);
                        handleDraw(turnIndex, targetIdx, randomIdx);
                    }
                }, 1500);
                return () => clearTimeout(timer);
            } else if (!currentP.isBot) {
                 setStatus("Your Turn! Tap a card from the player on your LEFT.");
            }
        }
    }, [phase, turnIndex, players]);


    // --- Render ---

    // NOTE: This render must be resilient.
    // Even if players is empty, render the table.

    return (
        <div className="relative w-full h-full bg-[#27632a] overflow-hidden flex items-center justify-center font-sans select-none rounded-xl">
             {/* Background Pattern */}
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
             
             {/* Center Status / Discard */}
             <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
                 <div className="bg-black/20 px-6 py-2 rounded-full backdrop-blur-sm mb-4">
                     <span className="text-white font-bold text-lg animate-pulse">{status}</span>
                 </div>
                 
                 {/* Discard Pile Visual */}
                 <div className="w-32 h-32 border-4 border-white/10 rounded-xl flex items-center justify-center relative">
                     {discardPile.length > 0 ? (
                         <div className="relative">
                             <div className="absolute -rotate-6 transform -translate-x-2"><CardView card={discardPile[discardPile.length-2]} faceUp={true} scale={0.8} /></div>
                             <div className="absolute rotate-6 transform translate-x-2"><CardView card={discardPile[discardPile.length-1]} faceUp={true} scale={0.8} /></div>
                         </div>
                     ) : (
                         <span className="text-white/20 font-bold">DISCARD</span>
                     )}
                 </div>
             </div>

             {/* Players */}
             {players.map((p, idx) => {
                 const isActive = idx === turnIndex;
                 // Target logic: Human draws from next active player
                 // In 2 player: Human (0) draws from (1). Bot (1) draws from (0).
                 // In 4 player: 0->1->2->3->0
                 // Target is valid if it is the NEXT player in sequence relative to current turn
                 
                 const targetIdx = getNextActivePlayer(turnIndex);
                 const isTarget = isActive && !players[turnIndex].isBot && idx === targetIdx;

                 return (
                     <PlayerArea 
                        key={p.id}
                        player={p}
                        isActive={isActive}
                        isTarget={isTarget}
                        onCardClick={(cardIdx) => handleDraw(turnIndex, idx, cardIdx)}
                     />
                 );
             })}

             {/* Game Over Modal */}
             <AnimatePresence>
                {phase === 'GAMEOVER' && (
                    <motion.div 
                       initial={{ opacity: 0 }} 
                       animate={{ opacity: 1 }}
                       className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                    >
                         <div className="bg-white p-8 rounded-2xl shadow-2xl text-center border-4 border-yellow-400">
                             <h2 className="text-3xl font-black mb-4 text-slate-800">GAME OVER</h2>
                             {players.find(p => !p.isOut)?.isBot ? (
                                 <div className="text-slate-600 font-bold">
                                     <div className="text-6xl mb-2">😭</div>
                                     You ended with the Old Maid!
                                 </div>
                             ) : (
                                 <div className="text-green-600 font-bold">
                                     <div className="text-6xl mb-2">🎉</div>
                                     You Won! The Bot has the Queen!
                                 </div>
                             )}
                         </div>
                    </motion.div>
                )}
             </AnimatePresence>
        </div>
    );
};
