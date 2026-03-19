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
import { GoogleGenAI, Type } from "@google/genai";
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
  Sun,
  Moon,
  Download,
  ChevronDown,
  Youtube,
  ChevronUp,
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  ShieldAlert,
  Layers,
  AlertTriangle,
  Pin
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Types
interface Pillar {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface LogEntry {
  id: string;
  sender: 'User' | 'D.T. Kern' | 'System' | 'D.T. Kern (Strategie)';
  text: string;
  isCode?: boolean;
  timestamp: number;
}

interface AnalyzedItem {
  id: string;
  rawId?: string;
  text: string;
  score: number;
  pillarId: string;
  vaultId: 'ideen' | 'projekte' | 'ziele' | 'workflows' | 'erkenntnisse' | 'toolbox' | 'kunden' | 'academy';
  category: 'GAME CHANGER' | 'SOLID WORK' | 'NOISE';
  reasoning?: string;
  nextStep?: string;
  status?: 'Offen' | 'In Arbeit' | 'Blockiert';
  duration?: string;
  blockedBy?: string;
  missionType?: 'Bauen' | 'Denken' | 'Planen' | 'Entscheiden' | 'Dokumentieren';
  consequence?: string;
  timestamp: number;
  sourceUrl?: string;
}

interface MissionPlan {
  id: string;
  rawId?: string;
  text: string;
  targetDate: string; // YYYY-MM-DD
  timestamp: number;
}

interface BillboardItem {
  id: string;
  text: string;
  origin: 'Seed' | 'Mission' | 'Analyse' | 'Manuell';
  expiry: 'heute' | 'diese Woche' | 'dauerhaft';
  type: 'intel' | 'blocker';
  timestamp: number;
}

const VAULTS = [
  { id: 'ideen', name: 'IDEEN DECK', icon: '💡', color: '#8b5cf6' },
  { id: 'projekte', name: 'PROJEKT AKTEN', icon: '📁', color: '#3b82f6' },
  { id: 'kunden', name: 'KUNDEN ANFRAGEN', icon: '🤝', color: '#10b981' },
  { id: 'ziele', name: 'MISSIONS ZIELE', icon: '🎯', color: '#ef4444' },
  { id: 'workflows', name: 'STRATEGIEN / WORKFLOWS', icon: '⚙️', color: '#10b981' },
  { id: 'academy', name: 'ACADEMY & SUBS', icon: '🎓', color: '#f59e0b' },
  { id: 'erkenntnisse', name: 'ERKENNTNISSE', icon: '🧠', color: '#f59e0b' },
  { id: 'toolbox', name: 'TOOLBOX', icon: '🧰', color: '#64748b' }
] as const;

const OPERATIVE_TILES = [
  { id: 'offen', name: 'UNVERARBEITETE SEEDS', icon: '🌱', color: '#8b5cf6', status: 'Offen' },
  { id: 'in_arbeit', name: 'AKTIVE MISSIONEN', icon: '🚀', color: '#3b82f6', status: 'In Arbeit' },
  { id: 'blockiert', name: 'OFFENE BLOCKER', icon: '🛑', color: '#ef4444', status: 'Blockiert' }
] as const;

const INITIAL_PILLARS: Pillar[] = [
  { id: 'health', name: 'Gesundheit', icon: '🌿', color: '#3b82f6' },
  { id: 'dev', name: 'Pers. Entwicklung', icon: '📚', color: '#f59e0b' },
  { id: 'finance', name: 'Business & Finanzen', icon: '💰', color: '#10b981' },
  { id: 'mindset', name: 'Mentalität', icon: '🧠', color: '#8b5cf6' },
  { id: 'islam', name: 'Islam (Sirat)', icon: '🕋', color: '#eab308' }
];

function BillboardCard({ 
  item, 
  onRemove, 
  onTakeToMission 
}: { 
  item: BillboardItem; 
  onRemove: (id: string, type: 'intel' | 'blocker') => void;
  onTakeToMission: (item: BillboardItem) => void;
}) {
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
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </motion.div>
  );
}

