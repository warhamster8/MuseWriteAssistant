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
import { useStore } from '../store/useStore';

export const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, reorderNotes, loading } = useNotes();
  const { addToast } = useToast();
  const [editingNote, setEditingNote] = React.useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const theme = useStore(s => s.theme);

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
    <div className="h-full flex flex-col space-y-10 overflow-hidden animate-in fade-in duration-1000 bg-[var(--bg-deep)]">
      {/* Header & Search */}
      <div className="flex items-center justify-between gap-8 glass p-8 rounded-[40px] border border-[var(--border-subtle)] shadow-2xl relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-full bg-[var(--accent)]/5 blur-[60px] pointer-events-none" />
        
        <div className="flex-1 relative max-w-2xl group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-all duration-500" />
          <input 
            type="text"
            placeholder="Search through your narrative fragments..."
            className="w-full bg-[var(--bg-deep)]/40 border border-[var(--border-subtle)] rounded-[24px] py-4 pl-16 pr-8 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/30 focus:bg-[var(--bg-surface)]/60 transition-all shadow-inner placeholder:text-[var(--text-muted)] tracking-tight"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={handleCreateNote}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] px-10 py-4 rounded-[24px] font-black text-[10px] flex items-center gap-4 transition-all shadow-2xl active:scale-95 uppercase tracking-[0.2em] group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Initial Fragment
        </button>
      </div>

      {/* Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
          {loading && notes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-8">
              <div className="w-24 h-24 rounded-[32px] glass border border-[var(--border-subtle)] flex items-center justify-center opacity-20">
                <Plus className="w-10 h-10" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">No cognitive fragments detected</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="notes-grid" direction="horizontal">
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
            theme={theme}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[32px] p-8 hover:border-[var(--accent)]/20 transition-all cursor-pointer group relative flex flex-col h-64 overflow-hidden shadow-sm hover:shadow-[0_20px_50px_-15px_rgba(var(--accent),0.1)]",
        isDragging && "bg-[var(--bg-surface)] border-[var(--accent)]/30 shadow-2xl scale-105 z-50"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div {...dragHandleProps} className="p-2 hover:bg-[var(--accent-soft)] rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-90 border border-transparent hover:border-[var(--accent)]/20">
            <GripVertical className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-bright)] truncate pr-10 tracking-tight">{note.title || 'Untitled Thought'}</h3>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-6 right-6 p-2.5 text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-[var(--text-secondary)] line-clamp-4 leading-relaxed flex-1 font-light italic">
        {preview || <span className="opacity-20 not-italic">Nessun frammento di testo...</span>}
      </p>
      <div className="mt-8 flex items-center justify-between text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/30" />
            <span>{new Date(note.created_at).toLocaleDateString()}</span>
        </div>
        <Maximize2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all" />
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
        "p-2.5 rounded-xl transition-all hover:bg-[var(--accent-soft)]",
        isActive ? "text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)]/20" : "text-[var(--text-secondary)]"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/20">
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
      
      <div className="w-px h-6 bg-[var(--border-subtle)] mx-1" />

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
      
      <div className="w-px h-6 bg-[var(--border-subtle)] mx-1" />

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

      <div className="w-px h-6 bg-[var(--border-subtle)] mx-1" />

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

const NoteModal: React.FC<{ note: Note; theme: string; onClose: () => void; onSave: (updates: Partial<Note>) => void }> = ({ note, theme, onClose, onSave }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-6xl h-[90vh] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[48px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]/10">
          <div className="flex-1 flex items-center gap-6">
            <div className="p-3 bg-[var(--accent-soft)] rounded-2xl border border-[var(--accent)]/20">
               <Quote className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent text-4xl font-display font-medium text-[var(--text-bright)] focus:outline-none placeholder:opacity-5 flex-1 tracking-tighter"
              placeholder="Titolo dell'intuizione..."
            />
            {isSaving && (
              <div className="flex items-center gap-3 text-[var(--accent)]/50 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse pr-6">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Sincronizzazione...
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="group p-5 bg-[var(--bg-surface)]/10 hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--text-bright)] rounded-[24px] transition-all active:scale-90 border border-[var(--border-subtle)]"
          >
            <Plus className="w-6 h-6 rotate-45 group-hover:rotate-0 transition-transform" />
          </button>
        </div>

        <MenuBar editor={editor} />

        {/* Editor Content Area */}
        <div className="flex-1 overflow-y-auto p-12 md:p-20 bg-[var(--bg-deep)]/20 scrollbar-hide">
          <div className={cn("prose prose-emerald max-w-none min-h-full", theme === 'dark' && 'prose-invert')}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
