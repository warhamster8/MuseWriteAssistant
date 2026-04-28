import React from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Paragraph from '@tiptap/extension-paragraph';

import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1, 
  Heading2, 
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Type,
  ALargeSmall,
  Sparkles
} from 'lucide-react';

import { useStore } from '../store/useStore';
import { InlineSuggestions } from '../lib/tiptap/InlineSuggestions';
import { InlineSuggestionCard } from './InlineSuggestionCard';
import { useToast } from './Toast';
import { cn } from '../lib/utils';
import type { AISuggestion } from '../lib/aiParsing';

// Custom Paragraph extension to support Drop Caps
const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      dropCap: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-drop-cap') || 'none',
        renderHTML: attributes => {
          if (attributes.dropCap === 'none') return {};
          return { 'data-drop-cap': attributes.dropCap };
        },
      },
    };
  },
});

// Custom shortcuts extension
const CustomShortcuts = Extension.create({
  name: 'customShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-1': () => this.editor.commands.insertContent('«'),
      'Mod-Alt-2': () => this.editor.commands.insertContent('»'),
      'Tab': () => {
        const { state } = this.editor;
        if (state.selection.empty) return false;
        const text = state.doc.textBetween(state.selection.from, state.selection.to, ' ');
        const suggestions = useStore.getState().parsedSuggestions;
        const sug = suggestions.find(s => s.original.includes(text) || text.includes(s.original));
        
        if (sug) {
          window.dispatchEvent(new CustomEvent('muse-apply-suggestion', { 
            detail: { original: sug.original, suggestion: sug.suggestion, sceneId: useStore.getState().activeSceneId } 
          }));
          return true;
        }
        return false;
      }
    }
  },
});

