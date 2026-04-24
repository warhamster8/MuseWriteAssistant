import React from 'react';
import { Zap, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AISuggestion } from '../lib/aiParsing';
import { computeDiff } from './analysis/StructuredOutput';

interface InTextSuggestionCardProps {
  suggestion: AISuggestion;
  onApply: () => void;
  onIgnore: () => void;
}

export const InTextSuggestionCard: React.FC<InTextSuggestionCardProps> = ({
  suggestion,
  onApply,
  onIgnore,
}) => {
  const { original, suggestion: suggested, reason, category } = suggestion;
  const { oldParts, newParts } = suggested 
    ? computeDiff(original, suggested) 
    : { oldParts: [{ value: original, removed: false }], newParts: [] };

  return (
    <div className="w-[750px] bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-3xl border border-white/50 dark:border-white/10 rounded-[32px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.2)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2 duration-400 flex flex-col border-b-4 border-b-[var(--accent)]/30">
      {/* Header - Ultra Compact */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-gradient-to-r from-[var(--accent)]/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white">
            {category || 'Revisione'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onIgnore(); }}
            className="px-3 py-1.5 text-slate-400 hover:text-red-500 transition-all text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500/5"
          >
            Ignora
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onApply(); }}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--accent)]/20 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-current" /> Applica
          </button>
        </div>
      </div>

      {/* Comparison - Minimalist */}
      <div className="flex bg-white/20 dark:bg-black/5 divide-x divide-black/5 dark:divide-white/5">
        {/* Original */}
        <div className="flex-1 p-5 relative group">
          <div className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed font-serif italic line-clamp-3">
            {oldParts.map((part, i) => (
              <span key={i} className={cn(part.removed && "bg-red-500/10 text-red-500 line-through decoration-red-500/20 px-0.5 rounded")}>
                {part.value}
              </span>
            ))}
          </div>
          <span className="absolute top-2 right-4 text-[7px] font-bold uppercase tracking-tighter opacity-20 group-hover:opacity-100 transition-opacity">Originale</span>
        </div>

        {/* Proposal */}
        <div className="flex-1 p-5 relative group">
          <div className="text-[14px] text-slate-900 dark:text-white leading-relaxed font-serif line-clamp-6 whitespace-pre-line">
            {newParts.map((part, i) => (
              <span key={i} className={cn(part.added && "bg-[var(--accent)]/10 text-[var(--accent)] font-bold px-0.5 rounded")}>
                {part.value}
              </span>
            ))}
          </div>
          <span className="absolute top-2 right-4 text-[7px] font-bold uppercase tracking-tighter text-[var(--accent)] opacity-20 group-hover:opacity-100 transition-opacity">Proposta</span>
        </div>
      </div>

      {/* Reasoning - Single Line */}
      {reason && (
        <div className="px-6 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5 flex items-center gap-3">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]/50" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic truncate">
            {reason}
          </p>
        </div>
      )}
    </div>
  );
};
