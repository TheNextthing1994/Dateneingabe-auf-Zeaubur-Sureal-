/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Chart as ChartJS, 
  RadialLinearScale, 
  PointElement, 
  LineElement, 
  Filler, 
  Tooltip, 
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { surrealService, SurrealConfig } from './services/surrealService';
import { getEnv } from './env';
import { 
  Brain, 
  Zap, 
  Target, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  History,
  Trash2,
  FileText,
  Loader2,
  Database,
  Wifi,
  WifiOff,
  X,
  Clock,
  Lock,
  Trophy,
  ArrowUpRight,
  Send,
  Download,
  ChevronDown,
  Shuffle,
  Save,
  Volume2,
  PlayCircle,
  Car,
  Sparkles,
  Youtube,
  Check,
  ChevronUp,
  Search,
  Filter,
  Calendar,
  Activity,
  Link,
  Plus,
  ChevronRight,
  Layout,
  Lightbulb,
  Rocket,
  Workflow,
  Pin,
  RefreshCw,
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  ShieldAlert,
  Layers,
  AlertTriangle,
  Wand2,
  Info,
  Cpu,
  Hexagon,
  Users,
  Shield,
  Monitor
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  VAULTS, 
  OPERATIVE_TILES, 
  INITIAL_PILLARS, 
  LIBRARY_TYPES, 
  LIBRARY_AREAS, 
  LIBRARY_STATUS, 
  LIBRARY_IMPACTS 
} from './constants';
import { 
  LogEntry, 
  AnalyzedItem, 
  MissionPlan, 
  BillboardItem, 
  MemoryConcept, 
  WeeklyTask, 
  Agent, 
  AgentLog, 
  AgentGoal, 
  DailyIntel,
  Pillar
} from './types';
import { LiveMode } from './components/LiveMode';
import { KernView } from './components/KernView';
import { VaultView } from './components/VaultView';
import { BillboardCard } from './components/BillboardCard';
import { useSeeds } from './hooks/useSeeds';
import { useChat } from './hooks/useChat';
import { BoardCard } from './components/BoardCard';
import { VideoAnalyst } from './components/VideoAnalyst';
import { IntelFeed } from './components/IntelFeed';
import { AgentDashboard } from './components/agent-hierarchy/AgentDashboard';
import PromptOptimizer from './components/PromptOptimizer';
import { useAgents } from './hooks/useAgents';
import { LoadingScreen } from './components/LoadingScreen';
import { BriefingOverlay } from './components/BriefingOverlay';
import IntroView from './components/IntroView';
import RapidValidator from './components/RapidValidator';
import VayWorkspace from './components/VayWorkspace';
import DesktopView from './components/DesktopView';
import BreakingTicker from './components/BreakingTicker';
import MiniObserver from './components/MiniObserver';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function App() {
  const [activeView, setActiveView] = useState<'kern' | 'vault' | 'live' | 'video' | 'agents' | 'prompts' | 'intro' | 'rapid' | 'vay' | 'desktop'>('kern');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [tickerMessages, setTickerMessages] = useState<string[]>([]);

  const addTickerMessage = (msg: string) => {
    setTickerMessages(prev => [msg, ...prev].slice(0, 10));
  };
  const [isLoading, setIsLoading] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url') || params.get('text');
    return !(sharedUrl && (sharedUrl.includes('youtube.com') || sharedUrl.includes('youtu.be')));
  });
  const [showBriefing, setShowBriefing] = useState(false);
  const [shareData, setShareData] = useState<{ url: string; prompt: string; auto: boolean } | null>(null);
  
  useEffect(() => {
    console.log("App: activeView changed to", activeView);
  }, [activeView]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; msg: string; type: 'success' | 'warn' | 'info' }[]>([]);
  const [surrealStatus, setSurrealStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const showNotification = (msg: string, type: 'success' | 'warn' | 'info' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const {
    seedInput,
    setSeedInput,
    isAnalyzing,
    setIsAnalyzing,
    analyzedItems,
    setAnalyzedItems,
    isFileLoading,
    handleAnalyze,
    handleFileUpload
  } = useSeeds(showNotification, surrealStatus, setLogs);

  const apiKey = useMemo(() => (process.env as any).GEMINI_API_KEY || getEnv('VITE_GEMINI_API_KEY'), []);

  const {
    agents,
    logs: agentLogs,
    goal: agentGoal,
    loading: agentsLoading,
    createGoal: createAgentGoal
  } = useAgents(surrealStatus, apiKey);

  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isOperativeStatusCollapsed, setIsOperativeStatusCollapsed] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const [isSurrealModalOpen, setIsSurrealModalOpen] = useState(false);
  const [missionInput, setMissionInput] = useState('');
  const [todaysMission, setTodaysMission] = useState<MissionPlan | null>(null);
  const [isLoggingMission, setIsLoggingMission] = useState(false);
  const [isMissionLocked, setIsMissionLocked] = useState(false);
  const [pinnedIntelItems, setPinnedIntelItems] = useState<BillboardItem[]>([]);
  const [pinnedBlockerItems, setPinnedBlockerItems] = useState<BillboardItem[]>([]);
  const [intelInput, setIntelInput] = useState('');
  const [blockerInput, setBlockerInput] = useState('');
  const [selectedSeeds, setSelectedSeeds] = useState<AnalyzedItem[]>([]);
  
  const {
    chatInput,
    setChatInput,
    isChatting,
    setIsChatting,
    handleChatSubmit
  } = useChat(
    showNotification,
    surrealStatus,
    logs,
    setLogs,
    selectedSeeds,
    missionInput,
    pinnedIntelItems,
    pinnedBlockerItems
  );
  
  const [dailyIntels, setDailyIntels] = useState<DailyIntel[]>(() => {
    const saved = localStorage.getItem('dt_daily_intels');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved daily intels:', e);
      }
    }
    return [];
  });

  // Persist dailyIntels to localStorage
  useEffect(() => {
    localStorage.setItem('dt_daily_intels', JSON.stringify(dailyIntels));
  }, [dailyIntels]);
  const [isProcessingIntel, setIsProcessingIntel] = useState(false);
  const processedUrls = useRef<Set<string>>(new Set());

  const processIncomingIntel = async (url: string, title?: string) => {
    if (isProcessingIntel) return;
    if (processedUrls.current.has(url)) return;
    
    setIsProcessingIntel(true);
    processedUrls.current.add(url);
    
    showNotification("Research Armada wird entsandt...", 'success');

    try {
      const apiKey = (process.env as any).GEMINI_API_KEY || getEnv('VITE_GEMINI_API_KEY');
      if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
      
      const ai = new GoogleGenAI({ apiKey });
      
      // --- STEP 1: ANALYST OFFICER (Extraction) ---
      console.log('Armada: Analyst Officer starting...');
      let analystFindings = "";
      try {
        const analystResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: `Analysiere dieses YouTube Video: ${url}. ${title ? `Titel: ${title}` : ''}. Extrahiere die Kernaussagen, technischen Details und bewerte die Relevanz (0-10).` }] }],
          config: {
            tools: [{ urlContext: {} }] as any
          }
        });
        analystFindings = analystResponse.text || "Keine Analyse möglich.";
      } catch (analystErr) {
        console.warn('Analyst Officer failed with urlContext, falling back to metadata...', analystErr);
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: `Analysiere dieses YouTube Video (nur basierend auf Titel/Metadaten): ${url}. ${title ? `Titel: ${title}` : ''}. Was lässt sich daraus ableiten?` }] }]
        });
        analystFindings = fallbackResponse.text || "Keine Metadaten-Analyse möglich.";
      }
      console.log('Armada: Analyst findings secured.');

      // --- STEP 2: RESEARCHER OFFICER (Deep Research) ---
      console.log('Armada: Researcher Officer starting research...');
      const researcherResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Basierend auf diesen Erkenntnissen: "${analystFindings}", führe eine tiefergehende Recherche durch. Suche nach aktuellen Trends, Alternativen, technischen Dokumentationen oder ähnlichen Projekten im Internet. Gib eine detaillierte Zusammenfassung deiner Funde.` }] }],
        config: {
          tools: [{ googleSearch: {} }] as any
        }
      });
      const researcherResearch = researcherResponse.text || "Keine Rechercheergebnisse.";
      console.log('Armada: Researcher research completed.');

      // --- STEP 3: ARCHITECT OFFICER (Integration) ---
      console.log('Armada: Architect Officer starting integration...');
      const existingProjects = analyzedItems.filter(i => i.vaultId === 'projekte' || i.category === 'GAME CHANGER').map(i => ({ id: i.id, text: i.text, status: i.status }));
      const architectResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Du hast folgende neue Erkenntnisse:
      Analyst: ${analystFindings}
      Researcher: ${researcherResearch}
      
      Und folgende bestehende Projekte des Nutzers:
      ${JSON.stringify(existingProjects)}
      
      Entwirf einen Plan, wie diese neuen Informationen die bestehenden Projekte anreichern oder neue Projekte initiieren können. Sei spezifisch.` }] }]
      });
      const architectIntegration = architectResponse.text || "Kein Integrationsplan erstellt.";
      console.log('Armada: Architect integration plan ready.');

      // --- STEP 4: REVIEWER OFFICER (Synthesis) ---
      console.log('Armada: Reviewer Officer starting final synthesis...');
      const finalResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Fasse die gesamte Arbeit der Research Armada zusammen und erstelle das finale Daily Intel Item.
        Analyst Findings: ${analystFindings}
        Researcher Research: ${researcherResearch}
        Architect Integration: ${architectIntegration}
        
        Antworte STRENG im JSON Format gemäß diesem Schema:
        {
          "title": "String",
          "analyst_report": { "core_points": ["String"], "relevance_score": Number, "goal_alignment": "String" },
          "supreme_decision": "build" | "archive" | "merge",
          "builder_plan": { "steps": ["String"], "tech_stack_notes": "String" },
          "navigator_infographic": { "headline": "String", "visual_summary": ["String"], "punchline": "String" },
          "chronicle_log": ["String"]
        }` }] }],
        config: {
          responseMimeType: "application/json",
        }
      });

      const result = JSON.parse(finalResponse.text || "{}");
      
      const newIntel: DailyIntel = {
        id: `INTEL_FEED:intel_${Date.now()}`,
        url,
        title: result.title || title || "YouTube Intel",
        analyst_report: result.analyst_report,
        supreme_decision: result.supreme_decision,
        builder_plan: result.builder_plan,
        navigator_infographic: result.navigator_infographic,
        chronicle_log: [
          ...result.chronicle_log,
          "Research Armada Mission erfolgreich abgeschlossen.",
          `Analyst: ${analystFindings.slice(0, 100)}...`,
          `Researcher: ${researcherResearch.slice(0, 100)}...`,
          `Architect: ${architectIntegration.slice(0, 100)}...`
        ],
        research_armada: {
          analyst_findings: analystFindings,
          researcher_research: researcherResearch,
          architect_integration: architectIntegration,
          reviewer_critique: "Final synthesis approved by Reviewer Officer."
        },
        timestamp: Date.now()
      };

      setDailyIntels(prev => [newIntel, ...prev]);
      
      if (surrealConfig.url && surrealService.isConnected()) {
        try {
          await surrealService.saveDailyIntel(newIntel);
          showNotification("Armada-Bericht im Vault gesichert", 'success');
        } catch (saveErr) {
          console.error('SurrealDB Save failed:', saveErr);
        }
      }

      showNotification(`Armada erfolgreich: ${newIntel.navigator_infographic?.headline}`, 'success');
    } catch (err: any) {
      console.error('Armada Error:', err);
      showNotification(`Armada-Fehler: ${err.message?.slice(0, 50)}...`, 'warn');
    } finally {
      setIsProcessingIntel(false);
    }
  };

  const syncDailyIntels = async () => {
    if (surrealStatus !== 'connected') return;
    
    try {
      console.log('SurrealDB: Triggering Daily Intel sync...');
      const items = await surrealService.getDailyIntels();
      console.log('SurrealDB: Daily Intels from DB:', items);
      
      if (items && items.length > 0) {
        setDailyIntels(prev => {
          // Merge DB items with local items, prioritizing DB items by ID
          const combined = [...items, ...prev];
          const unique = combined.filter((item, index, self) => {
            // Ensure we compare clean IDs
            const currentId = item.id.includes(':') ? item.id.split(':')[1] : item.id;
            const firstIndex = self.findIndex((t) => {
              const targetId = t.id.includes(':') ? t.id.split(':')[1] : t.id;
              return targetId === currentId;
            });
            return index === firstIndex;
          });
          
          return unique.sort((a, b) => {
            const tsA = typeof a.timestamp === 'number' ? a.timestamp : 0;
            const tsB = typeof b.timestamp === 'number' ? b.timestamp : 0;
            return tsB - tsA;
          });
        });
      }
    } catch (err) {
      console.error('SurrealDB: Daily Intel sync failed:', err);
    }
  };

  useEffect(() => {
    if (surrealStatus === 'connected') {
      syncDailyIntels();
    }
  }, [surrealStatus]);

  useEffect(() => {
    // Handle Web Share Target
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url') || params.get('text');
    const sharedTitle = params.get('title');

    if (sharedUrl && (sharedUrl.includes('youtube.com') || sharedUrl.includes('youtu.be'))) {
      if (!processedUrls.current.has(sharedUrl)) {
        processIncomingIntel(sharedUrl, sharedTitle || undefined);
      }
      
      // Sofort zum Daily Intel navigieren
      setActiveView('vault');
      setLibraryTab('intel');
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Only run once on mount
  const [surrealConfig, setSurrealConfig] = useState<SurrealConfig>(() => {
    const saved = localStorage.getItem('dt_surreal_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved surreal config:', e);
      }
    }
    return {
      url: getEnv('VITE_SURREALDB_URL'),
      ns: getEnv('VITE_SURREALDB_NS', 'test'),
      db: getEnv('VITE_SURREALDB_DB', 'test'),
      user: getEnv('VITE_SURREALDB_USER'),
      pass: getEnv('VITE_SURREALDB_PASS')
    };
  });

  // Persist surrealConfig to localStorage
  useEffect(() => {
    if (surrealConfig.url) {
      localStorage.setItem('dt_surreal_config', JSON.stringify(surrealConfig));
    }
  }, [surrealConfig]);

  // Library View State
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryTab, setLibraryTab] = useState<'all' | 'intel'>('all');
  const [libraryType, setLibraryType] = useState<string | null>(null);
  const [libraryArea, setLibraryArea] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<string | null>(null);
  const [libraryImpact, setLibraryImpact] = useState<number | null>(null);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<AnalyzedItem | null>(null);

  // Memory Core State
  const [memoryConcepts, setMemoryConcepts] = useState<MemoryConcept[]>([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isMemoryInputOpen, setIsMemoryInputOpen] = useState(false);
  const [newConcept, setNewConcept] = useState({ term: '', definition: '', images: '' });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(false);
  const autoPlayRef = useRef(isAutoPlayActive);
  useEffect(() => { autoPlayRef.current = isAutoPlayActive; }, [isAutoPlayActive]);

  // Weekly Tasks State
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [weeklyTaskInput, setWeeklyTaskInput] = useState('');

  const handleAddWeeklyTask = async () => {
    if (!weeklyTaskInput.trim()) return;
    const newTask: WeeklyTask = {
      id: `weekly_${Date.now()}`,
      text: weeklyTaskInput,
      completed: false,
      timestamp: Date.now()
    };
    setWeeklyTasks(prev => [newTask, ...prev]);
    setWeeklyTaskInput('');
    if (surrealStatus === 'connected') {
      try {
        await surrealService.saveWeeklyTask(newTask);
      } catch (err) {
        console.error('Error saving weekly task:', err);
      }
    }
  };

  const handleToggleWeeklyTask = async (task: WeeklyTask) => {
    const updated = { ...task, completed: !task.completed };
    setWeeklyTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    if (surrealStatus === 'connected' && task.rawId) {
      try {
        await surrealService.updateWeeklyTask(task.rawId, { completed: updated.completed });
      } catch (err) {
        console.error('Error updating weekly task:', err);
      }
    }
  };

  const handleDeleteWeeklyTask = async (task: WeeklyTask) => {
    setWeeklyTasks(prev => prev.filter(t => t.id !== task.id));
    if (surrealStatus === 'connected' && task.rawId) {
      try {
        await surrealService.deleteWeeklyTask(task.rawId);
      } catch (err) {
        console.error('Error deleting weekly task:', err);
      }
    }
  };
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const [currentMemoryIndex, setCurrentMemoryIndex] = useState(0);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    console.log('--- Environment Debug ---');
    console.log('window.ENV:', (window as any).ENV);
    console.log('VITE_GEMINI_API_KEY from getEnv:', getEnv('VITE_GEMINI_API_KEY'));
    console.log('VITE_SURREALDB_URL from getEnv:', getEnv('VITE_SURREALDB_URL'));
    console.log('-------------------------');
    
    const key = (process.env as any).GEMINI_API_KEY || getEnv('VITE_GEMINI_API_KEY');
    const keyStatus = key ? 'Gefunden' : 'Fehlt';
    console.log('Gemini API Key status:', keyStatus);
    
    if (!key) {
      showNotification("System-Warnung: Gemini API Key fehlt. Analyse deaktiviert.", 'warn');
    }
  }, []);

  const filteredItems = useMemo(() => {
    // Filter by view (Kern vs Vault)
    const baseItems = analyzedItems.filter(item => 
      activeView === 'vault' ? item.isArchived : !item.isArchived
    );
    
    if (activeView === 'vault') {
      return baseItems.filter(item => {
        const matchesSearch = !librarySearch || 
          (item.text || '').toLowerCase().includes(librarySearch.toLowerCase()) ||
          (item.name || '').toLowerCase().includes(librarySearch.toLowerCase()) ||
          (item.reasoning && item.reasoning.toLowerCase().includes(librarySearch.toLowerCase())) ||
          (item.nextStep && item.nextStep.toLowerCase().includes(librarySearch.toLowerCase()));
        
        const matchesType = !libraryType || (
          libraryType === 'Seed' ? item.vaultId === 'ideen' :
          libraryType === 'Projekt' ? item.vaultId === 'projekte' :
          libraryType === 'Erkenntnis' ? item.vaultId === 'erkenntnisse' :
          libraryType === 'Mission' ? item.vaultId === 'ziele' :
          libraryType === 'Workflow' ? item.vaultId === 'workflows' :
          false
        );
        const matchesArea = !libraryArea || item.pillarId === libraryArea;
        const matchesStatus = !libraryStatus || item.status === libraryStatus;
        const matchesImpact = !libraryImpact || item.score >= libraryImpact;
        const matchesVault = !selectedFilterId || item.vaultId === selectedFilterId;

        return matchesSearch && matchesType && matchesArea && matchesStatus && matchesImpact && matchesVault;
      });
    }

    if (!selectedFilterId) return baseItems;
    
    const operativeTile = OPERATIVE_TILES.find(t => t.id === selectedFilterId);
    if (operativeTile) {
      return baseItems.filter(item => item.status === operativeTile.status);
    }
    return baseItems.filter(item => item.vaultId === selectedFilterId);
  }, [analyzedItems, selectedFilterId, activeView, librarySearch, libraryType, libraryArea, libraryStatus, libraryImpact]);

  const librarySections = useMemo(() => {
    if (activeView !== 'vault') return [];
    
    const items = filteredItems;
    
    return [
      { 
        title: 'Aktive Themen', 
        items: items.filter(i => i.status === 'In Arbeit' || i.category === 'GAME CHANGER'),
        icon: <Activity className="w-4 h-4 text-primary" />
      },
      { 
        title: 'Vergessene starke Seeds', 
        items: items.filter(i => i.score >= 8 && (Date.now() - Number(i.timestamp) > 7 * 24 * 60 * 60 * 1000)),
        icon: <Sparkles className="w-4 h-4 text-amber-400" />
      },
      { 
        title: 'Häufig erwähnte Ideen', 
        items: items.filter(i => i.vaultId === 'ideen' && i.score >= 7),
        icon: <RefreshCw className="w-4 h-4 text-indigo-400" />
      },
      { 
        title: 'Wiederkehrende Projekte', 
        items: items.filter(i => i.vaultId === 'projekte'),
        icon: <Layout className="w-4 h-4 text-sky-400" />
      },
      { 
        title: 'Ungelöste Blocker', 
        items: items.filter(i => i.status === 'Blockiert'),
        icon: <AlertTriangle className="w-4 h-4 text-red-400" />
      }
    ].filter(s => s.items.length > 0);
  }, [activeView, filteredItems]);

  const knowledgePressure = useMemo(() => {
    if (activeView !== 'vault') return null;
    const items = analyzedItems.filter(i => i.isArchived);
    
    // 1. Recurring Themes (Mocked for now based on keywords, could be improved)
    const themes = [
      { name: 'Digital Twin', count: items.filter(i => (i.text || '').toLowerCase().includes('twin')).length },
      { name: 'Automatisierung', count: items.filter(i => (i.text || '').toLowerCase().includes('auto')).length },
      { name: 'Monetarisierung', count: items.filter(i => (i.text || '').toLowerCase().includes('geld') || (i.text || '').toLowerCase().includes('euro')).length },
      { name: 'Islam/Sirat', count: items.filter(i => i.pillarId === 'islam').length },
      { name: 'VayTube', count: items.filter(i => (i.text || '').toLowerCase().includes('tube')).length },
    ].filter(t => t.count > 0).sort((a, b) => b.count - a.count);

    // 2. Forgotten Strong Seeds
    const forgotten = items.filter(i => i.score >= 8 && (Date.now() - i.timestamp > 14 * 24 * 60 * 60 * 1000));

    // 3. Projects without Next Step
    const gapProjects = items.filter(i => i.vaultId === 'projekte' && (!i.nextStep || (i.nextStep || '').toLowerCase() === 'keine'));

    // 4. Insights without Application
    const unusedInsights = items.filter(i => i.vaultId === 'erkenntnisse' && i.status === 'Offen');

    // 5. Similar Seeds (Mocked logic)
    const similarCount = items.length > 20 ? 3 : 0;

    // 6. Chaos Clusters (High density in one area)
    const areaCounts = INITIAL_PILLARS.map(p => ({
      id: p.id,
      name: p.name,
      count: items.filter(i => i.pillarId === p.id).length
    })).sort((a, b) => b.count - a.count);
    const chaosArea = areaCounts[0]?.count > 10 ? areaCounts[0] : null;

    return { themes, forgotten, gapProjects, unusedInsights, similarCount, chaosArea };
  }, [activeView, analyzedItems]);

  const topPriority = useMemo(() => {
    if (analyzedItems.length === 0) return null;
    return [...analyzedItems].sort((a, b) => b.score - a.score)[0];
  }, [analyzedItems]);

  const handleTakeToMission = (item: AnalyzedItem) => {
    setMissionInput(item.text);
    const newMission: MissionPlan = {
      id: Date.now().toString(),
      text: item.text,
      targetDate: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    };
    setTodaysMission(newMission);
    setIsMissionLocked(true);
    localStorage.setItem('dt_mission_plan', JSON.stringify(newMission));
    showNotification('Seed in Mission übernommen!', 'success');
  };

  const handlePinItem = (text: string, type: 'intel' | 'blocker', origin: BillboardItem['origin'] = 'Manuell', expiry: BillboardItem['expiry'] = 'dauerhaft', nextStep?: string) => {
    if (!text.trim()) return;
    const newItem: BillboardItem = {
      id: Date.now().toString(),
      text,
      nextStep,
      origin,
      expiry,
      type,
      timestamp: Date.now()
    };
    if (type === 'intel') {
      const updated = [newItem, ...pinnedIntelItems];
      setPinnedIntelItems(updated);
      localStorage.setItem('dt_pinned_intel_items', JSON.stringify(updated));
      setIntelInput('');
      if (surrealStatus === 'connected') {
        surrealService.saveBillboardItem(newItem).catch(console.error);
      }
    } else {
      const updated = [newItem, ...pinnedBlockerItems];
      setPinnedBlockerItems(updated);
      localStorage.setItem('dt_pinned_blocker_items', JSON.stringify(updated));
      setBlockerInput('');
      if (surrealStatus === 'connected') {
        surrealService.saveBillboardItem(newItem).catch(console.error);
      }
    }
    showNotification(`${type === 'intel' ? 'Intel' : 'Blocker'} gepinnt!`, 'success');
  };

  const handleManualPin = (type: 'intel' | 'blocker') => {
    const text = type === 'intel' ? intelInput : blockerInput;
    if (!text.trim()) return;
    handlePinItem(text, type, 'Manuell', 'dauerhaft');
    if (type === 'intel') setIntelInput('');
    else setBlockerInput('');
  };

  const handleDeleteIntel = async (id: string) => {
    setDailyIntels(prev => prev.filter(i => i.id !== id));
    if (surrealStatus === 'connected') {
      try {
        await surrealService.deleteDailyIntel(id);
      } catch (err) {
        console.error('Error deleting intel:', err);
      }
    }
  };

  const handleLoadDemoIntel = () => {
    const demoIntel: DailyIntel = {
      id: `demo_${Date.now()}`,
      url: 'https://youtube.com/watch?v=demo',
      title: 'Demo: AI Automation Strategy 2026',
      timestamp: Date.now(),
      supreme_decision: 'build',
      analyst_report: {
        core_points: ['AI Agents are the new apps', 'SurrealDB for multi-model data', 'Vite for ultra-fast DX'],
        relevance_score: 9.5,
        goal_alignment: 'Matches Tech Mastery & Automation goals'
      },
      builder_plan: {
        steps: ['Initialize SurrealDB', 'Setup Gemini 3 Flash', 'Deploy to Zeabur'],
        tech_stack_notes: 'Focus on low-latency and real-time updates'
      },
      navigator_infographic: {
        headline: 'THE AGENTIC REVOLUTION',
        visual_summary: ['Autonome Analyse-Teams', 'Echtzeit-Intel-Feed', 'Automatisierte Workflows'],
        punchline: 'Der DT baut sich selbst.'
      },
      chronicle_log: ['Analyst Officer hat Relevanz geprüft', 'Supreme Officer hat Build-Befehl erteilt']
    };
    setDailyIntels([demoIntel]);
    showNotification("Demo-Daten geladen", 'info');
  };

  const handleUpdateIntelStatus = async (id: string, status: any) => {
    // Logic for updating status if needed, or activating builder plans
    showNotification("Builder Plan aktiviert!", "success");
  };

  const handleRemovePinnedItem = (id: string, type: 'intel' | 'blocker') => {
    if (type === 'intel') {
      const updated = pinnedIntelItems.filter(i => i.id !== id);
      setPinnedIntelItems(updated);
      localStorage.setItem('dt_pinned_intel_items', JSON.stringify(updated));
      if (surrealStatus === 'connected') {
        surrealService.deleteBillboardItem(id).catch(console.error);
      }
    } else {
      const updated = pinnedBlockerItems.filter(i => i.id !== id);
      setPinnedBlockerItems(updated);
      localStorage.setItem('dt_pinned_blocker_items', JSON.stringify(updated));
      if (surrealStatus === 'connected') {
        surrealService.deleteBillboardItem(id).catch(console.error);
      }
    }
  };

  const handleAdvanceIntel = async (item: BillboardItem) => {
    if (!item.nextStep) {
      showNotification('Kein nächster Schritt definiert.', 'info');
      return;
    }

    const updatedText = item.nextStep;
    setIsAnalyzing(true);

    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Du bist DT. Der Nutzer hat den nächsten Schritt für ein Pinned Intel erreicht.
        Das neue Intel ist: "${updatedText}"
        
        Basierend auf diesem neuen Status, was ist der ABSOLUT NÄCHSTE konkrete Schritt?
        Antworte extrem kurz (max. 1 Satz).
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const newNextStep = response.text || "";
      
      const updatedItem = {
        ...item,
        text: updatedText,
        nextStep: newNextStep,
        timestamp: Date.now()
      };

      setPinnedIntelItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      localStorage.setItem('dt_pinned_intel_items', JSON.stringify(pinnedIntelItems?.map(i => i.id === item.id ? updatedItem : i) || []));
      
      if (surrealStatus === 'connected') {
        surrealService.updateBillboardItem(item.id, updatedItem).catch(console.error);
      }
      
      showNotification('Intel vorangetrieben!', 'success');
      
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: `Intel "Vorangetrieben": ${updatedText}`,
        timestamp: Date.now()
      }]);
    } catch (err) {
      console.error('Advance Intel Error:', err);
      // Fallback: just update the text
      const updatedItem = { ...item, text: updatedText, nextStep: undefined };
      setPinnedIntelItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!newConcept.term.trim()) {
      showNotification('Bitte gib zuerst einen Begriff oder Plan-Titel ein.', 'warn');
      return;
    }
    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: getEnv('VITE_GEMINI_API_KEY') });
      const prompt = `Erstelle eine konzeptionelle Visualisierung (Highlevel Overview) für: "${newConcept.term}". 
      Fokus: Rationale Grenzenziehung des Begriffs/Plans und strukturelle Klarheit. 
      Inhalt: ${newConcept.definition || 'Strategische Planung.'}
      Stil: Nanobanana-Stil (Blueprint, minimalistisch, konzeptionell, modern).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          }
        }
      });

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error('Bildgenerierung wurde durch Sicherheitsfilter blockiert. Versuche eine andere Beschreibung.');
      }

      let imageUrl = '';
      let textResponse = '';
      for (const part of candidate?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        } else if (part.text) {
          textResponse += part.text;
        }
      }

      if (imageUrl) {
        setNewConcept(prev => ({
          ...prev,
          images: prev.images ? `${prev.images}, ${imageUrl}` : imageUrl
        }));
        showNotification('KI-Visualisierung generiert!', 'success');
      } else {
        console.warn('Model response text:', textResponse);
        throw new Error(`Kein Bild in der Antwort gefunden.${textResponse ? ' Nachricht: ' + textResponse : ''}`);
      }
    } catch (error) {
      console.error('Image generation error:', error);
      showNotification('Bildgenerierung fehlgeschlagen.', 'warn');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAddMemoryConcept = () => {
    if (!newConcept.term.trim() || !newConcept.definition.trim()) return;
    const imagesArray = newConcept.images
      ? newConcept.images.split(',').map(url => url.trim()).filter(url => url.length > 0)
      : [];
    
    const concept: MemoryConcept = {
      id: Date.now().toString(),
      term: newConcept.term,
      definition: newConcept.definition,
      images: imagesArray,
      timestamp: Date.now()
    };
    const updated = [concept, ...memoryConcepts];
    setMemoryConcepts(updated);
    localStorage.setItem('dt_memory_concepts', JSON.stringify(updated));

    // Save to SurrealDB if connected
    if (surrealStatus === 'connected') {
      surrealService.saveMemoryConcept(concept).catch(err => {
        console.error('Failed to save memory concept to SurrealDB:', err);
      });
    }

    setNewConcept({ term: '', definition: '', images: '' });
    setIsMemoryInputOpen(false);
    showNotification('Konzept im Memory Core gespeichert!', 'success');
  };

  const handleRemoveMemoryConcept = (id: string) => {
    const updated = memoryConcepts.filter(c => c.id !== id);
    setMemoryConcepts(updated);
    localStorage.setItem('dt_memory_concepts', JSON.stringify(updated));

    // Delete from SurrealDB if connected
    if (surrealStatus === 'connected') {
      surrealService.deleteMemoryConcept(id).catch(err => {
        console.error('Failed to delete memory concept from SurrealDB:', err);
      });
    }

    if (currentMemoryIndex >= updated.length) {
      setCurrentMemoryIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleSpeakConcept = async (concept: MemoryConcept) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: getEnv('VITE_GEMINI_API_KEY') });
      const prompt = `Trage den folgenden Plan oder Begriff klar und deutlich vor: 
      Titel: ${concept.term}. 
      Inhalt/Status: ${concept.definition}.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Gemini TTS returns raw PCM (16-bit, 24kHz, Mono)
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Convert 16-bit PCM to Float32 for Web Audio API
        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768.0;
        }

        const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
        audioBuffer.getChannelData(0).set(float32Data);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
          setIsSpeaking(false);
          if (autoPlayRef.current) {
            setTimeout(() => {
              setCurrentMemoryIndex(prev => (prev + 1) % memoryConcepts.length);
            }, 500);
          }
        };
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      showNotification('Sprachausgabe fehlgeschlagen.', 'warn');
    }
  };

  useEffect(() => {
    if (isAutoPlayActive && !isSpeaking && memoryConcepts.length > 0) {
      handleSpeakConcept(memoryConcepts[currentMemoryIndex]);
    }
  }, [currentMemoryIndex, isAutoPlayActive, memoryConcepts.length]);

  const handleTakeBillboardToMission = (item: BillboardItem) => {
    setMissionInput(item.text);
    const newMission: MissionPlan = {
      id: Date.now().toString(),
      text: item.text,
      targetDate: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    };
    setTodaysMission(newMission);
    setIsMissionLocked(true);
    localStorage.setItem('dt_mission_plan', JSON.stringify(newMission));
    showNotification('Billboard-Item in Mission übernommen!', 'success');
  };

  const pillars = useMemo(() => {
    return INITIAL_PILLARS.map(p => {
      const items = analyzedItems.filter(item => item.pillarId === p.id);
      // Calculate value based on total scores, capped at 100
      const totalScore = items.reduce((acc, item) => acc + item.score, 0);
      return { ...p, value: Math.min(100, totalScore) };
    });
  }, [analyzedItems]);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = 0;
    }
  }, [logs]);

  useEffect(() => {
    // Periodic Memory Core Reminder
    const interval = setInterval(() => {
      if (memoryConcepts.length > 0) {
        const randomIdx = Math.floor(Math.random() * memoryConcepts.length);
        const concept = memoryConcepts[randomIdx];
        showNotification(`Memory Core: ${concept.term}`, 'info');
      }
    }, 15 * 60 * 1000); // Every 15 minutes

    return () => clearInterval(interval);
  }, [memoryConcepts]);

  // Load local mission on mount
  useEffect(() => {
    const savedMission = localStorage.getItem('dt_mission_plan');
    if (savedMission) {
      const parsed = JSON.parse(savedMission);
      setMissionInput(parsed.text);
      setIsMissionLocked(true);
      setTodaysMission(parsed);
    }
    
    const savedIntelItems = localStorage.getItem('dt_pinned_intel_items');
    if (savedIntelItems) {
      try {
        const parsed = JSON.parse(savedIntelItems);
        if (Array.isArray(parsed)) setPinnedIntelItems(parsed);
      } catch (e) {
        console.error('Failed to parse pinned intel items:', e);
      }
    }
    
    const savedBlockerItems = localStorage.getItem('dt_pinned_blocker_items');
    if (savedBlockerItems) {
      try {
        const parsed = JSON.parse(savedBlockerItems);
        if (Array.isArray(parsed)) setPinnedBlockerItems(parsed);
      } catch (e) {
        console.error('Failed to parse pinned blocker items:', e);
      }
    }

    const savedMemoryConcepts = localStorage.getItem('dt_memory_concepts');
    if (savedMemoryConcepts) {
      try {
        const parsed = JSON.parse(savedMemoryConcepts);
        if (Array.isArray(parsed)) setMemoryConcepts(parsed);
      } catch (e) {
        console.error('Failed to parse memory concepts:', e);
        setMemoryConcepts([]);
      }
    } else {
      setMemoryConcepts([]);
    }

    const savedLogs = localStorage.getItem('dt_chat_logs');
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        if (Array.isArray(parsed)) setLogs(parsed);
      } catch (e) {
        console.error('Failed to parse chat logs:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dt_chat_logs', JSON.stringify(logs));
  }, [logs]);

  // Auto-connect to SurrealDB if config is present
  useEffect(() => {
    if (surrealConfig.url && surrealStatus === 'disconnected' && !isConnectingRef.current) {
      handleSurrealConnect();
    }
  }, [surrealConfig.url]);

  const handleSurrealConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (surrealStatus === 'connecting' || isConnectingRef.current) return;
    
    isConnectingRef.current = true;
    setSurrealStatus('connecting');
    console.log('Starting SurrealDB connection process with config:', surrealConfig);
    try {
      const connId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setLogs(prev => [...prev, {
        id: connId,
        sender: 'System',
        text: `Initialisiere Verbindung zu SurrealDB: ${surrealConfig.url}...`,
        timestamp: Date.now()
      }]);
      
      const result = await surrealService.connect(surrealConfig);
      console.log('SurrealDB connect result:', result);
      setSurrealStatus('connected');
      isConnectingRef.current = false;
      showNotification('Mit SurrealDB 3.0 verbunden!', 'success');
      setIsSurrealModalOpen(false);
      
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: `Verbindung zu SurrealDB hergestellt: ${surrealConfig.url}`,
        timestamp: Date.now()
      }]);

      // Sync data
      console.log('Starting data sync...');
      setIsSyncing(true);
      try {
        const [
          storedSeeds,
          storedProjects,
          storedErkenntnisse,
          storedWorkflows,
          storedIdeen,
          storedKunden,
          storedZiele,
          storedAcademy,
          storedToolbox,
          storedMissions,
          storedWeeklyTasks,
          storedBillboardItems,
          storedMemoryConcepts
        ] = await Promise.all([
          surrealService.getSeeds(),
          surrealService.getProjects(),
          surrealService.getErkenntnisse(),
          surrealService.getWorkflows(),
          surrealService.getIdeen(),
          surrealService.getKunden(),
          surrealService.getZiele(),
          surrealService.getAcademyItems(),
          surrealService.getToolboxItems(),
          surrealService.getMissions(),
          surrealService.getWeeklyTasks(),
          surrealService.getBillboardItems(),
          surrealService.getMemoryConcepts()
        ]);

        console.log('Sync items loaded from SurrealDB');

        await syncDailyIntels();

        if (storedMemoryConcepts && storedMemoryConcepts.length > 0) {
          setMemoryConcepts(prev => {
            const combined = [...storedMemoryConcepts, ...prev];
            const unique = combined.filter((item, index, self) => {
              const firstIndex = self.findIndex((t) => t.id === item.id);
              return index === firstIndex;
            });
            return unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          });
        }
        
        // Merge all vault items into analyzedItems
        const allNewItems: AnalyzedItem[] = [
          ...storedSeeds.map(i => ({ ...i, type: i.type || 'Seed', vaultId: i.vaultId || 'ideen' })),
          ...storedProjects.map(i => ({ ...i, type: 'Projekt', vaultId: 'projekte' })),
          ...storedErkenntnisse.map(i => ({ ...i, type: 'Erkenntnis', vaultId: 'erkenntnisse' })),
          ...storedWorkflows.map(i => ({ ...i, type: 'Workflow', vaultId: 'workflows' })),
          ...storedIdeen.map(i => ({ ...i, type: 'Idee', vaultId: 'ideen' })),
          ...storedKunden.map(i => ({ ...i, type: 'Kunde', vaultId: 'kunden' })),
          ...storedZiele.map(i => ({ ...i, type: 'Ziel', vaultId: 'ziele' })),
          ...storedAcademy.map(i => ({ ...i, type: 'Academy', vaultId: 'academy' })),
          ...storedToolbox.map(i => ({ ...i, type: 'Toolbox', vaultId: 'toolbox' }))
        ];

        setAnalyzedItems(prev => {
          const nonDemoPrev = prev.filter(item => !item.id.startsWith('demo-'));
          const combined = [...allNewItems, ...nonDemoPrev];
          const unique = combined.filter((item, index, self) => {
            const firstIndex = self.findIndex((t) => t.id === item.id);
            return index === firstIndex;
          });
          return unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });

        if (allNewItems.length > 0) {
          setLogs(prev => [...prev, {
            id: `sync_${Date.now()}`,
            sender: 'System',
            text: `${allNewItems.length} Objekte erfolgreich aus SurrealDB synchronisiert.`,
            timestamp: Date.now()
          }]);
        }

        // Weekly Tasks
        if (storedWeeklyTasks && storedWeeklyTasks.length > 0) {
          setWeeklyTasks(storedWeeklyTasks);
        }

        // Billboard Items
        if (storedBillboardItems && storedBillboardItems.length > 0) {
          const intels = storedBillboardItems.filter(i => i.type === 'intel');
          const blockers = storedBillboardItems.filter(i => i.type === 'blocker');
          
          if (intels.length > 0) {
            setPinnedIntelItems(intels.sort((a, b) => b.timestamp - a.timestamp));
            localStorage.setItem('dt_pinned_intel_items', JSON.stringify(intels));
          }
          if (blockers.length > 0) {
            setPinnedBlockerItems(blockers.sort((a, b) => b.timestamp - a.timestamp));
            localStorage.setItem('dt_pinned_blocker_items', JSON.stringify(blockers));
          }
        }
        
        // Latest Mission
        if (storedMissions && storedMissions.length > 0) {
          const sortedMissions = [...storedMissions].sort((a, b) => b.timestamp - a.timestamp);
          const latestMission = sortedMissions[0];
          
          const todayStr = new Date().toISOString().split('T')[0];
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          
          if (latestMission.targetDate === todayStr || latestMission.targetDate === tomorrowStr) {
            setTodaysMission(latestMission);
            setMissionInput(latestMission.text);
            setIsMissionLocked(true);
          }
        }

        // Load logs
        const storedLogs = await surrealService.getLogs();
        if (storedLogs && storedLogs.length > 0) {
          setLogs(prev => {
            const combined = [...prev, ...storedLogs];
            const unique = combined.filter((item, index, self) => {
              const firstIndex = self.findIndex((t) => t.id === item.id);
              return index === firstIndex;
            });
            return unique.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          });
        }

        showNotification('Daten aus SurrealDB synchronisiert.', 'info');
      } catch (syncErr) {
        console.error('Sync Error:', syncErr);
        showNotification('Fehler beim Laden der Daten aus SurrealDB.', 'warn');
      } finally {
        setIsSyncing(false);
      }
    } catch (err) {
      console.error('SurrealDB Connection Error in App.tsx:', err);
      setSurrealStatus('disconnected');
      isConnectingRef.current = false;
      showNotification('SurrealDB Verbindung fehlgeschlagen.', 'warn');
    }
  };

  const handleSaveBillboard = () => {
    localStorage.setItem('dt_pinned_intel_items', JSON.stringify(pinnedIntelItems));
    localStorage.setItem('dt_pinned_blocker_items', JSON.stringify(pinnedBlockerItems));
    showNotification('Billboard aktualisiert.', 'success');
  };

  const handleLogMission = async () => {
    if (!missionInput.trim()) return;
    
    setIsLoggingMission(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = tomorrow.toISOString().split('T')[0];
      
      const newMission: MissionPlan = {
        id: `mission_${Date.now()}`,
        text: missionInput,
        targetDate,
        timestamp: Date.now()
      };

      // Local persistence
      localStorage.setItem('dt_mission_plan', JSON.stringify(newMission));
      setIsMissionLocked(true);
      setTodaysMission(newMission);

      if (surrealStatus === 'connected') {
        await surrealService.saveMission(newMission);
      }
      
      showNotification(`Mission für morgen (${targetDate}) eingeloggt!`, 'success');
      
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: `Mission für morgen geplant: ${missionInput.substring(0, 30)}...`,
        timestamp: Date.now()
      }]);
    } catch (err) {
      showNotification('Fehler beim Speichern der Mission.', 'warn');
    } finally {
      setIsLoggingMission(false);
    }
  };

  const handleMakeMission = async (item: AnalyzedItem) => {
    const newMission = {
      id: Date.now().toString(),
      text: item.text,
      targetDate: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    };
    
    if (surrealStatus === 'connected') {
      try {
        await surrealService.saveMission(newMission);
        showNotification('Mission in SurrealDB gespeichert.', 'success');
      } catch (err) {
        console.error('Failed to save mission to SurrealDB:', err);
        showNotification('Fehler beim Speichern der Mission.', 'warn');
      }
    } else {
      showNotification('Mission lokal erstellt (SurrealDB nicht verbunden).', 'info');
    }
  };

  const handleMoveToVault = async (item: AnalyzedItem) => {
    setAnalyzedItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, isArchived: true } : i
    ));
    
    if (surrealStatus === 'connected') {
      try {
        await surrealService.updateSeed(item.id, { isArchived: true });
      } catch (err) {
        console.error('Error archiving seed in SurrealDB:', err);
      }
    }
    
    showNotification(`In Vault [${item.vaultId.toUpperCase()}] archiviert.`, 'success');
  };

  const handleRestoreFromVault = async (item: AnalyzedItem) => {
    setAnalyzedItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, isArchived: false } : i
    ));
    
    if (surrealStatus === 'connected') {
      try {
        await surrealService.updateSeed(item.id, { isArchived: false });
      } catch (err) {
        console.error('Error restoring seed in SurrealDB:', err);
      }
    }
    
    showNotification(`Seed wieder in den DT verschoben.`, 'success');
  };

  const handleUpdateVault = async (itemId: string, vaultId: AnalyzedItem['vaultId']) => {
    setAnalyzedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, vaultId } : item
    ));
    
    if (surrealStatus === 'connected') {
      try {
        await surrealService.updateSeed(itemId, { vaultId });
      } catch (err) {
        console.error('Error updating vaultId in SurrealDB:', err);
      }
    }
    
    showNotification(`Vault auf [${vaultId.toUpperCase()}] geändert.`, 'info');
  };

  const handleSaveTranscript = async (transcriptLines: string[]) => {
    if (transcriptLines.length === 0) return;
    
    const fullText = transcriptLines.join('\n');
    const timestamp = Date.now();
    const id = `transcript_${timestamp}`;
    
    // 1. Save as AnalyzedItem (Seed)
    const newInsight: AnalyzedItem = {
      id,
      text: `Live-Gespräch Transkript (${new Date(timestamp).toLocaleString('de-DE')}):\n\n${fullText}`,
      score: 8.5,
      pillarId: 'mindset',
      vaultId: 'erkenntnisse',
      category: 'SOLID WORK',
      timestamp,
      isArchived: true // Save directly to Vault
    };

    setAnalyzedItems(prev => [newInsight, ...prev]);
    
    if (surrealStatus === 'connected') {
      try {
        await surrealService.saveSeed(newInsight);
      } catch (err) {
        console.error('Failed to save transcript to SurrealDB:', err);
      }
    }
    
    showNotification('Transkript im Vault (Erkenntnisse) gespeichert!', 'success');
  };

  const handleLiveSaveItem = async (item: Omit<AnalyzedItem, 'id' | 'timestamp'>) => {
    const newItem: AnalyzedItem = {
      name: item.name || item.text.substring(0, 50),
      type: item.type || (item.vaultId === 'projekte' ? 'Projekt' : 'Seed'),
      area: item.area || item.pillarId || 'dev',
      status: item.status || 'Offen',
      impact: item.impact || item.score || 5,
      category: item.category || 'SOLID WORK',
      reasoning: item.reasoning || 'Live Capture',
      nextStep: item.nextStep || '',
      ...item,
      id: `live_save_${Date.now()}`,
      timestamp: Date.now(),
      isArchived: true
    };

    setAnalyzedItems(prev => [newItem, ...prev]);
    
    if (surrealStatus === 'connected') {
      try {
        let savePromise;
        switch (newItem.vaultId) {
          case 'projekte': savePromise = surrealService.saveProject(newItem); break;
          case 'erkenntnisse': savePromise = surrealService.saveErkenntnis(newItem); break;
          case 'workflows': savePromise = surrealService.saveWorkflow(newItem); break;
          case 'kunden': savePromise = surrealService.saveKunde(newItem); break;
          case 'ziele': savePromise = surrealService.saveZiel(newItem); break;
          case 'ideen': savePromise = surrealService.saveSeed(newItem); break;
          default: savePromise = surrealService.saveSeed(newItem);
        }
        await savePromise;
        showNotification(`[Live] ${newItem.name} im Vault gespeichert.`, 'success');
      } catch (err) {
        console.error('Live Save Error:', err);
        showNotification('Fehler beim Speichern via Live Agent.', 'warn');
      }
    }
  };

  const handleLiveSaveWeeklyTask = async (text: string) => {
    const newTask: WeeklyTask = {
      id: `weekly_${Date.now()}`,
      text,
      completed: false,
      timestamp: Date.now()
    };

    setWeeklyTasks(prev => [newTask, ...prev]);
    
    if (surrealStatus === 'connected') {
      try {
        await surrealService.saveWeeklyTask(newTask);
        showNotification(`Wochenaufgabe "${(text || '').substring(0, 20)}..." gespeichert.`, 'success');
      } catch (err) {
        console.error('Live Weekly Task Save Error:', err);
        showNotification('Fehler beim Speichern der Wochenaufgabe.', 'warn');
      }
    }
  };

  const handleSuggestNextTask = async () => {
    if (isChatting) return;
    
    const topGameChanger = analyzedItems
      .filter(item => item.category === 'GAME CHANGER')
      .sort((a, b) => b.score - a.score)[0];
      
    const mission = missionInput || 'Keine aktive Mission eingeloggt.';
    
    setIsChatting(true);
    
    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Du bist DT (Strategie-Modus). 
        Basierend auf der aktuellen Aktiven Mission und dem wichtigsten Game Changer, schlage den EINEN nächsten, höchst-impactvollen Schritt vor.
        
        AKTIVE MISSION: ${mission}
        TOP GAME CHANGER: ${topGameChanger ? `[${topGameChanger.vaultId.toUpperCase()}] ${topGameChanger.text} (Score: ${topGameChanger.score})` : 'Kein Game Changer vorhanden.'}
        
        BILLBOARD-KONTEXT:
        - INTEL: ${pinnedIntelItems?.map(i => i.text).join(', ') || 'Keine'}
        - BLOCKER: ${pinnedBlockerItems?.map(i => i.text).join(', ') || 'Keine'}
        
        Antworte extrem kurz, direkt und handlungsorientiert (max. 2 Sätze).
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const aiText = response.text || "Ich konnte keinen nächsten Schritt identifizieren.";
      
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'DT (Strategie)',
        text: `🎯 STRATEGIE-VORSCHLAG:\n\n${aiText}`,
        timestamp: Date.now()
      }]);
      
      showNotification('Strategie-Vorschlag generiert.', 'success');
    } catch (err) {
      console.error('Strategy Suggestion Error:', err);
      showNotification('Fehler beim Generieren des Vorschlags.', 'warn');
    } finally {
      setIsChatting(false);
    }
  };

  const handleDeleteSeed = async (item: AnalyzedItem) => {
    try {
      if (surrealStatus === 'connected' && item.rawId) {
        await surrealService.deleteSeed(item.rawId);
      }
      
      setAnalyzedItems(prev => prev.filter(i => i.id !== item.id));
      showNotification('Seed erfolgreich gelöscht.', 'info');
      
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: `Seed gelöscht: ${(item.text || '').substring(0, 30)}...`,
        timestamp: Date.now()
      }]);
    } catch (err) {
      console.error('Delete Error:', err);
      showNotification('Fehler beim Löschen des Seeds.', 'warn');
    }
  };

  const handleDeleteMission = async () => {
    if (!todaysMission) return;
    
    try {
      if (surrealStatus === 'connected' && todaysMission.rawId) {
        await surrealService.deleteMission(todaysMission.rawId);
      }
      
      localStorage.removeItem('dt_mission_plan');
      setTodaysMission(null);
      setMissionInput('');
      setIsMissionLocked(false);
      showNotification('Mission gelöscht.', 'info');
    } catch (err) {
      console.error('Delete Mission Error:', err);
      showNotification('Fehler beim Löschen der Mission.', 'warn');
    }
  };

  const toggleSeedSelection = (item: AnalyzedItem) => {
    setSelectedSeeds(prev => {
      const isSelected = prev.find(s => s.id === item.id);
      if (isSelected) {
        return prev.filter(s => s.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleExportCSV = () => {
    if (analyzedItems.length === 0) {
      showNotification('Keine Daten zum Exportieren vorhanden.', 'info');
      return;
    }

    const headers = ['Text', 'Score', 'Säule', 'Vault', 'Kategorie'];
    const csvContent = [
      headers.join(';'),
      ...analyzedItems.map(item => {
        const pillar = pillars.find(p => p.id === item.pillarId)?.name || item.pillarId;
        const vault = VAULTS.find(v => v.id === item.vaultId)?.name || item.vaultId;
        
        const row = [
          item.text,
          item.score.toFixed(1).replace('.', ','), // Use comma for decimals in German Excel
          pillar,
          vault,
          item.category
        ];

        return row.map(val => {
          const str = String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(';');
      })
    ].join('\r\n');

    // Add UTF-8 BOM for Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dt_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('CSV-Export für Excel optimiert.', 'success');
  };

  const chartData: ChartData<'radar'> = {
    labels: pillars.map(p => `${p.icon} ${p.name}`),
    datasets: [{
      label: 'Aktueller Fokus',
      data: pillars.map(p => p.value),
      backgroundColor: 'rgba(220, 38, 38, 0.2)',
      borderColor: '#dc2626',
      pointBackgroundColor: pillars.map(p => p.color),
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: pillars.map(p => p.color),
      borderWidth: 2,
    }]
  };

  const chartOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: {
          font: { size: 12 },
          color: '#cbd5e1'
        },
        ticks: {
          display: false,
        },
        min: 0,
        max: 100,
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#dc2626',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      }
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoadingScreen key="loader" onComplete={() => {
            setIsLoading(false);
            setShowBriefing(true);
          }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBriefing && (
          <BriefingOverlay 
            key="briefing"
            onDismiss={() => {
              setShowBriefing(false);
              showNotification("Mission aktiv. DT Core bereit.", 'info');
            }} 
            onShowIntel={() => {
              setShowBriefing(false);
              setActiveView('vault');
              setLibraryTab('intel');
            }}
            onShowDetails={() => {
              setShowBriefing(false);
              setActiveView('vault');
              setLibraryTab('all');
            }}
            onShowLive={() => {
              setShowBriefing(false);
              setIsLiveActive(true);
            }}
            mission={todaysMission?.text}
            stats={{
              seeds: analyzedItems.length,
              intel: dailyIntels.length,
              sync: surrealStatus === 'connected' ? 'STABIL' : 'LOKAL'
            }}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen lg:h-screen flex flex-col bg-dark text-slate-50 font-sans pb-20 lg:pb-0">
      {/* Top Navigation */}
      <nav className="h-14 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
        <div className="flex items-center gap-3 sm:gap-8">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="relative w-12 h-12 flex items-center justify-center">
              {/* Sharingan Base (Red Iris) - Rotating slowly */}
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute w-8 h-8 bg-red-600 rounded-full border border-red-900 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all duration-500 group-hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] group-hover:bg-red-500 flex items-center justify-center"
              >
                {/* Central Pupil */}
                <div className="w-2 h-2 bg-black rounded-full" />
                {/* Inner Ring */}
                <div className="absolute inset-1 border border-black/20 rounded-full" />
              </motion.div>
              
              {/* Tomoe Container (Inside the iris) */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute w-6 h-6 z-10"
              >
                {[0, 120, 240].map((angle, i) => (
                  <div 
                    key={i}
                    className="absolute inset-0"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    {/* Tomoe Shape (Comma) positioned inside the iris */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2">
                      <svg width="6" height="8" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] rotate-[165deg]">
                        <path d="M5 2C3.34315 2 2 3.34315 2 5C2 6.65685 3.34315 8 5 8C6.65685 8 8 6.65685 8 5C8 3.34315 6.65685 2 5 2Z" fill="black"/>
                        <path d="M5 3.5C5 3.5 9 4 9 7.5C9 11 6 12 5 12C4 12 1 11 1 7.5C1 4 4 3.5 5 3.5Z" fill="black"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Mangekyou Activation Glow (on hover) */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1.2 }}
                className="absolute inset-0 bg-red-500/10 rounded-full blur-xl pointer-events-none"
              />
            </div>
            
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-[-0.05em] text-white leading-none transition-colors duration-500 group-hover:text-red-500 uppercase">DT</span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-[1px] w-3 bg-red-600/40 group-hover:w-5 transition-all duration-500" />
                <span className="text-[8px] font-bold text-red-500/60 uppercase tracking-[0.4em] leading-none">Digital Twin</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center bg-white/[0.03] rounded-xl p-0.5 sm:p-1 border border-white/5">
            <button 
              onClick={() => setActiveView('kern')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'kern' 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              DT
            </button>
            <button 
              onClick={() => setActiveView('vault')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'vault' 
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              VAULT
            </button>
            <button 
              onClick={() => setActiveView('prompts')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'prompts' 
                  ? "bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              PROMPTS
            </button>
            <button 
              onClick={() => setIsLiveActive(true)}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                isLiveActive 
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              LIVE
            </button>
            <button 
              onClick={() => setActiveView('video')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'video' 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              VIDEO
            </button>
            <button 
              onClick={() => setActiveView('agents')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'agents' 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              HIERARCHY
            </button>
            <button 
              onClick={() => setActiveView('intro')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'intro' 
                  ? "bg-zinc-700 text-white shadow-lg shadow-zinc-700/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              INTRO
            </button>
            <button 
              onClick={() => setActiveView('rapid')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'rapid' 
                  ? "bg-red-600/20 text-red-500 shadow-lg shadow-red-900/10 border border-red-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              LIGHT
            </button>
            <button 
              onClick={() => setActiveView('vay')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'vay' 
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              VAY_WORKSPACE
            </button>
            <button 
              onClick={() => setActiveView('desktop')}
              className={cn(
                "px-3 sm:px-5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'desktop' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              DESKTOP
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-4 px-3 py-1.5 bg-white/[0.02] rounded-lg border border-white/5">
            <p className="text-[9px] text-primary/80 font-bold uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-2"></span>
              System Online
            </p>
            <div className="h-3 w-[1px] bg-white/10"></div>
            <button 
              onClick={() => setIsSurrealModalOpen(true)}
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest flex items-center transition-all",
                surrealStatus === 'connected' ? "text-primary" : "text-slate-500 hover:text-slate-400"
              )}
            >
              {surrealStatus === 'connected' ? <Wifi className="w-2.5 h-2.5 mr-1" /> : <WifiOff className="w-2.5 h-2.5 mr-1" />}
              <span>SurrealDB: </span>{surrealStatus === 'connected' ? 'Aktiv' : 'Off'}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'kern' && (
            <KernView 
              logs={logs}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleChatSubmit={handleChatSubmit}
              isChatting={isChatting}
              isChatCollapsed={isChatCollapsed}
              setIsChatCollapsed={setIsChatCollapsed}
              chatLogRef={chatLogRef}
              selectedSeeds={selectedSeeds}
              toggleSeedSelection={toggleSeedSelection}
              setSelectedSeeds={setSelectedSeeds}
              memoryConcepts={memoryConcepts}
              currentMemoryIndex={currentMemoryIndex}
              setCurrentMemoryIndex={setCurrentMemoryIndex}
              isMemoryInputOpen={isMemoryInputOpen}
              setIsMemoryInputOpen={setIsMemoryInputOpen}
              isMemoryModalOpen={isMemoryModalOpen}
              setIsMemoryModalOpen={setIsMemoryModalOpen}
              newConcept={newConcept}
              setNewConcept={setNewConcept}
              isGeneratingImage={isGeneratingImage}
              handleGenerateImage={handleGenerateImage}
              handleAddMemoryConcept={handleAddMemoryConcept}
              handleRemoveMemoryConcept={handleRemoveMemoryConcept}
              handleSpeakConcept={handleSpeakConcept}
              isSpeaking={isSpeaking}
              isAutoPlayActive={isAutoPlayActive}
              setIsAutoPlayActive={setIsAutoPlayActive}
              weeklyTasks={weeklyTasks}
              weeklyTaskInput={weeklyTaskInput}
              setWeeklyTaskInput={setWeeklyTaskInput}
              handleAddWeeklyTask={handleAddWeeklyTask}
              handleToggleWeeklyTask={handleToggleWeeklyTask}
              handleDeleteWeeklyTask={handleDeleteWeeklyTask}
              topPriority={topPriority}
              handleTakeToMission={handleTakeToMission}
              handlePinItem={handlePinItem}
              handleSaveBillboard={handleSaveBillboard}
              pinnedIntelItems={pinnedIntelItems}
              pinnedBlockerItems={pinnedBlockerItems}
              intelInput={intelInput}
              setIntelInput={setIntelInput}
              blockerInput={blockerInput}
              setBlockerInput={setBlockerInput}
              handleManualPin={handleManualPin}
              handleRemoveBillboardItem={handleRemovePinnedItem}
              handleAdvanceBillboardItem={handleAdvanceIntel}
              selectedFilterId={selectedFilterId}
              setSelectedFilterId={setSelectedFilterId}
              analyzedItems={analyzedItems}
              handleExportCSV={handleExportCSV}
              isOperativeStatusCollapsed={isOperativeStatusCollapsed}
              setIsOperativeStatusCollapsed={setIsOperativeStatusCollapsed}
              setActiveView={setActiveView}
              setLibraryType={setLibraryType}
              setLibraryTab={setLibraryTab}
            />
          )}

          {activeView === 'agents' && (
            <motion.div
              key="agents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <AgentDashboard 
                agents={agents}
                logs={agentLogs}
                goal={agentGoal}
                loading={agentsLoading}
                onCreateGoal={createAgentGoal}
              />
            </motion.div>
          )}

        {activeView === 'vault' && (
          <VaultView 
            libraryTab={libraryTab}
            setLibraryTab={setLibraryTab}
            dailyIntels={dailyIntels}
            setDailyIntels={setDailyIntels}
            handleDeleteIntel={handleDeleteIntel}
            analyzedItems={analyzedItems}
            setAnalyzedItems={setAnalyzedItems}
            librarySearch={librarySearch}
            setLibrarySearch={setLibrarySearch}
            libraryType={libraryType}
            setLibraryType={setLibraryType}
            libraryArea={libraryArea}
            setLibraryArea={setLibraryArea}
            libraryStatus={libraryStatus}
            setLibraryStatus={setLibraryStatus}
            libraryImpact={libraryImpact}
            setLibraryImpact={setLibraryImpact}
            selectedFilterId={selectedFilterId}
            setSelectedFilterId={setSelectedFilterId}
            filteredLibraryItems={filteredItems}
            selectedLibraryItem={selectedLibraryItem}
            setSelectedLibraryItem={setSelectedLibraryItem}
            handleDelete={handleDeleteSeed}
            handlePinItem={handlePinItem}
            handleTakeToMission={handleTakeToMission}
            handleMakeMission={handleMakeMission}
            handleMoveToVault={handleMoveToVault}
            handleRestoreFromVault={handleRestoreFromVault}
            onSyncDailyIntels={syncDailyIntels}
            handleUpdateVault={handleUpdateVault}
            toggleSeedSelection={toggleSeedSelection}
            selectedSeeds={selectedSeeds}
            showNotification={showNotification}
            knowledgePressure={knowledgePressure}
          />
        )}

          {activeView === 'video' && (
            <motion.div 
              key="video"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col h-full"
            >
              <VideoAnalyst 
                initialUrl={shareData?.url} 
                initialPrompt={shareData?.prompt}
                autoAnalyze={shareData?.auto}
              />
            </motion.div>
          )}

          {activeView === 'prompts' && (
            <PromptOptimizer key="prompts" />
          )}

          {activeView === 'intro' && (
            <IntroView />
          )}

          {activeView === 'rapid' && (
            <RapidValidator />
          )}

          {activeView === 'vay' && (
            <VayWorkspace />
          )}

          {activeView === 'desktop' && (
            <DesktopView />
          )}
        </AnimatePresence>

        <MiniObserver onNewMessage={addTickerMessage} />
        <BreakingTicker messages={tickerMessages} />
      </div>

      {/* Mobile Live FAB */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[90]">
        <button 
          onClick={() => setIsLiveActive(true)}
          className="w-14 h-14 bg-red-500 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all border-4 border-dark"
        >
          <Activity className="w-6 h-6 animate-pulse" />
        </button>
      </div>

      {/* Notifications */}
          <div className="fixed top-4 right-4 space-y-2 z-50">
            <AnimatePresence>
              {notifications.map(n => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className={cn(
                    "px-4 py-2 rounded shadow-lg text-sm flex items-center text-white",
                    n.type === 'success' ? "bg-primary" : n.type === 'warn' ? "bg-amber-500" : "bg-accent"
                  )}
                >
                  {n.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                  <span>{n.msg}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Live Mode Modal */}
          <AnimatePresence>
            {isLiveActive && (
              <LiveMode 
                analyzedItems={analyzedItems} 
                dailyIntels={dailyIntels}
                logs={logs}
                agents={agents}
                onClose={(targetView) => {
                  setIsLiveActive(false);
                  if (targetView) setActiveView(targetView);
                }} 
                onSwitchView={(target) => {
                  setActiveView(target);
                }}
                onSaveTranscript={handleSaveTranscript}
                onSaveItem={handleLiveSaveItem}
                onSaveWeeklyTask={handleLiveSaveWeeklyTask}
                seedInput={seedInput}
                setSeedInput={setSeedInput}
                isAnalyzing={isAnalyzing}
                handleAnalyze={handleAnalyze}
                isFileLoading={isFileLoading}
                handleFileUpload={handleFileUpload}
                fileInputRef={fileInputRef}
                onMessage={(sender, text) => {
                  const logId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  const newLog = {
                    id: logId,
                    sender,
                    text,
                    timestamp: Date.now()
                  };
                  setLogs(prev => [...prev, newLog]);
                  if (surrealStatus === 'connected') {
                    surrealService.saveLog(newLog).catch(console.error);
                  }
                }}
              />
            )}
          </AnimatePresence>

          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-6 z-50">
            <button 
              onClick={() => setActiveView('kern')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeView === 'kern' ? "text-primary" : "text-slate-500"
              )}
            >
              <Brain className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">DT</span>
            </button>
            <button 
              onClick={() => setActiveView('vault')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeView === 'vault' ? "text-indigo-400" : "text-slate-500"
              )}
            >
              <Database className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Vault</span>
            </button>
            <button 
              onClick={() => setActiveView('video')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeView === 'video' ? "text-red-500" : "text-slate-500"
              )}
            >
              <Youtube className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Video</span>
            </button>
            <button 
              onClick={() => setActiveView('prompts')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeView === 'prompts' ? "text-amber-400" : "text-slate-500"
              )}
            >
              <Wand2 className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Prompts</span>
            </button>
            <button 
              onClick={() => setActiveView('live')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeView === 'live' ? "text-red-500" : "text-slate-500"
              )}
            >
              <Activity className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Live</span>
            </button>
          </div>

          {/* SurrealDB Connection Modal */}
          <AnimatePresence>
            {isSurrealModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-panel border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-lg font-bold flex items-center">
                      <Database className="w-5 h-5 mr-2 text-primary" /> SurrealDB 3.0 Verbindung
                    </h3>
                    <button onClick={() => setIsSurrealModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSurrealConnect} className="p-6 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase">Instance URL</label>
                      <input 
                        required
                        type="text" 
                        placeholder="https://your-instance.surreal.cloud"
                        value={surrealConfig.url}
                        onChange={e => setSurrealConfig({...surrealConfig, url: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Namespace</label>
                        <input 
                          required
                          type="text" 
                          placeholder="test"
                          value={surrealConfig.ns}
                          onChange={e => setSurrealConfig({...surrealConfig, ns: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Database</label>
                        <input 
                          required
                          type="text" 
                          placeholder="test"
                          value={surrealConfig.db}
                          onChange={e => setSurrealConfig({...surrealConfig, db: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase">User (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="admin"
                          value={surrealConfig.user}
                          onChange={e => setSurrealConfig({...surrealConfig, user: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Pass (Optional)</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          value={surrealConfig.pass}
                          onChange={e => setSurrealConfig({...surrealConfig, pass: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={surrealStatus === 'connecting'}
                      className="w-full bg-primary hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-red-900/20"
                    >
                      {surrealStatus === 'connecting' ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          <span>Verbinde...</span>
                        </>
                      ) : (
                        <>
                          <Wifi className="w-5 h-5 mr-2" />
                          <span>Jetzt Verbinden</span>
                        </>
                      )}
                    </button>
                  </form>
                  
                  <div className="p-4 bg-slate-900/80 border-t border-slate-800 text-[10px] text-slate-500 font-mono leading-relaxed">
                    HINWEIS: Stelle sicher, dass deine SurrealDB Instanz CORS-Anfragen von dieser Domain zulässt.
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Memory Core Management Modal */}
          <AnimatePresence>
            {isMemoryModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-panel border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                >
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Memory Core Management</h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Permanente Wissensspeicherung</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsMemoryModalOpen(false)} 
                      className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {memoryConcepts.length === 0 ? (
                      <div className="text-center py-20">
                        <Brain className="w-16 h-16 text-white/5 mx-auto mb-4" />
                        <p className="text-slate-500 italic">Noch keine Konzepte im Core gespeichert.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {memoryConcepts.map((concept) => (
                          <motion.div 
                            key={concept.id}
                            layout
                            className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl hover:border-primary/30 transition-all group"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{concept.term}</h4>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleSpeakConcept(concept)}
                                  disabled={isSpeaking}
                                  className={cn(
                                    "p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-all",
                                    isSpeaking && "animate-pulse"
                                  )}
                                  title="Anhören"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleRemoveMemoryConcept(concept.id)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all"
                                  title="Löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 italic">
                              "{concept.definition}"
                            </p>
                            {concept.images && concept.images.length > 0 && (
                              <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {concept.images.map((img, i) => (
                                  <img 
                                    key={i} 
                                    src={img} 
                                    alt="" 
                                    referrerPolicy="no-referrer"
                                    className="h-20 w-32 object-cover rounded-xl border border-white/10 flex-shrink-0"
                                  />
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-[10px] text-slate-600 font-mono uppercase">
                                Gespeichert am {new Date(concept.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total: {memoryConcepts.length} Konzepte</span>
                      <span className="text-primary/60 text-[9px] font-mono uppercase">Core Status: Optimal</span>
                    </div>
                    {memoryConcepts.length > 0 && (
                      <button 
                        onClick={() => {
                          if (window.confirm('Möchtest du wirklich ALLE Konzepte löschen?')) {
                            setMemoryConcepts([]);
                            localStorage.setItem('dt_memory_concepts', JSON.stringify([]));
                            
                            // Delete all from SurrealDB if connected
                            if (surrealStatus === 'connected') {
                              surrealService.deleteAllMemoryConcepts().catch(err => {
                                console.error('Failed to delete all memory concepts from SurrealDB:', err);
                              });
                            }

                            setCurrentMemoryIndex(0);
                            showNotification('Memory Core geleert.', 'warn');
                          }
                        }}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-red-500/20 transition-all"
                      >
                        Alles Löschen
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          
          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 z-[100] px-3 flex items-center justify-between pb-safe">
            {[
              { id: 'kern', label: 'DT', icon: Brain, color: 'text-red-500' },
              { id: 'vault', label: 'Vault', icon: Database, color: 'text-indigo-400' },
              { id: 'prompts', label: 'Prompts', icon: Wand2, color: 'text-amber-500' },
              { id: 'live', label: 'Live', icon: Activity, color: 'text-red-600', isLive: true },
              { id: 'agents', label: 'Agents', icon: Users, color: 'text-slate-400' },
              { id: 'intro', label: 'Intro', icon: Info, color: 'text-zinc-500' },
              { id: 'rapid', label: 'Light', icon: Sparkles, color: 'text-amber-500' },
              { id: 'vay', label: 'Vay', icon: Shield, color: 'text-red-500' },
              { id: 'desktop', label: 'Desktop', icon: Monitor, color: 'text-blue-500' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isLive) {
                    setIsLiveActive(true);
                  } else {
                    setActiveView(item.id as any);
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 flex-1 h-full transition-all active:scale-90",
                  (activeView === item.id || (item.isLive && isLiveActive)) ? "opacity-100" : "opacity-40"
                )}
              >
                <item.icon className={cn("w-5 h-5", (activeView === item.id || (item.isLive && isLiveActive)) ? item.color : "text-white")} />
                <span className="text-[9px] font-black uppercase tracking-tighter text-white">{item.label}</span>
                {(activeView === item.id || (item.isLive && isLiveActive)) && (
                   <motion.div 
                     layoutId="mobileNavIndicator"
                     className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-1 bg-red-500 rounded-full"
                   />
                )}
              </button>
            ))}
          </div>
        </div>
      </>
    );
}

interface BoardCardProps {
  item: AnalyzedItem;
  pillar: Pillar;
  onDelete: (item: AnalyzedItem) => void;
  onPin: (text: string, type: 'intel' | 'blocker', origin?: BillboardItem['origin'], expiry?: BillboardItem['expiry'], nextStep?: string) => void;
  onTakeToMission: (item: AnalyzedItem) => void;
  onMakeMission: (item: AnalyzedItem) => void;
  onMoveToVault: (item: AnalyzedItem) => void;
  onRestoreFromVault: (item: AnalyzedItem) => void;
  onUpdateVault: (itemId: string, vaultId: AnalyzedItem['vaultId']) => void;
  onToggleSelect: (item: AnalyzedItem) => void;
  isSelected: boolean;
  showNotification: (msg: string, type: 'success' | 'warn' | 'info') => void;
  key?: string | number;
}


