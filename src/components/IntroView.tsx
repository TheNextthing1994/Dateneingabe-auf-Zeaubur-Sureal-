import React from 'react';
import { motion } from 'motion/react';
import { Info, Target, Search, Layers, Cpu, CreditCard, ChevronRight } from 'lucide-react';

export default function IntroView() {
  const steps = [
    {
      num: 1,
      title: "Rein-bringen.",
      icon: <Target className="w-5 h-5 text-red-500" />,
      content: "Ich will ohne Reibung Gedanken reinwerfen koennen - per Chat-Eingabe, Live-Sprache oder durch Sichten von '1000 Chats' und Extraktion in den Vault. Strukturierte Eingaben (PROJEKT:, ERKENNTNIS:, IDEE:, ZIEL:) sollen deterministisch landen, nicht halluzinatorisch klassifiziert werden."
    },
    {
      num: 2,
      title: "Finden.",
      icon: <Search className="w-5 h-5 text-orange-500" />,
      content: "Volltextsuche, Filter nach Typ/Bereich/Status/Min-Impact, Sortierung nach Neueste zuerst. Ich will beim Daily Discovery oder im Warroom in Sekunden auf einen passenden Seed, eine Erkenntnis oder ein Projekt zugreifen koennen, ohne mich durch Notion zu klicken."
    },
    {
      num: 3,
      title: "Verdichten.",
      icon: <Layers className="w-5 h-5 text-amber-500" />,
      content: "Aus vielen Seeds entstehen Erkenntnisse, aus Erkenntnissen Workflows, aus Workflows Strategien. Die Vault-Kacheln (Ideen Deck -> Projekt Akten -> Strategien/Workflows -> Academy) sind der Wertschoepfungsfluss: links rohes Material, rechts gereiftes, anwendbares Wissen."
    },
    {
      num: 4,
      title: "Arbeiten lassen.",
      icon: <Cpu className="w-5 h-5 text-red-400" />,
      content: "Der DT soll auf Basis dieses Speichers proaktiv handeln - Wochen-Roadmap vorschlagen, Mission-Briefing erstellen, Blocker erkennen, Hot Topics surfen, mich an unbearbeitete High-Impact-Sachen erinnern. Das Knowledge Pressure Panel (Wissens-Dichte, Hot Topic, High Impact, Library Insight) ist genau das: die Library schreibt dem DT, womit er mich konfrontieren soll."
    },
    {
      num: 5,
      title: "Monetarisieren und produzieren.",
      icon: <CreditCard className="w-5 h-5 text-orange-400" />,
      content: "Aus dem Speicher ziehe ich Inhalte fuer meinen Systeme.io-Kurs (12-Wochen-Videoplan), Warroom-Sessions und Daily-Discovery-Game-Mechaniken. Die Library ist also nicht nur Archiv, sondern Quelle fuer Output."
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0b] p-6 lg:p-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[720px] mx-auto space-y-12 pb-24"
      >
        {/* Header */}
        <header className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
              <span className="text-white font-black italic text-xl">DT</span>
            </div>
            <span className="text-zinc-500 font-mono tracking-widest text-xs uppercase underline decoration-red-500/50 underline-offset-4">Manifest</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-tight mt-4">
            Was mein Digital Twin koennen soll
          </h1>
          
          <p className="text-xl text-zinc-400 leading-relaxed font-light">
            Er soll <span className="text-zinc-100 font-medium italic">mein zweites Gehirn</span> sein, nicht bloss ein Notizordner. 
            Alles, was bei mir in den Tag reinkommt - Ideen, Erkenntnisse, Projekte, Methoden, Mechanismen, Inhalte aus Chats (ChatGPT, Notion, Telegram, Drive), Video-Insights, Tool-Empfehlungen, Kundengespraeche, eigene Reflexionen aus dem Live-Modus mit dem DT - soll dort als <span className="text-red-400">atomare Einheiten (&quot;Seeds&quot;)</span> landen.
          </p>
          
          <p className="text-zinc-400 leading-relaxed">
            Ueber dem Ganzen liegt eine Struktur, die diese Atome in groessere Container buendelt: 
            <span className="text-zinc-200"> aktive Projekte, Workflows, Strategien, Erkenntnisse, Academy/Lerninhalte, Toolbox, Kundenakten, Missionsziele</span>. 
            Jede Einheit ist nach Typ, Bereich (dev/business/health/finance/mindset bzw. Islam), Status, Impact und Zeitstempel klassifiziert, damit der DT priorisieren und mir das Richtige zur richtigen Zeit zurueckgeben kann.
          </p>
        </header>

        {/* Sections */}
        <section className="space-y-10">
          <h2 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-1 h-8 bg-red-600 rounded-full mr-2" />
            Was ich darin tue
          </h2>

          <div className="space-y-8">
            {steps.map((step) => (
              <motion.div 
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.num * 0.1 }}
                className="flex gap-6 group"
              >
                <div className="flex-shrink-0 relative">
                  <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center group-hover:border-red-500/50 transition-colors">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-800 text-[10px] font-bold text-zinc-400 border border-zinc-700 rounded-full flex items-center justify-center">
                    {step.num}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-100 group-hover:text-red-400 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    {step.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer Accent */}
        <div className="pt-12 border-t border-zinc-900/50 flex items-center justify-between text-zinc-600 font-mono text-[10px] uppercase tracking-[0.2em]">
          <span>© 2026 DT System</span>
          <span className="flex items-center gap-2 italic">
            Beyond Human Memory <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}
