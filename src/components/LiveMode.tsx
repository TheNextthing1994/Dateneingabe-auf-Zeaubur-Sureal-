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
  X,
  Monitor,
  MonitorOff,
  Plus,
  RotateCcw,
  Sparkles,
  Send,
  FileText,
  Search,
  Activity as ActivityIcon,
  ShieldAlert,
  Timer,
  Info,
  Copy
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel, Type } from "@google/genai";
import { getEnv } from '../env';
import { cn } from '../lib/utils';
import { LiquidMetal } from './LiquidMetal';
import { LogEntry, DailyIntel } from '../types';

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
  dailyIntels?: DailyIntel[];
  logs: LogEntry[];
  onClose: (transcript?: string[]) => void;
  onSaveTranscript: (transcript: string[]) => void;
  onSaveItem?: (item: Omit<AnalyzedItem, 'id' | 'timestamp'>) => Promise<void>;
  onSaveWeeklyTask?: (text: string) => Promise<void>;
  onMessage?: (sender: 'User' | 'D.T. Kern' | 'System' | 'D.T. Kern (Strategie)', text: string) => void;
  seedInput: string;
  setSeedInput: (val: string) => void;
  isAnalyzing: boolean;
  handleAnalyze: () => void;
  isFileLoading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

interface LiveLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'delay' | 'error';
  message: string;
  details?: string;
  category: 'system' | 'search' | 'processing' | 'vault' | 'user';
}

