import React from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Paragraph from '@tiptap/extension-paragraph';

import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
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

  if (!editor) return null;

  return (
    <div className="flex flex-col bg-[#13161a] shadow-2xl rounded-xl border border-white/10 relative overflow-visible">
      {/* TOOLBAR */}
      <div className="sticky top-0 bg-[#171b1f]/90 p-2 border-b border-white/10 flex flex-wrap items-center gap-1 z-20 rounded-t-[11px] backdrop-blur-xl">
        
        {/* Basic Block */}
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('bold') ? 'bg-[#5be9b1] text-[#0b0e11]' : 'text-slate-500 hover:bg-white/5')}
            title="Grassetto"
          >
            <BoldIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('italic') ? 'bg-[#5be9b1] text-[#0b0e11]' : 'text-slate-500 hover:bg-white/5')}
            title="Corsivo"
          >
            <ItalicIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('underline') ? 'bg-[#5be9b1] text-[#0b0e11]' : 'text-slate-500 hover:bg-white/5')}
            title="Sottolineato"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('strike') ? 'bg-[#5be9b1] text-[#0b0e11]' : 'text-slate-500 hover:bg-white/5')}
            title="Barrato"
          >
            <StrikeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('highlight') ? 'bg-[#5be9b1]/20 text-[#5be9b1]' : 'text-slate-500 hover:bg-white/5')}
            title="Evidenziatore"
          >
            <Highlighter className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('heading', { level: 1 }) ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/5')}
            title="Titolo 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('heading', { level: 2 }) ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/5')}
            title="Titolo 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'left' }) ? 'text-[#5be9b1]' : 'text-slate-500 hover:bg-white/5')}
            title="Allinea a sinistra"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'center' }) ? 'text-[#5be9b1]' : 'text-slate-500 hover:bg-white/5')}
            title="Allinea al centro"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'right' }) ? 'text-[#5be9b1]' : 'text-slate-500 hover:bg-white/5')}
            title="Allinea a destra"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'justify' }) ? 'text-[#5be9b1]' : 'text-slate-500 hover:bg-white/5')}
            title="Giustificato"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Drop Cap Special */}
        <div className="flex items-center gap-1 px-1 ml-1 bg-[#5be9b1]/5 rounded-xl p-1 border border-[#5be9b1]/10">
          <div className="flex items-center gap-1 pr-2 border-r border-[#5be9b1]/10 mr-1">
            <Sparkles className="w-3 h-3 text-[#5be9b1]" />
            <span className="text-[9px] font-black uppercase text-[#5be9b1]/60 tracking-wider">Capolettera</span>
          </div>
          
          <button
            onClick={() => {
              editor.chain().focus().updateAttributes('paragraph', { dropCap: 'classic' }).run();
            }}
            className={cn(
              "px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
              editor.getAttributes('paragraph').dropCap === 'classic' 
                ? 'bg-[#5be9b1] text-[#0b0e11]' 
                : 'text-[#5be9b1] hover:bg-[#5be9b1]/10'
            )}
          >
            Classico
          </button>
          <button
            onClick={() => {
              editor.chain().focus().updateAttributes('paragraph', { dropCap: 'modern' }).run();
            }}
            className={cn(
              "px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all",
              editor.getAttributes('paragraph').dropCap === 'modern' 
                ? 'bg-[#5be9b1] text-[#0b0e11]' 
                : 'text-[#5be9b1] hover:bg-[#5be9b1]/10'
            )}
          >
            Moderno
          </button>
          <button
            onClick={() => {
              editor.chain().focus().updateAttributes('paragraph', { dropCap: 'none' }).run();
            }}
            className="p-1 px-2 text-slate-500 hover:text-white"
            title="Rimuovi Capolettera"
          >
            <span className="text-[10px]">✕</span>
          </button>
        </div>

        {/* Lists */}
        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('bulletList') ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/5')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        
        <div className="ml-auto flex items-center space-x-6 px-4">
           <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
              <Type className="w-4 h-4 text-[#5be9b1]/40" />
              <span>{editor.storage.characterCount.words()} PAROLE</span>
           </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-12 bg-[#13161a] rounded-b-[inherit]">
        <div className="w-full">
           <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});

