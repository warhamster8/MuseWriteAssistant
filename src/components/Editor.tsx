import React from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
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
  Sparkles
} from 'lucide-react';

import { useStore } from '../store/useStore';
import { SuggestionHighlight } from '../lib/tiptap/SuggestionHighlight';
import { findMatchesInDoc } from '../lib/tiptap/matchUtils';
import { cn } from '../lib/utils';

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
    }
  },
});

export const Editor: React.FC<{ initialContent: string; onChange: (content: string) => void }> = React.memo(({ initialContent, onChange }) => {
  const isExternallyUpdating = React.useRef(false);
  const setActiveSelection = useStore(s => s.setActiveSelection);
  const theme = useStore(s => s.theme);
  const [showDropCapMenu, setShowDropCapMenu] = React.useState(false);
  const dropCapRef = React.useRef<HTMLDivElement>(null);

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
      SuggestionHighlight.configure({ suggestions: [] }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        class: 'focus:outline-none prose prose-invert max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternallyUpdating.current) return;
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        setActiveSelection(null);
      } else {
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        setActiveSelection(selectedText);
      }
    },
  });

  const highlightedText = useStore(s => s.highlightedText);
  const scrollRequestToken = useStore(s => s.scrollRequestToken);

  // Update decorations when highlightedText changes
  React.useEffect(() => {
    if (editor) {
      const storage = editor.storage as any;
      if (storage.suggestionHighlight) {
        storage.suggestionHighlight.suggestions = highlightedText ? [highlightedText] : [];
      }
      editor.view.dispatch(editor.state.tr);
    }
  }, [highlightedText, editor]);

  // Handle scroll requests
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
  }, [scrollRequestToken, editor]);

  // Sync content if it changes externally
  React.useEffect(() => {
    if (editor && initialContent.trim() !== editor.getHTML().trim()) {
      isExternallyUpdating.current = true;
      editor.commands.setContent(initialContent, { emitUpdate: false });
      
      setTimeout(() => {
        isExternallyUpdating.current = false;
      }, 0);
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
    <div className="flex flex-col bg-[var(--bg-surface)] shadow-2xl rounded-xl border border-[var(--border-subtle)] relative overflow-visible">
      {/* TOOLBAR */}
      <div className="sticky top-0 bg-[var(--bg-card)]/90 p-2 border-b border-[var(--border-subtle)] flex flex-wrap items-center gap-1 z-20 rounded-t-[11px] backdrop-blur-xl">
        
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
              editor.getAttributes('paragraph').dropCap !== 'none' || showDropCapMenu
                ? 'text-[var(--accent)] bg-[var(--accent-soft)]' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]'
            )}
            title="Capolettera"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {showDropCapMenu && (
            <div className="absolute top-full left-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  editor.chain().focus().updateAttributes('paragraph', { dropCap: 'classic' }).run();
                  setShowDropCapMenu(false);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  editor.getAttributes('paragraph').dropCap === 'classic' 
                    ? 'bg-[var(--accent)] text-[var(--bg-deep)]' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-bright)]'
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
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  editor.getAttributes('paragraph').dropCap === 'modern' 
                    ? 'bg-[var(--accent)] text-[var(--bg-deep)]' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-bright)]'
                )}
              >
                Moderno
              </button>
              <div className="w-[1px] h-4 bg-[var(--accent-soft)] mx-1" />
              <button
                onClick={() => {
                  editor.chain().focus().updateAttributes('paragraph', { dropCap: 'none' }).run();
                  setShowDropCapMenu(false);
                }}
                className="p-1 px-3 text-[var(--text-muted)] hover:text-red-400 text-[10px] uppercase font-black tracking-widest"
                title="Rimuovi"
              >
                Reset
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
        <div className="w-full">
           <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});

