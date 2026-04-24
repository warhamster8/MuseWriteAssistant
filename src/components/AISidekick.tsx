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
  X
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
  const setParsedSuggestions = useStore(s => s.setParsedSuggestions);
  const parsedSuggestions = useStore(s => s.parsedSuggestions);
  const suggestionIndex = useStore(s => s.suggestionIndex);
  const setSuggestionIndex = useStore(s => s.setSuggestionIndex);
  const setHighlightedText = useStore(s => s.setHighlightedText);
  const requestScrollToHighlight = useStore(s => s.requestScrollToHighlight);

  const setSidekickOpen = useStore(s => s.setSidekickOpen);
  
  const { updateSceneContent } = useNarrative();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = React.useState<SidekickTab>('revision');

  const analysis = React.useMemo(() => {
    if (!activeSceneId) return '';
    const key = `${activeSceneId}-${activeTab}`;
    return sceneAnalysis[key] || '';
  }, [sceneAnalysis, activeSceneId, activeTab]);

  const setAnalysis = (val: string | ((prev: string) => string)) => {
    if (!activeSceneId) return;
    setSceneAnalysis(activeSceneId, val, activeTab);
  };

  // Automated parsing of suggestions
  React.useEffect(() => {
    if (activeTab === 'revision' || activeTab === 'grammar') {
      const suggestions = parseAIAnalysis(analysis);
      setParsedSuggestions(suggestions);
      if (suggestions.length > 0 && suggestionIndex === -1) {
        setSuggestionIndex(0);
      } else if (suggestions.length === 0) {
        setSuggestionIndex(-1);
      }
    } else {
      setParsedSuggestions([]);
      setSuggestionIndex(-1);
    }
  }, [analysis, activeTab]);

  // Automated scrolling when navigating
  React.useEffect(() => {
    if (suggestionIndex >= 0 && parsedSuggestions[suggestionIndex]) {
      const sug = parsedSuggestions[suggestionIndex];
      setHighlightedText(sug.original);
      requestScrollToHighlight();
    }
  }, [suggestionIndex, parsedSuggestions, setHighlightedText, requestScrollToHighlight]);

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
    const sections = analysisText.split(/(?=## |❌ )/);
    const header = sections.find(s => s.startsWith('##')) || '';
    const suggestions = sections.filter(s => s.startsWith('❌'));
    const footer = sections.find(s => s.includes('## Note Generali')) || '';

    const sortedSuggestions = suggestions
      .map(sug => {
        const match = sug.match(/❌\s*(.+?)(?=\n|✅|$)/);
        const phrase = match ? match[1].replace(/^["“”«»]+|["“”«»]+$/g, '').trim() : '';
        const matchPos = phrase ? findMatchInText(fullText, phrase) : null;
        return { content: sug, index: matchPos ? matchPos.start : -1 };
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

  const runDraftRevision = async () => {
    if (!plainText || (activeSelection ? activeSelection.length < 1 : plainText.length < 10)) return;
    
    // Abort previous if any
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysis('');
    setParsedSuggestions([]);

    let textToAnalyze = activeSelection || plainText;
    const isSelection = !!activeSelection;

    if (!isSelection) {
      const memoryKey = `${activeSceneId}-${activeTab}`;
      const lastPhrase = activeSceneId ? lastAnalyzedPhrase[memoryKey] : null;

      if (lastPhrase) {
        // Use fuzzy matching for checkpointing
        const match = findMatchInText(plainText, lastPhrase);
        if (match) {
          const startIndex = Math.max(0, match.end);
          if (startIndex < plainText.length - 20) {
             textToAnalyze = plainText.substring(startIndex);
          }
        }
      }
    }

    if (textToAnalyze.length > 30000) {
      textToAnalyze = textToAnalyze.substring(0, 30000);
    }

    let fullResponse = '';

    try {
      const systemPrompt = `Sei un editor letterario senior esperto in narrativa italiana.
Revisiona la bozza fornita con precisione e profondità.

REQUISITO DI TEMPO NARRATIVO:
Individua se il testo è scritto al passato o al presente. Tutte le tue proposte di revisione (✅) DEVONO mantenere lo STESSO TEMPO NARRATIVO del testo originale per garantire coerenza stilistica.

REGOLE MANDATORIE:
1. Inizia IMMEDIATAMENTE con "## Analisi Revisione".
2. Segui RIGOROSAMENTE l'ordine del testo linearmente.
3. Formato Suggerimento:
   ❌ Frase originale (esatta dal testo)
   ✅ Nuova versione migliorata (stesso tempo verbale del testo)
   🏷️ Categoria
   💡 Spiegazione

4. IDENTIFICAZIONE: Identifica 5-7 punti chiave.
5. Concludi con "## Note Generali".

LINGUA: Italiano.`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${isSelection ? 'REVISIONA SOLO QUESTA SELEZIONE:\n' : (textToAnalyze !== plainText ? 'CONTINUA LA REVISIONE DA QUESTO PUNTO (IGNORA PARTI PRECEDENTI):\n' : 'Revisiona questa bozza:\n')}\n${textToAnalyze}` }
        ],
        (chunk) => {
          fullResponse += chunk;
          setAnalysis(prev => prev + chunk);
        },
        { signal: abortControllerRef.current.signal }
      );

      // Post-processing: Sort results from top to bottom based on position in full text
      const sortedResult = sortAnalysisResults(plainText, fullResponse);
      setAnalysis(sortedResult);

      // Automatic checkpointing (only for full scene analysis)
      if (activeSceneId && !isSelection) {
        const lines = sortedResult.split('\n');
        const lastErrorLine = lines.reverse().find(l => l.trim().startsWith('❌'));
        if (lastErrorLine) {
          const phrase = lastErrorLine.replace(/^❌\s*/, '').replace(/^["“”«»]+|["“”«»]+$/g, '').trim();
          if (phrase) {
            setLastAnalyzedPhrase(activeSceneId, phrase, 'revision');
          }
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setAnalysis(`❌ Errore AI: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const runGrammarAnalysis = async () => {
    if (!plainText || (activeSelection ? activeSelection.length < 1 : plainText.length < 5)) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysis('');
    setParsedSuggestions([]);
    let textToAnalyze = activeSelection || plainText;
    const isSelection = !!activeSelection;
    if (textToAnalyze.length > 30000) textToAnalyze = textToAnalyze.substring(0, 30000);

    try {
      const systemPrompt = `Sei un correttore bozze professionista.
Il tuo compito è correggere errori tecnici (ortografia, punteggiatura, spazi).
NON suggerire cambiamenti di stile o trama.

REQUISITO DI TEMPO NARRATIVO:
Rispetta rigorosamente il tempo narrativo del testo (Presente o Passato). Non cambiare mai i verbi se il tempo è coerente.

REGOLE MANDATORIE:
1. Inizia con "## Analisi Tecnica".
2. Usa QUESTO FORMATO:
   ❌ Errore riscontrato
   ✅ Versione corretta
   🏷️ Categoria (Ortografia, Punteggiatura, Formattazione)
   💡 Spiegazione

LINGUA: Italiano. Sii estremamente preciso.`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${isSelection ? 'CORREGGI ESCLUSIVAMENTE QUESTA SELEZIONE (IGNORA IL RESTO):\n' : 'Correggi ortografia e punteggiatura di questo testo:\n'}\n${textToAnalyze}` }
        ],
        (chunk) => setAnalysis(prev => prev + chunk),
        { signal: abortControllerRef.current.signal }
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setAnalysis(`❌ Errore AI: ${err?.message || 'Errore Sconosciuto'}`);
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
    <div className="w-full md:w-56 lg:w-64 h-full glass rounded-none md:rounded-[40px] flex-shrink-0 flex flex-col shadow-premium z-20 transition-all duration-500 overflow-hidden relative border-[var(--border-subtle)]">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]/30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[var(--accent-soft)] rounded-xl border border-[var(--accent)]/20 shadow-glow-mint">
             <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black tracking-tight text-[var(--text-bright)] leading-tight truncate">Companion</h2>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Live Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAnalyzing && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin text-[var(--accent)]" />
            </div>
          )}
          
          <button 
            onClick={() => setSidekickOpen(false)}
            className="p-2.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
            title="Chiudi Companion"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>


          <div className="px-6 py-2">
            <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-card)]/50 p-1.5 rounded-[24px] border border-[var(--border-subtle)] backdrop-blur-xl">
             {(['revision', 'grammar', 'braindump', 'transformer', 'lexicon'] as SidekickTab[]).map((tab) => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                  className={cn(
                    "py-2 px-1 rounded-[18px] text-[8px] font-black uppercase tracking-widest transition-all duration-300 text-center",
                    activeTab === tab 
                      ? "bg-[var(--accent)] text-[var(--bg-deep)] shadow-lg scale-105" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--accent-soft)]"
                  )}
               >
                 {tab === 'transformer' ? 'Stile' : tab}
               </button>
             ))}
            </div>
          </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide bg-[var(--bg-deep)]/30">
        {activeTab === 'revision' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] truncate">Correzione Bozza</span>
                {activeSelection && (
                  <span className="text-[8px] text-[var(--accent)] font-bold uppercase tracking-widest mt-1 animate-pulse flex items-center gap-2">
                     <div className="w-1 h-1 bg-[var(--accent)] rounded-full" /> Selezione
                  </span>
                )}
                {!activeSelection && currentLastPhrase && (
                  <span className="text-[8px] text-[var(--text-muted)]/60 truncate max-w-[100px] italic mt-1 uppercase tracking-tighter">Memoria: {currentLastPhrase.slice(0, 10)}...</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isAnalyzing || analysis ? (
                  <button 
                    onClick={handleStop}
                    title={isAnalyzing ? "Interrompi" : "Rimuovi suggerimenti"}
                    className="p-2.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                  >
                    {isAnalyzing ? <X className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  </button>
                ) : currentLastPhrase && !activeSelection && (
                  <button 
                    onClick={() => { 
                      setLastAnalyzedPhrase(activeSceneId!, '', 'revision'); 
                      setSceneAnalysis(activeSceneId!, '', 'revision'); 
                    }} 
                    title="Reset memory"
                    className="p-2.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
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
              <span>{isAnalyzing ? '...' : 'Analisi Strutturale'}</span>
            </button>
            
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-[20px] space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-[var(--accent)]/10 rounded-xl">
                    <BookOpen className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mb-1">Motore Attivo</span>
                    <div className="flex items-center gap-2">
                      <select 
                        value={aiConfig.provider}
                        onChange={(e) => {
                          const provider = e.target.value as any;
                          const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : (provider === 'gemini' ? 'gemini-flash-latest' : 'deepseek-chat');
                          useStore.getState().setAIConfig({ provider, model });
                        }}
                        className="bg-transparent text-[11px] text-[var(--text-secondary)] font-medium hover:text-[var(--accent)] transition-colors outline-none cursor-pointer border-none p-0 appearance-none"
                      >
                        <option value="groq" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Groq (Llama 3.3)</option>
                        <option value="deepseek" className="bg-[var(--bg-card)] text-[var(--text-primary)]">DeepSeek V3</option>
                        <option value="gemini" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Gemini 1.5 Flash</option>
                      </select>
                      <ChevronRight className="w-3 h-3 text-[var(--text-muted)] opacity-50" />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleConvertQuotes}
                  title='Converti " " in « »'
                  className="p-3 text-[var(--accent)]/40 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-2xl transition-all flex items-center gap-2 group border border-transparent hover:border-[var(--accent)]/20"
                >
                  <Quote className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase tracking-tight hidden group-hover:block transition-all">Fix « »</span>
                </button>
              </div>
            </div>

            {parsedSuggestions.length > 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 rounded-[32px] space-y-6 shadow-premium animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.3em]">Revisione In-Text</span>
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
                      {suggestionIndex + 1} di {parsedSuggestions.length} suggestioni
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSuggestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={suggestionIndex <= 0}
                      className="p-3 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setSuggestionIndex(prev => Math.min(parsedSuggestions.length - 1, prev + 1))}
                      disabled={suggestionIndex >= parsedSuggestions.length - 1}
                      className="p-3 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 disabled:opacity-30 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-[var(--accent-soft)] rounded-2xl border border-[var(--accent)]/10">
                   <p className="text-[10px] text-[var(--text-primary)] leading-relaxed italic line-clamp-3">
                     "{parsedSuggestions[suggestionIndex]?.original}"
                   </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                   <div className="h-1.5 flex-1 bg-[var(--bg-deep)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[var(--accent)] transition-all duration-500" 
                        style={{ width: `${((suggestionIndex + 1) / parsedSuggestions.length) * 100}%` }}
                      />
                   </div>
                </div>
              </div>
            ) : (
              !isAnalyzing && <div className="flex flex-col items-center justify-center h-36 text-[var(--text-muted)] space-y-2"><AlertTriangle className="w-8 h-8 opacity-20" /><p className="text-xs text-center">Seleziona una scena e premi Analizza.</p></div>
            )}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-6">
            <div className="flex flex-col min-w-0 mb-2">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] truncate">Correzione Tecnica</span>
            </div>

            <button 
              onClick={runGrammarAnalysis}
              disabled={isAnalyzing || !content || content.length < 5} 
              className={cn(
                "w-full py-5 rounded-[28px] border transition-all flex items-center justify-center gap-3 group px-8 shadow-xl",
                activeSelection 
                  ? "bg-[var(--accent)] text-[var(--bg-deep)] border-transparent" 
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30"
              )}
            >
              <PenLine className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-widest">{activeSelection ? 'Correggi Selezione' : 'Trova Errori Tecnici'}</span>
            </button>
            {parsedSuggestions.length > 0 ? (
               <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 rounded-[32px] space-y-6 shadow-premium animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.3em]">Navigazione Errori</span>
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
                      {suggestionIndex + 1} di {parsedSuggestions.length} correzioni
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSuggestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={suggestionIndex <= 0}
                      className="p-3 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setSuggestionIndex(prev => Math.min(parsedSuggestions.length - 1, prev + 1))}
                      disabled={suggestionIndex >= parsedSuggestions.length - 1}
                      className="p-3 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 disabled:opacity-30 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              !isAnalyzing && <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] space-y-4 bg-[var(--accent-soft)] rounded-[32px] border border-dashed border-[var(--border-subtle)]"><CheckCircle className="w-10 h-10 opacity-20" /><p className="text-[10px] font-bold border-t border-[var(--border-subtle)] pt-4 uppercase tracking-[0.2em]">Nessuna anomalia tecnica rilevata</p></div>
            )}
          </div>
        )}

        {activeTab === 'braindump' && (
          <div className="space-y-6">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">Sviluppo Intuizioni</span>
                <div className="rounded-[24px] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-card)] focus-within:border-[var(--accent)]/30 focus-within:bg-[var(--bg-surface)] transition-all shadow-inner">
                  <textarea 
                      className="w-full h-48 bg-transparent p-6 text-xs text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] transition-all resize-none" 
                      placeholder="Incolla qui pensieri sparsi, frammenti di dialogo o concetti vaghi..." 
                      value={braindumpInput} 
                      onChange={(e) => setBraindumpInput(e.target.value)} 
                  />
                </div>
            </div>
            <button 
                onClick={runBraindump} 
                disabled={isAnalyzing || !braindumpInput.trim()} 
                className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] disabled:opacity-50 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-2xl shadow-[var(--accent-soft)] active:scale-95"
            >
                <Zap className="w-4 h-4" />
                Espandi Concetti
            </button>
            {analysis && (
                <div className="bg-[var(--accent-soft)] p-6 rounded-[32px] border border-[var(--accent)]/10 animate-in slide-in-from-bottom-2 max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                    <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
                </div>
            )}
          </div>
        )}

        {activeTab === 'transformer' && (
          <div className="space-y-6">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] block">Modulazione Stilistica</span>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(stylePrompts).map(key => (
                <button 
                    key={key} 
                    onClick={() => runStyleTransform(key)} 
                    disabled={isAnalyzing || plainText.length < 10} 
                    className="bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] disabled:opacity-50 p-5 rounded-[24px] text-left border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 bg-[var(--accent-soft)] blur-xl group-hover:bg-[var(--accent)]/10 transition-all" />
                  <div className="text-[10px] font-black text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors uppercase tracking-widest relative z-10">{key}</div>
                </button>
              ))}
            </div>
            {analysis && (
                <div className="bg-[var(--accent-soft)] p-6 rounded-[32px] border border-[var(--accent)]/10 animate-in fade-in max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                    <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
                </div>
            )}
          </div>
        )}


        {activeTab === 'lexicon' && (
          <div className="space-y-6">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">Indice Lessicale</span>
                <div className="relative group">
                    <Languages className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                    <input 
                        className="w-full bg-[var(--bg-surface)]/60 border border-[var(--border-subtle)] rounded-[20px] py-4 pl-14 pr-6 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/30 focus:bg-[var(--bg-surface)] transition-all shadow-inner placeholder:text-[var(--text-muted)]" 
                        placeholder="Concetto da analizzare..." 
                        value={lexiconInput} 
                        onChange={(e) => setLexiconInput(e.target.value)} 
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => runLexiconTool('synonyms')} 
                disabled={isAnalyzing || !lexiconInput.trim()} 
                className="py-4 bg-[var(--bg-surface)]/40 hover:bg-[var(--accent-soft)] disabled:opacity-50 rounded-[20px] text-[10px] font-bold uppercase tracking-widest transition-all border border-[var(--border-subtle)] hover:border-[var(--accent)]/20 text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                Sinonimi
              </button>
              <button 
                onClick={() => runLexiconTool('metaphors')} 
                disabled={isAnalyzing || !lexiconInput.trim()} 
                className="py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 rounded-[20px] text-[10px] font-bold uppercase tracking-widest text-[var(--bg-deep)] transition-all shadow-2xl active:scale-95"
              >
                Metafore
              </button>
            </div>
            {analysis && (
                <div className="bg-[var(--accent-soft)] p-6 rounded-[32px] border border-[var(--accent)]/10 animate-in slide-in-from-bottom-2 max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                    <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
                </div>
            )}
          </div>
        )}
      </div>

      <div className="p-8 border-t border-[var(--border-subtle)] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center space-x-3 text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-[0.2em]">
          <div className={cn("w-2 h-2 rounded-full", isAnalyzing ? "bg-[var(--accent)] animate-pulse shadow-glow-mint" : "opacity-20 bg-[var(--accent)]")}></div>
          <span>Architettura Sincronizzata</span>
        </div>
      </div>

    </div>
  );
});
