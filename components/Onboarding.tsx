import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../types';
import { audio } from '../services/audio';
import { ArrowRight, User, Calendar, Check, Sparkles } from 'lucide-react';
import { saveUserProfile } from '../services/storage';

type Step = 'WELCOME' | 'DETAILS' | 'USERNAME';

export const Onboarding: React.FC<{ onComplete: (profile: UserProfile) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('WELCOME');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const playClick = () => audio.play('click');

  const nextStep = (target: Step) => {
      playClick();
      setError('');
      setStep(target);
  };

  const handleFinish = () => {
      if (username.length < 3) {
          setError('Username must be at least 3 characters.');
          audio.play('error');
          return;
      }
      playClick();
      audio.play('bell');
      const profile: UserProfile = { name, dob, username };
      saveUserProfile(profile);
      onComplete(profile);
  };

  const handleDetailsSubmit = () => {
      if (!name || !dob) {
          setError('Please fill in all fields.');
          audio.play('error');
          return;
      }
      nextStep('USERNAME');
  };

  const variants = {
      initial: { opacity: 0, x: 50 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -50 }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-50 flex items-center justify-center p-6">
       <div className="w-full max-w-md">
           <AnimatePresence mode="wait">
               {step === 'WELCOME' && (
                   <motion.div
                      key="welcome"
                      variants={variants}
                      initial="initial" animate="animate" exit="exit"
                      className="flex flex-col items-center text-center"
                   >
                       <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                           <Sparkles className="w-12 h-12 text-blue-500 animate-pulse" />
                       </div>
                       <h2 className="text-3xl font-black text-slate-800 mb-2">Welcome!</h2>
                       <p className="text-slate-500 mb-8 text-lg">Let's set up your profile so you can start tracking your wins!</p>
                       <button
                          onClick={() => nextStep('DETAILS')}
                          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
                       >
                           Let's Go <ArrowRight className="w-5 h-5" />
                       </button>
                   </motion.div>
               )}

               {step === 'DETAILS' && (
                   <motion.div
                      key="details"
                      variants={variants}
                      initial="initial" animate="animate" exit="exit"
                      className="bg-white p-8 rounded-3xl shadow-xl"
                   >
                       <h3 className="text-2xl font-bold text-slate-800 mb-6">Tell us about you</h3>
                       
                       <div className="space-y-4 mb-8">
                           <div>
                               <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Full Name</label>
                               <div className="relative">
                                   <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                   <input 
                                      type="text" 
                                      value={name}
                                      onChange={(e) => setName(e.target.value)}
                                      className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                      placeholder="Your Name"
                                   />
                               </div>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Date of Birth</label>
                               <div className="relative">
                                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                   <input 
                                      type="date" 
                                      value={dob}
                                      onChange={(e) => setDob(e.target.value)}
                                      className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                   />
                               </div>
                           </div>
                       </div>
                       
                       {error && <p className="text-red-500 text-sm font-bold text-center mb-4">{error}</p>}

                       <button
                          onClick={handleDetailsSubmit}
                          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all"
                       >
                           Continue
                       </button>
                   </motion.div>
               )}

               {step === 'USERNAME' && (
                   <motion.div
                      key="username"
                      variants={variants}
                      initial="initial" animate="animate" exit="exit"
                      className="bg-white p-8 rounded-3xl shadow-xl text-center"
                   >
                       <div className="mb-6">
                           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                               <User className="w-8 h-8 text-green-600" />
                           </div>
                           <h3 className="text-2xl font-bold text-slate-800">Choose a Username</h3>
                           <p className="text-slate-400 text-sm mt-1">This is how you'll appear in games.</p>
                       </div>
                       
                       <div className="mb-8">
                           <input 
                              type="text" 
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-full px-4 py-4 bg-slate-50 rounded-xl font-black text-xl text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all border-2 border-transparent focus:border-green-200"
                              placeholder="CoolPlayer123"
                           />
                       </div>

                       {error && <p className="text-red-500 text-sm font-bold text-center mb-4">{error}</p>}

                       <button
                          onClick={handleFinish}
                          className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-green-600 hover:scale-105 transition-all flex items-center justify-center gap-2"
                       >
                           Start Playing <Check className="w-5 h-5" />
                       </button>
                   </motion.div>
               )}
           </AnimatePresence>
       </div>
    </div>
  );
};