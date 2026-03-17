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
  Send,
  Sun,
  Moon,
  Download
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
  sender: 'User' | 'D.T. Kern' | 'System';
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
  vaultId: 'ideen' | 'projekte' | 'ziele' | 'workflows' | 'erkenntnisse' | 'toolbox';
  category: 'GAME CHANGER' | 'SOLID WORK' | 'NOISE';
  timestamp: number;
}

interface MissionPlan {
  id: string;
  rawId?: string;
  text: string;
  targetDate: string; // YYYY-MM-DD
  timestamp: number;
}

const VAULTS = [
  { id: 'ideen', name: 'IDEEN DECK', icon: '💡', color: '#8b5cf6' },
  { id: 'projekte', name: 'PROJEKT AKTEN', icon: '📁', color: '#3b82f6' },
  { id: 'ziele', name: 'MISSIONS ZIELE', icon: '🎯', color: '#ef4444' },
  { id: 'workflows', name: 'STRATEGIEN / WORKFLOWS', icon: '⚙️', color: '#10b981' },
  { id: 'erkenntnisse', name: 'ERKENNTNISSE', icon: '🧠', color: '#f59e0b' },
  { id: 'toolbox', name: 'TOOLBOX', icon: '🧰', color: '#64748b' }
] as const;

const INITIAL_PILLARS: Pillar[] = [
  { id: 'health', name: 'Gesundheit', icon: '🌿', color: '#3b82f6' },
  { id: 'dev', name: 'Pers. Entwicklung', icon: '📚', color: '#f59e0b' },
  { id: 'finance', name: 'Finanzen', icon: '💰', color: '#10b981' },
  { id: 'mindset', name: 'Mentalität', icon: '🧠', color: '#8b5cf6' },
  { id: 'islam', name: 'Islam (Sirat)', icon: '🕋', color: '#eab308' }
];

