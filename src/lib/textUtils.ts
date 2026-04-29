
const buildMapping = (html: string) => {
  const textMap: number[] = [];
  const charLens: number[] = [];
  let textStr = '';
  let i = 0;
  
  const blockTags = ['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol'];
  
  while (i < html.length) {
      if (html[i] === '<') {
          const end = html.indexOf('>', i);
          if (end !== -1) {
              const tagFull = html.substring(i + 1, end).toLowerCase();
              const tagName = tagFull.split(/\s+/)[0].replace('/', '');
              
              if (blockTags.includes(tagName)) {
                  if (textStr.length > 0 && !textStr.endsWith('\n')) {
                      textStr += '\n';
                      textMap.push(i);
                      charLens.push(0);
                  }
              }
              i = end + 1;
              continue;
          }
      }
      
      if (html[i] === '&') {
          const end = html.indexOf(';', i);
          if (end !== -1 && end - i < 12) {
              const entity = html.substring(i, end + 1);
              let char = ' ';
              if (entity === '&nbsp;') char = ' ';
              else if (entity === '&lt;') char = '<';
              else if (entity === '&gt;') char = '>';
              else if (entity === '&amp;') char = '&';
              else if (entity === '&quot;' || entity === '&ldquo;' || entity === '&rdquo;') char = '"';
              else if (entity === '&apos;' || entity === '&lsquo;' || entity === '&rsquo;') char = "'";
              else if (entity.startsWith('&#')) {
                 const code = parseInt(entity.slice(2, -1));
                 char = isNaN(code) ? '?' : String.fromCharCode(code);
              }

              textStr += char;
              textMap.push(i);
              charLens.push(entity.length);
              i = end + 1;
              continue;
          }
      }
      
      textStr += html[i];
      textMap.push(i);
      charLens.push(1);
      i++;
  }
  return { textStr, textMap, charLens };
};

export const getPlainTextForAI = (html: string) => {
  if (!html) return '';
  const { textStr } = buildMapping(html);
  return textStr;
};
