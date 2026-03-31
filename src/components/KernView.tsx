/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  Zap, 
  FileText, 
  Loader2, 
  History, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2, 
  MessageSquare, 
  ChevronUp, 
  ChevronDown, 
  Database, 
  X, 
  Send, 
  Brain, 
  Car, 
  Shuffle, 
  Plus, 
  Settings, 
  Save, 
  Sparkles, 
  Trash2, 
  Volume2, 
  ArrowRight, 
  Calendar, 
  Check, 
  Trophy, 
  Layers, 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  Download,
  Target,
  Pin as PinIcon,
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LogEntry, AnalyzedItem, MemoryConcept, WeeklyTask, BillboardItem } from '../types';
import { OPERATIVE_TILES, INITIAL_PILLARS, VAULTS } from '../constants';
import { BillboardCard } from './BillboardCard';
import { BoardCard } from './BoardCard';

interface KernViewProps {
  seedInput: string;
  setSeedInput: (val: string) => void;
  isAnalyzing: boolean;
  handleAnalyze: () => void;
  isFileLoading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isInputCollapsed: boolean;
  setIsInputCollapsed: (val: boolean) => void;
  isLogCollapsed: boolean;
  setIsLogCollapsed: (val: boolean) => void;
  logs: LogEntry[];
  chatInput: string;
  setChatInput: (val: string) => void;
  isChatting: boolean;
  handleChatSubmit: (e?: React.FormEvent, deep?: boolean) => void;
  isChatCollapsed: boolean;
  setIsChatCollapsed: (val: boolean) => void;
  chatLogRef: React.RefObject<HTMLDivElement>;
  selectedSeeds: AnalyzedItem[];
  toggleSeedSelection: (seed: AnalyzedItem) => void;
  setSelectedSeeds: (seeds: AnalyzedItem[]) => void;
  memoryConcepts: MemoryConcept[];
  currentMemoryIndex: number;
  setCurrentMemoryIndex: (idx: number) => void;
  isMemoryInputOpen: boolean;
  setIsMemoryInputOpen: (val: boolean) => void;
  isMemoryModalOpen: boolean;
  setIsMemoryModalOpen: (val: boolean) => void;
  newConcept: { term: string; definition: string; images: string };
  setNewConcept: React.Dispatch<React.SetStateAction<{ term: string; definition: string; images: string }>>;
  isGeneratingImage: boolean;
  handleGenerateImage: () => void;
  handleAddMemoryConcept: () => void;
  handleRemoveMemoryConcept: (id: string) => void;
  handleSpeakConcept: (concept: MemoryConcept) => void;
  isSpeaking: boolean;
  isAutoPlayActive: boolean;
  setIsAutoPlayActive: (val: boolean) => void;
  weeklyTasks: WeeklyTask[];
  weeklyTaskInput: string;
  setWeeklyTaskInput: (val: string) => void;
  handleAddWeeklyTask: () => void;
  handleToggleWeeklyTask: (task: WeeklyTask) => void;
  handleDeleteWeeklyTask: (task: WeeklyTask) => void;
  topPriority: AnalyzedItem | null;
  handleTakeToMission: (item: AnalyzedItem | BillboardItem) => void;
  handlePinItem: (text: string, type: 'intel' | 'blocker', origin: string, expiry: string, nextStep?: string) => void;
  handleSaveBillboard: () => void;
  pinnedIntelItems: BillboardItem[];
  pinnedBlockerItems: BillboardItem[];
  intelInput: string;
  setIntelInput: (val: string) => void;
  blockerInput: string;
  setBlockerInput: (val: string) => void;
  handleManualPin: (type: 'intel' | 'blocker') => void;
  handleRemoveBillboardItem: (id: string, type: 'intel' | 'blocker') => void;
  handleAdvanceBillboardItem: (item: BillboardItem) => void;
  selectedFilterId: string | null;
  setSelectedFilterId: (id: string | null) => void;
  analyzedItems: AnalyzedItem[];
  handleExportCSV: () => void;
}