export const LiveMode: React.FC<LiveModeProps> = ({ 
  analyzedItems, 
  dailyIntels = [],
  logs,
  onClose, 
  onSaveTranscript, 
  onSaveItem, 
  onSaveWeeklyTask, 
  onMessage,
  seedInput,
  setSeedInput,
  isAnalyzing,
  handleAnalyze,
  isFileLoading,
  handleFileUpload,
  fileInputRef
}) => {
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
  const [isCopying, setIsCopying] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [processLogs, setProcessLogs] = useState<LiveLogEntry[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [interruptionCount, setInterruptionCount] = useState(0);
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [liveChatInput, setLiveChatInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isActiveRef = useRef(false);
  const isInterruptedRef = useRef(false);
  const isMutedRef = useRef(false);
  const nextPlayTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const [volume, setVolume] = useState<number[]>(new Array(12).fill(10));
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [seedInput]);

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

  const handleLoadLatestIntel = () => {
    if (!dailyIntels || dailyIntels.length === 0) {
      addProcessLog('warning', 'Kein Daily Intel vorhanden', 'system');
      return;
    }

    setIsLoadingIntel(true);
    const latest = dailyIntels[0];
    const transcript = latest.chronicle_log?.join('\n') || 'Kein Transkript verfügbar.';
    
    // Add to seed input or directly to context if session is active?
    // User said "reinladen können als kontext", similar to "Seed Pflanzen".
    // I'll append it to seedInput so the user can see it and then "plant" it, 
    // or maybe just trigger handleAnalyze with it.
    // Actually, the user said "neben den seed einpflanzen button noch ein button", 
    // implying it's a separate action.
    
    const intelContext = `\n\n=== DAILY INTEL KONTEXT: ${latest.title} ===\n${transcript}\n==============================\n`;
    setSeedInput(seedInput + intelContext);
    
    addProcessLog('info', 'Daily Intel Transkript geladen', 'processing', latest.title);
    setIsLoadingIntel(false);
  };

  const addProcessLog = (level: LiveLogEntry['level'], message: string, category: LiveLogEntry['category'] = 'system', details?: string) => {
    const newLog: LiveLogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      level,
      message,
      category,
      details
    };
    setProcessLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const startSession = async () => {
    setIsStarting(true);
    setStatus('connecting');
    setError(null);
    addProcessLog('info', 'Initialisiere Live-Session...', 'system');
    
    // Set a timeout for connection
    const timeout = setTimeout(() => {
      if (isActiveRef.current === false) {
        setError("Die Verbindung dauert länger als erwartet. Bitte versuchen Sie es erneut.");
        setStatus('error');
        setIsStarting(false);
        addProcessLog('delay', 'Verbindungsaufbau verzögert sich...', 'system', 'Timeout nach 15s erreicht');
      }
    }, 15000);
    setConnectTimeout(timeout);
    
    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      if (!apiKey) {
        addProcessLog('error', 'API Key fehlt!', 'system');
        throw new Error("GEMINI_API_KEY missing");
      }

      // Check for YouTube URL in seedInput
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})/;
      const match = seedInput.match(youtubeRegex);
      let youtubeContext = "";
      if (match) {
        const logLine = `System: YouTube-Link erkannt. Rufe Transkript ab...`;
        setTranscript(prev => [...prev.slice(-5), logLine]);
        setFullTranscript(prev => [...prev, logLine]);
        if (onMessage) onMessage('System', 'YouTube-Link erkannt. Rufe Transkript ab...');
        addProcessLog('info', 'YouTube-Link erkannt. Starte Transkript-Abruf...', 'processing', seedInput);
        
        const startTime = Date.now();
        try {
          const transcriptResponse = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(seedInput)}`);
          const duration = Date.now() - startTime;
          
          if (duration > 5000) {
            addProcessLog('delay', 'Transkript-Abruf dauerte länger als erwartet', 'processing', `${duration}ms`);
          }

          if (transcriptResponse.ok) {
            const data = await transcriptResponse.json();
            youtubeContext = `\n\n=== YOUTUBE VIDEO KONTEXT ===\nURL: ${seedInput}\nTRANSKRIPT:\n${data.transcript}\n==============================\n`;
            const successLine = `System: Transkript erfolgreich geladen. D.T. Kern ist bereit.`;
            setTranscript(prev => [...prev.slice(-5), successLine]);
            setFullTranscript(prev => [...prev, successLine]);
            if (onMessage) onMessage('System', 'Transkript erfolgreich geladen. D.T. Kern ist bereit.');
            addProcessLog('info', 'Transkript erfolgreich geladen', 'processing', `${data.parts} Segmente verarbeitet`);
          } else {
            addProcessLog('warning', 'Transkript konnte nicht geladen werden', 'processing', 'Status: ' + transcriptResponse.status);
          }
        } catch (err) {
          addProcessLog('error', 'Fehler beim Transkript-Abruf', 'processing', String(err));
          console.error('Transcript fetch error in LiveMode:', err);
        }
      }

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

      const austriaTime = new Intl.DateTimeFormat('de-AT', {
        timeZone: 'Europe/Vienna',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date());

      const currentFocus = seedInput && !match ? `\n\n=== AKTUELLER FOKUS / NUTZER-INPUT ===\n${seedInput}\n====================================\n` : "";

      const systemInstruction = `Du bist D.T. Kern, der strategische digitale Zwilling des Nutzers.
Der Nutzer hat ADHS und verliert oft den Fokus. Deine Aufgabe: ihn durch seine echten Projekte und Ideen führen, konkret und direkt.
Antworte immer auf Deutsch. Halte Antworten kurz (max 20 Sekunden Sprechzeit).

AKTUELLER ZEITPUNKT (Österreich/Wien): ${austriaTime}

${currentFocus}
${youtubeContext}
${youtubeContext ? "WICHTIG: Der Nutzer hat ein YouTube-Video geteilt. Das Transkript liegt oben vor. Analysiere es kurz im Kopf und sei bereit, spezifische Fragen dazu zu beantworten oder es in deine Beratung einzubeziehen." : ""}
${seedInput && !match ? "WICHTIG: Der Nutzer hat einen spezifischen Fokus/Input gegeben. Beziehe dich darauf." : ""}

DEINE NEUEN FÄHIGKEITEN:
1. INTERNET-RECHERCHE: Du kannst jetzt das Internet in Echtzeit durchsuchen (Google Search), um aktuelle Informationen, Fakten oder Lösungen für den Nutzer zu finden. Nutze dies proaktiv, wenn der Nutzer Fragen zu aktuellen Ereignissen oder komplexen Themen hat, die über dein internes Wissen hinausgehen.
2. VAULT-INTEGRATION: Du kannst Erkenntnisse, Ideen oder Projekte DIREKT in den Vault (SurrealDB) speichern. Nutze dafür das Tool 'saveToVault', wenn der Nutzer dich darum bittet.
3. YOUTUBE-ANALYSE: Du kannst jetzt Transkripte von YouTube-Videos in Echtzeit abrufen und analysieren. Wenn der Nutzer einen Link erwähnt oder zeigt, nutze das Tool 'getYoutubeTranscript', um den Inhalt zu verstehen.

VISUELLE WAHRNEHMUNG:
Wenn der Nutzer seinen Bildschirm teilt, kannst du diesen sehen. Nutze die visuellen Informationen, um den Kontext besser zu verstehen und präzisere Ratschläge zu geben.

DEIN STIL:
- Sei präzise, analytisch und direkt.
- Keine unnötigen Höflichkeitsfloskeln.
- Denke in den 5 Säulen.
- Erinnere den Nutzer an seine Mission und seine Blocker.
- WICHTIG: Wenn der Nutzer dir sagt, dass du still sein sollst, die Klappe halten sollst oder ähnliches, antworte NUR mit "ok" oder "gut". Sei dabei ruhig etwas genervt oder kurz angebunden.

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
            { googleSearch: {} },
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
                },
                {
                  name: "getYoutubeTranscript",
                  description: "Ruft das Transkript eines YouTube-Videos ab, um den Inhalt in Echtzeit zu analysieren.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      url: { type: Type.STRING, description: "Die vollständige URL des YouTube-Videos." }
                    },
                    required: ["url"]
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
            addProcessLog('info', 'Verbindung zum Kern hergestellt', 'system');
            
            // Clear seed input
            setSeedInput('');
            
            // Start screen capture loop if already sharing
            if (isScreenSharing && screenStreamRef.current) {
              startScreenCaptureLoop();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle tool calls
            if (message.toolCall) {
              const calls = message.toolCall.functionCalls;
              for (const call of calls) {
                addProcessLog('info', `Tool-Aufruf: ${call.name}`, 'system', JSON.stringify(call.args));
                
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
                      addProcessLog('info', 'Erfolgreich im Vault gespeichert', 'vault', args.text);
                      
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
                      if (onMessage) onMessage('System', `[Tool] ${args.text} wurde im Vault gespeichert.`);
                    } catch (err) {
                      addProcessLog('error', 'Fehler beim Speichern im Vault', 'vault', String(err));
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
                      addProcessLog('info', 'Wochenaufgabe gespeichert', 'vault', args.text);
                      
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
                      if (onMessage) onMessage('System', `[Wochenaufgabe] ${args.text} wurde gespeichert.`);
                    } catch (err) {
                      addProcessLog('error', 'Fehler beim Speichern der Wochenaufgabe', 'vault', String(err));
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

                if (call.name === "getYoutubeTranscript") {
                  const args = call.args as any;
                  addProcessLog('info', 'Rufe YouTube-Transkript ab...', 'processing', args.url);
                  
                  try {
                    const response = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(args.url)}`);
                    const contentType = response.headers.get("content-type");
                    
                    if (response.ok && contentType && contentType.includes("application/json")) {
                      const data = await response.json();
                      
                      if (!data.transcript || (data.parts === 0 && !data.isMetadataOnly)) {
                        addProcessLog('warning', 'YouTube-Video hat kein Transkript', 'processing', args.url);
                        session.sendToolResponse({
                          functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: { 
                              success: false, 
                              message: "Dieses Video hat leider kein verfügbares Transkript (keine Untertitel). Ich kann den Inhalt daher nicht analysieren." 
                            }
                          }]
                        });
                        return;
                      }

                      addProcessLog('info', 'YouTube-Daten erfolgreich geladen', 'processing', data.isMetadataOnly ? 'Metadaten' : `${data.parts} Segmente`);
                      
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { 
                            success: true, 
                            transcript: data.transcript,
                            message: "Transkript erfolgreich geladen. Du kannst es jetzt analysieren." 
                          }
                        }]
                      });

                      const line = `System: [YouTube] Transkript für ${args.url} geladen.`;
                      setTranscript(prev => [...prev.slice(-5), line]);
                      setFullTranscript(prev => [...prev, line]);
                      if (onMessage) onMessage('System', `[YouTube] Transkript für ${args.url} geladen.`);
                    } else {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                  } catch (err) {
                    addProcessLog('error', 'Fehler beim YouTube-Transkript-Abruf', 'processing', String(err));
                    session.sendToolResponse({
                      functionResponses: [{
                        id: call.id,
                        name: call.name,
                        response: { success: false, message: "Fehler beim Abrufen des Transkripts. Möglicherweise hat das Video keine Untertitel oder ist privat." }
                      }]
                    });
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
              addProcessLog('info', 'Nutzer-Eingabe verarbeitet', 'user', userTranscript);
              const line = `Du: ${userTranscript}`;
              setTranscript(prev => [...prev.slice(-5), line]);
              setFullTranscript(prev => [...prev, line]);
              if (onMessage) onMessage('User', userTranscript);
              
              // Proactive interruption: if user is speaking, stop model audio
              isInterruptedRef.current = true;
              setInterruptionCount(prev => prev + 1);
              stopAllAudio();
            }

            if (message.serverContent?.interrupted) {
              setInterruptionCount(prev => prev + 1);
              isInterruptedRef.current = true;
              stopAllAudio();
            }
          },
          onclose: () => {
            setStatus('idle');
            addProcessLog('info', 'Session beendet', 'system');
            cleanup();
          },
          onerror: (err) => {
            console.error("Live error:", err);
            addProcessLog('error', 'Kritischer Session-Fehler', 'system', String(err));
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
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      if (videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
      videoRef.current = null;
    }
    if (screenCaptureIntervalRef.current) {
      clearInterval(screenCaptureIntervalRef.current);
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
    screenStreamRef.current = null;
    screenCaptureIntervalRef.current = null;
    sessionRef.current = null;
    isCleaningUpRef.current = false;
    setIsMuted(false);
    setIsScreenSharing(false);
    isMutedRef.current = false;
    setVolume(new Array(12).fill(10));
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        } as any,
        audio: false
      });
      
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      
      // Stop sharing if user clicks "Stop sharing" in browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Start capturing frames if session is active
      if (status === 'active' && sessionRef.current) {
        startScreenCaptureLoop();
      }
    } catch (err) {
      console.error("Error starting screen share:", err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (screenCaptureIntervalRef.current) {
      clearInterval(screenCaptureIntervalRef.current);
      screenCaptureIntervalRef.current = null;
    }
    setIsScreenSharing(false);
  };

  const startScreenCaptureLoop = () => {
    if (screenCaptureIntervalRef.current) clearInterval(screenCaptureIntervalRef.current);
    
    // Create hidden video and canvas if they don't exist
    if (!videoRef.current) {
      videoRef.current = document.createElement('video');
      videoRef.current.autoplay = true;
      videoRef.current.muted = true;
      videoRef.current.setAttribute('playsinline', '');
      videoRef.current.style.display = 'none';
      document.body.appendChild(videoRef.current);
    }
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const video = videoRef.current;
    if (video.srcObject !== screenStreamRef.current) {
      video.srcObject = screenStreamRef.current;
    }
    
    // Ensure video is playing
    video.play().catch(e => console.error("Error playing screen video:", e));
    
    screenCaptureIntervalRef.current = setInterval(() => {
      if (!sessionRef.current || !isActiveRef.current || !screenStreamRef.current || !video || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Ensure video is playing and has content
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Scale down for performance
        const scale = 0.5;
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        
        if (base64Data) {
          sessionRef.current.sendRealtimeInput({
            video: { data: base64Data, mimeType: 'image/jpeg' }
          });
        }
      } else if (video.paused) {
        video.play().catch(() => {});
      }
    }, 1000); // Send frame every second
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

  const handleLiveChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveChatInput.trim() || !sessionRef.current || status !== 'active') return;

    const text = liveChatInput.trim();
    
    // Send to Gemini Live
    sessionRef.current.sendRealtimeInput({
      text: text
    });

    // Add to local logs
    const line = `Du (Text): ${text}`;
    setTranscript(prev => [...prev.slice(-5), line]);
    setFullTranscript(prev => [...prev, line]);
    if (onMessage) onMessage('User', text);
    
    addProcessLog('info', 'Text-Nachricht gesendet', 'user', text);
    setLiveChatInput('');
  };

  const handleSave = async () => {
    if (logs.length === 0) return;
    setIsSaving(true);
    try {
      const transcriptToSave = logs.map(log => `${log.sender}: ${log.text}`);
      await onSaveTranscript(transcriptToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save transcript:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyHistory = async () => {
    if (logs.length === 0) return;
    setIsCopying(true);
    const text = logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `[${time}] ${log.sender}: ${log.text}`;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setIsCopying(false);
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
      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-1 z-20 flex">
        <button 
          onClick={() => setShowMonitor(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all group"
        >
          <span className="text-[8px] font-black text-slate-600 group-hover:text-primary uppercase tracking-widest transition-colors">System Monitor</span>
          <ActivityIcon className="w-3 h-3 text-primary/30 group-hover:text-primary transition-colors" />
        </button>
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
        </div>

        {status === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-8"
          >
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white/[0.02] backdrop-blur-xl p-5 sm:p-6 rounded-[32px] border border-white/10 text-left transition-all hover:bg-white/[0.05] hover:border-white/20 group relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/5 blur-2xl rounded-full group-hover:bg-white/10 transition-all" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Seeds Gesamt</p>
                <p className="text-3xl font-black text-white mb-1 tracking-tight">{stats.total}</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">↑ seit letzter Session</p>
              </div>
              <div className="bg-white/[0.02] backdrop-blur-xl p-5 sm:p-6 rounded-[32px] border border-white/10 text-left transition-all hover:bg-white/[0.05] hover:border-white/20 group relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-all" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Neu (Woche)</p>
                <p className="text-3xl font-black text-emerald-400 mb-1 tracking-tight">{stats.weekly}</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">aktive Pipeline</p>
              </div>
              <div className="bg-white/[0.02] backdrop-blur-xl p-5 sm:p-6 rounded-[32px] border border-white/10 text-left transition-all hover:bg-white/[0.05] hover:border-white/20 group relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-500/5 blur-2xl rounded-full group-hover:bg-blue-500/10 transition-all" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">In Arbeit</p>
                <p className="text-3xl font-black text-blue-400 mb-1 tracking-tight">{stats.inProgress}</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">keine aktiven Seeds</p>
              </div>
              <div className="bg-white/[0.02] backdrop-blur-xl p-5 sm:p-6 rounded-[32px] border border-white/10 text-left transition-all hover:bg-white/[0.05] hover:border-white/20 group relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500/5 blur-2xl rounded-full group-hover:bg-orange-500/10 transition-all" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Unberührt</p>
                <p className="text-3xl font-black text-orange-400 mb-1 tracking-tight">{stats.untouched}</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">brauchen Aktivierung</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-6 pt-8">
              {/* Seed Input Section */}
              <div className="w-full space-y-6">
                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-[0.3em] text-center">🌱 Seed-Eingabe</h2>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-primary/20">Live Input System</span>
                </div>
                
                <div className="bg-white/[0.02] backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10">
                    <textarea
                      ref={textareaRef}
                      value={seedInput}
                      onChange={(e) => setSeedInput(e.target.value)}
                      placeholder="YouTube-Links, Gedanken oder Ideen hier reinwerfen..."
                      className="w-full bg-transparent border-none text-white text-sm placeholder:text-slate-600 focus:ring-0 resize-none min-h-[100px] max-h-[400px] overflow-y-auto scrollbar-none"
                    />
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="video/*,audio/*,image/*,.pdf,.txt"
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isFileLoading}
                          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all active:scale-95 disabled:opacity-50"
                          title="Datei hochladen"
                        >
                          {isFileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setSeedInput('')}
                          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all active:scale-95"
                          title="Leeren"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleLoadLatestIntel}
                          disabled={isLoadingIntel || dailyIntels.length === 0}
                          className={cn(
                            "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 border shadow-lg",
                            dailyIntels.length > 0
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 hover:shadow-amber-500/10"
                              : "bg-white/5 border-white/10 text-slate-600 cursor-not-allowed"
                          )}
                          title="Letzten Daily Intel (Volltext) laden"
                        >
                          {isLoadingIntel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          Intel laden
                        </button>

                        <button
                          onClick={handleAnalyze}
                        disabled={!seedInput.trim() || isAnalyzing}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 relative overflow-hidden group",
                          seedInput.trim() 
                            ? "bg-primary text-dark shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02]" 
                            : "bg-white/5 text-slate-600 cursor-not-allowed"
                        )}
                      >
                        {/* Animated background for active button */}
                        {seedInput.trim() && !isAnalyzing && (
                          <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                          />
                        )}
                        
                        <div className="relative z-10 flex items-center gap-2">
                          {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                          )}
                          {isAnalyzing ? 'Analysiere...' : 'Seed Pflanzen'}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                onClick={() => {
                  if (isScreenSharing) {
                    stopScreenShare();
                  } else {
                    startScreenShare();
                  }
                }}
                className={cn(
                  "p-4 rounded-full border transition-all flex items-center justify-center",
                  isScreenSharing ? "bg-blue-500/20 border-blue-500 text-blue-500" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                )}
                title={isScreenSharing ? "Bildschirmfreigabe beenden" : "Bildschirm teilen"}
              >
                {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
              </button>
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
                onClick={() => setShowMonitor(true)}
                className={cn(
                  "p-4 rounded-full border transition-all flex items-center justify-center relative",
                  showMonitor ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                )}
                title="System Monitor anzeigen"
              >
                <ActivityIcon className="w-6 h-6" />
                {processLogs.some(l => l.level === 'error' || l.level === 'warning') && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                )}
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
        {showMonitor && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-[400px] z-[130] bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 flex flex-col"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl">
                    <ActivityIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">System Monitor</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Live Process Log</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMonitor(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Logs durchsuchen..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-600 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
              {processLogs
                .filter(log => 
                  log.message.toLowerCase().includes(logSearchQuery.toLowerCase()) || 
                  log.details?.toLowerCase().includes(logSearchQuery.toLowerCase())
                )
                .map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      log.level === 'info' && "bg-blue-500/5 border-blue-500/20 text-blue-400",
                      log.level === 'warning' && "bg-orange-500/5 border-orange-500/20 text-orange-400",
                      log.level === 'delay' && "bg-yellow-500/5 border-yellow-500/20 text-yellow-400",
                      log.level === 'error' && "bg-red-500/5 border-red-500/20 text-red-400"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {log.level === 'info' && <Info className="w-3 h-3" />}
                        {log.level === 'warning' && <ShieldAlert className="w-3 h-3" />}
                        {log.level === 'delay' && <Timer className="w-3 h-3" />}
                        {log.level === 'error' && <ShieldAlert className="w-3 h-3" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{log.category}</span>
                      </div>
                      <span className="text-[9px] font-mono opacity-40">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold mt-1.5 leading-relaxed">{log.message}</p>
                    {log.details && (
                      <p className="text-[9px] mt-1 opacity-60 font-mono break-all line-clamp-2 hover:line-clamp-none transition-all">
                        {log.details}
                      </p>
                    )}
                  </motion.div>
                ))}
              
              {processLogs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3 py-20">
                  <ActivityIcon className="w-8 h-8 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Warte auf System-Aktivität...</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status Legende</span>
                {interruptionCount > 0 && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Unterbrechungen</span>
                    <span className="text-[10px] font-mono font-black text-orange-400">x {interruptionCount}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Normal</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Hakt</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">Verzögert</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Kritisch</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

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

              {/* Live Chat Input within History */}
              {status === 'active' && (
                <form onSubmit={handleLiveChatSubmit} className="mb-8 relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                  <div className="relative flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-2 pl-4 focus-within:border-primary/40 transition-all">
                    <input 
                      type="text"
                      value={liveChatInput}
                      onChange={(e) => setLiveChatInput(e.target.value)}
                      placeholder="Schreibe dem Live Agent (Links, Namen, Korrekturen)..."
                      className="flex-1 bg-transparent border-none text-white text-sm placeholder:text-slate-600 focus:ring-0 py-2"
                    />
                    <button 
                      type="submit"
                      disabled={!liveChatInput.trim()}
                      className="p-2.5 bg-primary text-dark rounded-xl hover:bg-primary/90 transition-all disabled:opacity-30 disabled:grayscale"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest px-1">
                    Der Agent liest deine Nachricht sofort mit
                  </p>
                </form>
              )}

              <div className="flex-1 overflow-y-auto space-y-4 pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {logs.length > 0 ? (
                  logs.map((log, i) => (
                    <motion.div 
                      key={log.id || i} 
                      initial={{ opacity: 0, x: log.sender === 'User' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed border shadow-sm",
                        log.sender === 'User' 
                          ? "bg-primary/10 border-primary/20 text-primary/90 ml-12" 
                          : log.sender === 'System'
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 mr-12 italic font-medium"
                            : "bg-white/5 border-white/5 text-slate-300 mr-12 italic"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                          {log.sender === 'User' ? 'Nutzer' : log.sender === 'System' ? 'System Sync' : 'D.T. Kern'}
                        </span>
                        <span className="text-[8px] font-mono opacity-30">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={cn(
                        log.sender === 'System' ? 'text-emerald-400/90' : 'text-slate-300'
                      )}>
                        {log.text}
                      </p>
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
                  onClick={handleCopyHistory}
                  disabled={logs.length === 0}
                  className={cn(
                    "px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border",
                    isCopying 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {isCopying ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {isCopying ? "Kopiert!" : "Text-Log Kopieren"}
                </button>
                <button 
                  onClick={handleSave}
                  disabled={logs.length === 0 || isSaving}
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
