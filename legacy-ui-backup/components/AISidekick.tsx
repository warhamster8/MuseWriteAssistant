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
  CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useNarrative } from '../hooks/useNarrative';
import { useToast } from './Toast';
import { aiService } from '../lib/aiService';

type SidekickTab = 'revision' | 'grammar' | 'braindump' | 'transformer' | 'lexicon';

type DiffPart = { value: string; added?: boolean; removed?: boolean };

function computeDiff(oldStr: string, newStr: string) {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  
  const oldParts: DiffPart[] = oldWords.map(word => ({
    value: word,
    removed: !!(word.trim() && !newStr.includes(word.trim()))
  }));
  
  const newParts: DiffPart[] = newWords.map(word => ({
    value: word,
    added: !!(word.trim() && !oldStr.includes(word.trim()))
  }));

  return { oldParts, newParts };
}

const StructuredOutput: React.FC<{ 
  text: string; 
  onApply?: (original: string, suggestion: string) => void;
  onReject?: (original: string) => void;
  appliedSuggestions?: string[];
  rejectedSuggestions?: string[];
}> = ({ text, onApply, onReject, appliedSuggestions, rejectedSuggestions }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentSuggestion: { original?: string; suggestion?: string; reason?: string; category?: string } | null = null;

  const renderSuggestionCard = (sug: typeof currentSuggestion, key: string | number, isPending = false) => {
    if (!sug || !sug.original) return null;
    const { original, suggestion, reason, category } = sug;
    
    if (!isPending && (appliedSuggestions?.includes(original) || rejectedSuggestions?.includes(original))) {
      return null;
    }

    const { oldParts, newParts } = suggestion ? computeDiff(original, suggestion) : { oldParts: [{ value: original }], newParts: [] };

    return (
      <div key={key} className={cn(
        "bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden mb-4 shadow-lg group transition-all duration-500",
        isPending ? "opacity-70 border-blue-500/30 ring-1 ring-blue-500/10" : "animate-in fade-in zoom-in-95"
      )}>
        <div className="bg-slate-700/50 px-3 py-1.5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {category || 'Suggerimento'}
            </span>
            {isPending && <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400" />}
          </div>
          {!isPending && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onReject?.(original)}
                className="text-[10px] bg-slate-600 hover:bg-red-900/40 text-slate-300 hover:text-red-200 px-2 py-0.5 rounded transition-all flex items-center gap-1 border border-transparent hover:border-red-500/30"
              >
                <X className="w-2.5 h-2.5" /> Ignora
              </button>
              {suggestion && (
                <button 
                  onClick={() => onApply?.(original, suggestion)}
                  className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition-all flex items-center gap-1 shadow-sm shadow-blue-900/20"
                >
                  <Zap className="w-2.5 h-2.5" /> Applica
                </button>
              )}
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <div className="bg-red-950/20 border border-red-500/10 rounded-lg px-3 py-2 text-xs text-red-300/80 opacity-90 leading-relaxed">
            {oldParts.map((part, i) => (
              <span key={i} className={cn(part.removed && "bg-red-500/30 text-red-100 line-through px-0.5 rounded")}>
                {part.value}
              </span>
            ))}
          </div>
          {suggestion ? (
            <div 
              onClick={() => !isPending && suggestion && onApply?.(original, suggestion)}
              className={cn(
                "bg-green-600/10 border border-green-500/20 rounded-lg px-3 py-2 text-xs text-green-300 leading-relaxed transition-all",
                !isPending && "hover:border-green-500/40 hover:bg-green-600/20 cursor-pointer"
              )}
            >
              {newParts.map((part, i) => (
                <span key={i} className={cn(part.added && "bg-green-500/30 text-white font-bold px-0.5 rounded shadow-sm")}>
                  {part.value}
                </span>
              ))}
            </div>
          ) : isPending && (
            <div className="h-8 flex items-center px-3 bg-slate-900/40 rounded-lg border border-dashed border-slate-700 animate-pulse">
               <span className="text-[10px] text-slate-500 italic">L'IA sta elaborando la correzione...</span>
            </div>
          )}
          {reason && (
            <p className="text-[10px] text-slate-400 italic px-1 flex items-start gap-1.5 animate-in slide-in-from-left-1">
              <span className="text-blue-400">💡</span>
              <span>{reason}</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  const flushCurrent = (keyPrefix: string | number) => {
    if (currentSuggestion) {
      if (currentSuggestion.original && currentSuggestion.suggestion) {
        elements.push(renderSuggestionCard(currentSuggestion, `done-${keyPrefix}`));
        currentSuggestion = null;
      }
    }
  };

  const renderChips = (line: string, colorClass: string) => {
    const list = line.split(':')[1]?.split(',').map(w => w.trim()).filter(w => w) || [];
    return (
      <div key={line} className="flex flex-wrap gap-1.5 py-1 px-1 mb-4">
        {list.map((word, idx) => (
          <span 
            key={idx} 
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-default hover:scale-105",
              colorClass
            )}
          >
            {word}
          </span>
        ))}
      </div>
    );
  };

  lines.forEach((line, i) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    if (/^(?:\d+\.\s*)?❌/.test(trimmedLine)) {
      flushCurrent(i);
      currentSuggestion = { 
        original: trimmedLine.replace(/^(?:\d+\.\s*)?❌\s*/, '').replace(/^["“”«»]+|["“”«»]+$/g, '').trim() 
      };
    } else if (/^(?:\d+\.\s*)?✅/.test(trimmedLine)) {
      if (currentSuggestion) {
        currentSuggestion.suggestion = trimmedLine.replace(/^(?:\d+\.\s*)?✅\s*/, '').replace(/^["“”«»]+|["“”«»]+$/g, '').trim();
      }
    } else if (/^(?:\d+\.\s*)?💡/.test(trimmedLine)) {
      if (currentSuggestion) {
        currentSuggestion.reason = trimmedLine.replace(/^(?:\d+\.\s*)?💡\s*/, '').trim();
      } else {
        elements.push(
          <p key={i} className="text-[10px] text-slate-400 italic px-1 bg-slate-800/30 p-2 rounded-lg mb-4 border-l-2 border-blue-500/30">
            {trimmedLine.replace(/^💡\s*/, '')}
          </p>
        );
      }
    } else if (/^(?:\d+\.\s*)?🏷️/.test(trimmedLine)) {
      if (currentSuggestion) {
        currentSuggestion.category = trimmedLine.replace(/^(?:\d+\.\s*)?🏷️\s*/, '').trim();
      }
    } else if (trimmedLine.startsWith('S:')) {
      flushCurrent(i);
      elements.push(renderChips(trimmedLine, "bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20"));
    } else if (trimmedLine.startsWith('A:')) {
      flushCurrent(i);
      elements.push(renderChips(trimmedLine, "bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700"));
    } else if (trimmedLine.startsWith('M:')) {
      flushCurrent(i);
      elements.push(
        <div key={i} className="bg-blue-900/10 border border-blue-500/10 rounded-xl p-3 mb-4">
          <p className="text-xs text-blue-100 font-medium leading-relaxed">{trimmedLine.replace(/^M:\s*/, '')}</p>
        </div>
      );
    } else if (trimmedLine.startsWith('##')) {
      flushCurrent(i);
      elements.push(
        <div key={i} className="pt-6 pb-2 mb-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-400">
            {trimmedLine.replace(/^#+\s*/, '')}
          </h3>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/30 to-transparent ml-4" />
        </div>
      );
    } else if (trimmedLine) {
      if (!currentSuggestion) {
        elements.push(
          <div key={i} className="px-3 py-2 bg-slate-800/20 border-l-2 border-slate-700 rounded-r-lg mb-4 ml-1">
            <p className="text-slate-400 text-[11px] leading-relaxed italic">
              {trimmedLine}
            </p>
          </div>
        );
      }
    }
  });

  if (currentSuggestion) {
    elements.push(renderSuggestionCard(currentSuggestion, "pending-last", true));
  } else if (text.endsWith('\n') || text.length === 0) {
    // Show a subtle pulse if we just finished a line and might be waiting for the next
    elements.push(
      <div key="typing" className="flex items-center gap-1.5 px-3 py-2 opacity-40">
        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
      </div>
    );
  }

  return <div className="space-y-1">{elements}</div>;
};

export const AISidekick: React.FC = () => {
  const { 
    currentSceneContent: content, 
    activeSceneId, 
    setCurrentSceneContent,
    ignoredSuggestions,
    addIgnoredSuggestion,
    lastAnalyzedPhrase,
    setLastAnalyzedPhrase,
    sceneAnalysis,
    setSceneAnalysis,
    activeSelection,
    aiConfig,
    setActiveTab: setGlobalTab
  } = useStore();
  
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
        const index = phrase ? fullText.indexOf(phrase) : -1;
        return { content: sug, index };
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
    
    const buildMapping = (html: string) => {
      const textMap: number[] = [];
      const charLens: number[] = [];
      let textStr = '';
      let inTag = false;
      let i = 0;
      while (i < html.length) {
          if (html[i] === '<') { inTag = true; i++; continue; }
          if (html[i] === '>') { inTag = false; i++; continue; }
          if (inTag) { i++; continue; }
          
          if (html[i] === '&') {
              const end = html.indexOf(';', i);
              if (end !== -1 && end - i < 10) {
                  const entity = html.substring(i, end + 1);
                  textMap.push(i);
                  charLens.push(entity.length);
                  if (entity === '&nbsp;') textStr += ' ';
                  else if (entity === '&lt;') textStr += '<';
                  else if (entity === '&gt;') textStr += '>';
                  else if (entity === '&amp;') textStr += '&';
                  else textStr += ' '; 
                  i = end + 1;
                  continue;
              }
          }
          
          textMap.push(i);
          charLens.push(1);
          textStr += html[i];
          i++;
      }
      return { textStr, textMap, charLens };
    };

    const { textStr, textMap, charLens } = buildMapping(content);
    
    const normalizeIt = (str: string) => str
      .replace(/[\u201C\u201D\u201E\u201F«»]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/E['’]/g, 'È')
      .replace(/\u00A0/g, ' ')
      .trim();

    const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const searchOriginal = removeAccents(normalizeIt(originalText));
    const searchStrHtml = removeAccents(textStr); // Don't normalize textStr here to keep indices aligned

    const parts = searchOriginal.split(/\.\.\.|…/);
    const gapPattern = '[\\s\\W]*'; // Any non-word character or space

    // Stage 1: Strict Match (includes punctuation)
    let regexStr = parts.map(part => {
        const tokens = part.match(/[a-zA-Z0-9]+|[^\s\w]/g) || [];
        return tokens.map(t => escapeRegex(t)).join(gapPattern);
    }).filter(p => p).join('(?:.|\\n){0,150}?');

    let regex = new RegExp(regexStr, 'i');
    let match = searchStrHtml.match(regex);

    // Stage 2: Fuzzy Word Match (ignore punctuation differences)
    if (!match) {
        regexStr = parts.map(part => {
            const words = part.match(/[a-zA-Z0-9]+/g) || [];
            return words.map(w => escapeRegex(w)).join('[\\s\\W]*');
        }).filter(p => p).join('(?:.|\\n){0,200}?');
        regex = new RegExp(regexStr, 'i');
        match = searchStrHtml.match(regex);
    }

    // Stage 3: Anchor Match (First/Last words)
    if (!match) {
        const allWords = searchOriginal.match(/[a-zA-Z0-9]+/g) || [];
        if (allWords.length >= 4) {
            const first = allWords.slice(0, 3).map(w => escapeRegex(w)).join('[\\s\\W]*');
            const last = allWords.slice(-3).map(w => escapeRegex(w)).join('[\\s\\W]*');
            const maxLen = Math.max(200, searchOriginal.length * 2);
            regexStr = `${first}(?:.|\\n){0,${maxLen}}?${last}`;
            regex = new RegExp(regexStr, 'i');
            match = searchStrHtml.match(regex);
        }
    }

    if (match) {
      const textStart = match.index!;
      const textEnd = textStart + match[0].length - 1;
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
      addToast('Testo originale non trovato, modifica manualmente', 'error');
    }
  };

  const getPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const plainText = getPlainText(content || '');

  const runDraftRevision = async () => {
    if (!plainText || plainText.length < 30) return;
    setIsAnalyzing(true);
    setAnalysis('');
    setAppliedSuggestions([]);

    let textToAnalyze = activeSelection || plainText;
    const isSelection = !!activeSelection;

    if (!isSelection) {
      const memoryKey = `${activeSceneId}-revision`;
      const lastPhrase = activeSceneId ? lastAnalyzedPhrase[memoryKey] : null;

      if (lastPhrase) {
        let index = plainText.indexOf(lastPhrase);
        if (index === -1) {
          // Try fallback with word context
          const words = lastPhrase.trim().split(/\s+/);
          if (words.length > 5) {
            const pattern = words.slice(-5).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
            try {
              const regex = new RegExp(pattern, 'i');
              const match = plainText.match(regex);
              if (match) index = match.index!;
            } catch(e) {}
          }
        }
        if (index !== -1) {
          const startIndex = Math.max(0, index + lastPhrase.length);
          if (startIndex < plainText.length - 20) {
             textToAnalyze = plainText.substring(startIndex);
          }
        }
      }
    }

    if (textToAnalyze.length > 4000) {
      textToAnalyze = textToAnalyze.substring(0, 4000);
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
          { role: 'user', content: `${isSelection ? 'REVISIONA SOLO QUESTA SELEZIONE:\n' : 'Revisiona questa bozza:\n'}\n${textToAnalyze}` }
        ],
        (chunk) => {
          fullResponse += chunk;
          setAnalysis(prev => prev + chunk);
        }
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
      setAnalysis(`❌ Errore AI: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runGrammarAnalysis = async () => {
    if (!plainText || plainText.length < 10) return;
    setIsAnalyzing(true);
    setAnalysis('');
    
    let textToAnalyze = activeSelection || plainText;
    if (textToAnalyze.length > 4000) textToAnalyze = textToAnalyze.substring(0, 4000);

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

4. CASI SPECIFICI:
   - Punteggiatura: Controlla spazi prima/dopo virgole e punti.
   - A capo: Segnala paragrafi interrotti a metà parola o troppi spazi/invio vuoti inutili.
   - Accenti/Apostrofi: Verifica "È" vs "E'", "perché" vs "perche'", ecc.

LINGUA: Italiano. Sii estremamente preciso.`;

      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Correggi ortografia e punteggiatura di questo testo:\n\n${textToAnalyze}` }
        ],
        (chunk) => setAnalysis(prev => prev + chunk)
      );
    } catch (err: any) {
      setAnalysis(`❌ Errore AI: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runBraindump = async () => {
    if (!braindumpInput.trim()) return;
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
        (chunk) => setAnalysis(prev => prev + chunk)
      );
    } catch (err: any) {
      setAnalysis(`❌ Errore: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stylePrompts: Record<string, string> = {
    visceral: `Riscrivi usando ESCLUSIVAMENTE sensazioni fisiche. Zero astrazioni. Solo carne, sudore, respiro.`,
    atmospheric: `Riscrivi trasformando l'ambiente in un personaggio vivo e carico di tensione.`,
    metaphorical: `Riscrivi usando metafore estese e immagini archetipiche originali.`,
    psychological: `Riscrivi portando il lettore DENTRO la mente del personaggio (monologo interiore).`,
  };

  const runStyleTransform = async (style: string) => {
    if (!plainText || plainText.length < 10) return;
    setIsAnalyzing(true);
    setAnalysis('');
    let textToAnalyze = plainText.length > 3000 ? plainText.substring(0, 3000) : plainText;

    try {
      await aiService.streamChat(
        aiConfig,
        [
          { role: 'system', content: stylePrompts[style] + " Riscrivi in italiano. Restituisci SOLO il testo riscritto." },
          { role: 'user', content: `Riscrivi questo:\n\n${textToAnalyze}` }
        ],
        (chunk) => setAnalysis(prev => prev + chunk)
      );
    } catch (err: any) {
      setAnalysis(`❌ Errore: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runLexiconTool = async (mode: 'synonyms' | 'metaphors') => {
    if (!lexiconInput.trim()) return;
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
        (chunk) => setAnalysis(prev => prev + chunk)
      );
    } catch (err: any) {
      setAnalysis(`❌ Errore: ${err?.message || 'Errore Sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tabs: { id: SidekickTab; label: string; icon: React.ReactNode }[] = [
    { id: 'revision', label: 'Revisione', icon: <PenLine className="w-3 h-3" /> },
    { id: 'grammar', label: 'Correzione', icon: <CheckCircle className="w-3 h-3" /> },
    { id: 'braindump', label: 'Braindump', icon: <Lightbulb className="w-3 h-3" /> },
    { id: 'transformer', label: 'Stile', icon: <Wand2 className="w-3 h-3" /> },
    { id: 'lexicon', label: 'Lessico', icon: <Languages className="w-3 h-3" /> },
  ];

  const currentLastPhrase = activeSceneId ? lastAnalyzedPhrase[`${activeSceneId}-${activeTab}`] : null;

  return (
    <div className="w-80 h-screen glass border-l border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-slate-200">AI Sidekick</h2>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 animate-pulse">
              <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">
                {aiConfig.provider === 'groq' ? 'Groq Active' : 'DeepSeek Active'}
              </span>
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 p-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center justify-center gap-1 text-[9px] uppercase tracking-tighter py-2 rounded transition-all border border-transparent whitespace-nowrap",
              activeTab === tab.id ? "bg-slate-700/50 text-blue-400 border-slate-600" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'revision' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase">Correzione Bozza</span>
                {activeSelection && (
                  <span className="text-[9px] text-green-400 font-bold animate-pulse">✨ Selezione attiva</span>
                )}
                {!activeSelection && currentLastPhrase && (
                  <span className="text-[9px] text-blue-400/60 truncate max-w-[120px] italic">Memoria: {currentLastPhrase.slice(0, 15)}...</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeSceneId && lastAnalyzedPhrase[`${activeSceneId}-revision`] && !activeSelection && (
                  <button 
                    onClick={() => { 
                      setLastAnalyzedPhrase(activeSceneId!, '', 'revision'); 
                      setSceneAnalysis(activeSceneId!, '', 'revision'); 
                    }} 
                    title="Reset memory"
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={runDraftRevision} disabled={isAnalyzing || (activeSelection ? activeSelection.length < 5 : plainText.length < 30)} className={cn(
                  "text-xs px-3 py-1.5 rounded-lg text-white flex items-center space-x-1 transition-all shadow-lg",
                  activeSelection ? "bg-green-600 hover:bg-green-500 shadow-green-900/30" : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/30"
                )}>
                  <Zap className="w-3 h-3" />
                  <span>{activeSelection ? 'Analizza Selezione' : (currentLastPhrase ? 'Continua' : 'Analizza')}</span>
                </button>
              </div>
            </div>
            
            <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                  <button 
                    onClick={() => setGlobalTab('config')}
                    className="text-xs text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1 group"
                  >
                    Motore: <span className="text-white font-medium group-hover:text-blue-400">{aiConfig.provider === 'groq' ? 'Llama 3.3 70B' : 'DeepSeek V3'}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                </div>
                <button 
                  onClick={handleConvertQuotes}
                  title='Converti " " in « »'
                  className="p-1.5 text-blue-400/60 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all flex items-center gap-1.5 group"
                >
                  <Quote className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-all">Fix « »</span>
                </button>
              </div>
            </div>

            {analysis ? (
              <div className="animate-in slide-in-from-bottom-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <StructuredOutput text={analysis} onApply={applySuggestion} onReject={handleReject} appliedSuggestions={appliedSuggestions} rejectedSuggestions={sceneIgnoredSuggestions} />
              </div>
            ) : (
              !isAnalyzing && <div className="flex flex-col items-center justify-center h-36 text-slate-600 space-y-2"><AlertTriangle className="w-8 h-8 opacity-20" /><p className="text-xs text-center">Seleziona una scena e premi Analizza.</p></div>
            )}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Analisi Ortografica</span>
              <button 
                onClick={runGrammarAnalysis} 
                disabled={isAnalyzing || (activeSelection ? activeSelection.length < 5 : plainText.length < 20)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg text-white flex items-center space-x-1 transition-all shadow-lg",
                  activeSelection ? "bg-green-600 shadow-green-900/30" : "bg-blue-600 shadow-blue-900/30"
                )}
              >
                <CheckCircle className="w-3 h-3" />
                <span>{activeSelection ? 'Correggi Selezione' : 'Trova Errori'}</span>
              </button>
            </div>
            {analysis ? (
              <div className="animate-in slide-in-from-bottom-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <StructuredOutput text={analysis} onApply={applySuggestion} onReject={handleReject} appliedSuggestions={appliedSuggestions} rejectedSuggestions={sceneIgnoredSuggestions} />
              </div>
            ) : (
              !isAnalyzing && <div className="flex flex-col items-center justify-center h-36 text-slate-600 space-y-2"><CheckCircle className="w-8 h-8 opacity-20" /><p className="text-xs text-center border-t border-slate-700/50 pt-3">Nessun errore rilevato finora.</p></div>
            )}
          </div>
        )}

        {activeTab === 'braindump' && (
          <div className="space-y-4">
            <textarea className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner" placeholder="Pensieri sparsi..." value={braindumpInput} onChange={(e) => setBraindumpInput(e.target.value)} />
            <button onClick={runBraindump} disabled={isAnalyzing || !braindumpInput.trim()} className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30"><Zap className="w-3 h-3" />Espandi Idee</button>
            {analysis && <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 animate-in slide-in-from-bottom-2 max-h-[40vh] overflow-y-auto custom-scrollbar"><StructuredOutput text={analysis} /></div>}
          </div>
        )}

        {activeTab === 'transformer' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(stylePrompts).map(key => (
                <button key={key} onClick={() => runStyleTransform(key)} disabled={isAnalyzing || plainText.length < 10} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 p-3 rounded-lg text-left border border-slate-700 hover:border-blue-500/50 transition-all group">
                  <div className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors uppercase">{key}</div>
                </button>
              ))}
            </div>
            {analysis && <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 animate-in fade-in max-h-[40vh] overflow-y-auto custom-scrollbar"><StructuredOutput text={analysis} /></div>}
          </div>
        )}

        {activeTab === 'lexicon' && (
          <div className="space-y-4">
            <div className="relative">
              <input className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 pl-10 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-all shadow-inner" placeholder="Parola o concetto..." value={lexiconInput} onChange={(e) => setLexiconInput(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => runLexiconTool('synonyms')} disabled={isAnalyzing || !lexiconInput.trim()} className="py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-bold transition-all border border-slate-700">Sinonimi</button>
              <button onClick={() => runLexiconTool('metaphors')} disabled={isAnalyzing || !lexiconInput.trim()} className="py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/30">Metafore</button>
            </div>
            {analysis && <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 animate-in slide-in-from-bottom-2 max-h-[40vh] overflow-y-auto custom-scrollbar"><StructuredOutput text={analysis} /></div>}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[10px] text-slate-500 uppercase font-bold">
          <div className={cn("w-2 h-2 rounded-full", isAnalyzing ? "bg-blue-500 animate-pulse" : "bg-green-500")}></div>
          <span>API Connected</span>
        </div>
      </div>
    </div>
  );
};
