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
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Detection patterns matching StructuredOutput.tsx logic
    if (/^(?:\d+\.\s*)?❌/.test(trimmedLine)) {
      if (currentSuggestion?.original && currentSuggestion?.suggestion) {
        suggestions.push(currentSuggestion as AISuggestion);
      }
      const cleanOriginal = trimmedLine
        .replace(/^(?:\d+\.\s*)?❌\s*/, '')
        .replace(/^\*\*.*?\*\*\s*/, '')
        .replace(/^["“”«»]+|["“”«»]+$/g, '')
        .trim();
      if (cleanOriginal) {
        currentSuggestion = { original: cleanOriginal };
      }
    } else if (/^(?:\d+\.\s*)?✅/.test(trimmedLine)) {
      if (currentSuggestion) {
        currentSuggestion.suggestion = trimmedLine
          .replace(/^(?:\d+\.\s*)?✅\s*/, '')
          .replace(/^\*\*.*?\*\*\s*/, '')
          .replace(/^["“”«»]+|["“”«»]+$/g, '')
          .trim();
      }
    } else if (/^(?:\d+\.\s*)?💡/.test(trimmedLine)) {
      if (currentSuggestion) {
        currentSuggestion.reason = trimmedLine.replace(/^(?:\d+\.\s*)?💡\s*/, '').trim();
      }
    } else if (/^(?:\d+\.\s*)?🏷️/.test(trimmedLine)) {
      if (currentSuggestion) {
        currentSuggestion.category = trimmedLine.replace(/^(?:\d+\.\s*)?🏷️\s*/, '').trim();
      }
    }
  });

  // Push last one
  const final: any = currentSuggestion;
  if (final && final.original && final.suggestion) {
    suggestions.push(final as AISuggestion);
  }

  return suggestions;
}