export const Editor: React.FC<{ initialContent: string; onChange: (content: string) => void }> = React.memo(({ initialContent, onChange }) => {
  const isExternallyUpdating = React.useRef(false);
  const onChangeRef = React.useRef(onChange);
  
  // Sincronizziamo il ref ogni volta che onChange cambia (es. cambia scena)
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const setActiveSelection = useStore(s => s.setActiveSelection);
  const theme = useStore(s => s.theme);
  const [showDropCapMenu, setShowDropCapMenu] = React.useState(false);
  const { addToast } = useToast();
  const [activeSuggestionForPopup, setActiveSuggestionForPopup] = React.useState<AISuggestion | null>(null);
  const [popupPosition, setPopupPosition] = React.useState({ top: 0, left: 0 });
  const dropCapRef = React.useRef<HTMLDivElement>(null);
  const editorContainerRef = React.useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false, // Disable default paragraph to use our custom one
      }),
      CustomParagraph,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({ multicolor: true }),
      CharacterCount,
      CustomShortcuts,
      InlineSuggestions,
      BubbleMenuExtension,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        class: cn('focus:outline-none prose max-w-none', theme === 'dark' ? 'prose-invert' : ''),
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternallyUpdating.current) return;
      onChangeRef.current(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        setActiveSelection(null);
        setActiveSuggestionForPopup(null);
      } else {
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        setActiveSelection(selectedText);
        
        // Find matching suggestion
        const suggestions = useStore.getState().parsedSuggestions;
        const matchingSug = suggestions.find(s => 
          s.original.trim() === selectedText.trim() || 
          (selectedText.length > 5 && s.original.includes(selectedText)) ||
          (selectedText.length > 5 && selectedText.includes(s.original))
        );

        if (matchingSug && editorContainerRef.current) {
          const { view } = editor;
          const { from: selFrom } = editor.state.selection;
          const coords = view.coordsAtPos(selFrom);
          const containerRect = editorContainerRef.current.getBoundingClientRect();
          
          setPopupPosition({
            top: coords.top - containerRect.top - 20, // Offset above
            left: Math.max(20, Math.min(coords.left - containerRect.left - 200, containerRect.width - 460))
          });
          setActiveSuggestionForPopup(matchingSug);
        } else {
          setActiveSuggestionForPopup(null);
        }
      }
    },
  });

  const highlightedText = useStore(s => s.highlightedText);
  const scrollRequestToken = useStore(s => s.scrollRequestToken);
  const parsedSuggestions = useStore(s => s.parsedSuggestions);
  const activeSceneId = useStore(s => s.activeSceneId);
  const ignoredSuggestions = useStore(s => s.ignoredSuggestions);

  // Update decorations when suggestions change
  React.useEffect(() => {
    if (editor) {
      const storage = editor.storage as any;
      if (storage.suggestionHighlight) {
        // Filter out ignored suggestions
        const ignored = activeSceneId ? (ignoredSuggestions[activeSceneId] || []) : [];
        const visible = parsedSuggestions.filter(s => !ignored.includes(s.original));
        
        // If we have a single "highlightedText" from legacy, include it too if not in visible
        if (highlightedText && !visible.some(s => s.original === highlightedText)) {
          visible.push({ 
            original: highlightedText, 
            suggestion: '', 
            reason: '', 
            category: 'Highlight',
            severity: 'low',
            type: 'stile'
          });
        }
        
        storage.suggestionHighlight.suggestions = visible;
      }
      editor.view.dispatch(editor.state.tr);
    }
  }, [parsedSuggestions, highlightedText, ignoredSuggestions, activeSceneId, editor]);

  // Listen for robust suggestion applications from Sidebar
  React.useEffect(() => {
    if (!editor) return;

    const handleApply = (e: any) => {
      const { original, suggestion, sceneId } = e.detail;
      if (sceneId !== activeSceneId) return;

      const matches = findMatchesInDoc(editor.state.doc, original);
      if (matches.length > 0) {
        const match = matches[0];
        
        // Use a transaction to replace the text across paragraph boundaries
        editor.chain()
          .focus()
          .insertContentAt({ from: match.from, to: match.to }, suggestion)
          .run();
      } else {
        addToast("Impossibile applicare: testo originale non trovato.", "error");
        console.warn('Could not find match for suggestion application:', original);
      }
    };

    window.addEventListener('muse-apply-suggestion', handleApply);
    return () => window.removeEventListener('muse-apply-suggestion', handleApply);
  }, [editor, activeSceneId]);

  // Handle clicks on inline suggestions
  React.useEffect(() => {
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const highlight = target.closest('.inline-suggestion-highlight');
      if (highlight) {
        const id = parseInt(highlight.getAttribute('data-suggestion-id') || '-1');
        const suggestions = useStore.getState().parsedSuggestions;
        if (id >= 0 && suggestions[id]) {
          const rect = highlight.getBoundingClientRect();
          setActiveSuggestionForPopup(suggestions[id]);
          setPopupPosition({ 
            top: rect.top + window.scrollY, 
            left: rect.left + rect.width / 2 + window.scrollX 
          });
          useStore.getState().setSuggestionIndex(id);
        }
      } else if (!target.closest('.inline-suggestion-card')) {
        setActiveSuggestionForPopup(null);
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [editor]);

  // Handle scroll requests (keep from old version)
  React.useEffect(() => {
    if (editor && highlightedText && scrollRequestToken > 0) {
      setTimeout(() => {
        const matches = findMatchesInDoc(editor.state.doc, highlightedText);
        if (matches.length > 0) {
          const { from } = matches[0];
          try {
            const dom = editor.view.domAtPos(from);
            let node = dom.node;
            
            if (node.nodeType === Node.TEXT_NODE) {
              node = node.parentElement as HTMLElement;
            }
            
            if (node instanceof Element) {
              node.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }
          } catch (e) {
            console.warn('Could not scroll to suggestion:', e);
          }
        }
      }, 10);
    }
  }, [scrollRequestToken, highlightedText, editor]);

  // Sync content if it changes externally
  React.useEffect(() => {
    if (!editor) return;

    const currentHTML = editor.getHTML();
    const normalizedInitial = initialContent.trim();
    const normalizedCurrent = currentHTML.trim();

    // Only update if content is genuinely different AND we are not focused
    // or if the content is completely different (different scene load)
    if (normalizedInitial !== normalizedCurrent) {
      if (!editor.isFocused || Math.abs(normalizedInitial.length - normalizedCurrent.length) > 50) {
        isExternallyUpdating.current = true;
        editor.commands.setContent(initialContent, { emitUpdate: false });
        
        setTimeout(() => {
          isExternallyUpdating.current = false;
        }, 50);
      }
    }
  }, [initialContent, editor]);

  // Close drop cap menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropCapRef.current && !dropCapRef.current.contains(event.target as Node)) {
        setShowDropCapMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) return null;

  return (
    <div 
      ref={editorContainerRef}
      className="flex flex-col bg-[var(--bg-surface)] shadow-2xl rounded-[40px] border border-[var(--border-subtle)] relative overflow-visible"
    >
      {/* TOOLBAR */}
      <div className="sticky top-0 bg-[var(--bg-card)]/90 p-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center gap-1 z-20 rounded-t-[39px] backdrop-blur-xl px-6">
        
        {/* Basic Block */}
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('bold') ? 'bg-[var(--accent)] text-[var(--bg-deep)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Grassetto"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('italic') ? 'bg-[var(--accent)] text-[var(--bg-deep)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Corsivo"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('underline') ? 'bg-[var(--accent)] text-[var(--bg-deep)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Sottolineato"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('strike') ? 'bg-[var(--accent)] text-[var(--bg-deep)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Barrato"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('highlight') ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Evidenziatore"
          >
            <Highlighter className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-[var(--accent-soft)] mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('heading', { level: 1 }) ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-glow-mint' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Titolo 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('heading', { level: 2 }) ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-glow-mint' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Titolo 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-[var(--accent-soft)] mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'left' }) ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Allinea a sinistra"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'center' }) ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Allinea al centro"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'right' }) ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Allinea a destra"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'justify' }) ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
            title="Giustificato"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-[var(--accent-soft)] mx-1" />

        {/* Drop Cap Special */}
        <div className="relative" ref={dropCapRef}>
          <button
            onClick={() => setShowDropCapMenu(!showDropCapMenu)}
            className={cn(
              "p-2 rounded-lg transition-all",
              showDropCapMenu
                ? 'text-[var(--accent)] bg-[var(--accent-soft)]' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]'
            )}
            title="Capolettera"
          >
            <ALargeSmall className="w-4 h-4" />
          </button>

          {showDropCapMenu && (
            <div className="absolute top-full left-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 shadow-2xl backdrop-blur-xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-200 min-w-[180px]">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] px-1">Stile Capolettera</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    editor.chain().focus().updateAttributes('paragraph', { dropCap: 'classic' }).run();
                    setShowDropCapMenu(false);
                  }}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    editor.getAttributes('paragraph').dropCap === 'classic' 
                      ? 'bg-[var(--accent)] text-[var(--bg-deep)]' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-bright)] border border-transparent hover:border-[var(--accent)]/10'
                  )}
                >
                  Classico
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().updateAttributes('paragraph', { dropCap: 'modern' }).run();
                    setShowDropCapMenu(false);
                  }}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    editor.getAttributes('paragraph').dropCap === 'modern' 
                      ? 'bg-[var(--accent)] text-[var(--bg-deep)]' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-bright)] border border-transparent hover:border-[var(--accent)]/10'
                  )}
                >
                  Moderno
                </button>
              </div>
              
              <div className="h-[1px] bg-[var(--border-subtle)] mx-1" />
              
              <button
                onClick={() => {
                  // Comanda per applicare al PRIMO paragrafo del documento
                  editor.chain()
                    .focus()
                    .setNodeSelection(0)
                    .updateAttributes('paragraph', { dropCap: 'classic' })
                    .run();
                  setShowDropCapMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all"
              >
                <span>Applica all'inizio scena</span>
                <Sparkles className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().updateAttributes('paragraph', { dropCap: 'none' }).run();
                  setShowDropCapMenu(false);
                }}
                className="w-full text-center py-1.5 text-[var(--text-muted)] hover:text-red-400 text-[9px] uppercase font-black tracking-widest transition-colors"
              >
                Rimuovi Formattazione
              </button>
            </div>
          )}
        </div>

        {/* Lists */}
        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('bulletList') ? 'bg-[var(--accent-soft)] text-[var(--text-bright)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        
        <div className="ml-auto flex items-center space-x-6 px-4">
           <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
              <Type className="w-4 h-4 text-[var(--accent)]/40" />
              <span>{editor.storage.characterCount.words()} PAROLE</span>
           </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-12 bg-[var(--bg-deep)] rounded-b-[inherit]">
        <div className="w-full relative">
           {activeSuggestionForPopup && (
             <InlineSuggestionCard 
               suggestion={activeSuggestionForPopup}
               onApply={() => {
                 window.dispatchEvent(new CustomEvent('muse-apply-suggestion', { 
                   detail: { 
                     original: activeSuggestionForPopup.original, 
                     suggestion: activeSuggestionForPopup.suggestion, 
                     sceneId: activeSceneId 
                   } 
                 }));
                 setActiveSuggestionForPopup(null);
               }}
               onIgnore={() => {
                 if (activeSceneId) {
                   useStore.getState().addIgnoredSuggestion(activeSceneId, activeSuggestionForPopup.original);
                 }
                 setActiveSuggestionForPopup(null);
               }}
               onClose={() => setActiveSuggestionForPopup(null)}
               position={popupPosition}
             />
           )}
           <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});
