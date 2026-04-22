import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { useStore } from '../store/useStore';
import type { Chapter, Scene } from '../types/narrative';
import type { SceneTimelineEvent } from '../types/timeline';




export function useNarrative() {
  const { currentProject, isLocalMode, chapters, setChapters } = useStore();
  const [loading, setLoading] = useState(false);

  const fetchNarrative = async () => {
    if (!currentProject) return;
    setLoading(true);
    
    if (isLocalMode) {
      const allChapters: Chapter[] = storage.getCollection('chapters');
      const allScenes: Scene[] = storage.getCollection('scenes');
      
      const projectChapters = allChapters
        .filter(c => c.project_id === currentProject.id)
        .map(ch => ({
          ...ch,
          scenes: allScenes
            .filter(s => s.chapter_id === ch.id)
            .sort((a, b) => a.order_index - b.order_index)
        }))
        .sort((a, b) => a.order_index - b.order_index);
        
      setChapters(projectChapters);
    } else {
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*, scenes(*)')
        .eq('project_id', currentProject.id)
        .order('order_index', { ascending: true });

      if (!chaptersError) {
        const sortedChapters = chaptersData.map(ch => ({
          ...ch,
          scenes: ch.scenes.sort((a: Scene, b: Scene) => a.order_index - b.order_index)
        }));
        setChapters(sortedChapters);
      }
    }
    setLoading(false);
  };

  const addChapter = async (title: string) => {
    if (!currentProject) return;
    if (isLocalMode) {
      storage.insert('chapters', { project_id: currentProject.id, title, order_index: chapters.length });
      fetchNarrative();
    } else {
      const { error } = await supabase.from('chapters').insert([{ project_id: currentProject.id, title, order_index: chapters.length }]);
      if (error) {
        console.error('Error adding chapter:', error);
        alert('Errore nella creazione del capitolo: ' + error.message);
      } else {
        fetchNarrative();
      }
    }
  };


  const addScene = async (chapterId: string, title: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    const order = chapter?.scenes?.length || 0;
    
    if (isLocalMode) {
      storage.insert('scenes', { chapter_id: chapterId, title, order_index: order, content: '' });
      fetchNarrative();
    } else {
      const { error } = await supabase.from('scenes').insert([{ chapter_id: chapterId, title, order_index: order }]);
      if (error) {
        console.error('Error adding scene:', error);
        alert('Errore nella creazione della scena: ' + error.message);
      } else {
        fetchNarrative();
      }
    }
  };

  const updateSceneContent = async (sceneId: string, content: string) => {
    // Update global state first for immediate UI feedback
    const updatedChapters = chapters.map(chapter => ({
      ...chapter,
      scenes: chapter.scenes?.map(scene => 
        scene.id === sceneId ? { ...scene, content } : scene
      )
    }));
    
    setChapters(updatedChapters);

    if (isLocalMode) {
      storage.update('scenes', sceneId, { content });
    } else {
      await supabase.from('scenes').update({ content }).eq('id', sceneId);
    }
  };

  const reorderScenes = async (updatedChapters: Chapter[]) => {
    setChapters(updatedChapters);

    if (isLocalMode) {
      const allScenes = storage.getCollection<Scene>('scenes');
      const updatedScenesMap = new Map();
      updatedChapters.forEach(c => {
        c.scenes?.forEach((s, idx) => {
          updatedScenesMap.set(s.id, { ...s, chapter_id: c.id, order_index: idx });
        });
      });

      const newAllScenes = allScenes.map(s => {
        if (updatedScenesMap.has(s.id)) {
          return updatedScenesMap.get(s.id);
        }
        return s;
      });
      storage.setCollection('scenes', newAllScenes);
    } else {
      const scenesToUpdate = updatedChapters.flatMap(c => 
        c.scenes?.map((s, idx) => ({
          id: s.id,
          chapter_id: c.id,
          order_index: idx,
          title: s.title,
          content: s.content,
          timeline_events: s.timeline_events
        })) || []
      );
      
      if (scenesToUpdate.length > 0) {
        const { error } = await supabase.from('scenes').upsert(scenesToUpdate);
        if (error) {
          console.error('Error reordering scenes:', error);
          fetchNarrative(); // Revert on error
        }
      }
    }
  };

  const reorderChapters = async (updatedChapters: Chapter[]) => {
    // Aggiorna lo stato locale per feedback immediato
    const chaptersWithNewOrder = updatedChapters.map((c, idx) => ({
      ...c,
      order_index: idx
    }));
    setChapters(chaptersWithNewOrder);

    if (isLocalMode) {
      const allChapters = storage.getCollection<Chapter>('chapters');
      const updatedChaptersMap = new Map();
      chaptersWithNewOrder.forEach(c => {
        updatedChaptersMap.set(c.id, c);
      });

      const newAllChapters = allChapters.map(c => {
        if (updatedChaptersMap.has(c.id)) {
          const updated = updatedChaptersMap.get(c.id);
          return { ...c, order_index: updated.order_index };
        }
        return c;
      });
      storage.setCollection('chapters', newAllChapters);
    } else {
      const chaptersToUpdate = chaptersWithNewOrder.map(c => ({
        id: c.id,
        project_id: c.project_id,
        title: c.title,
        order_index: c.order_index
      }));
      
      if (chaptersToUpdate.length > 0) {
        const { error } = await supabase.from('chapters').upsert(chaptersToUpdate);
        if (error) {
          console.error('Error reordering chapters:', error);
          fetchNarrative(); // Revert on error
        }
      }
    }
  };

  const renameChapter = async (chapterId: string, title: string) => {
    const updatedChapters = chapters.map(c => 
      c.id === chapterId ? { ...c, title } : c
    );
    setChapters(updatedChapters);

    if (isLocalMode) {
      storage.update('chapters', chapterId, { title });
    } else {
      const { error } = await supabase.from('chapters').update({ title }).eq('id', chapterId);
      if (error) {
        console.error('Error renaming chapter:', error);
        fetchNarrative(); // Revert on error
      }
    }
  };

  const renameScene = async (sceneId: string, title: string) => {
    const updatedChapters = chapters.map(chapter => ({
      ...chapter,
      scenes: chapter.scenes?.map(scene => 
        scene.id === sceneId ? { ...scene, title } : scene
      )
    }));
    
    setChapters(updatedChapters);

    if (isLocalMode) {
      storage.update('scenes', sceneId, { title });
    } else {
      const { error } = await supabase.from('scenes').update({ title }).eq('id', sceneId);
      if (error) {
        console.error('Error renaming scene:', error);
        fetchNarrative(); // Revert on error
      }
    }
  };

  const updateTimelineEvents = async (sceneId: string, events: SceneTimelineEvent[]) => {
    const updatedChapters = chapters.map(chapter => ({
      ...chapter,
      scenes: chapter.scenes?.map(scene => 
        scene.id === sceneId ? { ...scene, timeline_events: events } : scene
      )
    }));
    
    setChapters(updatedChapters);

    if (isLocalMode) {
      storage.update('scenes', sceneId, { timeline_events: events });
    } else {
      await supabase.from('scenes').update({ timeline_events: events }).eq('id', sceneId);
    }
  };

  useEffect(() => {
    fetchNarrative();
  }, [currentProject, isLocalMode]);

  return { 
    chapters, 
    loading, 
    addChapter, 
    addScene, 
    updateSceneContent, 
    updateTimelineEvents,
    reorderScenes, 
    reorderChapters, 
    renameChapter,
    renameScene,
    refresh: fetchNarrative 
  };
}
