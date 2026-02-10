import React, { useState, useEffect, useRef } from 'react';
import { GameDefinition, UserProfile } from './types';
import { GameShell } from './components/GameShell';
import { SplashScreen } from './components/SplashScreen';
import { Onboarding } from './components/Onboarding';
import { TicTacToe } from './games/TicTacToe';
import { ConnectFour } from './games/ConnectFour';
import { SnakesAndLadders } from './games/SnakesAndLadders';
import { Checkers } from './games/Checkers';
import { MemoryGame } from './games/MemoryGame';
import { CanvasGame } from './games/CanvasGame';
import { Chess } from './games/Chess';
import { Ludo } from './games/Ludo';
import { NineMensMorris } from './games/NineMensMorris';
import { Reversi } from './games/Reversi';
import { SlidingPuzzle } from './games/SlidingPuzzle';
import { Sudoku } from './games/Sudoku';
import { WordSearch } from './games/WordSearch';
import { Crossword } from './games/Crossword';
import { getStats, getUserProfile } from './services/storage';
import { audio } from './services/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid3x3, 
  CircleDot, 
  TrendingUp, 
  Target, 
  BrainCircuit, 
  Disc,
  Play,
  Award,
  Crown,
  LayoutGrid,
  Hexagon,
  Users,
  Bot,
  Puzzle,
  Gamepad2,
  Grid,
  Search,
  Type,
  ArrowDown
} from 'lucide-react';

// Game Registry
const GAMES: GameDefinition[] = [
  // Classic Board Games
  { 
    id: 'ludo', 
    name: 'Ludo', 
    description: 'Race your tokens from start to finish.', 
    color: 'bg-indigo-500', 
    icon: LayoutGrid, 
    minPlayers: 2, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "You are the Red player (P1).",
      "Roll a 6 to move a token out of the base.",
      "Capture opponent tokens to send them back home."
    ]
  },
  { 
    id: 'chess', 
    name: 'Chess', 
    description: 'Strategic warfare to capture the King.', 
    color: 'bg-slate-700', 
    icon: Crown, 
    minPlayers: 2, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "You play as White (P1).",
      "Move your pieces to attack and control the board.",
      "Checkmate the opponent's King to win."
    ]
  },
  { 
    id: 'checkers', 
    name: 'Checkers', 
    description: 'Jump and capture enemy pieces.', 
    color: 'bg-amber-600', 
    icon: Target, 
    minPlayers: 2, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "You are Red (P1). Move diagonally forward.",
      "Jump over opponent pieces to capture them.",
      "Reach the far end to become a King and move backwards."
    ]
  },
  { 
    id: 'reversi', 
    name: 'Reversi', 
    description: 'Flip opponent pieces to your color.', 
    color: 'bg-emerald-600', 
    icon: Disc, 
    minPlayers: 2, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "You are Black (P1). Place a disc to trap opponent pieces.",
      "Trapped pieces flip to your color.",
      "Have the most discs on the board when it's full."
    ]
  },
  { 
    id: 'ninemens', 
    name: 'Nine Men\'s Morris', 
    description: 'Form lines to remove opponent pieces.', 
    color: 'bg-amber-700', 
    icon: Hexagon, 
    minPlayers: 2, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "Place 9 pieces on intersections.",
      "Form a 'Mill' (3 in a row) to remove an opponent's piece.",
      "Reduce the opponent to 2 pieces to win."
    ]
  },
  { 
    id: 'connect4', 
    name: 'Connect Four', 
    description: 'Connect 4 discs in a row.', 
    color: 'bg-red-500', 
    icon: CircleDot, 
    minPlayers: 2, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "You are Player 1 (Red).",
      "Tap a column to drop your disc.",
      "Connect 4 discs vertically, horizontally, or diagonally."
    ]
  },
  { 
    id: 'tictactoe', 
    name: 'Tic Tac Toe', 
    description: 'Simple 3-in-a-row strategy.', 
    color: 'bg-blue-500', 
    icon: Grid3x3, 
    minPlayers: 2, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "You are X (Player 1).",
      "Tap a square to place your mark.",
      "Get 3 in a row, column, or diagonal to win."
    ]
  },
  { 
    id: 'snakes', 
    name: 'Snakes & Ladders', 
    description: 'Race to 100.', 
    color: 'bg-green-500', 
    icon: TrendingUp, 
    minPlayers: 2, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "Roll the dice to move your piece.",
      "Ladders boost you up, Snakes slide you down.",
      "Be the first to reach square 100."
    ]
  },
  { 
    id: 'carrom', 
    name: 'Carrom (Lite)', 
    description: 'Flick and pocket.', 
    color: 'bg-yellow-600', 
    icon: Disc, 
    minPlayers: 1, 
    maxPlayers: 2, 
    category: 'Classic',
    tutorialSteps: [
      "Tap the board to flick the striker.",
      "Hit the smaller pucks into the corner pockets.",
      "Aim carefully to avoid fouls."
    ]
  },

  // Puzzle & Brain Games
  { 
    id: 'sudoku', 
    name: 'Sudoku', 
    description: 'Number placement logic puzzle.', 
    color: 'bg-blue-600', 
    icon: Grid, 
    minPlayers: 1, 
    maxPlayers: 1, 
    category: 'Puzzle',
    tutorialSteps: [
      "Fill the grid with numbers 1 to 9.",
      "No number can repeat in a row, column, or 3x3 box.",
      "Tap a cell, then tap a number to fill it."
    ]
  },
  { 
    id: 'crossword', 
    name: 'Crossword', 
    description: 'Word puzzle.', 
    color: 'bg-green-600', 
    icon: Type, 
    minPlayers: 1, 
    maxPlayers: 1, 
    category: 'Puzzle',
    tutorialSteps: [
      "Read the clues for Across and Down words.",
      "Tap a cell on the grid to select it.",
      "Type the answer using the on-screen keyboard."
    ]
  },
  { 
    id: 'sliding', 
    name: 'Sliding Puzzle', 
    description: 'Order the tiles.', 
    color: 'bg-pink-500', 
    icon: Puzzle, 
    minPlayers: 1, 
    maxPlayers: 1, 
    category: 'Puzzle',
    tutorialSteps: [
      "Arrange the tiles in order from 1 to 15.",
      "Tap a tile next to the empty space to slide it.",
      "The empty space should end up in the bottom right."
    ]
  },
  { 
    id: 'wordsearch', 
    name: 'Word Search', 
    description: 'Find hidden words.', 
    color: 'bg-teal-500', 
    icon: Search, 
    minPlayers: 1, 
    maxPlayers: 1, 
    category: 'Puzzle',
    tutorialSteps: [
      "Find all the words listed at the bottom.",
      "Words can be horizontal, vertical, or diagonal.",
      "Drag across letters to highlight a word."
    ]
  },
  { 
    id: 'memory', 
    name: 'Memory Match', 
    description: 'Find matching pairs.', 
    color: 'bg-purple-500', 
    icon: BrainCircuit, 
    minPlayers: 1, 
    maxPlayers: 2, 
    category: 'Puzzle',
    tutorialSteps: [
      "Tap a card to flip it over.",
      "Find the matching card to clear the pair.",
      "Clear the board in the fewest moves possible."
    ]
  },
];

