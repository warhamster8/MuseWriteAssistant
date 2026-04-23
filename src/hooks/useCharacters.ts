import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { useStore } from '../store/useStore';

export type Character = {
  id: string;
  project_id: string;
  name: string;
  bio: string;
  psychology: string;
  evolution: string;
  relations: string;
  avatar_url?: string;
  avatar_pos_x?: number;
  avatar_pos_y?: number;
  role?: 'protagonist' | 'co-protagonist' | 'antagonist' | 'secondary' | 'other';
};

export function useCharacters() {
  const { currentProject, isLocalMode } = useStore();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCharacters = async () => {
    if (!currentProject) return;
    setLoading(true);
    
    try {
      if (isLocalMode) {
        const all: Character[] = storage.getCollection('characters');
        setCharacters(all.filter(c => c.project_id === currentProject.id));
      } else {
        const { data, error } = await supabase
          .from('characters')
          .select('*')
          .eq('project_id', currentProject.id);
        
        if (error) throw error;
        setCharacters(data || []);
      }
    } catch (err: any) {
      console.error('[SECURITY LOG] Fetch Characters Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCharacter = async (name: string) => {
    if (!currentProject) return;
    if (isLocalMode) {
      storage.insert('characters', { 
        project_id: currentProject.id, 
        name, 
        bio: '', 
        psychology: '', 
        evolution: '', 
        relations: '', 
        avatar_url: '',
        avatar_pos_x: 50,
        avatar_pos_y: 50,
        role: 'secondary'
      });
      fetchCharacters();
    } else {
      const { error } = await supabase.from('characters').insert([{ 
        project_id: currentProject.id, 
        name, 
        bio: '', 
        psychology: '', 
        evolution: '', 
        relations: '', 
        avatar_url: '',
        avatar_pos_x: 50,
        avatar_pos_y: 50,
        role: 'secondary'
      }]);
      if (error) {
        console.error('Error adding character:', error);
        alert('Errore nella creazione del personaggio: ' + error.message);
      } else {
        fetchCharacters();
      }
    }
  };

  const updateCharacter = async (id: string, updates: Partial<Character>) => {
    if (isLocalMode) {
      storage.update('characters', id, updates);
      fetchCharacters();
    } else {
      const { error } = await supabase.from('characters').update(updates).eq('id', id);
      if (error) {
        console.error('[DATABASE ERROR] Update Character:', error);
        // Se l'errore è dovuto alla colonna mancante, avvisiamo l'utente
        if (error.message.includes('column "role" does not exist')) {
          alert("Errore: La colonna 'role' manca nel database Supabase. Aggiungila nella tabella 'characters' o usa la modalità locale.");
        }
      }
      fetchCharacters();
    }
  };

  const addInterview = async (characterId: string, question: string, answer: string) => {
    if (isLocalMode) {
      const interviews = storage.getCollection('interviews');
      storage.setCollection('interviews', [...interviews, { character_id: characterId, question, answer, id: Math.random() }]);
    } else {
      await supabase.from('character_interviews').insert([{ character_id: characterId, question, answer }]);
    }
  };

  const deleteCharacter = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo personaggio?')) return;
    
    if (isLocalMode) {
      storage.delete('characters', id);
      fetchCharacters();
    } else {
      const { error } = await supabase.from('characters').delete().eq('id', id);
      if (error) {
        console.error('Error deleting character:', error);
      } else {
        fetchCharacters();
      }
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, [currentProject, isLocalMode]);

  return { characters, loading, addCharacter, updateCharacter, deleteCharacter, addInterview, refresh: fetchCharacters };
}
