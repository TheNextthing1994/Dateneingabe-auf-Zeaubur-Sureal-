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
import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel } from "@google/genai";
import { getEnv } from '../env';
import { cn } from '../lib/utils';

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
}

interface LiveModeProps {
  analyzedItems: AnalyzedItem[];
  onClose: () => void;
}

export const LiveMode: React.FC<LiveModeProps> = ({ analyzedItems, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const nextPlayTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const [volume, setVolume] = useState<number[]>(new Array(12).fill(10));

  const stats = React.useMemo(() => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weeklySeeds = analyzedItems.filter(item => item.timestamp > oneWeekAgo);
    
    return {
      total: analyzedItems.length,
      weekly: weeklySeeds.length,
      inProgress: analyzedItems.filter(i => i.status === 'In Arbeit').length,
      untouched: analyzedItems.filter(i => i.status === 'Offen' && !i.isArchived).length,
      completed: analyzedItems.filter(i => i.isArchived).length
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
    setStatus('connecting');
    setError(null);
    
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
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
          },
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            isActiveRef.current = true;
            console.log("Live session opened");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle transcriptions
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  playAudioChunk(part.inlineData.data);
                }
                if (part.text) {
                  setTranscript(prev => [...prev.slice(-5), `Kern: ${part.text!}`]);
                }
              }
            }
            
            // Handle user transcription
            const userTranscript = (message.serverContent as any)?.userTurn?.parts?.[0]?.text;
            if (userTranscript) {
              setTranscript(prev => [...prev.slice(-5), `Du: ${userTranscript}`]);
            }

            if (message.serverContent?.interrupted) {
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

  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-dark flex flex-col items-center justify-center p-6"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-md space-y-8 sm:space-y-12 text-center px-4">
        <div className="space-y-3 sm:space-y-4">
          <div className={cn(
            "w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full flex items-center justify-center border-2 transition-all duration-500",
            status === 'active' ? "border-primary bg-primary/10 shadow-[0_0_40px_rgba(16,185,129,0.2)]" : "border-white/10 bg-white/5"
          )}>
            {status === 'connecting' ? (
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-spin" />
            ) : status === 'active' ? (
              <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-pulse" />
            ) : (
              <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-white uppercase">D.T. KERN LIVE</h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Strategische Analyse & Fokus-Support</p>
        </div>

        {status === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 sm:space-y-8"
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Seeds Gesamt</p>
                <p className="text-lg sm:text-xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Neu (Woche)</p>
                <p className="text-lg sm:text-xl font-bold text-primary">{stats.weekly}</p>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">In Arbeit</p>
                <p className="text-lg sm:text-xl font-bold text-indigo-400">{stats.inProgress}</p>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Unberührt</p>
                <p className="text-lg sm:text-xl font-bold text-amber-400">{stats.untouched}</p>
              </div>
            </div>
            
            <button 
              onClick={startSession}
              className="w-full bg-primary text-dark font-black py-4 rounded-2xl text-xs sm:text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              MISSION STARTEN
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

            <div className="bg-white/5 p-4 sm:p-6 rounded-3xl border border-white/10 min-h-[100px] sm:min-h-[120px] flex flex-col justify-center gap-2">
              {transcript.length > 0 ? (
                transcript.map((line, i) => (
                  <p key={i} className={cn(
                    "text-xs sm:text-sm leading-relaxed",
                    line.startsWith('Du:') ? "text-primary/70 font-medium" : "text-slate-200 italic"
                  )}>
                    {line}
                  </p>
                ))
              ) : (
                <p className="text-[10px] sm:text-xs text-slate-500 animate-pulse uppercase tracking-widest text-center">Höre zu...</p>
              )}
            </div>

            <button 
              onClick={startAnalysis}
              className="w-full bg-white/5 hover:bg-white/10 text-primary border border-primary/20 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
            >
              Wöchentliche Analyse starten
            </button>

            <div className="flex items-center justify-center gap-6">
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
    </motion.div>
  );
};
