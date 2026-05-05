import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Rocket, Target, Share2, Lightbulb, CheckCircle2, ArrowRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface RapidResult {
  core: string;
  elements: {
    title: string;
    description: string;
    icon: string;
  }[];
  validationPlan: string[];
  mockupSuggestion: string;
}

export default function RapidValidator() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RapidResult | null>(null);

  const analyzeIdea = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `
        Du bist ein Business Strategist und Visual Designer. 
        Analysiere diese Geschäftsidee: "${input}"
        
        Erstelle ein strukturiertes Konzept für einen "Rapid Validation Mockup".
        Das Ergebnis MUSS ein JSON-Objekt sein mit:
        - core: Der absolut zentrale Kern der Idee (max 10 Wörter).
        - elements: Ein Array aus 6 Elementen, die um den Kern herum angeordnet werden (z.B. Zielgruppe, Monetarisierung, Growth, MVP-Feature, etc.). Jedes Element hat:
          - title: Kurztitel (max 3 Wörter).
          - description: Kurze Erklärung (max 15 Wörter).
          - icon: Name eines Lucide-Icons (z.B. 'users', 'dollar-sign', 'trending-up', 'smartphone', 'zap', 'shield').
        - validationPlan: 3 konkrete Schritte, wie man diese Idee in 24h mit 0€ validiert.
        - mockupSuggestion: Eine detaillierte Beschreibung für ein Infografik-Design (wie eine Instagram-Post-Struktur), um diese Idee visuell zu erklären.

        Antworte NUR mit dem JSON-Objekt.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || '{}';
      setResult(JSON.parse(text));
    } catch (err) {
      console.error("Rapid Validation Failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0b] p-6 lg:p-12">
      <div className="max-w-[1000px] mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
            <Rocket className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Rapid Validator</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Vom Gedanken zum <span className="text-red-500">Konzept</span> in 15min</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
            Wirf deine Idee in den Ring. Der DT zerlegt sie in ihre Atome, baut ein visuelles Gerüst und gibt dir den Schlachtplan zur sofortigen Validierung.
          </p>
        </div>

        {/* Input area */}
        {!result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Beschreibe deine Business-Idee (z.B. Infografiken über Alltagshindernisse oder bessere Lösungen für nervige Probleme)..."
              className="w-full h-40 bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all resize-none"
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={analyzeIdea}
                disabled={isAnalyzing || !input.trim()}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-red-900/20 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analysiere Potential...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Konzept schmieden
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Results Visualization */}
        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-12 pb-24"
            >
              {/* Infographic Hub */}
              <div className="relative min-h-[600px] flex items-center justify-center py-12">
                {/* Background lines */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none text-zinc-700">
                  <div className="w-[80%] h-[80%] border-2 border-dashed border-current rounded-full" />
                  <div className="absolute w-px h-full bg-current rotate-0" />
                  <div className="absolute w-px h-full bg-current rotate-60" />
                  <div className="absolute w-px h-full bg-current rotate-120" />
                </div>

                {/* Central Hub */}
                <div className="relative z-10 w-48 h-48 bg-red-600 rounded-full flex items-center justify-center p-6 text-center shadow-[0_0_50px_-10px_rgba(220,38,38,0.5)] border-4 border-white/20">
                  <span className="text-white font-bold text-lg leading-tight uppercase tracking-tight">{result.core}</span>
                </div>

                {/* Satellite Elements */}
                {result.elements.map((el, i) => {
                  const angle = (i * 60) * (Math.PI / 180);
                  const radius = 220; // Adjusted for better spacing
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 0, y: 0 }}
                      animate={{ opacity: 1, x, y }}
                      transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
                      className="absolute z-20 w-44 group"
                    >
                      <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-2xl shadow-xl group-hover:border-red-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                            <Lightbulb className="w-4 h-4 text-red-500" />
                          </div>
                          <span className="text-zinc-100 font-bold text-xs uppercase tracking-wider">{el.title}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-light">{el.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Action Plan & Mockup Suggestion */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    24h Validierungs-Schlachtplan
                  </h3>
                  <div className="space-y-4">
                    {result.validationPlan.map((plan, i) => (
                      <div key={i} className="flex gap-4 items-start bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                        <div className="w-6 h-6 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-zinc-300 text-sm leading-relaxed">{plan}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-400" />
                      Social Mockup Guide
                    </h3>
                    <Share2 className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl border-dashed">
                    <p className="text-zinc-400 text-sm italic leading-relaxed">
                      &quot;{result.mockupSuggestion}&quot;
                    </p>
                  </div>
                  <button className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                    Design-Export starten (V2)
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reset Button */}
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => { setResult(null); setInput(''); }}
                  className="text-zinc-500 hover:text-red-400 text-xs font-mono uppercase tracking-[0.2em] transition-colors"
                >
                  [ Neue Idee einspeisen ]
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
