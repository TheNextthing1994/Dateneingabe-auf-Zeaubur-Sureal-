import React from 'react';
import { useAgents } from '../../hooks/useAgents';
import { AgentCard } from './AgentCard';
import { LiveLog } from './LiveLog';
import { GoalInput } from './GoalInput';
import { motion } from 'motion/react';
import { LayoutGrid, Cpu, Activity, Share2 } from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const { agents, logs, goal, loading, createGoal } = useAgents();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Activity className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-200 overflow-hidden font-sans">
      {/* Header / TV Overlay Style */}
      <header className="border-b border-white/10 p-4 bg-black/40 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded-sm">
            <Cpu className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">Paperclip AI <span className="text-red-600 font-black">X</span></h1>
            <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase">Autonomous Agent Hierarchy Dashboard</p>
          </div>
        </div>
        <div className="flex gap-8 items-center h-full">
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono text-gray-600 uppercase">System Status</span>
                <span className="text-xs text-emerald-500 font-mono flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    OPERATIONAL
                </span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono text-gray-600 uppercase">Active Agents</span>
                <span className="text-sm font-mono text-gray-200">{agents.length}</span>
            </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6 grid grid-cols-12 gap-6 relative">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Left Column: CEO & Agents (8 cols) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-none">
          <GoalInput 
            onCreateGoal={createGoal} 
            currentGoal={goal?.text} 
          />

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <LayoutGrid className="w-4 h-4 text-gray-600" />
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-600">Agents in Hierarchy</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Log (4 cols) */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col min-h-[400px]">
          <LiveLog logs={logs} />
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-10 border-t border-white/10 bg-black flex items-center overflow-hidden">
        <div className="bg-red-600 h-full px-4 flex items-center shrink-0 z-10">
            <span className="font-sans font-black text-[10px] text-white tracking-widest italic">BREAKING</span>
        </div>
        <div className="flex-1 relative overflow-hidden h-full flex items-center">
            <div className="absolute whitespace-nowrap animate-[scroll_30s_linear_infinite] flex items-center gap-12">
                <span className="font-mono text-[10px] text-gray-500 uppercase flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-gray-700" />
                    AGENT HIERARCHY SCALE: LEVEL 4 REACHED
                </span>
                <span className="font-mono text-[10px] text-gray-500 uppercase flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-gray-700" />
                    TOKEN EFFICIENCY: +12.4% VS PREVIOUS ITERATION
                </span>
                <span className="font-mono text-[10px] text-gray-500 uppercase flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-gray-700" />
                    SURREALDB NODE SYNCED WITH CORE COMMAND
                </span>
                <span className="font-mono text-[10px] text-gray-500 uppercase flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-gray-700" />
                    NEW AGENT ROLES PENDING APPROVAL
                </span>
                {/* Duplicate for seamless looping if needed, or rely on a CSS scroll */}
            </div>
        </div>
        <div className="bg-white/5 h-full px-4 flex items-center shrink-0 border-l border-white/10">
            <div className="flex items-center gap-4 text-[9px] font-mono text-gray-500">
                <span className="flex items-center gap-1"><Share2 className="w-3 h-3 text-red-500" /> P2P-SYNC</span>
                <span className="h-3 w-[1px] bg-white/10" />
                <span>EU-W1</span>
            </div>
        </div>
      </footer>
    </div>
  );
};
