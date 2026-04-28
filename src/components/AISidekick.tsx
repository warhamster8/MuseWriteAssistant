import React from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Zap,
  RefreshCw,
  PenLine,
  Wand2,
  BookOpen,
  Languages,
  Quote,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useNarrative } from '../hooks/useNarrative';
import { useToast } from './Toast';
import { aiService } from '../lib/aiService';
import { findMatchInText } from '../lib/tiptap/matchUtils';
import { StructuredOutput } from './analysis/StructuredOutput';
import { getPlainTextForAI } from '../lib/textUtils';
import { parseAIAnalysis } from '../lib/aiParsing';
import { diffWords } from '../lib/diffUtils';


type SidekickTab = 'revision' | 'grammar' | 'braindump' | 'transformer' | 'lexicon';

export const AISidekick: React.FC = React.memo(() => {
  const content = useStore(s => s.currentSceneContent);
  const activeSceneId = useStore(s => s.activeSceneId);
  const setCurrentSceneContent = useStore(s => s.setCurrentSceneContent);
  const lastAnalyzedPhrase = useStore(s => s.lastAnalyzedPhrase);
  const setLastAnalyzedPhrase = useStore(s => s.setLastAnalyzedPhrase);
  const sceneAnalysis = useStore(s => s.sceneAnalysis);
  const setSceneAnalysis = useStore(s => s.setSceneAnalysis);
  const activeSelection = useStore(s => s.activeSelection);
  const aiConfig = useStore(s => s.aiConfig);
  const parsedSuggestions = useStore(s => s.parsedSuggestions);
  const suggestionIndex = useStore(s => s.suggestionIndex);
  const totalSuggestionsCount = useStore(s => s.totalSuggestionsCount);
  const setSuggestionIndex = useStore(s => s.setSuggestionIndex);
  const addIgnoredSuggestion = useStore(s => s.addIgnoredSuggestion);

  const setHighlightedText = useStore(s => s.setHighlightedText);
  const requestScrollToHighlight = useStore(s => s.requestScrollToHighlight);

  const setSidekickOpen = useStore(s => s.setSidekickOpen);
  const chapters = useStore(s => s.chapters);
  const currentProject = useStore(s => s.currentProject);
  
  const { updateSceneContent } = useNarrative();
  const { addToast } = useToast();
  const activeTab = useStore(s => s.sidekickTab);
  const setActiveTab = useStore(s => s.setSidekickTab);
  const clearSceneAnalysis = useStore(s => s.clearSceneAnalysis);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const analysis = React.useMemo(() => {
    if (!activeSceneId) return '';
    const key = `${activeSceneId}-${activeTab}`;
    return sceneAnalysis[key] || '';
  }, [sceneAnalysis, activeSceneId, activeTab]);

  const setAnalysis = (val: string | ((prev: string) => string)) => {
    if (!activeSceneId) return;
    setSceneAnalysis(activeSceneId, val, activeTab);
  };

  // Automated scrolling when navigating
  React.useEffect(() => {
    if (suggestionIndex >= 0 && parsedSuggestions[suggestionIndex]) {
      const sug = parsedSuggestions[suggestionIndex];
      setHighlightedText(sug.original);
      requestScrollToHighlight();
    }
  }, [suggestionIndex, requestScrollToHighlight, setHighlightedText]); // Removed parsedSuggestions to avoid scroll-lock during streaming

  const [braindumpInput, setBraindumpInput] = React.useState<string>('');
  const [lexiconInput, setLexiconInput] = React.useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Clear suggestions from view but keep memory (lastAnalyzedPhrase)
    if (activeSceneId) {
      setSceneAnalysis(activeSceneId, '', activeTab);
    }
    setIsAnalyzing(false);
  };

  const analysisRequestToken = useStore(s => s.analysisRequestToken);
  const lastTokenRef = React.useRef(analysisRequestToken);

  React.useEffect(() => {
    if (analysisRequestToken > lastTokenRef.current) {
      setActiveTab('revision'); // Forza il tab di revisione se richiesto dall'editor
      runDraftRevision();
    }
    lastTokenRef.current = analysisRequestToken;
  }, [analysisRequestToken]);

  const handleConvertQuotes = async () => {
    if (!activeSceneId || !content) return;
    const div = document.createElement('div');
    div.innerHTML = content;
    const walk = (node: Node) => {
      let child = node.firstChild;
      while (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          child.nodeValue = (child.nodeValue || '').replace(/"([^"]+)"/g, '«$1»');
        } else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
        child = child.nextSibling;
      }
    };
    walk(div);
    const newContent = div.innerHTML;
    if (newContent !== content) {
      setCurrentSceneContent(newContent);
      await updateSceneContent(activeSceneId, newContent);
      addToast('Virgolette convertite in « »', 'success');
    }
  };

  const sortAnalysisResults = (fullText: string, analysisText: string) => {
    const trimmed = analysisText.trim();
    const isJSON = (trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'));

    if (isJSON) {
      try {
        const suggestions = parseAIAnalysis(analysisText); // This handles both JSON and legacy
        if (suggestions.length === 0) return analysisText;

        const sorted = suggestions
          .map(sug => {
            const matches = findMatchInText(fullText, sug.original);
            return { sug, index: matches.length > 0 ? matches[0].start : -1 };
          })
          .sort((a, b) => {
            if (a.index === -1) return 1;
            if (b.index === -1) return -1;
            return a.index - b.index;
          })
          .map(item => ({
            original_fragment: item.sug.original,
            replacement_text: item.sug.suggestion,
            type: item.sug.type,
            severity: item.sug.severity,
            category: item.sug.category,
            reason: item.sug.reason
          }));

        return JSON.stringify(sorted, null, 2);
      } catch (e) {
        return analysisText;
      }
    }

    // Legacy format fallback
    const sections = analysisText.split(/(?=## |❌ )/);
    const header = sections.find(s => s.startsWith('##')) || '';
    const suggestions = sections.filter(s => s.startsWith('❌'));
    const footer = sections.find(s => s.includes('## Note Generali')) || '';

    const sortedSuggestions = suggestions
      .map(sug => {
        const match = sug.match(/❌\s*(.+?)(?=\n|✅|$)/);
        const phrase = match ? match[1].replace(/^["“”«»]+|["“”«»]+$/g, '').trim() : '';
        const matches = phrase ? findMatchInText(fullText, phrase) : [];
        return { content: sug, index: matches.length > 0 ? matches[0].start : -1 };
      })
      .sort((a, b) => {
        if (a.index === -1) return 1;
        if (b.index === -1) return -1;
        return a.index - b.index;
      })
      .map(s => s.content);

    return [header, ...sortedSuggestions, footer].join('\n').trim();
  };

    const plainText = getPlainTextForAI(content || '');
  
  const applySuggestion = async (sug: any) => {
    if (!activeSceneId || !sug.suggestion) return;
    
    // Dispatch a custom event to the Editor to handle the replacement robustly
    window.dispatchEvent(new CustomEvent('muse-apply-suggestion', { 
      detail: {
        original: sug.original,
        suggestion: sug.suggestion,
        sceneId: activeSceneId
      }
    }));

    addToast('Richiesta applicazione inviata', 'info');
    addIgnoredSuggestion(activeSceneId, sug.original);
    
    // Advance to next if possible
    setSuggestionIndex(prev => {
      if (parsedSuggestions.length <= 1) return -1;
      return Math.min(prev, parsedSuggestions.length - 2);
    });
  };

  const runDraftRevision = async () => {
    if (!plainText || (activeSelection ? activeSelection.length < 1 : plainText.length < 10)) {
      addToast('Seleziona del testo o apri una scena per procedere con la revisione.', 'error');
      return;
    }
    
    // Abort previous if any
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    // Determine if we should append to existing analysis (incremental) or start fresh
    const memoryKey = `${activeSceneId}-${activeTab}`;
    const lastPhrase = activeSceneId ? lastAnalyzedPhrase[memoryKey] : null;
    const isIncremental = !activeSelection && !!lastPhrase;

    if (!isIncremental) {
      setAnalysis('');
    }

    setIsAnalyzing(true);

    let textToAnalyze = activeSelection || plainText;
    const isSelection = !!activeSelection;

    if (isIncremental && lastPhrase) {
      // Use fuzzy matching for checkpointing
      const match = findMatchInText(plainText, lastPhrase);
      if (match) {
        const startIndex = Math.max(0, match.end);
        if (startIndex < plainText.length - 20) {
           textToAnalyze = plainText.substring(startIndex);
        }
      }
    }

    if (textToAnalyze.length > 100000) {
      textToAnalyze = textToAnalyze.substring(0, 100000);
    }

    let fullResponse = isIncremental ? (sceneAnalysis[memoryKey] || '') : '';

    try {
      const activeChapter = chapters.find((c: any) => c.scenes?.some((s: any) => s.id === activeSceneId));
      const activeScene = activeChapter?.scenes?.find((s: any) => s.id === activeSceneId);

      const systemPrompt = `RUOLO: Agisci come un Editor Senior e Copywriter Letterario con un occhio ossessivo per lo stile, il ritmo e la coerenza narrativa. Il tuo obiettivo non è solo correggere il testo (TARGET), ma ELEVARLO qualitativamente, mantenendo intatta la voce dell'autore.

ANALISI DEL CONTESTO:
Prima di proporre modifiche, analizza:
1. Tone of Voice: È minimalista, barocco, d'azione o introspettivo?
2. Ritmo (Pacing): La lunghezza delle frasi riflette lo stato emotivo della scena?
3. Coerenza: Le azioni e i dialoghi sono naturali per i personaggi coinvolti?

ISTRUZIONI OPERATIVE:
Fornisci suggerimenti specifici che includano:
- SOSTITUZIONI: Migliora la scelta dei verbi (usa verbi forti invece di avverbi).
- TAGLI (Kill your darlings): Identifica ripetizioni, ridondanze o "spiegazioni" superflue (Show, Don't Tell). Sii severo ma onesto: se una parte rallenta il ritmo, taglia senza pietà.
- ESPANSIONI: Suggerisci dove aggiungere dettagli sensoriali o pause introspettive.
- CADENZA: Modifica la punteggiatura per creare un flusso armonioso o una tensione incalzante.

REGOLE MANDATORIE DI FORMATO (JSON):
Restituisci ESCLUSIVAMENTE un array JSON. Non aggiungere introduzioni, conclusioni o commenti fuori dal JSON.
Esempio di formato:
[
  {
    "original_fragment": "...",
    "replacement_text": "...",
    "type": "STILE",
    "severity": "medium",
    "category": "Ritmo",
    "reason": "..."
  }
]

LINGUA: Italiano.`;

      const userContent = `
TESTO DA ANALIZZARE (TARGET):
[INIZIO TARGET]
${textToAnalyze}
[FINE TARGET]

METADATI DI CONTESTO:
Progetto: ${currentProject?.title || 'Senza Titolo'}
Capitolo: ${activeChapter?.title || 'Senza Titolo'}
Scena: ${activeScene?.title || 'Senza Titolo'}

CONTESTO NARRATIVO (SOLO PER RIFERIMENTO):
[INIZIO CONTESTO]
${plainText.substring(0, 100000)}
[FINE CONTESTO]

REVISIONA IL TARGET SOPRA CON OCCHIO SEVERO E ANALITICO.`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        (chunk) => {
          fullResponse += chunk;
          setAnalysis(prev => prev + chunk);
        },
        { 
          temperature: 0.7,
          signal: abortControllerRef.current.signal 
        }
      );

      // Post-processing: Sort results from top to bottom based on position in full text
      const sortedResult = sortAnalysisResults(plainText, fullResponse);
      setAnalysis(sortedResult);

      // Automatic checkpointing
      if (activeSceneId && !isSelection) {
        const finalSuggestions = parseAIAnalysis(sortedResult);
        if (finalSuggestions.length > 0) {
          const lastSug = finalSuggestions[finalSuggestions.length - 1];
          setLastAnalyzedPhrase(activeSceneId, lastSug.original, 'revision');
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errorMsg = err?.message || 'Errore Sconosciuto';
      addToast(`Errore AI: ${errorMsg}`, 'error');
      setAnalysis(`❌ ${errorMsg}`);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const runGrammarAnalysis = async () => {
    if (!plainText || (activeSelection ? activeSelection.length < 1 : plainText.length < 5)) {
      addToast('Nessun testo rilevato per la correzione grammaticale.', 'error');
      return;
    }
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysis('');
    let textToAnalyze = activeSelection || plainText;
    const isSelection = !!activeSelection;
    if (textToAnalyze.length > 100000) textToAnalyze = textToAnalyze.substring(0, 100000);

    try {
      const systemPrompt = `Sei il Capo Redattore di Muse. Il tuo compito è correggere errori tecnici nel testo (TARGET) mantenendo la coerenza con l'intera scena (CONTESTO).

REQUISITI:
1. ORTOGRAFIA E PUNTEGGIATURA: Correggi refusi, spazi mancanti e punteggiatura errata.
2. TEMPI VERBALI: Se il contesto è al passato, non suggerire correzioni che portano al presente (e viceversa).
3. COERENZA: Rispetta i nomi e lo stile stabiliti nel contesto.

REGOLE MANDATORIE:
1. Restituisci un array JSON di oggetti con lo schema:
   {
     "original_fragment": "testo esatto dal manoscritto",
     "replacement_text": "testo corretto",
     "type": "GRAMMATICA",
     "severity": "medium",
     "category": "Ortografia" | "Punteggiatura" | "Formattazione",
     "reason": "spiegazione tecnica"
   }

LINGUA: Italiano.`;

      const userContent = isSelection ? `
L'utente desidera correggere SOLO questa specifica selezione di testo:

TARGET DA CORREGGERE (AGISCI SOLO QUI):
[INIZIO TARGET]
${textToAnalyze}
[FINE TARGET]

CONTESTO DELLA SCENA (USA SOLO COME RIFERIMENTO PER LA COERENZA):
[INIZIO CONTESTO]
${plainText.substring(0, 10000)}
[FINE CONTESTO]

IMPORTANTE: Fornisci correzioni tecniche ESCLUSIVAMENTE per il TARGET sopra.` 
: `
TARGET DA CORREGGERE:
[INIZIO TARGET]
${textToAnalyze}
[FINE TARGET]

CONTESTO DELL'INTERA SCENA (SOLO PER RIFERIMENTO):
[INIZIO CONTESTO]
${plainText}
[FINE CONTESTO]

CORREGGI IL TARGET SOPRA.`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        (chunk) => setAnalysis(prev => prev + chunk),
        { signal: abortControllerRef.current.signal }
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errorMsg = err?.message || 'Errore Sconosciuto';
      addToast(`Errore grammatica AI: ${errorMsg}`, 'error');
      setAnalysis(`❌ ${errorMsg}`);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const runBraindump = async () => {
    if (!braindumpInput.trim()) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysis('');
    try {
      const systemPrompt = `Sei un assistente alla scrittura creativa. L'utente ha inserito dei pensieri sparsi (Braindump).
Trasformali in suggestioni narrative concrete.
Rispondi in italiano. Sii concreto e originale.`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Braindump: ${braindumpInput}` }
        ],
        (chunk) => setAnalysis(prev => prev + chunk),
        { signal: abortControllerRef.current.signal }
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setAnalysis(`❌ Errore: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const stylePrompts: Record<string, string> = {
    visceral: `Riscrivi usando ESCLUSIVAMENTE sensazioni fisiche. Zero astrazioni. Solo carne, sudore, respiro.`,
    atmospheric: `Riscrivi trasformando l'ambiente in un personaggio vivo e carico di tensione.`,
    metaphorical: `Riscrivi usando metafore estese e immagini archetipiche originali.`,
    psychological: `Riscrivi portando il lettore DENTRO la mente del personaggio (monologo interiore).`,
  };

  const runStyleTransform = async (style: string) => {
    if (!activeSelection) {
      addToast('Seleziona il testo che desideri trasformare.', 'info');
      return;
    }
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysis('');
    
    // Lo stile lavora ora ESCLUSIVAMENTE sulla selezione come richiesto
    const textToAnalyze = activeSelection;

    try {
      await aiService.streamChat(
        aiConfig,
        [
          { 
            role: 'system', 
            content: `${stylePrompts[style]} Riscrivi in italiano. Restituisci SOLO il testo riscritto, senza commenti o introduzioni.` 
          },
          { 
            role: 'user', 
            content: `RISCRIVI QUESTO TESTO SELEZIONATO:\n\n${textToAnalyze}` 
          }
        ],
        (chunk) => setAnalysis(prev => prev + chunk),
        { signal: abortControllerRef.current.signal }
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setAnalysis(`❌ Errore: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const runLexiconTool = async (mode: 'synonyms' | 'metaphors') => {
    if (!lexiconInput.trim()) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysis('');
    try {
      const prompt = mode === 'synonyms' 
        ? `Trova sinonimi/contrari per: "${lexiconInput}". Formato: S: ..., A: ..., 💎 [Parola]: [spiegazione]`
        : `Trova 5 metafore originali per: "${lexiconInput}". Formato: M: ..., 💡 [spiegazione]`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: prompt + " Rispondi in italiano." },
          { role: 'user', content: `Concetto: ${lexiconInput}` }
        ],
        (chunk) => setAnalysis(prev => prev + chunk),
        { signal: abortControllerRef.current.signal }
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setAnalysis(`❌ Errore: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const currentLastPhrase = activeSceneId ? lastAnalyzedPhrase[`${activeSceneId}-${activeTab}`] : null;

  return (
    <div className={cn(
      "h-full glass rounded-none md:rounded-[32px] flex-shrink-0 flex flex-col shadow-lg z-20 transition-all duration-500 overflow-hidden relative border-[var(--border-subtle)]",
      isCollapsed ? "w-20" : "w-full md:w-56 xl:w-72 2xl:w-80"
    )}>

      {/* Header Panel */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]/30">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 bg-[var(--accent-soft)] rounded-xl border border-[var(--accent)]/20 shadow-glow-mint hover:scale-110 transition-transform"
          >
             <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          </button>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="text-sm font-black tracking-tight text-[var(--text-bright)] leading-tight truncate">Companion</h2>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Live Analysis</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            {isAnalyzing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-[var(--accent)]" />
              </div>
            )}
            
            {analysis && (
              <button 
                onClick={() => {
                  handleStop();
                  if (activeSceneId) clearSceneAnalysis(activeSceneId, activeTab);
                }}
                title="Pulisci tutto"
                className="p-2.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/20 animate-pulse"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            <button 
              onClick={() => setSidekickOpen(false)}
              className="p-2.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
              title="Chiudi Companion"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      {!isCollapsed && (
        <div className="px-4 py-2">
          <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-card)]/80 p-1 rounded-[20px] border border-[var(--border-subtle)]">
            {(['revision', 'grammar', 'braindump', 'transformer', 'lexicon'] as SidekickTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-2 px-1 rounded-[16px] text-[7px] font-black uppercase tracking-widest transition-all duration-300 text-center",
                  activeTab === tab 
                    ? "bg-[var(--accent)] text-[var(--bg-deep)]" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--accent-soft)]"
                )}
              >
                {tab === 'transformer' ? 'Stile' : tab}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide bg-[var(--bg-deep)]/30">
        
        {/* Revision Tab */}
        {activeTab === 'revision' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] truncate">Revisione Letteraria</span>
                {activeSelection && (
                  <span className="text-[8px] text-[var(--accent)] font-bold uppercase tracking-widest mt-1 animate-pulse flex items-center gap-2">
                     <div className="w-1 h-1 bg-[var(--accent)] rounded-full" /> Selezione
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isAnalyzing ? (
                  <button onClick={handleStop} className="p-2.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/20">
                    <X className="w-4 h-4" />
                  </button>
                ) : analysis && (
                  <button onClick={handleStop} className="p-2.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <button 
              onClick={runDraftRevision} 
              disabled={isAnalyzing || !content || content.length < 10} 
              className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] disabled:opacity-50 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-2xl active:scale-95 group"
            >
              <Wand2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              <span>{isAnalyzing ? 'Elaborazione...' : 'Analisi Stilistica'}</span>
            </button>
            
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-[20px] space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-[var(--accent)]/10 rounded-xl">
                    <BookOpen className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mb-1">Motore Attivo</span>
                    <select 
                      value={aiConfig.provider}
                      onChange={(e) => {
                        const provider = e.target.value as any;
                        const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : (provider === 'gemini' ? 'gemini-2.0-flash-exp:free' : 'deepseek-chat');
                        useStore.getState().setAIConfig({ provider, model });
                      }}
                      className="bg-transparent text-[11px] text-[var(--text-secondary)] font-medium outline-none cursor-pointer border-none p-0"
                    >
                      <option value="groq" className="bg-[var(--bg-card)]">Groq (Llama 3.3)</option>
                      <option value="deepseek" className="bg-[var(--bg-card)]">DeepSeek V3</option>
                      <option value="gemini" className="bg-[var(--bg-card)]">Gemini 2.0 Flash</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {parsedSuggestions.length > 0 && suggestionIndex >= 0 && parsedSuggestions[suggestionIndex] ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">
                    {suggestionIndex + 1} di {parsedSuggestions.length} suggestioni
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSuggestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={suggestionIndex <= 0}
                      className="p-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setSuggestionIndex(prev => Math.min(parsedSuggestions.length - 1, prev + 1))}
                      disabled={suggestionIndex >= parsedSuggestions.length - 1}
                      className="p-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 space-y-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]">
                      {parsedSuggestions[suggestionIndex]?.category}
                    </div>
                  </div>

                  <p className="text-[13px] text-[var(--text-bright)] leading-relaxed font-sans font-bold">
                    {parsedSuggestions[suggestionIndex]?.reason}
                  </p>

                  <div className="space-y-4">
                    <div className="text-[13px] text-[var(--text-muted)] line-through decoration-rose-500/40 opacity-70 leading-relaxed font-serif italic">
                      {parsedSuggestions[suggestionIndex]?.original}
                    </div>
                    <div className="text-[15px] text-[var(--text-bright)] font-medium leading-relaxed bg-[var(--bg-deep)]/40 p-4 rounded-2xl border border-emerald-500/10 font-serif">
                      {parsedSuggestions[suggestionIndex]?.suggestion}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]/50">
                    <button 
                      onClick={() => applySuggestion(parsedSuggestions[suggestionIndex])}
                      className="flex-1 py-4 bg-[var(--accent)] text-[var(--bg-deep)] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-glow-mint"
                    >
                      Applica
                    </button>
                    <button 
                      onClick={() => activeSceneId && addIgnoredSuggestion(activeSceneId, parsedSuggestions[suggestionIndex].original)}
                      className="p-4 text-[var(--text-muted)] hover:text-rose-400 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-1 bg-[var(--bg-deep)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--accent)] transition-all duration-500" 
                      style={{ width: `${((suggestionIndex + 1) / parsedSuggestions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-36 text-[var(--text-muted)] opacity-50">
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  {isAnalyzing ? "Elaborazione in corso..." : "Nessun suggerimento attivo"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Grammar Tab */}
        {activeTab === 'grammar' && (
          <div className="space-y-6">
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Correzione Tecnica</span>
            <button 
              onClick={runGrammarAnalysis}
              disabled={isAnalyzing || !content || content.length < 5} 
              className="w-full py-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30 rounded-[20px] text-[10px] font-black uppercase tracking-widest"
            >
              Correggi Errori
            </button>

            {parsedSuggestions.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 rounded-[32px] space-y-6 shadow-premium">
                  <div className="flex flex-col space-y-4">
                    <div className="p-4 bg-[var(--bg-deep)]/20 rounded-xl border border-rose-500/10 italic text-[11px] text-[var(--text-muted)] line-through">
                       "{parsedSuggestions[suggestionIndex]?.original}"
                    </div>
                    <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-[13px] text-[var(--text-bright)] font-medium">
                       {parsedSuggestions[suggestionIndex]?.suggestion}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => applySuggestion(parsedSuggestions[suggestionIndex])}
                      className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-deep)] rounded-xl text-[10px] font-black uppercase"
                    >
                      Correggi
                    </button>
                    <button 
                      onClick={() => activeSceneId && addIgnoredSuggestion(activeSceneId, parsedSuggestions[suggestionIndex].original)}
                      className="p-3 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-1 bg-[var(--bg-deep)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--accent)] transition-all duration-500" 
                      style={{ width: `${((suggestionIndex + 1) / parsedSuggestions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-36 text-[var(--text-muted)] opacity-50">
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  {isAnalyzing ? "Analisi in corso..." : "Nessun errore tecnico trovato"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Other Tabs Simplified for Safety */}
        {activeTab === 'braindump' && (
          <div className="space-y-6">
            <textarea 
              className="w-full h-48 bg-[var(--bg-card)] p-6 rounded-[24px] border border-[var(--border-subtle)] text-xs focus:outline-none resize-none" 
              placeholder="Incolla qui le tue idee..." 
              value={braindumpInput} 
              onChange={(e) => setBraindumpInput(e.target.value)} 
            />
            <button onClick={runBraindump} disabled={isAnalyzing || !braindumpInput.trim()} className="w-full py-4 bg-[var(--accent)] text-[var(--bg-deep)] rounded-[20px] text-[10px] font-black uppercase tracking-widest">
              Espandi Concetti
            </button>
            {analysis && (
              <div className="bg-[var(--accent-soft)] p-6 rounded-[32px] border border-[var(--accent)]/10 max-h-[40vh] overflow-y-auto">
                <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'transformer' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(stylePrompts).map(key => (
                <button key={key} onClick={() => runStyleTransform(key)} disabled={isAnalyzing || plainText.length < 10} className="bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] p-5 rounded-[24px] border border-[var(--border-subtle)] text-[10px] font-black uppercase text-center">
                  {key}
                </button>
              ))}
            </div>
            {analysis && (
              <div className="bg-[var(--accent-soft)] p-6 rounded-[32px] border border-[var(--accent)]/10 max-h-[40vh] overflow-y-auto">
                <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'lexicon' && (
          <div className="space-y-6">
            <input 
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[20px] py-4 px-6 text-sm focus:outline-none" 
              placeholder="Cerca sinonimi o metafore..." 
              value={lexiconInput} 
              onChange={(e) => setLexiconInput(e.target.value)} 
            />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => runLexiconTool('synonyms')} disabled={isAnalyzing || !lexiconInput.trim()} className="py-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[20px] text-[10px] font-bold uppercase">
                Sinonimi
              </button>
              <button onClick={() => runLexiconTool('metaphors')} disabled={isAnalyzing || !lexiconInput.trim()} className="py-4 bg-[var(--accent)] text-[var(--bg-deep)] rounded-[20px] text-[10px] font-bold uppercase">
                Metafore
              </button>
            </div>
            {analysis && (
              <div className="bg-[var(--accent-soft)] p-6 rounded-[32px] border border-[var(--accent)]/10 max-h-[40vh] overflow-y-auto">
                <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-8 border-t border-[var(--border-subtle)] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center space-x-3 text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-[0.2em]">
          <div className={cn("w-2 h-2 rounded-full", isAnalyzing ? "bg-[var(--accent)] animate-pulse" : "opacity-20 bg-[var(--accent)]")}></div>
          <span>Architettura Sincronizzata</span>
        </div>
      </div>
    </div>
  );
});
