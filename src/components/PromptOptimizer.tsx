import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wand2, 
  Sparkles, 
  ArrowRight, 
  MessageSquarePlus, 
  CheckCircle2, 
  RefreshCcw,
  Zap,
  Cpu,
  Target,
  FileText,
  Copy,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PromptVersion {
  id: string;
  original: string;
  refined: string;
  formula: {
    P?: string; // Task
    C?: string; // Context
    Z?: string; // Goal
    S?: string; // Specificity / Constraints
    O?: string; // Output Format
    A?: string; // Examples
    F?: string; // Failure Path
    R?: string; // Role
    T?: string; // Tone
  };
  questions: { key: keyof PromptVersion['formula']; question: string }[];
  score: number;
  timestamp: number;
}

export default function PromptOptimizer() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<PromptVersion | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<PromptVersion[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);

  // Analyze input to map to P, C, Z
  const handleRefine = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    setShowQuestions(false);
    
    // Simulate extraction of core terms from input
    setTimeout(() => {
      const newVersion: PromptVersion = {
        id: `v-${Date.now()}`,
        original: input,
        refined: input,
        formula: {
          P: input.split('.')[0] || input, // Mock extraction
          C: '',
          Z: '',
        },
        questions: [
          { key: 'R', question: "Welche Rolle oder Persona soll die KI einnehmen? (z.B. Strategie-Experte)" },
          { key: 'C', question: "Welchen Kontext oder welche Dokumente (Primärartefakte) müssen berücksichtigt werden?" },
          { key: 'Z', question: "Was ist das exakte Zielbild? Was soll am Ende klar sein oder erzeugt werden?" },
          { key: 'S', question: "Welche spezifischen Einschränkungen (Umfang, Ausschlüsse, Prioritäten) gelten?" },
          { key: 'T', question: "In welchem Ton oder Stil soll die Antwort verfasst sein?" },
          { key: 'O', question: "Welches Ausgabeformat wird bevorzugt (Liste, Tabelle, JSON, Markdown)?" },
          { key: 'A', question: "Gib 1-2 Beispiele für den gewünschten Output (Few-shot Beispiele)." },
          { key: 'F', question: "Wie soll das Modell reagieren, wenn Informationen fehlen (Fehlerpfad)?" }
        ],
        score: 5.8,
        timestamp: Date.now()
      };
      
      setCurrentVersion(newVersion);
      setIsProcessing(false);
      setShowQuestions(true);
    }, 1200);
  };

  const handleAnswerSubmit = () => {
    setIsProcessing(true);
    
    // Simulate mathematical composition using delimiters
    setTimeout(() => {
      if (currentVersion) {
        const f = { ...currentVersion.formula, ...answers };
        
        // Final prompt construction using the ⊕ (Ordered Composition) principle
        const finalRefined = [
          f.R ? `<rolle>\n${f.R}\n</rolle>` : '',
          f.P ? `<aufgabe>\n${f.P}\n</aufgabe>` : '',
          f.C ? `<kontext>\n${f.C}\n</kontext>` : '',
          f.Z ? `<ziel>\n${f.Z}\n</ziel>` : '',
          f.S || f.T ? `<regeln>\n${f.S ? `- ${f.S}\n` : ''}${f.T ? `- Tonalität: ${f.T}\n` : ''}</regeln>` : '',
          f.O ? `<ausgabeformat>\n${f.O}\n</ausgabeformat>` : '',
          f.A ? `<beispiele>\n${f.A}\n</beispiele>` : '',
          f.F ? `<fehlerbehandlung>\n${f.F}\n</fehlerbehandlung>` : ''
        ].filter(Boolean).join('\n\n');
        
        const finalVersion = {
          ...currentVersion,
          formula: f,
          refined: finalRefined,
          score: 9.4
        };
        
        setHistory([finalVersion, ...history]);
        setCurrentVersion(finalVersion);
        setShowQuestions(false);
      }
      setIsProcessing(false);
    }, 1800);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 flex flex-col h-full bg-slate-950/40 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden font-sans"
    >
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-slate-900/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <Wand2 className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">Prompt Optimizer</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium tracking-wider">DT ALPHA-REFINEMENT CORE • MATHEMATISCHE PRÄZISION</p>
          </div>
          
          <div className="flex gap-8">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Formel</span>
              <span className="text-xs font-mono text-amber-500/80">q = P ⊕ C ⊕ Z ⊕ S ⊕ O ⊕ A ⊕ F</span>
            </div>
            <div className="flex flex-col items-end border-l border-white/10 pl-8">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">System Status</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-mono text-emerald-500/80 uppercase">Bereit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-12">
            
            {/* Input Section */}
            {!currentVersion || !showQuestions ? (
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Initialer Entwurf (P)</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Beschreibe deine Aufgabe in einem Satz</p>
                  </div>
                </div>

                <div className="relative group">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Erstelle einen Marketing-Plan für DT..."
                    className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-slate-200 placeholder:text-slate-700 outline-none focus:border-amber-500/50 transition-all resize-none font-medium"
                  />
                  <div className="absolute top-4 right-4 pointer-events-none opacity-20 group-focus-within:opacity-10 transition-opacity">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleRefine}
                    disabled={isProcessing || !input.trim()}
                    className={cn(
                      "col-span-2 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all",
                      isProcessing || !input.trim() 
                        ? "bg-slate-800 text-slate-600 cursor-not-allowed opacity-50" 
                        : "bg-amber-500 text-slate-900 hover:scale-[1.01] active:scale-[0.98] shadow-xl shadow-amber-500/20"
                    )}
                  >
                    {isProcessing ? (
                      <RefreshCcw className="w-4 h-4 animate-spin text-slate-900" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Variablen Extrahieren
                  </button>
                </div>
              </section>
            ) : null}

            {/* Questions Interface */}
            <AnimatePresence>
              {showQuestions && currentVersion && (
                <motion.section
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">DT Alpha-Synthese</h3>
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed font-medium">
                      Dein Input wurde als <span className="font-bold text-white tracking-widest">TERM P</span> identifiziert. Vervollständige nun die restlichen Variablen der Gleichung:
                    </p>
                  </div>

                  <div className="space-y-6">
                    {currentVersion.questions.map((q, idx) => (
                      <div key={idx} className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 text-amber-500" /> Variable {q.key}
                        </label>
                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                          <p className="text-[11px] font-bold text-slate-300 mb-3 uppercase tracking-tighter">{q.question}</p>
                          <input 
                            type="text"
                            value={answers[q.key] || ''}
                            onChange={(e) => setAnswers({...answers, [q.key]: e.target.value})}
                            placeholder="Deine Antwort..."
                            className="w-full bg-black/40 border border-white/5 rounded-lg py-2.5 px-4 text-xs text-white outline-none focus:border-white/20 transition-all font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleAnswerSubmit}
                    disabled={isProcessing}
                    className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
                  >
                    {isProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Prompt Synthetisieren
                  </button>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Results Section */}
            {currentVersion && !showQuestions && !isProcessing && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Präzision (Q)</span>
                    <span className="text-xl font-black text-white">{(currentVersion.score * 10).toFixed(0)}%</span>
                  </div>
                  <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center gap-1">
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Zustand</span>
                    <span className="text-xl font-black text-emerald-500 uppercase tracking-tighter">Bereit</span>
                  </div>
                  <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Komplexität</span>
                    <span className="text-xl font-black text-white">HIGH</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-amber-500" /> Mathematisch Optimierter Prompt
                    </h3>
                    <button 
                      onClick={() => copyToClipboard(currentVersion.refined)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    >
                      <Copy className="w-3 h-3 text-amber-500" /> Kopieren
                    </button>
                  </div>
                  <div className="p-8 bg-black/60 border border-white/10 rounded-3xl relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                       <Wand2 className="w-32 h-32 text-white" />
                    </div>
                    <pre className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap relative z-10">
                      {currentVersion.refined}
                    </pre>
                  </div>
                </div>

                <div className="p-6 border border-white/5 bg-white/5 rounded-2xl">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-3 h-3 text-amber-500" /> Nächste Schritte
                  </h4>
                  <ul className="space-y-2">
                    {[
                      "Nutze diesen Prompt direkt in DT für maximale Ergebnisse.",
                      "Falte den Prompt zusammen für komplexe Workflows.",
                      "Erstelle eine Variante mit spezifischeren Beispielen (Term A)."
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-[10px] text-slate-400 font-medium">
                        <div className="w-1 h-1 rounded-full bg-amber-500 mt-1" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setInput('');
                    setCurrentVersion(null);
                    setAnswers({});
                  }}
                  className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 mx-auto"
                >
                  <RefreshCcw className="w-3 h-3" /> Neuen Term berechnen
                </button>
              </motion.section>
            )}

          </div>
        </div>

        {/* Sidebar History */}
        <aside className="hidden xl:flex w-80 border-l border-white/5 bg-slate-900/40 flex-col">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Cpu className="w-3 h-3" /> Optimierungs-Log
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {history.length > 0 ? (
              history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setCurrentVersion(h);
                    setShowQuestions(false);
                    setAnswers(h.formula);
                  }}
                  className="w-full p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-left space-y-2 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-slate-600 italic">#{h.id.substring(2, 6)}</span>
                    <span className="text-[9px] font-bold text-amber-500 uppercase">Q: {h.score.toFixed(1)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate font-medium uppercase tracking-tight group-hover:text-slate-200">
                    {h.original}
                  </p>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-20 text-center px-6">
                <RefreshCcw className="w-8 h-8 text-slate-700 mb-4" />
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Keine Historie vorhanden</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

