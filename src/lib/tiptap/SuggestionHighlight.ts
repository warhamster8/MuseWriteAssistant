import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { getDocTextAndMap, findMatchInText } from './matchUtils';
import { cn } from '../utils';
import type { AISuggestion } from '../aiParsing';

interface SuggestionHighlightOptions {
  onSuggestionClick: (index: number) => void;
}

interface SuggestionHighlightStorage {
  suggestions: AISuggestion[];
}

export const SuggestionHighlight = Extension.create<SuggestionHighlightOptions, SuggestionHighlightStorage>({
  name: 'suggestionHighlight',

  addOptions() {
    return {
      onSuggestionClick: () => {},
    };
  },

  addStorage() {
    return {
      suggestions: [],
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('suggestionHighlight'),
        props: {
          handleClick(_view, _pos, event) {
            const target = event.target as HTMLElement;
            if (target && target.classList.contains('suggestion-highlight-pulse')) {
              const suggestionId = target.getAttribute('data-suggestion-id');
              if (suggestionId !== null) {
                extension.options.onSuggestionClick(parseInt(suggestionId, 10));
                // we return false to let Prosemirror handle the click and set the cursor
                return false; 
              }
            }
            return false;
          },
          decorations(state) {
            const { suggestions } = extension.storage;
            if (!suggestions || suggestions.length === 0) {
              return DecorationSet.empty;
            }

            const { doc } = state;
            const decorations: Decoration[] = [];
            
            // Optimization: Build text and map ONCE for all suggestions
            const { fullText, posMap } = getDocTextAndMap(doc);

            suggestions.forEach((sug, index) => {
              const matches = findMatchInText(fullText, sug.original);
              matches.forEach(match => {
                const startPM = posMap[match.start];
                const endPM = posMap[match.end - 1] + 1;
                
                if (startPM === undefined || endPM === undefined) return;

                const typeClass = `suggestion-type-${sug.type || 'stile'}`;
                decorations.push(
                  Decoration.inline(startPM, endPM, {
                    class: cn('suggestion-highlight-pulse', typeClass),
                    'data-suggestion-id': index.toString(),
                    'data-suggestion-type': sug.type || 'stile',
                    'data-suggestion-id-original': index.toString(),
                  })
                );
              });
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
