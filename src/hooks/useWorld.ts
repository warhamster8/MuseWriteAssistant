import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { useStore } from '../store/useStore';

type Setting = {
  id: string;
  project_id: string;
  name: string;
  type: 'Primary' | 'Secondary';
  category: 'location' | 'object';
  description: string;
};

export function useWorld() {
  const { currentProject, isLocalMode } = useStore();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorld = async () => {
    if (!currentProject) return;
    setLoading(true);
    
    if (isLocalMode) {
      const all: Setting[] = storage.getCollection('settings');
      setSettings(all.filter(s => s.project_id === currentProject.id));
    } else {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('project_id', currentProject.id);
      if (!error) setSettings(data);
    }
    setLoading(false);
  };

  const addSetting = async (name: string, type: 'Primary' | 'Secondary', category: 'location' | 'object' = 'location') => {
    if (!currentProject) return;
    if (isLocalMode) {
      storage.insert('settings', { project_id: currentProject.id, name, type, category, description: '' });
      fetchWorld();
    } else {
      const { error } = await supabase.from('settings').insert([{ 
        project_id: currentProject.id, 
        name, 
        type, 
        category, 
        description: '' 
      }]);
      if (error) {
        console.error('Error adding setting:', error);
        alert('Errore nella creazione dell\'ambientazione: ' + error.message);
      } else {
        fetchWorld();
      }
    }
  };

  const updateSetting = async (id: string, updates: Partial<Setting>) => {
    if (isLocalMode) {
      storage.update('settings', id, updates);
      fetchWorld();
    } else {
      await supabase.from('settings').update(updates).eq('id', id);
      fetchWorld();
    }
  };

  const deleteSetting = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo elemento dal mondo?')) return;
    
    if (isLocalMode) {
      storage.delete('settings', id);
      fetchWorld();
    } else {
      const { error } = await supabase.from('settings').delete().eq('id', id);
      if (error) {
        console.error('Error deleting setting:', error);
      } else {
        fetchWorld();
      }
    }
  };

  useEffect(() => {
    fetchWorld();
  }, [currentProject, isLocalMode]);

  return { settings, loading, addSetting, updateSetting, deleteSetting, refresh: fetchWorld };
}
