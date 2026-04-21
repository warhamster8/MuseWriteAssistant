import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { useStore } from '../store/useStore';

export type Note = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  order_index?: number;
  created_at: string;
  updated_at?: string;
};

export function useNotes() {
  const { currentProject, isLocalMode } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    if (!currentProject) return;
    setLoading(true);
    
    if (isLocalMode) {
      const allNotes: Note[] = storage.getCollection('notes');
      const projectNotes = allNotes
        .filter(n => n.project_id === currentProject.id)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setNotes(projectNotes);
    } else {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('order_index', { ascending: true });

      if (!error && data) {
        setNotes(data);
      } else if (error) {
        // Fallback to created_at if order_index column doesn't exist yet
        const { data: fallbackData } = await supabase
          .from('notes')
          .select('*')
          .eq('project_id', currentProject.id)
          .order('created_at', { ascending: true });
        if (fallbackData) setNotes(fallbackData);
      }
    }
    setLoading(false);
  };

  const addNote = async (title: string, content: string = '') => {
    if (!currentProject) return null;
    let newNote: Note;
    const nextOrder = notes.length;
    
    if (isLocalMode) {
      newNote = storage.insert('notes', { project_id: currentProject.id, title, content, order_index: nextOrder }) as Note;
      await fetchNotes();
      return newNote;
    } else {
      const { data, error } = await supabase.from('notes').insert([{ 
        project_id: currentProject.id, 
        title, 
        content,
        order_index: nextOrder
      }]).select().single();
      
      if (!error && data) {
        await fetchNotes();
        return data as Note;
      }
      return null;
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (isLocalMode) {
      storage.update('notes', id, updates);
      fetchNotes();
    } else {
      const { error } = await supabase.from('notes').update(updates).eq('id', id);
      if (!error) fetchNotes();
    }
  };

  const deleteNote = async (id: string) => {
    if (isLocalMode) {
      storage.delete('notes', id);
      fetchNotes();
    } else {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (!error) fetchNotes();
    }
  };

  const reorderNotes = async (updatedNotes: Note[]) => {
    setNotes(updatedNotes);

    if (isLocalMode) {
      const allNotes = storage.getCollection<Note>('notes');
      const updatedNotesMap = new Map();
      updatedNotes.forEach((n, idx) => {
        updatedNotesMap.set(n.id, { ...n, order_index: idx });
      });
      
      const newAllNotes = allNotes.map(n => {
        if (updatedNotesMap.has(n.id)) {
          return updatedNotesMap.get(n.id);
        }
        return n;
      });
      storage.setCollection('notes', newAllNotes);
    } else {
      const notesToUpdate = updatedNotes.map((n, idx) => ({
        id: n.id,
        project_id: currentProject?.id,
        order_index: idx,
        title: n.title,
        content: n.content
      }));
      
      const { error } = await supabase.from('notes').upsert(notesToUpdate);
      if (error) {
        console.error('Error reordering notes:', error);
        fetchNotes();
      }
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [currentProject, isLocalMode]);

  return { notes, loading, addNote, updateNote, deleteNote, reorderNotes, refresh: fetchNotes };
}
