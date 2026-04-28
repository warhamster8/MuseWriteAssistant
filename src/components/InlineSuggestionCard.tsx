import React from 'react';
import { Check, X, Trash2, Zap } from 'lucide-react';
import type { AISuggestion } from '../lib/aiParsing';
import { cn } from '../lib/utils';

interface Props {
  suggestion: AISuggestion;
  onApply: () => void;
  onIgnore: () => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export const InlineSuggestionCard: React.FC<Props> = ({ suggestion, onApply, onIgnore, onClose, position }) => {
  return (
    <div 
      className="fixed z-[100] w-80 glass-dark rounded-[24px] border border-[var(--accent)]/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        transform: 'translate(-50%, -110%)' // Position above the text
      }}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              suggestion.type === 'grammatica' ? 'bg-emerald-500' :
              suggestion.type === 'taglio' ? 'bg-rose-500' :
              suggestion.type === 'coerenza' ? 'bg-amber-500' : 'bg-indigo-500'
            )} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)] opacity-80">
              {suggestion.category || 'Suggerimento AI'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-[11px] text-[var(--text-muted)] line-through decoration-rose-500/30 italic px-1">
            "{suggestion.original}"
          </div>
          <div className="text-[13px] text-[var(--text-bright)] leading-relaxed font-serif bg-white/5 p-3 rounded-xl border border-white/5">
            {suggestion.suggestion}
          </div>
        </div>

        {suggestion.reason && (
          <div className="flex gap-2 p-3 bg-[var(--accent-soft)]/50 rounded-xl border border-[var(--accent)]/10">
            <Zap className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
              {suggestion.reason}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button 
            onClick={onApply}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--accent)] text-[var(--bg-deep)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-glow-mint"
          >
            <Check className="w-3.5 h-3.5" />
            Applica
          </button>
          <button 
            onClick={onIgnore}
            className="p-3 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all border border-transparent hover:border-rose-400/20"
            title="Ignora"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Little arrow pointing down */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 glass-dark border-r border-b border-[var(--accent)]/30 rotate-45" />
    </div>
  );
};
