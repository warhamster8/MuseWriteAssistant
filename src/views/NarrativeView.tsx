import React, { useEffect, useState } from 'react';
import { useNarrative } from '../hooks/useNarrative';
import { useStore } from '../store/useStore';
import { CreationModal } from '../components/CreationModal';
import { useToast, ToastContainer } from '../components/Toast';
import { ManuscriptNavigator } from './narrative/ManuscriptNavigator';
import { EditorWorkspace } from './narrative/EditorWorkspace';
import type { DropResult } from '@hello-pangea/dnd';
import { AnimatePresence, motion } from 'framer-motion';
import { exportToDocx } from '../lib/exportUtils';

/**
 * Componente: NarrativeView
 * 
 * Perché esiste: Funge da orchestratore principale per la vista di scrittura.
 * Cosa fa: Coordina lo stato dei capitoli, delle scene, del navigatore e dell'editor.
 */
export const NarrativeView: React.FC = React.memo(() => {
  const { 
    chapters, 
    addChapter, 
    addScene, 
    updateSceneContent, 
    reorderScenes, 
    reorderChapters,
    renameChapter,
    renameScene
  } = useNarrative();
  
  // Selettori granulari per evitare re-render inutili
  const activeSceneId = useStore(s => s.activeSceneId);
  const setActiveSceneId = useStore(s => s.setActiveSceneId);
  const setCurrentSceneContent = useStore(s => s.setCurrentSceneContent);
  const isNavigatorOpen = useStore(s => s.isNavigatorOpen);
  const isZenMode = useStore(s => s.isZenMode);
  const currentProject = useStore(s => s.currentProject);
  const authorName = useStore(s => s.authorName);
  const { addToast } = useToast();
  
  // Stati locali per UI e Modali
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [modalType, setModalType] = useState<'chapter' | 'scene' | null>(null);
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Derivazione della scena attiva per il "mattoncino" editor
  const activeScene = chapters.flatMap(c => c.scenes || []).find(s => s.id === activeSceneId);

  /**
   * Effetto: Sincronizzazione contenuto scena attiva nello stato globale dell'app.
   */
  useEffect(() => {
    if (activeScene) {
      setCurrentSceneContent(activeScene.content || '');
    } else {
      setCurrentSceneContent('');
    }
  }, [activeSceneId, chapters, setCurrentSceneContent]);

  // --- Handlers delle Azioni (Mattoncini Logici) ---

  const toggleChapter = (id: string) => {
    const next = new Set(expandedChapters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedChapters(next);
  };

  const handleCreateChapter = (title: string) => {
    addChapter(title);
    addToast(`Capitolo "${title}" inizializzato correttamente`, 'success');
  };

  const handleCreateScene = (title: string) => {
    if (targetChapterId) {
      addScene(targetChapterId, title);
      addToast(`Scena "${title}" aggiunta alla narrazione`, 'success');
    }
  };

  /**
   * Gestisce il riordinamento Drag & Drop (Capitoli o Scene).
   * Viene passato al mattoncino ManuscriptNavigator.
   */
  const handleReorder = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // --- Caso 1: Riordinamento CAPITOLI ---
    if (type === 'CHAPTER') {
      const nextChapters = [...chapters];
      const [movedChapter] = nextChapters.splice(source.index, 1);
      nextChapters.splice(destination.index, 0, movedChapter);
      reorderChapters(nextChapters);
      return;
    }

    // --- Caso 2: Riordinamento SCENE (Default) ---
    const nextChapters = chapters.map(c => ({
      ...c,
      scenes: c.scenes ? [...c.scenes] : []
    }));

    const sourceChapter = nextChapters.find(c => c.id === source.droppableId);
    const destChapter = nextChapters.find(c => c.id === destination.droppableId);

    if (!sourceChapter || !destChapter) return;

    const [movedScene] = sourceChapter.scenes!.splice(source.index, 1);
    const updatedScene = { ...movedScene, chapter_id: destChapter.id };
    destChapter.scenes!.splice(destination.index, 0, updatedScene);

    reorderScenes(nextChapters);
  };

  const handleExport = async () => {
    if (!currentProject || chapters.length === 0) {
      addToast("Aggiungi dei contenuti prima di esportare il manoscritto", 'error');
      return;
    }

    setIsExporting(true);
    try {
      await exportToDocx(currentProject.title, chapters, authorName || "Autore Ignoto");
      addToast("Esportazione completata con successo!", 'success');
    } catch (err: any) {
      addToast("Errore durante la generazione del manoscritto", 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden animate-in fade-in duration-700 bg-black/20">
      {/* Mattoncino: Navigazione */}
      <AnimatePresence>
        {isNavigatorOpen && !isZenMode && (
          <motion.div
            initial={{ width: 0, opacity: 0, x: -20 }}
            animate={{ width: 'auto', opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="h-full flex-shrink-0 origin-left"
          >
            <ManuscriptNavigator 
              chapters={chapters}
              activeSceneId={activeSceneId}
              expandedChapters={expandedChapters}
              onToggleChapter={toggleChapter}
              onSelectScene={setActiveSceneId}
              onCreateChapter={() => setModalType('chapter')}
              onCreateScene={(chapterId) => {
                setTargetChapterId(chapterId);
                setModalType('scene');
              }}
              onReorder={handleReorder}
              onRenameChapter={renameChapter}
              onRenameScene={renameScene}
              onExport={handleExport}
              isExporting={isExporting}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mattoncino: Workspace di Scrittura */}
      <EditorWorkspace 
        activeScene={activeScene}
        onUpdateContent={(id, html) => {
          updateSceneContent(id, html);
          useStore.getState().setCurrentSceneContent(html);
        }}
      />
      
      {/* Modali di Creazione (Supporto) */}
      <CreationModal 
        isOpen={modalType === 'chapter'}
        onClose={() => setModalType(null)}
        onConfirm={handleCreateChapter}
        title="Inizializzazione Capitolo"
        placeholder="Es: Capitolo 1 - L'Inizio..."
      />

      <CreationModal 
        isOpen={modalType === 'scene'}
        onClose={() => setModalType(null)}
        onConfirm={handleCreateScene}
        title="Creazione Scena"
        placeholder="Es: Il primo incontro..."
      />

      <ToastContainer />
    </div>
  );
});
