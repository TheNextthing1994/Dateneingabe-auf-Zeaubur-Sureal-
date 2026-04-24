import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentLog } from '../../types';
import { Terminal, MessageSquare, Brain, Zap } from 'lucide-react';

interface LiveLogProps {
  logs: AgentLog[];
}

export const LiveLog: React.FC<LiveLogProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'thought': return <Brain className="w-3 h-3 text-purple-400" />;
      case 'action': return <Zap className="w-3 h-3 text-yellow-400" />;
      default: return <MessageSquare className="w-3 h-3 text-blue-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CEO': return 'text-red-500';
      case 'Vorarbeiter': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-black/60 border border-white/10 rounded-sm flex flex-col h-full overflow-hidden relative">
      {/* TV Scanline Overlay (subtle) */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] z-10" />
      
      <div className="p-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-red-500" />
          <h2 className="font-sans font-medium text-xs uppercase tracking-widest text-gray-200">Live Mission Log</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-[10px] text-red-500 uppercase">Echtzeit-Feed</span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth scrollbar-none"
      >
        <AnimatePresence mode="popLayout">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex gap-3 items-start border-l border-white/5 pl-3"
            >
              <div className="mt-1">
                {getTypeIcon(log.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-tighter ${getRoleColor(log.agentRole)}`}>
                    {log.agentName}
                  </span>
                  <span className="font-mono text-[9px] text-gray-600">
                    {new Date(log.timestamp).toLocaleTimeString('de-DE', { hour12: false })}
                  </span>
                </div>
                <p className="font-sans text-xs text-gray-300 leading-relaxed tracking-wide">
                  {log.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {logs.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="font-mono text-xs text-gray-600 animate-pulse uppercase tracking-widest">Warte auf Kommunikation...</p>
          </div>
        )}
      </div>

      <div className="p-2 bg-black/40 border-t border-white/5">
        <div className="flex justify-between items-center px-2">
          <p className="font-mono text-[8px] text-gray-700">PROTOKOLL-ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
          <p className="font-mono text-[8px] text-gray-700">SYSTEM: KERN-HIERARCHY-V1</p>
        </div>
      </div>
    </div>
  );
};
