import { Node as ProsemirrorNode } from '@tiptap/pm/model';

export interface MatchResult {
  from: number;
  to: number;
}

/**
 * Normalizes a single character for comparison
 */
const normalizeChar = (c: string): string => {
  return c.toLowerCase();
};

/**
 * Finds matches of a query string within a document text using a robust index-mapping strategy
 */
export const findMatchInText = (fullText: string, query: string): { start: number; end: number }[] => {
  if (!query || query.trim().length < 1) return [];

  // 1. Create a normalized version of the text and a map back to original indices
  const normalizedChars: string[] = [];
  const indexMap: number[] = [];

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const norm = normalizeChar(char);
    normalizedChars.push(norm);
    indexMap.push(i);
  }

  const normalizedText = normalizedChars.join('');
  const normalizedQuery = query.split('').map(normalizeChar).join('').replace(/\s+/g, ' ');
  
  if (!normalizedQuery.trim()) return [];

  // 2. Build regex
  // We allow optional punctuation and whitespace between words to handle AI cleaning
  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const words = escapedQuery.split(/\s+/).filter(w => w.length > 0);
  
  // Strategy: Try strict match first, then relaxed
  const tryRegex = (separator: string) => {
    const regexStr = words.join(separator);
    const results: { start: number; end: number }[] = [];
    try {
      const regex = new RegExp(regexStr, 'giu');
      let match;
      while ((match = regex.exec(normalizedText)) !== null) {
        const startIdx = match.index;
        const endIdx = startIdx + match[0].length;
        
        results.push({
          start: indexMap[startIdx],
          end: indexMap[endIdx - 1] + 1
        });
        
        // Prevent infinite loops with empty matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    } catch (e) {}
    return results;
  };

  // Pass 1: Strict (only whitespace)
  const strictMatches = tryRegex('\\s+');
  if (strictMatches.length > 0) return strictMatches;

  // Pass 2: Relaxed (allow punctuation/quotes between words)
  // This helps when AI removes quotes or commas
  return tryRegex('[\\s\\p{P}\\p{S}]+');
};

/**
 * Finds matches of a query string within a Prosemirror document
 */
export const findMatchesInDoc = (doc: ProsemirrorNode, suggestion: string): MatchResult[] => {
  if (!suggestion || suggestion.trim().length < 1) return [];

  // 1. Build a flat text representation with PM positions
  let fullText = '';
  const posMap: number[] = [];

  doc.descendants((node, pos) => {
    if (node.isText) {
      const nodeText = node.text || '';
      for (let i = 0; i < nodeText.length; i++) {
        fullText += nodeText[i];
        posMap.push(pos + i);
      }
    } else if (node.isBlock && fullText.length > 0 && !fullText.endsWith('\n')) {
      fullText += '\n';
      posMap.push(pos);
    }
  });

  // 2. Use our robust text matcher
  const matches = findMatchInText(fullText, suggestion);
  
  return matches.map(match => {
    const startPM = posMap[match.start];
    const endPM = posMap[match.end - 1] + 1;
    return { from: startPM, to: endPM };
  }).filter(m => m.from !== undefined && m.to !== undefined);
};
