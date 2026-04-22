import React from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Lightbulb, 
  Zap,
  RefreshCw,
  PenLine,
  Wand2,
  BookOpen,
  Languages,
  X,
  ChevronRight,
  Quote,
  CheckCircle,
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useNarrative } from '../hooks/useNarrative';
import { useToast } from './Toast';
import { aiService } from '../lib/aiService';
import { findMatchInText } from '../lib/tiptap/matchUtils';
import { StructuredOutput } from './analysis/StructuredOutput';
import { DeepAnalysisModal } from './analysis/DeepAnalysisModal';

const buildMapping = (html: string) => {
  const textMap: number[] = [];
  const charLens: number[] = [];
  let textStr = '';
  let i = 0;
  
  const blockTags = ['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol'];
  
  while (i < html.length) {
      if (html[i] === '<') {
          const end = html.indexOf('>', i);
          if (end !== -1) {
              const tagFull = html.substring(i + 1, end).toLowerCase();
              const tagName = tagFull.split(/\s+/)[0].replace('/', '');
              
              // If it's a block tag (closing or opening), and we haven't already added a newline
              if (blockTags.includes(tagName)) {
                  // Only add newline if we aren't at the very start and haven't just added a newline
                  if (textStr.length > 0 && !textStr.endsWith('\n')) {
                      textStr += '\n';
                      textMap.push(i); // Map the newline to the start of the tag
                      charLens.push(0); // It has 0 length in the actual text but represents a break
                  }
              }
              i = end + 1;
              continue;
          }
      }
      
      if (html[i] === '&') {
          const end = html.indexOf(';', i);
          if (end !== -1 && end - i < 12) {
              const entity = html.substring(i, end + 1);
              let char = ' ';
              if (entity === '&nbsp;') char = ' ';
              else if (entity === '&lt;') char = '<';
              else if (entity === '&gt;') char = '>';
              else if (entity === '&amp;') char = '&';
              else if (entity === '&quot;' || entity === '&ldquo;' || entity === '&rdquo;') char = '"';
              else if (entity === '&apos;' || entity === '&lsquo;' || entity === '&rsquo;') char = "'";
              else if (entity.startsWith('&#')) {
                 const code = parseInt(entity.slice(2, -1));
                 char = isNaN(code) ? '?' : String.fromCharCode(code);
              }

              textStr += char;
              textMap.push(i);
              charLens.push(entity.length);
              i = end + 1;
              continue;
          }
      }
      
      textStr += html[i];
      textMap.push(i);
      charLens.push(1);
      i++;
  }
  return { textStr, textMap, charLens };
};

const getPlainTextForAI = (html: string) => {
  const { textStr } = buildMapping(html);
  return textStr;
};

