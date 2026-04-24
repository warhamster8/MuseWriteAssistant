import React, { useState, useRef, useEffect } from 'react';
import { 
  ScanSearch, 
  Zap, 
  RefreshCw,
  Cpu,
  Activity
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNarrative } from '../hooks/useNarrative';
import { useToast, ToastContainer } from '../components/Toast';
import { aiService } from '../lib/aiService';
import { cn } from '../lib/utils';
import { StructuredOutput } from '../components/analysis/StructuredOutput';
import { getPlainTextForAI } from '../lib/textUtils';
import { parseAIAnalysis } from '../lib/aiParsing';
import { ManuscriptNavigator } from './narrative/ManuscriptNavigator';
import { EditorWorkspace } from './narrative/EditorWorkspace';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * DeepAnalysisView: Refactoring per utilizzare lo stesso layout della scheda Narrative.
 * Si concentra SOLO sulla scena selezionata.
 */
export const DeepAnalysisView: React.FC = () => {
  const { chapters, updateSceneContent, renameChapter, renameScene, deleteChapter, deleteScene, updateSceneMetadata } = useNarrative();
  const aiConfig = useStore(s => s.aiConfig);
  const setAIConfig = useStore(s => s.setAIConfig);
  const activeSceneId = useStore(s => s.activeSceneId);
  const setActiveSceneId = useStore(s => s.setActiveSceneId);
  const isNavigatorOpen = useStore(s => s.isNavigatorOpen);
  const setNavigatorOpen = useStore(s => s.setNavigatorOpen);
  const isSidekickOpen = useStore(s => s.isSidekickOpen);
  const setSidekickOpen = useStore(s => s.setSidekickOpen);
  const isZenMode = useStore(s => s.isZenMode);
  const setParsedSuggestions = useStore(s => s.setParsedSuggestions);
  const { addToast } = useToast();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [query, setQuery] = useState('');
  const [instructions, setInstructions] = useState('');
  
  const activeScene = chapters.flatMap(c => c.scenes || []).find(s => s.id === activeSceneId);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);
  const [rejectedSuggestions, setRejectedSuggestions] = useState<string[]>([]);

  const applySuggestion = async (originalText: string, suggestion: string) => {
    if (!activeScene || !activeScene.content) return;
    const content = activeScene.content;
    const cleanOriginalText = originalText.replace(/^(\.\.\.|…)+/, '').replace(/(\.\.\.|…)+$/, '').replace(/\*\*/g, '').trim();
    
    if (content.includes(cleanOriginalText)) {
      const newContent = content.replace(cleanOriginalText, suggestion);
      await updateSceneContent(activeScene.id, newContent);
      setAppliedSuggestions(prev => [...prev, originalText]);
      addToast('Modifica applicata con successo', 'success');
    } else {
      addToast('Allineamento testo fallito', 'error');
    }
  };

  const handleProviderChange = (provider: 'groq' | 'deepseek' | 'gemini') => {
    const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : (provider === 'gemini' ? 'gemini-1.5-flash' : 'deepseek-chat');
    setAIConfig({ provider, model });
    addToast(`Motore: ${provider.toUpperCase()}`, 'success');
  };

  const runAnalysis = async (customQuery?: string) => {
    if (!activeScene || isAnalyzing) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsAnalyzing(true);
    setAnalysis('');
    setParsedSuggestions([]); // Reset evidenziazioni precedenti
    
    const systemPrompt = `Sei un Capo Redattore Senior di una prestigiosa casa editrice letteraria. 
Il tuo compito è eseguire una CORREZIONE DI BOZZE e un EDITING PROFESSIONALE sulla scena, proprio come farebbe un editor in carne ed ossa.

Sii estremamente pignolo e rigoroso. Cerca:
1. Refusi, errori ortografici e punteggiatura errata.
2. Ripetizioni cacofoniche o vicinanze di parole simili.
3. Debolezze nel ritmo (pacing) e nella struttura delle frasi.
4. Incoerenze logiche o descrittive.
5. "Clutter" (parole superflue) che appesantiscono la lettura.

FORMATO OBBLIGATORIO PER OGNI CORREZIONE (per permettere l'evidenziazione nell'editor):
❌ Testo originale esatto (senza abbreviazioni, deve coincidere perfettamente)
✅ Nuova versione suggerita (completa e rifinita)
🏷️ Categoria (es: Refuso, Stile, Ritmo, Logica)
💡 Nota Editoriale: Spiega professionalmente perché questa modifica è necessaria e come migliora l'esperienza del lettore.

${instructions ? `ORDINE DI SERVIZIO (Istruzioni specifiche dell'autore): "${instructions}"` : ''}
Il tuo obiettivo è elevare il testo alla qualità da pubblicazione. Sii onesto, diretto e spietato se necessario, ma sempre costruttivo.`;

    let textToAnalyze = getPlainTextForAI(activeScene.content || '');
    if (textToAnalyze.length > 25000) textToAnalyze = textToAnalyze.substring(0, 25000);

    try {
      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `SCENA: ${activeScene.title}\n\nCONTENUTO:\n${textToAnalyze}\n\nRICHIESTA: ${customQuery || "Analisi strutturale profonda."}` }
        ],
        (chunk) => {
          setAnalysis(prev => {
            const next = prev + chunk;
            setParsedSuggestions(parseAIAnalysis(next));
            return next;
          });
        },
        { signal: abortControllerRef.current.signal }
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') setAnalysis(`❌ Errore IA: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden animate-in fade-in duration-700 bg-[var(--bg-deep)] p-2 gap-4">
      {/* Colonna Laterale: Navigator o Pannello Analisi */}
      <AnimatePresence mode="wait">
        {(isNavigatorOpen || isSidekickOpen) && !isZenMode && (
          <motion.div
            key={isSidekickOpen ? 'analysis' : 'navigator'}
            initial={{ width: 0, opacity: 0, x: -20 }}
            animate={{ width: 'auto', opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="h-full flex-shrink-0 origin-left"
          >
            {isSidekickOpen ? (
              <div className="w-full md:w-56 xl:w-72 2xl:w-80 h-full glass rounded-[32px] flex flex-col shadow-lg border border-[var(--border-subtle)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ScanSearch className="w-4 h-4 text-[var(--accent)]" />
                    <h2 className="text-xs font-black uppercase tracking-tight text-[var(--text-bright)]">Deep Analysis</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setSidekickOpen(false);
                      setNavigatorOpen(true);
                    }} 
                    className="text-[9px] font-black uppercase text-[var(--accent)] hover:text-[var(--text-bright)] transition-colors"
                  >
                    Navigator
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 bg-[var(--bg-deep)]/40 border border-[var(--border-subtle)] p-1 rounded-xl gap-1">
                      {(['groq', 'deepseek', 'gemini'] as const).map(p => (
                        <button 
                          key={p} 
                          onClick={() => handleProviderChange(p)} 
                          className={cn(
                            "py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all", 
                            aiConfig.provider === p ? "bg-[var(--accent)] text-[var(--bg-deep)]" : "text-[var(--text-muted)] hover:text-[var(--text-bright)]"
                          )}
                        >
                          {p === 'gemini' ? <Activity className="w-2.5 h-2.5 mx-auto" /> : p === 'groq' ? <Zap className="w-2.5 h-2.5 mx-auto" /> : <Cpu className="w-2.5 h-2.5 mx-auto" />}
                        </button>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                       <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Focus Istruzioni</span>
                       <textarea 
                        className="w-full h-20 bg-[var(--bg-card)]/30 border border-[var(--border-subtle)] rounded-xl p-3 text-[10px] text-[var(--text-primary)] focus:outline-none resize-none placeholder:opacity-30"
                        placeholder="Es: Analizza il sottotesto emotivo..."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                      />
                    </div>

                    <button 
                      onClick={() => runAnalysis()}
                      disabled={!activeScene || isAnalyzing}
                      className="w-full py-4 bg-[var(--accent)] text-[var(--bg-deep)] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[var(--accent)]/10 disabled:opacity-30"
                    >
                      {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      <span>{isAnalyzing ? 'Elaborazione...' : 'Avvia Indagine'}</span>
                    </button>
                  </div>

                  {analysis && (
                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                      <StructuredOutput 
                        text={analysis} 
                        isAnalyzing={isAnalyzing} 
                        onApply={applySuggestion} 
                        onReject={(t) => setRejectedSuggestions(p => [...p, t])} 
                        appliedSuggestions={appliedSuggestions} 
                        rejectedSuggestions={rejectedSuggestions} 
                      />
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]/20">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Chiedi all'IA..."
                      className="w-full bg-[var(--bg-surface)]/20 border border-[var(--border-subtle)] rounded-xl py-3 pl-4 pr-10 text-[10px] focus:outline-none focus:border-[var(--accent)]/30 transition-all"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && runAnalysis(query)}
                    />
                    <button 
                      onClick={() => runAnalysis(query)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--accent)] hover:scale-110 transition-transform"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <ManuscriptNavigator 
                chapters={chapters} 
                activeSceneId={activeSceneId} 
                onSelectScene={(id) => { 
                  setActiveSceneId(id); 
                  setSidekickOpen(true); 
                  setNavigatorOpen(false);
                }} 
                expandedChapters={new Set()} 
                onToggleChapter={() => {}} 
                onCreateChapter={() => {}} 
                onCreateScene={() => {}} 
                onReorder={() => {}} 
                onRenameChapter={renameChapter} 
                onRenameScene={renameScene} 
                onDeleteChapter={deleteChapter} 
                onDeleteScene={deleteScene} 
                onToggleSceneExclusion={(id, ex) => updateSceneMetadata(id, { exclude_from_timeline: ex })} 
                onExport={() => {}} 
                isExporting={false} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Area Editor Centrale */}
      <EditorWorkspace activeScene={activeScene} onUpdateContent={updateSceneContent} />
      
      <ToastContainer />
    </div>
  );
};
