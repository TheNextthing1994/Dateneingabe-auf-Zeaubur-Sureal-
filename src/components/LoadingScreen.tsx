/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hexagon } from 'lucide-react';

interface LoadingScreenProps {
  onComplete?: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('INITIALIZING CORE...');
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      mouseRef.current = {
        x: (x - width / 2) / (width / 2),
        y: (y - height / 2) / (height / 2)
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove);

    const dots: { x: number; y: number; z: number; ox: number; oy: number; oz: number }[] = [];
    const dotCount = 800;
    const radius = Math.min(width, height) * 0.35;

    // Create sphere dots
    for (let i = 0; i < dotCount; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      dots.push({ x, y, z, ox: x, oy: y, oz: z });
    }

    let rotationX = 0;
    let rotationY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);

      rotationX += 0.002 + mouseRef.current.y * 0.01;
      rotationY += 0.005 + mouseRef.current.x * 0.01;

      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);

      dots.forEach(dot => {
        // Rotate Y
        let x = dot.ox * cosY - dot.oz * sinY;
        let z = dot.ox * sinY + dot.oz * cosY;
        
        // Rotate X
        let y = dot.oy * cosX - z * sinX;
        z = dot.oy * sinX + z * cosX;

        const perspective = 1000 / (1000 + z);
        const px = x * perspective;
        const py = y * perspective;

        const opacity = Math.max(0.1, (z + radius) / (2 * radius));
        ctx.fillStyle = `rgba(220, 38, 38, ${opacity * 0.5})`; // Sharingan Red
        ctx.beginPath();
        ctx.arc(px, py, 1.5 * perspective, 0, Math.PI * 2);
        ctx.fill();

        // Connect some dots with faint lines
        if (Math.random() > 0.995) {
          ctx.strokeStyle = `rgba(220, 38, 38, ${opacity * 0.1})`;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(0, 0);
          ctx.stroke();
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Progress simulation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => onComplete?.(), 300);
          return 100;
        }
        return prev + Math.random() * 25;
      });
    }, 200);

    const statusMessages = [
      'INITIALIZING CORE...',
      'SYNCING NEURAL PATHS...',
      'LOADING VAULT DATA...',
      'ACTIVATING SHARINGAN...',
      'DIGITAL TWIN READY'
    ];

    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      setStatus(statusMessages[msgIdx]);
      msgIdx = (msgIdx + 1) % statusMessages.length;
    }, 800);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      clearInterval(interval);
      clearInterval(msgInterval);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-[#050505] flex items-center justify-center overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 opacity-40" />
      
      <div className="relative z-10 flex flex-col items-center lg:flex-row lg:items-center lg:gap-20 max-w-6xl w-full px-10">
        {/* Left Side: Globe Placeholder (Canvas handles it) */}
        <div className="hidden lg:block w-1/2" />

        {/* Right Side: Logo & Info */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* Sharingan Base (Red Iris) */}
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute w-14 h-14 bg-red-600 rounded-full border border-red-900 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center"
              >
                <div className="w-3 h-3 bg-black rounded-full" />
                <div className="absolute inset-2 border border-black/20 rounded-full" />
              </motion.div>
              
              {/* Tomoe Container (Inside the iris) */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute w-10 h-10 z-10"
              >
                {[0, 120, 240].map((angle, i) => (
                  <div 
                    key={i}
                    className="absolute inset-0"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2">
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] rotate-[165deg]">
                        <path d="M5 2C3.34315 2 2 3.34315 2 5C2 6.65685 3.34315 8 5 8C6.65685 8 8 6.65685 8 5C8 3.34315 6.65685 2 5 2Z" fill="black"/>
                        <path d="M5 3.5C5 3.5 9 4 9 7.5C9 11 6 12 5 12C4 12 1 11 1 7.5C1 4 4 3.5 5 3.5Z" fill="black"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            <div className="flex flex-col">
              <h1 className="text-7xl font-black tracking-tighter text-white leading-none">
                D.T<span className="text-red-600">.</span>
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="h-[2px] w-8 bg-red-600" />
                <span className="text-xs font-bold text-red-500/80 uppercase tracking-[0.5em]">Digital Twin Core</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-mono text-red-500/60 tracking-[0.3em] font-bold">{status}</span>
              <span className="text-xl font-black text-white font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-red-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4 opacity-30">
              <div className="border-l border-white/10 pl-3">
                <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Neural Sync</p>
                <div className="h-0.5 w-full bg-white/5">
                  <motion.div animate={{ width: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity }} className="h-full bg-red-500/50" />
                </div>
              </div>
              <div className="border-l border-white/10 pl-3">
                <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Vault Access</p>
                <div className="h-0.5 w-full bg-white/5">
                  <motion.div animate={{ width: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} className="h-full bg-red-500/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </motion.div>
  );
}
