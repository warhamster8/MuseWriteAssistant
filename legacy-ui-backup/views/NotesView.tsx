import React, { useState } from 'react';
import { 
  Plus, Search, Trash2, Image as ImageIcon, Maximize2,
  Bold, Italic, List, ListOrdered, Quote, Undo, Redo, Code as CodeIcon,
  Strikethrough, Heading1, Heading2, Link as LinkIcon, RefreshCw
} from 'lucide-react';
import type { Note } from '../hooks/useNotes';
import { useNotes } from '../hooks/useNotes';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

export const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, reorderNotes, loading } = useNotes();
  const { addToast } = useToast();
  const [editingNote, setEditingNote] = React.useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredNotes = notes.filter(n => 
    (n.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (n.content?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleCreateNote = async () => {
    try {
      const newNote = await addNote('Nuova Nota', '');
      if (newNote) {
        setEditingNote(newNote);
        addToast('Nota creata con successo', 'success');
      } else {
        addToast('Errore nella creazione della nota. Verifica la connessione o il database.', 'error');
      }
    } catch (err) {
      addToast('Errore imprevisto durante la creazione.', 'error');
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const nextNotes = Array.from(notes);
    const [movedNote] = nextNotes.splice(source.index, 1);
    nextNotes.splice(destination.index, 0, movedNote);

    reorderNotes(nextNotes);
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      {/* Header & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Search notes..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={handleCreateNote}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-900/40 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuova Nota
        </button>
      </div>

      {/* Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading && notes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <Plus className="w-16 h-16 opacity-10" />
              <p className="text-sm italic">Nessuna nota trovata. Crea la prima!</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="notes-grid" direction="horizontal">
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8"
                  >
                    {filteredNotes.map((note, index) => (
                      <Draggable key={note.id} draggableId={note.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "relative",
                              snapshot.isDragging && "z-50"
                            )}
                          >
                            <NoteCard 
                               note={note} 
                               onClick={() => setEditingNote(note)}
                               onDelete={() => deleteNote(note.id)}
                               dragHandleProps={provided.dragHandleProps}
                               isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {editingNote && (
          <NoteModal 
            note={editingNote} 
            onClose={() => setEditingNote(null)} 
            onSave={(updates) => {
              updateNote(editingNote.id, updates);
              setEditingNote(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NoteCard: React.FC<{ 
  note: Note; 
  onClick: () => void; 
  onDelete: () => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}> = ({ note, onClick, onDelete, dragHandleProps, isDragging }) => {
  const preview = note.content.replace(/<[^>]*>/g, '').slice(0, 150) + (note.content.length > 150 ? '...' : '');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "bg-slate-900/40 border border-slate-700/50 rounded-2xl p-5 hover:border-blue-500/30 transition-all cursor-pointer group relative flex flex-col h-48 overflow-hidden glass hover:bg-slate-800/40",
        isDragging && "bg-slate-800 border-blue-500/50 shadow-2xl"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div {...dragHandleProps} className="p-1 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-slate-500" />
          </div>
          <h3 className="font-bold text-slate-200 truncate pr-8">{note.title || 'Senza Titolo'}</h3>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-950/20"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-slate-400 line-clamp-5 leading-relaxed flex-1">
        {preview || <span className="italic opacity-30">Nessun contenuto...</span>}
      </p>
      <div className="mt-4 flex items-center justify-between text-[10px] text-slate-600 font-mono">
        <span>{new Date(note.created_at).toLocaleDateString()}</span>
        <Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
};

const MenuBar: React.FC<{ editor: Editor }> = ({ editor }) => {
  if (!editor) return null;

  const addImage = () => {
    const url = prompt('Inserisci URL immagine:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const url = prompt('Inserisci URL link:');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const ToolbarButton = ({ onClick, isActive, icon: Icon, title }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-all hover:bg-slate-700",
        isActive ? "text-blue-400 bg-blue-500/10" : "text-slate-400"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-700 bg-slate-800/20">
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        title="Bold"
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        title="Italic"
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        icon={Strikethrough}
        title="Strike"
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        icon={CodeIcon}
        title="In-line Code"
      />
      
      <div className="w-px h-6 bg-slate-700 mx-1" />

      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        title="Heading 1"
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        title="Heading 2"
      />
      
      <div className="w-px h-6 bg-slate-700 mx-1" />

      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        title="Bullet List"
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        title="Ordered List"
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote}
        title="Blockquote"
      />

      <div className="w-px h-6 bg-slate-700 mx-1" />

      <ToolbarButton 
        onClick={setLink}
        isActive={editor.isActive('link')}
        icon={LinkIcon}
        title="Link"
      />
      <ToolbarButton 
        onClick={addImage}
        icon={ImageIcon}
        title="Image"
      />

      <div className="flex-1" />

      <ToolbarButton 
        onClick={() => editor.chain().focus().undo().run()}
        icon={Undo}
        title="Undo"
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().redo().run()}
        icon={Redo}
        title="Redo"
      />
    </div>
  );
};

const NoteModal: React.FC<{ note: Note; onClose: () => void; onSave: (updates: Partial<Note>) => void }> = ({ note, onClose, onSave }) => {
  const [title, setTitle] = useState(note.title);
  const [isSaving, setIsSaving] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: note.content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px]',
      },
    },
  });

  if (!editor) return null;

  // Debounced auto-save
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      const currentContent = editor.getHTML();
      if (title !== note.title || currentContent !== note.content) {
        setIsSaving(true);
        await onSave({ title, content: currentContent });
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, editor.getHTML()]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/30">
          <div className="flex-1 flex items-center gap-4">
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent text-xl font-display font-bold text-slate-200 focus:outline-none placeholder:opacity-20 flex-1 px-4"
              placeholder="Titolo della nota..."
            />
            {isSaving && (
              <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Salvataggio...
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95"
            >
              Chiudi
            </button>
          </div>
        </div>

        <MenuBar editor={editor} />

        {/* Editor Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-900/50">
          <div className="prose prose-invert prose-blue max-w-none min-h-full">
            <EditorContent editor={editor} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
