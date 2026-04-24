import React, { useState } from 'react';
import { Target, Send, ChevronRight } from 'lucide-react';

interface GoalInputProps {
  onCreateGoal: (goal: string) => Promise<void>;
  currentGoal?: string;
  isProcessing?: boolean;
}

export const GoalInput: React.FC<GoalInputProps> = ({ onCreateGoal, currentGoal, isProcessing }) => {
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    await onCreateGoal(input);
    setInput('');
  };

  return (
    <div className="bg-black/40 border border-white/10 p-6 rounded-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
          <Target className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="font-sans font-bold text-lg text-gray-100 tracking-tight flex items-center gap-2">
            CEO DIREKTIVE
            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-mono uppercase tracking-widest animate-pulse">Live</span>
          </h2>
          <p className="text-xs text-gray-500 uppercase font-mono tracking-widest">Zentrale Aufgabenstellung für die Agenten-Armada</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a new objective (e.g. 'Build a marketing campaign')..."
          className="w-full bg-black/60 border border-white/10 rounded-sm py-4 pl-4 pr-16 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all font-sans text-sm"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!input.trim() || isProcessing}
          className="absolute right-2 top-2 bottom-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-sm transition-colors flex items-center justify-center group"
        >
          <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      {currentGoal && (
        <div className="mt-6 p-4 bg-white/5 border-l-2 border-red-500 rounded-r-sm">
          <div className="flex items-center gap-2 mb-1">
            <ChevronRight className="w-3 h-3 text-red-500" />
            <span className="font-mono text-[10px] text-gray-500 uppercase">Aktuelles Haupt-Ziel</span>
          </div>
          <p className="text-sm text-gray-300 font-sans leading-relaxed">
            {currentGoal}
          </p>
        </div>
      )}
    </div>
  );
};
