import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Flame, 
  Target, 
  Timer, 
  TrendingUp, 
  Zap, 
  ChevronRight, 
  Brain,
  MessageSquare,
  Lock,
  Focus
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function VayWorkspace() {
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [objective, setObjective] = useState('');
  const [phase, setPhase] = useState<'work' | 'rest'>('work');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sessionActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setSessionActive(false);
      // Play sound or notify
    }
    return () => clearInterval(timer);
  }, [sessionActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    if (!objective.trim()) return;
    setSessionActive(true);
    setTimeLeft(phase === 'work' ? 25 * 60 : 5 * 60);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#050505] text-zinc-100">
      {/* Left Column: Focus Console */}
      <div className="w-[380px] border-r border-zinc-900 flex flex-col bg-zinc-950/50 p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-tighter text-zinc-500 uppercase">System Status</span>
            <span className="text-xs font-bold font-mono tracking-widest text-zinc-200">VAY WORKSPACE (HARD)</span>
          </div>
        </div>

        {/* Focus Timer */}
        <div className="space-y-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <Timer className="w-12 h-12" />
            </div>
            
            <div className="relative z-10 text-center space-y-2">
              <span className="text-[10px] font-mono text-red-500 uppercase tracking-[0.3em]">
                {phase === 'work' ? 'Deep Work Phase' : 'Cool Down'}
              </span>
              <div className={cn(
                "text-6xl font-black font-mono tracking-tighter",
                sessionActive ? "text-white" : "text-zinc-600"
              )}>
                {formatTime(timeLeft)}
              </div>
              
              {!sessionActive ? (
                <button 
                  onClick={startSession}
                  className="w-full mt-4 py-2 bg-zinc-100 text-black text-xs font-black uppercase tracking-widest rounded-lg hover:bg-white transition-all transform hover:scale-[1.02]"
                >
                  Initiate Focus
                </button>
              ) : (
                <button 
                  onClick={() => setSessionActive(false)}
                  className="w-full mt-4 py-2 bg-red-600/20 text-red-500 border border-red-500/30 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-red-600/30 transition-all"
                >
                  Abort Session
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Phase Objective */}
        <div className="space-y-3">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-3 h-3 text-red-500" />
                Hard Goal (Phase Objective)
            </label>
            <textarea 
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Was MUSS in diesen 25 Minuten erledigt werden?"
                disabled={sessionActive}
                className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-medium placeholder:text-zinc-700 focus:outline-none focus:border-red-500/50 disabled:opacity-50 resize-none transition-all"
            />
        </div>

        {/* Performance Stats */}
        <div className="flex-1 flex flex-col justify-end space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Focus Flow</div>
                    <div className="text-xl font-bold font-mono">88%</div>
                </div>
                <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Entropy</div>
                    <div className="text-xl font-bold font-mono">2.1</div>
                </div>
            </div>
            
            <div className="p-4 bg-red-600/5 border border-red-500/10 rounded-xl">
                <p className="text-[10px] text-red-400 font-mono italic leading-relaxed">
                    &quot;Hard Mode is not for ideation, it's for annihilation of complexity.&quot;
                </p>
            </div>
        </div>
      </div>

      {/* Main Content: Execution Field */}
      <div className="flex-1 flex flex-col relative">
        {/* Workspace HUD */}
        <div className="h-14 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/20 backdrop-blur-md">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    LIVE SESSION: VAY-01
                </div>
                <div className="h-4 w-px bg-zinc-800" />
                <div className="flex items-center gap-4">
                    <button className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors">RESOURCES</button>
                    <button className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors">BLOCKERS</button>
                    <button className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors">PRIORITY_1</button>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <button className="p-2 text-zinc-500 hover:text-white"><Zap className="w-4 h-4" /></button>
                <button className="p-2 text-zinc-500 hover:text-white"><Lock className="w-4 h-4" /></button>
            </div>
        </div>

        {/* Interaction/Terminal Area */}
        <div className="flex-1 p-8 overflow-y-auto space-y-8">
            {objective ? (
                <div className="max-w-3xl mx-auto space-y-12">
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                    >
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-zinc-100 flex items-center gap-4">
                            Active Implementation
                            <span className="text-red-600 animate-pulse">_</span>
                        </h2>
                        <p className="text-zinc-500 font-mono text-sm max-w-xl">
                            Phase goal locked. Focus on the core mechanism. Eliminate distractions.
                        </p>
                    </motion.div>

                    {/* Problem Discussion Area */}
                    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-sm min-h-[400px] flex flex-col">
                        <div className="flex-1 font-mono text-sm text-zinc-400 space-y-6">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 bg-red-600/20 text-red-500 flex items-center justify-center rounded text-[10px]">DT</div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-zinc-200">Session initiated. Ready for deep-work support.</p>
                                    <p>Based on your objective: &quot;{objective}&quot;.</p>
                                    <p>I am extracting relevant patterns from your Vault now.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 relative">
                            <input 
                                type="text"
                                placeholder="Describe a blocker or request specific implementation data..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pl-6 text-sm outline-none focus:border-red-500/30 transition-all font-mono"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-600">
                                ENTER TO COMMIT
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full flex items-center justify-center">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center space-y-6"
                    >
                        <Focus className="w-16 h-16 text-zinc-800 mx-auto" />
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold uppercase tracking-widest text-zinc-700">Enter Focus Mode</h3>
                            <p className="text-zinc-600 max-w-xs text-sm font-light">Set a hard objective to begin the implementation phase.</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
      </div>

      {/* Right Column: Resource Map */}
      <div className="w-[300px] border-l border-zinc-900 p-6 space-y-6 bg-zinc-950/20">
        <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Active Context</h4>
        
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-red-500">SEED_EXTRACT</span>
                        <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-red-500" />
                    </div>
                    <div className="text-xs font-medium text-zinc-300">Relevant implementation pattern #{i}</div>
                </div>
            ))}
        </div>

        <div className="pt-6 border-t border-zinc-900 mt-auto">
             <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Session Yield</span>
                </div>
                <div className="space-y-2">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 w-1/3" />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                        <span>Output</span>
                        <span>0.4x Target</span>
                    </div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
}
