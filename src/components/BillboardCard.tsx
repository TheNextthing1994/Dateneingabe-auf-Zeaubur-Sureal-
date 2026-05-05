import React from 'react';
import { motion } from 'motion/react';
import { Pin, Clock, Target, Trash2, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';

import { BillboardItem } from '../types';

interface BillboardCardProps {
  item: BillboardItem;
  onRemove: (id: string, type: 'intel' | 'blocker') => void;
  onTakeToMission: (item: BillboardItem) => void;
  onAdvance?: (item: BillboardItem) => void;
}

export function BillboardCard({ 
  item, 
  onRemove, 
  onTakeToMission,
  onAdvance
}: BillboardCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative p-3 rounded-xl border transition-all",
        item.type === 'intel' 
          ? "bg-sky-400/5 border-sky-400/20 hover:border-sky-400/40" 
          : "bg-red-400/5 border-red-400/20 hover:border-red-400/40"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Pin className={cn("w-3 h-3", item.type === 'intel' ? "text-sky-400" : "text-red-400")} />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {item.origin}
          </span>
          {item.expiry && (
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
              • <Clock className="w-2 h-2" /> {item.expiry}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {item.type === 'intel' && onAdvance && (
            <button 
              onClick={() => onAdvance(item)}
              className="p-1 hover:bg-white/10 rounded text-sky-400 hover:text-sky-300 transition-colors"
              title="Nächster Schritt (Überschreiben)"
            >
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          <button 
            onClick={() => onTakeToMission(item)}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-primary transition-colors"
            title="In Mission übernehmen"
          >
            <Target className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onRemove(item.id, item.type)}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-red-400 transition-colors"
            title="Entfernen"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <p className={cn(
        "text-xs leading-relaxed font-medium",
        item.type === 'intel' ? "text-sky-100" : "text-red-100"
      )}>
        {item.text}
      </p>
      {item.nextStep && (
        <div className="mt-2 pt-2 border-t border-sky-400/10">
          <p className="text-[9px] font-bold text-sky-400/60 uppercase tracking-widest mb-1">Nächster Schritt:</p>
          <p className="text-[10px] text-sky-300/80 italic leading-snug">
            {item.nextStep}
          </p>
        </div>
      )}
    </motion.div>
  );
}