type AppState = 'BOOT' | 'SPLASH' | 'ONBOARDING' | 'HUB' | 'GAME';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('BOOT');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'PVP' | 'CPU'>('PVP');
  
  const gamesSectionRef = useRef<HTMLDivElement>(null);

  // --- Initial Boot Logic ---
  useEffect(() => {
    // Check local storage for user
    const savedProfile = getUserProfile();
    setUserProfile(savedProfile);
    
    // Start Audio Context
    audio.play('startup');

    // Proceed to Splash
    setAppState('SPLASH');
  }, []);

  const handleSplashComplete = () => {
    if (userProfile) {
      setAppState('HUB');
    } else {
      setAppState('ONBOARDING');
    }
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setAppState('HUB');
  };

  const startGame = (id: string, mode: 'PVP' | 'CPU') => {
    setGameMode(mode);
    setActiveGameId(id);
    setAppState('GAME');
  };

  const backToHub = () => {
    setActiveGameId(null);
    setAppState('HUB');
  };

  const scrollToGames = () => {
    audio.play('click');
    gamesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Render Logic ---

  if (appState === 'SPLASH') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appState === 'ONBOARDING') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (appState === 'GAME' && activeGameId) {
    const activeGame = GAMES.find(g => g.id === activeGameId);
    if (!activeGame) return null;

    let Component: React.FC<any>;
    switch (activeGame.id) {
      case 'tictactoe': Component = TicTacToe; break;
      case 'connect4': Component = ConnectFour; break;
      case 'snakes': Component = SnakesAndLadders; break;
      case 'checkers': Component = Checkers; break;
      case 'memory': Component = MemoryGame; break;
      case 'carrom': Component = CanvasGame; break;
      case 'chess': Component = Chess; break;
      case 'ludo': Component = Ludo; break;
      case 'ninemens': Component = NineMensMorris; break;
      case 'reversi': Component = Reversi; break;
      case 'sliding': Component = SlidingPuzzle; break;
      case 'sudoku': Component = Sudoku; break;
      case 'wordsearch': Component = WordSearch; break;
      case 'crossword': Component = Crossword; break;
      default: Component = () => <div>Coming Soon</div>;
    }

    return (
      <GameShell game={activeGame} onBack={backToHub}>
        {({ onEndGame }) => <Component onEnd={onEndGame} vsComputer={gameMode === 'CPU'} />}
      </GameShell>
    );
  }

  // HUB Render
  const classicGames = GAMES.filter(g => g.category !== 'Puzzle');
  const puzzleGames = GAMES.filter(g => g.category === 'Puzzle');

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-slate-50"
    >
       {/* HERO SECTION */}
       <div className="relative min-h-[90vh] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          <div className="absolute inset-0 z-0">
             <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-200 rounded-full blur-[100px] opacity-40 animate-pulse"></div>
             <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-pink-200 rounded-full blur-[100px] opacity-40 animate-pulse delay-1000"></div>
          </div>

          <motion.div 
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ duration: 0.6 }}
             className="relative z-10 max-w-2xl"
          >
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6 border border-slate-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm font-bold text-slate-600">Welcome back, {userProfile?.username}</span>
             </div>

             <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                Classic Games. <br/>
                <span className="text-blue-600">Pure Fun.</span>
             </h1>
             
             <p className="text-xl text-slate-500 mb-10 leading-relaxed font-medium">
                No installs. No signup. Just instant play. <br/>
                Choose a game and start winning in seconds.
             </p>

             <button 
                onClick={scrollToGames}
                className="group relative px-8 py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl shadow-2xl hover:bg-blue-600 transition-all hover:scale-105 active:scale-95"
             >
                <span className="relative z-10 flex items-center gap-3">
                   Start Playing <ArrowDown className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                </span>
             </button>
          </motion.div>
       </div>

       {/* GAMES LIST (Revealed on Scroll) */}
       <div ref={gamesSectionRef} className="p-6 md:p-8 max-w-6xl mx-auto pb-24 bg-white rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.05)] relative z-20">
           <div className="w-20 h-1 bg-slate-200 rounded-full mx-auto mb-16"></div>
           
           <div className="space-y-16">
               {/* Section 1: Classic */}
               <section>
                   <div className="flex items-center gap-4 mb-8 px-2">
                       <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><Gamepad2 className="w-8 h-8" /></div>
                       <div>
                           <h2 className="text-3xl font-black text-slate-800">Classic Board Games</h2>
                           <p className="text-slate-500 font-medium">Timeless strategy for everyone</p>
                       </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {classicGames.map((game, idx) => (
                          <GameCard key={game.id} game={game} idx={idx} onStart={startGame} />
                      ))}
                   </div>
               </section>

               {/* Section 2: Puzzles */}
               <section>
                   <div className="flex items-center gap-4 mb-8 px-2">
                       <div className="p-3 bg-pink-100 rounded-2xl text-pink-600"><BrainCircuit className="w-8 h-8" /></div>
                       <div>
                           <h2 className="text-3xl font-black text-slate-800">Puzzle & Brain</h2>
                           <p className="text-slate-500 font-medium">Challenge your mind</p>
                       </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {puzzleGames.map((game, idx) => (
                          <GameCard key={game.id} game={game} idx={idx} onStart={startGame} />
                      ))}
                   </div>
               </section>
           </div>
       </div>
       
       <footer className="bg-slate-50 text-center text-slate-400 text-sm py-12">
          <p>© 2024 Classic Games Hub. Safe & Offline.</p>
       </footer>
    </motion.div>
  );
};

