/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Layout, 
  ChevronRight, 
  Target, 
  Activity, 
  Zap, 
  Sparkles, 
  Youtube,
  X, 
  FileText, 
  Pin, 
  Rocket, 
  Trash2, 
  RotateCcw,
  ArrowUpRight,
  Clock,
  ArrowRight,
  MessageSquare,
  Filter,
  Menu
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnalyzedItem, Pillar, BillboardItem, DailyIntel } from '../types';
import { LIBRARY_TYPES, LIBRARY_AREAS, LIBRARY_STATUS, LIBRARY_IMPACTS, VAULTS, INITIAL_PILLARS } from '../constants';
import { BoardCard } from './BoardCard';

import { IntelFeed } from './IntelFeed';

interface VaultViewProps {
  libraryTab: 'all' | 'intel';
  setLibraryTab: (tab: 'all' | 'intel') => void;
  dailyIntels: DailyIntel[];
  setDailyIntels: React.Dispatch<React.SetStateAction<DailyIntel[]>>;
  handleDeleteIntel: (id: string) => void;
  analyzedItems: AnalyzedItem[];
  setAnalyzedItems: React.Dispatch<React.SetStateAction<AnalyzedItem[]>>;
  librarySearch: string;
  setLibrarySearch: (val: string) => void;
  libraryType: string | null;
  setLibraryType: (val: string | null) => void;
  libraryArea: string | null;
  setLibraryArea: (val: string | null) => void;
  libraryStatus: string | null;
  setLibraryStatus: (val: string | null) => void;
  libraryImpact: number | null;
  setLibraryImpact: (val: number | null) => void;
  selectedFilterId: string | null;
  setSelectedFilterId: (val: string | null) => void;
  filteredLibraryItems: AnalyzedItem[];
  selectedLibraryItem: AnalyzedItem | null;
  setSelectedLibraryItem: (item: AnalyzedItem | null) => void;
  handleDelete: (item: AnalyzedItem) => void;
  handlePinItem: (text: string, type: 'intel' | 'blocker', origin: string, expiry: string, nextStep?: string) => void;
  handleTakeToMission: (item: AnalyzedItem | BillboardItem) => void;
  handleMakeMission: (item: AnalyzedItem) => void;
  handleMoveToVault: (item: AnalyzedItem) => void;
  handleRestoreFromVault: (item: AnalyzedItem) => void;
  handleUpdateVault: (itemId: string, vaultId: string) => void;
  toggleSeedSelection: (seed: AnalyzedItem) => void;
  onSyncDailyIntels?: () => Promise<void>;
  selectedSeeds: AnalyzedItem[];
  showNotification: (msg: string, type: 'success' | 'warn' | 'info') => void;
  knowledgePressure?: any;
}

