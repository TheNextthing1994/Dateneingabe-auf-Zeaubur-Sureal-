import React from 'react';
import { motion } from 'motion/react';

interface TickerProps {
  messages: string[];
}

export default function BreakingTicker({ messages }: TickerProps) {
  const displayMessages = messages.length > 0 ? messages : ["SYSTEM READY // WAITING FOR OBSERVATION DATA //"];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-black/95 border-t border-zinc-800 z-[100] flex items-center overflow-hidden backdrop-blur-sm">
      <div className="h-full bg-red-600 px-4 flex items-center shrink-0">
        <span className="text-[10px] font-black italic text-white uppercase tracking-tighter animate-pulse">BREAKING</span>
      </div>
      
      <div className="flex-1 relative overflow-hidden h-full flex items-center">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ 
            duration: 40, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="flex whitespace-nowrap gap-12 pl-4"
        >
          {displayMessages.concat(displayMessages).map((msg, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest leading-none">
                {msg}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="px-3 border-l border-zinc-800 bg-black h-full flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500/20 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-green-500" />
          </div>
          <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">P2P-SYNC</span>
        </div>
        <div className="text-[8px] font-bold text-zinc-500 border-l border-zinc-800 pl-3">SYSTEM: KERN-OBSERVER-V1</div>
      </div>
    </div>
  );
}
