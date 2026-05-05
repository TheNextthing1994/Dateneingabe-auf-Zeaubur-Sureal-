import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Monitor, MessageSquare, Terminal, ChevronUp, ChevronDown, Zap, ShieldAlert } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

interface MiniObserverProps {
  onNewMessage: (msg: string) => void;
}

export default function MiniObserver({ onNewMessage }: MiniObserverProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [logs, setLogs] = useState<string[]>(["SYSTEM: Ready for observation."]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSpeech, setLastSpeech] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  const startWatching = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      
      // Start Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'de-DE';

        recognitionRef.current.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setLastSpeech(prev => (prev + " " + transcript).trim());
        };

        recognitionRef.current.start();
        addLog("VOICE_LINK: Active.");
      }

      setIsWatching(true);
      addLog("SCREEN_LINK: Established.");
      startAnalysisLoop();
    } catch (err) {
      addLog("LINK_ERROR: Access denied.");
      console.error(err);
    }
  };

  const stopWatching = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsWatching(false);
    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    addLog("SYNC: Offline.");
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const startAnalysisLoop = () => {
    analysisIntervalRef.current = setInterval(async () => {
      if (!isWatching || isAnalyzing || !streamRef.current) return;
      
      setIsAnalyzing(true);
      try {
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = 640;
        canvas.height = 360;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

        // Combine screen state and user speech in prompt
        const promptText = `
          Du bist DT_OBSERVER, ein privater, stiller Begleiter.
          DU KANNST NUR ÜBER DEN TICKER SCHREIBEN. KEINE SPRACHE.
          
          KONTEXT:
          - Aktuelle Bildschirmansicht (siehe Bild)
          - Was der User gerade gesagt hat: "${lastSpeech}"

          AUFGABE:
          1. Analysiere Bildschirm + Sprache.
          2. Falls der User dich anspricht, einen Test macht (z.B. "test", "hallo", "check") oder eine Frage stellt, antworte SOFORT und direkt (max 10 Wörter).
          3. Wenn du eine wichtige Information oder einen proaktiven Hinweis siehst, schreibe eine SEHR KURZE Nachricht.
          4. Falls der User "test test" sagt, antworte mit "TEST BESTÄTIGT. SYSTEM BEREIT."
          5. Wenn absolut kein Handlungsbedarf besteht, antworte NUR mit "SKIP".
          
          TONALITÄT: Kern-System-Output, Ernsthaft, Hilfreich.
        `;

        const response = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  data: base64Image,
                  mimeType: 'image/jpeg'
                }
              }
            ]
          }
        });

        const text = response.text || '';
        if (text.trim() !== '' && !text.toUpperCase().includes('SKIP')) {
          onNewMessage(text.trim());
          addLog(`INTEL: ${text.substring(0, 15)}...`);
        }
        
        // Always clear speech after an analysis cycle to prevent double-processing
        setLastSpeech("");

      } catch (err) {
        console.error("Observer Error:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 5000); // Frequency increased to 5 seconds
  };

  return (
    <div className="fixed bottom-12 left-4 z-[110] flex flex-col gap-2">
      <AnimatePresence>
        {!isMinimized && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* HUD Header */}
            <div className="p-3 border-b border-zinc-900 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">DT_OBSERVER</span>
              </div>
              <div className="flex items-center gap-1">
                 {isAnalyzing && <Zap className="w-3 h-3 text-red-500 animate-bounce" />}
                 <button onClick={() => setIsMinimized(true)}><ChevronDown className="w-4 h-4 text-zinc-600 hover:text-white" /></button>
              </div>
            </div>

            {/* Feed View */}
            <div className="flex-1 p-3 space-y-3">
              <div className="aspect-video bg-black rounded-lg border border-zinc-800 flex items-center justify-center relative overflow-hidden">
                {isWatching ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    className="w-full h-full object-cover opacity-60" 
                  />
                ) : (
                  <Eye className="w-8 h-8 text-zinc-800" />
                )}
                
                {!isWatching && (
                  <button 
                    onClick={startWatching}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 hover:bg-black/40 transition-colors group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Monitor className="w-6 h-6 text-zinc-500 group-hover:text-red-500 transition-colors" />
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Connect Stream</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Logs */}
              <div className="space-y-1">
                 {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 items-start opacity-70">
                       <Terminal className="w-2 h-2 text-zinc-700 mt-1 shrink-0" />
                       <span className="text-[9px] font-mono text-zinc-500 leading-tight break-all uppercase">{log}</span>
                    </div>
                 ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-2 bg-zinc-900/30 border-t border-zinc-900 flex gap-2">
               {isWatching && (
                 <button 
                   onClick={stopWatching}
                   className="flex-1 py-1.5 bg-red-600/10 text-red-500 border border-red-500/20 text-[9px] font-bold rounded-lg uppercase tracking-widest hover:bg-red-600/20 transition-all"
                 >
                   Kill Sync
                 </button>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsMinimized(!isMinimized)}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all border",
          isMinimized ? "bg-red-600 border-red-400 text-white translate-y-0" : "bg-black border-zinc-800 text-zinc-500 hover:text-white"
        )}
      >
        {isMinimized ? <ChevronUp className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>

      {/* Hidden helper for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
