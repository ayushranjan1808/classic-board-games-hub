import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Sparkles } from 'lucide-react';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
       {/* Background Particles */}
       <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
             <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1.5], x: Math.random() * 400 - 200, y: Math.random() * 400 - 200 }}
                transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
                className="absolute top-1/2 left-1/2 bg-white rounded-full w-2 h-2"
             />
          ))}
       </div>

       <div className="relative flex flex-col items-center">
          <motion.div
             initial={{ scale: 0, rotate: -180, opacity: 0 }}
             animate={{ scale: 1, rotate: 0, opacity: 1 }}
             transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
             className="bg-white p-6 rounded-3xl shadow-2xl mb-6 relative"
          >
              <Gamepad2 className="w-20 h-20 text-indigo-600" />
              <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                 className="absolute -top-3 -right-3 bg-yellow-400 p-2 rounded-full"
              >
                  <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
          </motion.div>

          <motion.h1
             initial={{ y: 50, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.6, type: "spring" }}
             className="text-4xl md:text-6xl font-black text-white tracking-tight text-center drop-shadow-md"
          >
             Classic Games <br/>
             <span className="text-yellow-300">Hub</span>
          </motion.h1>

          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 1, duration: 0.8 }}
             className="text-indigo-100 font-medium mt-4 tracking-widest text-sm uppercase"
          >
              Loading your playground...
          </motion.p>
       </div>
    </div>
  );
};