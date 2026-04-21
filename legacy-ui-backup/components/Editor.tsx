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

const CustomShortcuts = Extension.create({
  name: 'customShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-1': () => this.editor.commands.insertContent('«'),
      'Mod-Alt-2': () => this.editor.commands.insertContent('»'),
    }
  },
});

export const Editor: React.FC<{ initialContent: string; onChange: (content: string) => void }> = ({ initialContent, onChange }) => {
  const isExternallyUpdating = React.useRef(false);
  const { setActiveSelection } = useStore();

  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount,
      CustomShortcuts,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      // Don't emit changes back to the parent if we're currently syncing from the parent
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

  // Sync content if it changes externally (e.g. via AI Sidekick "Applica")
  React.useEffect(() => {
    if (editor && initialContent.trim() !== editor.getHTML().trim()) {
      isExternallyUpdating.current = true;
      // The emitUpdate option prevents emitting an update event, breaking the infinite loop
      editor.commands.setContent(initialContent, { emitUpdate: false });
      
      // Release the lock in the next frame to allow user changes again
      setTimeout(() => {
        isExternallyUpdating.current = false;
      }, 0);
    }
  }, [initialContent, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full bg-slate-900 shadow-2xl rounded-xl border border-slate-700 overflow-hidden">
      <div className="glass p-2 border-b border-slate-700 flex items-center space-x-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-slate-700 transition-colors ${editor.isActive('bold') ? 'text-blue-400 bg-slate-700' : 'text-slate-400'}`}
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-slate-700 transition-colors ${editor.isActive('italic') ? 'text-blue-400 bg-slate-700' : 'text-slate-400'}`}
        >
          <Italic className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-slate-700 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-blue-400 bg-slate-700' : 'text-slate-400'}`}
        >
          <Heading1 className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-slate-700 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-blue-400 bg-slate-700' : 'text-slate-400'}`}
        >
          <Heading2 className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-slate-700 transition-colors ${editor.isActive('bulletList') ? 'text-blue-400 bg-slate-700' : 'text-slate-400'}`}
        >
          <List className="w-5 h-5" />
        </button>
        
        <div className="ml-auto flex items-center space-x-4 px-4 text-xs font-mono text-slate-500">
           <div className="flex items-center space-x-1">
              <Type className="w-3 h-3" />
              <span>{editor.storage.characterCount.words()} words</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 md:p-12 lg:p-16 bg-slate-900/50">
        <div className="max-w-3xl mx-auto">
           <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
