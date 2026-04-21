import React from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List,
  Type
} from 'lucide-react';

import { useStore } from '../store/useStore';
import { SuggestionHighlight } from '../lib/tiptap/SuggestionHighlight';
import { findMatchesInDoc } from '../lib/tiptap/matchUtils';

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
      StarterKit,
      CharacterCount,
      CustomShortcuts,
      SuggestionHighlight.configure({ suggestions: [] }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        spellcheck: 'true',
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

  // Sync content if it changes externally (e.g. via AI Sidekick "Applica")
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
      <div className="sticky top-0 bg-[#171b1f] p-3 border-b border-white/10 flex items-center space-x-2 z-20 rounded-t-[11px] backdrop-blur-md">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('bold') ? 'bg-[#5be9b1] text-[#0b0e11] shadow-lg shadow-[#5be9b1]/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('italic') ? 'bg-[#5be9b1] text-[#0b0e11] shadow-lg shadow-[#5be9b1]/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          <Italic className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('heading', { level: 1 }) ? 'bg-[#5be9b1] text-[#0b0e11] shadow-lg shadow-[#5be9b1]/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          <Heading1 className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('heading', { level: 2 }) ? 'bg-[#5be9b1] text-[#0b0e11] shadow-lg shadow-[#5be9b1]/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          <Heading2 className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('bulletList') ? 'bg-[#5be9b1] text-[#0b0e11] shadow-lg shadow-[#5be9b1]/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          <List className="w-5 h-5" />
        </button>
        
        <div className="ml-auto flex items-center space-x-6 px-4">
           <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
              <Type className="w-4 h-4 text-[#5be9b1]/40" />
              <span>{editor.storage.characterCount.words()} PAROLA</span>
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
