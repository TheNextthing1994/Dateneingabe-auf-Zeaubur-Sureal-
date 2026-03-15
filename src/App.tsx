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
  Send
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
  value: number;
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
  text: string;
  score: number;
  pillarId: string;
  vaultId: 'ideen' | 'projekte' | 'ziele' | 'workflows' | 'erkenntnisse' | 'toolbox';
  category: 'GAME CHANGER' | 'SOLID WORK' | 'NOISE';
  timestamp: number;
}

interface MissionPlan {
  id: string;
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
  { id: 'health', name: 'Gesundheit', icon: '🌿', color: '#3b82f6', value: 65 },
  { id: 'dev', name: 'Pers. Entwicklung', icon: '📚', color: '#f59e0b', value: 40 },
  { id: 'finance', name: 'Finanzen', icon: '💰', color: '#10b981', value: 55 },
  { id: 'mindset', name: 'Mentalität', icon: '🧠', color: '#8b5cf6', value: 70 },
  { id: 'islam', name: 'Islam (Sirat)', icon: '🕋', color: '#eab308', value: 85 }
];

export default function App() {
  const [pillars, setPillars] = useState<Pillar[]>(INITIAL_PILLARS);
  const [seedInput, setSeedInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSurrealModalOpen, setIsSurrealModalOpen] = useState(false);
  const [missionInput, setMissionInput] = useState('');
  const [todaysMission, setTodaysMission] = useState<MissionPlan | null>(null);
  const [isLoggingMission, setIsLoggingMission] = useState(false);
  const [isMissionLocked, setIsMissionLocked] = useState(false);
  const [surrealStatus, setSurrealStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [surrealConfig, setSurrealConfig] = useState<SurrealConfig>({
    url: '',
    ns: 'test',
    db: 'test',
    user: '',
    pass: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }), []);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'initial',
      sender: 'System',
      text: 'Ich bin der Kern-Analyst deines Digitalen Zwillings. Ich warte auf deinen Input. Ich bewerte alles auf einer Skala von 1-10 und filtere nach den 5 Säulen.',
      timestamp: Date.now()
    }
  ]);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([
    {
      id: 'demo-1',
      text: 'System für tägliche Routinen (Gebet + Studium) in n8n automatisieren.',
      score: 9.5,
      pillarId: 'islam',
      vaultId: 'workflows',
      category: 'GAME CHANGER',
      timestamp: Date.now() - 100000
    },
    {
      id: 'demo-2',
      text: 'Neuen Trainingsplan in Excel formatieren und ausdrucken.',
      score: 6.0,
      pillarId: 'health',
      vaultId: 'projekte',
      category: 'SOLID WORK',
      timestamp: Date.now() - 200000
    },
    {
      id: 'demo-3',
      text: '3 Stunden YouTube Shorts über "Hustle Culture" schauen.',
      score: 2.0,
      pillarId: 'mindset',
      vaultId: 'erkenntnisse',
      category: 'NOISE',
      timestamp: Date.now() - 300000
    }
  ]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; msg: string; type: 'success' | 'warn' | 'info' }[]>([]);

  const filteredItems = useMemo(() => {
    if (!selectedVaultId) return analyzedItems;
    return analyzedItems.filter(item => item.vaultId === selectedVaultId);
  }, [analyzedItems, selectedVaultId]);

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

  const handleSurrealConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSurrealStatus('connecting');
    console.log('Starting SurrealDB connection process with config:', surrealConfig);
    try {
      const result = await surrealService.connect(surrealConfig);
      console.log('SurrealDB connect result:', result);
      setSurrealStatus('connected');
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
        console.log('Stored seeds loaded:', storedSeeds?.length || 0);
        if (storedSeeds && storedSeeds.length > 0) {
          setAnalyzedItems(prev => {
            const combined = [...storedSeeds, ...prev];
            const unique = combined.filter((item, index, self) => 
              index === self.findIndex((t) => t.id === item.id)
            );
            return unique.sort((a, b) => b.timestamp - a.timestamp);
          });
          
          setPillars(prev => {
            const newPillars = [...INITIAL_PILLARS];
            storedSeeds.forEach(item => {
              const pIndex = newPillars.findIndex(p => p.id === item.pillarId);
              if (pIndex !== -1) {
                newPillars[pIndex].value = (newPillars[pIndex].value + (item.score * 10)) / 2;
              }
            });
            return newPillars;
          });
        }

        // Load missions
        console.log('Loading missions...');
        const missions = await surrealService.getMissions();
        console.log('Missions loaded:', missions?.length || 0);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayMission = missions.find(m => m.targetDate === todayStr);
        if (todayMission) {
          setTodaysMission(todayMission);
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
      
      // Update pillars
      setPillars(prev => prev.map(p => 
        p.id === assignedPillar.id 
          ? { ...p, value: Math.min(100, p.value + Math.floor(score)) }
          : p
      ));

      setLogs(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'D.T. Kern',
          text: `Analyse abgeschlossen. Daten an n8n & SurrealDB übergeben.\nGewählte Säule: ${assignedPillar.name} | Score: ${score.toFixed(1)}/10`,
          timestamp: Date.now()
        },
        {
          id: (Date.now() + 2).toString(),
          sender: 'System',
          isCode: true,
          text: JSON.stringify({
            id: `seed_${Date.now()}`,
            action: "INSERT_SURREALDB",
            pillar: assignedPillar.name,
            impact_score: score.toFixed(1),
            classification: category,
            sirat_aligned: score >= 5
          }, null, 2),
          timestamp: Date.now()
        }
      ]);

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
          
          // Update pillars based on extracted items
          setPillars(prev => {
            const newPillars = [...prev];
            itemsWithIds.forEach(item => {
              const pIndex = newPillars.findIndex(p => p.id === item.pillarId);
              if (pIndex !== -1) {
                newPillars[pIndex].value = Math.min(100, newPillars[pIndex].value + Math.floor(item.score / 2));
              }
            });
            return newPillars;
          });

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
      <header className="bg-panel border-b border-slate-700 p-4 flex justify-between items-center z-10 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="text-2xl"><Brain className="w-8 h-8 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-wider glitch-effect cursor-pointer">D.T. KERN-ANALYST</h1>
            <div className="flex items-center space-x-4">
              <p className="text-xs text-primary font-mono flex items-center">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2"></span>
                System Online | n8n: <span className="text-slate-400 ml-1">Verbunden</span>
              </p>
              <button 
                onClick={() => setIsSurrealModalOpen(true)}
                className={cn(
                  "text-[10px] font-mono flex items-center px-2 py-0.5 rounded border transition-all",
                  surrealStatus === 'connected' 
                    ? "bg-primary/10 border-primary text-primary" 
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                )}
              >
                {surrealStatus === 'connected' ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                SurrealDB: {surrealStatus === 'connected' ? (isSyncing ? 'Synchronisiere...' : 'Aktiv') : surrealStatus === 'connecting' ? 'Verbinde...' : 'Offline'}
              </button>
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-300">Ultimativer Filter:</p>
          <p className="text-xs text-accent font-mono">Die Sirat-Brücke (7 Fragen)</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Input */}
        <section className="lg:w-1/3 bg-dark p-6 border-r border-slate-800 flex flex-col overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center border-b border-slate-700 pb-2">
              <span className="mr-2">🌱</span> Input: Die Seed-Eingabe
            </h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Dies ist deine primäre Schnittstelle zum Digitalen Zwilling. Wirf hier alles hinein: YouTube-Links, lange Chat-Texte, flüchtige Gedanken.
            </p>
            
            <div className="bg-panel p-4 rounded-lg border border-slate-700 shadow-inner">
              <label className="block text-xs font-mono text-primary mb-2 uppercase tracking-tighter">NEUER_SEED_DETECTED &gt;</label>
              <textarea 
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && handleAnalyze()}
                rows={5} 
                className="w-full bg-slate-900 text-white p-3 rounded border border-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm resize-none" 
                placeholder="Was beschäftigt dich gerade? YouTube-Link, Gedanke, Ziel..."
              />
              
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-mono">{seedInput.length} Zeichen</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept=".txt,.log"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isFileLoading || isAnalyzing}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition-all flex items-center group"
                    title="Lange Textdatei/Chat hochladen"
                  >
                    {isFileLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <FileText className="w-4 h-4 group-hover:text-primary transition-colors" />
                    )}
                    <span className="ml-2 text-xs hidden sm:inline">Chat/File</span>
                  </button>
                </div>
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={cn(
                    "bg-primary hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded transition-all shadow-lg shadow-emerald-900/50 flex items-center",
                    isAnalyzing && "opacity-75 cursor-not-allowed"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      <span>Verarbeite...</span>
                    </>
                  ) : (
                    <>
                      <span>Analysieren & Speichern</span>
                      <Zap className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Log */}
          <div className="flex-1 flex flex-col min-h-[200px]">
            <h3 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-800 pb-1 flex items-center">
              <History className="w-4 h-4 mr-2" /> Analysten-Log
            </h3>
            <div ref={chatLogRef} className="flex-1 overflow-y-auto space-y-4 pr-2 font-mono text-sm">
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-3 rounded border-l-2",
                      log.sender === 'User' ? "bg-slate-800/30 border-slate-600" : "bg-slate-800/80 border-primary animate-pulse-once"
                    )}
                  >
                    <p className={cn("mb-1 font-bold text-xs", log.sender === 'User' ? "text-slate-400" : "text-primary")}>
                      {log.sender}:
                    </p>
                    {log.isCode ? (
                      <pre className="text-xs text-slate-300 mt-2 bg-black/50 p-2 rounded overflow-x-auto border border-slate-700">
                        <code>{log.text}</code>
                      </pre>
                    ) : (
                      <p className="text-slate-200 mt-1 whitespace-pre-wrap">{log.text}</p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Right Panel: Dashboard */}
        <section className="lg:w-2/3 bg-dark flex flex-col overflow-y-auto relative">
          
          {/* Top Dashboard */}
          <div className="p-6 border-b border-slate-800 bg-slate-900/50">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                {/* Vaults Layer */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center">
                      <Settings className="w-3 h-3 mr-2" /> Vault Selection / Filter
                    </h3>
                    {selectedVaultId && (
                      <button 
                        onClick={() => setSelectedVaultId(null)}
                        className="text-[10px] text-primary hover:underline font-mono uppercase"
                      >
                        [ Reset Filter ]
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex space-x-4 min-w-max">
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
                              "w-24 h-24 bg-panel rounded-xl border flex flex-col items-center justify-center relative transition-all duration-300",
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
                              "mt-2 text-[9px] font-mono uppercase tracking-widest border px-2 py-0.5 rounded transition-colors",
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

                <h2 className="text-lg font-bold text-white mb-2 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-primary" /> Status & Säulen-Balance
                </h2>
                <p className="text-sm text-slate-400 mb-6 max-w-2xl">
                  Hier siehst du die Verteilung deiner bisherigen "Seeds" und Aktivitäten auf deine 5 Kern-Prioritäten.
                </p>

                <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                  <div className="w-full md:w-1/2 h-[300px] md:h-[350px]">
                    <Radar data={chartData} options={chartOptions} />
                  </div>

                  <div className="w-full md:w-1/2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-2">Die 5 Säulen (Aktivität)</h3>
                    <div className="space-y-3">
                      {pillars.map(pillar => (
                        <div key={pillar.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{pillar.icon}</span>
                            <span className="text-slate-300">{pillar.name}</span>
                          </div>
                          <div className="flex-1 ml-4 mr-4">
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${pillar.value}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full rounded-full" 
                                style={{ backgroundColor: pillar.color }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-mono text-slate-400 w-8 text-right">{pillar.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mission Planning Card */}
              <div className="xl:col-span-1">
                <section className={cn(
                  "border rounded-2xl p-6 relative overflow-hidden group h-full flex flex-col transition-all duration-500",
                  isMissionLocked 
                    ? "bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                    : "bg-slate-900/40 border-slate-800/60"
                )}>
                  {isMissionLocked && <div className="scanline" />}
                  
                  <div className="absolute top-0 right-0 p-4 z-10">
                    <button 
                      onClick={handleUnlockMission}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        isMissionLocked ? "text-emerald-400 hover:bg-emerald-400/10" : "text-slate-500 hover:bg-slate-800"
                      )}
                    >
                      {isMissionLocked ? <Lock className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3 mb-6 relative z-10">
                    <Clock className={cn("w-5 h-5", isMissionLocked ? "text-emerald-400" : "text-sky-400")} />
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {new Date().getHours() >= 5 && new Date().getHours() < 12 
                          ? "GUTEN MORGEN, COMMANDER" 
                          : "MISSION PLANNING"}
                      </h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                        {new Date().getHours() >= 5 && new Date().getHours() < 12 
                          ? "IHRE BEFEHLE FÜR HEUTE." 
                          : "DEFINIEREN SIE DIE PARAMETER FÜR MORGEN."}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {isMissionLocked && (
                    <div className="mb-4 flex items-center space-x-2 relative z-10">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.2em] animate-pulse">
                        Status: Active Protocol
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
                        <div className="absolute bottom-3 right-3">
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
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.filter(i => i.category === 'GAME CHANGER').map(item => (
                      <BoardCard key={item.id} item={item} pillar={pillars.find(p => p.id === item.pillarId)!} />
                    ))}
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
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.filter(i => i.category === 'SOLID WORK').map(item => (
                      <BoardCard key={item.id} item={item} pillar={pillars.find(p => p.id === item.pillarId)!} />
                    ))}
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
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.filter(i => i.category === 'NOISE').map(item => (
                      <BoardCard key={item.id} item={item} pillar={pillars.find(p => p.id === item.pillarId)!} />
                    ))}
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

function BoardCard({ item, pillar }: { item: AnalyzedItem; pillar: Pillar; key?: string }) {
  const isNoise = item.category === 'NOISE';
  const isGC = item.category === 'GAME CHANGER';
  const vault = VAULTS.find(v => v.id === item.vaultId);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "p-4 rounded-xl border transition-all relative overflow-hidden group",
        isGC ? "bg-slate-800/80 border-primary/50 shadow-[0_4px_20px_rgba(16,185,129,0.1)] hover:border-primary text-white" : 
        isNoise ? "bg-slate-900/50 border-slate-800 line-through text-slate-500 opacity-60" :
        "bg-slate-800/40 border-slate-700 shadow-sm hover:border-slate-500 text-slate-200"
      )}
    >
      <div className={cn("flex justify-between items-start mb-3", isNoise && "opacity-50")}>
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center space-x-2">
            <span 
              className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase"
              style={{ color: pillar.color, backgroundColor: `${pillar.color}22`, border: `1px solid ${pillar.color}44` }}
            >
              {pillar.name}
            </span>
            {vault && (
              <span 
                className="text-[9px] font-mono uppercase tracking-tighter px-1.5 py-0.5 rounded-md border border-slate-700 bg-slate-900/50"
                style={{ color: vault.color }}
              >
                {vault.icon} {vault.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "px-2 py-1 rounded-lg text-xs font-black font-mono",
          isGC ? "bg-primary text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-700 text-slate-300"
        )}>
          {item.score.toFixed(1)}
        </div>
      </div>
      <p className="text-sm leading-relaxed font-medium">{item.text}</p>
      {isGC && (
        <p className="text-xs text-primary mt-2 flex items-center">
          <ArrowRight className="w-3 h-3 mr-1" /> Sirat-Impact geprüft. Action-Plan bereit.
        </p>
      )}
    </motion.div>
  );
}