export default function App() {
  const [seedInput, setSeedInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [isLogCollapsed, setIsLogCollapsed] = useState(true);
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
  const [surrealStatus, setSurrealStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [surrealConfig, setSurrealConfig] = useState<SurrealConfig>({
    url: getEnv('VITE_SURREALDB_URL'),
    ns: getEnv('VITE_SURREALDB_NS', 'test'),
    db: getEnv('VITE_SURREALDB_DB', 'test'),
    user: getEnv('VITE_SURREALDB_USER'),
    pass: getEnv('VITE_SURREALDB_PASS')
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    console.log('--- Environment Debug ---');
    console.log('window.ENV:', (window as any).ENV);
    console.log('VITE_GEMINI_API_KEY from getEnv:', getEnv('VITE_GEMINI_API_KEY'));
    console.log('VITE_SURREALDB_URL from getEnv:', getEnv('VITE_SURREALDB_URL'));
    console.log('-------------------------');
    
    const key = getEnv('VITE_GEMINI_API_KEY');
    const keyStatus = key ? 'Defined' : 'Undefined';
    console.log('Gemini API Key status:', keyStatus);
    
    // If key is missing, show a prominent log
    if (!key) {
      console.error('CRITICAL: VITE_GEMINI_API_KEY is missing! Analysis will fail.');
    }
    
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'initial',
      sender: 'System',
      text: 'Bereit für deinen Input. Ich bewerte alles auf einer Skala von 1-10 und filtere nach den 5 Säulen.',
      timestamp: Date.now()
    }
  ]);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; msg: string; type: 'success' | 'warn' | 'info' }[]>([]);

  const filteredItems = useMemo(() => {
    if (!selectedFilterId) return analyzedItems;
    const operativeTile = OPERATIVE_TILES.find(t => t.id === selectedFilterId);
    if (operativeTile) {
      return analyzedItems.filter(item => item.status === operativeTile.status);
    }
    return analyzedItems.filter(item => item.vaultId === selectedFilterId);
  }, [analyzedItems, selectedFilterId]);

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

  const handlePinItem = (text: string, type: 'intel' | 'blocker', origin: BillboardItem['origin'] = 'Manuell', expiry: BillboardItem['expiry'] = 'dauerhaft') => {
    if (!text.trim()) return;
    const newItem: BillboardItem = {
      id: Date.now().toString(),
      text,
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
    } else {
      const updated = [newItem, ...pinnedBlockerItems];
      setPinnedBlockerItems(updated);
      localStorage.setItem('dt_pinned_blocker_items', JSON.stringify(updated));
      setBlockerInput('');
    }
    showNotification(`${type === 'intel' ? 'Intel' : 'Blocker'} gepinnt!`, 'success');
  };

  const handleRemovePinnedItem = (id: string, type: 'intel' | 'blocker') => {
    if (type === 'intel') {
      const updated = pinnedIntelItems.filter(i => i.id !== id);
      setPinnedIntelItems(updated);
      localStorage.setItem('dt_pinned_intel_items', JSON.stringify(updated));
    } else {
      const updated = pinnedBlockerItems.filter(i => i.id !== id);
      setPinnedBlockerItems(updated);
      localStorage.setItem('dt_pinned_blocker_items', JSON.stringify(updated));
    }
  };

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

  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [logs]);

  const showNotification = (msg: string, type: 'success' | 'warn' | 'info' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

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
    if (savedIntelItems) setPinnedIntelItems(JSON.parse(savedIntelItems));
    
    const savedBlockerItems = localStorage.getItem('dt_pinned_blocker_items');
    if (savedBlockerItems) setPinnedBlockerItems(JSON.parse(savedBlockerItems));
  }, []);

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
        const storedSeeds = await surrealService.getSeeds();
        console.log('Stored seeds loaded from SurrealDB:', storedSeeds);
        
        // Always clear demo data if we are connected to SurrealDB
        setAnalyzedItems(prev => {
          const nonDemoPrev = prev.filter(item => !item.id.startsWith('demo-'));
          
          if (storedSeeds && storedSeeds.length > 0) {
            const combined = [...storedSeeds, ...nonDemoPrev];
            const unique = combined.filter((item, index, self) => {
              const firstIndex = self.findIndex((t) => t.id === item.id);
              return index === firstIndex;
            });
            console.log('Unique items after sync:', unique.length);
            return unique.sort((a, b) => b.timestamp - a.timestamp);
          }
          
          return nonDemoPrev;
        });

        if (storedSeeds && storedSeeds.length > 0) {
          setLogs(prev => [...prev, {
            id: `sync_${Date.now()}`,
            sender: 'System',
            text: `${storedSeeds.length} Seeds erfolgreich aus SurrealDB synchronisiert.`,
            timestamp: Date.now()
          }]);
        } else {
          console.log('No seeds found in SurrealDB.');
        }

        // Load missions
        console.log('Loading missions...');
        const missions = await surrealService.getMissions();
        console.log('Missions loaded:', missions?.length || 0);
        
        if (missions && missions.length > 0) {
          // Sort by timestamp to get the latest
          const sortedMissions = [...missions].sort((a, b) => b.timestamp - a.timestamp);
          const latestMission = sortedMissions[0];
          
          const todayStr = new Date().toISOString().split('T')[0];
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          
          // If the latest mission is for today or tomorrow, load it
          if (latestMission.targetDate === todayStr || latestMission.targetDate === tomorrowStr) {
            console.log('Syncing latest relevant mission:', latestMission);
            setTodaysMission(latestMission);
            setMissionInput(latestMission.text);
            setIsMissionLocked(true);
          }
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

  const handleChatSubmit = async (e?: React.FormEvent, isDeep: boolean = false) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || isChatting) return;

    setIsChatting(true);
    const userMsgId = Date.now().toString();
    setLogs(prev => [...prev, {
      id: userMsgId,
      sender: 'User',
      text,
      timestamp: Date.now()
    }]);
    setChatInput('');

    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      const ai = new GoogleGenAI({ apiKey });
      
      // Fetch context
      let contextData = "";
      
      if (selectedSeeds.length > 0) {
        contextData = `
Hier sind die vom Nutzer SPEZIELL AUSGEWÄHLTEN Seeds für diesen Chat-Kontext:
${selectedSeeds.map(s => `- [${s.category}] ${s.text} (Score: ${s.score}, Säule: ${s.pillarId}, Vault: ${s.vaultId})`).join('\n')}

Bitte konzentriere dich primär auf diese ausgewählten Informationen.
`;
      } else if (surrealStatus === 'connected') {
        const [seeds, missions] = await Promise.all([
          surrealService.getSeeds(),
          surrealService.getMissions()
        ]);
        
        contextData = `
Hier sind die aktuellen Daten aus deiner SurrealDB Datenbank:
SEEDS (Gedanken, Ideen, Projekte):
${seeds.map(s => `- [${s.category}] ${s.text} (Score: ${s.score}, Säule: ${s.pillarId}, Vault: ${s.vaultId})`).join('\n')}

MISSIONEN (Geplante Aufgaben):
${missions.map(m => `- ${m.text} (Ziel-Datum: ${m.targetDate})`).join('\n')}
`;
      } else {
        contextData = "Hinweis: SurrealDB ist aktuell nicht verbunden. Ich habe nur Zugriff auf die lokalen Daten.";
      }

      const billboardContext = `
AKTUELLER BILLBOARD-STATUS (Festgenagelte Relevanz & Prioritäten):
- AKTIVE MISSION: ${missionInput || 'Keine aktive Mission eingeloggt.'}
- PINNED INTEL (Wichtige Erkenntnisse/Einschränkungen):
${pinnedIntelItems.length > 0 ? pinnedIntelItems.map(i => `  * [${i.origin}] ${i.text} (Ablauf: ${i.expiry})`).join('\n') : '  Keine Intel gepinnt.'}
- BLOCKER / WARNUNGEN:
${pinnedBlockerItems.length > 0 ? pinnedBlockerItems.map(i => `  * [${i.origin}] ${i.text} (Ablauf: ${i.expiry})`).join('\n') : '  Keine Blocker gepinnt.'}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Du bist D.T. Kern, der digitale Zwilling und Analyst des Nutzers. 
        Deine Aufgabe ist es, den Nutzer basierend auf seinen Daten zu beraten.
        
        ${billboardContext}
        
        KONTEXT AUS DER DATENBANK:
        ${contextData}
        
        NUTZER-ANFRAGE:
        ${text}`,
        config: {
          systemInstruction: isDeep 
            ? "Du bist D.T. Kern. Deine oberste Priorität ist der Billboard-Status. 1. AKTIVE MISSION: Alles was du vorschlägst, muss diese Mission unterstützen oder zumindest nicht behindern. 2. BLOCKER: Wenn der Nutzer etwas verlangt, das einem Blocker auf dem Billboard widerspricht, musst du ihn SOFORT darauf hinweisen und die Anfrage ablehnen oder korrigieren (Reality Check). 3. INTEL: Beachte alle Einschränkungen (Zeit, Ressourcen). Antworte tiefgründig, analytisch und ohne Begrüßung. Nutze die 5 Säulen als Kompass."
            : "Du bist D.T. Kern. Antworte extrem kurz (max 2 Sätze). WICHTIG: Wenn der Nutzer etwas fragt, das gegen einen Blocker auf dem Billboard verstößt, weise ihn direkt darauf hin. Die Aktive Mission ist dein Fokus. Sei präzise und direkt.",
        }
      });

      const aiText = response.text || "Ich konnte keine Antwort generieren.";
      
      setLogs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'D.T. Kern',
        text: aiText,
        timestamp: Date.now()
      }]);
    } catch (err) {
      console.error('Chat Error:', err);
      showNotification('Fehler beim Chatten mit D.T. Kern.', 'warn');
      setLogs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'System',
        text: 'Fehler bei der Kommunikation mit der KI.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsChatting(false);
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

  const handleMoveToVault = (item: AnalyzedItem) => {
    setAnalyzedItems(prev => prev.filter(i => i.id !== item.id));
    showNotification(`In Vault [${item.vaultId.toUpperCase()}] archiviert.`, 'success');
  };

  const handleUpdateVault = (itemId: string, vaultId: AnalyzedItem['vaultId']) => {
    setAnalyzedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, vaultId } : item
    ));
    showNotification(`Vault auf [${vaultId.toUpperCase()}] geändert.`, 'info');
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
        Du bist D.T. Kern (Strategie-Modus). 
        Basierend auf der aktuellen Aktiven Mission und dem wichtigsten Game Changer, schlage den EINEN nächsten, höchst-impactvollen Schritt vor.
        
        AKTIVE MISSION: ${mission}
        TOP GAME CHANGER: ${topGameChanger ? `[${topGameChanger.vaultId.toUpperCase()}] ${topGameChanger.text} (Score: ${topGameChanger.score})` : 'Kein Game Changer vorhanden.'}
        
        BILLBOARD-KONTEXT:
        - INTEL: ${pinnedIntelItems.map(i => i.text).join(', ') || 'Keine'}
        - BLOCKER: ${pinnedBlockerItems.map(i => i.text).join(', ') || 'Keine'}
        
        Antworte extrem kurz, direkt und handlungsorientiert (max. 2 Sätze).
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const aiText = response.text || "Ich konnte keinen nächsten Schritt identifizieren.";
      
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'D.T. Kern (Strategie)',
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
        text: `Seed gelöscht: ${item.text.substring(0, 30)}...`,
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

  const handleAnalyze = async () => {
    const text = seedInput.trim();
    if (!text) {
      showNotification('Input leer. Bitte Seed eingeben.', 'warn');
      return;
    }

    // Check for API Key
    const apiKey = getEnv('VITE_GEMINI_API_KEY');
    if (!apiKey) {
      showNotification('Gemini API Key fehlt. Bitte VITE_GEMINI_API_KEY in den Umgebungsvariablen setzen.', 'warn');
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: 'FEHLER: Kein API Key gefunden. Wenn du auf Zeabur hostest, stelle sicher, dass die Variable VITE_GEMINI_API_KEY (mit VITE_ Präfix) gesetzt ist und die App danach neu gebaut wurde.',
        timestamp: Date.now()
      }]);
      return;
    }

    setIsAnalyzing(true);
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'User',
      text,
      timestamp: Date.now()
    }]);
    setSeedInput('');

    let contentToAnalyze = text;
    let isYoutube = false;
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})/;
    const match = text.match(youtubeRegex);

    if (match) {
      isYoutube = true;
      setLogs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'System',
        text: 'YouTube-Link erkannt. Starte Deep-Scan (Transkript-Abruf)...',
        timestamp: Date.now()
      }]);

      try {
        const transcriptResponse = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(text)}`);
        if (transcriptResponse.ok) {
          const data = await transcriptResponse.json();
          contentToAnalyze = `YouTube Video Transkript: ${data.transcript}`;
          setLogs(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            sender: 'System',
            text: `Transkript erfolgreich abgerufen (${data.parts} Segmente). Starte KI-Analyse...`,
            timestamp: Date.now()
          }]);
        } else {
          console.warn('Failed to fetch transcript, falling back to URL analysis');
          setLogs(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            sender: 'System',
            text: 'Transkript-Abruf fehlgeschlagen (Video hat evtl. keine Untertitel). Analysiere nur den Link...',
            timestamp: Date.now()
          }]);
        }
      } catch (err) {
        console.error('Transcript fetch error:', err);
      }
    }

    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analysiere diesen "Seed" (Gedanke, Idee, Projekt, Kundenanfrage, oder ein Video-Transkript) und kategorisiere ihn.
        
        ${isYoutube ? "Dies ist ein Transkript eines YouTube-Videos. Extrahiere die wichtigsten Erkenntnisse und erstelle eine prägnante Zusammenfassung (max 2 Sätze) für das Feld 'text'. Wenn der Titel des Videos im Transkript erkennbar ist, nutze ihn als Präfix." : ""}
        
        Seed: "${contentToAnalyze}"
        
        Säulen (pillarId):
        - health (Gesundheit)
        - dev (Pers. Entwicklung)
        - finance (Business & Finanzen)
        - mindset (Mentalität)
        - islam (Islam/Sirat)
        
        Vaults (vaultId):
        - ideen: Neue Konzepte, Geistesblitze.
        - projekte: Konkrete Vorhaben, komplexe Aufgaben.
        - kunden: Kundenanfragen (Websites, Apps, AI Agents, Automatisierungen, Business-Deals).
        - ziele: Langfristige Missionen.
        - workflows: Strategien, Prozesse.
        - academy: Weiterbildungen, Kurse, Abonnements, Logins, Credentials, Kosten für Bildung.
        - erkenntnisse: Gelerntes, Aha-Momente.
        - toolbox: Werkzeuge, Links.
        
        Impact-Score (1.0 bis 10.0):
        - 8-10: GAME CHANGER (Hoher Hebel)
        - 4-7: SOLID WORK (Wichtig, aber inkrementell)
        - 1-3: NOISE (Ablenkung, geringer Wert)
        
        Zusätzlich:
        - reasoning: Warum ist dieser Seed ein Game Changer oder Solid Work? (1 Satz)
        - nextStep: Was ist der nächste konkrete Schritt? (1 Satz)
        - status: Standardmäßig "Offen".
        - duration: Geschätzter Zeitbedarf (z.B. "15 Min", "45 Min", "2h").
        - blockedBy: Was blockiert diesen Seed aktuell? (Falls nichts, "Keine").
        - missionType: Einer der folgenden Typen: "Bauen", "Denken", "Planen", "Entscheiden", "Dokumentieren".
        - consequence: Was passiert, wenn man diesen Seed ignoriert? (1 kurzer Satz).
        
        Gib das Ergebnis als JSON zurück.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              score: { type: Type.NUMBER },
              pillarId: { type: Type.STRING },
              vaultId: { type: Type.STRING },
              category: { 
                type: Type.STRING, 
                enum: ["GAME CHANGER", "SOLID WORK", "NOISE"],
                description: "Die Kategorie basierend auf dem Score (8-10: GAME CHANGER, 4-7: SOLID WORK, 1-3: NOISE)"
              },
              reasoning: { type: Type.STRING },
              nextStep: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["Offen", "In Arbeit", "Blockiert"] },
              duration: { type: Type.STRING },
              blockedBy: { type: Type.STRING },
              missionType: { type: Type.STRING, enum: ["Bauen", "Denken", "Planen", "Entscheiden", "Dokumentieren"] },
              consequence: { type: Type.STRING }
            },
            required: ["text", "score", "pillarId", "vaultId", "category", "reasoning", "nextStep", "status", "duration", "blockedBy", "missionType", "consequence"]
          }
        }
      });

      if (!response.text) {
        throw new Error('Die KI hat keine Text-Antwort geliefert. Möglicherweise wurde die Anfrage durch Sicherheitsfilter blockiert oder der API-Key ist ungültig.');
      }

      const result = JSON.parse(response.text);
      
      // Fallback logic for category based on score if AI returns something else
      let finalCategory: 'GAME CHANGER' | 'SOLID WORK' | 'NOISE' = result.category as any;
      const score = result.score || 5;
      
      if (!['GAME CHANGER', 'SOLID WORK', 'NOISE'].includes(finalCategory)) {
        if (score >= 8) finalCategory = 'GAME CHANGER';
        else if (score >= 4) finalCategory = 'SOLID WORK';
        else finalCategory = 'NOISE';
      }

      const newItem: AnalyzedItem = {
        id: Date.now().toString(),
        text: result.text || text,
        score: score,
        pillarId: result.pillarId || 'dev',
        vaultId: result.vaultId as any || 'ideen',
        category: finalCategory,
        reasoning: result.reasoning || '',
        nextStep: result.nextStep || '',
        status: result.status as any || 'Offen',
        duration: result.duration || 'Unbekannt',
        blockedBy: result.blockedBy || 'Keine',
        missionType: result.missionType as any || 'Bauen',
        consequence: result.consequence || '',
        timestamp: Date.now(),
        sourceUrl: isYoutube ? text : undefined
      };

      setAnalyzedItems(prev => [newItem, ...prev]);
      
      if (surrealStatus === 'connected') {
        await surrealService.saveSeed(newItem);
      }

      showNotification('Seed analysiert und gesichert.', 'success');
      
      setLogs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'D.T. Kern',
        text: `Analyse abgeschlossen: [${newItem.vaultId.toUpperCase()}] ${newItem.text} (Score: ${newItem.score.toFixed(1)}). Zugeordnet zu: ${pillars.find(p => p.id === newItem.pillarId)?.name || 'Unbekannt'}.`,
        timestamp: Date.now()
      }]);

    } catch (err) {
      console.error('Analysis Error:', err);
      showNotification('Fehler bei der KI-Analyse.', 'warn');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('text/') && !file.name.endsWith('.log') && !file.name.endsWith('.txt')) {
      showNotification('Bitte nur Textdateien (.txt, .log) hochladen.', 'warn');
      return;
    }

    setIsFileLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setIsFileLoading(false);
        return;
      }

      // Check for API Key
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      if (!apiKey) {
        showNotification('Gemini API Key fehlt.', 'warn');
        setLogs(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'System',
          text: 'FEHLER: Datei-Analyse nicht möglich, da kein API Key gefunden wurde (VITE_GEMINI_API_KEY erforderlich).',
          timestamp: Date.now()
        }]);
        setIsFileLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: `Datei "${file.name}" empfangen (${content.length} Zeichen). Starte Deep-Analysis...`,
        timestamp: Date.now()
      }]);

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analysiere diesen Text und extrahiere die sinnvollsten, handlungsrelevanten Informationen. 
          Erstelle eine Liste von "Seeds". Jedes Element muss folgendes enthalten:
          - text: Eine kurze, prägnante Zusammenfassung der Info.
          - score: Ein Impact-Score von 1.0 bis 10.0.
          - pillarId: Eine der IDs: health, dev, finance, mindset, islam.
          - vaultId: Eine der IDs: ideen, projekte, kunden, ziele, workflows, academy, erkenntnisse, toolbox.
          - category: Entweder "GAME CHANGER" (Score 8-10), "SOLID WORK" (4-7) oder "NOISE" (1-3).
          
          Vault-Logik (WICHTIG):
          - ideen: Neue Konzepte, Geistesblitze, kreative Ansätze.
          - projekte: Konkrete Vorhaben, komplexe Aufgabenpakete, laufende Projekte.
          - kunden: Kundenanfragen, Business-Deals, Website/App/AI-Agent Anfragen, Automatisierungs-Wünsche.
          - ziele: Langfristige Missionen, Meilensteine, Visionen.
          - workflows: Strategien, Prozesse, n8n-Logik, Schritt-für-Schritt Anleitungen.
          - academy: Weiterbildungen, Kurse, Abonnements, Logins, Credentials, Kosten für Bildung.
          - erkenntnisse: Gelerntes, Aha-Momente, tiefere Einsichten, Weisheiten.
          - toolbox: Werkzeuge, Links, Ressourcen, Snippets.
          
          Text zum Analysieren:
          ${content.substring(0, 30000)}`, // Cap to avoid token limits
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  pillarId: { type: Type.STRING },
                  vaultId: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["text", "score", "pillarId", "vaultId", "category"]
              }
            }
          }
        });

        const results = JSON.parse(response.text || "[]") as AnalyzedItem[];
        
        if (results.length > 0) {
          const itemsWithIds = results.map(item => ({
            ...item,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
          }));

          setAnalyzedItems(prev => [...itemsWithIds, ...prev]);

          // Save to SurrealDB if connected
          if (surrealStatus === 'connected') {
            Promise.all(itemsWithIds.map(item => surrealService.saveSeed(item))).catch(err => {
              console.error('SurrealDB Batch Save Error:', err);
              showNotification('Fehler beim Batch-Speichern in SurrealDB.', 'warn');
            });
          }
          
          setLogs(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'D.T. Kern',
            text: `Deep-Analysis abgeschlossen. ${results.length} relevante Informationen extrahiert und kategorisiert.`,
            timestamp: Date.now()
          }]);
          showNotification(`${results.length} Erkenntnisse extrahiert.`, 'success');
        } else {
          showNotification('Keine relevanten Informationen gefunden.', 'info');
        }
      } catch (error) {
        console.error('Gemini Error:', error);
        showNotification('Fehler bei der KI-Analyse.', 'warn');
      } finally {
        setIsFileLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
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
    link.setAttribute('download', `dt_kern_export_${new Date().toISOString().split('T')[0]}.csv`);
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
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderColor: '#10b981',
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
        angleLines: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        pointLabels: {
          font: { size: 12 },
          color: isDarkMode ? '#cbd5e1' : '#475569'
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
        bodyColor: '#10b981',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      }
    }
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row lg:overflow-hidden bg-dark text-slate-50 font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Floating Action Button for Mobile (Back to Top) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="p-3 bg-primary text-slate-900 rounded-2xl shadow-2xl shadow-primary/40 active:scale-90 transition-all border border-primary/20"
        >
          <Brain className="w-6 h-6" />
        </button>
      </div>

      {/* Left Panel: Input & Status */}
      <section className="lg:w-1/3 bg-dark p-4 sm:p-5 border-r border-white/5 flex flex-col overflow-y-auto lg:h-full">
        {/* Branding & System Status (Integrated Header) */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold tracking-tighter text-white">D.T. KERN-ANALYST</h1>
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-500 hover:text-primary border border-white/5"
              title={isDarkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] rounded-xl border border-white/5">
            <div className="flex items-center gap-4">
              <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-2"></span>
                System Online
              </p>
              <div className="h-3 w-[1px] bg-white/10"></div>
              <button 
                onClick={() => setIsSurrealModalOpen(true)}
                className={cn(
                  "text-[9px] font-bold uppercase tracking-widest flex items-center px-2 py-0.5 rounded-full border transition-all",
                  surrealStatus === 'connected' 
                    ? "bg-primary/10 border-primary/30 text-primary" 
                    : "bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-800"
                )}
              >
                {surrealStatus === 'connected' ? <Wifi className="w-2.5 h-2.5 mr-1" /> : <WifiOff className="w-2.5 h-2.5 mr-1" />}
                <span>SurrealDB: </span>{surrealStatus === 'connected' ? (isSyncing ? 'Sync' : 'Aktiv') : surrealStatus === 'connecting' ? 'Wait' : 'Off'}
              </button>
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] text-accent font-mono tracking-tighter opacity-60">Die Sirat-Brücke</p>
            </div>
          </div>
        </div>

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
                      <button 
                        onClick={() => setIsMissionLocked(!isMissionLocked)}
                        className={cn(
                          "p-2 rounded-lg transition-all active:scale-90",
                          isMissionLocked ? "text-emerald-400 bg-emerald-400/10" : "text-slate-500 bg-white/5 hover:bg-white/10"
                        )}
                      >
                        {isMissionLocked ? <Lock className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 flex-1 flex flex-col relative z-10">
                    {/* Slot 1: Aktive Mission */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                          <Target className="w-3 h-3" /> Aktive Mission
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSuggestNextTask}
                            disabled={isChatting}
                            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/20 flex items-center gap-1.5"
                            title="Nächsten Schritt vorschlagen"
                          >
                            <Zap className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest hidden sm:inline">Next Step</span>
                          </button>
                          {isMissionLocked && (
                            <div className="flex items-center gap-1.5">
                              <Pin className="w-3 h-3 text-emerald-500" />
                              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">
                                Locked
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="relative group/slot">
                        {isMissionLocked ? (
                          <div className="w-full min-h-[80px] bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-lg shadow-primary/5">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Herkunft: Analyse</span>
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                                • <Clock className="w-2 h-2" /> heute
                              </span>
                            </div>
                            <p className="text-sm text-primary font-bold leading-relaxed">
                              {missionInput || 'Keine aktive Mission.'}
                            </p>
                          </div>
                        ) : (
                          <textarea
                            value={missionInput}
                            onChange={(e) => setMissionInput(e.target.value)}
                            placeholder="Was ist heute das Wichtigste?"
                            className="w-full min-h-[80px] bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all resize-none font-medium"
                          />
                        )}
                        {isMissionLocked && todaysMission && (
                          <button 
                            onClick={handleDeleteMission}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/slot:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Slot 2: Pinned Intel */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-sky-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Brain className="w-3 h-3" /> Pinned Intel
                      </h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                          {pinnedIntelItems.map(item => (
                            <BillboardCard 
                              key={item.id} 
                              item={item} 
                              onRemove={handleRemovePinnedItem}
                              onTakeToMission={handleTakeBillboardToMission}
                            />
                          ))}
                        </AnimatePresence>
                        {pinnedIntelItems.length === 0 && (
                          <div className="text-[10px] text-slate-600 italic p-4 border border-dashed border-white/5 rounded-2xl text-center">
                            Keine Intel gepinnt.
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={intelInput}
                          onChange={(e) => setIntelInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePinItem(intelInput, 'intel')}
                          placeholder="Intel pinnen..."
                          className="w-full bg-sky-400/5 border border-sky-400/20 rounded-xl px-4 py-2.5 text-xs text-sky-100 placeholder:text-sky-900/50 focus:outline-none focus:border-sky-400/50 transition-all font-medium"
                        />
                        <button 
                          onClick={() => handlePinItem(intelInput, 'intel')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-sky-400 hover:text-sky-300 transition-colors"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Slot 3: Blocker / Warnung */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-red-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" /> Blocker / Warnung
                      </h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                          {pinnedBlockerItems.map(item => (
                            <BillboardCard 
                              key={item.id} 
                              item={item} 
                              onRemove={handleRemovePinnedItem}
                              onTakeToMission={handleTakeBillboardToMission}
                            />
                          ))}
                        </AnimatePresence>
                        {pinnedBlockerItems.length === 0 && (
                          <div className="text-[10px] text-slate-600 italic p-4 border border-dashed border-white/5 rounded-2xl text-center">
                            Keine Blocker gepinnt.
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={blockerInput}
                          onChange={(e) => setBlockerInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePinItem(blockerInput, 'blocker')}
                          placeholder="Blocker pinnen..."
                          className="w-full bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-2.5 text-xs text-red-100 placeholder:text-red-900/50 focus:outline-none focus:border-red-400/50 transition-all font-medium"
                        />
                        <button 
                          onClick={() => handlePinItem(blockerInput, 'blocker')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {!isMissionLocked && missionInput.trim() && (
                      <button
                        onClick={handleLogMission}
                        disabled={isLoggingMission}
                        className="w-full py-4 bg-primary text-dark font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 mt-auto"
                      >
                        {isLoggingMission ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span className="uppercase tracking-widest text-[11px]">Mission Einloggen</span>
                      </button>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Bottom Board */}
          <div className="p-4 sm:p-6 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-accent" /> Die G.C. Method (Impact-Filter)
                </h2>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Konzentriere dich auf die Game Changer (8-10) für den 80/20-Fokus. Noise (1-3) wird automatisch als "erledigt/ignoriert" markiert.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Vault:</span>
                <select 
                  value={VAULTS.some(v => v.id === selectedFilterId) ? selectedFilterId || "" : ""}
                  onChange={(e) => setSelectedFilterId(e.target.value || null)}
                  className="bg-panel border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-300 outline-none focus:border-primary/50 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <option value="">Alle Vaults</option>
                  {VAULTS.map(v => (
                    <option key={v.id} value={v.id}>{v.icon} {v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full pb-10">
              {/* Game Changers */}
              <div className="bg-panel rounded-lg border border-primary/30 flex flex-col min-h-[300px]">
                <div className="p-3 bg-primary/10 border-b border-primary/20 rounded-t-lg">
                  <h3 className="font-bold text-primary flex justify-between items-center">
                    <span>Game Changer (8-10)</span>
                    <span className="bg-primary text-slate-900 text-xs px-2 py-1 rounded-full font-bold">Fokus</span>
                  </h3>
                </div>
                <div className="p-3 space-y-3 lg:overflow-y-auto flex-1">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.filter(i => i.category === 'GAME CHANGER').map(item => {
                      const pillar = pillars.find(p => p.id === item.pillarId) || INITIAL_PILLARS[0];
                      return (
                        <BoardCard 
                          key={item.id} 
                          item={item} 
                          pillar={pillar} 
                          onDelete={handleDeleteSeed} 
                          onPin={handlePinItem}
                          onTakeToMission={handleTakeToMission}
                          onMakeMission={handleMakeMission}
                          onMoveToVault={handleMoveToVault}
                          onUpdateVault={handleUpdateVault}
                          onToggleSelect={toggleSeedSelection}
                          isSelected={selectedSeeds.some(s => s.id === item.id)}
                          showNotification={showNotification} 
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Solid Work */}
              <div className="bg-panel rounded-lg border border-slate-700 flex flex-col min-h-[300px]">
                <div className="p-3 bg-slate-800 border-b border-slate-700 rounded-t-lg">
                  <h3 className="font-bold text-slate-300 flex justify-between items-center">
                    <span>Solide Arbeit (4-7)</span>
                    <span className="text-xs text-slate-400">Inkrementell</span>
                  </h3>
                </div>
                <div className="p-3 space-y-3 lg:overflow-y-auto flex-1">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.filter(i => i.category === 'SOLID WORK').map(item => {
                      const pillar = pillars.find(p => p.id === item.pillarId) || INITIAL_PILLARS[0];
                      return (
                        <BoardCard 
                          key={item.id} 
                          item={item} 
                          pillar={pillar} 
                          onDelete={handleDeleteSeed} 
                          onPin={handlePinItem}
                          onTakeToMission={handleTakeToMission}
                          onMakeMission={handleMakeMission}
                          onMoveToVault={handleMoveToVault}
                          onUpdateVault={handleUpdateVault}
                          onToggleSelect={toggleSeedSelection}
                          isSelected={selectedSeeds.some(s => s.id === item.id)}
                          showNotification={showNotification} 
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Noise */}
              <div className="bg-panel rounded-lg border border-slate-800 opacity-75 flex flex-col min-h-[300px]">
                <div className="p-3 bg-slate-900 border-b border-slate-800 rounded-t-lg">
                  <h3 className="font-bold text-noise flex justify-between items-center">
                    <span>Noise (1-3)</span>
                    <span className="text-xs text-noise">Ablenkung</span>
                  </h3>
                </div>
                <div className="p-3 space-y-3 lg:overflow-y-auto flex-1">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.filter(i => i.category === 'NOISE').map(item => {
                      const pillar = pillars.find(p => p.id === item.pillarId) || INITIAL_PILLARS[0];
                      return (
                        <BoardCard 
                          key={item.id} 
                          item={item} 
                          pillar={pillar} 
                          onDelete={handleDeleteSeed} 
                          onPin={handlePinItem}
                          onTakeToMission={handleTakeToMission}
                          onMakeMission={handleMakeMission}
                          onMoveToVault={handleMoveToVault}
                          onUpdateVault={handleUpdateVault}
                          onToggleSelect={toggleSeedSelection}
                          isSelected={selectedSeeds.some(s => s.id === item.id)}
                          showNotification={showNotification} 
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>
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
                      className="w-full bg-primary hover:bg-emerald-600 text-slate-900 font-bold py-3 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-emerald-900/20"
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
        </section>
      </div>
    );
}

interface BoardCardProps {
  item: AnalyzedItem;
  pillar: Pillar;
  onDelete: (item: AnalyzedItem) => void;
  onPin: (text: string, type: 'intel' | 'blocker', origin: BillboardItem['origin'], expiry: BillboardItem['expiry']) => void;
  onTakeToMission: (item: AnalyzedItem) => void;
  onMakeMission: (item: AnalyzedItem) => void;
  onMoveToVault: (item: AnalyzedItem) => void;
  onUpdateVault: (itemId: string, vaultId: AnalyzedItem['vaultId']) => void;
  onToggleSelect: (item: AnalyzedItem) => void;
  isSelected: boolean;
  showNotification: (msg: string, type: 'success' | 'warn' | 'info') => void;
  key?: string | number;
}

function BoardCard({ 
  item, 
  pillar, 
  onDelete, 
  onPin, 
  onTakeToMission, 
  onMakeMission, 
  onMoveToVault, 
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
        "p-4 rounded-2xl border transition-all relative group backdrop-blur-md",
        isGC ? "bg-slate-800/40 border-primary/20 shadow-lg shadow-primary/5 hover:border-primary/40 text-white" : 
        isNoise ? "bg-slate-950/20 border-white/5 line-through text-slate-600 opacity-50" :
        "bg-slate-900/30 border-white/5 shadow-sm hover:border-white/10 text-slate-200"
      )}
    >
      <div className={cn("flex justify-between items-start mb-3", isNoise && "opacity-50")}>
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center space-x-2">
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
            "px-2 py-1 rounded-lg text-[10px] font-bold font-mono",
            isGC ? "bg-primary text-slate-900" : "bg-white/5 text-slate-400"
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

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button 
          onClick={() => onToggleSelect(item)}
          className={cn(
            "p-1.5 rounded-lg transition-all border flex-shrink-0 flex items-center gap-1.5 px-2.5",
            isSelected 
              ? "bg-primary text-slate-900 border-primary shadow-lg shadow-primary/20" 
              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
          )}
          title={isSelected ? "Aus Chat-Kontext entfernen" : "In Chat-Kontext ziehen"}
        >
          <MessageSquare className={cn("w-3.5 h-3.5", isSelected ? "fill-current" : "")} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {isSelected ? "Im Kontext" : "Kontext"}
          </span>
        </button>
        <button 
          onClick={() => onTakeToMission(item)}
          className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/20 flex-shrink-0"
          title="Zur aktiven Priorität"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => onPin(item.text, 'intel', 'Seed', 'heute')}
          className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex-shrink-0"
          title="Ins Billboard pinnen"
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => onMakeMission(item)}
          className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-all border border-amber-500/20 flex-shrink-0"
          title="Mission daraus erzeugen"
        >
          <Target className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => onMoveToVault(item)}
          className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg hover:bg-indigo-500/20 transition-all border border-indigo-500/20 flex-shrink-0"
          title="In Vault bestätigen"
        >
          <Database className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => onDelete(item)}
          className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all border border-red-500/20 flex-shrink-0"
          title="Ignorieren / Löschen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
