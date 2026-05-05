import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Monitor, Terminal, FolderPlus, Github, HardDrive, Cpu, ExternalLink, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { cn } from '../lib/utils';

export default function DesktopView() {
  const [isLocal, setIsLocal] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<'offline' | 'searching' | 'connected'>('offline');

  // Check if we are running on localhost
  useEffect(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setIsLocal(true);
    }
  }, []);

  const steps = [
    {
      title: "GitHub Export",
      desc: "Exportiere diesen DT via Settings -> Export to GitHub.",
      icon: <Github className="w-4 h-4" />
    },
    {
      title: "VS Code & Cloud Code",
      desc: "Öffne den Ordner. Cloud Code übernimmt die KI-Assistenz lokal.",
      icon: <Terminal className="w-4 h-4" />
    },
    {
      title: "Native Desktop App",
      desc: "Chrome -> Menü -> 'DT installieren' für echtes App-Feeling.",
      icon: <Monitor className="w-4 h-4" />
    }
  ];

  const handleCreateFolder = async () => {
    alert("Befehl gesendet: Erstelle Projekt-Ordner 'DT_App_Draft' auf Desktop...");
    // Hier würde der Fetch an den lokalen Node-Proxy gehen
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0b] p-6 lg:p-12 text-zinc-100">
      <div className="max-w-[1000px] mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-zinc-900">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-bold text-blue-400 uppercase tracking-widest">
              Level 2: Native Integration
            </div>
            <h1 className="text-4xl font-black tracking-tight uppercase">Desktop <span className="text-blue-500">Bridge</span></h1>
            <p className="text-zinc-500 font-light max-w-xl">
              Verbinde deinen Cloud-DT mit deiner lokalen Maschine, um direkt auf dem Dateisystem zu arbeiten.
            </p>
          </div>

          <div className={cn(
            "p-4 rounded-2xl border flex items-center gap-4 transition-all",
            bridgeStatus === 'connected' ? "bg-green-500/5 border-green-500/20" : "bg-zinc-900 border-zinc-800"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full",
              bridgeStatus === 'connected' ? "bg-green-500 animate-pulse" : "bg-zinc-700"
            )} />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Local Bridge Agent</span>
              <span className="text-xs font-bold">{bridgeStatus === 'connected' ? "CONNECTED" : "OFFLINE / DISCONNECTED"}</span>
            </div>
          </div>
        </div>

        {/* Quick Setup Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-4 hover:border-blue-500/30 transition-all group">
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                {step.icon}
              </div>
              <h3 className="font-bold text-sm text-zinc-200">{step.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Control Center */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* File System Actions */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-500" />
              Automatisierung (PC)
            </h2>
            
            <div className="space-y-3">
              <button 
                onClick={handleCreateFolder}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between hover:border-blue-500/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center">
                    <FolderPlus className="w-5 h-5 text-zinc-400 group-hover:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">App-Ordner anlegen</div>
                    <div className="text-[10px] text-zinc-600 font-mono">C:/Users/DT/Projects/New_Idea</div>
                  </div>
                </div>
                <Play className="w-4 h-4 text-zinc-700 group-hover:text-blue-500" />
              </button>

              <button className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Python Script Run</div>
                    <div className="text-[10px] text-zinc-600 font-mono">Launch Data Extractor</div>
                  </div>
                </div>
                <Lock className="w-4 h-4 text-zinc-700" />
              </button>
            </div>
          </div>

          {/* Cloud Code Integration Info */}
          <div className="bg-gradient-to-br from-blue-600/5 to-zinc-900 border border-blue-500/10 rounded-3xl p-8 space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" />
              Cloud Code & Hermes
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sobald du die App lokal startest, kannst du Cloud Code nutzen, um die API-Endpunkte für dein Dateisystem freizuschalten.
                </p>
              </div>
              <div className="flex gap-4 text-zinc-500 italic text-[11px] bg-zinc-950/50 p-4 rounded-xl font-mono">
                "Der schnellste Weg ist, den AI Studio Link direkt in VS Code als Remote Source zu nutzen oder den Download-Button für das ganze Repo zu drücken."
              </div>
              
              <button 
                onClick={() => window.open('https://ais-dev-vvhmepok5wxji7ci5ex2dw-84833132768.europe-west2.run.app')}
                className="flex items-center gap-2 text-xs text-blue-400 font-bold hover:underline pt-4"
              >
                Dokumentation: Local Sync Setup <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Warning / Indicator */}
        {!isLocal && (
          <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-200/70 font-light leading-relaxed">
              Du befindest dich gerade in der <span className="font-bold">Cloud-Preview</span>. Native Dateisystem-Aktionen sind hier blockiert. 
              Um Ordner auf deinem PC anzulegen, führe den DT lokal aus (npm run dev) und starte den <span className="font-mono text-zinc-100">bridge-server.js</span>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
