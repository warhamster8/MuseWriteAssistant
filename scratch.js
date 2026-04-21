const content = `<p>Questa è una prova di testo. Speriamo che funzioni.</p>`;
const originalTexts = [
  "Questa è una prova",
  "speriamo che funzioni",
  "prova di testo speriamo",
  "Questa e' una prova"
];

const testMatch = (originalText, suggestion) => {
    const normalize = (str) => str
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedOriginal = normalize(originalText);
    const words = normalizedOriginal.match(/[a-zA-Z0-9\u00C0-\u017F]+/g) || [];
    
    if (words.length === 0) {
       console.log("No words for", originalText);
       return;
    }

    const gapPattern = '[\\s\\u00A0]*([^a-zA-Z0-9<]*|<[^>]+>[\\s\\u00A0]*)*';
    const pattern = words
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join(gapPattern);
    
    const regex = new RegExp(pattern, 'i');
    
    const newContent = content.replace(regex, suggestion);
    if (newContent !== content) {
        console.log("Match SUCCESS for:", originalText);
    } else {
        console.log("Match FAILED for:", originalText, "Regex:", pattern);
    }
}

originalTexts.forEach(t => testMatch(t, "NEW"));
