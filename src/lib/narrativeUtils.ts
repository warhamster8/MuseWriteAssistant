
/**
 * Utility to strip HTML and get structural plain text for AI processing.
 */
export const getPlainTextForAI = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Replace block elements with newlines to preserve structure
  const blocks = ['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol'];
  blocks.forEach(tag => {
    const elements = div.getElementsByTagName(tag);
    for (let i = 0; i < elements.length; i++) {
        elements[i].prepend(document.createTextNode('\n'));
        elements[i].append(document.createTextNode('\n'));
    }
  });

  return div.textContent || '';
};

/**
 * Normalizes temporal markers into something more sortable or comparable.
 */
export const normalizeTemporalMarker = (time: string) => {
    return time.trim().toLowerCase();
};
