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
  Sun,
  Moon,
  Download,
  ChevronDown,
  Shuffle,
  Save,
  Volume2,
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
  Sparkles,
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
  Map as MapIcon,
  Network,
  Share2,
  Info,
  MousePointer2 as MouseSquare
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as d3 from 'd3';

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
  isArchived?: boolean;
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

interface MemoryConcept {
  id: string;
  term: string;
  definition: string;
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

const LIBRARY_TYPES = ['Seed', 'Projekt', 'Erkenntnis', 'Mission', 'Workflow'];
const LIBRARY_AREAS = [
  { id: 'health', name: 'Gesundheit', icon: '🌿' },
  { id: 'dev', name: 'Pers. Entwicklung', icon: '📚' },
  { id: 'finance', name: 'Business & Finanzen', icon: '💰' },
  { id: 'mindset', name: 'Mentalität', icon: '🧠' },
  { id: 'islam', name: 'Islam (Sirat)', icon: '🕋' }
];
const LIBRARY_STATUS = ['Aktiv', 'Archiviert', 'Abgeschlossen', 'Blockiert'];
const LIBRARY_IMPACTS = [10, 8, 5, 3];
const LIBRARY_SOURCES = ['Youtube', 'Manual', 'Chat', 'Analysis'];
const LIBRARY_TIME = ['Heute', 'Diese Woche', 'Diesen Monat', 'Älter'];

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

interface MapNode extends d3.SimulationNodeDatum {
  id: string;
  item: AnalyzedItem;
  x?: number;
  y?: number;
}

interface MapLink extends d3.SimulationLinkDatum<MapNode> {
  source: string | MapNode;
  target: string | MapNode;
  strength: number;
  type: string;
}

export default function App() {
  const [activeView, setActiveView] = useState<'kern' | 'vault' | 'map'>('kern');
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'initial',
      sender: 'System',
      text: 'Bereit für deinen Input. Ich bewerte alles auf einer Skala von 1-10 und filtere nach den 5 Säulen.',
      timestamp: Date.now()
    }
  ]);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([
    // Cluster 1: Finance / Business
    { id: 'f1', text: 'E-Commerce Skalierung Strategie', score: 9.5, pillarId: 'finance', vaultId: 'projekte', category: 'GAME CHANGER', timestamp: Date.now() - 100000, status: 'In Arbeit', reasoning: 'Hohes Skalierungspotenzial durch Automatisierung.', nextStep: 'FB Ads Kampagne starten' },
    { id: 'f2', text: 'Cashflow Optimierung für Q3', score: 8.2, pillarId: 'finance', vaultId: 'workflows', category: 'SOLID WORK', timestamp: Date.now() - 200000, status: 'Offen' },
    { id: 'f3', text: 'Investitionsplan Krypto/Aktien', score: 7.8, pillarId: 'finance', vaultId: 'ideen', category: 'SOLID WORK', timestamp: Date.now() - 300000 },
    { id: 'f4', text: 'Steuerberater Termin vorbereiten', score: 5.4, pillarId: 'finance', vaultId: 'erkenntnisse', category: 'NOISE', timestamp: Date.now() - 400000 },
    
    // Cluster 2: Health / Mindset
    { id: 'h1', text: 'Morgenroutine: 5 Uhr Club', score: 9.2, pillarId: 'health', vaultId: 'workflows', category: 'GAME CHANGER', timestamp: Date.now() - 500000, status: 'In Arbeit' },
    { id: 'h2', text: 'Intervallfasten 16:8 Protokoll', score: 8.5, pillarId: 'health', vaultId: 'erkenntnisse', category: 'SOLID WORK', timestamp: Date.now() - 600000 },
    { id: 'h3', text: 'Krafttraining Split-Plan', score: 7.9, pillarId: 'health', vaultId: 'projekte', category: 'SOLID WORK', timestamp: Date.now() - 700000 },
    { id: 'm1', text: 'Stoizismus im Alltag anwenden', score: 8.8, pillarId: 'mindset', vaultId: 'erkenntnisse', category: 'SOLID WORK', timestamp: Date.now() - 800000 },
    
    // Cluster 3: Islam / Dev
    { id: 'i1', text: 'Arabisch Lernen: Level 1', score: 9.0, pillarId: 'islam', vaultId: 'projekte', category: 'GAME CHANGER', timestamp: Date.now() - 900000, status: 'In Arbeit' },
    { id: 'i2', text: 'Tafsir Studium: Sure Al-Baqarah', score: 8.4, pillarId: 'islam', vaultId: 'erkenntnisse', category: 'SOLID WORK', timestamp: Date.now() - 1000000 },
    { id: 'd1', text: 'Deep Work Fokus-Techniken', score: 9.4, pillarId: 'dev', vaultId: 'workflows', category: 'GAME CHANGER', timestamp: Date.now() - 1100000 },
    { id: 'd2', text: 'Bücherliste 2024: Strategie', score: 7.2, pillarId: 'dev', vaultId: 'ideen', category: 'SOLID WORK', timestamp: Date.now() - 1200000 },

    // Connections / Missions
    { id: 'mi1', text: 'Launch Website Projekt', score: 10, pillarId: 'finance', vaultId: 'ziele', category: 'GAME CHANGER', timestamp: Date.now() - 1300000, missionType: 'Bauen', status: 'In Arbeit' },
    { id: 'mi2', text: 'Wöchentlicher Review Prozess', score: 8.1, pillarId: 'dev', vaultId: 'workflows', category: 'SOLID WORK', timestamp: Date.now() - 1400000, missionType: 'Planen' },
    { id: 'w1', text: 'Content Creation Pipeline', score: 8.3, pillarId: 'finance', vaultId: 'workflows', category: 'SOLID WORK', timestamp: Date.now() - 1500000 }
  ]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; msg: string; type: 'success' | 'warn' | 'info' }[]>([]);
  
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

  // Library View State
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryType, setLibraryType] = useState<string | null>(null);
  const [libraryArea, setLibraryArea] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<string | null>(null);
  const [libraryImpact, setLibraryImpact] = useState<number | null>(null);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<AnalyzedItem | null>(null);
  // Map View State
  const [mapMode, setMapMode] = useState<'cluster' | 'network'>('network');
  const [selectedMapNode, setSelectedMapNode] = useState<AnalyzedItem | null>(null);
  const [mapFilters, setMapFilters] = useState({
    types: ['Seed', 'Projekt', 'Erkenntnis', 'Mission', 'Workflow'],
    minImpact: 0,
    area: null as string | null,
    showStrongOnly: false,
    search: '',
    isFocusMode: false
  });

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [showMapOnboarding, setShowMapOnboarding] = useState(true);
  const hasCenteredMap = useRef(false);

  // Memory Core State
  const [memoryConcepts, setMemoryConcepts] = useState<MemoryConcept[]>([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isMemoryInputOpen, setIsMemoryInputOpen] = useState(false);
  const [newConcept, setNewConcept] = useState({ term: '', definition: '' });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [currentMemoryIndex, setCurrentMemoryIndex] = useState(0);

  // Handle Escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMapNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial centering and zoom
  useEffect(() => {
    if (activeView !== 'map') {
      hasCenteredMap.current = false;
      return;
    }

    if (!hasCenteredMap.current && svgRef.current && Object.keys(nodePositions).length > 0) {
      const svg = d3.select(svgRef.current);
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;

      // Find bounds of nodes
      const nodes = Object.values(nodePositions);
      const minX = Math.min(...nodes.map(n => n.x));
      const maxX = Math.max(...nodes.map(n => n.x));
      const minY = Math.min(...nodes.map(n => n.y));
      const maxY = Math.max(...nodes.map(n => n.y));

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const dx = maxX - minX;
      const dy = maxY - minY;

      const scale = Math.min(0.8, 0.9 / Math.max(dx / width, dy / height));
      const translate = [width / 2 - scale * centerX, height / 2 - scale * centerY];

      const transform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale);

      if (zoomBehaviorRef.current) {
        svg.transition().duration(750).call(zoomBehaviorRef.current.transform, transform);
      } else {
        svg.transition().duration(750).call(d3.zoom<SVGSVGElement, unknown>().transform as any, transform);
      }
      hasCenteredMap.current = true;
    }
  }, [activeView, Object.keys(nodePositions).length > 0]);

  const mockRelationships = useMemo(() => {
    const relationships: { source: string; target: string; type: string; strength: number }[] = [];
    if (analyzedItems.length < 2) return [];

    // Create more realistic relationships based on shared keywords or pillars
    analyzedItems.forEach((item, index) => {
      const itemKeywords = item.text.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      
      analyzedItems.forEach((other, otherIndex) => {
        if (index === otherIndex) return;

        let strength = 0;
        let type = 'relates';

        // Check for shared pillar
        if (item.pillarId === other.pillarId) {
          strength += 0.3;
        }

        // Check for shared keywords
        const otherKeywords = other.text.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const sharedKeywords = itemKeywords.filter(k => otherKeywords.includes(k));
        
        if (sharedKeywords.length > 0) {
          strength += Math.min(0.5, sharedKeywords.length * 0.1);
          type = 'supports';
        }

        // Random small chance for unexpected connection
        if (Math.random() > 0.98) {
          strength += 0.2;
          type = 'depends';
        }

        if (strength > 0.4) {
          // Add relationship (avoid duplicates by index comparison)
          if (index < otherIndex) {
            relationships.push({
              source: item.id,
              target: other.id,
              type,
              strength: Math.min(1, strength)
            });
          }
        }
      });
    });

    return relationships;
  }, [analyzedItems]);

  const filteredMapItems = useMemo(() => {
    const baseItems = analyzedItems.filter(item => {
      const matchesType = mapFilters.types.some(t => {
        if (t === 'Seed') return item.vaultId === 'ideen';
        if (t === 'Projekt') return item.vaultId === 'projekte';
        if (t === 'Erkenntnis') return item.vaultId === 'erkenntnisse';
        if (t === 'Mission') return item.vaultId === 'ziele';
        if (t === 'Workflow') return item.vaultId === 'workflows';
        return false;
      });
      const matchesImpact = item.score >= mapFilters.minImpact;
      const matchesArea = !mapFilters.area || item.pillarId === mapFilters.area;
      const matchesSearch = !mapFilters.search || item.text.toLowerCase().includes(mapFilters.search.toLowerCase());
      
      return matchesType && matchesImpact && matchesArea && matchesSearch;
    });

    if (mapFilters.isFocusMode && selectedMapNode) {
      const neighborIds = new Set<string>();
      neighborIds.add(selectedMapNode.id);
      mockRelationships.forEach(rel => {
        if (rel.source === selectedMapNode.id) neighborIds.add(rel.target);
        if (rel.target === selectedMapNode.id) neighborIds.add(rel.source);
      });
      return baseItems.filter(item => neighborIds.has(item.id));
    }

    return baseItems;
  }, [analyzedItems, mapFilters, selectedMapNode, mockRelationships]);

  // Zoom behavior for Map View
  useEffect(() => {
    if (activeView !== 'map' || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    if (!zoomBehaviorRef.current) {
      zoomBehaviorRef.current = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .filter((event) => {
          // Always allow wheel zoom
          if (event.type === 'wheel') return true;
          // Allow panning only on background (not on nodes)
          // This prevents the map from moving when dragging a node
          return !event.target.closest('.node-group');
        })
        .on("zoom", (event) => {
          setZoomTransform(event.transform);
        });
    }

    svg.call(zoomBehaviorRef.current);
    
    // Sync D3's internal state with our current transform
    svg.call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(zoomTransform.x, zoomTransform.y).scale(zoomTransform.k));
  }, [activeView]);

  // Force-directed layout for Map View
  useEffect(() => {
    if (activeView !== 'map' || filteredMapItems.length === 0) return;

    const width = 2000; // Larger virtual space
    const height = 2000;

    const nodes: MapNode[] = filteredMapItems.map(item => {
      // Preserve existing positions if possible to avoid jumps
      const existing = nodePositions[item.id];
      return {
        id: item.id,
        item: item,
        x: existing ? (existing.x / 100) * width : width / 2 + (Math.random() - 0.5) * 200,
        y: existing ? (existing.y / 100) * height : height / 2 + (Math.random() - 0.5) * 200
      };
    });

    const links: MapLink[] = mockRelationships
      .filter(rel => 
        nodes.some(n => n.id === rel.source) && 
        nodes.some(n => n.id === rel.target)
      )
      .map(rel => ({
        source: rel.source,
        target: rel.target,
        strength: rel.strength,
        type: rel.type
      }));

    const simulation = d3.forceSimulation<MapNode>(nodes)
      .force("link", d3.forceLink<MapNode, MapLink>(links).id(d => d.id).distance(200))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80));

    if (mapMode === 'cluster') {
      // Group by pillar in a clear grid or circular layout
      simulation.force("x", d3.forceX().x((d: any) => {
        const node = d as MapNode;
        const pillarIndex = INITIAL_PILLARS.findIndex(p => p.id === node.item.pillarId);
        const angle = (pillarIndex / INITIAL_PILLARS.length) * Math.PI * 2;
        return (width / 2) + Math.cos(angle) * 500;
      }).strength(0.8));
      
      simulation.force("y", d3.forceY().y((d: any) => {
        const node = d as MapNode;
        const pillarIndex = INITIAL_PILLARS.findIndex(p => p.id === node.item.pillarId);
        const angle = (pillarIndex / INITIAL_PILLARS.length) * Math.PI * 2;
        return (height / 2) + Math.sin(angle) * 500;
      }).strength(0.8));

      simulation.force("link", d3.forceLink<MapNode, MapLink>(links).id(d => d.id).distance(100).strength(0.1));
      simulation.force("charge", d3.forceManyBody().strength(-300));
    } else {
      // Network mode: free relationships
      simulation.force("link", d3.forceLink<MapNode, MapLink>(links).id(d => d.id).distance(250).strength(0.5));
      simulation.force("charge", d3.forceManyBody().strength(-800));
      simulation.force("x", null);
      simulation.force("y", null);
    }

    simulation.on("tick", () => {
      const positions: Record<string, { x: number; y: number }> = {};
      nodes.forEach(node => {
        positions[node.id] = { 
          x: node.x!, 
          y: node.y! 
        };
      });
      setNodePositions(positions);
    });

    // Run simulation
    simulation.alphaMin(0.01);
    
    // Store simulation on window for drag access (simple way for React + D3)
    (window as any).mapSimulation = simulation;
    
    return () => { 
      simulation.stop(); 
      delete (window as any).mapSimulation;
    };
  }, [activeView, filteredMapItems, mockRelationships, mapMode]);

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

  const filteredItems = useMemo(() => {
    // Filter by view (Kern vs Vault)
    const baseItems = analyzedItems.filter(item => 
      activeView === 'vault' ? item.isArchived : !item.isArchived
    );
    
    if (activeView === 'vault') {
      return baseItems.filter(item => {
        const matchesSearch = !librarySearch || 
          item.text.toLowerCase().includes(librarySearch.toLowerCase()) ||
          (item.reasoning && item.reasoning.toLowerCase().includes(librarySearch.toLowerCase()));
        
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
        items: items.filter(i => i.score >= 8 && (Date.now() - i.timestamp > 7 * 24 * 60 * 60 * 1000)),
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
      { name: 'Digital Twin', count: items.filter(i => i.text.toLowerCase().includes('twin')).length },
      { name: 'Automatisierung', count: items.filter(i => i.text.toLowerCase().includes('auto')).length },
      { name: 'Monetarisierung', count: items.filter(i => i.text.toLowerCase().includes('geld') || i.text.toLowerCase().includes('euro')).length },
      { name: 'Islam/Sirat', count: items.filter(i => i.pillarId === 'islam').length },
      { name: 'VayTube', count: items.filter(i => i.text.toLowerCase().includes('tube')).length },
    ].filter(t => t.count > 0).sort((a, b) => b.count - a.count);

    // 2. Forgotten Strong Seeds
    const forgotten = items.filter(i => i.score >= 8 && (Date.now() - i.timestamp > 14 * 24 * 60 * 60 * 1000));

    // 3. Projects without Next Step
    const gapProjects = items.filter(i => i.vaultId === 'projekte' && (!i.nextStep || i.nextStep.toLowerCase() === 'keine'));

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

  const handleNodeDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const simulation = (window as any).mapSimulation;
    if (!simulation) return;

    const node = simulation.nodes().find((n: any) => n.id === id);
    if (!node) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    const onPointerMove = (moveEvent: PointerEvent) => {
      const mx = (moveEvent.clientX - rect.left - zoomTransform.x) / zoomTransform.k;
      const my = (moveEvent.clientY - rect.top - zoomTransform.y) / zoomTransform.k;
      
      node.fx = mx;
      node.fy = my;
      
      simulation.alpha(0.3).restart();
    };

    const onPointerUp = () => {
      node.fx = null;
      node.fy = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, item: AnalyzedItem) => {
    e.stopPropagation();
    if (!svgRef.current) return;
    const pos = nodePositions[item.id];
    if (!pos) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const scale = 1.5; 
    const translate = [width / 2 - scale * pos.x, height / 2 - scale * pos.y];

    const transform = d3.zoomIdentity
      .translate(translate[0], translate[1])
      .scale(scale);

    if (zoomBehaviorRef.current) {
      svg.transition().duration(750).call(zoomBehaviorRef.current.transform, transform);
    } else {
      svg.transition().duration(750).call(d3.zoom<SVGSVGElement, unknown>().transform as any, transform);
    }
    setSelectedMapNode(item);
  };

  const handleEmptySpaceClick = () => {
    setSelectedMapNode(null);
  };

  const handleExpandNode = (nodeId: string) => {
    const newNodeId = `expanded-${Date.now()}`;
    const newNode: AnalyzedItem = {
      id: newNodeId,
      text: `Erweiterte Erkenntnis ${analyzedItems.length + 1}`,
      category: 'SOLID WORK',
      score: Math.random() * 5 + 5,
      pillarId: 'business',
      vaultId: 'erkenntnisse',
      reasoning: 'Automatisch generierte Erweiterung basierend auf dem Fokus-Node.',
      nextStep: 'Diesen neuen Pfad weiter explorieren.',
      timestamp: Date.now()
    };

    setAnalyzedItems(prev => [...prev, newNode]);
    // We'll rely on the useMemo or keyword matching for now, 
    // or we can add a keyword to ensure a connection.
    newNode.text += ` ${analyzedItems.find(i => i.id === nodeId)?.text.split(' ')[0] || ''}`;
  };

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

  const handleAddMemoryConcept = () => {
    if (!newConcept.term.trim() || !newConcept.definition.trim()) return;
    const concept: MemoryConcept = {
      id: Date.now().toString(),
      term: newConcept.term,
      definition: newConcept.definition,
      timestamp: Date.now()
    };
    const updated = [concept, ...memoryConcepts];
    setMemoryConcepts(updated);
    localStorage.setItem('dt_memory_concepts', JSON.stringify(updated));
    setNewConcept({ term: '', definition: '' });
    setIsMemoryInputOpen(false);
    showNotification('Konzept im Memory Core gespeichert!', 'success');
  };

  const handleRemoveMemoryConcept = (id: string) => {
    const updated = memoryConcepts.filter(c => c.id !== id);
    setMemoryConcepts(updated);
    localStorage.setItem('dt_memory_concepts', JSON.stringify(updated));
    if (currentMemoryIndex >= updated.length) {
      setCurrentMemoryIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleSpeakConcept = async (concept: MemoryConcept) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: getEnv('VITE_GEMINI_API_KEY') });
      const prompt = `Sprich den folgenden Begriff und seine Definition klar und deutlich aus: 
      Begriff: ${concept.term}. 
      Definition: ${concept.definition}.`;

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
        const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const buffer = await audioContextRef.current.decodeAudioData(audioData.buffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsSpeaking(false);
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

    const savedMemoryConcepts = localStorage.getItem('dt_memory_concepts');
    if (savedMemoryConcepts) {
      setMemoryConcepts(JSON.parse(savedMemoryConcepts));
    } else {
      // Default concept
      const defaultConcept: MemoryConcept = {
        id: 'default-1',
        term: 'Highlevel Overview',
        definition: 'Eine Methode, um hochkomplexe Systeme auf ihre absolute Essenz herunterzubrechen. Fokus auf das "Was" und "Warum", Ausblenden des "Wie".',
        timestamp: Date.now()
      };
      setMemoryConcepts([defaultConcept]);
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
    
    showNotification(`Seed wieder in den KERN verschoben.`, 'success');
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
    <div className="min-h-screen lg:h-screen flex flex-col bg-dark text-slate-50 font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Top Navigation */}
      <nav className="h-14 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/20 rounded-lg border border-primary/30">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-black text-sm tracking-tighter text-white uppercase">D.T. KERN</span>
          </div>
          
          <div className="flex items-center bg-white/[0.03] rounded-xl p-1 border border-white/5">
            <button 
              onClick={() => setActiveView('kern')}
              className={cn(
                "px-5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'kern' 
                  ? "bg-primary text-slate-900 shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              KERN
            </button>
            <button 
              onClick={() => setActiveView('vault')}
              className={cn(
                "px-5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'vault' 
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              VAULT
            </button>
            <button 
              onClick={() => setActiveView('map')}
              className={cn(
                "px-5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                activeView === 'map' 
                  ? "bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              MAP
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 px-3 py-1.5 bg-white/[0.02] rounded-lg border border-white/5">
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
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-500 hover:text-primary border border-white/5"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'kern' && (
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
                {/* Branding & System Status (Integrated Header) - REMOVED SINCE IT'S IN TOP NAV NOW */}
                
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
                  <Brain className="w-3.5 h-3.5 mr-2 text-primary" /> Memory Core
                </h3>
                <div className="flex items-center gap-2">
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
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-primary transition-all"
                    title="Neues Konzept hinzufügen"
                  >
                    <Plus className="w-3.5 h-3.5" />
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
                    placeholder="Definition / Bedeutung..."
                    rows={2}
                    className="w-full bg-black/20 text-white p-2 rounded-lg border border-white/5 focus:border-primary/50 outline-none text-xs resize-none"
                  />
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
                      Concept {currentMemoryIndex + 1}/{memoryConcepts.length}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-white mb-2 tracking-tight">
                    {memoryConcepts[currentMemoryIndex].term}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    "{memoryConcepts[currentMemoryIndex].definition}"
                  </p>

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
                          onRestoreFromVault={handleRestoreFromVault}
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
                          onRestoreFromVault={handleRestoreFromVault}
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
                          onRestoreFromVault={handleRestoreFromVault}
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
          </section>
        </motion.div>
      )}

        {activeView === 'vault' && (
          <motion.div 
              key="vault"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col overflow-hidden h-full bg-slate-950/40 backdrop-blur-md rounded-3xl border border-white/5"
            >
              {/* Library Header */}
              <div className="px-8 py-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/20">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
                    <Database className="w-8 h-8 text-primary" /> 
                    KNOWLEDGE LIBRARY
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Zentraler Wissensraum & Strategisches Archiv
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      placeholder="Wissen durchsuchen..."
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      className="bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 w-64 transition-all"
                    />
                  </div>
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

              {/* Library Grid Layout */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* 1. LEFT COLUMN: FILTERS */}
                <aside className="w-72 border-r border-white/5 flex flex-col bg-slate-900/10">
                  <div className="p-6 overflow-y-auto space-y-8 scrollbar-hide">
                    
                    {/* Filter: Typ */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Layout className="w-3 h-3" /> TYP
                      </h4>
                      <div className="space-y-1">
                        {LIBRARY_TYPES.map(type => (
                          <button
                            key={type}
                            onClick={() => setLibraryType(libraryType === type ? null : type)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group",
                              libraryType === type ? "bg-primary/20 text-primary border border-primary/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
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
                            onClick={() => setLibraryArea(libraryArea === area.id ? null : area.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-3 group",
                              libraryArea === area.id ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
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
                              libraryStatus === status ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
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
                            onClick={() => setSelectedFilterId(selectedFilterId === v.id ? null : v.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-3 group",
                              selectedFilterId === v.id ? "bg-white/10 text-white border border-white/20" : "text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent"
                            )}
                          >
                            <span>{v.icon}</span>
                            <span className="flex-1">{v.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>

                {/* 2. MIDDLE COLUMN: SMART LIST */}
                <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/20">
                  <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
                    
                    {/* KNOWLEDGE PRESSURE PANEL */}
                    {knowledgePressure && (
                      <section className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Zap className="w-3 h-3 text-primary" /> Knowledge Pressure Panel
                          </h3>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                            Strategischer Lagebericht • {new Date().toLocaleDateString('de-DE')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* 1. Recurring Themes */}
                          <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-primary/20 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-3 h-3 text-indigo-400" /> Themen-Druck
                              </h4>
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-bold">AKTIV</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {knowledgePressure.themes.length > 0 ? (
                                knowledgePressure.themes.map(theme => (
                                  <button 
                                    key={theme.name}
                                    onClick={() => setLibrarySearch(theme.name)}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 hover:bg-primary/20 hover:text-primary hover:border-primary/20 transition-all"
                                  >
                                    {theme.name} <span className="text-slate-500 ml-1">{theme.count}</span>
                                  </button>
                                ))
                              ) : (
                                <p className="text-[10px] text-slate-600 italic">Keine klaren Muster gefunden</p>
                              )}
                            </div>
                          </div>

                          {/* 2. Forgotten Strong Seeds */}
                          <div className={cn(
                            "p-5 rounded-2xl border transition-all group",
                            knowledgePressure.forgotten.length > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-slate-900/40 border-white/5"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-amber-400" /> Brachliegendes Potenzial
                              </h4>
                              {knowledgePressure.forgotten.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold animate-pulse">DRUCK</span>
                              )}
                            </div>
                            {knowledgePressure.forgotten.length > 0 ? (
                              <div className="space-y-3">
                                <p className="text-[10px] text-slate-300 font-medium line-clamp-2">
                                  {knowledgePressure.forgotten[0].text}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-amber-400/60 uppercase">
                                    Seit {Math.floor((Date.now() - knowledgePressure.forgotten[0].timestamp) / (24 * 60 * 60 * 1000))} Tagen still
                                  </span>
                                  <button 
                                    onClick={() => setSelectedLibraryItem(knowledgePressure.forgotten[0])}
                                    className="text-[9px] font-black text-white uppercase tracking-widest hover:text-primary transition-colors"
                                  >
                                    Prüfen
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-600 italic">Alle starken Seeds sind aktuell</p>
                            )}
                          </div>

                          {/* 3. Projects without Next Step */}
                          <div className={cn(
                            "p-5 rounded-2xl border transition-all group",
                            knowledgePressure.gapProjects.length > 0 ? "bg-red-500/5 border-red-500/20" : "bg-slate-900/40 border-white/5"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Target className="w-3 h-3 text-red-400" /> Strategische Lücken
                              </h4>
                              {knowledgePressure.gapProjects.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-bold">KRITISCH</span>
                              )}
                            </div>
                            {knowledgePressure.gapProjects.length > 0 ? (
                              <div className="space-y-3">
                                <p className="text-[10px] text-slate-300 font-medium">
                                  {knowledgePressure.gapProjects.length} Projekte ohne nächsten Schritt
                                </p>
                                <button 
                                  onClick={() => {
                                    setLibraryType('Projekt');
                                    setLibraryStatus('Offen');
                                  }}
                                  className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                >
                                  Lücken schließen
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-600 italic">Alle Projekte haben klare Ziele</p>
                            )}
                          </div>

                          {/* 4. Insights without Application */}
                          <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-emerald-500/20 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Lightbulb className="w-3 h-3 text-emerald-400" /> Unausgeschöpfte Erkenntnisse
                              </h4>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-bold">
                                {knowledgePressure.unusedInsights.length} OFFEN
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                              Erkenntnisse ohne Zuordnung zu Missionen oder Projekten.
                            </p>
                            <button 
                              onClick={() => setLibraryType('Erkenntnis')}
                              className="text-[9px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors flex items-center gap-2"
                            >
                              Anwendung finden <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* 5. Similar Seeds */}
                          <div className={cn(
                            "p-5 rounded-2xl border transition-all group",
                            knowledgePressure.similarCount > 0 ? "bg-indigo-500/5 border-indigo-500/20" : "bg-slate-900/40 border-white/5"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Link className="w-3 h-3 text-indigo-400" /> Redundanz-Check
                              </h4>
                            </div>
                            {knowledgePressure.similarCount > 0 ? (
                              <div className="space-y-3">
                                <p className="text-[10px] text-slate-300 font-medium">
                                  {knowledgePressure.similarCount} thematisch ähnliche Seeds gefunden
                                </p>
                                <button 
                                  className="w-full py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
                                >
                                  Zusammenführen
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-600 italic">Keine Redundanzen erkannt</p>
                            )}
                          </div>

                          {/* 6. Chaos Clusters */}
                          <div className={cn(
                            "p-5 rounded-2xl border transition-all group",
                            knowledgePressure.chaosArea ? "bg-primary/5 border-primary/20" : "bg-slate-900/40 border-white/5"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Layout className="w-3 h-3 text-primary" /> Chaos-Haufen
                              </h4>
                            </div>
                            {knowledgePressure.chaosArea ? (
                              <div className="space-y-3">
                                <p className="text-[10px] text-slate-300 font-medium">
                                  Hohe Dichte im Bereich <span className="text-primary">{knowledgePressure.chaosArea.name}</span>
                                </p>
                                <p className="text-[9px] text-slate-500 leading-relaxed">
                                  Viele Einträge, aber schwache Struktur. Potenzial für Clustern.
                                </p>
                                <button 
                                  onClick={() => setLibraryArea(knowledgePressure.chaosArea!.id)}
                                  className="text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors"
                                >
                                  Strukturieren
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-600 italic">Wissensstruktur ist stabil</p>
                            )}
                          </div>
                        </div>
                      </section>
                    )}

                    {librarySections.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12">
                        <div className="w-20 h-20 bg-slate-900/50 rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                          <Search className="w-10 h-10 text-slate-700" />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">Keine Treffer in der Library</h3>
                        <p className="text-sm text-slate-500 max-w-xs mt-3 leading-relaxed">
                          Passe deine Filter an oder suche nach anderen Begriffen, um verborgenes Wissen zu finden.
                        </p>
                        <button 
                          onClick={() => {
                            setLibrarySearch('');
                            setLibraryType(null);
                            setLibraryArea(null);
                            setLibraryStatus(null);
                            setLibraryImpact(null);
                            setSelectedFilterId(null);
                          }}
                          className="mt-8 px-6 py-2.5 bg-primary text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                        >
                          Alle Filter zurücksetzen
                        </button>
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
                          
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <AnimatePresence mode="popLayout">
                              {section.items.map(item => {
                                const pillar = pillars.find(p => p.id === item.pillarId) || INITIAL_PILLARS[0];
                                const isSelected = selectedLibraryItem?.id === item.id;
                                return (
                                  <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => setSelectedLibraryItem(item)}
                                    className={cn(
                                      "p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                                      isSelected 
                                        ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5" 
                                        : "bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-900/60"
                                    )}
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">{pillar.icon}</span>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            {pillar.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter",
                                            item.category === 'GAME CHANGER' ? "bg-primary text-slate-900" : "bg-white/10 text-slate-400"
                                          )}>
                                            {item.category}
                                          </span>
                                          <span className="text-[8px] font-mono text-slate-600">
                                            {new Date(item.timestamp).toLocaleDateString('de-DE')}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-xl font-black font-mono text-primary/40 group-hover:text-primary transition-colors">
                                        {item.score.toFixed(1)}
                                      </div>
                                    </div>
                                    
                                    <h4 className="text-sm font-bold text-white leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                      {item.text}
                                    </h4>
                                    
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                      <div className="flex items-center gap-3">
                                        {item.status && (
                                          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase">
                                            <div className={cn(
                                              "w-1.5 h-1.5 rounded-full",
                                              item.status === 'In Arbeit' ? "bg-primary animate-pulse" : 
                                              item.status === 'Blockiert' ? "bg-red-500" : "bg-slate-600"
                                            )} />
                                            {item.status}
                                          </span>
                                        )}
                                      </div>
                                      <ChevronRight className={cn(
                                        "w-4 h-4 text-slate-700 transition-all",
                                        isSelected ? "text-primary translate-x-1" : "group-hover:text-slate-400 group-hover:translate-x-1"
                                      )} />
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        </section>
                      ))
                    )}
                  </div>
                </main>

                {/* 3. RIGHT COLUMN: DETAIL VIEW */}
                <aside className="w-96 border-l border-white/5 bg-slate-900/10 flex flex-col overflow-hidden">
                  <AnimatePresence mode="wait">
                    {selectedLibraryItem ? (
                      <motion.div 
                        key={selectedLibraryItem.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex-1 flex flex-col overflow-y-auto p-8 scrollbar-hide"
                      >
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-6">
                            <button 
                              onClick={() => setSelectedLibraryItem(null)}
                              className="p-2 rounded-xl hover:bg-white/5 text-slate-500 transition-all"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleRestoreFromVault(selectedLibraryItem)}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
                                title="Wiederherstellen"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteSeed(selectedLibraryItem)}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-400/30 transition-all"
                                title="Löschen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Original-Input</h4>
                              <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/5 text-sm leading-relaxed text-white font-medium">
                                {selectedLibraryItem.text}
                              </div>
                            </div>

                            {selectedLibraryItem.reasoning && (
                              <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Strategische Analyse</h4>
                                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 text-xs leading-relaxed text-slate-300 italic">
                                  {selectedLibraryItem.reasoning}
                                </div>
                              </div>
                            )}

                            {selectedLibraryItem.nextStep && (
                              <div>
                                <h4 className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-3">Nächster Schritt</h4>
                                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs font-bold text-emerald-400 flex items-center gap-3">
                                  <ArrowRight className="w-4 h-4 shrink-0" />
                                  {selectedLibraryItem.nextStep}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-4">
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                <span className="block text-[9px] font-black text-slate-500 uppercase mb-1">Impact</span>
                                <span className="text-xl font-black text-primary font-mono">{selectedLibraryItem.score.toFixed(1)}</span>
                              </div>
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                <span className="block text-[9px] font-black text-slate-500 uppercase mb-1">Status</span>
                                <span className="text-[10px] font-black text-white uppercase">{selectedLibraryItem.status || 'Archiviert'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto space-y-3 pt-8 border-t border-white/5">
                          <button 
                            onClick={() => handleTakeToMission(selectedLibraryItem)}
                            className="w-full py-4 bg-primary text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-primary/10"
                          >
                            <Rocket className="w-4 h-4" />
                            In Mission ziehen
                          </button>
                          <button 
                            onClick={() => handlePinItem(selectedLibraryItem.text, 'intel', 'Analyse')}
                            className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                          >
                            <Pin className="w-4 h-4" />
                            Ans Billboard pinnen
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
                          <FileText className="w-8 h-8 text-slate-700" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                          Wähle einen Eintrag aus,<br />um Details zu sehen
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </aside>
              </div>
            </motion.div>
          )}

          {activeView === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col overflow-hidden h-full bg-slate-950/40 backdrop-blur-md rounded-3xl border border-white/5"
            >
              <div className="flex-1 flex overflow-hidden relative">
                {/* Map Control Panel (Left) */}
                <aside className="w-72 border-r border-white/5 bg-slate-900/40 flex flex-col">
                  <div className="p-6 border-b border-white/5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Filter className="w-3 h-3" /> Map-Steuerung
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                        <input 
                          type="text"
                          placeholder="Node suchen..."
                          value={mapFilters.search}
                          onChange={(e) => setMapFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-700 outline-none focus:border-amber-500/50 transition-all"
                        />
                      </div>

                      {/* Mode Toggle */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Ansichts-Modus</label>
                        <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                          <button 
                            onClick={() => setMapMode('network')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                              mapMode === 'network' ? "bg-amber-500 text-slate-900 shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            <Network className="w-3 h-3" /> Network
                          </button>
                          <button 
                            onClick={() => setMapMode('cluster')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                              mapMode === 'cluster' ? "bg-amber-500 text-slate-900 shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            <Layout className="w-3 h-3" /> Cluster
                          </button>
                        </div>
                      </div>

                      {/* Type Filters */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Eintragstypen</label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {['Seed', 'Projekt', 'Erkenntnis', 'Mission', 'Workflow'].map(type => (
                            <button
                              key={type}
                              onClick={() => {
                                setMapFilters(prev => ({
                                  ...prev,
                                  types: prev.types.includes(type) 
                                    ? prev.types.filter(t => t !== type)
                                    : [...prev.types, type]
                                }));
                              }}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-[11px] font-medium",
                                mapFilters.types.includes(type)
                                  ? "bg-white/5 border-white/10 text-white"
                                  : "bg-transparent border-transparent text-slate-600 hover:text-slate-400"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  type === 'Seed' ? "bg-purple-500" :
                                  type === 'Projekt' ? "bg-blue-500" :
                                  type === 'Erkenntnis' ? "bg-amber-500" :
                                  type === 'Mission' ? "bg-red-500" : "bg-emerald-500"
                                )} />
                                {type}
                              </div>
                              {mapFilters.types.includes(type) && <Check className="w-3 h-3 text-amber-500" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Impact Filter */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Min. Impact</label>
                          <span className="text-[10px] font-mono text-amber-500">{mapFilters.minImpact.toFixed(1)}</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={mapFilters.minImpact}
                          onChange={(e) => setMapFilters(prev => ({ ...prev, minImpact: parseFloat(e.target.value) }))}
                          className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>

                      {/* Area Filter */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Säule / Bereich</label>
                        <select 
                          value={mapFilters.area || ''}
                          onChange={(e) => setMapFilters(prev => ({ ...prev, area: e.target.value || null }))}
                          className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-500/50 transition-all"
                        >
                          <option value="">Alle Bereiche</option>
                          {INITIAL_PILLARS.map(p => (
                            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Strong Connections Only */}
                      <button 
                        onClick={() => setMapFilters(prev => ({ ...prev, showStrongOnly: !prev.showStrongOnly }))}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-[11px] font-bold uppercase tracking-wider",
                          mapFilters.showStrongOnly ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-white/5 border-white/10 text-slate-500"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Share2 className="w-3.5 h-3.5" /> Nur starke Verbindungen
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full relative transition-all",
                          mapFilters.showStrongOnly ? "bg-amber-500" : "bg-slate-700"
                        )}>
                          <div className={cn(
                            "absolute top-1 w-2 h-2 bg-white rounded-full transition-all",
                            mapFilters.showStrongOnly ? "left-5" : "left-1"
                          )} />
                        </div>
                      </button>

                      {/* Focus Mode Toggle */}
                      <button 
                        onClick={() => setMapFilters(prev => ({ ...prev, isFocusMode: !prev.isFocusMode }))}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-[11px] font-bold uppercase tracking-wider",
                          mapFilters.isFocusMode ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-white/5 border-white/10 text-slate-500"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5" /> Fokus-Modus (1-Hop)
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full relative transition-all",
                          mapFilters.isFocusMode ? "bg-amber-500" : "bg-slate-700"
                        )}>
                          <div className={cn(
                            "absolute top-1 w-2 h-2 bg-white rounded-full transition-all",
                            mapFilters.isFocusMode ? "left-5" : "left-1"
                          )} />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Onboarding / Info */}
                  <div className="mt-auto p-6 bg-amber-500/5 border-t border-white/5">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Info className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Map Intelligence</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Navigiere durch die strategischen Beziehungen deines Wissens. Cluster zeigen Themenfelder, Linien zeigen Abhängigkeiten.
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Map Visualization Area (Center) */}
                <main 
                  className="flex-1 relative bg-black/40 overflow-hidden cursor-grab active:cursor-grabbing"
                  onClick={handleEmptySpaceClick}
                >
                  {/* Onboarding Overlay */}
                  <AnimatePresence>
                    {showMapOnboarding && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
                            <MouseSquare className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ziehen zum Navigieren</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
                            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mausrad zum Zoomen</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
                            <Target className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Node klicken für Details</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowMapOnboarding(false); }}
                          className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Map Canvas Placeholder / Custom SVG Graph */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {filteredMapItems.length === 0 ? (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 mx-auto border border-dashed border-white/10">
                          <MapIcon className="w-8 h-8 text-slate-700" />
                        </div>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Keine Nodes gefunden</p>
                        <p className="text-[10px] text-slate-700 mt-1">Passe deine Filter an.</p>
                      </div>
                    ) : (
                      <svg 
                        ref={svgRef} 
                        width="100%" 
                        height="100%" 
                        className="absolute inset-0 touch-none outline-none"
                        onClick={handleEmptySpaceClick}
                      >
                        <rect width="100%" height="100%" fill="transparent" />
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="15" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.1)" />
                          </marker>
                        </defs>
                        
                        <g transform={`translate(${zoomTransform.x}, ${zoomTransform.y}) scale(${zoomTransform.k})`}>
                          {/* Render Connections */}
                          {mockRelationships.map((rel, idx) => {
                            const source = filteredMapItems.find(i => i.id === rel.source);
                            const target = filteredMapItems.find(i => i.id === rel.target);
                            if (!source || !target) return null;
                            if (mapFilters.showStrongOnly && rel.strength < 0.6) return null;
 
                            const sPos = nodePositions[source.id];
                            const tPos = nodePositions[target.id];
 
                            if (!sPos || !tPos) return null;

                            const isRelatedToSelected = selectedMapNode && (rel.source === selectedMapNode.id || rel.target === selectedMapNode.id);
 
                            return (
                              <motion.line
                                key={`rel-${idx}`}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ 
                                  pathLength: 1, 
                                  opacity: isRelatedToSelected ? 0.8 : rel.strength * 0.3,
                                  stroke: isRelatedToSelected ? "#f59e0b" : "rgba(255,255,255,0.2)"
                                }}
                                x1={sPos.x}
                                y1={sPos.y}
                                x2={tPos.x}
                                y2={tPos.y}
                                strokeWidth={isRelatedToSelected ? rel.strength * 4 : rel.strength * 2}
                                markerEnd="url(#arrowhead)"
                              />
                            );
                          })}
 
                          {/* Render Nodes as SVG elements for better performance/control */}
                          {filteredMapItems.map((item) => {
                            const pos = nodePositions[item.id];
                            if (!pos) return null;
                            
                            const isSelected = selectedMapNode?.id === item.id;
                            const isNeighbor = selectedMapNode && mockRelationships.some(rel => 
                              (rel.source === selectedMapNode.id && rel.target === item.id) ||
                              (rel.target === selectedMapNode.id && rel.source === item.id)
                            );

                            const type = item.vaultId === 'ideen' ? 'Seed' :
                                         item.vaultId === 'projekte' ? 'Projekt' :
                                         item.vaultId === 'erkenntnisse' ? 'Erkenntnis' :
                                         item.vaultId === 'ziele' ? 'Mission' : 'Workflow';
 
                            return (
                              <motion.g
                                key={item.id}
                                layoutId={item.id}
                                initial={false}
                                animate={{ 
                                  x: pos.x, 
                                  y: pos.y,
                                  opacity: (!selectedMapNode || isSelected || isNeighbor) ? 1 : 0.2
                                }}
                                className="node-group cursor-grab active:cursor-grabbing"
                                onClick={(e) => { e.stopPropagation(); setSelectedMapNode(item); }}
                                onDoubleClick={(e) => handleNodeDoubleClick(e, item)}
                                onPointerDown={(e) => handleNodeDrag(e, item.id)}
                              >
                                <motion.circle
                                  r={isSelected ? 12 : 8}
                                  fill={
                                    type === 'Seed' ? "#8b5cf6" :
                                    type === 'Projekt' ? "#3b82f6" :
                                    type === 'Erkenntnis' ? "#f59e0b" :
                                    type === 'Mission' ? "#ef4444" : "#10b981"
                                  }
                                  stroke={isSelected ? "white" : "rgba(255,255,255,0.1)"}
                                  strokeWidth={isSelected ? 3 : 1}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  whileHover={{ scale: 1.2 }}
                                />
                                {isSelected && (
                                  <motion.circle
                                    r={20}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth={1}
                                    strokeDasharray="4 4"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                  />
                                )}
                                <text
                                  dy={25}
                                  textAnchor="middle"
                                  className="text-[9px] font-bold fill-slate-400 pointer-events-none uppercase tracking-tighter"
                                >
                                  {item.text.substring(0, 15)}...
                                </text>
                              </motion.g>
                            );
                          })}
                        </g>
                      </svg>
                    )}
                  </div>

                  {/* Map Legend (Floating) */}
                  <div className="absolute bottom-6 left-6 flex flex-wrap gap-4 p-4 bg-black/60 backdrop-blur-md border border-white/5 rounded-2xl">
                    {['Seed', 'Projekt', 'Erkenntnis', 'Mission', 'Workflow'].map(type => (
                      <div key={type} className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          type === 'Seed' ? "bg-purple-500" :
                          type === 'Projekt' ? "bg-blue-500" :
                          type === 'Erkenntnis' ? "bg-amber-500" :
                          type === 'Mission' ? "bg-red-500" : "bg-emerald-500"
                        )} />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{type}</span>
                      </div>
                    ))}
                  </div>
                </main>

                {/* Node Detail Panel (Right) */}
                <aside className="w-96 border-l border-white/5 bg-slate-900/60 backdrop-blur-xl flex flex-col">
                  <AnimatePresence mode="wait">
                    {selectedMapNode ? (
                      <motion.div
                        key={selectedMapNode.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex-1 flex flex-col p-8 overflow-y-auto"
                      >
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                                selectedMapNode.vaultId === 'ideen' ? "bg-purple-500/20 text-purple-400" :
                                selectedMapNode.vaultId === 'projekte' ? "bg-blue-500/20 text-blue-400" :
                                selectedMapNode.vaultId === 'erkenntnisse' ? "bg-amber-500/20 text-amber-400" :
                                selectedMapNode.vaultId === 'ziele' ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                              )}>
                                {selectedMapNode.vaultId === 'ideen' ? 'Seed' :
                                 selectedMapNode.vaultId === 'projekte' ? 'Projekt' :
                                 selectedMapNode.vaultId === 'erkenntnisse' ? 'Erkenntnis' :
                                 selectedMapNode.vaultId === 'ziele' ? 'Mission' : 'Workflow'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-600">ID: {selectedMapNode.id.substring(0, 8)}</span>
                            </div>
                            <h2 className="text-xl font-black text-white leading-tight tracking-tight">
                              {selectedMapNode.text}
                            </h2>
                          </div>
                          <button 
                            onClick={() => setSelectedMapNode(null)}
                            className="p-2 text-slate-500 hover:text-white transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-8">
                          {/* Summary / Content */}
                          <div className="space-y-3">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                              <FileText className="w-3 h-3" /> Analyse & Kontext
                            </h3>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                              <p className="text-xs text-slate-300 leading-relaxed italic">
                                "{selectedMapNode.reasoning || 'Keine spezifische Analyse hinterlegt.'}"
                              </p>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Impact</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-amber-500">{selectedMapNode.score.toFixed(1)}</span>
                                <span className="text-[10px] text-slate-600">/ 10</span>
                              </div>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bereich</span>
                              <span className="text-xs font-bold text-slate-200">
                                {INITIAL_PILLARS.find(p => p.id === selectedMapNode.pillarId)?.name || 'Allgemein'}
                              </span>
                            </div>
                          </div>

                          {/* Connections */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Share2 className="w-3 h-3" /> Verbindungen ({mockRelationships.filter(r => r.source === selectedMapNode.id || r.target === selectedMapNode.id).length})
                              </h3>
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => setMapFilters(prev => ({ ...prev, isFocusMode: !prev.isFocusMode }))}
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1",
                                    mapFilters.isFocusMode ? "text-amber-500" : "text-slate-500 hover:text-slate-400"
                                  )}
                                  title={mapFilters.isFocusMode ? "Fokus-Modus deaktivieren" : "Fokus-Modus aktivieren"}
                                >
                                  {mapFilters.isFocusMode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                  Focus
                                </button>
                                <button 
                                  onClick={() => handleExpandNode(selectedMapNode.id)}
                                  className="text-[9px] font-bold text-amber-500 uppercase tracking-widest hover:text-amber-400 transition-colors flex items-center gap-1"
                                  title="Verwandte Nodes laden"
                                >
                                  <Plus className="w-3 h-3" /> Expand
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {mockRelationships
                                .filter(r => r.source === selectedMapNode.id || r.target === selectedMapNode.id)
                                .slice(0, 3)
                                .map((rel, idx) => {
                                  const otherId = rel.source === selectedMapNode.id ? rel.target : rel.source;
                                  const other = analyzedItems.find(i => i.id === otherId);
                                  if (!other) return null;
                                  return (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/5 transition-all cursor-pointer" onClick={() => setSelectedMapNode(other)}>
                                      <div className="flex items-center gap-3">
                                        <div className={cn(
                                          "w-1.5 h-1.5 rounded-full",
                                          other.vaultId === 'ideen' ? "bg-purple-500" : "bg-blue-500"
                                        )} />
                                        <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{other.text}</span>
                                      </div>
                                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter group-hover:text-amber-500 transition-colors">{rel.type}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>

                          {/* Next Steps */}
                          <div className="space-y-3">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Zap className="w-3 h-3 text-amber-500" /> Strategischer Next Step
                            </h3>
                            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                              <p className="text-xs text-amber-200 font-medium leading-relaxed">
                                {selectedMapNode.nextStep || 'Analysiere die nächsten Schritte zur Umsetzung.'}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-4 space-y-3">
                            <button 
                              onClick={() => handleTakeToMission(selectedMapNode)}
                              className="w-full py-4 bg-amber-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-amber-500/10"
                            >
                              <Rocket className="w-4 h-4" />
                              In Mission ziehen
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => handlePinItem(selectedMapNode.text, 'intel', 'Analyse')}
                                className="py-3 bg-white/5 text-white border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                              >
                                <Pin className="w-3.5 h-3.5" /> Billboard
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedLibraryItem(selectedMapNode);
                                  setActiveView('vault');
                                }}
                                className="py-3 bg-white/5 text-white border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                              >
                                <Database className="w-3.5 h-3.5" /> In Vault
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
                          <Share2 className="w-8 h-8 text-slate-700" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                          Wähle einen Node aus,<br />um Beziehungen zu sehen
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

                  <div className="p-6 bg-white/[0.02] border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      <span>Total: {memoryConcepts.length} Konzepte</span>
                      <span className="text-primary/60">Core Status: Optimal</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
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
  onRestoreFromVault: (item: AnalyzedItem) => void;
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
        "p-4 rounded-2xl border transition-all relative group backdrop-blur-md",
        isGC ? "bg-slate-800/40 border-primary/20 shadow-lg shadow-primary/5 hover:border-primary/40 text-white" : 
        isNoise ? "bg-slate-950/20 border-white/5 line-through text-slate-600 opacity-50" :
        "bg-slate-900/30 border-white/5 shadow-sm hover:border-white/10 text-slate-200"
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
          onClick={() => item.isArchived ? onRestoreFromVault(item) : onMoveToVault(item)}
          className={cn(
            "p-1.5 rounded-lg transition-all border flex-shrink-0",
            item.isArchived 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
              : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20"
          )}
          title={item.isArchived ? "Wiederherstellen in KERN" : "In Vault bestätigen"}
        >
          {item.isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
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
