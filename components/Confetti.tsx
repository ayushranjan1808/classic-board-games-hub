import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const colors = ['#EF476F', '#FFD166', '#06D6A0', '#118AB2', '#073B4C'];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
}

export const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // vw
      y: -10 - Math.random() * 20, // start above screen
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random(),
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: p.y + 'vh', x: p.x + 'vw', rotate: p.rotation, scale: 0 }}
          animate={{
            y: '110vh',
            x: p.x + (Math.random() * 20 - 10) + 'vw',
            rotate: p.rotation + 360,
            scale: p.scale,
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            ease: 'easeOut',
            repeat: 0,
          }}
          style={{
            position: 'absolute',
            width: '12px',
            height: '12px',
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};