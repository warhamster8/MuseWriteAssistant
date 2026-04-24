export interface AISuggestion {
  original: string;
  suggestion: string;
  reason: string;
  category: string;
}

export function parseAIAnalysis(text: string): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const lines = text.split('\n');
  
  let currentSuggestion: Partial<AISuggestion> | null = null;

  lines.forEach((line) => {
    // We don't use line.trim() here to preserve internal spacing
    const hasOriginalEmoji = /❌/.test(line);
    const hasSuggestionEmoji = /✅/.test(line);
    const hasReasonEmoji = /💡/.test(line);
    const hasCategoryEmoji = /🏷️/.test(line);

    if (hasOriginalEmoji) {
      if (currentSuggestion?.original && currentSuggestion?.suggestion) {
        if (currentSuggestion.original.trim() !== currentSuggestion.suggestion.trim()) {
          suggestions.push(currentSuggestion as AISuggestion);
        }
      }
      // Cerchiamo di isolare il testo dopo l'emoji o l'etichetta senza mangiare lo spazio iniziale del contenuto
      const contentMatch = line.match(/❌\s*(?:TESTO\s*ORIGINALE\s*(?:ESATTO)?|SUGGERIMENTO\s*\d+|SUGGESTIONE\s*\d+)?\s*:?\s*(.*)/i);
      const cleanOriginal = (contentMatch ? contentMatch[1] : '')
        .replace(/\*\*/g, '')
        .replace(/^["“”«»\[]+|["“”«»\]]+$/g, '')
        .replace(/(?:Suggerimento|Suggestione|Correzione)\s*\d+[:\s]*/gi, '')
        .trim();
      currentSuggestion = { original: cleanOriginal };
    } else if (hasSuggestionEmoji) {
      if (currentSuggestion) {
        const contentMatch = line.match(/✅\s*(?:NUOVA\s*VERSIONE\s*(?:SUGGERITA)?|SUGGERIMENTO\s*\d+|SUGGESTIONE\s*\d+)?\s*:?\s*(.*)/i);
        currentSuggestion.suggestion = (contentMatch ? contentMatch[1] : '')
          .replace(/\*\*/g, '')
          .replace(/^["“”«»\[]+|["“”«»\]]+$/g, '')
          .replace(/\s*\*\(Correzione:.*?\)\*/gi, '')
          .replace(/\s*\(Correzione:.*?\)/gi, '')
          .replace(/(?:Suggerimento|Suggestione|Correzione)\s*\d+[:\s]*/gi, '')
          .trim();
      }
    } else if (hasReasonEmoji) {
      if (currentSuggestion) {
        currentSuggestion.reason = line.replace(/.*💡\s*(?:NOTA\s*EDITORIALE:?)?\s*/i, '').trim();
      }
    } else if (hasCategoryEmoji) {
      if (currentSuggestion) {
        currentSuggestion.category = line.replace(/.*🏷️\s*(?:CATEGORIA:?)?\s*/i, '').trim();
      }
    } else if (currentSuggestion && !hasOriginalEmoji && !hasSuggestionEmoji && line.trim()) {
      if (currentSuggestion.original && !currentSuggestion.suggestion) {
        currentSuggestion.original += (currentSuggestion.original ? '\n' : '') + line.trim();
      } else if (currentSuggestion.suggestion) {
        currentSuggestion.suggestion += (currentSuggestion.suggestion ? '\n' : '') + line.trim();
      }
    }
    
    // Final check for all fields to remove any leakage
    if (currentSuggestion?.original) {
      currentSuggestion.original = currentSuggestion.original
        .replace(/(?:Suggerimento|Suggestione|Correzione)\s*\d+[:\s]*/gi, '')
        .replace(/---/g, '')
        .replace(/\[(?:INIZIO|FINE)\s*(?:TARGET|CONTESTO)\]/gi, '')
        .trim();
    }
    if (currentSuggestion?.suggestion) {
      currentSuggestion.suggestion = currentSuggestion.suggestion
        .replace(/(?:Suggerimento|Suggestione|Correzione)\s*\d+[:\s]*/gi, '')
        .replace(/---/g, '')
        .replace(/\[(?:INIZIO|FINE)\s*(?:TARGET|CONTESTO)\]/gi, '')
        .trim();
    }
  });

  const final: any = currentSuggestion;
  if (final && final.original && final.suggestion && final.original.trim() !== final.suggestion.trim()) {
    suggestions.push(final as AISuggestion);
  }

  return suggestions;
}
