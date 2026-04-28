import React from 'react';
import { 
  Sparkles, 
  Wand2,
  BookOpen,
  Settings,
  BrainCircuit
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';
import { aiService } from '../lib/aiService';
import { getPlainTextForAI } from '../lib/textUtils';


export const AISidekick: React.FC = React.memo(() => {
  const content = useStore(s => s.currentSceneContent);
  const activeSceneId = useStore(s => s.activeSceneId);
  const setLastAnalyzedPhrase = useStore(s => s.setLastAnalyzedPhrase);
  const setSceneAnalysis = useStore(s => s.setSceneAnalysis);
  const activeTab = useStore(s => s.sidekickTab);
  const setActiveTab = useStore(s => s.setSidekickTab);
  const aiConfig = useStore(s => s.aiConfig);
  const parsedSuggestions = useStore(s => s.parsedSuggestions);
  
  const { addToast } = useToast();
  
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
  };

  const runAnalysis = async (tab: 'revision' | 'grammar') => {
    if (!activeSceneId || !content) return;
    
    setIsAnalyzing(true);
    setActiveTab(tab);
    
    // Clear previous for this tab
    setSceneAnalysis(activeSceneId, '', tab);
    
    const plainText = getPlainTextForAI(content);
    if (plainText.length < 5) {
      addToast("Scena troppo breve per l'analisi", "error");
      setIsAnalyzing(false);
      return;
    }

    const memoryKey = `${activeSceneId}-${tab}`;
    const lastPhrase = useStore.getState().lastAnalyzedPhrase[memoryKey] || '';

    abortControllerRef.current = new AbortController();
    
    try {
      const systemPrompt = tab === 'revision' 
        ? `Sei un editor professionista. Analizza il testo e restituisci suggerimenti in formato JSON:
           { "original": "testo esatto", "suggestion": "testo corretto", "reason": "spiegazione", "type": "stile" }`
        : `Sei un correttore bozze. Analizza il testo e restituisci suggerimenti in formato JSON:
           { "original": "testo esatto", "suggestion": "testo corretto", "reason": "spiegazione", "type": "grammatica" }`;

      const userPrompt = `Testo da analizzare:
      ${plainText}
      
      Contesto precedente:
      ${lastPhrase}`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        (chunk: string) => {
          setSceneAnalysis(activeSceneId, (prev) => prev + chunk, tab);
        },
        { signal: abortControllerRef.current.signal }
      );
      
      setLastAnalyzedPhrase(activeSceneId, plainText.slice(-200), tab);
      addToast("Analisi completata", "success");
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Analysis error:', err);
        addToast("Errore durante l'analisi", "error");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-sidebar)] border-l border-[var(--border-subtle)] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20 shadow-glow-mint">
              <BrainCircuit className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-bright)]">Sidekick</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">Potenziato dall'AI</p>
            </div>
          </div>
          <button className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-2 bg-[var(--bg-deep)]/50 mx-6 mt-6 rounded-2xl border border-[var(--border-subtle)]">
        {(['revision', 'grammar', 'lexicon'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
              activeTab === tab 
                ? "bg-[var(--accent)] text-[var(--bg-deep)] shadow-lg" 
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {activeTab === 'revision' || activeTab === 'grammar' ? (
          <div className="space-y-6">
            <div className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-subtle)] p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-[var(--accent)]/5 rounded-full flex items-center justify-center mx-auto border border-[var(--accent)]/10">
                <Sparkles className={cn("w-6 h-6 text-[var(--accent)]", isAnalyzing && "animate-spin")} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--text-bright)]">Analisi {activeTab === 'revision' ? 'Stilistica' : 'Tecnica'}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  L'AI analizzerà la tua scena in tempo reale e inserirà i suggerimenti direttamente nel testo dell'editor.
                </p>
              </div>
              
              <div className="pt-4 flex gap-3">
                {isAnalyzing ? (
                  <button 
                    onClick={handleStop}
                    className="flex-1 py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                  >
                    Ferma Analisi
                  </button>
                ) : (
                  <button 
                    onClick={() => runAnalysis(activeTab as any)}
                    className="flex-1 py-4 bg-[var(--accent)] text-[var(--bg-deep)] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-glow-mint hover:brightness-110 transition-all"
                  >
                    Inizia Analisi
                  </button>
                )}
              </div>
            </div>

            {parsedSuggestions.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[24px] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{parsedSuggestions.length} Suggerimenti</span>
                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-tighter">Pronti nell'editor</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
             <Wand2 className="w-12 h-12" />
             <p className="text-xs font-medium italic">Seleziona una funzione per iniziare...</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]/30">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <span>Modello: {aiConfig.provider.toUpperCase()}</span>
          <span>Stato: {isAnalyzing ? 'LIVE' : 'IDLE'}</span>
        </div>
      </div>
    </div>
  );
});