export default function App() {
  const [seedInput, setSeedInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [isLogCollapsed, setIsLogCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSurrealModalOpen, setIsSurrealModalOpen] = useState(false);
  const [missionInput, setMissionInput] = useState('');
  const [todaysMission, setTodaysMission] = useState<MissionPlan | null>(null);
  const [isLoggingMission, setIsLoggingMission] = useState(false);
  const [isMissionLocked, setIsMissionLocked] = useState(false);
  const [surrealStatus, setSurrealStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [surrealConfig, setSurrealConfig] = useState<SurrealConfig>({
    url: import.meta.env.VITE_SURREALDB_URL || (process.env as any).VITE_SURREALDB_URL || '',
    ns: import.meta.env.VITE_SURREALDB_NS || (process.env as any).VITE_SURREALDB_NS || 'test',
    db: import.meta.env.VITE_SURREALDB_DB || (process.env as any).VITE_SURREALDB_DB || 'test',
    user: import.meta.env.VITE_SURREALDB_USER || (process.env as any).VITE_SURREALDB_USER || '',
    pass: import.meta.env.VITE_SURREALDB_PASS || (process.env as any).VITE_SURREALDB_PASS || ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }), []);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'initial',
      sender: 'System',
      text: 'Bereit für deinen Input. Ich bewerte alles auf einer Skala von 1-10 und filtere nach den 5 Säulen.',
      timestamp: Date.now()
    }
  ]);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; msg: string; type: 'success' | 'warn' | 'info' }[]>([]);

  const filteredItems = useMemo(() => {
    if (!selectedVaultId) return analyzedItems;
    return analyzedItems.filter(item => item.vaultId === selectedVaultId);
  }, [analyzedItems, selectedVaultId]);

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

  const handleUnlockMission = () => {
    setIsMissionLocked(false);
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
      // Fetch context from SurrealDB
      let contextData = "";
      if (surrealStatus === 'connected') {
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
        contextData = "Hinweis: SurrealDB ist aktuell nicht verbunden. Ich habe nur Zugriff auf die Demo-Daten.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Du bist D.T. Kern, der digitale Zwilling und Analyst des Nutzers. 
        Deine Aufgabe ist es, den Nutzer basierend auf seinen Daten in SurrealDB zu beraten.
        
        KONTEXT AUS DER DATENBANK:
        ${contextData}
        
        NUTZER-ANFRAGE:
        ${text}`,
        config: {
          systemInstruction: isDeep 
            ? "Antworte ausführlich, tiefgründig und analytisch. Gehe ins Detail, erstelle Pläne und analysiere Zusammenhänge zwischen den Seeds. Nutze die 5 Säulen als strategischen Kompass. WICHTIG: Verzichte auf Begrüßungen oder Vorstellungen deiner Identität (wie 'Ich bin D.T. Kern' oder 'dein digitaler Zwilling'), da der Nutzer dies bereits weiß. Steige direkt in die Analyse ein."
            : "Antworte extrem kurz, gezielt und wie ein echter Gesprächspartner. Maximal 1-2 Sätze. Sei präzise und direkt.",
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

  const handleAnalyze = async () => {
    const text = seedInput.trim();
    if (!text) {
      showNotification('Input leer. Bitte Seed eingeben.', 'warn');
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

    // Simulate processing
    setTimeout(() => {
      let assignedPillar = pillars[Math.floor(Math.random() * pillars.length)];
      let score = Math.random() * 9 + 1;
      let vaultId: AnalyzedItem['vaultId'] = 'ideen';

      if (text.includes('http') || text.includes('youtube')) {
        score = Math.random() * 4 + 4;
        vaultId = 'toolbox';
      }
      if (text.length > 100) {
        score = Math.random() * 3 + 7;
        vaultId = 'projekte';
      }
      if (text.toLowerCase().includes('islam') || text.toLowerCase().includes('gebet')) {
        score = Math.random() * 2 + 8;
        assignedPillar = pillars.find(p => p.id === 'islam') || assignedPillar;
        vaultId = 'ziele';
      }
      if (text.toLowerCase().includes('erkenntnis') || text.toLowerCase().includes('gelernt')) {
        vaultId = 'erkenntnisse';
      }
      if (text.toLowerCase().includes('strategie') || text.toLowerCase().includes('plan')) {
        vaultId = 'workflows';
      }

      const category: AnalyzedItem['category'] = score >= 8 ? "GAME CHANGER" : (score >= 4 ? "SOLID WORK" : "NOISE");

      const newItem: AnalyzedItem = {
        id: Date.now().toString(),
        text,
        score,
        pillarId: assignedPillar.id,
        vaultId,
        category,
        timestamp: Date.now()
      };

      setAnalyzedItems(prev => [newItem, ...prev]);
      
      // Save to SurrealDB if connected
      if (surrealStatus === 'connected') {
        surrealService.saveSeed(newItem).catch(err => {
          console.error('SurrealDB Save Error:', err);
          showNotification('Fehler beim Speichern in SurrealDB.', 'warn');
        });
      }

      showNotification('Seed erfolgreich in SurrealDB gesichert.', 'success');
      setIsAnalyzing(false);
    }, 1500);
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
          - vaultId: Eine der IDs: ideen, projekte, ziele, workflows, erkenntnisse, toolbox.
          - category: Entweder "GAME CHANGER" (Score 8-10), "SOLID WORK" (4-7) oder "NOISE" (1-3).
          
          Vault-Logik (WICHTIG):
          - ideen: Neue Konzepte, Geistesblitze, kreative Ansätze.
          - projekte: Konkrete Vorhaben, komplexe Aufgabenpakete, laufende Projekte.
          - ziele: Langfristige Missionen, Meilensteine, Visionen.
          - workflows: Strategien, Prozesse, n8n-Logik, Schritt-für-Schritt Anleitungen.
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
    <div className="h-screen flex flex-col overflow-hidden bg-dark text-slate-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 bg-panel/80 backdrop-blur-md border-b border-white/5 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center z-50 shadow-sm gap-3 sm:gap-0">
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">D.T. KERN-ANALYST</h1>
              <div className="flex items-center space-x-3">
                <p className="text-[10px] text-primary/80 font-medium flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1.5"></span>
                  System Online
                </p>
                <div className="h-3 w-[1px] bg-white/10"></div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-primary"
                  title={isDarkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <div className="h-3 w-[1px] bg-white/10"></div>
                <button 
                  onClick={() => setIsSurrealModalOpen(true)}
                  className={cn(
                    "text-[9px] font-medium flex items-center px-2 py-0.5 rounded-full border transition-all",
                    surrealStatus === 'connected' 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-800"
                  )}
                >
                  {surrealStatus === 'connected' ? <Wifi className="w-2.5 h-2.5 mr-1" /> : <WifiOff className="w-2.5 h-2.5 mr-1" />}
                  <span className="hidden xs:inline">SurrealDB: </span>{surrealStatus === 'connected' ? (isSyncing ? 'Sync' : 'Aktiv') : surrealStatus === 'connecting' ? 'Wait' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs font-medium text-slate-400">Ultimativer Filter:</p>
          <p className="text-xs text-accent font-mono tracking-tighter">Die Sirat-Brücke (7 Fragen)</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* Left Panel: Input */}
        <section className="lg:w-1/3 bg-dark p-4 sm:p-6 border-r border-white/5 flex flex-col lg:overflow-y-auto">
          <div className={cn("transition-all duration-500 overflow-hidden", isInputCollapsed ? "max-h-0 opacity-0 mb-0" : "max-h-[500px] opacity-100 mb-8")}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white tracking-tight">🌱 Seed-Eingabe</h2>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">Input Mode</span>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
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
                rows={4} 
                className="w-full bg-black/20 text-white p-4 rounded-xl border border-white/5 focus:border-primary/50 focus:ring-0 outline-none transition-all text-sm resize-none placeholder:text-slate-700" 
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
          <div className="flex-1 flex flex-col min-h-[100px] overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-slate-300 flex items-center">
                <History className="w-4 h-4 mr-2 text-slate-500" /> Analysten-Log
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsLogCollapsed(!isLogCollapsed)}
                  className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase tracking-widest px-2 py-1 bg-white/5 rounded-lg border border-white/5 transition-all"
                >
                  {isLogCollapsed ? "[ Log zeigen ]" : "[ Log einklappen ]"}
                </button>
                <button 
                  onClick={() => setIsInputCollapsed(!isInputCollapsed)}
                  className="text-[10px] font-bold text-primary/60 hover:text-primary uppercase tracking-widest px-2 py-1 bg-white/5 rounded-lg border border-white/5 transition-all"
                >
                  {isInputCollapsed ? "[ Seed-Eingabe öffnen ]" : "[ Einklappen ]"}
                </button>
              </div>
            </div>

            {/* System Logs (Collapsible) */}
            <div className={cn("space-y-2 mb-4 transition-all duration-500 overflow-hidden", isLogCollapsed ? "max-h-0 opacity-0" : "max-h-[120px] opacity-100 overflow-y-auto pr-2 scrollbar-hide")}>
              {logs.filter(l => l.sender === 'System').map(log => (
                <div key={log.id} className="text-[10px] text-slate-500 italic border-l border-white/10 pl-3 py-1 bg-white/[0.02] rounded-r-lg">
                  <span className="text-[8px] text-slate-700 mr-2 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {log.text}
                </div>
              ))}
            </div>

            {/* Chat Messages (Flexible) */}
            <div ref={chatLogRef} className="flex-1 lg:overflow-y-auto space-y-3 pr-2 scrollbar-hide mb-4">
              <AnimatePresence initial={false}>
                {logs.filter(l => l.sender !== 'System').map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-3 rounded-2xl border transition-all backdrop-blur-md",
                      log.sender === 'User' 
                        ? "bg-white/5 border-white/5 text-slate-300 ml-4" 
                        : "bg-primary/5 border-primary/20 text-slate-200 mr-4"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        log.sender === 'User' ? "text-slate-500" : "text-primary"
                      )}>
                        {log.sender}
                      </span>
                      <span className="text-[9px] text-slate-600 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="markdown-body">
                      <ReactMarkdown>{log.text}</ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Chat Input */}
            <form onSubmit={(e) => handleChatSubmit(e)} className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
              <div className="relative flex-1">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Frag deinen digitalen Zwilling..."
                  disabled={isChatting}
                  className="w-full bg-panel/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:border-primary/50 outline-none transition-all placeholder:text-slate-600"
                />
                <button 
                  type="submit"
                  disabled={isChatting || !chatInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-30"
                >
                  {isChatting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button 
                type="button"
                onClick={() => handleChatSubmit(undefined, true)}
                disabled={isChatting || !chatInput.trim()}
                className="p-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl border border-accent/20 transition-all flex items-center justify-center group"
                title="Tiefe Antwort anfordern"
              >
                <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider hidden xs:inline">Deep</span>
              </button>
            </form>
          </div>
        </section>

        {/* Right Panel: Dashboard */}
        <section className="lg:w-2/3 bg-dark flex flex-col lg:overflow-y-auto relative">
          
          {/* Top Dashboard */}
          <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                {/* Vaults Layer */}
                <div className="mb-6 sm:mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center">
                      <Settings className="w-3 h-3 mr-2" /> Vault Selection / Filter
                    </h3>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handleExportCSV}
                        className="text-[10px] text-slate-400 hover:text-primary font-mono uppercase flex items-center gap-1.5 transition-colors"
                        title="Alle Daten als CSV exportieren"
                      >
                        <Download className="w-3 h-3" />
                        [ Export CSV ]
                      </button>
                      {selectedVaultId && (
                        <button 
                          onClick={() => setSelectedVaultId(null)}
                          className="text-[10px] text-primary hover:underline font-mono uppercase"
                        >
                          [ Reset Filter ]
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="pb-2">
                    <div className="grid grid-cols-3 sm:flex sm:flex-nowrap gap-3 sm:gap-4">
                      {VAULTS.map(vault => {
                        const count = analyzedItems.filter(i => i.vaultId === vault.id).length;
                        const isActive = selectedVaultId === vault.id;
                        return (
                          <button 
                            key={vault.id} 
                            onClick={() => setSelectedVaultId(isActive ? null : vault.id)}
                            className="flex flex-col items-center group outline-none"
                          >
                            <div className={cn(
                              "w-full aspect-square sm:w-24 sm:h-24 bg-panel rounded-xl border flex flex-col items-center justify-center relative transition-all duration-300",
                              isActive 
                                ? "border-primary shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-105" 
                                : "border-slate-700 hover:border-slate-500"
                            )}>
                              <span className={cn(
                                "text-2xl mb-1 transition-transform duration-300",
                                isActive ? "scale-110" : "group-hover:scale-110"
                              )}>
                                {vault.icon}
                              </span>
                              <span className={cn(
                                "text-xl font-bold transition-colors",
                                isActive ? "text-primary" : "text-white"
                              )}>
                                {count}
                              </span>
                              <div className={cn(
                                "absolute bottom-2 w-8 h-0.5 transition-all duration-300",
                                isActive ? "bg-primary w-12" : "bg-slate-600 group-hover:bg-slate-400"
                              )}></div>
                            </div>
                            <span className={cn(
                              "mt-2 text-[8px] sm:text-[9px] font-mono uppercase tracking-tighter sm:tracking-widest border px-1 sm:px-2 py-0.5 rounded transition-colors text-center w-full truncate block",
                              isActive 
                                ? "border-primary/50 text-primary bg-primary/5" 
                                : "border-slate-800 text-slate-500 group-hover:text-slate-400"
                            )}>
                              {vault.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white tracking-tight">📊 Status & Balance</h2>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">Live Metrics</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-8 max-w-2xl leading-relaxed">
                    Verteilung deiner Seeds und Aktivitäten auf die 5 Kern-Prioritäten.
                  </p>

                  <div className="flex flex-col md:flex-row gap-10 items-center justify-center bg-panel/20 backdrop-blur-sm p-6 sm:p-8 rounded-3xl border border-white/5 shadow-sm">
                    <div className="w-full md:w-1/2 h-[300px] md:h-[350px] flex items-center justify-center">
                      <Radar data={chartData} options={chartOptions} />
                    </div>

                    <div className="w-full md:w-1/2 space-y-5">
                      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Aktivitäts-Index</h3>
                      <div className="space-y-4">
                        {pillars.map(pillar => (
                          <div key={pillar.id} className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
                              <div className="flex items-center space-x-2">
                                <span>{pillar.icon}</span>
                                <span className="text-slate-300">{pillar.name}</span>
                              </div>
                              <span className="text-slate-500 font-mono">{Math.round(pillar.value)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${pillar.value}%` }}
                                transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                                className="h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]" 
                                style={{ backgroundColor: pillar.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mission Planning Card */}
              <div className="xl:col-span-1">
                <section className={cn(
                  "border rounded-3xl p-6 sm:p-8 relative overflow-hidden group h-full flex flex-col transition-all duration-700",
                  isMissionLocked 
                    ? "bg-emerald-950/10 border-emerald-500/20 shadow-xl shadow-emerald-500/5" 
                    : "bg-panel/20 backdrop-blur-sm border-white/5 shadow-sm"
                )}>
                  {isMissionLocked && <div className="scanline opacity-20" />}
                  
                  <div className="absolute top-0 right-0 p-6 z-10">
                    <button 
                      onClick={handleUnlockMission}
                      className={cn(
                        "p-2.5 rounded-xl transition-all active:scale-90",
                        isMissionLocked ? "text-emerald-400 bg-emerald-400/10" : "text-slate-500 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      {isMissionLocked ? <Lock className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-8 relative z-10">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      isMissionLocked ? "bg-emerald-400/10" : "bg-sky-400/10"
                    )}>
                      <Clock className={cn("w-5 h-5", isMissionLocked ? "text-emerald-400" : "text-sky-400")} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight uppercase">
                        {new Date().getHours() >= 5 && new Date().getHours() < 12 
                          ? "Guten Morgen" 
                          : "Mission Planning"}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {new Date().getHours() >= 5 && new Date().getHours() < 12 
                          ? "Befehle für heute" 
                          : "Parameter für morgen"}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {isMissionLocked && (
                    <div className="mb-6 flex items-center space-x-2.5 relative z-10 bg-emerald-400/5 px-3 py-2 rounded-full w-fit">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                        Active Protocol
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 flex-1 flex flex-col relative z-10">
                    <div className="relative flex-1">
                      {isMissionLocked ? (
                        <div className="w-full h-full min-h-[150px] bg-black/40 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-300/90 font-mono leading-relaxed terminal-text whitespace-pre-wrap">
                          {missionInput}
                        </div>
                      ) : (
                        <textarea
                          value={missionInput}
                          onChange={(e) => setMissionInput(e.target.value)}
                          placeholder="1. Wichtigstes To-Do...&#10;2. Optionales To-Do...&#10;3. Vorbereitung für..."
                          className="w-full h-full min-h-[150px] bg-slate-950/50 border border-sky-500/30 rounded-xl p-4 text-xs text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-sky-500/60 transition-colors resize-none font-mono"
                        />
                      )}
                      
                      {!isMissionLocked && (
                        <div className="absolute bottom-3 right-3">
                          <div className="px-2 py-1 bg-slate-900/80 border border-slate-800 rounded text-[8px] text-slate-500 uppercase tracking-widest">
                            Draft Mode
                          </div>
                        </div>
                      )}
                      
                      {isMissionLocked && todaysMission && (
                        <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                          <button 
                            onClick={handleDeleteMission}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Mission löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <div className="px-2 py-1 bg-emerald-900/40 border border-emerald-500/30 rounded text-[8px] text-emerald-400 uppercase tracking-widest font-mono">
                            Locked: {new Date(todaysMission.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isMissionLocked && (
                      <button
                        onClick={handleLogMission}
                        disabled={isLoggingMission || !missionInput.trim()}
                        className={cn(
                          "w-full py-3 rounded-xl flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
                          missionInput.trim() 
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30" 
                            : "bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed"
                        )}
                      >
                        {isLoggingMission ? (
                          <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        <span>Mission Einloggen</span>
                      </button>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Bottom Board */}
          <div className="p-6 flex-1">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center">
              <Target className="w-5 h-5 mr-2 text-accent" /> Die G.C. Method (Impact-Filter)
            </h2>
            <p className="text-sm text-slate-400 mb-6 max-w-3xl">
              Konzentriere dich auf die Game Changer (8-10) für den 80/20-Fokus. Noise (1-3) wird automatisch als "erledigt/ignoriert" markiert.
            </p>

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
                      return <BoardCard key={item.id} item={item} pillar={pillar} onDelete={handleDeleteSeed} />;
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
                      return <BoardCard key={item.id} item={item} pillar={pillar} onDelete={handleDeleteSeed} />;
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
                      return <BoardCard key={item.id} item={item} pillar={pillar} onDelete={handleDeleteSeed} />;
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
      </main>
    </div>
  );
}

interface BoardCardProps {
  item: AnalyzedItem;
  pillar: Pillar;
  onDelete: (item: AnalyzedItem) => void;
  key?: string | number;
}

function BoardCard({ item, pillar, onDelete }: BoardCardProps) {
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
        "p-4 rounded-2xl border transition-all relative overflow-hidden group backdrop-blur-md",
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
              <span 
                className="text-[9px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-slate-400"
              >
                {vault.icon} {vault.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
      <p className="text-sm leading-relaxed font-medium tracking-tight">{item.text}</p>
      {isGC && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-primary font-bold uppercase tracking-wider flex items-center">
            <ArrowRight className="w-3 h-3 mr-1" /> Action-Plan bereit
          </p>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      )}
    </motion.div>
  );
}
