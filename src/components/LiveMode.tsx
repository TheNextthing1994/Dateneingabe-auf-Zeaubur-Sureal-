import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Loader2, 
  Activity, 
  Brain, 
  Zap, 
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel, Type } from "@google/genai";
import { getEnv } from '../env';
import { cn } from '../lib/utils';
import { LiquidMetal } from './LiquidMetal';

interface AnalyzedItem {
  id: string;
  vaultId: string;
  text: string;
  score: number;
  category?: string;
  status?: 'Offen' | 'In Arbeit' | 'Blockiert';
  timestamp: number;
  isArchived?: boolean;
  blockedBy?: string;
  pillarId?: string;
}

interface LiveModeProps {
  analyzedItems: AnalyzedItem[];
  onClose: (transcript?: string[]) => void;
  onSaveTranscript: (transcript: string[]) => void;
  onSaveItem?: (item: Omit<AnalyzedItem, 'id' | 'timestamp'>) => Promise<void>;
  onSaveWeeklyTask?: (text: string) => Promise<void>;
  onMessage?: (sender: 'User' | 'D.T. Kern', text: string) => void;
}

export const LiveMode: React.FC<LiveModeProps> = ({ analyzedItems, onClose, onSaveTranscript, onSaveItem, onSaveWeeklyTask, onMessage }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [connectTimeout, setConnectTimeout] = useState<NodeJS.Timeout | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [fullTranscript, setFullTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isActiveRef = useRef(false);
  const isInterruptedRef = useRef(false);
  const isMutedRef = useRef(false);
  const nextPlayTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const [volume, setVolume] = useState<number[]>(new Array(12).fill(10));

  const stats = React.useMemo(() => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weeklySeeds = (analyzedItems || []).filter(item => item.timestamp > oneWeekAgo);
    
    return {
      total: analyzedItems?.length || 0,
      weekly: weeklySeeds.length,
      inProgress: (analyzedItems || []).filter(i => i.status === 'In Arbeit').length,
      untouched: (analyzedItems || []).filter(i => i.status === 'Offen' && !i.isArchived).length,
      completed: (analyzedItems || []).filter(i => i.isArchived).length
    };
  }, [analyzedItems]);

  // Helper to convert Float32 to PCM16
  const convertFloat32ToPCM16 = (float32Array: Float32Array) => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      pcm16[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32768));
    }
    return pcm16;
  };

  const startSession = async () => {
    setIsStarting(true);
    setStatus('connecting');
    setError(null);
    
    // Set a timeout for connection
    const timeout = setTimeout(() => {
      if (isActiveRef.current === false) {
        setError("Die Verbindung dauert länger als erwartet. Bitte versuchen Sie es erneut.");
        setStatus('error');
        setIsStarting(false);
      }
    }, 15000);
    setConnectTimeout(timeout);
    
    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      if (!apiKey) throw new Error("GEMINI_API_KEY missing");

      const ai = new GoogleGenAI({ apiKey });
      
      // Setup Audio Context for output (24kHz)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      nextPlayTimeRef.current = audioContextRef.current.currentTime;

      // Setup Audio Context for input (16kHz)
      if (!inputContextRef.current) {
        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (inputContextRef.current.state === 'suspended') {
        await inputContextRef.current.resume();
      }

      // Setup Microphone
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Mikrofon-Zugriff wird von diesem Browser nicht unterstützt.");
      }
      
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        });
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error("Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.");
        }
        throw new Error("Mikrofon-Fehler: " + err.message);
      }
      
      const inputSource = inputContextRef.current.createMediaStreamSource(streamRef.current);
      
      // Setup Analyser for visualization
      analyserRef.current = inputContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 32;
      inputSource.connect(analyserRef.current);

      processorRef.current = inputContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        if (isMutedRef.current || !isActiveRef.current || !sessionRef.current) return;
        
        // Update visualization
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const newVolume = Array.from(dataArray).slice(0, 12).map(v => Math.max(10, v / 2));
          setVolume(newVolume);
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = convertFloat32ToPCM16(inputData);
        
        // Robust base64 conversion
        const uint8Array = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Data = btoa(binary);

        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };
      
      inputSource.connect(processorRef.current);
      processorRef.current.connect(inputContextRef.current.destination);

      const gameChangers = analyzedItems
        .filter(i => i.category === 'GAME CHANGER' && !i.isArchived)
        .slice(0, 5)
        .map(i => `• [${i.vaultId.toUpperCase()}] ${i.text.slice(0, 80)} (Score: ${i.score.toFixed(1)}, Status: ${i.status || 'Offen'})`)
        .join('\n');

      const inProgress = analyzedItems
        .filter(i => i.status === 'In Arbeit')
        .slice(0, 5)
        .map(i => `• [${i.vaultId.toUpperCase()}] ${i.text.slice(0, 80)}`)
        .join('\n');

      const untouched = analyzedItems
        .filter(i => i.status === 'Offen' && !i.isArchived)
        .slice(0, 8)
        .map(i => `• [${i.vaultId.toUpperCase()}] ${i.text.slice(0, 80)}`)
        .join('\n');

      const blocked = analyzedItems
        .filter(i => i.status === 'Blockiert')
        .slice(0, 5)
        .map(i => `• ${i.text.slice(0, 80)} ${i.blockedBy ? '— Blockiert durch: ' + i.blockedBy : ''}`)
        .join('\n');

      const systemInstruction = `Du bist D.T. Kern, der strategische digitale Zwilling des Nutzers.
Der Nutzer hat ADHS und verliert oft den Fokus. Deine Aufgabe: ihn durch seine echten Projekte und Ideen führen, konkret und direkt.
Antworte immer auf Deutsch. Halte Antworten kurz (max 20 Sekunden Sprechzeit).

DEINE NEUE FÄHIGKEIT:
Du kannst jetzt Erkenntnisse, Ideen oder Projekte DIREKT in den Vault (SurrealDB) speichern.
Nutze dafür das Tool 'saveToVault', wenn der Nutzer dich darum bittet (z.B. "Kern, speichere das als Game Changer").
Frage im Zweifel nach der Kategorie (GAME CHANGER, SOLID WORK, NOISE) oder der Säule (mindset, business, health, relationships, finances).

DEIN STIL:
- Sei präzise, analytisch und direkt.
- Keine unnötigen Höflichkeitsfloskeln.
- Denke in den 5 Säulen.
- Erinnere den Nutzer an seine Mission und seine Blocker.

=== SEED DATENBANK (STAND JETZT) ===
Gesamt: ${stats.total} Seeds | Diese Woche neu: ${stats.weekly} | Abgeschlossen: ${stats.completed}

🔥 GAME CHANGER (Top-Priorität):
${gameChangers || 'Keine vorhanden'}

🚀 IN ARBEIT:
${inProgress || 'Nichts aktiv'}

🛑 BLOCKIERT:
${blocked || 'Keine Blocker'}

🌱 UNBERÜHRT (vergessene Ideen — hier schlummert Gold):
${untouched || 'Alle Seeds bearbeitet'}

Wenn der Nutzer spricht, beziehe dich immer auf seine ECHTEN Seeds oben.
Nenne sie beim Namen. Sei sein Coach, nicht ein generischer Assistent.`;

      console.log("SystemInstruction length:", systemInstruction.length);

      // Connect to Gemini Live
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "saveToVault",
                  description: "Speichert eine neue Erkenntnis, Idee oder ein Projekt direkt in den Vault (SurrealDB).",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Der Inhalt der Erkenntnis oder des Projekts." },
                      category: { type: Type.STRING, enum: ["GAME CHANGER", "SOLID WORK", "NOISE"], description: "Die Prioritäts-Kategorie." },
                      score: { type: Type.NUMBER, description: "Der Impact-Score (1.0 bis 10.0)." },
                      pillarId: { type: Type.STRING, enum: ["mindset", "business", "health", "relationships", "finances"], description: "Die zugehörige Säule." },
                      vaultId: { type: Type.STRING, enum: ["ideen", "projekte", "ziele", "workflows", "erkenntnisse", "toolbox", "kunden", "academy"], description: "Der Ziel-Vault." }
                    },
                    required: ["text", "category", "score", "pillarId", "vaultId"]
                  }
                },
                {
                  name: "saveWeeklyTask",
                  description: "Speichert eine neue Aufgabe oder ein Ziel für die Woche direkt in die Wochen-Liste (SurrealDB).",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Der Inhalt der Aufgabe/des Ziels." }
                    },
                    required: ["text"]
                  }
                }
              ]
            }
          ],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
          },
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            if (connectTimeout) clearTimeout(connectTimeout);
            setStatus('active');
            setIsStarting(false);
            isActiveRef.current = true;
            console.log("Live session opened");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle tool calls
            if (message.toolCall) {
              const calls = message.toolCall.functionCalls;
              for (const call of calls) {
                if (call.name === "saveToVault") {
                  const args = call.args as any;
                  if (onSaveItem) {
                    try {
                      await onSaveItem({
                        text: args.text,
                        category: args.category,
                        score: args.score,
                        pillarId: args.pillarId,
                        vaultId: args.vaultId || 'erkenntnisse'
                      });
                      
                      // Send response back to model
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { success: true, message: "Erfolgreich im Vault gespeichert." }
                        }]
                      });

                      const line = `System: [Tool] ${args.text} wurde im Vault gespeichert.`;
                      setTranscript(prev => [...prev.slice(-5), line]);
                      setFullTranscript(prev => [...prev, line]);
                    } catch (err) {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { success: false, message: "Fehler beim Speichern im Vault." }
                        }]
                      });
                    }
                  }
                }

                if (call.name === "saveWeeklyTask") {
                  const args = call.args as any;
                  if (onSaveWeeklyTask) {
                    try {
                      await onSaveWeeklyTask(args.text);
                      
                      // Send response back to model
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { success: true, message: "Wochenaufgabe erfolgreich gespeichert." }
                        }]
                      });

                      const line = `System: [Wochenaufgabe] ${args.text} wurde gespeichert.`;
                      setTranscript(prev => [...prev.slice(-5), line]);
                      setFullTranscript(prev => [...prev, line]);
                    } catch (err) {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { success: false, message: "Fehler beim Speichern der Wochenaufgabe." }
                        }]
                      });
                    }
                  }
                }
              }
            }

            // Handle transcriptions
            if (message.serverContent?.modelTurn?.parts) {
              // Reset interruption flag when model starts a new turn part
              // Usually if it's a new turn, we want to play it.
              // If it's the SAME turn that was interrupted, the server should have stopped sending.
              isInterruptedRef.current = false;

              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data && !isInterruptedRef.current) {
                  playAudioChunk(part.inlineData.data);
                }
                if (part.text) {
                  const line = `Kern: ${part.text!}`;
                  setTranscript(prev => [...prev.slice(-5), line]);
                  setFullTranscript(prev => [...prev, line]);
                  if (onMessage) onMessage('D.T. Kern', part.text!);
                }
              }
            }
            
            // Handle user transcription
            const userTranscript = (message.serverContent as any)?.userTurn?.parts?.[0]?.text;
            if (userTranscript) {
              const line = `Du: ${userTranscript}`;
              setTranscript(prev => [...prev.slice(-5), line]);
              setFullTranscript(prev => [...prev, line]);
              if (onMessage) onMessage('User', userTranscript);
              
              // Proactive interruption: if user is speaking, stop model audio
              isInterruptedRef.current = true;
              stopAllAudio();
            }

            if (message.serverContent?.interrupted) {
              isInterruptedRef.current = true;
              stopAllAudio();
            }
          },
          onclose: () => {
            setStatus('idle');
            cleanup();
          },
          onerror: (err) => {
            console.error("Live error:", err);
            setError("Verbindung verloren oder Fehler aufgetreten.");
            setStatus('error');
            isActiveRef.current = false;
          }
        }
      });
      
      sessionRef.current = session;
      
    } catch (err: any) {
      console.error("Failed to start live session:", err);
      setError(err.message || "Fehler beim Starten der Live-Session.");
      setStatus('error');
    }
  };

  const playAudioChunk = (base64Data: string) => {
    if (!audioContextRef.current) return;
    
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pcmData = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) float32Data[i] = pcmData[i] / 32768.0;
      
      const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      
      const startTime = Math.max(audioContextRef.current.currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;
      audioQueueRef.current.push(source);
      
      // Cleanup finished sources
      source.onended = () => {
        audioQueueRef.current = audioQueueRef.current.filter(s => s !== source);
      };
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  };

  const stopAllAudio = () => {
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    audioQueueRef.current = [];
    if (audioContextRef.current) {
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  const isCleaningUpRef = useRef(false);
  const cleanup = () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;
    isActiveRef.current = false;
    
    stopAllAudio();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.error("Error closing AudioContext:", e);
      }
    }

    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      try {
        inputContextRef.current.close();
      } catch (e) {
        console.error("Error closing InputContext:", e);
      }
    }
    
    audioContextRef.current = null;
    inputContextRef.current = null;
    processorRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    sessionRef.current = null;
    isCleaningUpRef.current = false;
    setIsMuted(false);
    isMutedRef.current = false;
    setVolume(new Array(12).fill(10));
  };

  const startAnalysis = () => {
    if (!sessionRef.current || status !== 'active') return;
    
    const analysisPrompt = `D.T. Kern, starte jetzt die wöchentliche Analyse. 
    Gehe die Seeds mit mir durch. Erwähne:
    1. Wie viele neue Ideen (Seeds) diese Woche aufgenommen wurden (${stats.weekly}).
    2. Welche Projekte aktuell "In Arbeit" sind (${stats.inProgress}).
    3. Welche guten Ideen noch "Unberührt" sind (${stats.untouched}) und warum wir sie uns ansehen sollten.
    
    Sei mein Coach und hilf mir, den Fokus zu behalten.`;
    
    sessionRef.current.sendRealtimeInput({
      text: analysisPrompt
    });
  };

  const handleSave = async () => {
    if (fullTranscript.length === 0) return;
    setIsSaving(true);
    try {
      await onSaveTranscript(fullTranscript);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save transcript:", err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
    >
      {/* Background Glow Effect - Truly fixed */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Fixed UI Elements */}
      <button 
        onClick={() => {
          console.log("LiveMode: Closing and returning to kern");
          onClose(fullTranscript);
        }}
        className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all z-[120] border border-white/5 active:scale-95"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Ambient Status Indicators */}
      <div className="absolute top-8 left-8 flex flex-col gap-1 z-20">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-primary animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">System Status</span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-3.5">
          {status === 'active' ? 'Kern Synchronisiert' : status === 'connecting' ? 'Initialisierung...' : 'Bereit für Analyse'}
        </span>
      </div>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-12 z-20 hidden lg:flex">
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Latenz</span>
          <span className="text-[10px] font-mono text-primary/40">24ms</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Signal</span>
          <span className="text-[10px] font-mono text-primary/40">Stabil</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Kern</span>
          <span className="text-[10px] font-mono text-primary/40">Aktiv</span>
        </div>
      </div>

      {/* System Log */}
      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-1 z-20 hidden md:flex">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">System Log</span>
          <div className="w-1 h-1 rounded-full bg-primary/30" />
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[9px] font-mono text-primary/30 uppercase">Core Sync: 98.4%</span>
          <span className="text-[9px] font-mono text-primary/30 uppercase">Neural Paths: Optimized</span>
          <span className="text-[9px] font-mono text-primary/30 uppercase">Memory Core: Ready</span>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="absolute inset-0 overflow-y-auto no-scrollbar flex flex-col items-center sm:justify-center p-6 pt-24 pb-24 lg:pb-12">
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8 text-center px-4 relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-full aspect-square max-w-[400px] sm:max-w-[500px] relative">
            {/* Inner Glow behind the object */}
            <div className="absolute inset-0 bg-emerald-400/20 blur-[60px] rounded-full scale-75 animate-pulse" />
            <LiquidMetal isActive={status === 'active'} />
          </div>
          
          {/* Digital Twin Label */}
          <div className="mt-4 mb-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.8em] ml-[0.8em]">
              Digital Twin
            </span>
          </div>
        </div>

        {status === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-8"
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white/[0.03] p-4 sm:p-5 rounded-[24px] border border-white/5 text-left transition-all hover:bg-white/[0.05]">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Seeds Gesamt</p>
                <p className="text-2xl font-bold text-white mb-1">{stats.total}</p>
                <p className="text-[8px] text-slate-600 font-medium">↑ seit letzter Session</p>
              </div>
              <div className="bg-white/[0.03] p-4 sm:p-5 rounded-[24px] border border-white/5 text-left transition-all hover:bg-white/[0.05]">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Neu (Woche)</p>
                <p className="text-2xl font-bold text-emerald-400 mb-1">{stats.weekly}</p>
                <p className="text-[8px] text-slate-600 font-medium">aktive Pipeline</p>
              </div>
              <div className="bg-white/[0.03] p-4 sm:p-5 rounded-[24px] border border-white/5 text-left transition-all hover:bg-white/[0.05]">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">In Arbeit</p>
                <p className="text-2xl font-bold text-blue-400 mb-1">{stats.inProgress}</p>
                <p className="text-[8px] text-slate-600 font-medium">keine aktiven Seeds</p>
              </div>
              <div className="bg-white/[0.03] p-4 sm:p-5 rounded-[24px] border border-white/5 text-left transition-all hover:bg-white/[0.05]">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Unberührt</p>
                <p className="text-2xl font-bold text-orange-400 mb-1">{stats.untouched}</p>
                <p className="text-[8px] text-slate-600 font-medium">brauchen Aktivierung</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 pt-4">
              <button 
                disabled={isStarting}
                onClick={startSession}
                className="w-full bg-white/[0.02] text-white font-bold py-5 rounded-2xl text-xs sm:text-sm uppercase tracking-[0.4em] border border-white/10 hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
              >
                Mission Starten
              </button>
            </div>
          </motion.div>
        )}

        {status === 'connecting' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 flex flex-col items-center"
          >
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black text-primary uppercase tracking-[0.3em] animate-pulse">Initialisiere Kern...</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Verbindung zum Digitalen Zwilling wird aufgebaut</p>
            </div>
            <button 
              onClick={() => {
                cleanup();
                setStatus('idle');
              }}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
            >
              Abbrechen
            </button>
          </motion.div>
        )}

        {status === 'active' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="h-24 sm:h-32 flex items-center justify-center gap-1">
              {volume.map((v, i) => (
                <motion.div 
                  key={i}
                  animate={{ 
                    height: v * 0.8, // Scale down for mobile
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  className="w-1 sm:w-1.5 bg-primary rounded-full"
                />
              ))}
            </div>

            <button 
              onClick={startAnalysis}
              className="w-full bg-white/5 hover:bg-white/10 text-primary border border-primary/20 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
            >
              Wöchentliche Analyse starten
            </button>

            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <button 
                onClick={() => setShowHistory(true)}
                className={cn(
                  "p-4 rounded-full border transition-all flex items-center justify-center",
                  "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                )}
                title="Gesprächsverlauf anzeigen"
              >
                <Clock className="w-6 h-6" />
              </button>
              <button 
                onClick={() => {
                  const newMuted = !isMuted;
                  setIsMuted(newMuted);
                  isMutedRef.current = newMuted;
                }}
                className={cn(
                  "p-4 rounded-full border transition-all",
                  isMuted ? "bg-red-500/20 border-red-500 text-red-500" : "bg-white/5 border-white/10 text-slate-400"
                )}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button 
                onClick={() => {
                  cleanup();
                  setStatus('idle');
                }}
                className="p-4 bg-red-500 text-white rounded-full shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>

            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <button 
                  onClick={() => {
                    cleanup();
                    onClose(fullTranscript);
                  }}
                  className="text-[10px] sm:text-xs font-bold text-primary hover:text-white underline underline-offset-4 transition-colors uppercase tracking-widest"
                >
                  Gespeichert! Im Vault ansehen
                </button>
              </motion.div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
              {error}
            </div>
            <button 
              onClick={startSession}
              className="w-full bg-white/5 text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-widest border border-white/10"
            >
              ERNEUT VERSUCHEN
            </button>
          </div>
        )}
      </div>
    </div>

    <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[110] bg-slate-950/95 backdrop-blur-2xl flex flex-col p-6 sm:p-10"
          >
            <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Gesprächsverlauf</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">D.T. Kern Live Session</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {fullTranscript.length > 0 ? (
                  fullTranscript.map((line, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: line.startsWith('Du:') ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed border shadow-sm",
                        line.startsWith('Du:') 
                          ? "bg-primary/10 border-primary/20 text-primary/90 ml-12" 
                          : "bg-white/5 border-white/5 text-slate-300 mr-12 italic"
                      )}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-1">
                        {line.startsWith('Du:') ? 'Nutzer' : 'D.T. Kern'}
                      </span>
                      {line.replace(/^(Du:|Kern:)\s*/, '')}
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <Clock className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">Noch kein Verlauf vorhanden</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleSave}
                  disabled={fullTranscript.length === 0 || isSaving}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg",
                    saveSuccess 
                      ? "bg-green-500 text-white shadow-green-500/20" 
                      : "bg-primary text-dark hover:bg-primary/90 shadow-primary/20"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : saveSuccess ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  {saveSuccess ? "Erfolgreich Gespeichert" : "Im Vault sichern"}
                </button>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all border border-white/5"
                >
                  Schließen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
