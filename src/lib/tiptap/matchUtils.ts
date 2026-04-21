import { Node as ProsemirrorNode } from '@tiptap/pm/model';

export interface MatchResult {
  from: number;
  to: number;
}

/**
 * Normalizes a single character for comparison
 */
const normalizeChar = (c: string): string => {
  return c
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

/**
 * Finds matches of a query string within a document text using a robust index-mapping strategy
 */
export const findMatchInText = (fullText: string, query: string): { start: number; end: number } | null => {
  if (!query || query.trim().length < 1) return null;

  // 1. Create a normalized version of the text and a map back to original indices
  const normalizedChars: string[] = [];
  const indexMap: number[] = [];

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const norm = normalizeChar(char);
    // We keep spaces and word characters, collapsing multiple spaces in the search phase
    normalizedChars.push(norm);
    indexMap.push(i);
  }

  const normalizedText = normalizedChars.join('');
  const normalizedQuery = query.split('').map(normalizeChar).join('').replace(/\s+/g, ' ').trim();
  
  if (!normalizedQuery) return null;

  // 2. Simple fuzzy search: ignore whitespace differences in the query
  // We turn the query into a regex that allows flexible whitespace
  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // High robustness: allow optional whitespace (\s*) between words AND after punctuation
  // This helps when AI says "word.word" but document has "word. Word" or "word.\nWord"
  const regexStr = escapedQuery
    .split(/\s+/)
    .join('\\s+')
    .replace(/([.,!?;:…»"'])/g, '$1\\s*');
  
  try {
    const regex = new RegExp(regexStr, 'gi');
    const match = regex.exec(normalizedText);
    
    if (match) {
      const startIdx = match.index;
      const endIdx = startIdx + match[0].length;
      
      return {
        start: indexMap[startIdx],
        end: indexMap[endIdx - 1] + 1
      };
    }
  } catch (e) {
    // Fallback to simple indexOf if regex fails
    const idx = normalizedText.indexOf(normalizedQuery);
    if (idx !== -1) {
      const endIdx = idx + normalizedQuery.length;
      return {
        start: indexMap[idx],
        end: indexMap[endIdx - 1] + 1
      };
    }
  }

  return null;
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
  const match = findMatchInText(fullText, suggestion);
  
  if (match) {
    const startPM = posMap[match.start];
    const endPM = posMap[match.end - 1] + 1;
    
    if (startPM !== undefined && endPM !== undefined) {
      return [{ from: startPM, to: endPM }];
    }
  }

  return [];
};
