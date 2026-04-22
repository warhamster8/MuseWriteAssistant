import React, { useState, useMemo } from 'react';
import { 
  ScanSearch, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Folder, 
  Zap, 
  MessageSquare,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNarrative } from '../hooks/useNarrative';
import { aiService } from '../lib/aiService';
import { cn } from '../lib/utils';
import { StructuredOutput } from '../components/analysis/StructuredOutput';

export const DeepAnalysisView: React.FC = () => {
  const { chapters } = useNarrative();
  const aiConfig = useStore(s => s.aiConfig);
  
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [query, setQuery] = useState('');
  const [instructions, setInstructions] = useState('');
  
  const selectedScene = useMemo(() => {
    return chapters.flatMap(c => c.scenes || []).find(s => s.id === selectedSceneId);
  }, [chapters, selectedSceneId]);

  const toggleChapter = (id: string) => {
    const next = new Set(expandedChapters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedChapters(next);
  };

  const runAnalysis = async (customQuery?: string) => {
    if (!selectedScene || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAnalysis('');
    
    let prompt = customQuery || "Analizza questa scena in profondità.";
    
    const systemPrompt = `Sei un esperto analista letterario. Analizzerai la scena fornita per fornire un'analisi di contesto approfondita. 
    ${instructions ? `Segui queste istruzioni specifiche dell'utente: "${instructions}"` : ''}
    Usa un tono professionale, acuto e costruttivo. 
    Formatta l'output in modo strutturato.`;

    try {
      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `SCENA: ${selectedScene.title}\n\nCONTENUTO:\n${selectedScene.content}\n\nRICHIESTA: ${prompt}` }
        ],
        (chunk) => setAnalysis(prev => prev + chunk)
      );
    } catch (err: any) {
      setAnalysis(`❌ Errore: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full gap-4 relative animate-in fade-in duration-700">
      {/* Colonna Sinistra: Selettore Scene */}
      <div className="w-80 flex-shrink-0 glass rounded-[40px] flex flex-col border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/10 bg-white/[0.01]">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 bg-[#5be9b1]/10 rounded-2xl border border-[#5be9b1]/20">
              <ScanSearch className="w-6 h-6 text-[#5be9b1]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white leading-tight uppercase">Navigator</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5be9b1]/50">Seleziona Contesto</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {chapters.map(chapter => (
            <div key={chapter.id} className="space-y-2">
              <div 
                onClick={() => toggleChapter(chapter.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border",
                  expandedChapters.has(chapter.id) ? "bg-white/5 border-white/10" : "border-transparent hover:bg-white/[0.02]"
                )}
              >
                {expandedChapters.has(chapter.id) ? <ChevronDown className="w-3.5 h-3.5 text-[#5be9b1]" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-700" />}
                <Folder className={cn("w-4 h-4", expandedChapters.has(chapter.id) ? "text-[#5be9b1]" : "text-slate-700")} />
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 truncate">{chapter.title}</span>
              </div>

              {expandedChapters.has(chapter.id) && (
                <div className="pl-6 space-y-1 border-l border-white/5 ml-4">
                  {chapter.scenes?.map(scene => (
                    <div 
                      key={scene.id}
                      onClick={() => setSelectedSceneId(scene.id)}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border",
                        selectedSceneId === scene.id 
                          ? "bg-[#5be9b1] text-[#0b0e11] border-transparent shadow-lg shadow-[#5be9b1]/20" 
                          : "text-slate-600 hover:bg-white/5 border-transparent"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 opacity-50" />
                      <span className="text-[11px] font-bold uppercase tracking-tight truncate">{scene.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Colonna Destra: Analizzatore IA */}
      <div className="flex-1 glass rounded-[40px] flex flex-col border border-white/5 overflow-hidden shadow-2xl relative">
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">Deep Analysis</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("w-2 h-2 rounded-full", selectedScene ? "bg-[#5be9b1] animate-pulse" : "bg-slate-800")} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5be9b1]">
                  {selectedScene ? `Analisi: ${selectedScene.title}` : 'In attesa di selezione...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAnalyzing && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5be9b1]/10 border border-[#5be9b1]/20">
                <RefreshCw className="w-3 h-3 animate-spin text-[#5be9b1]" />
                <span className="text-[10px] font-black text-[#5be9b1] uppercase tracking-widest">IA Elaborando...</span>
              </div>
            )}
            <button 
              onClick={() => runAnalysis()}
              disabled={!selectedScene || isAnalyzing}
              className="px-8 py-3 bg-[#5be9b1] hover:bg-[#4ade80] text-[#0b0e11] rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:grayscale shadow-2xl shadow-[#5be9b1]/20 active:scale-95 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Scansione Profonda
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-10 scrollbar-hide">
          {!selectedScene ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
               <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <ScanSearch className="w-10 h-10 text-white" />
               </div>
               <div>
                  <h3 className="text-xl font-black uppercase tracking-widest text-white">Pronto all'Indagine</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Dalla colonna sinistra, seleziona la scena da sottoporre ad analisi investigativa</p>
               </div>
            </div>
          ) : (
            <>
              {/* Box Istruzioni IA */}
              <div className="max-w-4xl mx-auto animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-4 text-[#5be9b1]/60">
                   <MessageSquare className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em]">Istruzioni Specifiche per l'Indagine</span>
                </div>
                <textarea 
                  className="w-full h-24 bg-white/[0.02] border border-white/10 rounded-[28px] p-6 text-xs text-slate-300 focus:outline-none focus:border-[#5be9b1]/30 focus:bg-white/[0.04] transition-all resize-none shadow-inner placeholder:text-slate-800"
                  placeholder="Es: Focalizzati sulla tensione tra i due protagonisti, o analizza se il finale è coerente con la premessa..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              {analysis ? (
                <div className="space-y-8 max-w-4xl mx-auto">
                   <div className="p-8 bg-[#5be9b1]/5 border border-[#5be9b1]/10 rounded-[32px] shadow-inner animate-in slide-in-from-bottom-4">
                      <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
                   </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                  <Sparkles className="w-12 h-12 text-[#5be9b1] animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Avvia il modulo di scansione per approfondire questo segmento</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-8 border-t border-white/10 bg-black/20 backdrop-blur-xl">
           <div className="max-w-4xl mx-auto relative group">
              <input 
                type="text"
                placeholder="Poni una domanda specifica su questa scena... (es: 'Qual è il sottotesto emotivo qui?')"
                className="w-full bg-white/[0.03] border border-white/10 rounded-[28px] py-6 pl-8 pr-32 text-sm text-white focus:outline-none focus:border-[#5be9b1]/30 focus:bg-white/[0.05] transition-all placeholder:text-slate-700 shadow-inner"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    runAnalysis(query);
                    setQuery('');
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (query.trim()) {
                    runAnalysis(query);
                    setQuery('');
                  }
                }}
                disabled={!selectedScene || !query.trim() || isAnalyzing}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-6 py-3 bg-white/5 hover:bg-[#5be9b1]/20 text-slate-500 hover:text-[#5be9b1] rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-[#5be9b1]/30 disabled:opacity-0"
              >
                Invia Indagine
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
