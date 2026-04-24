import React from 'react';
import { Zap, X, Sparkles } from 'lucide-react';
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
    <div className="w-80 glass-dark border border-white/20 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="bg-white/[0.05] px-5 py-3.5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
            {category || 'Idea'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onIgnore(); }}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/10"
            title="Ignora"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onApply(); }}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider"
          >
            <Zap className="w-3.5 h-3.5" /> Applica
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Original (Diff) */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl px-4 py-3 text-xs text-red-500/80 leading-relaxed font-serif italic">
          {oldParts.map((part, i) => (
            <span key={i} className={cn(part.removed && "bg-red-500/20 text-red-400 line-through px-0.5 rounded")}>
              {part.value}
            </span>
          ))}
        </div>

        {/* Suggestion (Diff) */}
        <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-2xl px-4 py-3 text-xs text-slate-100 leading-relaxed font-serif">
          {newParts.map((part, i) => (
            <span key={i} className={cn(part.added && "bg-[var(--accent)]/20 text-[var(--accent)] font-bold px-0.5 rounded")}>
              {part.value}
            </span>
          ))}
        </div>

        {/* Reason */}
        {reason && (
          <div className="pt-2 flex items-start gap-3">
             <Sparkles className="w-4 h-4 text-[var(--accent)]/40 shrink-0 mt-0.5" />
             <p className="text-[11px] text-slate-400 italic leading-relaxed">
               {reason}
             </p>
          </div>
        )}
      </div>

      {/* Footer decorative */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
    </div>
  );
};
