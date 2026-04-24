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
    <div className="w-[800px] bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[48px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.25)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-6 duration-700">
      <div className="flex flex-col">
        {/* Top Header */}
        <div className="px-10 py-6 flex items-center justify-between bg-gradient-to-r from-[var(--accent)]/5 to-transparent border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-[var(--accent)] shadow-[0_0_20px_var(--accent)] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent)]/60">Analisi Muse</span>
              <span className="text-[14px] font-black uppercase tracking-[0.1em] text-slate-800 dark:text-white">
                {category || 'Perfezionamento'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); onIgnore(); }}
              className="px-6 py-2.5 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-all text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-500/5"
            >
              Ignora
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onApply(); }}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-10 py-3.5 rounded-[24px] transition-all flex items-center gap-3 text-[12px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(99,102,241,0.4)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.5)] active:scale-95 group"
            >
              <Zap className="w-5 h-5 fill-current group-hover:animate-bounce" /> Applica Modifiche
            </button>
          </div>
        </div>

        {/* Comparison Section */}
        <div className="flex p-8 gap-8 bg-white/30 dark:bg-black/10">
          {/* Left: Original */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between px-2">
               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Originale</span>
               <div className="h-[1px] flex-1 mx-4 bg-slate-200 dark:bg-white/5" />
            </div>
            <div className="bg-slate-50/50 dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 min-h-[120px] flex items-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500/20" />
              <div className="text-[17px] text-slate-600 dark:text-slate-300 leading-relaxed font-serif italic">
                {oldParts.map((part, i) => (
                  <span key={i} className={cn(part.removed && "bg-red-500/10 text-red-500 line-through decoration-red-500/30 px-1.5 rounded-lg mx-0.5")}>
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Proposal */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between px-2">
               <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest">Proposta</span>
               <div className="h-[1px] flex-1 mx-4 bg-[var(--accent)]/20" />
            </div>
            <div className="bg-[var(--accent)]/[0.03] dark:bg-[var(--accent)]/[0.07] p-8 rounded-[32px] border border-[var(--accent)]/10 dark:border-[var(--accent)]/20 min-h-[120px] flex items-center relative overflow-hidden shadow-[inset_0_0_40px_rgba(99,102,241,0.02)]">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]/40" />
              <div className="text-[17px] text-slate-900 dark:text-white leading-relaxed font-serif">
                {newParts.map((part, i) => (
                  <span key={i} className={cn(part.added && "bg-[var(--accent)]/10 text-[var(--accent)] font-bold px-1.5 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.1)]")}>
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reasoning Footer */}
        {reason && (
          <div className="px-10 py-6 bg-slate-50/80 dark:bg-black/20 flex items-start gap-5 border-t border-slate-100 dark:border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
               <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="space-y-1">
               <p className="text-[14px] text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                 {reason}
               </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
