export const cleanHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

export const lexicalDiversity = (text: string): number => {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  if (words.length === 0) return 0;
  const uniqueWords = new Set(words);
  return (uniqueWords.size / words.length) * 100;
};

export const avgSentenceLength = (text: string): number => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const totalWords = countWords(text);
  return totalWords / sentences.length;
};

const STOP_WORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 
  'e', 'o', 'ma', 'se', 'che', 'non', 'sono', 'è', 'era', 'erano', 'stata', 'stato', 'stato', 'aveva', 'avevano',
  'disse', 'rispose', 'esclamò', 'molto', 'poco', 'tutti', 'tutto', 'perché', 'quando', 'come'
]);

export const getTopWords = (text: string, limit: number = 10): { word: string, count: number }[] => {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const freqMap: Record<string, number> = {};
  
  words.forEach(w => {
    if (w.length > 3 && !STOP_WORDS.has(w)) {
      freqMap[w] = (freqMap[w] || 0) + 1;
    }
  });
  
  return Object.entries(freqMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
};

export const countCharacterMentions = (text: string, characterNames: string[]): { name: string, count: number }[] => {
  const results = characterNames.map(name => {
    // Escaping regex chars just in case
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
    const matches = text.match(regex);
    return { name, count: matches ? matches.length : 0 };
  });
  
  return results.sort((a, b) => b.count - a.count);
};

export const calculateReadability = (text: string): number => {
  const words = countWords(text);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  if (words === 0 || sentences === 0) return 0;
  
  // Simplified Flesch-Kincaid style Index for Italian (approximation)
  // Low score = simple, High score = academic/complex
  return (words / sentences) * 0.4; // Weighted just on sentence length for now
};
