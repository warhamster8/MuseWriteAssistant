import React from 'react';
import { X, Sparkles, Maximize2 } from 'lucide-react';
import { StructuredOutput } from './StructuredOutput';

interface DeepAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: string;
  onApply: (original: string, suggestion: string) => void;
  onReject: (original: string) => void;
  appliedSuggestions: string[];
  rejectedSuggestions: string[];
  isAnalyzing: boolean;
}

export const DeepAnalysisModal: React.FC<DeepAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onApply,
  onReject,
  appliedSuggestions,
  rejectedSuggestions,
  isAnalyzing
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 md:p-12 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-full flex flex-col glass-dark border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-[#5be9b1]/10 rounded-2xl border border-[#5be9b1]/20 shadow-lg shadow-[#5be9b1]/5">
              <Sparkles className="w-7 h-7 text-[#5be9b1]" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white leading-tight">Focus Analisi Profonda</h2>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-700 mt-1">Revisione Strutturale e Coerenza</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-4 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20 active:scale-95"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 md:p-16 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="bg-[#5be9b1]/5 border border-[#5be9b1]/10 rounded-[32px] p-8 text-sm text-slate-400 leading-relaxed italic shadow-inner">
               In questa modalità puoi analizzare ogni suggerimento con la massima concentrazione. 
               Il testo è presentato in formato grande per una rilettura critica profonda.
            </div>

            <div className="space-y-8">
              <StructuredOutput 
                text={analysis} 
                onApply={onApply} 
                onReject={onReject}
                appliedSuggestions={appliedSuggestions}
                rejectedSuggestions={rejectedSuggestions}
                isAnalyzing={isAnalyzing}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
            <div className="w-2.5 h-2.5 rounded-full bg-[#5be9b1] shadow-[0_0_10px_rgba(91,233,177,0.5)] animate-pulse" />
            <span>Revisione in tempo reale</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800 italic">
            Muse Write Assistant — Inkwell Edition
          </div>
        </div>
      </div>
    </div>
  );
};
