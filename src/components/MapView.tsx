/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { 
  Filter, 
  Search, 
  Network, 
  Layout, 
  Check, 
  Share2, 
  Eye, 
  EyeOff, 
  Plus, 
  X, 
  FileText, 
  Zap, 
  Rocket, 
  Pin, 
  Database, 
  Target, 
  RotateCcw, 
  MousePointer2 as MouseSquare, 
  Info,
  Map as MapIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnalyzedItem, MapNode, MapLink, Pillar } from '../types';
import { INITIAL_PILLARS } from '../constants';
import { surrealService } from '../services/surrealService';

interface MapViewProps {
  analyzedItems: AnalyzedItem[];
  handleTakeToMission: (item: AnalyzedItem) => void;
  handlePinItem: (text: string, type: 'intel' | 'blocker', origin: string, expiry: string, nextStep?: string) => void;
  setSelectedLibraryItem: (item: AnalyzedItem | null) => void;
  setActiveView: (view: 'kern' | 'vault' | 'map' | 'live') => void;
  surrealStatus: 'disconnected' | 'connecting' | 'connected';
}

export function MapView({
  analyzedItems,
  handleTakeToMission,
  handlePinItem,
  setSelectedLibraryItem,
  setActiveView,
  surrealStatus
}: MapViewProps) {
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

  const mockRelationships = useMemo(() => {
    const relationships: { source: string; target: string; type: string; strength: number }[] = [];
    if (!analyzedItems || analyzedItems.length < 2) return [];

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

  // Initial centering and zoom
  useEffect(() => {
    if (!hasCenteredMap.current && svgRef.current && nodePositions && Object.keys(nodePositions).length > 0) {
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
  }, [nodePositions && Object.keys(nodePositions).length > 0]);

  // Zoom behavior for Map View
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    if (!zoomBehaviorRef.current) {
      zoomBehaviorRef.current = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .filter((event) => {
          if (event.type === 'wheel') return true;
          return !event.target.closest('.node-group');
        })
        .on("zoom", (event) => {
          setZoomTransform(event.transform);
        });
    }

    svg.call(zoomBehaviorRef.current);
    svg.call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(zoomTransform.x, zoomTransform.y).scale(zoomTransform.k));
  }, []);

  // Force-directed layout for Map View
  useEffect(() => {
    if (filteredMapItems.length === 0) return;

    const width = 2000;
    const height = 2000;

    const nodes: MapNode[] = filteredMapItems.map(item => {
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
      .force("link", d3.forceLink<MapNode, MapLink>(links).id(d => d.id).distance(150).strength(d => d.strength))
      .force("charge", d3.forceManyBody().strength(mapMode === 'cluster' ? -100 : -400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60))
      .on("tick", () => {
        const newPositions: Record<string, { x: number; y: number }> = {};
        nodes.forEach(node => {
          newPositions[node.id] = { 
            x: (node.x! / width) * 100, 
            y: (node.y! / height) * 100 
          };
        });
        setNodePositions(newPositions);
      });

    return () => { simulation.stop(); };
  }, [filteredMapItems, mockRelationships, mapMode]);

  const handleEmptySpaceClick = () => {
    setSelectedMapNode(null);
  };

  const handleNodeDrag = (e: React.PointerEvent, id: string) => {
    const svg = svgRef.current;
    if (!svg) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = nodePositions[id];
    if (!startPos) return;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / zoomTransform.k;
      const dy = (moveEvent.clientY - startY) / zoomTransform.k;
      
      // Convert pixel delta to percentage delta
      const width = svg.clientWidth;
      const height = svg.clientHeight;
      const pdx = (dx / width) * 100;
      const pdy = (dy / height) * 100;

      setNodePositions(prev => ({
        ...prev,
        [id]: { x: startPos.x + pdx, y: startPos.y + pdy }
      }));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, item: AnalyzedItem) => {
    e.stopPropagation();
    handleExpandNode(item.id);
  };

  const handleExpandNode = async (nodeId: string) => {
    if (surrealStatus !== 'connected') return;
    try {
      // In a real app, this would fetch related nodes from SurrealDB
      // For now, we simulate finding "more" connections
      console.log('Expanding node:', nodeId);
    } catch (err) {
      console.error('Error expanding node:', err);
    }
  };

  return (
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
        <aside className="hidden lg:flex w-72 border-r border-white/5 bg-slate-900/40 flex-col">
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
        <aside className="hidden lg:flex w-96 border-l border-white/5 bg-slate-900/60 backdrop-blur-xl flex-col">
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
                        onClick={() => handlePinItem(selectedMapNode.text, 'intel', 'Analyse', 'dauerhaft', selectedMapNode.nextStep)}
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
  );
}
