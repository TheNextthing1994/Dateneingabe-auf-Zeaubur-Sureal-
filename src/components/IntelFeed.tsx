import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Lightbulb, 
  Target, 
  ArrowRight, 
  Trash2, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Hammer, 
  History,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DailyIntel } from '../types';

interface IntelFeedProps {
  items: DailyIntel[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onAddDemo?: () => void;
}

export const IntelFeed: React.FC<IntelFeedProps> = ({ items, onDelete, onUpdateStatus, onAddDemo }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="p-4 bg-white/5 rounded-full mb-4">
          <Youtube className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium uppercase tracking-widest">No Daily Intel Yet</p>
        <p className="text-xs mt-2 opacity-50 mb-8">Share a YouTube link to trigger the Agentic Workflow</p>
        
        <button 
          onClick={onAddDemo}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Demo-Daten laden (UI Test)
        </button>
      </div>
    );
  }

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Kein Datum';
    
    let date: Date;
    if (typeof ts === 'number') {
      date = new Date(ts);
    } else if (typeof ts === 'string') {
      // Handle SurrealDB explorer dots
      const cleanTs = ts.replace(/\./g, '');
      const num = Number(cleanTs);
      if (!isNaN(num)) {
        date = new Date(num);
      } else {
        date = new Date(ts);
      }
    } else {
      date = new Date(ts);
    }

    if (isNaN(date.getTime())) {
      console.warn('IntelFeed: Invalid date for timestamp:', ts);
      return 'Ungültiges Datum';
    }
    
    return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${date.toLocaleDateString()}`;
  };

  return (
    <div className="space-y-12 pb-20">
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          // Debug log for items that seem broken
          if (!item.navigator_infographic || !item.timestamp) {
            console.warn('IntelFeed: Rendering potentially broken item:', item);
          }
          
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-lg mx-auto"
            >
              {/* Infographic Container (Shorts Style) */}
              <div className="relative bg-slate-900 border-2 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50">
                {/* Top Bar */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-amber-500 to-primary animate-pulse" />
                
                {/* Header Info */}
                <div className="p-8 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Morning Navigator</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        {formatTimestamp(item.timestamp)}
                      </div>
                    </div>
                  </div>
                <div className="flex items-center gap-2">
                  {item.additional_urls && item.additional_urls.length > 0 && (
                    <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Kombiniert ({item.additional_urls.length + 1})</span>
                    </div>
                  )}
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Content (The Infographic) */}
              <div className="px-8 space-y-8">
                {/* Headline */}
                <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                  {item.navigator_infographic?.headline || item.title}
                </h2>

                {/* Visual Summary (The "Shorts" Content) */}
                <div className="space-y-4">
                  {item.navigator_infographic?.visual_summary?.map((line, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 + 0.3 }}
                      className="flex items-start gap-4 group"
                    >
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] group-hover:scale-150 transition-transform" />
                      <p className="text-base font-bold text-slate-200 leading-snug">
                        {line}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Punchline */}
                {item.navigator_infographic?.punchline && (
                  <div className="py-4 px-6 bg-primary/10 border border-primary/20 rounded-2xl">
                    <p className="text-sm font-black text-primary italic text-center">
                      "{item.navigator_infographic.punchline}"
                    </p>
                  </div>
                )}

                {/* Agent Reports (Expandable/Tabs) */}
                <div className="space-y-6 pt-4 border-t border-white/5">
                  {/* Analyst Report */}
                  {item.analyst_report && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <ShieldCheck className="w-3 h-3" /> Analyst Officer
                        </div>
                        <div className="px-2 py-0.5 bg-amber-500/20 text-amber-500 rounded-full text-[9px] font-black">
                          SCORE: {item.analyst_report.relevance_score}/10
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 leading-relaxed">
                        {item.analyst_report.goal_alignment}
                      </div>
                    </div>
                  )}

                  {/* Supreme Decision */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <TrendingUp className="w-3 h-3" /> Supreme Decision
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                      (item.supreme_decision === 'build' || item.supreme_decision?.toString() === 'build') ? "bg-emerald-500 text-slate-900" : "bg-slate-700 text-slate-300"
                    )}>
                      {(item.supreme_decision === 'build' || item.supreme_decision?.toString() === 'build') ? 'BUILD MODE' : 'ARCHIVED'}
                    </div>
                  </div>

                  {/* Builder Plan (If applicable) */}
                  {item.builder_plan && (
                    <div className="space-y-4 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                      <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        <Hammer className="w-3 h-3" /> Builder Workflow
                      </div>
                      <div className="space-y-3">
                        {item.builder_plan?.steps?.map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400 shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-xs text-slate-300 font-medium">{step}</p>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-emerald-500/10 text-[10px] text-emerald-500/60 font-mono">
                        STACK: {item.builder_plan.tech_stack_notes}
                      </div>
                    </div>
                  )}

                  {/* Chronicle Log */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      <History className="w-3 h-3" /> Chronicle Log
                    </div>
                    <div className="space-y-1">
                      {item.chronicle_log?.map((log, i) => (
                        <div key={i} className="text-[9px] text-slate-600 font-medium flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-8 pt-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => window.open(item.url, '_blank')}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {item.additional_urls && item.additional_urls.length > 0 ? 'Video 1' : 'Video'}
                  </button>
                  {item.supreme_decision === 'build' && (
                    <button 
                      onClick={() => onUpdateStatus(item.id, 'active')}
                      className="flex-[2] py-4 bg-primary text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                    >
                      <Hammer className="w-4 h-4" />
                      Plan Aktivieren
                    </button>
                  )}
                </div>
                
                {item.additional_urls && item.additional_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.additional_urls?.map((url, i) => (
                      <button 
                        key={i}
                        onClick={() => window.open(url, '_blank')}
                        className="flex-1 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Video {i + 2}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Background Glow */}
            <div className="absolute -inset-4 bg-primary/5 blur-3xl -z-10 rounded-full opacity-50" />
          </motion.div>
        );
      })}
    </AnimatePresence>
    </div>
  );
};
