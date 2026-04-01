import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Search, 
  Send, 
  Loader2, 
  Database, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Play,
  History,
  Trash2,
  Upload,
  X,
  FileVideo
} from 'lucide-react';
import { videoAnalysisService } from '../services/videoAnalysisService';
import { surrealService } from '../services/surrealService';
import { cn } from '../lib/utils';

interface VideoSeed {
  id: string;
  url: string;
  question: string;
  answer: string;
  timestamp: number;
  status: string;
}

interface VideoAnalystProps {
  initialUrl?: string;
  initialPrompt?: string;
  autoAnalyze?: boolean;
}

export const VideoAnalyst: React.FC<VideoAnalystProps> = ({ 
  initialUrl = '', 
  initialPrompt = '',
  autoAnalyze = false 
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState(initialUrl);
  const [userPrompt, setUserPrompt] = useState(initialPrompt);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<VideoSeed[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [showShareConfirmation, setShowShareConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
    if (autoAnalyze && initialUrl && initialPrompt) {
      handleAnalyze();
    }
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit for demo
        setError("Die Datei ist zu groß (max. 20MB).");
        return;
      }
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setVideoBase64(base64String);
        addLog(`Video-Datei geladen: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setVideoFile(null);
    setVideoBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadHistory = async () => {
    try {
      const seeds = await surrealService.getVideoSeeds();
      setHistory(seeds);
    } catch (err) {
      console.error("Failed to load video seeds:", err);
    }
  };

  const handleAnalyze = async () => {
    if (!videoBase64 && !youtubeUrl) {
      setError("Bitte gib eine YouTube-URL ein oder lade ein Video hoch.");
      return;
    }
    if (!userPrompt) {
      setError("Bitte gib eine Frage ein.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setSuccess(false);
    setLogs([]);
    addLog("Starte Analyse-Prozess...");

    try {
      const result = await videoAnalysisService.analyzeVideo(youtubeUrl, userPrompt, addLog, videoBase64 || undefined);
      setAnalysisResult(result);

      addLog("Speichere Ergebnis in SurrealDB...");
      // Save to SurrealDB
      const videoSeed = {
        id: `video_seeds:${Date.now()}`,
        url: videoFile ? `FILE:${videoFile.name}` : youtubeUrl,
        question: userPrompt,
        answer: result,
        timestamp: Date.now(),
        status: 'EINGEFANGEN'
      };

      await surrealService.saveVideoSeed(videoSeed);
      addLog("Erfolgreich gespeichert.");
      setSuccess(true);
      loadHistory();

      if (autoAnalyze) {
        setShowShareConfirmation(true);
        setTimeout(() => {
          // Attempt to close window, or at least show it's done
          addLog("Analyse abgeschlossen. Du kannst das Fenster jetzt schließen.");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist bei der Analyse aufgetreten.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full bg-slate-950/40 backdrop-blur-md rounded-3xl border border-white/5">
      {/* Share Target Overlay */}
      <AnimatePresence>
        {showShareConfirmation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md space-y-6"
            >
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Link Gefangen!</h2>
              <p className="text-slate-400 font-medium leading-relaxed">
                Der YouTube-Link wurde erfolgreich in deinem Digital Twin "gefangen" und analysiert.
              </p>
              <div className="pt-8">
                <button 
                  onClick={() => window.close()}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-[0.3em] transition-all"
                >
                  Fenster Schließen
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest animate-pulse">
                Schließt automatisch in 2 Sekunden...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/20">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
            <Youtube className="w-8 h-8 text-red-500" /> 
            VIDEO ANALYST
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Multimodale Video-Tiefenanalyse (Gemini 3 Flash)
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Input Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Input Section */}
            <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">Live Multimodal Engine Aktiv</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">YouTube URL</label>
                  <div className="relative group">
                    <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-red-500 transition-colors" />
                    <input 
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      disabled={!!videoFile}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all disabled:opacity-30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Oder Video-Datei (max. 20MB)</label>
                  <div 
                    onClick={() => !videoFile && fileInputRef.current?.click()}
                    className={cn(
                      "relative group border-2 border-dashed rounded-2xl py-3.5 px-4 flex items-center justify-center gap-3 transition-all cursor-pointer",
                      videoFile 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-white/10 bg-slate-900/50 hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="video/*"
                      className="hidden"
                    />
                    {videoFile ? (
                      <>
                        <FileVideo className="w-5 h-5 text-primary" />
                        <span className="text-xs text-white font-bold truncate max-w-[150px]">{videoFile.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(); }}
                          className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-400 hover:text-white" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
                        <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">Video hochladen</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Analyse-Prompt</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <textarea 
                    placeholder="Was wird bei 03:34 gesagt? Welche visuellen Details sind erkennbar?"
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !youtubeUrl || !userPrompt}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3",
                  isAnalyzing 
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : "bg-primary text-slate-950 hover:bg-emerald-400 active:scale-[0.98] shadow-lg shadow-primary/20"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analysiere Video...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Analysieren
                  </>
                )}
              </button>
            </div>

            {/* System Logs */}
            <AnimatePresence>
              {logs.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden"
                >
                  <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">System Log</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                    </div>
                  </div>
                  <div className="p-4 font-mono text-[10px] space-y-1 max-h-40 overflow-y-auto scrollbar-hide">
                    {logs.map((log, i) => (
                      <div key={i} className={cn(
                        "flex gap-2",
                        log.includes('FEHLER') ? "text-red-400" : "text-primary/60"
                      )}>
                        <span className="opacity-30">[{i+1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error/Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm"
                >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  Analyse erfolgreich abgeschlossen und im Vault gespeichert.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Section */}
            {analysisResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] p-8 rounded-3xl border border-white/5 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Analyse-Ergebnis
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    Status: EINGEFANGEN
                  </span>
                </div>
                <div className="prose prose-invert max-w-none">
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                    {analysisResult}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Sidebar: History */}
        <aside className="hidden xl:flex w-96 border-l border-white/5 flex-col bg-slate-900/10">
          <div className="p-6 border-b border-white/5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <History className="w-3 h-3" /> VERLAUF
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30">
                <Youtube className="w-12 h-12" />
                <p className="text-xs font-bold uppercase tracking-widest">Keine Analysen vorhanden</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-white line-clamp-1 mb-1">{item.question}</p>
                  <p className="text-[9px] text-slate-500 line-clamp-2 leading-relaxed">{item.answer}</p>
                  <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
                    <div className="flex items-center gap-1.5">
                      <Youtube className="w-3 h-3 text-red-500" />
                      <span className="text-[8px] text-slate-500 font-mono truncate max-w-[120px]">{item.url}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
