import React, { useRef, useEffect } from 'react';

// Simple Physics Engine for Carrom-like experience
export const CanvasGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;

        let animationFrameId: number;

        // Game State
        const striker = { x: 150, y: 350, r: 15, vx: 0, vy: 0, color: '#facc15' };
        const pucks = [
            { x: 150, y: 150, r: 12, vx: 0, vy: 0, color: '#000' },
            { x: 170, y: 170, r: 12, vx: 0, vy: 0, color: '#fff', border: true },
        ];

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw Board
            ctx.fillStyle = '#fde68a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Pockets
            ctx.fillStyle = '#333';
            [[0,0], [300,0], [0,400], [300,400]].forEach(([x,y]) => {
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI*2);
                ctx.fill();
            });

            // Physics Update (very basic)
            [striker, ...pucks].forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.98; // friction
                p.vy *= 0.98;

                // Wall bounce
                if(p.x < p.r || p.x > canvas.width - p.r) p.vx *= -1;
                if(p.y < p.r || p.y > canvas.height - p.r) p.vy *= -1;
            });

            // Draw Pieces
            [striker, ...pucks].forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fillStyle = p.color;
                ctx.fill();
                if((p as any).border) {
                    ctx.strokeStyle = '#000';
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };
        
        // Simple Interaction
        const handleClick = (e: MouseEvent) => {
             // Shoot striker towards center for demo
             striker.vx = (Math.random() - 0.5) * 20;
             striker.vy = -15;
        };

        canvas.addEventListener('click', handleClick);
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            canvas.removeEventListener('click', handleClick);
        }
    }, []);

    return (
        <div className="flex flex-col items-center">
            <p className="mb-4 text-slate-500 text-sm">Tap board to shoot striker (Demo)</p>
            <canvas ref={canvasRef} width={300} height={400} className="rounded-lg shadow-xl border-8 border-amber-900 cursor-pointer" />
        </div>
    );
}