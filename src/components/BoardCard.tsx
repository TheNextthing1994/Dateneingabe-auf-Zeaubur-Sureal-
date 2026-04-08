/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  ChevronDown, 
  ChevronUp,
  Youtube, 
  Copy, 
  Trash2, 
  Pin, 
  Zap, 
  Target, 
  Maximize2, 
  Minimize2, 
  Archive, 
  RotateCcw,
  Clock,
  ArrowUpRight,
  ArrowRight,
  MessageSquare,
  Database,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnalyzedItem, Pillar } from '../types';
import { VAULTS } from '../constants';

interface BoardCardProps {
  item: AnalyzedItem;
  pillar: Pillar;
  onDelete: (item: AnalyzedItem) => void;
  onPin: (text: string, type: 'intel' | 'blocker', origin: string, expiry: string, nextStep?: string) => void;
  onTakeToMission: (item: AnalyzedItem) => void;
  onMakeMission: (item: AnalyzedItem) => void;
  onMoveToVault: (item: AnalyzedItem) => void;
  onRestoreFromVault: (item: AnalyzedItem) => void;
  onUpdateVault: (itemId: string, vaultId: string) => void;
  onToggleSelect: (item: AnalyzedItem) => void;
  isSelected: boolean;
  showNotification: (msg: string, type: 'success' | 'warn' | 'info') => void;
}

export function BoardCard({ 
  item, 
  pillar, 
  onDelete, 
  onPin, 
  onTakeToMission, 
  onMakeMission, 
  onMoveToVault, 
  onRestoreFromVault,
  onUpdateVault,
  onToggleSelect,
  isSelected,
  showNotification 
}: BoardCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVaultSelector, setShowVaultSelector] = useState(false);
  const isNoise = item.category === 'NOISE';
  const isGC = item.category === 'GAME CHANGER';
  const vault = VAULTS.find(v => v.id === item.vaultId);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "p-4 rounded-2xl border transition-all relative group backdrop-blur-md glass-card",
        isGC ? "border-primary/30 shadow-lg shadow-primary/5 hover:border-primary/60 text-white" : 
        isNoise ? "border-white/5 line-through text-slate-600 opacity-50" :
        "border-white/10 shadow-sm hover:border-white/20 text-slate-200"
      )}
    >
      <div className={cn("flex justify-between items-start mb-3", isNoise && "opacity-50")}>
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleSelect(item)}
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                isSelected ? "bg-primary border-primary text-slate-900" : "border-white/20 hover:border-primary/50"
              )}
            >
              {isSelected && <Check className="w-3 h-3" />}
            </button>
            <span 
              className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase"
              style={{ color: pillar.color, backgroundColor: `${pillar.color}15`, border: `1px solid ${pillar.color}30` }}
            >
              {pillar.name}
            </span>
            {vault && (
              <div className="relative">
                <button 
                  onClick={() => setShowVaultSelector(!showVaultSelector)}
                  className="text-[9px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 transition-all flex items-center gap-1"
                >
                  {vault.icon} {vault.name.split(' ')[0]}
                  <ChevronDown className="w-2 h-2" />
                </button>
                
                {showVaultSelector && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 p-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {VAULTS.map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          onUpdateVault(item.id, v.id as any);
                          setShowVaultSelector(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
                          v.id === item.vaultId ? "bg-primary/20 text-primary" : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <span>{v.icon}</span>
                        <span>{v.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {item.sourceUrl && (
              <a 
                href={item.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[9px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1"
                title="Original Video ansehen"
              >
                <Youtube className="w-2.5 h-2.5" />
                VIDEO
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(item.text);
              showNotification('In die Zwischenablage kopiert', 'info');
            }}
            className="p-1 text-slate-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            title="Kopieren"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onDelete(item)}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Löschen"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <div className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-black font-mono border",
            isGC ? "bg-primary text-slate-900 border-primary" : "bg-white/5 text-slate-400 border-white/10"
          )}>
            {item.score.toFixed(1)}
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed font-medium tracking-tight mb-2">{item.text}</p>
      
      {(item.reasoning || item.nextStep) && !isNoise && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors mb-1.5"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Details
          </button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1.5 overflow-hidden"
              >
                {item.reasoning && (
                  <p className="text-[10px] text-slate-400 italic leading-relaxed">
                    <span className="text-primary/60 mr-1">Why:</span> {item.reasoning}
                  </p>
                )}
                {item.nextStep && (
                  <p className="text-[10px] text-emerald-400/80 font-medium">
                    <span className="text-emerald-500 mr-1">Next:</span> {item.nextStep}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isGC && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-primary font-bold uppercase tracking-wider flex items-center">
            <ArrowRight className="w-3 h-3 mr-1" /> Action-Plan bereit
          </p>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        <button 
          onClick={() => onToggleSelect(item)}
          className={cn(
            "p-2 md:p-1.5 rounded-lg transition-all border flex-shrink-0 flex items-center gap-1.5 px-3 md:px-2.5",
            isSelected 
              ? "bg-primary text-slate-900 border-primary shadow-lg shadow-primary/20" 
              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
          )}
          title={isSelected ? "Aus Chat-Kontext entfernen" : "In Chat-Kontext ziehen"}
        >
          <MessageSquare className={cn("w-4 h-4 md:w-3.5 md:h-3.5", isSelected ? "fill-current" : "")} />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {isSelected ? "Im Kontext" : "Kontext"}
          </span>
        </button>
        <button 
          onClick={() => onTakeToMission(item)}
          className="p-2 md:p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/20 flex-shrink-0"
          title="Zur aktiven Priorität"
        >
          <ArrowUpRight className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
        <button 
          onClick={() => onPin(item.text, 'intel', 'Seed', 'heute', item.nextStep)}
          className="p-2 md:p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex-shrink-0"
          title="Ins Billboard pinnen"
        >
          <Pin className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
        <button 
          onClick={() => onMakeMission(item)}
          className="p-2 md:p-1.5 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-all border border-amber-500/20 flex-shrink-0"
          title="Mission daraus erzeugen"
        >
          <Target className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
        <button 
          onClick={() => item.isArchived ? onRestoreFromVault(item) : onMoveToVault(item)}
          className={cn(
            "p-2 md:p-1.5 rounded-lg transition-all border flex-shrink-0",
            item.isArchived 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
              : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20"
          )}
          title={item.isArchived ? "Wiederherstellen in KERN" : "In Vault bestätigen"}
        >
          {item.isArchived ? <RotateCcw className="w-4 h-4 md:w-3.5 md:h-3.5" /> : <Database className="w-4 h-4 md:w-3.5 md:h-3.5" />}
        </button>
        <button 
          onClick={() => onDelete(item)}
          className="p-2 md:p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all border border-red-500/20 flex-shrink-0"
          title="Ignorieren / Löschen"
        >
          <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