export function KernView({
  seedInput,
  setSeedInput,
  isAnalyzing,
  handleAnalyze,
  isFileLoading,
  handleFileUpload,
  fileInputRef,
  isInputCollapsed,
  setIsInputCollapsed,
  isLogCollapsed,
  setIsLogCollapsed,
  logs,
  chatInput,
  setChatInput,
  isChatting,
  handleChatSubmit,
  isChatCollapsed,
  setIsChatCollapsed,
  chatLogRef,
  selectedSeeds,
  toggleSeedSelection,
  setSelectedSeeds,
  memoryConcepts,
  currentMemoryIndex,
  setCurrentMemoryIndex,
  isMemoryInputOpen,
  setIsMemoryInputOpen,
  isMemoryModalOpen,
  setIsMemoryModalOpen,
  newConcept,
  setNewConcept,
  isGeneratingImage,
  handleGenerateImage,
  handleAddMemoryConcept,
  handleRemoveMemoryConcept,
  handleSpeakConcept,
  isSpeaking,
  isAutoPlayActive,
  setIsAutoPlayActive,
  weeklyTasks,
  weeklyTaskInput,
  setWeeklyTaskInput,
  handleAddWeeklyTask,
  handleToggleWeeklyTask,
  handleDeleteWeeklyTask,
  topPriority,
  handleTakeToMission,
  handlePinItem,
  handleSaveBillboard,
  pinnedIntelItems,
  pinnedBlockerItems,
  intelInput,
  setIntelInput,
  blockerInput,
  setBlockerInput,
  handleManualPin,
  handleRemoveBillboardItem,
  handleAdvanceBillboardItem,
  selectedFilterId,
  setSelectedFilterId,
  analyzedItems,
  handleExportCSV
}: KernViewProps) {
  return (
    <motion.div 
      key="kern"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden"
    >
      {/* Left Panel: Input & Status */}
      <section className="lg:w-1/3 bg-dark p-4 sm:p-5 border-r border-white/5 flex flex-col overflow-y-auto lg:h-full">
        <div className={cn("transition-all duration-500 overflow-hidden", isInputCollapsed ? "max-h-0 opacity-0 mb-0" : "max-h-[500px] opacity-100 mb-6")}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white tracking-tight">🌱 Seed-Eingabe</h2>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-full uppercase tracking-wider">Input Mode</span>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            YouTube-Links, Chat-Texte oder flüchtige Gedanken – wirf alles in den Trichter.
          </p>
          
          <div className="bg-panel/40 backdrop-blur-sm p-4 rounded-2xl border border-white/5 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Neuer Seed</label>
              <span className="text-[10px] text-slate-500 font-mono">{seedInput.length} chars</span>
            </div>
            <textarea 
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && handleAnalyze()}
              rows={2} 
              className="w-full bg-black/20 text-white p-3 rounded-xl border border-white/5 focus:border-primary/50 focus:ring-0 outline-none transition-all text-sm resize-none placeholder:text-slate-700" 
              placeholder="Was beschäftigt dich gerade?"
            />
            
            <div className="mt-4 flex items-center gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isFileLoading || isAnalyzing}
                className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/5 transition-all flex items-center justify-center flex-1 sm:flex-none"
                title="Datei hochladen"
              >
                {isFileLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span className="ml-2 text-[11px] font-bold uppercase tracking-wider sm:hidden">File</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".txt,.log"
              />
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !seedInput.trim()}
                className={cn(
                  "flex-[2] sm:flex-1 bg-primary text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary/10 flex items-center justify-center active:scale-95",
                  (isAnalyzing || !seedInput.trim()) && "opacity-50 cursor-not-allowed grayscale"
                )}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span className="text-[11px] uppercase tracking-wider">Analysieren</span>
                    <Zap className="w-3.5 h-3.5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Log & Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 lg:overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <h3 className="text-[11px] font-bold text-slate-400 flex items-center uppercase tracking-wider">
              <History className="w-3.5 h-3.5 mr-2 text-slate-500" /> Analysten-Log
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsLogCollapsed(!isLogCollapsed)}
                className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all active:scale-95"
                title={isLogCollapsed ? "Log zeigen" : "Log einklappen"}
              >
                {isLogCollapsed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span className="hidden xs:inline">{isLogCollapsed ? "Log" : "Hide"}</span>
              </button>
              <button 
                onClick={() => setIsInputCollapsed(!isInputCollapsed)}
                className="flex items-center gap-1.5 text-[9px] font-bold text-primary/70 hover:text-primary uppercase tracking-widest px-2 py-1 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/10 transition-all active:scale-95"
                title={isInputCollapsed ? "Seed-Eingabe öffnen" : "Seed-Eingabe einklappen"}
              >
                {isInputCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                <span className="hidden xs:inline">{isInputCollapsed ? "Input" : "Hide"}</span>
              </button>
            </div>
          </div>

          {/* System Logs (Collapsible) */}
          <div className={cn("space-y-1.5 mb-3 transition-all duration-500 overflow-hidden", isLogCollapsed ? "max-h-0 opacity-0" : "max-h-[100px] opacity-100 overflow-y-auto pr-2 scrollbar-hide")}>
            {logs.filter(l => l.sender === 'System').map(log => (
              <div key={log.id} className="text-[9px] text-slate-500 italic border-l border-white/10 pl-2 py-0.5 bg-white/[0.02] rounded-r-lg">
                <span className="text-[8px] text-slate-700 mr-2 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {log.text}
              </div>
            ))}
          </div>

          {/* Chat Area (Collapsible) */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-slate-400 flex items-center uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 mr-2 text-slate-500" /> Chat
              </h3>
              <button 
                onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                className="p-1.5 text-slate-500 hover:text-primary transition-all"
              >
                {isChatCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <div className={cn("flex-1 flex flex-col min-h-0 transition-all duration-500 overflow-hidden", isChatCollapsed ? "max-h-0 opacity-0" : "max-h-full opacity-100")}>
              {/* Chat Messages */}
              <div ref={chatLogRef} className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide mb-3 min-h-[150px] lg:min-h-0">
                <AnimatePresence initial={false}>
                  {logs.filter(l => l.sender !== 'System').map((log) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all backdrop-blur-md",
                        log.sender === 'User' 
                          ? "bg-white/5 border-white/5 text-slate-300 ml-4" 
                          : "bg-primary/5 border-primary/20 text-slate-200 mr-4"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider",
                          log.sender === 'User' ? "text-slate-500" : "text-primary"
                        )}>
                          {log.sender}
                        </span>
                        <span className="text-[8px] text-slate-600 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="markdown-body text-xs">
                        <ReactMarkdown>{log.text}</ReactMarkdown>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Selected Seeds Context */}
              {selectedSeeds.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 p-2 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="w-full flex justify-between items-center mb-1 px-1">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                      <Database className="w-2.5 h-2.5" /> {selectedSeeds.length} Seeds im Kontext
                    </span>
                    <button 
                      onClick={() => setSelectedSeeds([])}
                      className="text-[8px] text-slate-500 hover:text-red-400 font-bold uppercase tracking-tighter transition-colors"
                    >
                      Alle entfernen
                    </button>
                  </div>
                  <AnimatePresence>
                    {selectedSeeds.map(seed => (
                      <motion.div 
                        key={seed.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg group"
                      >
                        <span className="text-[10px] text-slate-200 truncate max-w-[120px] font-medium">
                          {seed.text.substring(0, 25)}...
                        </span>
                        <button 
                          onClick={() => toggleSeedSelection(seed)}
                          className="text-primary/40 hover:text-red-400 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Chat Input */}
              <form onSubmit={(e) => handleChatSubmit(e)} className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Frag deinen digitalen Zwilling..."
                    disabled={isChatting}
                    className="w-full bg-panel/40 border border-white/10 rounded-xl py-2 pl-3 pr-10 text-xs focus:border-primary/50 outline-none transition-all placeholder:text-slate-600"
                  />
                  <button 
                    type="submit"
                    disabled={isChatting || !chatInput.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-30"
                  >
                    {isChatting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <button 
                  type="button"
                  onClick={() => handleChatSubmit(undefined, true)}
                  disabled={isChatting || !chatInput.trim()}
                  className="p-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl border border-accent/20 transition-all flex items-center justify-center group"
                  title="Tiefe Antwort anfordern"
                >
                  <Zap className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </button>
              </form>
            </div>

            {isChatCollapsed && logs.filter(l => l.sender !== 'System').length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-all" onClick={() => setIsChatCollapsed(false)}>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  Letzte Nachricht: {logs.filter(l => l.sender !== 'System').slice(-1)[0].text.substring(0, 30)}...
                </p>
              </div>
            )}
          </div>

          {/* Memory Core Widget */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-slate-400 flex items-center uppercase tracking-wider">
                <Brain className="w-3.5 h-3.5 mr-2 text-primary" /> Memory Core (Pläne & Projekte)
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAutoPlayActive(!isAutoPlayActive)}
                  className={cn(
                    "p-1.5 rounded-lg border transition-all",
                    isAutoPlayActive 
                      ? "bg-primary/20 border-primary/40 text-primary" 
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-primary"
                  )}
                  title={isAutoPlayActive ? "Auto-Play Deaktivieren" : "Auto-Play Aktivieren (Podcast Modus)"}
                >
                  <Car className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    const nextIdx = Math.floor(Math.random() * memoryConcepts.length);
                    setCurrentMemoryIndex(nextIdx);
                  }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-primary transition-all"
                  title="Zufälliges Konzept"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsMemoryInputOpen(!isMemoryInputOpen)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider",
                    isMemoryInputOpen 
                      ? "bg-primary text-slate-900 border-primary" 
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-primary"
                  )}
                >
                  <Plus className="w-3 h-3" />
                  <span>Neu</span>
                </button>
                <button 
                  onClick={() => setIsMemoryModalOpen(true)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-primary transition-all"
                  title="Alle Konzepte verwalten"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {isMemoryInputOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 space-y-3 bg-white/[0.02] p-3 rounded-xl border border-white/5"
              >
                <input 
                  type="text"
                  value={newConcept.term}
                  onChange={(e) => setNewConcept(prev => ({ ...prev, term: e.target.value }))}
                  placeholder="Begriff (z.B. Highlevel Overview)"
                  className="w-full bg-black/20 text-white p-2 rounded-lg border border-white/5 focus:border-primary/50 outline-none text-xs"
                />
                <textarea 
                  value={newConcept.definition}
                  onChange={(e) => setNewConcept(prev => ({ ...prev, definition: e.target.value }))}
                  placeholder="Plan-Stichpunkte, Status oder Definition..."
                  rows={3}
                  className="w-full bg-black/20 text-white p-2 rounded-lg border border-white/5 focus:border-primary/50 outline-none text-xs resize-none"
                />
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newConcept.images}
                    onChange={(e) => setNewConcept(prev => ({ ...prev, images: e.target.value }))}
                    placeholder="Bild-URLs..."
                    className="flex-1 bg-black/20 text-white p-2 rounded-lg border border-white/5 focus:border-primary/50 outline-none text-xs"
                  />
                  <button 
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !newConcept.term.trim()}
                    className={cn(
                      "px-3 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg border border-accent/30 transition-all flex items-center justify-center disabled:opacity-30",
                      isGeneratingImage && "animate-pulse"
                    )}
                    title="KI-Konzeptbild generieren"
                  >
                    {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 italic px-1">Tipp: Nutze ✨ für KI-Bilder oder kopiere URLs hier rein.</p>
                <button 
                  onClick={handleAddMemoryConcept}
                  className="w-full bg-primary text-slate-900 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Save className="w-3 h-3" /> Speichern
                </button>
              </motion.div>
            )}

            {memoryConcepts.length > 0 ? (
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleRemoveMemoryConcept(memoryConcepts[currentMemoryIndex].id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-500 transition-all ml-2"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleSpeakConcept(memoryConcepts[currentMemoryIndex])}
                    disabled={isSpeaking}
                    className={cn(
                      "p-2 bg-primary/20 hover:bg-primary/30 rounded-full text-primary transition-all",
                      isSpeaking && "animate-pulse"
                    )}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black rounded-full uppercase tracking-widest">
                    Eintrag {currentMemoryIndex + 1}/{memoryConcepts.length}
                  </span>
                  {isAutoPlayActive && (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-accent uppercase tracking-widest animate-pulse">
                      <Car className="w-2 h-2" /> Podcast Modus Aktiv
                    </span>
                  )}
                </div>
                
                <h4 className="text-sm font-bold text-white mb-2 tracking-tight">
                  {memoryConcepts[currentMemoryIndex].term}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  "{memoryConcepts[currentMemoryIndex].definition}"
                </p>

                {memoryConcepts[currentMemoryIndex].images && memoryConcepts[currentMemoryIndex].images!.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {memoryConcepts[currentMemoryIndex].images!.slice(0, 2).map((img, i) => (
                      <motion.img 
                        key={i} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={img} 
                        alt="Concept Visual" 
                        referrerPolicy="no-referrer"
                        className="w-full h-20 object-cover rounded-lg border border-white/10 shadow-lg"
                      />
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-1">
                    {memoryConcepts.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentMemoryIndex(idx)}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all",
                          idx === currentMemoryIndex ? "bg-primary w-4" : "bg-white/10 hover:bg-white/20"
                        )}
                      />
                    ))}
                  </div>
                  <button 
                    onClick={() => setCurrentMemoryIndex((currentMemoryIndex + 1) % memoryConcepts.length)}
                    className="text-[10px] font-bold text-primary/60 hover:text-primary uppercase tracking-widest flex items-center gap-1"
                  >
                    Nächstes <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Keine Konzepte gespeichert</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Right Panel: Dashboard */}
      <section className="lg:w-2/3 bg-dark flex flex-col overflow-y-auto relative lg:h-full">
        
        {/* Top Dashboard */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="grid grid-cols-1 2xl:grid-cols-3 gap-8">
            <div className="2xl:col-span-2 min-w-0">
              {/* Operative Dashboard */}
              <div className="mb-6 sm:mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center">
                    <Settings className="w-3 h-3 mr-2" /> Operative Status
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-primary font-bold uppercase tracking-widest px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all active:scale-95"
                      title="Alle Daten als CSV exportieren"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Export</span>
                    </button>
                    {selectedFilterId && (
                      <button 
                        onClick={() => setSelectedFilterId(null)}
                        className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 font-bold uppercase tracking-widest px-3 py-2 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/10 transition-all active:scale-95"
                        title="Filter zurücksetzen"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Reset</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="pb-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {OPERATIVE_TILES.map(tile => {
                      const tileItems = analyzedItems.filter(i => i.status === tile.status);
                      const count = tileItems.length;
                      const isActive = selectedFilterId === tile.id;
                      
                      // Mini-Kontext Logik
                      let contextStr = "";
                      if (tile.id === 'offen') {
                        if (count === 0) contextStr = "Keine neuen Seeds";
                        else {
                          const oldest = Math.min(...tileItems.map(i => i.timestamp || Date.now()));
                          const diffMin = Math.floor((Date.now() - oldest) / 60000);
                          const timeStr = diffMin < 1 ? "gerade eben" : diffMin < 60 ? `seit ${diffMin} Min` : `seit ${Math.floor(diffMin/60)} Std`;
                          contextStr = `${count} unverarbeitete Seeds ${timeStr}`;
                        }
                      } else if (tile.id === 'in_arbeit') {
                        contextStr = count === 1 ? "1 aktive Mission" : `${count} aktive Missionen`;
                      } else if (tile.id === 'blockiert') {
                        contextStr = count === 1 ? "1 offener Blocker" : `${count} offene Blocker`;
                      }

                      return (
                        <button 
                          key={tile.id} 
                          onClick={() => setSelectedFilterId(isActive ? null : tile.id)}
                          className="flex flex-col items-center group outline-none w-full"
                        >
                          <div className={cn(
                            "w-full bg-panel/30 backdrop-blur-md rounded-2xl border p-4 sm:p-6 flex items-center gap-4 relative transition-all duration-300 overflow-hidden",
                            isActive 
                              ? "border-primary shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-[1.02]" 
                              : "border-white/5 hover:border-white/10",
                            tile.id === 'in_arbeit' && count > 0 && "shadow-[0_0_25px_rgba(59,130,246,0.15)]",
                            tile.id === 'blockiert' && count > 0 && "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                          )}>
                            {/* Background Glow */}
                            <div className={cn(
                              "absolute -top-12 -right-12 w-24 h-24 blur-3xl rounded-full transition-all duration-500",
                              tile.id === 'in_arbeit' && count > 0 ? "bg-primary/20" : "bg-white/5"
                            )}></div>
                            
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300",
                              isActive ? "bg-primary/20 scale-110" : "bg-white/5 group-hover:scale-110",
                              tile.id === 'blockiert' && count > 0 && "animate-pulse"
                            )}>
                              {tile.icon}
                            </div>
                            
                            <div className="text-left flex-1">
                              <span className={cn(
                                "block text-[10px] font-bold uppercase tracking-[0.2em] mb-1 transition-colors",
                                isActive ? "text-primary" : "text-slate-500"
                              )}>
                                {tile.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-white">
                                  {count}
                                </span>
                                {tile.id === 'blockiert' && count > 0 && (
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                )}
                                {tile.id === 'in_arbeit' && count > 0 && (
                                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                )}
                              </div>
                              <p className="text-[9px] font-medium text-slate-400 mt-1 italic leading-tight">
                                {contextStr}
                              </p>
                            </div>

                            {isActive && (
                              <div className="absolute bottom-0 left-0 h-1 bg-primary w-full"></div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    WÖCHENTLICHE ROADMAP
                  </h2>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Wochen-Fokus
                  </span>
                </div>
                
                <div className="bg-panel/30 backdrop-blur-md border border-white/5 rounded-3xl p-6">
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text"
                      value={weeklyTaskInput}
                      onChange={(e) => setWeeklyTaskInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddWeeklyTask()}
                      placeholder="Neues Wochenziel hinzufügen..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                    />
                    <button 
                      onClick={handleAddWeeklyTask}
                      className="p-2 bg-primary text-dark rounded-xl hover:bg-primary/90 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {weeklyTasks.length > 0 ? (
                      weeklyTasks.map(task => (
                        <div 
                          key={task.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all group",
                            task.completed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-white/5 hover:border-white/10"
                          )}
                        >
                          <button 
                            onClick={() => handleToggleWeeklyTask(task)}
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                              task.completed ? "bg-emerald-500 border-emerald-500 text-dark" : "border-white/20 hover:border-primary/50"
                            )}
                          >
                            {task.completed && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <span className={cn(
                            "flex-1 text-sm transition-all",
                            task.completed ? "text-emerald-400/50 line-through" : "text-slate-200"
                          )}>
                            {task.text}
                          </span>
                          <button 
                            onClick={() => handleDeleteWeeklyTask(task)}
                            className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500 italic text-sm">
                        Keine Wochenziele definiert. Plane deine Woche für maximale Klarheit.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    AKTIVE PRIORITÄT
                  </h2>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse">
                    Top Game Changer
                  </span>
                </div>
                
                {topPriority ? (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-panel/30 backdrop-blur-md border border-primary/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-2xl shadow-primary/5"
                  >
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-700"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                      <div className="flex-1 space-y-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                              {VAULTS.find(v => v.id === topPriority.vaultId)?.name || 'UNBEKANNT'}
                            </span>
                            <div className="h-px flex-1 bg-white/5"></div>
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                            {topPriority.text}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Brain className="w-3 h-3" /> Warum das jetzt?
                            </p>
                            <p className="text-sm text-slate-300 leading-relaxed italic">
                              "{topPriority.reasoning || 'Dieser Seed hat das höchste Potenzial für signifikanten Fortschritt.'}"
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Zap className="w-3 h-3" /> Nächster Schritt
                            </p>
                            <p className="text-sm text-white font-medium leading-relaxed">
                              {topPriority.nextStep || 'Analysiere die nächsten Schritte zur Umsetzung.'}
                            </p>
                          </div>
                          
                          {/* Mission Details */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Layers className="w-3 h-3" /> Missionstyp
                            </p>
                            <p className="text-sm text-slate-300 font-medium">
                              {topPriority.missionType || 'Bauen'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <ShieldAlert className="w-3 h-3" /> Blockiert durch?
                            </p>
                            <p className={cn(
                              "text-sm font-medium",
                              topPriority.blockedBy && topPriority.blockedBy !== 'Keine' ? "text-red-400" : "text-slate-300"
                            )}>
                              {topPriority.blockedBy || 'Keine'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" /> Konsequenz bei Ignorieren
                            </p>
                            <p className="text-sm text-red-400/80 leading-relaxed italic">
                              {topPriority.consequence || 'Keine unmittelbare Konsequenz definiert.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-auto flex flex-col gap-4">
                        {/* Compact Priority Block (Entscheidungsmodul) */}
                        <div className="w-full md:w-56 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Trophy className="w-12 h-12 text-primary" />
                          </div>
                          
                          <div className="flex flex-col relative z-10">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Impact Score</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-black text-primary tracking-tighter">{topPriority.score.toFixed(1)}</span>
                              <span className="text-xs font-bold text-slate-600">/ 10</span>
                            </div>
                          </div>

                          <div className="h-px bg-white/10"></div>

                          <div className="space-y-3 relative z-10">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bereich</span>
                              <span className="text-[11px] font-bold text-slate-200 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                {INITIAL_PILLARS.find(p => p.id === topPriority.pillarId)?.name || 'Allgemein'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                              <div className="flex items-center gap-1.5">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  topPriority.status === 'In Arbeit' ? "bg-blue-500" : 
                                  topPriority.status === 'Blockiert' ? "bg-red-500" : "bg-emerald-500"
                                )}></div>
                                <span className={cn(
                                  "text-[11px] font-bold uppercase tracking-tight",
                                  topPriority.status === 'In Arbeit' ? "text-blue-400" : 
                                  topPriority.status === 'Blockiert' ? "text-red-400" : "text-emerald-400"
                                )}>
                                  {topPriority.status || 'Offen'}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aufwand</span>
                              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-primary" />
                                {topPriority.duration || 'Unbekannt'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleTakeToMission(topPriority)}
                          className="w-full px-6 py-4 bg-primary text-dark font-black uppercase tracking-tighter rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 group/btn active:scale-95"
                        >
                          <span>Mission starten</span>
                          <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-panel/20 backdrop-blur-sm border border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <Target className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-400 mb-2">Keine aktive Priorität</h3>
                    <p className="text-sm text-slate-500 max-w-xs">
                      Analysiere neue Seeds, um den wichtigsten Game Changer für heute zu identifizieren.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mission Billboard */}
            <div className="2xl:col-span-1">
              <section className="bg-panel/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 h-full flex flex-col relative overflow-hidden group">
                {/* Billboard Header */}
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
                    <Database className="w-6 h-6 text-primary" />
                    BILLBOARD
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSaveBillboard}
                      className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-all"
                      title="Speichern"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Billboard Content */}
                <div className="flex-1 space-y-8 relative z-10 overflow-y-auto pr-2 custom-scrollbar">
                  {/* Intel Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-sky-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Strategisches Intel
                      </h3>
                      <span className="text-[10px] font-mono text-slate-600">{pinnedIntelItems.length}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {pinnedIntelItems.map(item => (
                          <BillboardCard 
                            key={item.id} 
                            item={item} 
                            onRemove={handleRemoveBillboardItem}
                            onTakeToMission={handleTakeToMission}
                            onAdvance={handleAdvanceBillboardItem}
                          />
                        ))}
                      </AnimatePresence>
                      
                      <div className="relative">
                        <input 
                          type="text"
                          value={intelInput}
                          onChange={(e) => setIntelInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleManualPin('intel')}
                          placeholder="Quick Intel hinzufügen..."
                          className="w-full bg-sky-400/5 border border-sky-400/10 rounded-xl py-2 px-3 text-[11px] text-sky-100 placeholder:text-sky-400/30 outline-none focus:border-sky-400/40 transition-all"
                        />
                        <button 
                          onClick={() => handleManualPin('intel')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-400/60 hover:text-sky-400"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Blocker Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3" /> Aktive Blocker
                      </h3>
                      <span className="text-[10px] font-mono text-slate-600">{pinnedBlockerItems.length}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {pinnedBlockerItems.map(item => (
                          <BillboardCard 
                            key={item.id} 
                            item={item} 
                            onRemove={handleRemoveBillboardItem}
                            onTakeToMission={handleTakeToMission}
                          />
                        ))}
                      </AnimatePresence>

                      <div className="relative">
                        <input 
                          type="text"
                          value={blockerInput}
                          onChange={(e) => setBlockerInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleManualPin('blocker')}
                          placeholder="Blocker identifizieren..."
                          className="w-full bg-red-400/5 border border-red-400/10 rounded-xl py-2 px-3 text-[11px] text-red-100 placeholder:text-red-400/30 outline-none focus:border-red-400/40 transition-all"
                        />
                        <button 
                          onClick={() => handleManualPin('blocker')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400/60 hover:text-red-400"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billboard Footer Decor */}
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/5 blur-3xl rounded-full"></div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
