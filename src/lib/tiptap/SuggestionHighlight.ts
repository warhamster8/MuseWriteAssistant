import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { findMatchesInDoc } from './matchUtils';

export interface SuggestionHighlightOptions {
  // Empty options as we use storage for dynamic updates
}

export interface SuggestionHighlightStorage {
  suggestions: string[];
}

export const SuggestionHighlight = Extension.create<SuggestionHighlightOptions, SuggestionHighlightStorage>({
  name: 'suggestionHighlight',

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
          decorations(state) {
            const { suggestions } = extension.storage;
            if (!suggestions || suggestions.length === 0) {
              return DecorationSet.empty;
            }

            const { doc } = state;
            const decorations: Decoration[] = [];

            suggestions.forEach((suggestion) => {
              const matches = findMatchesInDoc(doc, suggestion);
              matches.forEach(match => {
                decorations.push(
                  Decoration.inline(match.from, match.to, {
                    class: 'suggestion-highlight-pulse',
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
