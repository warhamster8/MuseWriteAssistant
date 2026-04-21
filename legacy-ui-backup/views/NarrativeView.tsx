import { Plus, ChevronDown, ChevronRight, FileText, Folder, GripVertical } from 'lucide-react';
import { useNarrative } from '../hooks/useNarrative';
import { useStore } from '../store/useStore';
import { Editor } from '../components/Editor';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { CreationModal } from '../components/CreationModal';
import { useToast, ToastContainer } from '../components/Toast';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

export const NarrativeView: React.FC = () => {
  const { chapters, addChapter, addScene, updateSceneContent, reorderScenes } = useNarrative();
  const { activeSceneId, setActiveSceneId, setCurrentSceneContent } = useStore();
  const { addToast } = useToast();
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  
  const [modalType, setModalType] = useState<'chapter' | 'scene' | null>(null);
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null);

  const activeScene = chapters.flatMap(c => c.scenes || []).find(s => s.id === activeSceneId);

  useEffect(() => {
    if (activeScene) {
      setCurrentSceneContent(activeScene.content || '');
    } else {
      setCurrentSceneContent('');
    }
  }, [activeSceneId, chapters, setCurrentSceneContent]);

  const toggleChapter = (id: string) => {
    const next = new Set(expandedChapters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedChapters(next);
  };

  const handleCreateChapter = (title: string) => {
    addChapter(title);
    addToast(`Capitolo "${title}" creato correttamente`, 'success');
  };

  const handleCreateScene = (title: string) => {
    if (targetChapterId) {
      addScene(targetChapterId, title);
      addToast(`Scena "${title}" creata correttamente`, 'success');
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

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

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Chapter/Scene Navigator */}
      <div className="w-64 glass border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manuscript</span>
          <button onClick={() => setModalType('chapter')} className="p-1 hover:bg-slate-700 rounded text-slate-400">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <DragDropContext onDragEnd={onDragEnd}>
            {chapters.map(chapter => (
              <div key={chapter.id} className="space-y-1">
                <div 
                  onClick={() => toggleChapter(chapter.id)}
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer group"
                >
                  {expandedChapters.has(chapter.id) ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <Folder className="w-4 h-4 text-blue-400 opacity-70" />
                  <span className="text-sm font-medium text-slate-300 flex-1 truncate">{chapter.title}</span>
                  <Plus onClick={(e) => {
                    e.stopPropagation();
                    setTargetChapterId(chapter.id);
                    setModalType('scene');
                  }} className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity" />
                </div>

                {expandedChapters.has(chapter.id) && (
                  <Droppable droppableId={chapter.id} type="SCENE">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="pl-6 space-y-1 min-h-[4px]"
                      >
                        {chapter.scenes?.map((scene, index) => (
                          <Draggable key={scene.id} draggableId={scene.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                onClick={() => setActiveSceneId(scene.id)}
                                className={cn(
                                  "flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition-colors group/scene",
                                  activeSceneId === scene.id ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300",
                                  snapshot.isDragging && "bg-slate-700 shadow-xl border-blue-500/50 z-50"
                                )}
                              >
                                <div {...provided.dragHandleProps} className="p-0.5 hover:bg-slate-700 rounded opacity-0 group-hover/scene:opacity-100 transition-opacity">
                                  <GripVertical className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                                <FileText className="w-3.5 h-3.5" />
                                <span className="text-xs truncate">{scene.title}</span>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            ))}
          </DragDropContext>
        </div>
      </div>

      {/* Editor Main Area */}
      <div className="flex-1 min-w-0 h-full">
        {activeScene ? (
          <Editor 
            key={activeScene.id} 
            initialContent={activeScene.content || ''} 
            onChange={(html) => {
              updateSceneContent(activeScene.id, html);
              useStore.getState().setCurrentSceneContent(html);
            }} 
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 glass rounded-xl border border-slate-700">
            <FileText className="w-16 h-16 opacity-10" />
            <p className="text-sm">Select a scene to begin writing.</p>
          </div>
        )}
      </div>
      
      <CreationModal 
        isOpen={modalType === 'chapter'}
        onClose={() => setModalType(null)}
        onConfirm={handleCreateChapter}
        title="Crea Nuovo Capitolo"
        placeholder="Inserisci il titolo del capitolo..."
      />

      <CreationModal 
        isOpen={modalType === 'scene'}
        onClose={() => setModalType(null)}
        onConfirm={handleCreateScene}
        title="Crea Nuova Scena"
        placeholder="Inserisci il titolo della scena..."
      />
      <ToastContainer />
    </div>
  );
};
