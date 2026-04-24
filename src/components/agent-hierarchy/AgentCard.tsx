import React from 'react';
import { motion } from 'motion/react';
import { Agent } from '../../types';
import { Activity, Clock, DollarSign, ShieldCheck, UserCog, Database } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Working': return 'text-blue-400';
      case 'Done': return 'text-emerald-400';
      case 'Error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'CEO': return <ShieldCheck className="w-5 h-5 text-red-500" />;
      case 'Vorarbeiter': return <UserCog className="w-5 h-5 text-blue-500" />;
      default: return <Database className="w-5 h-5 text-gray-400" />;
    }
  };

  const isSpeaking = agent.status === 'Working' && Math.random() > 0.5; // Mock speaking status for now

  return (
    <div className={`bg-black/40 border p-4 rounded-sm flex flex-col gap-4 group transition-all duration-300 ${isSpeaking ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] scale-[1.02]' : 'border-white/10 hover:border-red-500/30'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-sm">
            {getRoleIcon(agent.role)}
          </div>
          <div>
            <h3 className="font-sans font-medium text-sm text-gray-200 tracking-tight">{agent.name}</h3>
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">{agent.role}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/5`}>
          <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'Working' ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className={`font-mono text-[10px] uppercase tracking-tighter ${getStatusColor(agent.status)}`}>
            {agent.status}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[40px]">
        {agent.currentTask ? (
          <p className="text-xs text-gray-400 italic leading-relaxed line-clamp-2">
            "{agent.currentTask}"
          </p>
        ) : (
          <p className="text-xs text-gray-600 italic">Bereit für Anweisungen...</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] text-gray-600 uppercase">Budget verbraucht</span>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-red-400" />
            <span className="font-mono text-sm text-gray-300">{(agent.budget / 100).toFixed(2)}€</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-[9px] text-gray-600 uppercase">Effizienz</span>
          <span className="font-mono text-sm text-gray-300">98.2%</span>
        </div>
      </div>
    </div>
  );
};