type SidekickTab = 'revision' | 'grammar' | 'braindump' | 'transformer' | 'lexicon' | 'integrity';

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
  const setGlobalTab = useStore(s => s.setActiveTab);
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
  const [isDeepModalOpen, setIsDeepModalOpen] = React.useState(false);
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
    
    // Use unified fuzzy matching
    let match = findMatchInText(textStr, originalText);
    
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

  const runIntegrityCheck = async () => {
    if (!plainText || plainText.length < 20) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsAnalyzing(true);
    setAnalysis('');
    setAppliedSuggestions([]);
    
    let textToAnalyze = plainText;
    if (textToAnalyze.length > 30000) textToAnalyze = textToAnalyze.substring(0, 30000);

    try {
      const systemPrompt = `Sei un revisore editoriale esperto in coerenza narrativa e logica temporale.
Il tuo compito è analizzare l'INTERA SCENA per identificare errori strutturali profondi.

FOCUS DELL'ANALISI:
1. TEMPI VERBALI: Rileva salti ingiustificati tra passato e presente (es. inizia in passato remoto e finisce in presente indicativo).
2. FLUSSO CRONOLOGICO: Rileva errori nella successione degli eventi (es. un personaggio esce da una stanza e poi ci parla dentro, o eventi che si contraddicono).
3. REFUSI E ORTOGRAFIA: Identifica refusi tecnici.

REGOLE MANDATORIE:
1. Inizia con "## Analisi di Coerenza Profonda".
2. Usa QUESTO FORMATO:
   ❌ Testo originale (COPIA ESATTA del frammento incoerente)
   ✅ Versione corretta e armonizzata
   🏷️ Categoria (Tempo Verbale, Coerenza Logica, Refuso)
   💡 Spiegazione del perché la modifica è necessaria per la coerenza globale.

LINGUA: Italiano. Sii critico e preciso.`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analizza la coerenza di questa scena intera:\n\n${textToAnalyze}` }
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

  const tabs: { id: SidekickTab; label: string; icon: React.ReactNode }[] = [
    { id: 'revision', label: 'Revisione', icon: <PenLine className="w-3 h-3" /> },
    { id: 'grammar', label: 'Correzione', icon: <CheckCircle className="w-3 h-3" /> },
    { id: 'braindump', label: 'Braindump', icon: <Lightbulb className="w-3 h-3" /> },
    { id: 'transformer', label: 'Stile', icon: <Wand2 className="w-3 h-3" /> },
    { id: 'integrity', label: 'Coerenza', icon: <ShieldCheck className="w-3 h-3" /> },
    { id: 'lexicon', label: 'Lessico', icon: <Languages className="w-3 h-3" /> },
  ];

  const currentLastPhrase = activeSceneId ? lastAnalyzedPhrase[`${activeSceneId}-${activeTab}`] : null;

  return (
    <div className="w-72 xl:w-80 h-full glass-dark rounded-[40px] flex-shrink-0 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] z-20 transition-all duration-500 overflow-hidden relative border-white/10">
      <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 bg-[#5be9b1]/10 rounded-2xl border border-[#5be9b1]/20">
             <Sparkles className="w-6 h-6 text-[#5be9b1]" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white leading-tight">AI Companion</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">Analisi In Tempo Reale</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAnalyzing && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#5be9b1]/5 border border-[#5be9b1]/20 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin text-[#5be9b1]" />
            </div>
          )}
          
          <button 
            onClick={() => setSidekickOpen(false)}
            className="p-2.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
            title="Chiudi Companion"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pulsante Espansione Globale - Visibile quando c'è un'analisi */}
      {analysis && !isAnalyzing && (
        <div className="px-8 pb-4 animate-in slide-in-from-top-2">
           <button 
              onClick={() => setIsDeepModalOpen(true)}
              className="w-full py-3 bg-[#5be9b1]/10 hover:bg-[#5be9b1]/20 text-[#5be9b1] rounded-2xl transition-all border border-[#5be9b1]/20 shadow-lg active:scale-95 flex items-center justify-center gap-3 group"
              title="Apri Vista Grande"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Espandi Visuale Per Leggere Meglio</span>
            </button>
        </div>
      )}

      <div className="grid grid-cols-6 gap-1 p-3 bg-white/[0.01] border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            className={cn(
              "flex items-center justify-center py-3 rounded-2xl transition-all border border-transparent active:scale-95 group",
              activeTab === tab.id 
                ? "bg-[#5be9b1] text-[#0b0e11] shadow-inner" 
                : "text-slate-600 hover:text-slate-400 hover:bg-white/5"
            )}
          >
            <div className={cn("transition-transform group-hover:scale-110", activeTab === tab.id ? "scale-110" : "")}>
                {tab.icon}
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide bg-black/20">
        {activeTab === 'revision' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.2em] truncate">Correzione Bozza</span>
                {activeSelection && (
                  <span className="text-[8px] text-[#5be9b1] font-bold uppercase tracking-widest mt-1 animate-pulse flex items-center gap-2">
                     <div className="w-1 h-1 bg-[#5be9b1] rounded-full" /> Selezione
                  </span>
                )}
                {!activeSelection && currentLastPhrase && (
                  <span className="text-[8px] text-slate-600/60 truncate max-w-[100px] italic mt-1 uppercase tracking-tighter">Memoria: {currentLastPhrase.slice(0, 10)}...</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isAnalyzing || analysis ? (
                  <button 
                    onClick={handleStop}
                    title={isAnalyzing ? "Interrompi" : "Rimuovi suggerimenti"}
                    className="p-2.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
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
                    className="p-2.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button onClick={runDraftRevision} disabled={isAnalyzing || (activeSelection ? activeSelection.length < 1 : plainText.length < 10)} className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl text-white flex items-center space-x-2 transition-all shadow-2xl active:scale-95 disabled:opacity-50 shrink-0",
                  activeSelection ? "bg-[#5be9b1] hover:bg-[#5be9b1] shadow-[#5be9b1]/20" : "bg-[#5be9b1] hover:bg-[#5be9b1] shadow-emerald-950/40"
                )}>
                  <Zap className="w-3.5 h-3.5" />
                  <span>{activeSelection ? 'Revisiona' : (currentLastPhrase ? 'Continua' : 'Analizza')}</span>
                </button>
              </div>
            </div>
            
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[24px] space-y-4 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-[#5be9b1]/10 rounded-xl">
                    <BookOpen className="w-4 h-4 text-[#5be9b1] shrink-0" />
                  </div>
                  <button 
                    onClick={() => setGlobalTab('config')}
                    className="flex flex-col text-left group"
                  >
                    <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Motore Attivo</span>
                    <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-300 font-medium group-hover:text-[#5be9b1] transition-colors">{aiConfig.provider === 'groq' ? 'Llama 3.3 70B' : 'DeepSeek V3'}</span>
                        <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-[#5be9b1] transition-all group-hover:translate-x-1" />
                    </div>
                  </button>
                </div>
                <button 
                  onClick={handleConvertQuotes}
                  title='Converti " " in « »'
                  className="p-3 text-[#5be9b1]/40 hover:text-[#5be9b1] hover:bg-[#5be9b1]/10 rounded-2xl transition-all flex items-center gap-2 group border border-transparent hover:border-[#5be9b1]/20"
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
              !isAnalyzing && <div className="flex flex-col items-center justify-center h-36 text-slate-600 space-y-2"><AlertTriangle className="w-8 h-8 opacity-20" /><p className="text-xs text-center">Seleziona una scena e premi Analizza.</p></div>
            )}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em]">Analisi Tecnica</span>
                {activeSelection && (
                  <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-1 animate-pulse flex items-center gap-2">
                    <Zap className="w-2.5 h-2.5" /> Selezione Attiva
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={runGrammarAnalysis}
                  disabled={isAnalyzing || !plainText}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                    isAnalyzing || !plainText ? "bg-slate-800 text-slate-600" : "bg-white/5 text-[#5be9b1] hover:bg-[#5be9b1]/10 border border-[#5be9b1]/20 flex items-center gap-2"
                  )}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{activeSelection ? 'Correggi' : 'Trova Errori'}</span>
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
              !isAnalyzing && <div className="flex flex-col items-center justify-center h-48 text-slate-800 space-y-4 bg-white/[0.01] rounded-[32px] border border-dashed border-white/5"><CheckCircle className="w-10 h-10 opacity-20" /><p className="text-[10px] font-bold border-t border-white/5 pt-4 uppercase tracking-[0.2em]">Nessuna anomalia tecnica rilevata</p></div>
            )}
          </div>
        )}

        {activeTab === 'braindump' && (
          <div className="space-y-6">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em] mb-4">Sviluppo Intuizioni</span>
                <textarea 
                    className="w-full h-48 bg-[#171b1f] border border-white/5 rounded-[24px] p-6 text-xs text-slate-300 focus:outline-none focus:border-[#5be9b1]/30 focus:bg-[#1a1f24] transition-all resize-none shadow-inner placeholder:text-slate-800" 
                    placeholder="Incolla qui pensieri sparsi, frammenti di dialogo o concetti vaghi..." 
                    value={braindumpInput} 
                    onChange={(e) => setBraindumpInput(e.target.value)} 
                />
            </div>
            <button 
                onClick={runBraindump} 
                disabled={isAnalyzing || !braindumpInput.trim()} 
                className="w-full py-4 bg-[#5be9b1] hover:bg-[#4ade80] text-[#0b0e11] disabled:opacity-50 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-2xl shadow-[#5be9b1]/10 active:scale-95"
            >
                <Zap className="w-4 h-4" />
                Espandi Concetti
            </button>
            {analysis && (
                <div className="bg-[#5be9b1]/5 p-6 rounded-[32px] border border-[#5be9b1]/10 animate-in slide-in-from-bottom-2 max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                    <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
                </div>
            )}
          </div>
        )}

        {activeTab === 'braindump' && (
          <div className="space-y-6">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em] mb-4">Sviluppo Intuizioni</span>
                <textarea 
                    className="w-full h-48 bg-[#171b1f] border border-white/5 rounded-[24px] p-6 text-xs text-slate-300 focus:outline-none focus:border-[#5be9b1]/30 focus:bg-[#1a1f24] transition-all resize-none shadow-inner placeholder:text-slate-800" 
                    placeholder="Incolla qui pensieri sparsi, frammenti di dialogo o concetti vaghi..." 
                    value={braindumpInput} 
                    onChange={(e) => setBraindumpInput(e.target.value)} 
                />
            </div>
            <button 
                onClick={runBraindump} 
                disabled={isAnalyzing || !braindumpInput.trim()} 
                className="w-full py-4 bg-[#5be9b1] hover:bg-[#4ade80] text-[#0b0e11] disabled:opacity-50 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-2xl shadow-[#5be9b1]/10 active:scale-95"
            >
                <Zap className="w-4 h-4" />
                Espandi Concetti
            </button>
            {analysis && (
                <div className="bg-[#5be9b1]/5 p-6 rounded-[32px] border border-[#5be9b1]/10 animate-in slide-in-from-bottom-2 max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                    <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
                </div>
            )}
          </div>
        )}

        {activeTab === 'transformer' && (
          <div className="space-y-6">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em] block">Modulazione Stilistica</span>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(stylePrompts).map(key => (
                <button 
                    key={key} 
                    onClick={() => runStyleTransform(key)} 
                    disabled={isAnalyzing || plainText.length < 10} 
                    className="bg-[#171b1f] hover:bg-[#5be9b1]/10 disabled:opacity-50 p-5 rounded-[24px] text-left border border-white/5 hover:border-[#5be9b1]/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 bg-[#5be9b1]/5 blur-xl group-hover:bg-[#5be9b1]/10 transition-all" />
                  <div className="text-[10px] font-black text-slate-500 group-hover:text-[#5be9b1] transition-colors uppercase tracking-widest relative z-10">{key}</div>
                </button>
              ))}
            </div>
            {analysis && (
                <div className="bg-[#5be9b1]/5 p-6 rounded-[32px] border border-[#5be9b1]/10 animate-in fade-in max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                    <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
                </div>
            )}
          </div>
        )}

        {activeTab === 'integrity' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#5be9b1] uppercase tracking-[0.2em]">Analisi Coerenza</span>
                <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1">Scansione Globale Scena</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={runIntegrityCheck}
                  disabled={isAnalyzing || !plainText}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                    isAnalyzing || !plainText ? "bg-slate-800 text-slate-600" : "bg-[#5be9b1] text-[#0b0e11] hover:bg-[#4ade80] flex items-center gap-2"
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Analizza</span>
                </button>
              </div>
            </div>
            
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] text-[10px] text-slate-500 leading-relaxed italic">
              Questa funzione analizza l'intera scena per trovare discrepanze nei tempi verbali, flussi logici e refusi.
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
              !isAnalyzing && <div className="flex flex-col items-center justify-center h-48 text-slate-600 bg-white/[0.01] rounded-[32px] border border-dashed border-white/5 space-y-4">
                <ShieldCheck className="w-10 h-10 opacity-20" />
                <p className="text-[9px] font-bold uppercase tracking-widest">Inizia scansione profonda</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lexicon' && (
          <div className="space-y-6">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em] mb-4">Indice Lessicale</span>
                <div className="relative group">
                    <Languages className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-[#5be9b1] transition-colors" />
                    <input 
                        className="w-full bg-[#121519]/60 border border-white/5 rounded-[20px] py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-[#5be9b1]/30 focus:bg-[#121519] transition-all shadow-inner placeholder:text-slate-800" 
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
                className="py-4 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 rounded-[20px] text-[10px] font-bold uppercase tracking-widest transition-all border border-white/5 hover:border-[#5be9b1]/20"
              >
                Sinonimi
              </button>
              <button 
                onClick={() => runLexiconTool('metaphors')} 
                disabled={isAnalyzing || !lexiconInput.trim()} 
                className="py-4 bg-[#5be9b1] hover:bg-[#5be9b1] disabled:opacity-50 rounded-[20px] text-[10px] font-bold uppercase tracking-widest text-white transition-all shadow-2xl shadow-emerald-950/40 active:scale-95"
              >
                Metafore
              </button>
            </div>
            {analysis && (
                <div className="bg-[#5be9b1]/5 p-6 rounded-[32px] border border-[#5be9b1]/10 animate-in slide-in-from-bottom-2 max-h-[40vh] overflow-y-auto custom-scrollbar shadow-inner">
                    <StructuredOutput text={analysis} isAnalyzing={isAnalyzing} />
                </div>
            )}
          </div>
        )}
      </div>

      <div className="p-8 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center space-x-3 text-[9px] text-slate-700 uppercase font-bold tracking-[0.2em]">
          <div className={cn("w-2 h-2 rounded-full", isAnalyzing ? "bg-[#5be9b1] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-emerald-900")}></div>
          <span>Architettura Sincronizzata</span>
        </div>
      </div>

      <DeepAnalysisModal 
        isOpen={isDeepModalOpen}
        onClose={() => setIsDeepModalOpen(false)}
        analysis={analysis}
        onApply={applySuggestion}
        onReject={handleReject}
        appliedSuggestions={appliedSuggestions}
        rejectedSuggestions={sceneIgnoredSuggestions}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
});
