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
  const [query, setQuery] = useState('');
  const [instructions, setInstructions] = useState('');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  
  const activeScene = chapters.flatMap(c => c.scenes || []).find(s => s.id === activeSceneId);
  
  const toggleChapter = (id: string) => {
    const next = new Set(expandedChapters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedChapters(next);
  };
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

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
    setParsedSuggestions([]); // Reset evidenziazioni precedenti
    
    const systemPrompt = `Sei un Capo Redattore Senior. Esegui una CORREZIONE DI BOZZE professionale.

REGOLE TASSATIVE (NON DEROGARE):
1. EVIDENZIAZIONE: Scrivi l'emoji e IMMEDIATAMENTE il testo.
   ❌ [Testo originale ESATTO]
   ✅ [Versione corretta]
2. SPAZI E PUNTEGGIATURA: Non togliere mai lo spazio dopo il punto fermo o tra le frasi. Le correzioni devono rispettare le regole grammaticali italiane.
3. NO MODIFICHE INUTILI: Non proporre correzioni se il testo originale e quello suggerito sono identici o differiscono solo per spazi bianchi.
4. QUALITÀ: Ogni intervento deve elevare lo stile o correggere errori reali.

Esempio Corretto:
❌ Era tardi.Andai a casa.
✅ Era tardi. Andai a casa. (Corregge la mancanza di spazio)

Esempio Errato (NON FARLO):
❌ Era tardi. Andai a casa.
✅ Era tardi.Andai a casa. (Togliere lo spazio è un errore)

${instructions ? `ORDINE DI SERVIZIO: "${instructions}"` : ''}`;

    let textToAnalyze = getPlainTextForAI(activeScene.content || '');
    if (textToAnalyze.length > 25000) textToAnalyze = textToAnalyze.substring(0, 25000);

    let fullAnalysisText = '';
    try {
      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `SCENA: ${activeScene.title}\n\nCONTENUTO:\n${textToAnalyze}\n\nRICHIESTA: ${customQuery || "Analisi strutturale profonda."}` }
        ],
        (chunk) => {
          fullAnalysisText += chunk;
          setParsedSuggestions(parseAIAnalysis(fullAnalysisText));
        },
        { signal: abortControllerRef.current.signal }
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') addToast(`Errore IA: ${err.message}`, 'error');
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

                  {/* Analisi nascosta dal pannello laterale su richiesta utente per focus su Editor */}
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
                expandedChapters={expandedChapters} 
                onToggleChapter={toggleChapter} 
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
