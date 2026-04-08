/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Zap, 
  Target, 
  Database, 
  ArrowRight, 
  Activity,
  Cpu,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

interface BriefingOverlayProps {
  onDismiss: () => void;
  onShowIntel?: () => void;
  onShowDetails?: () => void;
  mission?: string;
  stats: {
    seeds: number;
    intel: number;
    sync: string;
  };
}

export function BriefingOverlay({ onDismiss, onShowIntel, onShowDetails, mission, stats }: BriefingOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="max-w-2xl w-full bg-slate-900/50 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-red-500/10"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-red-500/10 to-transparent">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
              <ShieldCheck className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">D.T Briefing</h2>
              <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-[0.3em]">System Status: Optimal</p>
            </div>
          </div>
          <h3 className="text-4xl font-black text-white tracking-tighter leading-tight">
            Guten Morgen<span className="text-red-600">.</span><br />
            Dein Zwilling ist bereit.
          </h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-px bg-white/5">
          <div className="p-6 bg-slate-900/40">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-3 h-3 text-slate-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Vault Seeds</span>
            </div>
            <p className="text-2xl font-black text-white">{stats.seeds}</p>
          </div>
          <button 
            onClick={onShowIntel}
            className="p-6 bg-slate-900/40 hover:bg-amber-500/5 transition-colors group/intel text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3 h-3 text-amber-500 group-hover/intel:animate-pulse" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover/intel:text-amber-500/80 transition-colors">Daily Intel</span>
            </div>
            <p className="text-2xl font-black text-white group-hover/intel:text-amber-400 transition-colors">{stats.intel}</p>
          </button>
          <div className="p-6 bg-slate-900/40">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Neural Sync</span>
            </div>
            <p className="text-2xl font-black text-emerald-400">{stats.sync}</p>
          </div>
        </div>

        {/* Mission Section */}
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aktuelle Mission</span>
            </div>
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-lg font-bold text-white leading-relaxed">
                {mission || "Ich jage jz alle meine projekte in Surreal rein so hab ich sie immer griffbereit"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button 
              onClick={onDismiss}
              className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-red-600/20"
            >
              Mission Starten
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onShowDetails}
              className="px-6 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-white/5 transition-all"
            >
              Details
            </button>
          </div>
        </div>

        {/* Footer Decoration */}
        <div className="px-8 py-4 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-slate-600" />
              <span className="text-[8px] font-mono text-slate-600 uppercase">Process: Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-slate-600" />
              <span className="text-[8px] font-mono text-slate-600 uppercase">AI: Online</span>
            </div>
          </div>
          <span className="text-[8px] font-mono text-slate-700">v2.4.0-STABLE</span>
        </div>
      </motion.div>

      {/* Background Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </motion.div>
  );
}
