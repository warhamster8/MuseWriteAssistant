import React from 'react';
import { Zap, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AISuggestion } from '../lib/aiParsing';
import { computeDiff } from './analysis/StructuredOutput';

interface InTextSuggestionCardProps {
  suggestion: AISuggestion;
  onApply: () => void;
  onIgnore: () => void;
  onClose: () => void;
}

export const InTextSuggestionCard: React.FC<Omit<InTextSuggestionCardProps, 'onClose'>> = ({
  suggestion,
  onApply,
  onIgnore,
}) => {
  const { original, suggestion: suggested, reason, category, type } = suggestion;
  const { oldParts, newParts } = suggested 
    ? computeDiff(original, suggested) 
    : { oldParts: [{ value: original, removed: false }], newParts: [] };

  return (
    <div className="w-[440px] bg-[var(--bg-surface)] backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[32px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-400 flex flex-col">
      {/* Rationale / Explanation - PRIMARY ELEMENT */}
      {reason && (
        <div className="px-6 py-5 bg-[var(--accent-soft)] border-b border-[var(--border-subtle)] flex items-start gap-4">
          <div className="p-2 bg-[var(--accent)]/10 rounded-xl">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="text-[14px] text-[var(--text-bright)] font-sans font-bold leading-relaxed">
            {reason}
          </p>
        </div>
      )}

      {/* Comparison Section */}
      <div className="flex flex-col bg-black/5 divide-y divide-[var(--border-subtle)]">
        {/* Original */}
        <div className="p-6 relative group bg-rose-500/[0.03]">
          <div className="text-[13px] text-[var(--text-muted)] leading-relaxed font-serif italic line-through decoration-[var(--text-muted)]/30">
            {oldParts.map((part, i) => (
              <span key={i} className={cn(part.removed && "bg-rose-500/10 text-rose-400/80 px-0.5 rounded")}>
                {part.value}
              </span>
            ))}
          </div>
          <span className="absolute top-2 right-4 text-[7px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 font-sans">Attuale</span>
        </div>

        {/* Proposed */}
        <div className="p-6 relative group bg-emerald-500/[0.03]">
          <div className="text-[15px] text-[var(--text-bright)] leading-relaxed font-serif whitespace-pre-line">
            {newParts.map((part, i) => (
              <span key={i} className={cn(part.added && "bg-emerald-500/20 text-emerald-400 font-bold px-0.5 rounded")}>
                {part.value}
              </span>
            ))}
          </div>
          <span className="absolute top-2 right-4 text-[7px] font-black uppercase tracking-widest text-emerald-400 opacity-50 font-sans">Suggerito</span>
        </div>
      </div>

      {/* Footer - Actions */}
      <div className="px-6 py-4 flex items-center justify-between bg-[var(--bg-surface)]/50 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            type === 'coerenza' ? "bg-amber-400" :
            type === 'taglio' ? "bg-rose-400" :
            type === 'grammatica' ? "bg-emerald-400" :
            "bg-blue-400"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] font-sans">
            {category || 'Revisione'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onIgnore(); }}
            className="px-4 py-2 text-[var(--text-muted)] hover:text-rose-400 transition-all text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500/10 font-sans"
          >
            Scarta
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onApply(); }}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-glow-mint active:scale-95 font-sans"
          >
            <Zap className="w-3.5 h-3.5 fill-current" /> Applica
          </button>
        </div>
      </div>
    </div>
  );
};