export function VaultView({
  libraryTab,
  setLibraryTab,
  dailyIntels,
  setDailyIntels,
  handleDeleteIntel,
  analyzedItems,
  setAnalyzedItems,
  librarySearch,
  setLibrarySearch,
  libraryType,
  setLibraryType,
  libraryArea,
  setLibraryArea,
  libraryStatus,
  setLibraryStatus,
  libraryImpact,
  setLibraryImpact,
  selectedFilterId,
  setSelectedFilterId,
  filteredLibraryItems,
  selectedLibraryItem,
  setSelectedLibraryItem,
  handleDelete,
  handlePinItem,
  handleTakeToMission,
  handleMakeMission,
  handleMoveToVault,
  handleRestoreFromVault,
  handleUpdateVault,
  toggleSeedSelection,
  onSyncDailyIntels,
  selectedSeeds,
  showNotification,
  knowledgePressure
}: VaultViewProps) {
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  const librarySections = useMemo(() => {
    const sections: { title: string; icon: React.ReactNode; items: AnalyzedItem[] }[] = [];
    
    INITIAL_PILLARS.forEach(pillar => {
      const items = filteredLibraryItems.filter(item => item.pillarId === pillar.id);
      if (items.length > 0) {
        sections.push({
          title: pillar.name,
          icon: <span>{pillar.icon}</span>,
          items
        });
      }
    });

    return sections;
  }, [filteredLibraryItems]);

  return (
    <motion.div 
      key="vault"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col overflow-hidden h-full bg-slate-950/40 backdrop-blur-md rounded-3xl border border-white/5 tech-grid"
    >
      {/* Library Header */}
      <div className="px-4 md:px-8 py-4 md:py-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-slate-900/20">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-3">
              <Database className="w-6 h-6 md:w-8 md:h-8 text-primary" /> 
              KNOWLEDGE LIBRARY
            </h2>
            <p className="hidden md:flex text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1.5 items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Zentraler Wissensraum & Strategisches Archiv
            </p>
          </div>
          <div className="flex items-center bg-white/[0.03] rounded-xl p-1 border border-white/5">
            <button 
              onClick={() => setLibraryTab('all')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                libraryTab === 'all' ? "bg-primary text-slate-900" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Library
            </button>
            <button 
              onClick={() => setLibraryTab('intel')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                libraryTab === 'intel' ? "bg-amber-500 text-slate-900" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Daily Intel
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Wissen durchsuchen..."
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              className="bg-slate-900/50 border border-white/10 rounded-xl py-2 md:py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 w-full md:w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              setLibrarySearch('');
              setLibraryType(null);
              setLibraryArea(null);
              setLibraryStatus(null);
              setLibraryImpact(null);
              setSelectedFilterId(null);
            }}
            className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            title="Filter zurücksetzen"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {libraryTab === 'all' ? (
          <>
            {/* 1. LEFT COLUMN: FILTERS */}
            <aside className={cn(
              "lg:flex w-72 border-r border-white/5 flex-col bg-slate-900/10 transition-all duration-300",
              showMobileFilters ? "fixed inset-0 z-50 bg-slate-950 flex" : "hidden"
            )}>
              <div className="p-6 overflow-y-auto space-y-8 scrollbar-hide flex-1">
                <div className="lg:hidden flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-widest">Filter</h3>
                  <button onClick={() => setShowMobileFilters(false)} className="p-2 text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Filter: Typ */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Layout className="w-3 h-3" /> TYP
                  </h4>
                  <div className="space-y-1">
                    {LIBRARY_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setLibraryType(libraryType === type ? null : type);
                          if (window.innerWidth < 1024) setShowMobileFilters(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group agentic-border",
                          libraryType === type ? "bg-primary/20 text-primary border-primary/40" : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent"
                        )}
                      >
                        {type}
                        <ChevronRight className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-all", libraryType === type && "opacity-100")} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter: Bereich */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Target className="w-3 h-3" /> BEREICH
                  </h4>
                  <div className="space-y-1">
                    {LIBRARY_AREAS.map(area => (
                      <button
                        key={area.id}
                        onClick={() => {
                          setLibraryArea(libraryArea === area.id ? null : area.id);
                          if (window.innerWidth < 1024) setShowMobileFilters(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-3 group agentic-border",
                          libraryArea === area.id ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent"
                        )}
                      >
                        <span className="text-base">{area.icon}</span>
                        <span className="flex-1">{area.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter: Status */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> STATUS
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {LIBRARY_STATUS.map(status => (
                      <button
                        key={status}
                        onClick={() => setLibraryStatus(libraryStatus === status ? null : status)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all",
                          libraryStatus === status ? "bg-red-500/20 border-red-500/40 text-red-400" : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter: Impact */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> MIN. IMPACT
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {LIBRARY_IMPACTS.map(impact => (
                      <button
                        key={impact}
                        onClick={() => setLibraryImpact(libraryImpact === impact ? null : impact)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2",
                          libraryImpact === impact ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
                        )}
                      >
                        <Sparkles className="w-3 h-3" /> {impact}+
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter: Vaults (Bestehende Integration) */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Database className="w-3 h-3" /> VAULTS
                  </h4>
                  <div className="space-y-1">
                    {VAULTS.map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedFilterId(selectedFilterId === v.id ? null : v.id);
                          if (window.innerWidth < 1024) setShowMobileFilters(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-3 group agentic-border",
                          selectedFilterId === v.id ? "bg-primary/20 text-primary border-primary/40" : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent"
                        )}
                      >
                        <span className="text-base">{v.icon}</span>
                        <span className="flex-1">{v.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* 2. CENTER COLUMN: RESULTS */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-900/30">
              <div className="p-4 md:p-8 flex-1 overflow-y-auto scrollbar-hide pb-24 lg:pb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Layout className="w-4 h-4" /> 
                    {(filteredLibraryItems?.length || 0)} Einträge gefunden
                  </h3>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sortierung:</span>
                    <select className="bg-transparent border-none text-[10px] font-black text-primary uppercase tracking-widest focus:ring-0 cursor-pointer">
                      <option>Neueste zuerst</option>
                      <option>Impact Score</option>
                      <option>Alphabetisch</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-12">
                  {librarySections.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                      <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                        <Database className="w-10 h-10 text-slate-700" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-2">Kein Wissen gefunden</h4>
                      <p className="text-sm text-slate-600 max-w-xs mx-auto">
                        Passe deine Filter an oder füge neue Seeds im D.T hinzu, um deine Bibliothek zu füllen.
                      </p>
                    </div>
                  ) : (
                    librarySections.map(section => (
                      <section key={section.title} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="p-1.5 bg-white/5 rounded-lg">{section.icon}</span>
                            {section.title}
                            <span className="text-[10px] text-slate-500 font-mono ml-2 px-2 py-0.5 bg-white/5 rounded-full">
                              {section.items.length}
                            </span>
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          <AnimatePresence mode="popLayout">
                            {section.items.map(item => (
                              <BoardCard 
                                key={item.id}
                                item={item}
                                pillar={INITIAL_PILLARS.find(p => p.id === item.pillarId) || INITIAL_PILLARS[0]}
                                onDelete={handleDelete}
                                onPin={handlePinItem}
                                onTakeToMission={handleTakeToMission}
                                onMakeMission={handleMakeMission}
                                onMoveToVault={handleMoveToVault}
                                onRestoreFromVault={handleRestoreFromVault}
                                onUpdateVault={handleUpdateVault}
                                onToggleSelect={toggleSeedSelection}
                                isSelected={selectedSeeds.some(s => s.id === item.id)}
                                showNotification={showNotification}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </section>
                    ))
                  )}
                </div>
              </div>
            </main>

            {/* 3. RIGHT COLUMN: INSIGHTS & DETAILS */}
            <aside className="hidden 2xl:flex w-96 border-l border-white/5 flex-col bg-slate-900/40 backdrop-blur-xl">
              <AnimatePresence mode="wait">
                {selectedLibraryItem ? (
                  <motion.div 
                    key={selectedLibraryItem.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex flex-col p-8 overflow-y-auto"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 bg-primary/20 text-primary text-[9px] font-black rounded uppercase tracking-widest border border-primary/20">
                            {selectedLibraryItem.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-600">ID: {selectedLibraryItem.id.substring(0, 8)}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                          {selectedLibraryItem.text}
                        </h2>
                      </div>
                      <button 
                        onClick={() => setSelectedLibraryItem(null)}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-8">
                      {/* Analysis Section */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                          <FileText className="w-3 h-3" /> ANALYSE & KONTEXT
                        </h3>
                        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            "{selectedLibraryItem.reasoning || 'Keine spezifische Analyse hinterlegt.'}"
                          </p>
                        </div>
                      </div>

                      {/* Impact Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                          <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Impact Score</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-amber-500">{selectedLibraryItem.score.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-600 font-bold">/ 10.0</span>
                          </div>
                        </div>
                        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                          <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Säule</span>
                          <span className="text-sm font-black text-slate-200">
                            {INITIAL_PILLARS.find(p => p.id === selectedLibraryItem.pillarId)?.name || 'Allgemein'}
                          </span>
                        </div>
                      </div>

                      {/* Strategic Next Step */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Zap className="w-3 h-3 text-amber-500" /> STRATEGISCHER NEXT STEP
                        </h3>
                        <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                          <p className="text-xs text-amber-200 font-bold leading-relaxed">
                            {selectedLibraryItem.nextStep || 'Analysiere die nächsten Schritte zur Umsetzung.'}
                          </p>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-6 space-y-3">
                        <button 
                          onClick={() => handleTakeToMission(selectedLibraryItem)}
                          className="w-full py-4 bg-primary text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-primary/10"
                        >
                          <Rocket className="w-4 h-4" />
                          IN MISSION ZIEHEN
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => handlePinItem(selectedLibraryItem.text, 'intel', 'Library', 'dauerhaft', selectedLibraryItem.nextStep)}
                            className="py-3 bg-white/5 text-white border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                          >
                            <Pin className="w-3.5 h-3.5" /> BILLBOARD
                          </button>
                          <button 
                            onClick={() => handleDelete(selectedLibraryItem)}
                            className="py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> LÖSCHEN
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex-1 flex flex-col p-8">
                    <div className="mb-10">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">KNOWLEDGE PRESSURE PANEL</h3>
                      <div className="space-y-6">
                        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Wissens-Dichte</span>
                            <span className="text-[10px] font-mono text-primary">84%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '84%' }}
                              className="h-full bg-primary"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                <Activity className="w-4 h-4 text-indigo-400" />
                              </div>
                              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Hot Topic</span>
                            </div>
                            <p className="text-xs font-bold text-white mb-1">KI-Workflow Optimierung</p>
                            <p className="text-[10px] text-slate-500">Zuletzt aktualisiert vor 2 Std.</p>
                          </div>
                          
                          <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                <Zap className="w-4 h-4 text-amber-400" />
                              </div>
                              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">High Impact</span>
                            </div>
                            <p className="text-xs font-bold text-white mb-1">Strategische Neuausrichtung</p>
                            <p className="text-[10px] text-slate-500">Kritischer Pfad identifiziert.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto p-6 bg-primary/5 border border-primary/10 rounded-3xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                          <Database className="w-5 h-5 text-primary" />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Library Insight</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed italic mb-4">
                        "Dein Wissen wächst exponentiell. Nutze die Map-Ansicht, um verborgene Synergien zwischen deinen Projekten und Erkenntnissen zu finden."
                      </p>
                      <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">
                        Detail-Report öffnen
                      </button>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </aside>
          </>
        ) : (
          <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                    <Youtube className="w-4 h-4" /> Agentic Intel Feed
                  </h3>
                  <p className="text-2xl font-black text-white tracking-tight">Daily Strategic Briefing</p>
                </div>
                <button 
                  onClick={() => {
                    if (onSyncDailyIntels) {
                      onSyncDailyIntels();
                      showNotification("Synchronisiere Intel Feeds...", 'info');
                    }
                  }}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-[10px] font-black text-amber-500 uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  INTEL SYNCHRONISIEREN
                </button>
              </div>
              
              <IntelFeed 
                items={dailyIntels} 
                onDelete={handleDeleteIntel}
                onUpdateStatus={(id, status) => {
                  const item = dailyIntels.find(i => i.id === id);
                  if (item) {
                    const seed: AnalyzedItem = {
                      id: `seed_${Date.now()}`,
                      text: item.navigator_infographic.headline,
                      score: item.analyst_report.relevance_score,
                      pillarId: 'tech',
                      vaultId: 'projekte',
                      category: 'GAME CHANGER',
                      reasoning: item.analyst_report.goal_alignment,
                      nextStep: item.builder_plan?.steps[0] || 'Start building',
                      status: 'In Arbeit',
                      timestamp: Date.now()
                    };
                    setAnalyzedItems(prev => [seed, ...prev]);
                    showNotification("Intel in aktive Mission übernommen!", 'success');
                  }
                }}
              />
            </div>
          </main>
        )}
      </div>
    </motion.div>
  );
}