const GameCard: React.FC<{
    game: GameDefinition;
    idx: number;
    onStart: (id: string, mode: 'PVP' | 'CPU') => void;
}> = ({ game, idx, onStart }) => {
    const stats = getStats(game.id);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: idx * 0.05 }}
            className="group bg-slate-50 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left border border-slate-100 relative overflow-hidden flex flex-col h-full"
        >
            <div className={`absolute top-0 right-0 w-32 h-32 ${game.color} opacity-5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150`}></div>
            
            <div className="flex items-start justify-between mb-4">
                <div className={`p-4 rounded-2xl ${game.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <game.icon className="w-8 h-8" />
                </div>
                <div className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-400 border border-slate-200">
                    {game.minPlayers === 1 && game.maxPlayers === 1 ? 'Solo' : game.minPlayers === 1 ? 'Solo / PvP' : `${game.minPlayers}-${game.maxPlayers} Players`}
                </div>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-2">{game.name}</h3>
            <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow font-medium leading-relaxed">{game.description}</p>
            
            <div className="grid grid-cols-2 gap-2 mt-auto">
                {game.maxPlayers >= 2 ? (
                <>
                    <button 
                        onClick={() => onStart(game.id, 'PVP')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-600 font-bold hover:border-slate-300 hover:bg-slate-100 transition-colors text-sm"
                    >
                        <Users className="w-4 h-4" /> PvP
                    </button>
                    <button 
                        onClick={() => onStart(game.id, 'CPU')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-200"
                    >
                        <Bot className="w-4 h-4" /> vs CPU
                    </button>
                </>
                ) : (
                <button 
                    onClick={() => onStart(game.id, 'PVP')} // Solo games just use 'PVP' mode key for simplicity or default
                    className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-200"
                >
                    <Play className="w-4 h-4" /> Play Now
                </button>
                )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold pt-4 mt-4 border-t border-slate-200">
                <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-orange-400" />
                    <span>{stats.wins} Wins</span>
                </div>
                <div className="flex items-center gap-1">
                    <Play className="w-4 h-4 text-blue-400" />
                    <span>{stats.played} Plays</span>
                </div>
            </div>
        </motion.div>
    );
};

export default App;