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
  X,
  ChevronRight,
  Quote,
  CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useNarrative } from '../hooks/useNarrative';
import { useToast } from './Toast';
import { aiService } from '../lib/aiService';
import { findMatchInText } from '../lib/tiptap/matchUtils';
import { StructuredOutput } from './analysis/StructuredOutput';
import { getPlainTextForAI, buildMapping } from '../lib/textUtils';


type SidekickTab = 'revision' | 'grammar' | 'braindump' | 'transformer' | 'lexicon';

export const AISidekick: React.FC = React.memo(() => {
  const content = useStore(s => s.currentSceneContent);
  const activeSceneId = useStore(s => s.activeSceneId);
  const setCurrentSceneContent = useStore(s => s.setCurrentSceneContent);
  const ignoredSuggestions = useStore(s => s.ignoredSuggestions);
  const addIgnoredSuggestion = useStore(s => s.addIgnoredSuggestion);
  const lastAnalyzedPhrase = useStore(s => s.lastAnalyzedPhrase);
  const setLastAnalyzedPhrase = useStore(s => s.setLastAnalyzedPhrase);
  const sceneAnalysis = useStore(s => s.sceneAnalysis);
  const setSceneAnalysis = useStore(s => s.setSceneAnalysis);
  const activeSelection = useStore(s => s.activeSelection);
  const aiConfig = useStore(s => s.aiConfig);

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

  const [appliedSuggestions, setAppliedSuggestions] = React.useState<string[]>([]);
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

  const sceneIgnoredSuggestions = React.useMemo(() => 
    activeSceneId ? (ignoredSuggestions || {})[activeSceneId] || [] : []
  , [ignoredSuggestions, activeSceneId]);

  const handleReject = (originalText: string) => {
    if (activeSceneId) {
       addIgnoredSuggestion(activeSceneId, originalText);
       setLastAnalyzedPhrase(activeSceneId, originalText, activeTab);
    }
  };

  // Helper to sort structured text by appearance in the manuscript
  const sortAnalysisResults = (fullText: string, analysisText: string) => {
    const sections = analysisText.split(/(?=## |❌ )/);
    const header = sections.find(s => s.startsWith('##')) || '';
    const suggestions = sections.filter(s => s.startsWith('❌'));
    const footer = sections.find(s => s.includes('## Note Generali')) || '';

    const sortedSuggestions = suggestions
      .map(sug => {
        const match = sug.match(/❌\s*(.+?)(?=\n|✅|$)/);
        const phrase = match ? match[1].replace(/^["“”«»]+|["“”«»]+$/g, '').trim() : '';
        // Use fuzzy matching for sorting
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

  const handleConvertQuotes = async () => {
    if (!activeSceneId || !content) return;
    
    const div = document.createElement('div');
    div.innerHTML = content;
    
    const walk = (node: Node) => {
      let child = node.firstChild;
      while (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          child.nodeValue = (child.nodeValue || '').replace(/"([^"]+)"/g, '«$1»');
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
        child = child.nextSibling;
      }
    };
    
    walk(div);
    const newContent = div.innerHTML;
    
    if (newContent !== content) {
      setCurrentSceneContent(newContent);
      await updateSceneContent(activeSceneId, newContent);
      addToast('Virgolette convertite in « »', 'success');
    } else {
      addToast('Nessuna virgoletta " " trovata', 'info');
    }
  };

  const applySuggestion = async (originalText: string, suggestion: string) => {
    if (!activeSceneId || !content) return;
    
    const { textStr, textMap, charLens } = buildMapping(content);
    
    // Pre-cleaning: strip leading/trailing ellipses that AI often adds for context
    const cleanOriginalText = originalText
      .replace(/^(\.\.\.|…)+/, '')
      .replace(/(\.\.\.|…)+$/, '')
      .trim();

    // Use unified fuzzy matching
    let match = findMatchInText(textStr, cleanOriginalText);
    
    // Fallback: search with even more fuzzy logic if first attempt fails
    if (!match && originalText.length > 20) {
      const parts = originalText.split(/\s+/);
      const shorterQuery = parts.slice(0, Math.min(parts.length, 10)).join(' ');
      match = findMatchInText(textStr, shorterQuery);
    }

    if (match) {
      const textStart = match.start;
      const textEnd = match.end - 1;
      
      // Safety check for mapping bounds
      if (textStart < 0 || textEnd >= textMap.length) {
         console.warn('[SECURITY LOG] Suggestion mapping out of bounds');
         addToast('Errore di allineamento nel documento', 'error');
         return;
      }

      const htmlStart = textMap[textStart];
      let htmlEnd = textMap[textEnd] + charLens[textEnd];
      
      // Punctuation Merge: avoid double punctuation
      const terminalPunctuation = ['.', ',', '!', '?', ';', ':', '…'];
      const lastChar = suggestion.trim().slice(-1);
      if (terminalPunctuation.includes(lastChar)) {
        let lookupIdx = htmlEnd;
        while (lookupIdx < content.length && /\s/.test(content[lookupIdx])) lookupIdx++;
        if (content[lookupIdx] === lastChar) {
          htmlEnd = lookupIdx + 1;
        }
      }

      const newContent = content.slice(0, htmlStart) + suggestion + content.slice(htmlEnd);
      
      setCurrentSceneContent(newContent);
      await updateSceneContent(activeSceneId, newContent);
      setAppliedSuggestions(prev => [...prev, originalText]);
      setLastAnalyzedPhrase(activeSceneId, suggestion, activeTab);
      addToast('Modifica applicata con successo', 'success');
    } else {
      console.warn('[SECURITY LOG] Match failed for phrase:', originalText);
      addToast('Testo originale non trovato nel documento', 'error');
    }
  };

    const plainText = getPlainTextForAI(content || '');

  const runDraftRevision = async () => {
    if (!plainText || (activeSelection ? activeSelection.length < 1 : plainText.length < 10)) return;
    
    // Abort previous if any
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysis('');
    setAppliedSuggestions([]);

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

REGOLE MANDATORIE:
1. Inizia IMMEDIATAMENTE con "## Analisi Revisione".
2. Segui RIGOROSAMENTE l'ordine del testo: analizza il testo dall'alto verso il basso (lineare).
3. Per ogni problema identificato, usa QUESTO FORMATO (non cambiare mai i simboli):
   ❌ Frase originale dal testo (DEVE includere l'eventuale punteggiatura originale)
   ✅ Tua nuova versione migliorata e riscritta
   🏷️ Categoria (es: Verbo, Ritmo, Stile)
   💡 Breve spiegazione del perché la tua versione è migliore

4. REGOLE DI SOSTITUZIONE:
   - In "❌" devi copiare la frase ESATTAMENTE come appare, includendo virgolette, punti o virgole.
   - L'applicazione automatica cancellerà TUTTA la frase in "❌" (punteggiatura compresa) per sostituirla con "✅".

4. ESEMPIO DI OUTPUT:
   ❌ Il cielo era scuro e faceva molta paura.
   ✅ Nubi plumbee schiacciavano l'orizzonte, cariche di una minaccia silenziosa.
   🏷️ Atmosfera
   💡 Sostituzione di verbi generici con immagini viscerali.

5. NON scrivere introduzioni o commenti extra. Identifica 5-7 punti chiave.
6. Concludi con "## Note Generali" (2 righe di sintesi).

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
    setAppliedSuggestions([]);
    let textToAnalyze = activeSelection || plainText;
    const isSelection = !!activeSelection;
    if (textToAnalyze.length > 30000) textToAnalyze = textToAnalyze.substring(0, 30000);

    try {
      const systemPrompt = `Sei un correttore bozze professionista.
Il tuo compito è ESCLUSIVAMENTE correggere errori tecnici (ortografia, punteggiatura, spazi, a capo).
NON suggerire cambiamenti di stile o trama.

REGOLE MANDATORIE:
1. Inizia con "## Analisi Tecnica".
2. Segui RIGOROSAMENTE l'ordine del testo (alto -> basso).
3. Usa QUESTO FORMATO:
   ❌ Errore riscontrato (COPIA l'errore includendo la punteggiatura adiacente)
   ✅ Versione corretta
   🏷️ Categoria (Ortografia, Punteggiatura, Formattazione)
   💡 Breve regola grammaticale o spiegazione dell'errore

4. REGOLE DI SOSTITUZIONE:
   - In "❌" devi copiare l'errore ESATTAMENTE come appare nel testo.
   - Se correggi la punteggiatura, includi il segno errato in "❌" e il segno corretto in "✅".

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
    <div className="w-72 xl:w-80 h-full glass rounded-[40px] flex-shrink-0 flex flex-col shadow-premium z-20 transition-all duration-500 overflow-hidden relative border-[var(--border-subtle)]">
      <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]/30">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 bg-[var(--accent-soft)] rounded-2xl border border-[var(--accent)]/20 shadow-glow-mint">
             <Sparkles className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-[var(--text-bright)] leading-tight">AI Companion</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Analisi In Tempo Reale</p>
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
              className="w-full py-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] disabled:opacity-50 rounded-[28px] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 group"
            >
              <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span>{isAnalyzing ? 'Elaborazione...' : 'Analisi Strutturale'}</span>
            </button>
            
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 rounded-[24px] space-y-4 shadow-inner">
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
                          const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : (provider === 'gemini' ? 'gemini-1.5-flash' : 'deepseek-chat');
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

            {analysis ? (
              <div className="animate-in slide-in-from-bottom-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <StructuredOutput 
                  text={analysis} 
                  onApply={applySuggestion} 
                  onReject={handleReject} 
                  appliedSuggestions={appliedSuggestions} 
                  rejectedSuggestions={sceneIgnoredSuggestions} 
                  isAnalyzing={isAnalyzing}
                />
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
            {analysis ? (
              <div className="animate-in slide-in-from-bottom-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <StructuredOutput 
                  text={analysis} 
                  onApply={applySuggestion} 
                  onReject={handleReject} 
                  appliedSuggestions={appliedSuggestions} 
                  rejectedSuggestions={sceneIgnoredSuggestions} 
                  isAnalyzing={isAnalyzing}
                />
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
                <textarea 
                    className="w-full h-48 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[24px] p-6 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/30 focus:bg-[var(--bg-surface)] transition-all resize-none shadow-inner placeholder:text-[var(--text-muted)]" 
                    placeholder="Incolla qui pensieri sparsi, frammenti di dialogo o concetti vaghi..." 
                    value={braindumpInput} 
                    onChange={(e) => setBraindumpInput(e.target.value)} 
                />
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
