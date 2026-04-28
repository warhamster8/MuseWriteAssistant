export interface AISuggestion {
  original: string;
  suggestion: string;
  reason: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  type: 'coerenza' | 'taglio' | 'stile' | 'grammatica';
}

export function parseAIAnalysisJSON(text: string): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  
  let depth = 0;
  let start = -1;
  
  // Character-by-character balanced brace parser for maximum robustness in streams
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          const match = text.substring(start, i + 1);
          try {
            const item = JSON.parse(match);
            if (item.original_fragment || item.original || item.text || item.old_fragment || item.old) {
              suggestions.push({
                original: item.original_fragment || item.original || item.text || item.old_fragment || item.old || '',
                suggestion: item.replacement_text || item.suggestion || item.new_text || item.new || item.correction || '',
                reason: item.reason || item.rationale || item.explanation || '',
                category: item.category || item.type || 'Revisione',
                severity: (item.severity || 'medium').toLowerCase() as any,
                type: (item.type || item.category || 'stile').toLowerCase() as any
              });
            }
          } catch (e) {
            // Ignore partial or invalid JSON objects
          }
          start = -1;
        }
      }
    }
  }
  
  return suggestions.filter(s => s.original && s.suggestion);
}

export function parseAIAnalysis(text: string): AISuggestion[] {
  // Try JSON first
  const jsonResults = parseAIAnalysisJSON(text);
  if (jsonResults.length > 0) return jsonResults;

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
        .replace(/\*/g, '') // Rimuove tutti gli asterischi (Markdown)
        .replace(/^["“”«»\[]+|["“”«»\]]+$/g, '')
        .replace(/(?:Suggerimento|Suggestione|Correzione)\s*\d+[:\s]*/gi, '')
        .trim();
      currentSuggestion = { original: cleanOriginal };
    } else if (hasSuggestionEmoji) {
      if (currentSuggestion) {
        const contentMatch = line.match(/✅\s*(?:NUOVA\s*VERSIONE\s*(?:SUGGERITA)?|SUGGERIMENTO\s*\d+|SUGGESTIONE\s*\d+)?\s*:?\s*(.*)/i);
        currentSuggestion.suggestion = (contentMatch ? contentMatch[1] : '')
          .replace(/\*/g, '') // Rimuove tutti gli asterischi (Markdown)
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
        const cat = line.replace(/.*🏷️\s*(?:CATEGORIA:?)?\s*/i, '').trim();
        currentSuggestion.category = cat;
        
        // Mapping intelligence
        const lowerCat = cat.toLowerCase();
        if (lowerCat.includes('coerenza') || lowerCat.includes('pov')) {
          currentSuggestion.type = 'coerenza';
          currentSuggestion.severity = 'high';
        } else if (lowerCat.includes('ritmo') || lowerCat.includes('taglio') || lowerCat.includes('darlings')) {
          currentSuggestion.type = 'taglio';
          currentSuggestion.severity = 'medium';
        } else if (lowerCat.includes('grammatica') || lowerCat.includes('ortografia')) {
          currentSuggestion.type = 'grammatica';
          currentSuggestion.severity = 'low';
        } else {
          currentSuggestion.type = 'stile';
          currentSuggestion.severity = 'medium';
        }
      }
    } else if (currentSuggestion && !hasOriginalEmoji && !hasSuggestionEmoji && line.trim()) {
      const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/\*/g, '').replace(/-{3,}/g, '').trim();
      if (cleanLine) {
        if (currentSuggestion.original && !currentSuggestion.suggestion) {
          currentSuggestion.original += (currentSuggestion.original ? '\n' : '') + cleanLine;
        } else if (currentSuggestion.suggestion) {
          currentSuggestion.suggestion += (currentSuggestion.suggestion ? '\n' : '') + cleanLine;
        }
      }
    }
    
    // Final check for all fields to remove any leakage
    if (currentSuggestion?.original) {
      currentSuggestion.original = currentSuggestion.original
        .replace(/^\d+\.\s*/gm, '')
        .replace(/(?:Suggerimento|Suggestione|Correzione)\s*\d+[:\s]*/gi, '')
        .replace(/\*/g, '')
        .replace(/-{3,}/g, '')
        .replace(/\[(?:INIZIO|FINE)\s*(?:TARGET|CONTESTO)\]/gi, '')
        .trim();
    }
    if (currentSuggestion?.suggestion) {
      currentSuggestion.suggestion = currentSuggestion.suggestion
        .replace(/^\d+\.\s*/gm, '')
        .replace(/(?:Suggerimento|Suggestione|Correzione)\s*\d+[:\s]*/gi, '')
        .replace(/\*/g, '')
        .replace(/-{3,}/g, '')
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

