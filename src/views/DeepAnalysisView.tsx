import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ScanSearch, 
  ChevronDown, 
  ChevronRight, 
  FileText,
  Folder, 
  Zap, 
  MessageSquare,
  Sparkles,
  RefreshCw,
  Cpu,
  Activity
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNarrative } from '../hooks/useNarrative';
import { useToast } from '../components/Toast';
import { aiService } from '../lib/aiService';
import { cn } from '../lib/utils';
import { StructuredOutput } from '../components/analysis/StructuredOutput';
import { getPlainTextForAI } from '../lib/textUtils';

export const DeepAnalysisView: React.FC = () => {
  const { chapters } = useNarrative();
  const aiConfig = useStore(s => s.aiConfig);
  const setAIConfig = useStore(s => s.setAIConfig);
  const { addToast } = useToast();
  
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [query, setQuery] = useState('');
  const [instructions, setInstructions] = useState('');
  
  const selectedScene = useMemo(() => {
    return chapters.flatMap(c => c.scenes || []).find(s => s.id === selectedSceneId);
  }, [chapters, selectedSceneId]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const toggleChapter = (id: string) => {
    const next = new Set(expandedChapters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedChapters(next);
  };

  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);
  const [rejectedSuggestions, setRejectedSuggestions] = useState<string[]>([]);
  const setCurrentSceneContent = useStore(s => s.setCurrentSceneContent);
  const { updateSceneContent } = useNarrative();

  const handleReject = (original: string) => {
    setRejectedSuggestions(prev => [...prev, original]);
  };

  const applySuggestion = async (originalText: string, suggestion: string) => {
    if (!selectedScene || !selectedScene.content) return;
    
    const content = selectedScene.content;
    // Pulisce il testo originale da artefatti dell'AI (puntini, grassetti, spazi extra)
    const cleanOriginalText = originalText
      .replace(/^(\.\.\.|…)+/, '')
      .replace(/(\.\.\.|…)+$/, '')
      .replace(/\*\*/g, '') // Rimuove eventuali grassetti residui
      .trim();
    
    if (content.includes(cleanOriginalText)) {
      const newContent = content.replace(cleanOriginalText, suggestion);
      setCurrentSceneContent(newContent);
      await updateSceneContent(selectedScene.id, newContent);
      setAppliedSuggestions(prev => [...prev, originalText]);
      addToast('Modifica applicata al manoscritto', 'success');
    } else {
      console.warn('[ALIGNMENT FAILURE] Target text not found:', cleanOriginalText);
      addToast('Impossibile allineare il suggerimento nel testo', 'error');
    }
  };

  const handleProviderChange = (provider: 'groq' | 'deepseek' | 'gemini') => {
    if (provider === 'deepseek' && !aiConfig.deepseekKey) {
      addToast("DeepSeek key non trovata. Configurala in Project & AI", 'error');
      return;
    }
    setAIConfig({ provider });
    addToast(`Motore: ${provider.toUpperCase()}`, 'success');
  };

  const runAnalysis = async (customQuery?: string) => {
    if (!selectedScene || isAnalyzing) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsAnalyzing(true);
    setAnalysis('');
    setAppliedSuggestions([]);
    setRejectedSuggestions([]);
    
    let prompt = customQuery || "Esegui un'analisi critica e suggerisci miglioramenti concreti.";
    
    const systemPrompt = `Sei un editor letterario di altissimo livello. 
Il tuo compito è analizzare il testo e proporre miglioramenti CONCRETI e APPLICABILI.

FORMATO SUGGERIMENTI (Obbligatorio per modifiche al testo):
❌ Frase originale esatta
✅ Nuova versione suggerita
🏷️ Categoria (Stile, Ritmo, Dialogo, ecc.)
💡 Spiegazione del perché il cambiamento è necessario

Oltre ai suggerimenti diretti (❌/✅), fornisci analisi critiche generali usando i titoli ##.
${instructions ? `Istruzioni specifiche dell'utente: "${instructions}"` : ''}
Sii acuto, onesto e punta all'eccellenza narrativa.`;

    let textToAnalyze = getPlainTextForAI(selectedScene.content || '');
    if (textToAnalyze.length > 25000) textToAnalyze = textToAnalyze.substring(0, 25000);

    try {
      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `SCENA: ${selectedScene.title}\n\nCONTENUTO:\n${textToAnalyze}\n\nRICHIESTA: ${prompt}` }
        ],
        (chunk) => setAnalysis(prev => prev + chunk),
        { signal: abortControllerRef.current.signal }
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[ANALYSIS ERROR]', err);
      setAnalysis(`❌ Errore di Connessione: ${err.message === 'Failed to fetch' ? 'Impossibile contattare il server AI. Verifica la tua connessione o la chiave API.' : err.message}`);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-full gap-4 relative animate-in fade-in duration-700">
      {/* Colonna Sinistra: Selettore Scene */}
      <div className="w-80 flex-shrink-0 glass rounded-[40px] flex flex-col border border-[var(--border-subtle)] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/10">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 bg-[var(--accent-soft)] rounded-2xl border border-[var(--accent)]/20">
              <ScanSearch className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-[var(--text-bright)] leading-tight uppercase">Navigator</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]/50">Seleziona Contesto</p>
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
                  expandedChapters.has(chapter.id) ? "bg-[var(--accent-soft)] border-[var(--border-subtle)]" : "border-transparent hover:bg-[var(--bg-surface)]/20"
                )}
              >
                {expandedChapters.has(chapter.id) ? <ChevronDown className="w-3.5 h-3.5 text-[var(--accent)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                <Folder className={cn("w-4 h-4", expandedChapters.has(chapter.id) ? "text-[var(--accent)]" : "text-[var(--text-secondary)]")} />
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)] truncate">{chapter.title}</span>
              </div>

              {expandedChapters.has(chapter.id) && (
                <div className="pl-6 space-y-1 border-l border-[var(--border-subtle)] ml-4">
                  {chapter.scenes?.map(scene => (
                    <div 
                      key={scene.id}
                      onClick={() => setSelectedSceneId(scene.id)}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border",
                        selectedSceneId === scene.id 
                          ? "bg-[var(--accent)] text-[var(--bg-deep)] border-transparent shadow-lg shadow-[var(--accent-soft)]" 
                          : "text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] border-transparent"
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
      <div className="flex-1 glass rounded-[40px] flex flex-col border border-[var(--border-subtle)] overflow-hidden shadow-2xl relative">
        <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]/10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black tracking-tighter text-[var(--text-bright)] uppercase italic">Deep Analysis</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("w-2 h-2 rounded-full", selectedScene ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--bg-surface)]")} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent)]">
                  {selectedScene ? `Analisi: ${selectedScene.title}` : 'In attesa di selezione...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Selettore Provider */}
            <div className="flex items-center bg-[var(--bg-deep)]/40 border border-[var(--border-subtle)] p-1.5 rounded-2xl gap-1">
              <button
                onClick={() => handleProviderChange('groq')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  aiConfig.provider === 'groq' 
                    ? "bg-[var(--accent)] text-[var(--bg-deep)] shadow-lg shadow-[var(--accent-soft)]" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--accent-soft)]"
                )}
              >
                <Zap className="w-3 h-3" />
                <span>Groq</span>
              </button>
              <button
                onClick={() => handleProviderChange('deepseek')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  aiConfig.provider === 'deepseek' 
                    ? "bg-[var(--accent)] text-[var(--bg-deep)] shadow-lg shadow-[var(--accent-soft)]" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--accent-soft)]"
                )}
              >
                <Cpu className="w-3 h-3" />
                <span>DeepSeek</span>
              </button>
              <button
                onClick={() => handleProviderChange('gemini')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  aiConfig.provider === 'gemini' 
                    ? "bg-[var(--accent)] text-[var(--bg-deep)] shadow-lg shadow-[var(--accent-soft)]" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--accent-soft)]"
                )}
              >
                <Activity className="w-3 h-3" />
                <span>Gemini</span>
              </button>
            </div>

            <div className="w-[1px] h-8 bg-[var(--accent-soft)]" />

            <div className="flex items-center gap-4">
              {isAnalyzing && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                  <RefreshCw className="w-3 h-3 animate-spin text-[var(--accent)]" />
                  <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">IA Elaborando...</span>
                </div>
              )}
              <button 
                onClick={() => runAnalysis()}
                disabled={!selectedScene || isAnalyzing}
                className="px-8 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:grayscale shadow-2xl shadow-[var(--accent-soft)] active:scale-95 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Scansione Profonda
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-10 scrollbar-hide">
          {!selectedScene ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
               <div className="w-24 h-24 rounded-full bg-[var(--accent-soft)] flex items-center justify-center border border-[var(--border-subtle)]">
                  <ScanSearch className="w-10 h-10 text-[var(--text-bright)]" />
               </div>
               <div>
                  <h3 className="text-xl font-black uppercase tracking-widest text-[var(--text-bright)]">Pronto all'Indagine</h3>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mt-2">Dalla colonna sinistra, seleziona la scena da sottoporre ad analisi investigativa</p>
               </div>
            </div>
          ) : (
            <>
              {/* Box Istruzioni IA */}
              <div className="max-w-4xl mx-auto animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-4 text-[var(--accent)]/60">
                   <MessageSquare className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em]">Istruzioni Specifiche per l'Indagine</span>
                </div>
                <textarea 
                  className="w-full h-24 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[28px] p-6 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/30 focus:bg-[var(--bg-surface)]/10 transition-all resize-none shadow-inner placeholder:text-[var(--text-muted)]"
                  placeholder="Es: Focalizzati sulla tensione tra i due protagonisti, o analizza se il finale è coerente con la premessa..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              {analysis ? (
                <div className="space-y-8 max-w-4xl mx-auto">
                   <div className="p-8 bg-[var(--accent-soft)] border border-[var(--accent)]/10 rounded-[32px] shadow-inner animate-in slide-in-from-bottom-4">
                       <StructuredOutput 
                        text={analysis} 
                        isAnalyzing={isAnalyzing} 
                        onApply={applySuggestion}
                        onReject={handleReject}
                        appliedSuggestions={appliedSuggestions}
                        rejectedSuggestions={rejectedSuggestions}
                        fullView={true}
                       />
                   </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40 py-20">
                  {isAnalyzing ? (
                    <>
                      <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)] animate-spin mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent)] animate-pulse">Sincronizzazione Modulo IA...</p>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest">L'elaborazione profonda può richiedere alcuni secondi</p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-12 h-12 text-[var(--accent)] animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-secondary)]">Avvia il modulo di scansione per approfondire questo segmento</p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]/40 backdrop-blur-xl">
           <div className="max-w-4xl mx-auto relative group">
              <input 
                type="text"
                placeholder="Poni una domanda specifica su questa scena... (es: 'Qual è il sottotesto emotivo qui?')"
                className="w-full bg-[var(--bg-surface)]/10 border border-[var(--border-subtle)] rounded-[28px] py-6 pl-8 pr-32 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/30 focus:bg-[var(--bg-surface)]/20 transition-all placeholder:text-[var(--text-muted)] shadow-inner"
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
                className="absolute right-4 top-1/2 -translate-y-1/2 px-6 py-3 bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--accent)] rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-[var(--accent)]/30 disabled:opacity-0"
              >
                Invia Indagine
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
