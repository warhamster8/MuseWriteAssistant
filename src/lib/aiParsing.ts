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
      const cleanOriginal = line
        .replace(/.*❌\s*(?:TESTO\s*ORIGINALE\s*(?:ESATTO)?:?)?\s*/i, '')
        .replace(/\*\*/g, '')
        .replace(/^["“”«»]+|["“”«»]+$/g, '');
      currentSuggestion = { original: cleanOriginal };
    } else if (hasSuggestionEmoji) {
      if (currentSuggestion) {
        currentSuggestion.suggestion = line
          .replace(/.*✅\s*(?:NUOVA\s*VERSIONE\s*(?:SUGGERITA)?:?)?\s*/i, '')
          .replace(/\*\*/g, '')
          .replace(/^["“”«»]+|["“”«»]+$/g, '');
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
        currentSuggestion.original += (currentSuggestion.original ? ' ' : '') + line.trim();
      } else if (currentSuggestion.suggestion) {
        currentSuggestion.suggestion += (currentSuggestion.suggestion ? ' ' : '') + line.trim();
      }
    }
  });

  const final: any = currentSuggestion;
  if (final && final.original && final.suggestion && final.original.trim() !== final.suggestion.trim()) {
    suggestions.push(final as AISuggestion);
  }

  return suggestions;
}
