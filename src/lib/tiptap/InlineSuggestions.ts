import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useStore } from '../../store/useStore';
import { findMatchesInDoc } from './matchUtils';

export const InlineSuggestions = Extension.create({
  name: 'inlineSuggestions',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('inlineSuggestions'),
        props: {
          decorations: (state) => {
            const { parsedSuggestions, suggestionIndex } = useStore.getState();
            if (!parsedSuggestions || parsedSuggestions.length === 0) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            
            parsedSuggestions.forEach((sug, index) => {
              const matches = findMatchesInDoc(state.doc, sug.original);
              matches.forEach(match => {
                // Main highlight decoration
                decorations.push(
                  Decoration.inline(match.from, match.to, {
                    class: `inline-suggestion-highlight ${sug.type} ${index === suggestionIndex ? 'active' : ''}`,
                    'data-suggestion-id': index.toString(),
                  })
                );
                
                // Widget for the gutter
                if (match.from > 0) {
                  decorations.push(
                    Decoration.widget(match.from, (_view) => {
                      const dot = document.createElement('div');
                      dot.className = `inline-suggestion-gutter-dot ${sug.type}`;
                      dot.onclick = () => {
                        useStore.getState().setSuggestionIndex(index);
                        // Trigger a scroll or popup
                      };
                      return dot;
                    }, { side: -1 })
                  );
                }
              });
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
