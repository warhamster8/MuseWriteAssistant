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
    <div className="w-[850px] glass-dark border border-white/20 rounded-[40px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col">
        {/* Top bar: Category and Actions */}
        <div className="bg-white/[0.05] px-8 py-3 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--accent)]">
              {category || 'Analisi Editoriale'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); onIgnore(); }}
              className="text-slate-400 hover:text-red-400 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-3 py-1 rounded-xl hover:bg-red-500/10"
            >
              <X className="w-4 h-4" /> Ignora
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onApply(); }}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] px-8 py-2.5 rounded-2xl transition-all flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/30 active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" /> Applica Modifica
            </button>
          </div>
        </div>

        {/* Content Area: Horizontal Comparison */}
        <div className="flex divide-x divide-white/10 bg-[var(--bg-surface)]/20">
          {/* Original Side */}
          <div className="flex-1 p-8 space-y-3">
            <span className="text-[9px] font-black text-red-500/60 uppercase tracking-[0.2em] block">Testo Originale</span>
            <div className="text-[15px] text-slate-300 leading-relaxed font-serif italic bg-red-500/5 p-5 rounded-3xl border border-red-500/10 min-h-[80px] flex items-center">
              <div>
                {oldParts.map((part, i) => (
                  <span key={i} className={cn(part.removed && "bg-red-500/20 text-red-100 line-through decoration-red-500/50 px-1 rounded")}>
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Suggested Side */}
          <div className="flex-1 p-8 space-y-3">
            <span className="text-[9px] font-black text-[var(--accent)]/60 uppercase tracking-[0.2em] block">Versione Proposta</span>
            <div className="text-[15px] text-white leading-relaxed font-serif bg-[var(--accent)]/5 p-5 rounded-3xl border border-[var(--accent)]/10 min-h-[80px] flex items-center">
              <div>
                {newParts.map((part, i) => (
                  <span key={i} className={cn(part.added && "text-[var(--accent)] font-bold decoration-[var(--accent)] px-1 rounded bg-[var(--accent)]/10")}>
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Explanation */}
        {reason && (
          <div className="bg-white/[0.02] px-8 py-4 flex items-start gap-4 border-t border-white/5">
            <Sparkles className="w-5 h-5 text-[var(--accent)]/50 shrink-0 mt-0.5" />
            <p className="text-[13px] text-slate-400 font-medium leading-relaxed italic">
              {reason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
